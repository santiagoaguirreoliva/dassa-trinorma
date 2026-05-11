-- =============================================================================
-- DASSA SGI · Migration 022 · Fase 7 completa · Multi-tenant B+C+D
-- =============================================================================
BEGIN;

-- 1) Tabla industry_templates · plantillas para clonar al onboarding
CREATE TABLE IF NOT EXISTS industry_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry_code   TEXT NOT NULL UNIQUE,
  industry_name   TEXT NOT NULL,
  description     TEXT,
  job_profiles    JSONB DEFAULT '[]'::jsonb,
  risks           JSONB DEFAULT '[]'::jsonb,
  procedures      JSONB DEFAULT '[]'::jsonb,
  foda            JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template Logística (basado en DASSA real)
INSERT INTO industry_templates (industry_code, industry_name, description, job_profiles, risks, procedures, foda)
VALUES (
  'logistica-deposito-fiscal',
  'Logística · Depósito Fiscal',
  'Template basado en DASSA SA · empresa de comercio exterior y depósito fiscal',
  '[
    {"role_label":"Director General","area":"Dirección","seniority":"director","mission":"Conducción estratégica de la empresa"},
    {"role_label":"CEO","area":"CEO","seniority":"director","mission":"Conducción operativa diaria"},
    {"role_label":"Líder SGI","area":"SGI","seniority":"lider","mission":"Mantener vivo el SGI TRINORMA"},
    {"role_label":"Administración General y RRHH","area":"Administración","seniority":"responsable","mission":"RRHH + finanzas + compras + capacitaciones"},
    {"role_label":"Facturación y Cobranzas","area":"Administración","seniority":"semi","mission":"Facturación y cobranzas"},
    {"role_label":"Responsable SySO","area":"SySO","seniority":"responsable","mission":"Salud y seguridad ocupacional ISO 45001"},
    {"role_label":"Gerente de Operaciones","area":"Operaciones","seniority":"gerente","mission":"Conducir todas las operaciones"},
    {"role_label":"Coordinador de Importación","area":"Coordinación","seniority":"semi","mission":"Coordinación y seguimiento de cargas impo"},
    {"role_label":"Coordinador de Exportación","area":"Coordinación","seniority":"semi","mission":"Coordinación de cargas expo"},
    {"role_label":"Supervisor Operativo","area":"Depósito","seniority":"lider","mission":"Supervisión operaciones depósito"},
    {"role_label":"Apuntador","area":"Depósito","seniority":"semi","mission":"Control de bultos y cargas"},
    {"role_label":"Maquinista","area":"Depósito","seniority":"semi","mission":"Operación autoelevadores"},
    {"role_label":"Operario de Carga y Descarga","area":"Depósito","seniority":"junior","mission":"Operación general depósito"},
    {"role_label":"Vendedor","area":"Comercial","seniority":"semi","mission":"Captación y retención de clientes"}
  ]'::jsonb,
  '[
    {"activity":"Manipulación y almacenamiento mercadería","hazard":"Caída de objetos","severity":5,"probability":3,"detection":2,"process":"Operación"},
    {"activity":"Manipulación y almacenamiento mercadería","hazard":"Derrame de sustancia peligrosa","severity":5,"probability":3,"detection":2,"process":"Operación"},
    {"activity":"Movimiento de contenedores","hazard":"Caída de objetos en altura","severity":5,"probability":2,"detection":2,"process":"Operación"},
    {"activity":"Carga/descarga con autoelevador","hazard":"Accidente con maquinaria","severity":5,"probability":2,"detection":2,"process":"Operación"},
    {"activity":"Coordinación con terminales","hazard":"Mal funcionamiento terminales","severity":3,"probability":4,"detection":1,"process":"Coordinación"},
    {"activity":"Documentación aduanera","hazard":"Error en documentación","severity":4,"probability":1,"detection":1,"process":"Coordinación"},
    {"activity":"Administración personal","hazard":"Error en liquidación","severity":1,"probability":3,"detection":2,"process":"RRHH"}
  ]'::jsonb,
  '[
    {"code":"P-TEMPLATE-001","title":"Cargar No Conformidad","module":"findings","norma":"9001"},
    {"code":"P-TEMPLATE-002","title":"Solicitar Compra","module":"purchases","norma":"9001"},
    {"code":"P-TEMPLATE-003","title":"Registrar Incidente","module":"incidents","norma":"45001"},
    {"code":"P-TEMPLATE-004","title":"Cargar Capacitación","module":"trainings","norma":"todas"},
    {"code":"P-TEMPLATE-005","title":"Validar Revisión Ciclo","module":"reviews","norma":"todas"}
  ]'::jsonb,
  '[
    {"foda_type":"F","category":"Servicios","description":"Cartera de clientes fidelizados"},
    {"foda_type":"F","category":"Ubicación","description":"Zona estratégica para operativas terminales norte/sur"},
    {"foda_type":"O","category":"Mercado","description":"Crecimiento sostenido comercio exterior"},
    {"foda_type":"O","category":"Tecnología","description":"Digitalización y automatización como ventaja competitiva"},
    {"foda_type":"D","category":"Operaciones","description":"Dependencia de actores clave"},
    {"foda_type":"D","category":"Infraestructura","description":"Sistema contra incendios incompleto"},
    {"foda_type":"A","category":"Económico","description":"Apertura importaciones y competencia directa"},
    {"foda_type":"A","category":"Climático","description":"Eventos climáticos extremos · zona inundable"}
  ]'::jsonb
)
ON CONFLICT (industry_code) DO UPDATE SET job_profiles = EXCLUDED.job_profiles, risks = EXCLUDED.risks;

