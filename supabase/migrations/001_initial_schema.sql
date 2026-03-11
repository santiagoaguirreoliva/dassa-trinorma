-- ============================================================
-- DASSA TRINORMA MANAGER — Schema Completo
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM (
  'master_admin',
  'direccion_sgi',
  'sgi_leader',
  'seguridad_higiene',
  'operaciones',
  'rrhh',
  'compras_approver',
  'compras_executor'
);

CREATE TYPE finding_type AS ENUM ('nc_real', 'nc_potencial', 'mejora');

CREATE TYPE finding_status AS ENUM (
  'abierto', 'analisis', 'plan_accion', 'en_ejecucion', 'verificacion', 'cerrado'
);

CREATE TYPE task_status AS ENUM ('pendiente', 'en_curso', 'completada', 'cancelada');

CREATE TYPE purchase_request_status AS ENUM (
  'borrador', 'pendiente', 'aprobada', 'aprobada_diferida',
  'en_ejecucion', 'completada', 'rechazada', 'cancelada'
);

CREATE TYPE document_type AS ENUM ('P', 'F', 'I', 'M');

CREATE TYPE document_status AS ENUM ('draft', 'pending_approval', 'approved', 'obsolete');

CREATE TYPE training_type AS ENUM ('capacitacion', 'reunion', 'compromiso', 'examen_medico');

CREATE TYPE foda_type AS ENUM ('strength', 'weakness', 'opportunity', 'threat');

CREATE TYPE strategy_type AS ENUM ('FO', 'FA', 'DO', 'DA');

CREATE TYPE strategy_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- ─── UPDATED_AT TRIGGER FUNCTION ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── PROFILES ───────────────────────────────────────────────
CREATE TABLE profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  email       text NOT NULL,
  avatar_url  text,
  position    text,
  department  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── USER ROLES ──────────────────────────────────────────────
CREATE TABLE user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- ─── FINDINGS (NC) ───────────────────────────────────────────
CREATE TABLE findings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                      text NOT NULL,
  title                     text NOT NULL,
  description               text NOT NULL,
  finding_type              finding_type NOT NULL,
  status                    finding_status DEFAULT 'abierto',
  origin                    text DEFAULT 'desvio_operativo',
  area                      text,
  due_date                  date,
  reported_by               uuid REFERENCES profiles(id),
  assigned_to               uuid REFERENCES profiles(id),
  verified_by               uuid REFERENCES profiles(id),
  immediate_action          text,
  cause_analysis_type       text,
  cause_analysis_content    text,
  evidence_urls             text[],
  financial_impact          numeric,
  closed_at                 timestamptz,
  verification_date_30      date,
  verification_date_60      date,
  verification_30_completed boolean DEFAULT false,
  verification_60_completed boolean DEFAULT false,
  efficacy_verified         boolean DEFAULT false,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE TRIGGER findings_updated_at
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generar código: NC-2026-001
CREATE OR REPLACE FUNCTION generate_finding_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
  year_str text;
  seq int;
BEGIN
  year_str := to_char(now(), 'YYYY');
  
  IF NEW.finding_type = 'nc_real' THEN
    prefix := 'NC';
  ELSIF NEW.finding_type = 'nc_potencial' THEN
    prefix := 'NCP';
  ELSE
    prefix := 'OM';
  END IF;
  
  SELECT COALESCE(MAX(
    CAST(split_part(code, '-', 3) AS integer)
  ), 0) + 1
  INTO seq
  FROM findings
  WHERE finding_type = NEW.finding_type
    AND code LIKE prefix || '-' || year_str || '-%';
  
  NEW.code := prefix || '-' || year_str || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_finding_code
  BEFORE INSERT ON findings
  FOR EACH ROW EXECUTE FUNCTION generate_finding_code();

-- Calcular fechas de verificación 30/60 días
CREATE OR REPLACE FUNCTION calculate_verification_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verificacion' AND OLD.status <> 'verificacion' THEN
    NEW.verification_date_30 := CURRENT_DATE + INTERVAL '30 days';
    NEW.verification_date_60 := CURRENT_DATE + INTERVAL '60 days';
  END IF;
  IF NEW.status = 'cerrado' AND OLD.status <> 'cerrado' THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER findings_verification_dates
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION calculate_verification_dates();

-- ─── FINDING ACTIONS ─────────────────────────────────────────
CREATE TABLE finding_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id     uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description    text NOT NULL,
  responsible_id uuid REFERENCES profiles(id),
  due_date       date,
  status         task_status DEFAULT 'pendiente',
  completed_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TRIGGER finding_actions_updated_at
  BEFORE UPDATE ON finding_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── FINDING COMMENTS ────────────────────────────────────────
CREATE TABLE finding_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id        uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id),
  content           text NOT NULL,
  is_ai_suggestion  boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- ─── TASKS (Central) ─────────────────────────────────────────
