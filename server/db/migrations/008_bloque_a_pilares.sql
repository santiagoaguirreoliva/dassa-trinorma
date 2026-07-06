-- =============================================================================
-- DASSA SGI · OLA 1 · Bloque A · Pilares de Datos
-- Migration: 008_bloque_a_pilares.sql
-- Fecha: 2026-05-11
-- Idempotente: safe to re-run
-- =============================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1.2 · ORGANIGRAMA
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_chart_nodes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  parent_id    UUID REFERENCES org_chart_nodes(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('direccion','area','sector','puesto','equipo')),
  level        INTEGER NOT NULL DEFAULT 0,
  area         TEXT,
  description  TEXT,
  color        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_chart_parent ON org_chart_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_chart_area   ON org_chart_nodes(area);

-- ───────────────────────────────────────────────────────────────────
-- 1.3 · FICHAS DE PUESTO v2 — extender job_profiles existente
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS org_node_id            UUID REFERENCES org_chart_nodes(id);
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS area                   TEXT;
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS seniority              TEXT; -- 'junior','semi','senior','lider','gerente','director'
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS mission                TEXT;
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS key_results            TEXT[];
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS competencies           TEXT[];
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS training_required      TEXT[];
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS replaces_profile_id    UUID REFERENCES job_profiles(id);
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS replaced_by_profile_id UUID REFERENCES job_profiles(id);
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS legacy_doc_url         TEXT; -- link al .docx original si vino de migración
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS is_active              BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE job_profiles ADD COLUMN IF NOT EXISTS source                 TEXT; -- 'manual','imported','ai_inferred'

-- Quitar el UNIQUE de user_id (un puesto puede tener varios empleados, un empleado puede tener varios puestos a lo largo del tiempo)
ALTER TABLE job_profiles DROP CONSTRAINT IF EXISTS job_profiles_user_id_key;

CREATE INDEX IF NOT EXISTS idx_job_profiles_org_node ON job_profiles(org_node_id);
CREATE INDEX IF NOT EXISTS idx_job_profiles_area     ON job_profiles(area);

-- ───────────────────────────────────────────────────────────────────
-- 1.3.b · Empleados ↔ Puestos (N:N con vigencia histórica)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_profile_employees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  since        DATE NOT NULL DEFAULT CURRENT_DATE,
  until        DATE, -- NULL = vigente
  is_primary   BOOLEAN NOT NULL DEFAULT TRUE, -- el empleado puede tener varios puestos, este es el principal
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, employee_id, since)
);
CREATE INDEX IF NOT EXISTS idx_jpe_profile_id  ON job_profile_employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_jpe_employee_id ON job_profile_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_jpe_current     ON job_profile_employees(employee_id) WHERE until IS NULL;

-- ───────────────────────────────────────────────────────────────────
-- 1.3.c · Puestos ↔ Procedimientos (FK a procedures que se crea en Bloque B)
--          Por ahora sin FK, solo tabla de unión preparada.
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_profile_procedures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  procedure_id  UUID, -- FK pendiente · se agrega en Bloque B cuando exista tabla procedures
  document_id   UUID REFERENCES documents(id) ON DELETE SET NULL, -- mientras tanto, link directo al doc
  role          TEXT, -- 'ejecuta','supervisa','aprueba','consulta'
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, COALESCE(procedure_id, document_id))
);
CREATE INDEX IF NOT EXISTS idx_jpp_profile_id ON job_profile_procedures(profile_id);

-- ───────────────────────────────────────────────────────────────────
-- 1.3.d · Puestos ↔ Riesgos (matriz dinámica)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_profile_risks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES job_profiles(id) ON DELETE CASCADE,
  risk_id         UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  exposure_level  TEXT NOT NULL DEFAULT 'medio' CHECK (exposure_level IN ('bajo','medio','alto','critico')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, risk_id)
);
CREATE INDEX IF NOT EXISTS idx_jpr_profile_id ON job_profile_risks(profile_id);
CREATE INDEX IF NOT EXISTS idx_jpr_risk_id    ON job_profile_risks(risk_id);

-- ───────────────────────────────────────────────────────────────────
-- 1.6 · AMFE COMPLETO en risks — extender sin romper
-- Mantiene ir (P×S) y risk_level por compat. Agrega npr (G×O×D) y nuevos campos.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE risks ADD COLUMN IF NOT EXISTS detection            INTEGER CHECK (detection BETWEEN 1 AND 4);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS causes               TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS current_controls_text TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS recommended_action   TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS opportunity          TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS process              TEXT; -- 'RRHH','Comercial','Operación','Mantenimiento','Compras','Coordinación','Facturación','General'
ALTER TABLE risks ADD COLUMN IF NOT EXISTS affected_parties     TEXT[];
ALTER TABLE risks ADD COLUMN IF NOT EXISTS from_foda_id         UUID REFERENCES context_analysis(id);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS plazo                DATE;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS resultado_acciones   TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS eficacia_verificada  TEXT; -- 'pendiente','en_evaluacion','eficaz','no_eficaz'

-- NPR computed = G × O × D (solo si detection existe)
ALTER TABLE risks ADD COLUMN IF NOT EXISTS npr INTEGER
  GENERATED ALWAYS AS (
    CASE WHEN detection IS NOT NULL THEN severity * probability * detection ELSE NULL END
  ) STORED;

