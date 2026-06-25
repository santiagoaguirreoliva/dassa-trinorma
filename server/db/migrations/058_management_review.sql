-- 058 · Revisión por la Dirección (ISO 9001/14001/45001 cláusula 9.3)
-- Acta que consolida las ENTRADAS (9.3.2) y registra las SALIDAS/decisiones (9.3.3).
-- Los datos de desempeño se compilan automáticamente desde objetivos/NC/incidentes/
-- auditorías/legal/capacitaciones (endpoint de inputs); la Dirección completa el análisis
-- y las decisiones paso a paso, y firma al cierre (modelo de firma del Comité).
CREATE TABLE IF NOT EXISTS management_reviews (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  year                    int NOT NULL,
  period_label            text,                 -- ej. "Anual 2026" / "Q2 2026"
  meeting_date            date,
  location                text,
  attendees               text,                 -- participantes (texto libre)
  -- Entradas 9.3.2 (la Dirección redacta; los inputs auto sirven de insumo)
  prior_actions_review    text,                 -- a) estado de acciones de revisiones previas
  context_changes         text,                 -- b) cambios en cuestiones externas/internas (FODA)
  satisfaction_summary    text,                 -- c) satisfacción del cliente y partes interesadas
  objectives_summary      text,                 -- grado de cumplimiento de objetivos
  process_performance     text,                 -- desempeño de procesos / KPIs de planta
  nc_capa_summary         text,                 -- no conformidades y acciones correctivas
  audit_summary           text,                 -- resultados de auditorías (internas/externas)
  legal_summary           text,                 -- cumplimiento de requisitos legales
  providers_summary       text,                 -- desempeño de proveedores externos
  resources_adequacy      text,                 -- adecuación de recursos
  risks_actions_eval      text,                 -- eficacia de acciones frente a riesgos y oportunidades
  improvement_opportunities text,               -- d) oportunidades de mejora
  -- Salidas 9.3.3
  decisions               text,                 -- decisiones y acciones de la Dirección
  improvement_actions     jsonb DEFAULT '[]',   -- [{description, owner, deadline}]
  inputs_snapshot         jsonb,                -- foto de los inputs auto al momento del acta
  status                  text DEFAULT 'borrador',  -- borrador | cerrada
  signatures              jsonb DEFAULT '[]',
  created_by              uuid REFERENCES users(id),
  closed_at               timestamptz,
  tenant_id               uuid DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_management_reviews_year ON management_reviews(year);
