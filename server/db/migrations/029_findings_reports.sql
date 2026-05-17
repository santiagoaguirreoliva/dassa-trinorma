-- 029 — Findings · histórico de informes mensuales de NC
-- Persiste cada informe mensual generado por Triny para poder consultarlos
-- desde la vista de informes históricos. Un registro por período (upsert).

CREATE TABLE IF NOT EXISTS findings_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_label  TEXT        NOT NULL,
  period_from   TIMESTAMPTZ NOT NULL UNIQUE,
  period_to     TIMESTAMPTZ NOT NULL,
  data          JSONB       NOT NULL,
  narrative     JSONB       NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by  UUID        REFERENCES users(id),
  recipients    TEXT,
  email_status  TEXT
);

CREATE INDEX IF NOT EXISTS idx_findings_reports_period
  ON findings_reports(period_from DESC);
