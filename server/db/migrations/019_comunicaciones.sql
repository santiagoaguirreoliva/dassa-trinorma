-- =============================================================================
-- DASSA SGI · Migration 019 · OLA 2 · Sistema de Comunicaciones Formales
-- =============================================================================
CREATE TABLE IF NOT EXISTS communications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE,                          -- COM-2026-001
  title           TEXT NOT NULL,
  body_md         TEXT NOT NULL,
  category        TEXT NOT NULL,                        -- politica|cambio|capacitacion|alerta|info
  norma           TEXT,
  sender_id       UUID REFERENCES users(id),
  scope           TEXT NOT NULL DEFAULT 'internal',     -- internal|external|both
  status          TEXT DEFAULT 'borrador' CHECK (status IN ('borrador','enviada','archivada')),
  sent_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  attachment_urls TEXT[],
  public_token    TEXT UNIQUE,                          -- para link público /c/:token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_token  ON communications(public_token);

CREATE TABLE IF NOT EXISTS communication_recipients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id  UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  -- destinatario: puede ser por user, employee, job_profile, area o all
  user_id           UUID REFERENCES users(id),
  employee_id       UUID REFERENCES employees(id),
  job_profile_id    UUID REFERENCES job_profiles(id),
  area              TEXT,
  is_external       BOOLEAN DEFAULT FALSE,
  external_name     TEXT,
  external_email    TEXT,
  external_phone    TEXT,
  delivery_channels TEXT[],                              -- ['email','whatsapp','cartelera','web']
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_comm     ON communication_recipients(communication_id);
CREATE INDEX IF NOT EXISTS idx_cr_user     ON communication_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_employee ON communication_recipients(employee_id);

CREATE TABLE IF NOT EXISTS communication_reads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  communication_id  UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  recipient_id      UUID REFERENCES communication_recipients(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id),
  read_via          TEXT,                                -- web_link|email|whatsapp
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,                         -- cuando hizo click "lo leí"
  ip_address        INET,
  user_agent        TEXT,
  device_info       TEXT,
  feedback_notes    TEXT
);
CREATE INDEX IF NOT EXISTS idx_creads_comm ON communication_reads(communication_id);
CREATE INDEX IF NOT EXISTS idx_creads_user ON communication_reads(user_id);

-- Plantillas de elementos a comunicar según F-TRI-06 Agenda
CREATE TABLE IF NOT EXISTS communication_templates (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  element              TEXT NOT NULL UNIQUE,             -- "Política SGI", "Indicadores accidentes", etc.
  recipient_groups     TEXT[],                            -- ['empleados','direccion','partes_interesadas']
  frequency            TEXT,                              -- mensual|trimestral|anual|por_evento
  responsible_role     TEXT,
  default_channels     TEXT[],
  description          TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO communication_templates (element, recipient_groups, frequency, responsible_role, default_channels, description) VALUES
  ('Política SGI y Misión/Visión/Valores', ARRAY['empleados','partes_interesadas'], 'cuando_se_actualice', 'rrhh', ARRAY['cartelera','web'], 'Visible en carteleras y web pública'),
  ('Indicadores de Accidentes',            ARRAY['direccion','operaciones'], 'mensual', 'rrhh', ARRAY['email','reunion'], 'Mensual a Dirección, diario en reuniones 5S'),
  ('Actualización normas ISO',             ARRAY['empleados','partes_interesadas'], 'cuando_se_actualice', 'sgi_leader', ARRAY['cartelera','drive','web'], ''),
  ('Objetivos Corporativos',               ARRAY['funcionarios'], 'tras_aprobacion', 'direccion', ARRAY['drive'], ''),
  ('Cambios en el SGI',                    ARRAY['funcionarios'], 'cuando_se_produzcan', 'sgi_leader', ARRAY['drive','email'], ''),
  ('Encuesta de Satisfacción',             ARRAY['direccion','clientes'], 'anual', 'sgi_leader', ARRAY['google_forms','email'], ''),
  ('Cambios en organización',              ARRAY['funcionarios'], 'cuando_se_modifiquen', 'rrhh', ARRAY['email','drive'], ''),
  ('Acciones Formativas',                  ARRAY['funcionarios'], 'cuando_se_produzcan', 'rrhh', ARRAY['cartelera','drive','email'], ''),
  ('Requisitos Legales',                   ARRAY['empleados'], 'cuando_se_produzcan', 'rrhh', ARRAY['email'], ''),
  ('Encuesta Clima Laboral',               ARRAY['direccion','empleados'], 'anual', 'sgi_leader', ARRAY['reunion','cartelera','email','drive'], ''),
  ('Afectaciones a Servicios',             ARRAY['funcionarios','clientes_afectados'], 'cuando_se_produzcan', 'direccion', ARRAY['email'], ''),
  ('Quejas/Reclamos Clientes',             ARRAY['funcionarios','operaciones'], 'cuando_se_produzcan', 'sgi_leader', ARRAY['email'], ''),
  ('No Conformidades',                     ARRAY['funcionarios'], 'cuando_se_produzcan', 'sgi_leader', ARRAY['email','drive'], ''),
  ('Auditorías Internas/Externas',         ARRAY['funcionarios'], 'cuando_se_planifiquen', 'sgi_leader', ARRAY['email','drive'], ''),
  ('Matriz Peligros y Riesgos',            ARRAY['empleados','contratistas'], 'cuando_se_actualice', 'sgi_leader', ARRAY['cartelera','drive','email'], ''),
  ('Matriz Aspectos Ambientales',          ARRAY['empleados','contratistas'], 'cuando_se_actualice', 'sgi_leader', ARRAY['cartelera','drive','email'], '')
ON CONFLICT (element) DO NOTHING;

SELECT 'Tablas OLA 2 · Comunicaciones' AS info;
SELECT COUNT(*) FILTER (WHERE table_name = ANY(ARRAY['communications','communication_recipients','communication_reads','communication_templates'])) AS tablas_creadas
FROM information_schema.tables WHERE table_schema='public';
SELECT 'Templates seed' AS info;
SELECT COUNT(*) FROM communication_templates;
