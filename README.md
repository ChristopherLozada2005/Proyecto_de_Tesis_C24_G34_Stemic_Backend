# STEMIC Backend - Guía Rápida

## Requisitos
- Node.js 18+
- PostgreSQL 13+

## Instalación de dependencias
```bash
npm install
npm install multer
```

## Migración de base de datos (solo 1 archivo)
Ejecuta el esquema consolidado:
```bash
psql -U postgres -d stemic_db -f src/config/migrations/000_schema.sql
```

> Ajusta usuario/DB si es necesario. El archivo crea tipos, tabla `eventos`, índices, trigger y la FK hacia `users`.

## Correr en desarrollo
```bash
npm run dev
```

## Endpoints y pruebas
- Swagger: `http://localhost:3000/api/docs`
- API base: `http://localhost:3000`

## Notas
- Archivos subidos se sirven desde `/uploads`
- Dependencias clave: `multer` para subir imágenes
