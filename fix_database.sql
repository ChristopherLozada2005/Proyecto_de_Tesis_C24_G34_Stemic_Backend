-- =============================================
-- SCRIPT PARA CORREGIR EL PROBLEMA DE QR_CODE
-- =============================================

-- Ejecutar este script en tu base de datos PostgreSQL
-- para corregir el problema de longitud del campo qr_code

-- Cambiar el tipo de columna qr_code de VARCHAR(500) a TEXT
ALTER TABLE attendance_qr ALTER COLUMN qr_code TYPE TEXT;

-- Verificar que el cambio se aplicó correctamente
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'attendance_qr' AND column_name = 'qr_code';

-- Comentario de la migración
COMMENT ON COLUMN attendance_qr.qr_code IS 'Código QR generado (TEXT para permitir códigos largos)';
