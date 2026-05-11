-- =============================================================================
-- DASSA SGI · Migration 021 · OLA 7 · Multi-tenant BASE
-- Estrategia: shared schema + tenant_id column
-- Solo prepara la estructura · activación gradual cuando se decida vender
-- =============================================================================
BEGIN;

-- 1) Tabla tenants
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,        -- 'dassa', 'cliente-2', etc.
  name            TEXT NOT NULL,
  industry        TEXT,                         -- logistica, fabril, salud, servicios
  legal_name      TEXT,
  cuit            TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#BF1E2E',
  secondary_color TEXT DEFAULT '#5BBDC9',
  plan_tier       TEXT DEFAULT 'free' CHECK (plan_tier IN ('free','pro','enterprise')),
  max_users       INTEGER DEFAULT 10,
  max_employees   INTEGER DEFAULT 50,
  features        JSONB DEFAULT '{"sgi":true,"comunicaciones":true,"bi":false,"multitenant":false}'::jsonb,
  is_active       BOOLEAN DEFAULT TRUE,
  is_demo         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 2) Insertar tenant principal DASSA
INSERT INTO tenants (id, slug, name, legal_name, industry, primary_color, secondary_color, plan_tier, max_users, max_employees, features, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dassa',
  'DASSA SA',
  'Depósito Avellaneda Sur S.A.',
  'logistica',
  '#BF1E2E', '#5BBDC9',
  'enterprise', 100, 200,
  '{"sgi":true,"comunicaciones":true,"bi":true,"agente_ia":true,"multitenant":false}'::jsonb,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3) Agregar tenant_id a tablas CORE (no a todas, solo las clave por tenant)
DO $$
DECLARE
  tbl TEXT;
  core_tables TEXT[] := ARRAY[
    'users','employees','employee_documents','employee_certifications',
    'job_profiles','job_profile_employees','job_profile_procedures','job_profile_risks',
    'org_chart_nodes',
    'findings','finding_actions','finding_comments',
    'risks','incidents','environmental_aspects','legal_requirements',
    'documents','document_versions','document_folders',
    'purchases','purchase_comments','suppliers',
    'committee_meetings','committee_tasks',
    'trainings','training_participants','training_evidence',
    'context_analysis','context_strategies','stakeholders',
    'tasks','notifications','contact_lists','contacts',
    'objectives','objective_indicators','objective_measurements',
    'change_requests','change_request_items',
    'procedures','procedure_steps','procedure_risk_links',
    'communications','communication_recipients','communication_reads',
    'review_cycles','reviews',
    'validation_signatures','calendar_events',
    'agent_conversations','auditor_runs','auditor_reports','auditor_alerts'
  ];
  v_dassa UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  FOREACH tbl IN ARRAY core_tables LOOP
    -- Agregar columna si no existe
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT', tbl);
    -- Set default a DASSA para todos los registros existentes
    EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', tbl) USING v_dassa;
    -- Index para performance
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant ON %I(tenant_id)', tbl, tbl);
    RAISE NOTICE '  ✓ % · tenant_id agregado, registros existentes asignados a DASSA', tbl;
  END LOOP;
END $$;

-- 4) View resumen
CREATE OR REPLACE VIEW v_tenant_stats AS
SELECT
  t.slug, t.name, t.plan_tier, t.is_active,
  (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = TRUE) AS users_activos,
  (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id AND is_active = TRUE) AS empleados,
  (SELECT COUNT(*) FROM findings WHERE tenant_id = t.id) AS hallazgos,
  (SELECT COUNT(*) FROM risks WHERE tenant_id = t.id) AS riesgos,
  (SELECT COUNT(*) FROM communications WHERE tenant_id = t.id) AS comunicaciones,
  t.created_at
FROM tenants t;

COMMIT;

SELECT '────── Resumen ──────' AS info;
SELECT * FROM v_tenant_stats;
SELECT 'Tablas con tenant_id:' AS info, COUNT(*) AS n FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public';
