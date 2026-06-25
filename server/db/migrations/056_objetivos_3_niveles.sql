-- 056 · Trinorma como Sistema Integral de Gestión (3 niveles)
-- NIVEL 1 Objetivos: habilitación progresiva (enabled) + tier estratégico; indicadores N por
--   objetivo con conector (de qué app/tabla sale el dato) y estado de conexión.
-- NIVEL 2 Proyectos estratégicos (impulsan objetivos; ≠ change_requests del SGI).
-- NIVEL 3 Plan de inversiones.

-- ── Objetivos: habilitación + nivel ──────────────────────────────
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false;
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS tier text;          -- 'estrategico' = los 10 unificados
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS responsible_text text;

-- ── Indicadores: conector + estado de conexión + habilitación ────
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false;
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS connector_source text;
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'manual'; -- vivo|congelado|construible|manual
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS baseline_value text;
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS kpi_order int DEFAULT 0;

-- ── NIVEL 2 · Proyectos estratégicos ─────────────────────────────
CREATE TABLE IF NOT EXISTS strategic_projects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            text UNIQUE,
  name            text NOT NULL,
  area            text,
  objective_codes text,                 -- objetivos que impulsa (texto libre / códigos)
  status          text DEFAULT 'Planificado',
  progress_pct    numeric,
  responsible     text,
  notes           text,
  enabled         boolean NOT NULL DEFAULT true,
  tenant_id       uuid DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── NIVEL 3 · Plan de inversiones ────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project       text NOT NULL,
  area          text,
  priority      text,
  amount_usd    numeric,
  amount_label  text,                   -- ej. "Interno" cuando no hay monto
  status        text,
  planned_date  text,
  real_date     text,
  roi_expected  text,
  notes         text,
  tenant_id     uuid DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objectives_tier ON objectives(tier) WHERE tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_strategic_projects_area ON strategic_projects(area);
CREATE INDEX IF NOT EXISTS idx_investments_area ON investments(area);
