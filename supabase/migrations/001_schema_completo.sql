-- ═══════════════════════════════════════════════════════════════
-- DASSA TRINORMA MANAGER — Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM (
  'master_admin', 'direccion_sgi', 'sgi_leader',
  'seguridad_higiene', 'operaciones', 'rrhh',
  'compras_approver', 'compras_executor'
);

CREATE TYPE finding_type AS ENUM ('nc_real', 'nc_potencial', 'mejora');
CREATE TYPE finding_status AS ENUM ('abierto','analisis','plan_accion','en_ejecucion','verificacion','cerrado');
CREATE TYPE task_status AS ENUM ('pendiente','en_curso','completada','cancelada');
CREATE TYPE document_type AS ENUM ('P','F','I','M');
CREATE TYPE document_status AS ENUM ('draft',\pending_approval','approved','obsolete');
CREATE TYPE training_type AS ENUM ('capacitacion','reunion','compromiso','examen_medico');
CREATE TYPE purchase_request_status AS ENUM (
  'borrador','pendiente','aprobada','aprobada_diferida',
  'en_ejecucion','completada','rechazada','cancelada'
);

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  position text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- ─── USER ROLES ───────────────────────────────────────────────────────────────
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all roles" ON user_roles FOR SELECT USING (true);

-- Function: has_role
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ─── HANDLE NEW USER ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── UPDATE UPDATED_AT ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── FINDINGS ────────────────────────────────────────────────────────────────
CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  finding_type finding_type NOT NULL DEFAULT 'nc_real',
  status finding_status DEFAULT 'abierto',
  origin text DEFAULT 'desvio_operativo',
  area text,
  due_date date,
  reported_by uuid REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),
  verified_by uuid REFERENCES profiles(id),
  immediate_action text,
  cause_analysis_type text,
  cause_analysis_content text,
  evidence_urls text[],
  financial_impact numeric,
  closed_at timestamptz,
  verification_date_30 date,
  verification_date_60 date,
  verification_30_completed boolean DEFAULT false,
  verification_60_completed boolean DEFAULT false,
  efficacy_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_type ON findings(finding_type);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view findings" ON findings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create findings" ON findings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Master admin can update findings" ON findings FOR UPDATE USING (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'sgi_leader'));

-- Auto-generar código
CREATE OR REPLACE FUNCTION generate_finding_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  prefix text;
  year_str text;
  seq_num int;
  new_code text;
BEGIN
  year_str := to_char(now(), 'YYYY');
  IF NEW.finding_type = 'nc_real' THEN prefix := 'NC';
  ELSIF NEW.finding_type = 'nc_potencial' THEN prefix := 'NCP';
  ELSE prefix := 'OM';
  END IF;
  
  SELECT COUNT(*) + 1 INTO seq_num
  FROM findings WHERE code LIKE prefix || '-' || year_str || '-%';
  
  new_code := prefix || '-' || year_str || '-' || LPAD(seq_num::text, 3, '0');
  NEW.code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_finding_code
  BEFORE INSERT ON findings
  FOR EACH ROW EXECUTE FUNCTION generate_finding_code();

CREATE TRIGGER update_findings_updated_at
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── FINDING ACTIONS ─────────────────────────────────────────────────────────
CREATE TABLE finding_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsible_id uuid REFERENCES profiles(id),
  due_date date,
  status task_status DEFAULT 'pendiente',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE finding_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view finding actions" ON finding_actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All auth can manage finding actions" ON finding_actions FOR ALL USING (auth.role() = 'authenticated');

-- ─── FINDING COMMENTS ────────────────────────────────────────────────────────
CREATE TABLE finding_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  is_ai_suggestion boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE finding_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can manage comments" ON finding_comments FOR ALL USING (auth.role() = 'authenticated');

-- ─── RISKS ───────────────────────────────────────────────────────────────────
CREATE TABLE risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  hazard_aspect text NOT NULL,
  risk_impact text NOT NULL DEFAULT '',
  probability integer NOT NULL CHECK (probability BETWEEN 1 AND 4),
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 4),
  detection integer DEFAULT 2 CHECK (detection BETWEEN 1 AND 4),
  npr integer GENERATED ALWAYS AS (probability * severity * detection) STORED,
  risk_type text DEFAULT 'riesgo',
  process_area text,
  control_description text,
  responsible_id uuid REFERENCES profiles(id),
  actions jsonb DEFAULT '[]',
  review_frequency text DEFAULT 'trimestral',
  last_review_date date,
  next_review_date date,
  potential_cause text,
  affected_parties text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view risks" ON risks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SGI can manage risks" ON risks FOR ALL USING (
  has_role(auth.uid(), 'sgi_leader') OR has_role(auth.uid(), 'seguridad_higiene') OR has_role(auth.uid(), 'master_admin')
);

