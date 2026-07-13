-- 067 · Matriz de Riesgos general (Trinorma) — alinear /risks al template F-TRI general
-- Suma Área y Condición (Normal/Anormal/Emergencia). El resto de campos del template
-- (recommended_action, start_date, end_date, residual_probability/severity, control_status
-- como Estado 0-4) ya existen en la tabla.
ALTER TABLE risks ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS condition text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'risks' AND constraint_name = 'risks_condition_check'
  ) THEN
    ALTER TABLE risks ADD CONSTRAINT risks_condition_check
      CHECK (condition IS NULL OR condition IN ('normal','anormal','emergencia'));
  END IF;
END $$;
