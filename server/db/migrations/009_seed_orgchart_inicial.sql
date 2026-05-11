-- =============================================================================
-- DASSA SGI · OLA 1 · Bloque A · Seed inicial Organigrama + Fichas + Empleados
-- Idempotente · usa ON CONFLICT DO NOTHING
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. ORGANIGRAMA · 6 nodos (Dirección + 5 áreas)
-- ───────────────────────────────────────────────────────────────────
WITH inserted_direccion AS (
  INSERT INTO org_chart_nodes (id, name, type, level, area, description, color, sort_order)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Dirección General', 'direccion', 0, 'Dirección',
    'Conducción ejecutiva de DASSA SA · estrategia, finanzas, dirección general',
    '#BF1E2E', 0
  )
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
INSERT INTO org_chart_nodes (id, name, parent_id, type, level, area, description, color, sort_order)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Sistema de Gestión Integrado',
   '11111111-1111-1111-1111-111111111111', 'area', 1, 'SGI',
   'TRINORMA · ISO 9001+14001+45001. Coordina con NIXA.', '#5BBDC9', 1),

  ('33333333-3333-3333-3333-333333333333', 'RRHH y Seguridad',
   '11111111-1111-1111-1111-111111111111', 'area', 1, 'RRHH-SySO',
   'Personas, capacitaciones, salud ocupacional, seguridad e higiene', '#7C3AED', 2),

  ('44444444-4444-4444-4444-444444444444', 'Administración y Comercial',
   '11111111-1111-1111-1111-111111111111', 'area', 1, 'Admin-Comercial',
   'Facturación, cobranzas, comercial, atención al cliente', '#F59E0B', 3),

  ('55555555-5555-5555-5555-555555555555', 'Operaciones',
   '11111111-1111-1111-1111-111111111111', 'area', 1, 'Operaciones',
   'Depósito fiscal, coordinación de cargas, supervisión y operativa diaria', '#10B981', 4),

  ('66666666-6666-6666-6666-666666666666', 'Sistemas',
   '11111111-1111-1111-1111-111111111111', 'area', 1, 'Sistemas',
   'IT, infraestructura, sistemas internos, soporte', '#6366F1', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;


-- ───────────────────────────────────────────────────────────────────
-- 2. JOB PROFILES · 11 puestos
-- ───────────────────────────────────────────────────────────────────
INSERT INTO job_profiles (id, role_label, area, seniority, mission, org_node_id, source, is_active)
VALUES
  ('a0000001-0001-0001-0001-000000000001', 'Director General', 'Dirección', 'director',
   'Conducir DASSA hacia los objetivos estratégicos, gestionar el riesgo global, y representar a la organización ante stakeholders y la comunidad.',
   '11111111-1111-1111-1111-111111111111', 'ai_inferred', TRUE),

  ('a0000002-0002-0002-0002-000000000002', 'Líder SGI', 'SGI', 'lider',
   'Mantener vivo el Sistema de Gestión Integrado TRINORMA (ISO 9001+14001+45001), coordinar auditorías internas/externas, y impulsar la mejora continua.',
   '22222222-2222-2222-2222-222222222222', 'ai_inferred', TRUE),

  ('a0000003-0003-0003-0003-000000000003', 'Responsable RRHH', 'RRHH-SySO', 'responsable',
   'Gestionar al personal: contratación, liquidación, capacitaciones, clima laboral, evaluación de desempeño, y cumplimiento de Ley de Contrato de Trabajo.',
   '33333333-3333-3333-3333-333333333333', 'ai_inferred', TRUE),

  ('a0000004-0004-0004-0004-000000000004', 'Responsable de Seguridad e Higiene (SySO)', 'RRHH-SySO', 'responsable',
   'Garantizar la salud y seguridad ocupacional según ISO 45001, gestionar incidentes, aspectos ambientales, requisitos legales SST, y plan de emergencia.',
   '33333333-3333-3333-3333-333333333333', 'ai_inferred', TRUE),

  ('a0000005-0005-0005-0005-000000000005', 'Responsable Comercial', 'Admin-Comercial', 'responsable',
   'Captar y retener clientes, cotizar servicios de depósito fiscal e impo/expo, mantener relación con terminales portuarias y stakeholders comerciales.',
   '44444444-4444-4444-4444-444444444444', 'ai_inferred', TRUE),

  ('a0000006-0006-0006-0006-000000000006', 'Administrativa', 'Admin-Comercial', 'semi',
   'Procesar documentación de operaciones, facturación, cobranzas, archivo operativo, y soporte administrativo a las áreas internas.',
   '44444444-4444-4444-4444-444444444444', 'ai_inferred', TRUE),

  ('a0000007-0007-0007-0007-000000000007', 'Supervisor de Operaciones', 'Operaciones', 'lider',
   'Coordinar la operativa diaria del depósito, asignar tareas a operarios, supervisar consolidados/desconsolidados, traslados y cumplimiento de turnos.',
   '55555555-5555-5555-5555-555555555555', 'ai_inferred', TRUE),

  ('a0000008-0008-0008-0008-000000000008', 'Encargado de Depósito', 'Operaciones', 'lider',
   'Gestionar el depósito fiscal: inventario, mantenimiento edilicio, parque de maquinarias, planificación de espacios y mantenimiento preventivo/correctivo.',
   '55555555-5555-5555-5555-555555555555', 'ai_inferred', TRUE),

  ('a0000009-0009-0009-0009-000000000009', 'Operario de Depósito', 'Operaciones', 'junior',
   'Ejecutar tareas operativas del depósito: carga/descarga de contenedores, consolidación/desconsolidación, movimiento de mercadería con autoelevadores, uso correcto de EPP.',
   '55555555-5555-5555-5555-555555555555', 'ai_inferred', TRUE),

  ('a0000010-0010-0010-0010-000000000010', 'Responsable de Sistemas', 'Sistemas', 'responsable',
   'Mantener la infraestructura de IT, soporte a usuarios, integración entre sistemas internos (Depofis, SGI, app DASSA), y desarrollo de proyectos digitales.',
   '66666666-6666-6666-6666-666666666666', 'ai_inferred', TRUE),

  ('a0000011-0011-0011-0011-000000000011', 'Auditor Externo (NIXA)', 'Auditoría Externa', 'director',
   'Auditar el SGI TRINORMA con periodicidad acordada, validar matriz de riesgos, FODA, objetivos, fichas de puesto y procedimientos. Reportar a Dirección con recomendaciones.',
   NULL, 'ai_inferred', TRUE)
ON CONFLICT (id) DO UPDATE SET role_label = EXCLUDED.role_label, mission = EXCLUDED.mission;


-- ───────────────────────────────────────────────────────────────────
-- 3. KEY_RESULTS, COMPETENCIES y TRAINING_REQUIRED por puesto
-- ───────────────────────────────────────────────────────────────────
UPDATE job_profiles SET
  key_results = ARRAY['Cumplimiento objetivos corporativos anuales','Rentabilidad EBITDA','Satisfacción cliente >90%','Sin no conformidades graves en auditoría externa'],
  competencies = ARRAY['Liderazgo estratégico','Visión de negocio','Toma de decisiones','Gestión de stakeholders','Pensamiento financiero'],
  training_required = ARRAY['Dirección estratégica','TRINORMA ISO','Compliance AFIP/Aduana']
WHERE id = 'a0000001-0001-0001-0001-000000000001';

UPDATE job_profiles SET
  key_results = ARRAY['SGI auditado y vigente','Cumplimiento de plan de auditorías internas','NCs cerradas en plazo','Reporte mensual al Comité'],
  competencies = ARRAY['Conocimiento ISO 9001/14001/45001','Auditoría interna','Gestión de NCs','Análisis de riesgos AMFE','Comunicación efectiva'],
  training_required = ARRAY['Auditor interno ISO 9001','Auditor interno ISO 14001','Auditor interno ISO 45001','AMFE','Trinorma']
WHERE id = 'a0000002-0002-0002-0002-000000000002';

UPDATE job_profiles SET
  key_results = ARRAY['Plan anual de capacitación cumplido >90%','Liquidación de sueldos en plazo y sin errores','Clima laboral >80%','Rotación <15%'],
  competencies = ARRAY['Ley de Contrato de Trabajo','Liquidación de sueldos','Selección y contratación','Gestión del talento','Empatía y comunicación'],
  training_required = ARRAY['Actualizaciones LCT','Liquidación SIPA','Gestión de personas','ISO 45001 RRHH']
WHERE id = 'a0000003-0003-0003-0003-000000000003';

UPDATE job_profiles SET
  key_results = ARRAY['Tasa accidentes <objetivo anual','100% capacitaciones SySO obligatorias cumplidas','Matriz IPER actualizada','Plan emergencia operativo'],
  competencies = ARRAY['Higiene y Seguridad Industrial','ART y reportes','Aspectos ambientales','Identificación de peligros (IPER)','Plan emergencia'],
  training_required = ARRAY['Técnico HyS habilitado','ISO 45001','ISO 14001','Brigada emergencia','Manejo de sustancias peligrosas']
WHERE id = 'a0000004-0004-0004-0004-000000000004';

UPDATE job_profiles SET
  key_results = ARRAY['Cantidad contenedores impo/expo > meta','Tasa cierre presupuestos','Retención de clientes','Pipeline activo'],
  competencies = ARRAY['Comercio exterior','Negociación','CRM','Comunicación','Relación con terminales portuarias'],
  training_required = ARRAY['Incoterms','Comercio Exterior','HubSpot/CRM','Habilidades comerciales']
WHERE id = 'a0000005-0005-0005-0005-000000000005';

UPDATE job_profiles SET
  key_results = ARRAY['Facturación emitida en plazo','Conciliación bancaria mensual sin diferencias','Cobranza dentro de DSO','Archivo operativo ordenado'],
  competencies = ARRAY['Procesos administrativos','Office avanzado','Facturación electrónica AFIP','Atención al detalle','Confidencialidad'],
  training_required = ARRAY['Facturación electrónica','SIRADIG','Ofimática avanzada']
WHERE id = 'a0000006-0006-0006-0006-000000000006';

UPDATE job_profiles SET
  key_results = ARRAY['Cumplimiento orden del día','Sin demoras evitables en consolidados/desconsolidados','Asignación correcta de turnos','Coordinación con cliente sin reclamos'],
  competencies = ARRAY['Logística operativa','Liderazgo de equipos','Resolución de problemas en piso','Conocimiento de procesos aduaneros','Manejo de personal'],
  training_required = ARRAY['Procesos aduaneros','Liderazgo','Seguridad operativa','Manejo de autoelevadores (certificado)']
WHERE id = 'a0000007-0007-0007-0007-000000000007';

UPDATE job_profiles SET
  key_results = ARRAY['Plan de mantenimiento preventivo ejecutado','Disponibilidad de parque de maquinarias >95%','Inventario sin diferencias','Instalaciones en buen estado'],
  competencies = ARRAY['Gestión de depósito','Mantenimiento preventivo','Inventario físico','Coordinación con proveedores','Seguridad operativa'],
  training_required = ARRAY['Gestión de depósito fiscal','Mantenimiento industrial','Manejo de autoelevadores','ISO 45001 operativa']
WHERE id = 'a0000008-0008-0008-0008-000000000008';

UPDATE job_profiles SET
  key_results = ARRAY['Tareas asignadas completadas','Uso obligatorio de EPP','Sin accidentes propios','Asistencia y puntualidad'],
  competencies = ARRAY['Manejo de autoelevador certificado','Conocimiento operativo','Trabajo en equipo','Compromiso con normas','Cuidado de la mercadería'],
  training_required = ARRAY['Manejo de autoelevadores (certificado IRAM)','Uso correcto de EPP','Inducción TRINORMA','Carga manual segura']
WHERE id = 'a0000009-0009-0009-0009-000000000009';

UPDATE job_profiles SET
  key_results = ARRAY['Uptime de sistemas >99%','Tickets resueltos en SLA','Backups verificados','Integraciones funcionales'],
  competencies = ARRAY['Administración de sistemas','Redes y servidores','Base de datos','Seguridad informática','Soporte usuarios'],
  training_required = ARRAY['ISO 27001 fundamentos','Ciberseguridad PyME','PostgreSQL','Linux server']
WHERE id = 'a0000010-0010-0010-0010-000000000010';

UPDATE job_profiles SET
  key_results = ARRAY['Auditorías anuales realizadas en plazo','Informes con hallazgos accionables','Recomendaciones aplicables al SGI'],
  competencies = ARRAY['Auditor líder ISO 9001/14001/45001','Análisis sistémico','Comunicación con dirección','Independencia y objetividad'],
  training_required = ARRAY['Auditor líder TRINORMA','Actualizaciones normativas']
WHERE id = 'a0000011-0011-0011-0011-000000000011';


-- ───────────────────────────────────────────────────────────────────
-- 4. ASOCIAR EMPLEADOS A SUS PUESTOS · job_profile_employees
--    Match por sector + position de la tabla employees
-- ───────────────────────────────────────────────────────────────────

-- Director General
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000001-0001-0001-0001-000000000001', id, '2024-01-01', TRUE
FROM employees WHERE position ILIKE '%Director General%'
ON CONFLICT DO NOTHING;

-- Líder SGI
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000002-0002-0002-0002-000000000002', id, '2024-01-01', TRUE
FROM employees WHERE sector = 'SGI' OR position ILIKE '%Líder SGI%'
ON CONFLICT DO NOTHING;

-- Responsable RRHH
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000003-0003-0003-0003-000000000003', id, '2024-01-01', TRUE
FROM employees WHERE position ILIKE '%Responsable RRHH%' OR position ILIKE '%RRHH%'
ON CONFLICT DO NOTHING;

-- Responsable SySO
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000004-0004-0004-0004-000000000004', id, '2024-01-01', TRUE
FROM employees WHERE sector ILIKE '%Seguridad%' OR position ILIKE '%SySO%' OR position ILIKE '%Seguridad%'
ON CONFLICT DO NOTHING;

-- Responsable Comercial
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000005-0005-0005-0005-000000000005', id, '2024-01-01', TRUE
FROM employees WHERE sector = 'Comercial' AND position = 'Comercial'
ON CONFLICT DO NOTHING;

-- Administrativa (2 personas)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000006-0006-0006-0006-000000000006', id, '2024-01-01', TRUE
FROM employees WHERE position = 'Administrativa'
ON CONFLICT DO NOTHING;

-- Supervisor de Operaciones (Christian) — el supervisor "puro"
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000007-0007-0007-0007-000000000007', id, '2024-01-01', TRUE
FROM employees WHERE full_name ILIKE '%Christian Medina%'
ON CONFLICT DO NOTHING;

-- Encargado de Depósito (Marcelo)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000008-0008-0008-0008-000000000008', id, '2024-01-01', TRUE
FROM employees WHERE full_name ILIKE '%Marcelo Stizza%'
ON CONFLICT DO NOTHING;

-- Operario de Depósito (todos los Operarios)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000009-0009-0009-0009-000000000009', id, '2024-01-01', TRUE
FROM employees WHERE position ILIKE '%Operario%'
ON CONFLICT DO NOTHING;

-- Sistemas
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000010-0010-0010-0010-000000000010', id, '2024-01-01', TRUE
FROM employees WHERE sector = 'Sistemas'
ON CONFLICT DO NOTHING;

COMMIT;

-- ───────────────────────────────────────────────────────────────────
-- Verificación
-- ───────────────────────────────────────────────────────────────────
SELECT '────── Organigrama ──────' AS info;
SELECT level, name, type, area FROM org_chart_nodes ORDER BY level, sort_order;

SELECT '────── Fichas de puesto ──────' AS info;
SELECT jp.role_label, jp.area, jp.seniority,
       COALESCE((SELECT COUNT(*) FROM job_profile_employees jpe WHERE jpe.profile_id = jp.id AND jpe.until IS NULL), 0) AS empleados_asignados
FROM job_profiles jp
ORDER BY jp.role_label;

SELECT '────── Asignaciones empleado → puesto ──────' AS info;
SELECT e.full_name AS empleado, jp.role_label AS puesto, jpe.since
FROM job_profile_employees jpe
JOIN employees e ON e.id = jpe.employee_id
JOIN job_profiles jp ON jp.id = jpe.profile_id
ORDER BY jp.role_label, e.full_name;