-- ─── PURCHASE REQUESTS ───────────────────────────────────────────────────────
CREATE TABLE purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text DEFAULT 'general',
  priority text DEFAULT 'media',
  estimated_budget numeric,
  required_date date NOT NULL,
  purpose text,
  recommended_supplier text,
  requested_by uuid NOT NULL REFERENCES profiles(id),
  status purchase_request_status DEFAULT 'borrador',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approval_notes text,
  deferred_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_purchase_code()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  year_str text;
  seq_num int;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM purchase_requests WHERE code LIKE 'OR-' || year_str || '-%';
  NEW.code := 'OR-' || year_str || '-' || LPAD(seq_num::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_purchase_code BEFORE INSERT ON purchase_requests FOR EACH ROW EXECUTE FUNCTION generate_purchase_code();

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view purchases" ON purchase_requests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All auth can create purchases" ON purchase_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Approvers can update" ON purchase_requests FOR UPDATE USING (
  has_role(auth.uid(), 'compras_approver') OR has_role(auth.uid(), 'sgi_leader') OR has_role(auth.uid(), 'master_admin')
);

-- ─── LEGAL REQUIREMENTS ──────────────────────────────────────────────────────
CREATE TABLE legal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  issuing_authority text,
  applicable_area text,
  effective_date date,
  expiration_date date,
  is_active boolean DEFAULT true,
  last_verification_date date,
  responsible_id uuid REFERENCES profiles(id),
  evidence_url text,
  evidence_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view legal" ON legal_requirements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SGI can manage legal" ON legal_requirements FOR ALL USING (
  has_role(auth.uid(), 'sgi_leader') OR has_role(auth.uid(), 'master_admin')
);

-- ─── TRAININGS ───────────────────────────────────────────────────────────────
CREATE TABLE trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  objective text,
  legal_framework text,
  target_audience text,
  frequency text,
  category text DEFAULT 'obligatoria',
  year integer DEFAULT 2026,
  scheduled_date timestamptz NOT NULL,
  location text,
  instructor text,
  duration_hours numeric,
  max_participants integer,
  is_mandatory boolean DEFAULT false,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  training_type training_type NOT NULL DEFAULT 'capacitacion',
  evidence_url text,
  organized_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE training_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id),
  attended boolean DEFAULT false,
  attendance_date timestamptz,
  notes text,
  dni text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_id, profile_id)
);

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view trainings" ON trainings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "RRHH and SGI can manage trainings" ON trainings FOR ALL USING (
  has_role(auth.uid(), 'rrhh') OR has_role(auth.uid(), 'sgi_leader') OR has_role(auth.uid(), 'master_admin')
);

ALTER TABLE training_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can manage participants" ON training_participants FOR ALL USING (auth.role() = 'authenticated');

