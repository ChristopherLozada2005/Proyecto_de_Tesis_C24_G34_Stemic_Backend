-- Esquema consolidado de base de datos (mínimo necesario)
-- Ejecutar con: psql -U postgres -d stemic_db -f src/config/migrations/000_schema.sql

-- ===============================
-- TIPOS ENUM NECESARIOS
-- ===============================

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

-- Comentarios
COMMENT ON TABLE public.eventos IS 'Tabla de eventos';
COMMENT ON COLUMN public.eventos.titulo IS 'Título del evento';
COMMENT ON COLUMN public.eventos.descripcion IS 'Descripción del evento';
COMMENT ON COLUMN public.eventos.duracion IS 'Duración del evento (texto, ej: 2 horas, 01:30:00)';
COMMENT ON COLUMN public.eventos.skills IS 'Array de skills (valores UI)';
COMMENT ON COLUMN public.eventos.tags IS 'Array de tags';
COMMENT ON COLUMN public.eventos.modalidad IS 'Modalidad del evento';
