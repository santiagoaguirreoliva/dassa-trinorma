-- 039_ronda_inspecciones.sql
-- Módulo "Ronda de Inspecciones" (F0) — schema base.
-- Motor genérico dirigido por plantillas: sirve rondines de supervisión
-- (limpieza, mantenimiento, SSHH) y el checklist diario de maquinaria.
-- Ref: docs/SPEC-RONDA-INSPECCIONES.md

BEGIN;

-- ─── Tipos ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE insp_family AS ENUM ('rondin','maquinaria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE insp_status AS ENUM
    ('pendiente','en_curso','en_cofirma','completada','vencida','anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 1. Plantillas (definición de cada formulario) ────────────────
CREATE TABLE IF NOT EXISTS insp_templates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT UNIQUE NOT NULL,            -- F-TRI-19, F-TRI-20, F-TRI-23, SSHH
  name             TEXT NOT NULL,
  family           insp_family NOT NULL,
  frequency        TEXT NOT NULL
                     CHECK (frequency IN ('diaria','semanal','quincenal','mensual','trimestral','anual')),
  gen_cron         TEXT,                            -- expresión cron de generación (doc/config)
  due_offset_days  INT NOT NULL DEFAULT 2,          -- días hasta el vencimiento
  requires_cosign  BOOLEAN NOT NULL DEFAULT false,  -- rondines de 2 personas
  machine_type     TEXT,                            -- familia maquinaria: tipo de máquina
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER insp_templates_updated_at BEFORE UPDATE ON insp_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 2. Ítems de cada plantilla ───────────────────────────────────
CREATE TABLE IF NOT EXISTS insp_template_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id   UUID NOT NULL REFERENCES insp_templates(id) ON DELETE CASCADE,
  section       TEXT,
  order_idx     INT NOT NULL DEFAULT 0,
  label         TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'cumple'
                  CHECK (response_type IN ('si_no','cumple','texto','numero')),
  is_critical   BOOLEAN NOT NULL DEFAULT false,     -- falla sugiere NC automática
  photo_on_fail BOOLEAN NOT NULL DEFAULT false,     -- foto obligatoria si respuesta negativa
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insp_items_template ON insp_template_items(template_id, order_idx);

-- ─── 3. Responsables por plantilla (María, Marcelo, FER) ──────────
CREATE TABLE IF NOT EXISTS insp_template_responsibles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id  UUID NOT NULL REFERENCES insp_templates(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  role         TEXT NOT NULL DEFAULT 'responsable'
                 CHECK (role IN ('responsable','cofirmante')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, user_id)
);

-- ─── 4. Máquinas (autoelevadores, etc.) ───────────────────────────
CREATE TABLE IF NOT EXISTS insp_machines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,                 -- AE-01, AE-02, ...
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'autoelevador',
  qr_token    UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),  -- token del QR (rotable)
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER insp_machines_updated_at BEFORE UPDATE ON insp_machines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 5. Operadores / choferes (sin usuario SSO) ───────────────────
CREATE TABLE IF NOT EXISTS insp_operators (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),        -- opcional: si ya es empleado
  full_name   TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,                        -- bcrypt del PIN de 4 dígitos
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER insp_operators_updated_at BEFORE UPDATE ON insp_operators
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. Config key/value (geofence DASSA, etc.) ───────────────────
CREATE TABLE IF NOT EXISTS insp_config (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER insp_config_updated_at BEFORE UPDATE ON insp_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 7. Inspecciones (cada ejecución de un formulario) ────────────
CREATE TABLE IF NOT EXISTS insp_inspections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE,                      -- RON-YYYY-### / MAQ-YYYY-##### (trigger)
  template_id     UUID NOT NULL REFERENCES insp_templates(id),
  family          insp_family NOT NULL,
  status          insp_status NOT NULL DEFAULT 'pendiente',
  period_label    TEXT,                             -- "Semana 2026-W21", "2026-05-19"
  scheduled_date  DATE NOT NULL,
  due_date        DATE,
  machine_id      UUID REFERENCES insp_machines(id),
  operator_id     UUID REFERENCES insp_operators(id),
  completed_by    UUID REFERENCES users(id),
  cosigned_by     UUID REFERENCES users(id),
  task_id         UUID REFERENCES tasks(id),        -- tarea pendiente vinculada (rondines)
  machine_hours   NUMERIC,                          -- horómetro (maquinaria)
  geo_lat         NUMERIC,
  geo_lng         NUMERIC,
  geo_inside      BOOLEAN,                          -- dentro del geofence DASSA
  submitted_ip    TEXT,
  submitted_ua    TEXT,
  signature_url   TEXT,
  cosign_url      TEXT,
  findings_count  INT NOT NULL DEFAULT 0,
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);
CREATE TRIGGER insp_inspections_updated_at BEFORE UPDATE ON insp_inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_insp_insp_status   ON insp_inspections(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_insp_insp_template ON insp_inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_insp_insp_machine  ON insp_inspections(machine_id, scheduled_date);

-- Auto-generar código de inspección (RON / MAQ)
CREATE OR REPLACE FUNCTION gen_insp_code()
RETURNS TRIGGER AS $$
DECLARE prefix TEXT; yr TEXT; seq INT; width INT;
BEGIN
  IF NEW.code IS NOT NULL THEN RETURN NEW; END IF;
  yr     := to_char(NOW(), 'YYYY');
  prefix := CASE NEW.family WHEN 'maquinaria' THEN 'MAQ' ELSE 'RON' END;
  width  := CASE NEW.family WHEN 'maquinaria' THEN 5 ELSE 3 END;
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1
    INTO seq FROM insp_inspections
   WHERE code LIKE prefix || '-' || yr || '-%';
  NEW.code := prefix || '-' || yr || '-' || LPAD(seq::TEXT, width, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_insp_code BEFORE INSERT ON insp_inspections
  FOR EACH ROW EXECUTE FUNCTION gen_insp_code();

-- ─── 8. Respuestas por ítem ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS insp_responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES insp_inspections(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES insp_template_items(id),
  answer        TEXT,                               -- si|no|cumple|no_cumple|texto|numero
  observations  TEXT,
  photo_urls    TEXT[] NOT NULL DEFAULT '{}',
  finding_id    UUID REFERENCES findings(id),        -- NC generada desde el ítem
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insp_resp_inspection ON insp_responses(inspection_id);

-- ─── 9. Asignados a cada inspección (rondines) ────────────────────
CREATE TABLE IF NOT EXISTS insp_assignees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES insp_inspections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  role          TEXT NOT NULL DEFAULT 'responsable'
                  CHECK (role IN ('responsable','cofirmante')),
  signed        BOOLEAN NOT NULL DEFAULT false,
  signed_at     TIMESTAMPTZ,
  UNIQUE (inspection_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_insp_assignees_inspection ON insp_assignees(inspection_id);
CREATE INDEX IF NOT EXISTS idx_insp_assignees_user       ON insp_assignees(user_id);

COMMIT;
