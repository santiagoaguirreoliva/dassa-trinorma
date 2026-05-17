-- 035 — Capacitaciones · distinguir material previo de evidencia del dictado
-- 'material'  = temario, presentación, PDF de soporte (antes de la capacitación)
-- 'evidencia' = registro de que ocurrió: fotos, planilla firmada, acta (después)

ALTER TABLE training_evidence
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'evidencia';

ALTER TABLE training_evidence DROP CONSTRAINT IF EXISTS training_evidence_kind_chk;
ALTER TABLE training_evidence ADD CONSTRAINT training_evidence_kind_chk
  CHECK (kind IN ('material', 'evidencia'));
