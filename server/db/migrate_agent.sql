-- =====================================================
-- DASSA SGI — Agent Governance Tables
-- Audit log, knowledge base, config, restrictions
-- =====================================================

-- 1. Conversations audit log (EVERY interaction recorded)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  session_id    TEXT NOT NULL,                          -- groups messages in same chat session
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,                          -- message content
  tool_calls    JSONB DEFAULT '[]',                     -- [{name, arguments, result}]
  tokens_used   INT DEFAULT 0,
  response_ms   INT DEFAULT 0,                          -- response time in ms
  model         TEXT DEFAULT 'qwen2.5:7b',
  flagged       BOOLEAN DEFAULT false,                  -- admin can flag suspicious
  flag_reason   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_session ON agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_created ON agent_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conv_flagged ON agent_conversations(flagged) WHERE flagged = true;

-- 2. Knowledge base (documents the agent can reference)
CREATE TABLE IF NOT EXISTS agent_knowledge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',        -- general, iso_9001, iso_14001, iso_45001, empresa, servicios, politicas
  content       TEXT NOT NULL,                          -- full text content
  summary       TEXT,                                   -- short summary for quick reference
  source_url    TEXT,                                   -- optional link to original doc
  is_active     BOOLEAN DEFAULT true,
  uploaded_by   UUID REFERENCES users(id),
  approved_by   UUID REFERENCES users(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent configuration (editable system prompt, restrictions, permissions)
CREATE TABLE IF NOT EXISTS agent_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  value         JSONB NOT NULL,
  description   TEXT,
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config
INSERT INTO agent_config (key, value, description) VALUES
  ('system_prompt_extra', '"Sos el asistente oficial del SGI TRINORMA de DASSA. Siempre respondé basándote en la información de la Knowledge Base cuando esté disponible."',
   'Texto adicional que se agrega al system prompt del agente'),
  ('restricted_topics', '["salarios y remuneraciones", "datos personales de empleados", "información financiera confidencial", "contraseñas y credenciales", "conflictos internos entre empleados"]',
   'Temas que el agente NO puede discutir'),
  ('allowed_tools_by_role', '{"master_admin": ["*"], "director": ["*"], "sgi_leader": ["consultar_tareas", "crear_hallazgo", "consultar_hallazgos", "cargar_capacitacion", "consultar_encuestas", "consultar_riesgos", "consultar_legal", "resumen_dashboard", "consultar_incidentes", "consultar_proveedores"], "seguridad_higiene": ["consultar_tareas", "consultar_hallazgos", "consultar_riesgos", "consultar_incidentes", "resumen_dashboard"], "operaciones": ["consultar_tareas", "consultar_hallazgos", "resumen_dashboard"], "rrhh": ["consultar_tareas", "cargar_capacitacion", "consultar_encuestas", "resumen_dashboard"], "compras_approver": ["consultar_tareas", "consultar_proveedores", "resumen_dashboard"], "auditor_externo": ["consultar_hallazgos", "consultar_riesgos", "consultar_legal", "resumen_dashboard"]}',
   'Herramientas permitidas por rol de usuario'),
  ('model_params', '{"temperature": 0.3, "num_predict": 1024, "model": "qwen2.5:7b"}',
   'Parámetros del modelo de IA'),
  ('require_confirmation', 'true',
   'Si es true, acciones que modifican datos (crear hallazgo, cargar capacitación) piden confirmación al usuario'),
  ('max_messages_per_hour', '50',
   'Límite de mensajes por usuario por hora (rate limiting)')
ON CONFLICT (key) DO NOTHING;

-- 4. Restricted responses log (when agent refuses or redirects)
CREATE TABLE IF NOT EXISTS agent_restrictions_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  user_message  TEXT NOT NULL,
  restriction   TEXT NOT NULL,                          -- which restriction was triggered
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
