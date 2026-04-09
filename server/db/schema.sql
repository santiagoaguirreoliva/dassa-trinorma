-- ============================================================
-- DASSA SGI — Schema Completo
-- Ejecutar: psql $DATABASE_URL -f server/db/schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM (
  'master_admin', 'director', 'sgi_leader',
  'seguridad_higiene', 'operaciones', 'rrhh',
  'compras_approver', 'auditor_externo'
);

CREATE TYPE finding_type AS ENUM ('nc_real', 'nc_potencial', 'mejora', 'desvio_cliente');
CREATE TYPE finding_status AS ENUM ('abierto','analisis','plan_accion','en_ejecucion','verificacion','cerrado');
CREATE TYPE finding_origin AS ENUM ('auditoria_interna','auditoria_externa','reclamo_cliente','desvio_operativo','accidente','inspeccion','revision_direccion','comite');
CREATE TYPE task_status AS ENUM ('pendiente','en_curso','completada','cancelada');
CREATE TYPE purchase_status AS ENUM ('borrador','pendiente','aprobada','aprobada_diferida','en_ejecucion','completada','rechazada','cancelada');
CREATE TYPE doc_type AS ENUM ('procedimiento','instruccion','registro','manual','formulario');
CREATE TYPE doc_status AS ENUM ('borrador','revision','aprobado','obsoleto');
CREATE TYPE training_type AS ENUM ('capacitacion','reunion','simulacro','examen_medico','induccion');
CREATE TYPE training_status AS ENUM ('programada','en_curso','completada','cancelada');
CREATE TYPE risk_level AS ENUM ('bajo','medio','alto');
CREATE TYPE survey_type AS ENUM ('clientes_remoto','clientes_presencial','proveedores','equipo_dassa');
CREATE TYPE cert_status AS ENUM ('vigente','por_vencer','vencido');

-- ─── UPDATED_AT FUNCTION ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── 1. USUARIOS ────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          app_role NOT NULL DEFAULT 'operaciones',
  position      TEXT,
  department    TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 2. NOTIFICACIONES ──────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',  -- info | warning | danger | success
  is_read    BOOLEAN DEFAULT false,
  link       TEXT,
  source_module TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ─── 3. FICHAS DE PUESTO ────────────────────────────────────
CREATE TABLE job_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role_label      TEXT NOT NULL,
  responsibilities TEXT[],
  objectives       TEXT[],
  kpis             TEXT[],
  reports_to       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER job_profiles_updated_at BEFORE UPDATE ON job_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. HALLAZGOS / NC / DESVÍOS ────────────────────────────
