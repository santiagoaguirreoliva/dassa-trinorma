-- =============================================================================
-- DASSA SGI · OLA 1 · Bloque B · Pilares de Datos restantes
-- Migration 018: procedures + objectives + change_requests + índices
-- =============================================================================
BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1) PROCEDURES · instructivos del sistema (cómo completar cada módulo)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT NOT NULL UNIQUE,                -- P-TRI-001
  title               TEXT NOT NULL,
  module              TEXT,                                -- findings|risks|purchases|committee|trainings|comunicaciones|etc.
  description         TEXT,
  instructions_md     TEXT,                                -- markdown del tutorial completo
  norma               TEXT,                                -- 9001|14001|45001|todas
  responsible_id      UUID REFERENCES users(id),
  approver_id         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  effective_date      DATE,
  next_review_date    DATE,
  version             TEXT DEFAULT '1.0',
  status              TEXT DEFAULT 'borrador' CHECK (status IN ('borrador','vigente','obsoleto')),
  linked_document_id  UUID REFERENCES documents(id),       -- link al .docx oficial si existe
  legacy_doc_url      TEXT,                                -- link Drive original
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procedures_module ON procedures(module);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
CREATE INDEX IF NOT EXISTS idx_procedures_norma  ON procedures(norma);

CREATE TABLE IF NOT EXISTS procedure_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id    UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  step_number     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  action_type     TEXT,                                   -- click|form|check|navigate|etc.
  screenshot_url  TEXT,
  expected_result TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (procedure_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_procedure_steps ON procedure_steps(procedure_id, step_number);

CREATE TABLE IF NOT EXISTS procedure_risk_links (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id  UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  risk_id       UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  contribution  TEXT DEFAULT 'mitigates' CHECK (contribution IN ('mitigates','monitors','controls','detects','generates')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (procedure_id, risk_id)
);
CREATE INDEX IF NOT EXISTS idx_prl_procedure ON procedure_risk_links(procedure_id);
CREATE INDEX IF NOT EXISTS idx_prl_risk      ON procedure_risk_links(risk_id);

-- Ahora vincular procedures a job_profile_procedures (FK que dejé null)
ALTER TABLE job_profile_procedures
  ADD COLUMN IF NOT EXISTS fk_procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE;

-- ───────────────────────────────────────────────────────────────────
-- 2) OBJECTIVES · objetivos anuales + indicadores + mediciones
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS objectives (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT NOT NULL UNIQUE,               -- OBJ-2026-01
  year                INTEGER NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  area                TEXT,                                -- Operaciones|RRHH|SySO|Comercial|etc.
  responsible_id      UUID REFERENCES users(id),
  target_metric       TEXT,                                -- "Cantidad de contenedores impo/mes"
  target_value        TEXT,                                -- "Mayor a 220 unidades"
  admissible_value    TEXT,                                -- "Admisible: 130 unidades"
  baseline_value      TEXT,                                -- "Año anterior: 164/mes"
  current_value       TEXT,                                -- valor actual del año en curso
  status              TEXT DEFAULT 'activo' CHECK (status IN ('activo','cumplido','no_cumplido','postpuesto','cancelado')),
  related_risk_ids    UUID[],                              -- riesgos significativos que este objetivo ataca
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_objectives_year ON objectives(year);
CREATE INDEX IF NOT EXISTS idx_objectives_area ON objectives(area);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

CREATE TABLE IF NOT EXISTS objective_indicators (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id      UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  indicator_name    TEXT NOT NULL,
  formula           TEXT,                                 -- "CTNS / mes" | "% accidentes / 1000h"
  unit              TEXT,                                  -- "unidades" | "%" | "días"
  target_value      NUMERIC,
  frequency         TEXT DEFAULT 'mensual' CHECK (frequency IN ('mensual','bimensual','trimestral','semestral','anual')),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oi_objective ON objective_indicators(objective_id);

CREATE TABLE IF NOT EXISTS objective_measurements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicator_id    UUID NOT NULL REFERENCES objective_indicators(id) ON DELETE CASCADE,
  period          DATE NOT NULL,                          -- primer día del mes/trimestre/etc.
  value           NUMERIC NOT NULL,
  notes           TEXT,
  recorded_by     UUID REFERENCES users(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (indicator_id, period)
);
CREATE INDEX IF NOT EXISTS idx_om_indicator ON objective_measurements(indicator_id);
CREATE INDEX IF NOT EXISTS idx_om_period    ON objective_measurements(period);

-- ───────────────────────────────────────────────────────────────────
-- 3) CHANGE_REQUESTS · Gestión de Cambios
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  TEXT NOT NULL UNIQUE,             -- CC-2026-01
  year                  INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  purpose               TEXT,
  impact_description    TEXT,
  related_risks_text    TEXT,                              -- texto libre de riesgos identificados
  related_objective_ids UUID[],                            -- objetivos que esto ayuda a cumplir
  responsible_id        UUID REFERENCES users(id),
  status                TEXT DEFAULT 'propuesto' CHECK (status IN ('propuesto','aprobado','en_curso','completado','cancelado','postpuesto')),
  plazo_target          DATE,
  plazo_real            DATE,
  budget_estimated      NUMERIC,
  budget_real           NUMERIC,
  approved_by           UUID REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_change_requests_year   ON change_requests(year);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

CREATE TABLE IF NOT EXISTS change_request_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_request_id   UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  item_number         INTEGER NOT NULL,
  action              TEXT NOT NULL,
  responsible_id      UUID REFERENCES users(id),
  plazo               DATE,
  recursos            TEXT,
  verification        TEXT,
  result              TEXT,
  status              TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_curso','completado','cancelado')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (change_request_id, item_number)
);
CREATE INDEX IF NOT EXISTS idx_cri_request ON change_request_items(change_request_id);

-- ───────────────────────────────────────────────────────────────────
-- 4) ÍNDICES FALTANTES · 18 tablas con solo PK
-- ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stakeholders_active     ON stakeholders(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_suppliers_active        ON suppliers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_suppliers_homologated   ON suppliers(is_homologated) WHERE is_homologated = TRUE;
CREATE INDEX IF NOT EXISTS idx_env_aspects_significant ON environmental_aspects(is_active);
CREATE INDEX IF NOT EXISTS idx_finding_actions_finding ON finding_actions(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_comments_finding ON finding_comments(finding_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc        ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_training_evidence_trn   ON training_evidence(training_id);
CREATE INDEX IF NOT EXISTS idx_surveys_active          ON surveys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_active  ON agent_knowledge(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_committee_tasks_meeting ON committee_tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_employee_docs_emp       ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certs_emp      ON employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_purchase_comments_purch ON purchase_comments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_contact_lists_owner     ON contact_lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_context_strategies_resp ON context_strategies(responsible_id);

COMMIT;

-- ───────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ───────────────────────────────────────────────────────────────────
SELECT '────── Tablas Bloque B ──────' AS info;
SELECT tablename FROM pg_tables
WHERE tablename IN ('procedures','procedure_steps','procedure_risk_links','objectives','objective_indicators','objective_measurements','change_requests','change_request_items')
ORDER BY tablename;

SELECT '────── Total tablas SGI ──────' AS info;
SELECT COUNT(*) AS total_tablas FROM pg_tables WHERE schemaname = 'public';

SELECT '────── Total índices del schema ──────' AS info;
SELECT COUNT(*) AS total_indices FROM pg_indexes WHERE schemaname = 'public';
