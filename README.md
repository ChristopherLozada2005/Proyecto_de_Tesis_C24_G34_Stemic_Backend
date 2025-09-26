# STEMIC Backend - Guía Rápida

## Requisitos
- Node.js 18+
- PostgreSQL 13+
- Cuenta de Cloudinary (gratis)

## Instalación de dependencias
```bash
npm install
```

## Configuración de entorno
1. Copia `.env.example` a `.env` y configura:
```bash
# Base de datos
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=stemic_db

# JWT Secrets
JWT_ACCESS_SECRET=tu_secreto_acceso
JWT_REFRESH_SECRET=tu_secreto_refresh

# Cloudinary (obtener en cloudinary.com)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

## Migración de base de datos (solo 1 archivo)
Ejecuta el esquema consolidado:
```bash
psql -U postgres -d stemic_db -f src/config/migrations/000_schema.sql
```

> El archivo crea:
> - **Tablas**: users, profiles, events, refresh_tokens
> - **Migración automática**: avatar_url movido a profiles
> - **Usuarios de prueba**: Con diferentes roles (usuario/organizador/admin)
> - **Sistema de roles**: Validación de permisos y constraints

## Correr en desarrollo
```bash
npm run dev
```

## Endpoints y pruebas
- Swagger: `http://localhost:3000/api/docs`
- API base: `http://localhost:3000`

## Funcionalidades
- ✅ **Autenticación**: JWT + Google OAuth
- ✅ **Perfiles de usuario**: Datos extendidos + avatar
- ✅ **Eventos**: CRUD completo con imágenes
- ✅ **Sistema de roles**: usuario/organizador/admin
- ✅ **Upload de imágenes**: Cloudinary (CDN global)
- ✅ **Documentación**: Swagger UI integrado

## Usuarios de prueba (incluidos automáticamente)
```bash
# ROL: usuario (NO puede crear eventos)
usuario@test.com / password

# ROL: organizador (SÍ puede crear eventos)
organizador@test.com / password

# ROL: admin (SÍ puede crear eventos)
admin@test.com / password
```

## Upload de imágenes
- **Perfil**: `PUT /api/auth/profile` (multipart: `avatar`)
- **Eventos**: `POST /api/events` (multipart: `imagen`)
- **CDN**: Cloudinary con optimización automática
- **Formatos**: JPEG, PNG, WebP
- **Límites**: 5MB (perfil), 10MB (eventos)
