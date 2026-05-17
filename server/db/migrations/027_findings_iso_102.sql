-- 027 — Findings · cumplimiento ISO 10.2 (No conformidad y acción correctiva)
-- ISO 9001 / 14001 / 45001 — cláusula 10.2
--
-- F-C: soft-delete — ISO exige RETENER la información documentada de las NC;
--      borrarlas físicamente destruye evidencia auditable.
-- F-D: trazabilidad — quién cerró la NC y el historial de transiciones de estado.

-- ── F-D · quién cerró la NC ───────────────────────────────────────
ALTER TABLE findings ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);

-- ── F-C · soft-delete (archivar en vez de borrar) ─────────────────
ALTER TABLE findings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- índice parcial: la mayoría de las consultas filtran NC vigentes
CREATE INDEX IF NOT EXISTS idx_findings_not_deleted
  ON findings(status) WHERE deleted_at IS NULL;

-- ── F-D · historial de transiciones de estado ────────────────────
CREATE TABLE IF NOT EXISTS finding_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id  UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  from_status finding_status,
  to_status   finding_status NOT NULL,
  changed_by  UUID REFERENCES users(id),
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fsh_finding
  ON finding_status_history(finding_id, changed_at);
