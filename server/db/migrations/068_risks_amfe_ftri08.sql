-- 068 · Matriz AMFE F-TRI-08 — columnas para no perder datos del Sheet de Nixa
-- responsable (texto), tipo Riesgo/Oportunidad, detección residual, y versión+fecha de la matriz.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS responsible_text    text;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS ro_type             text;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS residual_detection  integer;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS matrix_version      text;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS matrix_date         date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'risks' AND constraint_name = 'risks_ro_type_check'
  ) THEN
    ALTER TABLE risks ADD CONSTRAINT risks_ro_type_check
      CHECK (ro_type IS NULL OR ro_type IN ('riesgo','oportunidad'));
  END IF;
END $$;

-- La F-TRI-08 usa escala 1-10 en el bloque CONTEXTO (los procesos usan 1-4/1-5).
-- Relajamos los CHECK de G/O/D a 1-10 para aceptar ambas escalas.
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_severity_check;
ALTER TABLE risks ADD  CONSTRAINT risks_severity_check    CHECK (severity    >= 1 AND severity    <= 10);
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_probability_check;
ALTER TABLE risks ADD  CONSTRAINT risks_probability_check CHECK (probability >= 1 AND probability <= 10);
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_detection_check;
ALTER TABLE risks ADD  CONSTRAINT risks_detection_check   CHECK (detection IS NULL OR (detection >= 1 AND detection <= 10));