-- npr_level según criterio AMFE de NIXA (≥16 = significativo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'npr_significance') THEN
    CREATE TYPE npr_significance AS ENUM ('significativo','no_significativo','sin_evaluar');
  END IF;
END $$;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS npr_level npr_significance
  GENERATED ALWAYS AS (
    CASE
      WHEN detection IS NULL THEN 'sin_evaluar'::npr_significance
      WHEN (severity * probability * detection) >= 16 THEN 'significativo'::npr_significance
      ELSE 'no_significativo'::npr_significance
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_risks_process  ON risks(process);
CREATE INDEX IF NOT EXISTS idx_risks_npr      ON risks(npr) WHERE npr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risks_npr_level ON risks(npr_level);

-- ───────────────────────────────────────────────────────────────────
-- 1.1 · SISTEMA DE REVISIONES UNIVERSAL
-- ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_period_kind') THEN
    CREATE TYPE review_period_kind AS ENUM ('mensual','bimensual','trimestral','semestral','anual','evento');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('programada','pendiente','en_revision','validada','rechazada','postpuesta');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,  -- 'risks','job_profiles','findings','foda','objectives','procedures','communications', etc.
  entity_id       UUID NOT NULL,
  scheduled_for   DATE NOT NULL,
  period_kind     review_period_kind NOT NULL,
  reviewer_id     UUID REFERENCES users(id),       -- quién revisa (rol esperado: el responsable del módulo)
  validator_id    UUID REFERENCES users(id),       -- quién valida (NIXA u otro auditor)
  status          review_status NOT NULL DEFAULT 'programada',
  started_at      TIMESTAMPTZ,
  validated_at    TIMESTAMPTZ,
  validated_by    UUID REFERENCES users(id),
  notes           TEXT,
  attachments_url TEXT[],
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_entity     ON reviews(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_reviews_scheduled  ON reviews(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reviews_status     ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer   ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_validator  ON reviews(validator_id);

CREATE TABLE IF NOT EXISTS review_schedules (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type            TEXT NOT NULL UNIQUE,  -- una regla por tipo de entidad
  period_kind            review_period_kind NOT NULL,
  default_reviewer_role  TEXT,
  default_validator_role TEXT,                  -- típicamente 'auditor_externo' para NIXA
  description            TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: políticas de revisión iniciales según pedido NIXA
INSERT INTO review_schedules (entity_type, period_kind, default_reviewer_role, default_validator_role, description)
VALUES
  ('risks',              'anual',       'sgi_leader',         'auditor_externo', 'Matriz de Riesgos AMFE · revisión anual NIXA'),
  ('foda',               'anual',       'master_admin',       'auditor_externo', 'FODA · revisión anual por la Dirección + NIXA'),
  ('job_profiles',       'anual',       'rrhh',               'auditor_externo', 'Fichas de Puesto · validar vigencia anual'),
  ('objectives',         'anual',       'master_admin',       'auditor_externo', 'Objetivos corporativos · anual NIXA'),
  ('change_requests',    'bimensual',   'sgi_leader',         'auditor_externo', 'Gestión de Cambios · seguimiento bimensual'),
  ('procedures',         'anual',       'sgi_leader',         'auditor_externo', 'Procedimientos · revisión anual'),
  ('findings',           'evento',      'sgi_leader',         'auditor_externo', 'Cada NC tiene revisión de eficacia post-cierre'),
  ('legal_requirements', 'semestral',   'sgi_leader',         'auditor_externo', 'Requisitos legales · revisión semestral'),
  ('environmental_aspects','anual',     'seguridad_higiene',  'auditor_externo', 'Aspectos ambientales · revisión anual'),
  ('audit_internal',     'anual',       'sgi_leader',         'auditor_externo', 'Auditoría interna · validación anual NIXA'),
  ('management_review',  'anual',       'master_admin',       'auditor_externo', 'Revisión por la Dirección · anual')
ON CONFLICT (entity_type) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- Verificación final
-- ───────────────────────────────────────────────────────────────────

SELECT '────── Tablas nuevas ──────' AS info;
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('org_chart_nodes','job_profile_employees','job_profile_procedures','job_profile_risks','reviews','review_schedules')
ORDER BY tablename;

SELECT '────── Columnas nuevas en job_profiles ──────' AS info;
SELECT column_name FROM information_schema.columns
WHERE table_name='job_profiles'
  AND column_name IN ('org_node_id','area','seniority','mission','key_results','competencies','training_required','replaces_profile_id','replaced_by_profile_id','legacy_doc_url','is_active','source')
ORDER BY column_name;

SELECT '────── Columnas nuevas en risks (AMFE) ──────' AS info;
SELECT column_name FROM information_schema.columns
WHERE table_name='risks'
  AND column_name IN ('detection','npr','npr_level','causes','current_controls_text','recommended_action','opportunity','process','affected_parties','from_foda_id','plazo','resultado_acciones','eficacia_verificada')
ORDER BY column_name;

SELECT '────── Review schedules seed ──────' AS info;
SELECT entity_type, period_kind, default_reviewer_role, default_validator_role FROM review_schedules ORDER BY entity_type;