CREATE TABLE findings (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                   TEXT NOT NULL UNIQUE,
  title                  TEXT NOT NULL,
  description            TEXT NOT NULL,
  finding_type           finding_type NOT NULL,
  status                 finding_status DEFAULT 'abierto',
  origin                 finding_origin DEFAULT 'desvio_operativo',
  area                   TEXT,
  due_date               DATE,
  reported_by            UUID REFERENCES users(id),
  assigned_to            UUID REFERENCES users(id),
  verified_by            UUID REFERENCES users(id),
  immediate_action       TEXT,
  cause_analysis_type    TEXT,   -- 5_porques | ishikawa | arbol_fallas
  cause_analysis_content TEXT,
  evidence_urls          TEXT[],
  financial_impact       NUMERIC(12,2),
  verification_date_30   DATE,
  verification_date_60   DATE,
  v30_done               BOOLEAN DEFAULT false,
  v60_done               BOOLEAN DEFAULT false,
  efficacy_verified      BOOLEAN DEFAULT false,
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER findings_updated_at BEFORE UPDATE ON findings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_assigned ON findings(assigned_to);

-- Auto-generar código NC
CREATE OR REPLACE FUNCTION gen_finding_code()
RETURNS TRIGGER AS $$
DECLARE prefix TEXT; yr TEXT; seq INT;
BEGIN
  yr := to_char(NOW(), 'YYYY');
  prefix := CASE finding_type
    WHEN 'nc_real'       THEN 'NC'
    WHEN 'nc_potencial'  THEN 'NCP'
    WHEN 'mejora'        THEN 'OM'
    ELSE 'DEV'
  END;
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1
    INTO seq FROM findings
   WHERE code LIKE prefix || '-' || yr || '-%';
  NEW.code := prefix || '-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_finding_code BEFORE INSERT ON findings FOR EACH ROW EXECUTE FUNCTION gen_finding_code();

-- Calcular fechas verificación
CREATE OR REPLACE FUNCTION calc_verification_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verificacion' AND OLD.status <> 'verificacion' THEN
    NEW.verification_date_30 := CURRENT_DATE + 30;
    NEW.verification_date_60 := CURRENT_DATE + 60;
  END IF;
  IF NEW.status = 'cerrado' AND OLD.status <> 'cerrado' THEN
    NEW.closed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER findings_verification BEFORE UPDATE ON findings FOR EACH ROW EXECUTE FUNCTION calc_verification_dates();

-- ─── 5. ACCIONES CORRECTIVAS ────────────────────────────────
CREATE TABLE finding_actions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id     UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  responsible_id UUID REFERENCES users(id),
  due_date       DATE,
  status         task_status DEFAULT 'pendiente',
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER finding_actions_updated_at BEFORE UPDATE ON finding_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. COMENTARIOS DE HALLAZGOS ────────────────────────────
CREATE TABLE finding_comments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id       UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  content          TEXT NOT NULL,
  is_ai_suggestion BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. TAREAS CENTRALES ────────────────────────────────────
CREATE TABLE tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  description      TEXT,
  status           task_status DEFAULT 'pendiente',
  priority         TEXT DEFAULT 'media',  -- baja | media | alta | urgente
  due_date         DATE,
  assigned_to      UUID REFERENCES users(id),
  created_by       UUID REFERENCES users(id),
  source_module    TEXT DEFAULT 'general',
  finding_id       UUID REFERENCES findings(id),
  committee_id     UUID,  -- FK added later
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);

-- ─── 8. RIESGOS (P×S) ───────────────────────────────────────
CREATE TABLE risks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT NOT NULL UNIQUE,
  activity            TEXT NOT NULL,
  hazard              TEXT NOT NULL,
  risk_factor         TEXT,        -- RIESGO FISICO | QUIMICO | PSICOFISICO
  activity_type       TEXT,        -- R | NR | EMERGENCIA
  impact              TEXT,
  probability         INT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  severity            INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  ir                  INT GENERATED ALWAYS AS (probability * severity) STORED,
  risk_level          risk_level GENERATED ALWAYS AS (
    CASE
      WHEN probability * severity >= 13 THEN 'alto'::risk_level
      WHEN probability * severity >= 5  THEN 'medio'::risk_level
      ELSE 'bajo'::risk_level
    END
  ) STORED,
  legal_req           BOOLEAN DEFAULT false,
  current_controls    TEXT,
  responsible_id      UUID REFERENCES users(id),
  start_date          DATE,
  end_date            DATE,
  control_status      INT DEFAULT 0, -- 0=no aplica 1=planeado 2=proceso 3=cerrado 4=verificado
  residual_probability INT,
  residual_severity    INT,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 9. CARPETAS DE DOCUMENTOS ──────────────────────────────
CREATE TABLE document_folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES document_folders(id),
  icon        TEXT DEFAULT 'Folder',
  order_index INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. DOCUMENTOS SGI ──────────────────────────────────────
CREATE TABLE documents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  description        TEXT,
  doc_type           doc_type NOT NULL,
  folder_id          UUID REFERENCES document_folders(id),
  version            INT DEFAULT 1,
  status             doc_status DEFAULT 'borrador',
  norma              TEXT,  -- ISO 9001 | 14001 | 45001 | MIXTO
  responsible_id     UUID REFERENCES users(id),
  approved_by        UUID REFERENCES users(id),
  approved_at        TIMESTAMPTZ,
  effective_date     DATE,
  review_date        DATE,
  file_url           TEXT,
  file_name          TEXT,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 11. VERSIONES DE DOCUMENTOS ────────────────────────────