CREATE TABLE tasks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  description          text,
  status               task_status DEFAULT 'pendiente',
  priority             text DEFAULT 'media',
  due_date             date,
  assigned_to          uuid REFERENCES profiles(id),
  created_by           uuid REFERENCES profiles(id),
  source_module        text DEFAULT 'general',
  finding_id           uuid REFERENCES findings(id),
  finding_action_id    uuid REFERENCES finding_actions(id),
  completed_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RISKS ───────────────────────────────────────────────────
CREATE TABLE risks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL,
  hazard_aspect        text NOT NULL,
  risk_impact          text NOT NULL,
  probability          integer NOT NULL CHECK (probability BETWEEN 1 AND 4),
  severity             integer NOT NULL CHECK (severity BETWEEN 1 AND 4),
  detection            integer DEFAULT 2 CHECK (detection BETWEEN 1 AND 4),
  npr                  integer GENERATED ALWAYS AS (probability * severity * detection) STORED,
  risk_type            text DEFAULT 'riesgo',
  process_area         text,
  control_description  text,
  responsible_id       uuid REFERENCES profiles(id),
  potential_cause      text,
  affected_parties     text,
  actions              jsonb DEFAULT '[]',
  review_frequency     text DEFAULT 'trimestral',
  last_review_date     date,
  next_review_date     date,
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TRIGGER risks_updated_at
  BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_risk_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
  seq int;
BEGIN
  prefix := CASE WHEN NEW.risk_type = 'oportunidad' THEN 'O' ELSE 'R' END;
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 2) AS integer)), 0) + 1
  INTO seq FROM risks WHERE risk_type = NEW.risk_type;
  NEW.code := prefix || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_risk_code
  BEFORE INSERT ON risks
  FOR EACH ROW WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION generate_risk_code();

-- ─── DOCUMENT FOLDERS ────────────────────────────────────────
CREATE TABLE document_folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  icon        text DEFAULT 'Folder',
  parent_id   uuid REFERENCES document_folders(id),
  order_index integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── DOCUMENTS ───────────────────────────────────────────────
CREATE TABLE documents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL,
  title                text NOT NULL,
  description          text,
  document_type        document_type NOT NULL,
  folder_id            uuid REFERENCES document_folders(id),
  parent_procedure_id  uuid REFERENCES documents(id),
  version              integer DEFAULT 1,
  status               document_status DEFAULT 'draft',
  responsible_id       uuid REFERENCES profiles(id),
  approved_by          uuid REFERENCES profiles(id),
  approved_at          timestamptz,
  effective_date       date,
  file_url             text,
  file_name            text,
  created_by           uuid REFERENCES profiles(id),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── TRAININGS ───────────────────────────────────────────────
CREATE TABLE trainings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text,
  objective          text,
  legal_framework    text,
  target_audience    text,
  frequency          text,
  category           text DEFAULT 'obligatoria',
  year               integer DEFAULT EXTRACT(YEAR FROM now()),
  scheduled_date     timestamptz NOT NULL,
  location           text,
  instructor         text,
  duration_hours     numeric,
  max_participants   integer,
  is_mandatory       boolean DEFAULT false,
  is_completed       boolean DEFAULT false,
  completed_at       timestamptz,
  training_type      training_type NOT NULL,
  evidence_url       text,
  organized_by       uuid REFERENCES profiles(id),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TRIGGER trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE training_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id     uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id),
  attended        boolean DEFAULT false,
  attendance_date timestamptz,
  notes           text,
  dni             text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(training_id, profile_id)
);

