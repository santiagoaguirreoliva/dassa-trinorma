-- 077 · Requisitos legales — evaluación del cumplimiento (F-TRI-10)
-- ISO 14001 9.1.2 y 45001 9.1.2 exigen evaluar periódicamente el cumplimiento de
-- los requisitos legales y conservar el resultado. La matriz de Nixa lo trae en
-- dos columnas (Cumplimiento, y la Observación resaltada que fundamenta la
-- evaluación), pero al importarla ambas quedaron concatenadas dentro de
-- `evidence_notes` como texto libre: no se podía filtrar, contar ni mostrar.
ALTER TABLE legal_requirements
  ADD COLUMN IF NOT EXISTS compliance_status     text,  -- cumple | en_proceso | no_aplica | sin_evaluar
  ADD COLUMN IF NOT EXISTS compliance_evaluation text;  -- fundamento (col. resaltada de la matriz)

CREATE INDEX IF NOT EXISTS idx_legal_compliance ON legal_requirements(compliance_status)
  WHERE is_active = true;
