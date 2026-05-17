-- 036 — Capacitaciones · conformidad y evaluación de eficacia (ISO 9001 §7.2)
-- ISO 7.2 d) exige evaluar la eficacia de las acciones de formación y retener
-- la información documentada. Antes el resultado de eficacia estaba hardcodeado.

-- Conformidad del participante (distinta de "presente")
ALTER TABLE training_participants
  ADD COLUMN IF NOT EXISTS conforme BOOLEAN DEFAULT false;

-- Evaluación de eficacia a nivel capacitación
ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS efficacy_result       TEXT,
  ADD COLUMN IF NOT EXISTS efficacy_method       TEXT,
  ADD COLUMN IF NOT EXISTS efficacy_notes        TEXT,
  ADD COLUMN IF NOT EXISTS efficacy_evaluated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS efficacy_evaluated_at TIMESTAMPTZ;

ALTER TABLE trainings DROP CONSTRAINT IF EXISTS trainings_efficacy_chk;
ALTER TABLE trainings ADD CONSTRAINT trainings_efficacy_chk
  CHECK (efficacy_result IS NULL OR efficacy_result IN ('eficaz', 'parcial', 'no_eficaz'));