-- ─── LEGAL REQUIREMENTS ──────────────────────────────────────
CREATE TABLE legal_requirements (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    text NOT NULL,
  title                   text NOT NULL,
  description             text,
  category                text NOT NULL,
  issuing_authority       text,
  applicable_area         text,
  effective_date          date,
  expiration_date         date,
  is_active               boolean DEFAULT true,
  last_verification_date  date,
  responsible_id          uuid REFERENCES profiles(id),
  evidence_url            text,
  evidence_notes          text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE TRIGGER legal_requirements_updated_at
  BEFORE UPDATE ON legal_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── PURCHASE REQUESTS ───────────────────────────────────────
CREATE TABLE purchase_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL,
  description          text NOT NULL,
  category             text DEFAULT 'general',
  priority             text DEFAULT 'media',
  estimated_budget     numeric,
  required_date        date NOT NULL,
  purpose              text,
  recommended_supplier text,
  requested_by         uuid NOT NULL REFERENCES profiles(id),
  status               purchase_request_status DEFAULT 'borrador',
  approved_by          uuid REFERENCES profiles(id),
  approved_at          timestamptz,
  approval_notes       text,
  deferred_until       date,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE TRIGGER purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str text;
  seq int;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 2) AS integer)), 0) + 1
  INTO seq FROM purchase_requests WHERE code LIKE 'OR-' || year_str || '-%';
  NEW.code := 'OR-' || year_str || '-' || LPAD(seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_code
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION generate_purchase_code();

-- ─── CONTEXT ANALYSIS (FODA) ─────────────────────────────────
CREATE TABLE context_analysis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        foda_type NOT NULL,
  category    varchar NOT NULL,
  description text NOT NULL,
  order_index integer DEFAULT 0,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE context_strategies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_type   strategy_type NOT NULL,
  name            varchar NOT NULL,
  description     text,
  actions         jsonb DEFAULT '[]',
  deadline        date,
  responsible_id  uuid REFERENCES profiles(id),
  status          strategy_status DEFAULT 'planned',
  efficacy_notes  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── SGI SCOPE ───────────────────────────────────────────────
CREATE TABLE sgi_scope (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text NOT NULL DEFAULT '',
  updated_by  uuid REFERENCES profiles(id),
  updated_at  timestamptz DEFAULT now()
);

INSERT INTO sgi_scope (content) VALUES (
  'DASSA (Depósito Avellaneda Sur S.A.) aplica el SGI a todas las actividades de depósito fiscal, logística y comercio exterior realizadas en su sede de Avellaneda, Provincia de Buenos Aires, Argentina.'
);

-- ─── STAKEHOLDERS ────────────────────────────────────────────
CREATE TABLE stakeholders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  type             text NOT NULL,  -- 'interno' | 'externo'
  category         text,
  needs_expectations text,
  influence_level  text DEFAULT 'medio',
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id),
  title      text NOT NULL,
  message    text,
  type       text DEFAULT 'info',
  is_read    boolean DEFAULT false,
  link       text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_analysis   ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgi_scope          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- PROFILES: cada uno ve el suyo, admins ven todos
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','direccion_sgi']::app_role[]));

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- USER ROLES: solo admins gestionan
CREATE POLICY "user_roles_select_self" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin" ON user_roles
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','direccion_sgi']::app_role[]));

-- FINDINGS: todos autenticados leen y crean; solo master_admin edita/elimina
CREATE POLICY "findings_select" ON findings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "findings_insert" ON findings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "findings_update" ON findings
  FOR UPDATE USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','direccion_sgi']::app_role[])
  );

CREATE POLICY "findings_delete" ON findings
  FOR DELETE USING (has_role(auth.uid(), 'master_admin'));

-- FINDING ACTIONS/COMMENTS: todos autenticados
CREATE POLICY "finding_actions_all" ON finding_actions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "finding_comments_all" ON finding_comments
  FOR ALL USING (auth.role() = 'authenticated');

-- TASKS: todos autenticados
CREATE POLICY "tasks_all" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- RISKS: todos leen, seguridad/sgi gestionan
CREATE POLICY "risks_select" ON risks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "risks_manage" ON risks
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','seguridad_higiene']::app_role[])
  );

-- DOCUMENTS: todos leen, sgi gestiona
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "documents_manage" ON documents
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader']::app_role[])
  );

CREATE POLICY "document_folders_all" ON document_folders
  FOR ALL USING (auth.role() = 'authenticated');

-- TRAININGS: todos leen, rrhh/sgi gestionan
CREATE POLICY "trainings_select" ON trainings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "trainings_manage" ON trainings
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','rrhh']::app_role[])
  );

CREATE POLICY "training_participants_all" ON training_participants
  FOR ALL USING (auth.role() = 'authenticated');

-- LEGAL: todos leen, sgi gestiona
CREATE POLICY "legal_select" ON legal_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "legal_manage" ON legal_requirements
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader']::app_role[])
  );

-- PURCHASES: todos crean y leen
CREATE POLICY "purchases_select" ON purchase_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "purchases_insert" ON purchase_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "purchases_update" ON purchase_requests
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = requested_by)
    OR has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','compras_approver','compras_executor']::app_role[])
  );

-- CONTEXT: todos leen, líderes gestionan
CREATE POLICY "context_select" ON context_analysis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "context_manage" ON context_analysis
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','direccion_sgi']::app_role[])
  );

CREATE POLICY "strategies_select" ON context_strategies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "strategies_manage" ON context_strategies
  FOR ALL USING (
    has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader','direccion_sgi']::app_role[])
  );

-- SGI SCOPE / STAKEHOLDERS: todos leen
CREATE POLICY "scope_select" ON sgi_scope
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "scope_update" ON sgi_scope
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['master_admin','sgi_leader']::app_role[]));

CREATE POLICY "stakeholders_all" ON stakeholders
  FOR ALL USING (auth.role() = 'authenticated');

-- NOTIFICATIONS: cada uno ve las suyas
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));