CREATE TABLE document_versions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id        UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version            INT NOT NULL,
  file_url           TEXT,
  file_name          TEXT,
  change_description TEXT,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. CAPACITACIONES ──────────────────────────────────────
CREATE TABLE trainings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  description      TEXT,
  objective        TEXT,
  legal_framework  TEXT,
  training_type    training_type NOT NULL,
  status           training_status DEFAULT 'programada',
  category         TEXT DEFAULT 'obligatoria',
  scheduled_date   TIMESTAMPTZ NOT NULL,
  location         TEXT,
  instructor       TEXT,
  duration_hours   NUMERIC(4,1),
  max_participants INT,
  is_mandatory     BOOLEAN DEFAULT false,
  evidence_url     TEXT,
  organized_by     UUID REFERENCES users(id),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trainings_updated_at BEFORE UPDATE ON trainings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 13. PARTICIPANTES DE CAPACITACIÓN ──────────────────────
CREATE TABLE training_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_id     UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  attended        BOOLEAN DEFAULT false,
  attendance_date TIMESTAMPTZ,
  score           NUMERIC(4,1),
  dni             TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(training_id, user_id)
);

-- ─── 14. EVIDENCIA DE CAPACITACIÓN ──────────────────────────
CREATE TABLE training_evidence (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  file_type   TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 15. REQUISITOS LEGALES ──────────────────────────────────
CREATE TABLE legal_requirements (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                   TEXT NOT NULL UNIQUE,
  title                  TEXT NOT NULL,
  description            TEXT,
  category               TEXT NOT NULL,
  issuing_authority      TEXT,
  applicable_area        TEXT,
  effective_date         DATE,
  expiration_date        DATE,
  alert_days_before      INT DEFAULT 90,
  is_active              BOOLEAN DEFAULT true,
  last_verification_date DATE,
  responsible_id         UUID REFERENCES users(id),
  evidence_url           TEXT,
  evidence_notes         TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER legal_updated_at BEFORE UPDATE ON legal_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 16. COMPRAS ─────────────────────────────────────────────
CREATE TABLE purchases (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 TEXT NOT NULL UNIQUE,
  description          TEXT NOT NULL,
  category             TEXT DEFAULT 'general',
  priority             TEXT DEFAULT 'media',
  estimated_budget     NUMERIC(12,2),
  required_date        DATE NOT NULL,
  purpose              TEXT,
  recommended_supplier TEXT,
  requested_by         UUID NOT NULL REFERENCES users(id),
  status               purchase_status DEFAULT 'borrador',
  approved_by          UUID REFERENCES users(id),
  approved_at          TIMESTAMPTZ,
  approval_notes       TEXT,
  deferred_until       DATE,
  supplier_name        TEXT,
  supplier_contact     TEXT,
  purchase_date        DATE,
  amount               NUMERIC(12,2),
  payment_method       TEXT,
  invoice_number       TEXT,
  executed_by          UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-código OR
CREATE OR REPLACE FUNCTION gen_purchase_code()
RETURNS TRIGGER AS $$
DECLARE yr TEXT; seq INT;
BEGIN
  yr := to_char(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1
    INTO seq FROM purchases WHERE code LIKE 'OR-' || yr || '-%';
  NEW.code := 'OR-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_purchase_code BEFORE INSERT ON purchases FOR EACH ROW EXECUTE FUNCTION gen_purchase_code();

-- ─── 17. COMENTARIOS DE COMPRAS ─────────────────────────────
CREATE TABLE purchase_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 18. COMITÉ MIXTO ────────────────────────────────────────
CREATE TABLE committee_meetings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_date      DATE NOT NULL,
  meeting_number    INT,
  year              INT DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  month             INT DEFAULT EXTRACT(MONTH FROM NOW())::INT,
  attendees         TEXT[],
  attendee_ids      UUID[],
  agenda            TEXT,
  minutes           TEXT,       -- Acta completa (texto libre)
  ai_processed      BOOLEAN DEFAULT false,
  ai_summary        TEXT,       -- Resumen generado por IA
  ai_tasks_extracted JSONB,     -- Tareas extraídas por IA
  location          TEXT DEFAULT 'DASSA — Sarandi',
  next_meeting_date DATE,
  status            TEXT DEFAULT 'programada',  -- programada | realizada | cancelada
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER committee_updated_at BEFORE UPDATE ON committee_meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 19. TAREAS DEL COMITÉ ───────────────────────────────────
CREATE TABLE committee_tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id    UUID NOT NULL REFERENCES committee_meetings(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  responsible_id UUID REFERENCES users(id),
  due_date      DATE,
  status        task_status DEFAULT 'pendiente',
  priority      TEXT DEFAULT 'media',
  source        TEXT DEFAULT 'manual',  -- manual | ai_extracted
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER committee_tasks_updated_at BEFORE UPDATE ON committee_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FK back-reference
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_committee FOREIGN KEY (committee_id) REFERENCES committee_meetings(id);

-- ─── 20. EMPLEADOS / LEGAJOS ─────────────────────────────────
CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES users(id),  -- puede no tener cuenta
  employee_number TEXT UNIQUE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  dni             TEXT,
  cuil            TEXT,
  position        TEXT,
  department      TEXT,
  hire_date       DATE,
  termination_date DATE,
  is_active       BOOLEAN DEFAULT true,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  emergency_contact TEXT,
  emergency_phone   TEXT,
  blood_type      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 21. CARNETS Y HABILITACIONES ────────────────────────────
CREATE TABLE employee_certifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_type       TEXT NOT NULL,  -- carnet_autoelevador | carnet_kalmar | carnet_clarkista | examen_medico | etc.
  cert_name       TEXT NOT NULL,
  issued_by       TEXT,
  issue_date      DATE,
  expiry_date     DATE,
  status          cert_status DEFAULT 'vigente',
  file_url        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER emp_certs_updated_at BEFORE UPDATE ON employee_certifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 22. DOCUMENTOS DEL EMPLEADO ────────────────────────────
CREATE TABLE employee_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,  -- apercibimiento | acta | contrato | cv | otro
  title       TEXT NOT NULL,
  description TEXT,
  file_url    TEXT,
  doc_date    DATE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 23. ASPECTOS AMBIENTALES ────────────────────────────────
CREATE TABLE environmental_aspects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area            TEXT NOT NULL,
  activity        TEXT NOT NULL,
  aspect          TEXT NOT NULL,
  impact          TEXT NOT NULL,
  condition       TEXT DEFAULT 'normal',  -- normal | anormal | emergencia
  frequency       INT NOT NULL CHECK (frequency BETWEEN 1 AND 5),
  severity        INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  significance    INT GENERATED ALWAYS AS (frequency * severity) STORED,
  is_significant  BOOLEAN GENERATED ALWAYS AS (frequency * severity > 9) STORED,
  legal_req       BOOLEAN DEFAULT false,
  control_measure TEXT,
  responsible_id  UUID REFERENCES users(id),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER env_aspects_updated_at BEFORE UPDATE ON environmental_aspects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 24. INCIDENTES Y ACCIDENTES ─────────────────────────────
CREATE TABLE incidents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT NOT NULL UNIQUE,
  incident_type     TEXT NOT NULL,  -- incidente | accidente | casi_accidente
  date              DATE NOT NULL,
  time              TIME,
  area              TEXT,
  description       TEXT NOT NULL,
  severity          TEXT,  -- leve | moderado | grave | muy_grave
  injured_person    TEXT,
  witness           TEXT,
  immediate_cause   TEXT,
  root_cause        TEXT,
  corrective_action TEXT,
  status            TEXT DEFAULT 'abierto',
  reported_by       UUID REFERENCES users(id),
  responsible_id    UUID REFERENCES users(id),
  art_reported      BOOLEAN DEFAULT false,
  lost_time_days    INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION gen_incident_code()
RETURNS TRIGGER AS $$
DECLARE prefix TEXT; yr TEXT; seq INT;
BEGIN
  yr := to_char(NOW(), 'YYYY');
  prefix := CASE incident_type WHEN 'accidente' THEN 'ACC' ELSE 'INC' END;
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1
    INTO seq FROM incidents WHERE code LIKE prefix || '-' || yr || '-%';
  NEW.code := prefix || '-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_incident_code BEFORE INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION gen_incident_code();

-- ─── 25. PROVEEDORES ─────────────────────────────────────────
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  cuit            TEXT,
  category        TEXT,  -- transporte | servicios | insumos | mantenimiento
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  is_homologated  BOOLEAN DEFAULT false,
  homologation_date DATE,
  homologation_expiry DATE,
  score           NUMERIC(3,1),
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 26. ENCUESTAS ───────────────────────────────────────────
CREATE TABLE surveys (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  survey_type   survey_type NOT NULL,
  description   TEXT,
  period        TEXT,  -- Q1-2026 | Q2-2026
  year          INT,
  quarter       INT,
  is_active     BOOLEAN DEFAULT true,
  public_token  TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  closes_at     DATE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 27. PREGUNTAS DE ENCUESTA ───────────────────────────────
CREATE TABLE survey_questions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id    UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  indicator    TEXT,
  question_type TEXT NOT NULL,  -- scale_10 | scale_5 | scale_stars | choice | text
  options      JSONB,           -- para tipo choice
  is_required  BOOLEAN DEFAULT true,
  order_index  INT DEFAULT 0
);

-- ─── 28. RESPUESTAS DE ENCUESTA ──────────────────────────────
CREATE TABLE survey_responses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id    UUID NOT NULL REFERENCES surveys(id),
  respondent_name  TEXT,
  respondent_email TEXT,
  respondent_company TEXT,
  respondent_role TEXT,
  answers      JSONB NOT NULL,  -- {question_id: value}
  nps_score    INT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 29. SISTEMA DE GESTIÓN (misión, visión, valores) ────────
CREATE TABLE system_content (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section    TEXT NOT NULL UNIQUE,  -- mision | vision | valores | politica_calidad | politica_ambiental | politica_sst
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 30. ANÁLISIS DE CONTEXTO (FODA) ─────────────────────────
CREATE TABLE context_analysis (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foda_type   TEXT NOT NULL,   -- fortaleza | debilidad | oportunidad | amenaza
  category    TEXT NOT NULL,   -- interno | externo
  description TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE context_strategies (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_type  TEXT NOT NULL,   -- FO | FA | DO | DA
  name           TEXT NOT NULL,
  description    TEXT,
  actions        JSONB DEFAULT '[]',
  deadline       DATE,
  responsible_id UUID REFERENCES users(id),
  status         TEXT DEFAULT 'planned',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 31. PARTES INTERESADAS ──────────────────────────────────
CREATE TABLE stakeholders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  stakeholder_type    TEXT NOT NULL,  -- interno | externo
  category            TEXT,
  needs_expectations  TEXT,
  influence_level     TEXT DEFAULT 'medio',
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ADICIONALES ────────────────────────────────────
CREATE INDEX idx_findings_type ON findings(finding_type);
CREATE INDEX idx_risks_level ON risks(risk_level);
CREATE INDEX idx_legal_expiry ON legal_requirements(expiration_date) WHERE is_active = true;
CREATE INDEX idx_trainings_date ON trainings(scheduled_date);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_committee_year_month ON committee_meetings(year, month);
CREATE INDEX idx_emp_certs_expiry ON employee_certifications(expiry_date);
