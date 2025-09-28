-- Género para perfiles
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('masculino', 'femenino', 'otro', 'prefiero_no_decir');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Modalidades
DO $$ BEGIN
  CREATE TYPE modalidad_evento AS ENUM ('virtual', 'presencial', 'hibrido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skills (valores exactos visibles en UI)
DO $$ BEGIN
  CREATE TYPE skill_evento AS ENUM (
    'Liderazgo',
    'Pensamiento Critico',
    'Colaboracion',
    'Conocimiento Tecnico',
    'Comunicacion'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tags
DO $$ BEGIN
  CREATE TYPE tag_evento AS ENUM ('IA', 'TECH', 'NETWORKING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===============================
-- FUNCIONES COMUNES
-- ===============================

-- Actualizar columna updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- TABLA: users
-- ===============================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  google_id VARCHAR(255) UNIQUE NULL,
  rol VARCHAR(50) DEFAULT 'usuario' NOT NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT users_correo_format CHECK (
    correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT users_nombre_not_empty CHECK (LENGTH(TRIM(nombre)) > 0),
  CONSTRAINT users_password_or_google CHECK (
    (password IS NOT NULL AND google_id IS NULL) OR 
    (password IS NULL AND google_id IS NOT NULL)
  ),
  CONSTRAINT users_rol_valid CHECK (
    rol IN ('usuario', 'organizador', 'admin')
  )
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_correo ON public.users (correo);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON public.users (password_reset_token);

-- Trigger updated_at para users
DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===============================
-- TABLA: profiles
-- ===============================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avatar_url VARCHAR(500) NULL,
  gender gender_type NULL,
  phone_number VARCHAR(20) NULL,
  birth_date DATE NULL,
  description TEXT NULL,
  interests tag_evento[] DEFAULT '{}'::tag_evento[] NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT profiles_phone_format CHECK (
    phone_number IS NULL OR phone_number ~ '^[\+]?[0-9\s\-\(\)]{7,20}$'
  ),
  CONSTRAINT profiles_birth_date_valid CHECK (
    birth_date IS NULL OR birth_date <= CURRENT_DATE - INTERVAL '13 years'
  ),
  CONSTRAINT profiles_description_length CHECK (
    description IS NULL OR LENGTH(description) <= 1000
  )
);

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON public.profiles USING GIN (interests);

-- Trigger updated_at para profiles
DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK para profiles
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===============================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ===============================

-- Migrar avatar_url de users a profiles (si existe la columna en users)
DO $$ 
BEGIN
  -- Verificar si la columna avatar_url existe en users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'avatar_url' 
    AND table_schema = 'public'
  ) THEN
    
    -- Migrar datos existentes de users.avatar_url a profiles.avatar_url
    -- Solo migrar si el perfil ya existe
    UPDATE profiles SET avatar_url = u.avatar_url 
    FROM users u 
    WHERE profiles.user_id = u.id 
    AND u.avatar_url IS NOT NULL 
    AND u.avatar_url != '';
    
    -- Crear perfiles automáticamente para usuarios de Google que tienen avatar pero no perfil
    INSERT INTO profiles (user_id, avatar_url, created_at, updated_at)
    SELECT u.id, u.avatar_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.avatar_url IS NOT NULL 
    AND u.avatar_url != ''
    AND p.user_id IS NULL;
    
    -- Eliminar columna avatar_url de users
    ALTER TABLE users DROP COLUMN avatar_url;
    
    RAISE NOTICE 'Migración de avatar_url completada: movido de users a profiles';
    
  ELSE
    RAISE NOTICE 'La columna avatar_url no existe en users, migración no necesaria';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error durante migración de avatar_url: %', SQLERRM;
END $$;

-- ===============================
-- TABLA: refresh_tokens
-- ===============================

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT refresh_tokens_expires_future CHECK (expires_at > CURRENT_TIMESTAMP)
);

-- Índices para refresh_tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON public.refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens (expires_at);

-- FK para refresh_tokens
DO $$ BEGIN
  ALTER TABLE public.refresh_tokens
    ADD CONSTRAINT fk_refresh_tokens_user_id FOREIGN KEY (user_id)
    REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===============================
-- TABLA: eventos
-- ===============================

-- Eliminar si existe (opcional para entornos de desarrollo)
-- DROP TABLE IF EXISTS public.eventos CASCADE;

CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_aplicacion_prioritaria DATE NOT NULL,
  fecha_aplicacion_general DATE NOT NULL,
  duracion TIME DEFAULT '01:00:00' NOT NULL,
  correo_contacto VARCHAR(255) NOT NULL,
  informacion_adicional TEXT NULL,
  modalidad modalidad_evento NOT NULL,
  lugar VARCHAR(255) NULL,
  fecha_hora TIMESTAMP NOT NULL,
  imagen_url VARCHAR(500) NULL,
  requiere_postulacion BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  tags tag_evento[] DEFAULT '{}'::tag_evento[] NULL,
  skills skill_evento[] DEFAULT '{}'::skill_evento[] NULL,

  CONSTRAINT eventos_correo_contacto_format CHECK (
    correo_contacto ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT eventos_descripcion_not_empty CHECK (LENGTH(TRIM(descripcion)) > 0),
  CONSTRAINT eventos_duracion_valid CHECK (duracion >= '00:00:01'::time without time zone),
  CONSTRAINT eventos_fecha_aplicacion_check CHECK (fecha_aplicacion_general >= fecha_aplicacion_prioritaria),
  CONSTRAINT eventos_titulo_not_empty CHECK (LENGTH(TRIM(titulo)) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_activo ON public.eventos (activo);
CREATE INDEX IF NOT EXISTS idx_eventos_created_by ON public.eventos (created_by);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_aplicacion_general ON public.eventos (fecha_aplicacion_general);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_aplicacion_prioritaria ON public.eventos (fecha_aplicacion_prioritaria);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_hora ON public.eventos (fecha_hora);
CREATE INDEX IF NOT EXISTS idx_eventos_modalidad ON public.eventos (modalidad);
CREATE INDEX IF NOT EXISTS idx_eventos_skills ON public.eventos USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_eventos_tags ON public.eventos USING GIN (tags);

-- Trigger updated_at
DO $$ BEGIN
  CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON public.eventos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- FK
DO $$ BEGIN
  ALTER TABLE public.eventos
    ADD CONSTRAINT fk_eventos_created_by FOREIGN KEY (created_by)
    REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===============================
-- COMENTARIOS
-- ===============================

-- Comentarios para users
COMMENT ON TABLE public.users IS 'Tabla de usuarios del sistema';
COMMENT ON COLUMN public.users.nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.users.correo IS 'Correo electrónico único del usuario';
COMMENT ON COLUMN public.users.password IS 'Hash de la contraseña (NULL para usuarios de Google)';
COMMENT ON COLUMN public.users.google_id IS 'ID de Google para autenticación OAuth';
COMMENT ON COLUMN public.users.rol IS 'Rol del usuario en el sistema';

-- Comentarios para profiles
COMMENT ON TABLE public.profiles IS 'Tabla de perfiles extendidos de usuarios';
COMMENT ON COLUMN public.profiles.user_id IS 'Referencia al usuario (relación 1:1)';
COMMENT ON COLUMN public.profiles.gender IS 'Género del usuario';
COMMENT ON COLUMN public.profiles.phone_number IS 'Número telefónico del usuario';
COMMENT ON COLUMN public.profiles.birth_date IS 'Fecha de nacimiento del usuario';
COMMENT ON COLUMN public.profiles.description IS 'Descripción personal del usuario (máx. 1000 caracteres)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL del avatar del usuario';
COMMENT ON COLUMN public.profiles.interests IS 'Array de intereses basados en tags de eventos';

-- Comentarios para refresh_tokens
COMMENT ON TABLE public.refresh_tokens IS 'Tabla de tokens de actualización para autenticación';
COMMENT ON COLUMN public.refresh_tokens.user_id IS 'Referencia al usuario propietario del token';
COMMENT ON COLUMN public.refresh_tokens.token IS 'Token de actualización único';
COMMENT ON COLUMN public.refresh_tokens.expires_at IS 'Fecha de expiración del token';

-- Comentarios para eventos
COMMENT ON TABLE public.eventos IS 'Tabla de eventos';
COMMENT ON COLUMN public.eventos.titulo IS 'Título del evento';
COMMENT ON COLUMN public.eventos.descripcion IS 'Descripción del evento';
COMMENT ON COLUMN public.eventos.duracion IS 'Duración del evento (texto, ej: 2 horas, 01:30:00)';
COMMENT ON COLUMN public.eventos.skills IS 'Array de skills (valores UI)';
COMMENT ON COLUMN public.eventos.tags IS 'Array de tags';
COMMENT ON COLUMN public.eventos.modalidad IS 'Modalidad del evento';

-- ===============================
-- USUARIOS DE PRUEBA CON DIFERENTES ROLES
-- ===============================

-- Insertar usuarios de prueba (solo si no existen)
DO $$ BEGIN

  -- Usuario con rol 'usuario' (no puede crear eventos)
  INSERT INTO public.users (
    id, 
    nombre, 
    correo, 
    password,
    rol, 
    created_at
  ) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Usuario Normal',
    'usuario@test.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'usuario',
    CURRENT_TIMESTAMP
  ) ON CONFLICT (correo) DO NOTHING;

  -- Usuario con rol 'organizador' (puede crear eventos)
  INSERT INTO public.users (
    id, 
    nombre, 
    correo, 
    password,
    rol, 
    created_at
  ) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Organizador Test',
    'organizador@test.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'organizador',
    CURRENT_TIMESTAMP
  ) ON CONFLICT (correo) DO NOTHING;

  -- Usuario con rol 'admin' (puede crear eventos)
  INSERT INTO public.users (
    id, 
    nombre, 
    correo, 
    password,
    rol, 
    created_at
  ) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Admin Test',
    'admin@test.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'admin',
    CURRENT_TIMESTAMP
  ) ON CONFLICT (correo) DO NOTHING;

  RAISE NOTICE 'Usuarios de prueba creados:';
  RAISE NOTICE '- usuario@test.com (password: password) - ROL: usuario';
  RAISE NOTICE '- organizador@test.com (password: password) - ROL: organizador';
  RAISE NOTICE '- admin@test.com (password: password) - ROL: admin';

