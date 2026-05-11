-- ═══════════════════════════════════════════════════════════════
-- DASSA SGI — Module: Surveys, Evaluations & Employees
-- Migration: Create all tables for surveys module
-- ═══════════════════════════════════════════════════════════════

-- ─── Employees (nómina DASSA — people who may not have system login) ───
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  sector TEXT,
  position TEXT,
  evaluator_id UUID REFERENCES employees(id),
  secondary_evaluator_id UUID REFERENCES employees(id),
  user_id UUID REFERENCES users(id),  -- links to SGI user if they have login
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_evaluator ON employees(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- ─── Contact Lists (listas de emails de clientes para envío) ───
CREATE TABLE IF NOT EXISTS contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- e.g. "Clientes Depósito", "Clientes Oficina"
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  company TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_list ON contacts(list_id);

-- ─── Survey Templates (plantillas de encuestas/evaluaciones) ───
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'survey',   -- 'survey' | 'evaluation' | 'climate'
  target TEXT NOT NULL DEFAULT 'external', -- 'external' (clients) | 'internal' (employees) | 'individual' (per person eval)
  frequency TEXT DEFAULT 'semestral',     -- 'semestral' | 'anual' | 'manual'
  is_anonymous BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Survey Questions ───
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'scale_1_5',
  -- Types: 'scale_1_5', 'scale_1_10', 'stars_1_5', 'multiple_choice',
  --        'checkbox', 'short_text', 'long_text', 'yes_no', 'dropdown'
  options JSONB,          -- for multiple_choice/checkbox/dropdown: ["opt1","opt2",...]
  scale_labels JSONB,     -- for scales: {"min":"Muy bajo","max":"Muy alto"}
  is_required BOOLEAN DEFAULT true,
  section TEXT,           -- optional section/group header
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);

-- ─── Campaigns (cada envío/ronda de una encuesta) ───
CREATE TABLE IF NOT EXISTS survey_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id),
  title TEXT,                           -- e.g. "Satisfacción Clientes - Julio 2026"
  status TEXT DEFAULT 'draft',          -- 'draft' | 'active' | 'closed'
  target_type TEXT DEFAULT 'list',      -- 'list' (contact list) | 'employees' | 'individual'
  contact_list_id UUID REFERENCES contact_lists(id),
  due_date DATE,
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_survey ON survey_campaigns(survey_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON survey_campaigns(status);

-- ─── Campaign Recipients (quién debe responder en cada campaña) ───
CREATE TABLE IF NOT EXISTS survey_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES survey_campaigns(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  contact_id UUID REFERENCES contacts(id),
  email TEXT,                              -- email for sending (can be null if shared manually)
  name TEXT,                               -- display name
  token TEXT NOT NULL UNIQUE,              -- unique token for the public link
  status TEXT DEFAULT 'pending',           -- 'pending' | 'sent' | 'opened' | 'completed'
  evaluator_type TEXT,                     -- 'self' | 'supervisor' (for performance evals)
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON survey_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_token ON survey_recipients(token);
CREATE INDEX IF NOT EXISTS idx_recipients_employee ON survey_recipients(employee_id);

-- ─── Survey Responses (una respuesta completa) ───
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES survey_campaigns(id),
  recipient_id UUID REFERENCES survey_recipients(id),
  respondent_name TEXT,         -- optional (anonymous surveys)
  respondent_email TEXT,        -- optional
  respondent_company TEXT,      -- optional (for clients)
  is_anonymous BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_responses_campaign ON survey_responses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_responses_recipient ON survey_responses(recipient_id);

-- ─── Survey Answers (respuesta individual por pregunta) ───
CREATE TABLE IF NOT EXISTS survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id),
  answer_value TEXT,         -- the actual answer (number for scales, text for open, option for MC)
  answer_array JSONB,        -- for checkbox (multiple selections)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answers_response ON survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON survey_answers(question_id);
