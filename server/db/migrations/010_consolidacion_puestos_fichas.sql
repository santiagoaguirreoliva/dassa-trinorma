-- =============================================================================
-- DASSA SGI · OLA 1 · Bloque A · Migration 010
-- Consolidación de organigrama y puestos según F-TRI-34 + análisis con AI
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. RESETEAR asignaciones empleados → puestos (estaban mal)
-- ───────────────────────────────────────────────────────────────────
DELETE FROM job_profile_employees;

-- ───────────────────────────────────────────────────────────────────
-- 2. ORGANIGRAMA reorganizado con CEO + nuevas sub-áreas
-- ───────────────────────────────────────────────────────────────────

-- Limpiar y reinsertar org_chart_nodes (idempotente)
TRUNCATE org_chart_nodes RESTART IDENTITY CASCADE;

-- Raíz Dirección
INSERT INTO org_chart_nodes (id, name, parent_id, type, level, area, description, color, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Dirección General', NULL, 'direccion', 0, 'Dirección', 'Conducción ejecutiva y estratégica de DASSA', '#BF1E2E', 0),
  -- CEO (Manuel) reporta a Dirección
  ('20000000-0000-0000-0000-000000000001', 'CEO + SGI', '11111111-1111-1111-1111-111111111111', 'direccion', 1, 'CEO', 'Conducción operativa (CEO) y Líder del SGI TRINORMA', '#9A1825', 0),
  -- Áreas bajo CEO Manuel
  ('22222222-2222-2222-2222-222222222222', 'Administración', '20000000-0000-0000-0000-000000000001', 'area', 2, 'Administración', 'RRHH, finanzas, compras, facturación, cobranzas', '#F59E0B', 1),
  ('33333333-3333-3333-3333-333333333333', 'Seguridad e Higiene', '20000000-0000-0000-0000-000000000001', 'area', 2, 'SySO', 'Salud y seguridad ocupacional · ISO 45001', '#7C3AED', 2),
  ('44444444-4444-4444-4444-444444444444', 'Comercial', '20000000-0000-0000-0000-000000000001', 'area', 2, 'Comercial', 'Captación, retención y atención de clientes', '#0F1A4A', 3),
  ('55555555-5555-5555-5555-555555555555', 'Operaciones', '20000000-0000-0000-0000-000000000001', 'area', 2, 'Operaciones', 'Gerencia, coordinación de cargas y operativa de depósito', '#10B981', 4),
  ('66666666-6666-6666-6666-666666666666', 'Sistemas', '20000000-0000-0000-0000-000000000001', 'area', 2, 'Sistemas', 'IT e infraestructura', '#6366F1', 5),
  -- Sub-áreas Operaciones
  ('55555555-5555-5555-5555-555555555556', 'Coordinación', '55555555-5555-5555-5555-555555555555', 'sector', 3, 'Coordinación', 'Coordinadores IMPO/EXPO/Tráfico + Personal Puerto', '#34D399', 0),
  ('55555555-5555-5555-5555-555555555557', 'Depósito', '55555555-5555-5555-5555-555555555555', 'sector', 3, 'Depósito', 'Operativa diaria en depósito fiscal', '#10B981', 1);

-- ───────────────────────────────────────────────────────────────────
-- 3. PUESTOS · TRUNCATE + reinserción con 22 puestos correctos
-- ───────────────────────────────────────────────────────────────────
TRUNCATE job_profile_employees, job_profile_procedures, job_profile_risks RESTART IDENTITY CASCADE;
DELETE FROM job_profiles;

INSERT INTO job_profiles (id, role_label, area, seniority, mission, org_node_id, source, is_active) VALUES

  -- DIRECCIÓN
  ('a0000001-0000-0000-0000-000000000001', 'Director General', 'Dirección', 'director',
   'Conducción estratégica de DASSA SA, representación ante stakeholders, dueño del rumbo y de las decisiones de alto nivel.',
   '11111111-1111-1111-1111-111111111111', 'imported', TRUE),

  -- CEO + SGI (Manuel ocupa AMBOS)
  ('a0000002-0000-0000-0000-000000000002', 'CEO', 'CEO', 'director',
   'Conducción operativa diaria de DASSA. Reporta al Director General. Supervisa todas las áreas (Admin, SySO, Comercial, Operaciones, Sistemas).',
   '20000000-0000-0000-0000-000000000001', 'imported', TRUE),

  ('a0000003-0000-0000-0000-000000000003', 'Líder SGI', 'SGI', 'lider',
   'Mantener vivo el Sistema de Gestión Integrado TRINORMA (ISO 9001+14001+45001), coordinar auditorías internas/externas, impulsar mejora continua.',
   '20000000-0000-0000-0000-000000000001', 'imported', TRUE),

  -- ADMINISTRACIÓN (3 puestos)
  ('a0000004-0000-0000-0000-000000000004', 'Administración General', 'Administración', 'responsable',
   'Administrar los recursos humanos, físicos y los valores de la empresa. Cubre RRHH, finanzas, compras, capacitaciones, contabilidad, bancos, sueldos e impuestos.',
   '22222222-2222-2222-2222-222222222222', 'imported', TRUE),

  ('a0000005-0000-0000-0000-000000000005', 'Facturación y Cobranzas', 'Administración', 'semi',
   'Supervisar y ejecutar el proceso completo de facturación, garantizar exactitud de tarifas, gestionar cobranzas y mantener cuentas por cobrar al día.',
   '22222222-2222-2222-2222-222222222222', 'imported', TRUE),

  ('a0000006-0000-0000-0000-000000000006', 'Asistente Administrativa', 'Administración', 'junior',
   'Soporte administrativo a las funciones de Administración General y Facturación. Ficha detallada pendiente.',
   '22222222-2222-2222-2222-222222222222', 'ai_inferred', TRUE),

  -- SEGURIDAD E HIGIENE
  ('a0000007-0000-0000-0000-000000000007', 'Responsable de Seguridad e Higiene (SySO)', 'SySO', 'responsable',
   'Garantizar la salud y seguridad ocupacional según ISO 45001, gestionar incidentes, aspectos ambientales, requisitos legales SST y plan de emergencia.',
   '33333333-3333-3333-3333-333333333333', 'ai_inferred', TRUE),

  -- COMERCIAL (2 puestos)
  ('a0000008-0000-0000-0000-000000000008', 'Gerente Comercial', 'Comercial', 'gerente',
   'Liderar y supervisar las actividades comerciales, asegurar el crecimiento de las ventas y la satisfacción del cliente. VACANTE actualmente.',
   '44444444-4444-4444-4444-444444444444', 'imported', TRUE),

  ('a0000009-0000-0000-0000-000000000009', 'Vendedor / Representante Comercial', 'Comercial', 'semi',
   'Impulsar el crecimiento estratégico de DASSA mediante la captación de clientes y maximización de ventas, manteniendo alto nivel de satisfacción.',
   '44444444-4444-4444-4444-444444444444', 'imported', TRUE),

  -- OPERACIONES · Gerencia
  ('a0000010-0000-0000-0000-000000000010', 'Gerente de Operaciones', 'Operaciones', 'gerente',
   'Conducir y supervisar todas las operaciones de DASSA: Coordinación (Impo/Expo/Tráfico/Puerto) y Depósito. Reporta al CEO.',
   '55555555-5555-5555-5555-555555555555', 'imported', TRUE),

  -- COORDINACIÓN (4 puestos)
  ('a0000011-0000-0000-0000-000000000011', 'Coordinador de Importación', 'Coordinación', 'semi',
   'Coordinar y hacer seguimiento de todas las cargas de importación. Customer service, control documental, traslados desde terminales, TLATs.',
   '55555555-5555-5555-5555-555555555556', 'imported', TRUE),

  ('a0000012-0000-0000-0000-000000000012', 'Coordinador de Exportación', 'Coordinación', 'semi',
   'Coordinar y dar seguimiento a todas las cargas de exportación: customer service, consolidado marítimo, remisión a puerto, salidas AFIP.',
   '55555555-5555-5555-5555-555555555556', 'imported', TRUE),

  ('a0000013-0000-0000-0000-000000000013', 'Coordinador de Tráfico y Marítimas', 'Coordinación', 'semi',
   'Gestionar con Agencias Marítimas pagos y retiros de documentación aduanera. Elabora manifiestos, Bill of Lading. Soporte a IMPO/EXPO. VACANTE.',
   '55555555-5555-5555-5555-555555555556', 'imported', TRUE),

  ('a0000014-0000-0000-0000-000000000014', 'Personal de Puerto', 'Coordinación', 'junior',
   'Gestión de retiro de contenedores en terminales portuarias. Es la cara de DASSA ante el Puerto y la Aduana. Trámites aduaneros, salidas Malvinas.',
   '55555555-5555-5555-5555-555555555556', 'imported', TRUE),

  -- DEPÓSITO (8 puestos)
  ('a0000015-0000-0000-0000-000000000015', 'Supervisor Operativo', 'Depósito', 'lider',
   'Coordinar, supervisar y optimizar las operaciones diarias del depósito. Supervisar apuntadores y operarios. Cumplimiento de orden del día.',
   '55555555-5555-5555-5555-555555555557', 'imported', TRUE),

  ('a0000016-0000-0000-0000-000000000016', 'Apuntador / Controlador de Cargas', 'Depósito', 'semi',
   'Control de bultos por cada operación: apunte, fotos, control de stock, movimientos de carga. Sub-tipos: IMPO, EXPO, General.',
   '55555555-5555-5555-5555-555555555557', 'imported', TRUE),

  ('a0000017-0000-0000-0000-000000000017', 'Maquinista (Autoelevadorista)', 'Depósito', 'semi',
   'Operación de autoelevadores para movimientos de mercadería. Mantenimiento preventivo básico de equipos asignados.',
   '55555555-5555-5555-5555-555555555557', 'ai_inferred', TRUE),

  ('a0000018-0000-0000-0000-000000000018', 'Operario de Carga y Descarga', 'Depósito', 'junior',
   'Operativo general de carga y descarga, consolidación/desconsolidación manual de contenedores, manipulación de mercaderías.',
   '55555555-5555-5555-5555-555555555557', 'ai_inferred', TRUE),

  ('a0000019-0000-0000-0000-000000000019', 'Containero', 'Depósito', 'semi',
   'Especialista en manejo de contenedores: posicionamiento, apertura/cierre, control de precintos, coordinación con choferes.',
   '55555555-5555-5555-5555-555555555557', 'imported', TRUE),

  ('a0000020-0000-0000-0000-000000000020', 'Plazoletero', 'Depósito', 'junior',
   'Operario asignado al sector plazoleta: ingreso/egreso de camiones, control de circulación, ubicación de cargas externas.',
   '55555555-5555-5555-5555-555555555557', 'ai_inferred', TRUE),

  ('a0000021-0000-0000-0000-000000000021', 'Balanza', 'Depósito', 'junior',
   'Operario del sector balanza: control de peso de cargas, registro en sistema, emisión de comprobantes de pesada.',
   '55555555-5555-5555-5555-555555555557', 'ai_inferred', TRUE),

  ('a0000022-0000-0000-0000-000000000022', 'Mantenimiento', 'Depósito', 'semi',
   'Mantenimiento preventivo y correctivo de instalaciones, maquinarias, autoelevadores, y planta general. Coordina con proveedores externos.',
   '55555555-5555-5555-5555-555555555557', 'ai_inferred', TRUE),

  -- SISTEMAS
  ('a0000023-0000-0000-0000-000000000023', 'Responsable de Sistemas', 'Sistemas', 'responsable',
   'Mantener infraestructura IT, soporte a usuarios, integración entre sistemas internos (Depofis, SGI, app DASSA), proyectos digitales.',
   '66666666-6666-6666-6666-666666666666', 'ai_inferred', TRUE);

-- ───────────────────────────────────────────────────────────────────
-- 4. ASIGNAR EMPLEADOS según F-TRI-34 + nombres reales
-- ───────────────────────────────────────────────────────────────────

-- Director General
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000001-0000-0000-0000-000000000001', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Santiago Aguirre%';

-- CEO (Manuel) + Líder SGI (mismo Manuel, 2 puestos, primario CEO)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000002-0000-0000-0000-000000000002', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Manuel%';
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000003-0000-0000-0000-000000000003', id, '2024-01-01', FALSE FROM employees WHERE full_name ILIKE '%Manuel%';

-- Administración General (María Delgado)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000004-0000-0000-0000-000000000004', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%María Delgado%' OR full_name ILIKE '%Maria Delgado%';

-- Facturación y Cobranzas (Maira Herrera)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000005-0000-0000-0000-000000000005', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Maira Herrera%';

-- Asistente Administrativa (Lidia)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000006-0000-0000-0000-000000000006', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Lidia%';

-- Responsable SySO (Fernando)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000007-0000-0000-0000-000000000007', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Fernando Ponzi%';

-- Gerente Comercial → VACANTE (no asigno empleado)

-- Vendedor (Guillermo)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000009-0000-0000-0000-000000000009', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Guillermo Jorge%';

-- Gerente de Operaciones (Christian)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000010-0000-0000-0000-000000000010', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Christian Medina%';

-- Coordinador IMPO (Alan)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000011-0000-0000-0000-000000000011', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Alan Santibañez%';

-- Coordinador EXPO (Marcos Coria)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000012-0000-0000-0000-000000000012', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Marcos Coria%';

-- Coordinador Tráfico → VACANTE
-- Personal Puerto → sin asignación nominal

-- Supervisor Operativo (Marcelo)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000015-0000-0000-0000-000000000015', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Marcelo Stizza%';

-- Apuntador / Controlador de Cargas (Federico IMPO + Claudio EXPO)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary, notes)
SELECT 'a0000016-0000-0000-0000-000000000016', id, '2024-01-01', TRUE, 'Controlador IMPO' FROM employees WHERE full_name ILIKE '%Federico Estigarribia%';
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary, notes)
SELECT 'a0000016-0000-0000-0000-000000000016', id, '2024-01-01', TRUE, 'Controlador EXPO' FROM employees WHERE full_name ILIKE '%Claudio Estigarribia%';