-- Templates extra (genéricos)
INSERT INTO industry_templates (industry_code, industry_name, description, job_profiles, risks, foda) VALUES
  ('fabril-manufactura','Fabril · Manufactura','Producción industrial',
   '[{"role_label":"Director","area":"Dirección","seniority":"director","mission":""},{"role_label":"Jefe de Planta","area":"Producción","seniority":"lider","mission":""},{"role_label":"Operario","area":"Producción","seniority":"junior","mission":""}]'::jsonb,
   '[{"activity":"Operación maquinaria","hazard":"Accidente con prensa","severity":5,"probability":2,"detection":2,"process":"Producción"}]'::jsonb,
   '[{"foda_type":"O","category":"Mercado","description":"Sustitución de importaciones"}]'::jsonb),
  ('servicios-profesionales','Servicios Profesionales','Consultoría y servicios',
   '[{"role_label":"Director","area":"Dirección","seniority":"director","mission":""},{"role_label":"Consultor Senior","area":"Servicios","seniority":"senior","mission":""}]'::jsonb,
   '[{"activity":"Servicio al cliente","hazard":"Insatisfacción cliente","severity":3,"probability":2,"detection":2,"process":"Servicios"}]'::jsonb,
   '[]'::jsonb)
ON CONFLICT (industry_code) DO NOTHING;

-- 2) Tabla tenant_features (override por tenant si quiere features distintas al plan)
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  metadata      JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);

-- 3) Tabla tenant_subdomains (para Fase D · whitelabel)
CREATE TABLE IF NOT EXISTS tenant_domains (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL UNIQUE,                  -- ej. dassa.trinorma.app
  is_primary    BOOLEAN DEFAULT TRUE,
  ssl_status    TEXT DEFAULT 'pending',                -- pending|active|expired
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Función de onboarding · clona un template al tenant nuevo
CREATE OR REPLACE FUNCTION provision_tenant_from_template(
  p_tenant_id UUID,
  p_template_code TEXT
) RETURNS JSONB AS $$
DECLARE
  v_template industry_templates%ROWTYPE;
  v_profile JSONB;
  v_risk JSONB;
  v_foda JSONB;
  v_proc JSONB;
  v_stats JSONB := '{"job_profiles":0,"risks":0,"foda":0,"procedures":0}'::jsonb;
BEGIN
  SELECT * INTO v_template FROM industry_templates WHERE industry_code = p_template_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template % no encontrado', p_template_code; END IF;

  -- Clonar job_profiles
  FOR v_profile IN SELECT * FROM jsonb_array_elements(v_template.job_profiles) LOOP
    INSERT INTO job_profiles (tenant_id, role_label, area, seniority, mission, source, is_active)
    VALUES (p_tenant_id, v_profile->>'role_label', v_profile->>'area', v_profile->>'seniority', v_profile->>'mission', 'template', TRUE);
    v_stats := jsonb_set(v_stats, '{job_profiles}', to_jsonb((v_stats->>'job_profiles')::int + 1));
  END LOOP;

  -- Clonar riesgos (con código autogenerado simple)
  FOR v_risk IN SELECT * FROM jsonb_array_elements(v_template.risks) LOOP
    INSERT INTO risks (tenant_id, code, activity, hazard, severity, probability, detection, process, is_active)
    VALUES (p_tenant_id, 'R-TPL-' || (random()*10000)::int::text,
            v_risk->>'activity', v_risk->>'hazard',
            (v_risk->>'severity')::int, (v_risk->>'probability')::int,
            (v_risk->>'detection')::int, v_risk->>'process', TRUE);
    v_stats := jsonb_set(v_stats, '{risks}', to_jsonb((v_stats->>'risks')::int + 1));
  END LOOP;

  -- Clonar FODA
  FOR v_foda IN SELECT * FROM jsonb_array_elements(v_template.foda) LOOP
    INSERT INTO context_analysis (tenant_id, foda_type, category, description, is_active)
    VALUES (p_tenant_id, v_foda->>'foda_type', v_foda->>'category', v_foda->>'description', TRUE);
    v_stats := jsonb_set(v_stats, '{foda}', to_jsonb((v_stats->>'foda')::int + 1));
  END LOOP;

  -- Clonar procedimientos
  FOR v_proc IN SELECT * FROM jsonb_array_elements(v_template.procedures) LOOP
    INSERT INTO procedures (tenant_id, code, title, module, norma, status)
    VALUES (p_tenant_id, v_proc->>'code', v_proc->>'title', v_proc->>'module', v_proc->>'norma', 'borrador');
    v_stats := jsonb_set(v_stats, '{procedures}', to_jsonb((v_stats->>'procedures')::int + 1));
  END LOOP;

  RETURN v_stats;
END $$ LANGUAGE plpgsql;

COMMIT;
SELECT 'Fase 7 B+C+D · OK' AS info;
SELECT industry_code, industry_name FROM industry_templates;
SELECT 'función provision_tenant_from_template creada' AS info;
