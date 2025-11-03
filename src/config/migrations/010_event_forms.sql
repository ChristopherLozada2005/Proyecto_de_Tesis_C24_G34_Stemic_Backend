-- =============================================
-- MIGRATION: EVENT CUSTOM FORMS & POSTULATIONS
-- =============================================

-- Add flags and schema storage to events table
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS allow_custom_form BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS postulation_schema JSONB,
ADD COLUMN IF NOT EXISTS postulation_schema_version INTEGER DEFAULT 1;

COMMENT ON COLUMN eventos.allow_custom_form IS 'Permite habilitar formularios personalizados con SurveyJS';
COMMENT ON COLUMN eventos.postulation_schema IS 'Esquema JSON de SurveyJS para la postulación del evento';
COMMENT ON COLUMN eventos.postulation_schema_version IS 'Versión incremental del esquema almacenado';

-- Create enum for event application statuses
DO $$
BEGIN
  CREATE TYPE estado_postulacion_evento AS ENUM ('pendiente', 'en_revision', 'preseleccionado', 'aprobado', 'rechazado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table to store event specific postulations/responses
CREATE TABLE IF NOT EXISTS event_postulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  schema_snapshot JSONB NOT NULL,
  responses JSONB NOT NULL,
  estado estado_postulacion_evento DEFAULT 'pendiente',
  comentarios_revision TEXT,
  revisado_por UUID,
  fecha_postulacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  fecha_revision TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_event_postulations_event
    FOREIGN KEY (event_id) REFERENCES eventos(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_postulations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_postulations_revisor
    FOREIGN KEY (revisado_por) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT uq_event_postulations_user_event
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_postulations_event ON event_postulations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_postulations_user ON event_postulations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_postulations_estado ON event_postulations(estado);
CREATE INDEX IF NOT EXISTS idx_event_postulations_fecha ON event_postulations(fecha_postulacion);

COMMENT ON TABLE event_postulations IS 'Postulaciones específicas por evento con respuestas SurveyJS';
COMMENT ON COLUMN event_postulations.schema_snapshot IS 'Esquema del formulario al momento de postular';
COMMENT ON COLUMN event_postulations.responses IS 'Respuestas aportadas por la persona postulante';
COMMENT ON COLUMN event_postulations.estado IS 'Estado del flujo de revisión de la postulación del evento';
COMMENT ON COLUMN event_postulations.comentarios_revision IS 'Notas opcionales del revisor sobre la decisión';

-- Trigger to maintain updated_at column
CREATE OR REPLACE FUNCTION update_event_postulations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  CREATE TRIGGER trg_update_event_postulations_updated_at
  BEFORE UPDATE ON event_postulations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_postulations_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