-- Containero (Fabián, en formación)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary, notes)
SELECT 'a0000019-0000-0000-0000-000000000019', id, '2024-01-01', TRUE, 'En formación' FROM employees WHERE full_name ILIKE '%Fabián Fuentes%';

-- Operario de Carga y Descarga (resto de los 11 operarios genéricos)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary, notes)
SELECT 'a0000018-0000-0000-0000-000000000018', id, '2024-01-01', TRUE, 'Asignación inicial · ajustar a rol específico cuando se defina'
FROM employees
WHERE position ILIKE '%Operario%'
  AND full_name NOT ILIKE '%Alan Santibañez%'
  AND full_name NOT ILIKE '%Marcos Coria%'
  AND full_name NOT ILIKE '%Federico Estigarribia%'
  AND full_name NOT ILIKE '%Claudio Estigarribia%'
  AND full_name NOT ILIKE '%Fabián Fuentes%';

-- Responsable de Sistemas (Alexis)
INSERT INTO job_profile_employees (profile_id, employee_id, since, is_primary)
SELECT 'a0000023-0000-0000-0000-000000000023', id, '2024-01-01', TRUE FROM employees WHERE full_name ILIKE '%Alexis Dalpra%';

COMMIT;

-- ───────────────────────────────────────────────────────────────────
-- Verificación
-- ───────────────────────────────────────────────────────────────────
SELECT '────── Organigrama (9 nodos) ──────' AS info;
SELECT level, REPEAT('  ', level) || name AS nodo, area FROM org_chart_nodes ORDER BY level, sort_order;

SELECT '────── Puestos (22) y empleados asignados ──────' AS info;
SELECT jp.role_label, jp.area, jp.seniority,
       (SELECT COUNT(*) FROM job_profile_employees jpe WHERE jpe.profile_id = jp.id AND jpe.until IS NULL) AS emp_asignados
FROM job_profiles jp ORDER BY jp.area, jp.role_label;

SELECT '────── Asignaciones ──────' AS info;
SELECT e.full_name AS empleado, jp.role_label AS puesto, jpe.is_primary, jpe.notes
FROM job_profile_employees jpe
JOIN employees e ON e.id = jpe.employee_id
JOIN job_profiles jp ON jp.id = jpe.profile_id
ORDER BY jp.role_label, e.full_name;