END $$;

-- =============================================
-- TABLA: INSCRIPCIONES
-- =============================================

-- Crear tabla de inscripciones de usuarios a eventos
CREATE TABLE IF NOT EXISTS inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  fecha_inscripcion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Claves foráneas
  CONSTRAINT fk_inscriptions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_inscriptions_event_id 
    FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE,
  
  -- Restricción única: un usuario no puede inscribirse dos veces al mismo evento
  CONSTRAINT unique_user_event_inscription 
    UNIQUE (user_id, event_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_inscriptions_user_id ON inscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_event_id ON inscriptions(event_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_fecha ON inscriptions(fecha_inscripcion);

-- Comentarios
COMMENT ON TABLE inscriptions IS 'Inscripciones de usuarios a eventos';
COMMENT ON COLUMN inscriptions.id IS 'Identificador único de la inscripción';
COMMENT ON COLUMN inscriptions.user_id IS 'ID del usuario que se inscribe';
COMMENT ON COLUMN inscriptions.event_id IS 'ID del evento al que se inscribe';
COMMENT ON COLUMN inscriptions.fecha_inscripcion IS 'Fecha y hora de la inscripción';
COMMENT ON COLUMN inscriptions.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN inscriptions.updated_at IS 'Fecha de última actualización';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_inscriptions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inscriptions_updated_at 
  BEFORE UPDATE ON inscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_inscriptions_updated_at_column();