-- ─── DOCUMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES document_folders(id),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  document_type document_type NOT NULL,
  folder_id uuid REFERENCES document_folders(id),
  version integer DEFAULT 1,
  status document_status DEFAULT 'draft',
  responsible_id uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  effective_date date,
  file_url text,
  file_name text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view documents" ON documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SGI can manage documents" ON documents FOR ALL USING (
  has_role(auth.uid(), 'sgi_leader') OR has_role(auth.uid(), 'master_admin')
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can view folders" ON document_folders FOR SELECT USING (auth.role() = 'authenticated');

-- ─── SEED: DATOS INICIALES DASSA ─────────────────────────────────────────────

-- Carpetas de documentos
INSERT INTO document_folders (name, description, order_index) VALUES
  ('Procedimientos del SGI', 'Procedimientos maestros del sistema', 1),
  ('Formularios y Registros', 'Formularios y planillas operativas', 2),
  ('Instructivos Operativos', 'Instrucciones de trabajo', 3),
  ('Manuales', 'Manuales del sistema', 4);

-- Requisitos legales base
INSERT INTO legal_requirements (code, title, category, applicable_area, expiration_date, is_active) VALUES
  ('RL-001', 'Habilitación Municipal — Actividad Industrial', 'Habilitación', 'General', '2026-06-30', true),
  ('RL-002', 'Certificado de Aptitud Ambiental', 'Ambiental', 'Ambiente', '2026-03-31', true),
  ('RL-003', 'Registro SENASA — Depósito Fiscal', 'Comercio Exterior', 'Comercio Ext.', '2026-12-15', true),
  ('RL-004', 'Homologación ADR — Cargas Peligrosas', 'Seguridad', 'Seguridad', '2026-05-01', true),
  ('RL-005', 'Registro OPDS Generador Residuos', 'Ambiental', 'Ambiente', '2026-09-30', true),
  ('RL-006', 'ART — Accidentes de Trabajo (vigente)', 'Laboral', 'RRHH', '2026-12-31', true);

-- Capacitaciones base 2026
INSERT INTO trainings (title, training_type, scheduled_date, is_mandatory, category, year) VALUES
  ('Inducción en Manejo de Cargas Peligrosas (DG)', 'capacitacion', '2026-03-18 09:00:00', true, 'obligatoria', 2026),
  ('Revisión por la Dirección — Q1 2026', 'reunion', '2026-03-25 10:00:00', true, 'obligatoria', 2026),
  ('Simulacro de Evacuación y Emergencias', 'compromiso', '2026-04-02 14:00:00', true, 'obligatoria', 2026),
  ('Uso de EPP — Actualización Normativa', 'capacitacion', '2026-04-10 09:00:00', true, 'obligatoria', 2026),
  ('Exámenes Médicos Periódicos', 'examen_medico', '2026-04-15 08:00:00', true, 'obligatoria', 2026),
  ('Manejo Seguro de Autoelevadores', 'capacitacion', '2026-05-05 09:00:00', true, 'obligatoria', 2026);

-- Riesgos base AMFE
INSERT INTO risks (code, hazard_aspect, risk_impact, probability, severity, detection, process_area, risk_type) VALUES
  ('R-001', 'Derrame de sustancias peligrosas', 'Contaminación suelo/agua, daño a personas', 2, 4, 2, 'Almacenamiento DG', 'riesgo'),
  ('R-002', 'Accidente con autoelevador', 'Lesión grave al operario o terceros', 3, 3, 2, 'Patio de maniobras', 'riesgo'),
  ('R-003', 'Incendio en depósito', 'Pérdida total de mercadería, lesiones graves', 1, 4, 2, 'General', 'riesgo'),
  ('R-004', 'Caída de altura en estructura', 'Lesión grave o fatal', 2, 4, 3, 'Mezzanine', 'riesgo'),
  ('R-005', 'Contaminación de suelo por efluentes', 'Impacto ambiental negativo', 1, 3, 2, 'Exterior depósito', 'riesgo'),
  ('R-006', 'Manejo incorrecto de residuos', 'Incumplimiento normativa ambiental', 2, 2, 2, 'General', 'riesgo'),
  ('R-007', 'Falla en sistema de pesaje MAGAYA', 'Error en liquidaciones, reclamos', 2, 3, 1, 'Sistemas', 'riesgo'),
  ('R-008', 'Reclamo de cliente por daño en mercadería', 'Pérdida económica, impacto reputacional', 3, 2, 2, 'Operaciones', 'riesgo'),
  ('O-001', 'Digitalización de procesos operativos', 'Reducción de errores y tiempos', 4, 1, 1, 'General', 'oportunidad'),
  ('O-002', 'Certificación Trinorma', 'Ventaja competitiva en el mercado', 4, 1, 1, 'Estratégico', 'oportunidad');

-- ─── STORAGE BUCKETS (ejecutar por separado en Supabase Dashboard) ─────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('finding-evidence', 'finding-evidence', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('training-evidence', 'training-evidence', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('purchase-attachments', 'purchase-attachments', false);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DEL SCHEMA
-- Después de ejecutar esto:
-- 1. Ir a Authentication → Users → Crear usuario santiago@dassa.com.ar
-- 2. Ir a Table Editor → user_roles → Insertar: user_id del usuario, role = 'master_admin'
-- ═══════════════════════════════════════════════════════════════════════════════
