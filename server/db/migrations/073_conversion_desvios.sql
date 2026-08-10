-- 073 · Conversión entre no conformidades, avisos e incidentes SST
--
-- Un mismo desvío puede haber sido cargado en el lugar equivocado: un accidente
-- registrado como no conformidad, o un aviso que resultó ser una NC. Hasta ahora
-- no había forma de moverlo sin borrar y volver a cargar, perdiendo la historia.
--
-- ISO 9001 10.2 / 45001 10.2: la información documentada del desvío se conserva.
-- Por eso nada se borra: se convierte y queda el rastro de quién lo decidió.

-- Historial de conversiones. Los valores de kind son 'nc', 'hallazgo' e
-- 'incidente' (este último cuando el desvío se movió al registro de SST).
CREATE TABLE IF NOT EXISTS finding_kind_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  from_kind  TEXT NOT NULL,
  to_kind    TEXT NOT NULL,
  reason     TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finding_kind_history_finding
  ON finding_kind_history (finding_id, created_at DESC);

-- Vínculo incidente ↔ hallazgo. Sirve en los dos sentidos: la NC que nació de
-- un accidente, y el accidente que se movió desde una NC mal clasificada.
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS finding_id UUID REFERENCES findings(id);

CREATE INDEX IF NOT EXISTS idx_incidents_finding
  ON incidents (finding_id) WHERE finding_id IS NOT NULL;
