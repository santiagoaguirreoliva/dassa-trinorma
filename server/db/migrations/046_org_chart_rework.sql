-- 046 — Reescribe org_chart_nodes según el organigrama final del MD F-TRI-34
-- Modelo: triunvirato horizontal (Santiago, Manuel, Francisco) + cadenas
-- bajo cada uno. La columna `area` enlaza con employees.sector y
-- job_profiles.area, así la UI puede contar empleados por nodo.
--
-- Conservamos compatibilidad: solo borramos nodos sin job_profiles
-- apuntando a ellos vía org_node_id, y reseteamos esa relación si la
-- hubiera. Si el modelo viejo es muy distinto, asumimos pérdida.

BEGIN;

-- Ampliamos el constraint de tipo para reflejar el modelo nuevo
ALTER TABLE org_chart_nodes DROP CONSTRAINT IF EXISTS org_chart_nodes_type_check;
ALTER TABLE org_chart_nodes
  ADD CONSTRAINT org_chart_nodes_type_check
  CHECK (type = ANY (ARRAY['root','triunvirato','direccion','area','sector','puesto','equipo','externo']));

-- Limpiamos referencias en job_profiles (no eliminamos los profiles)
UPDATE job_profiles SET org_node_id = NULL;

-- Limpiamos la tabla y la regeneramos
DELETE FROM org_chart_nodes;

INSERT INTO org_chart_nodes (id, name, parent_id, type, level, area, description, color, sort_order, is_active) VALUES
  -- ─── L0 ROOT · TRIUNVIRATO ────────────────────────────────────
  ('a0000000-0000-0000-0000-000000000001', 'TRIUNVIRATO DASSA', NULL, 'root', 0, 'Triunvirato',
   'Conducción horizontal: Santiago, Manuel, Francisco al mismo nivel.', '#C8102E', 0, true),

  -- ─── L1 · Los 3 integrantes del Triunvirato ──────────────────
  ('a1111111-1111-1111-1111-000000000001',
   'Director General / Líder SGI',
   'a0000000-0000-0000-0000-000000000001', 'triunvirato', 1, 'Dirección',
   'Santiago Aguirre Oliva — Líder del SGI y de la transformación Smart DASSA.', '#C8102E', 10, true),

  ('a1111111-1111-1111-1111-000000000002',
   'CEO / Gerente General',
   'a0000000-0000-0000-0000-000000000001', 'triunvirato', 1, 'Gerencia',
   'Manuel De La Arena — Eje desde donde desciende toda la cadena operativa.', '#C8102E', 20, true),

  ('a1111111-1111-1111-1111-000000000003',
   'Representante Legal y Técnica',
   'a0000000-0000-0000-0000-000000000001', 'triunvirato', 1, 'Dirección',
   'Francisco Urtubey — Asuntos legales, compliance, relación con Aduana.', '#C8102E', 30, true),

  -- ─── L2 · Bajo Santiago (Dirección) ───────────────────────────
  ('a2222222-2222-2222-2222-000000000001',
   'Tecnología',
   'a1111111-1111-1111-1111-000000000001', 'area', 2, 'Tecnología',
   'Facundo Lastra — Responsable de Tecnología (Smart DASSA, BI, ETL).', '#206090', 10, true),

  ('a2222222-2222-2222-2222-000000000002',
   'SGI · Consultoría Externa',
   'a1111111-1111-1111-1111-000000000001', 'externo', 2, 'SGI',
   'Nixa Méndez — Directora SGI (externa).', '#444444', 20, true),

  -- ─── L2 · Bajo Manuel ─────────────────────────────────────────
  ('a2222222-2222-2222-2222-000000000010',
   'Operaciones',
   'a1111111-1111-1111-1111-000000000002', 'area', 2, 'Operaciones',
   'Christian Medina — Gerente de Operaciones. Desde acá baja toda la operativa física.', '#2d4a8a', 10, true),

  ('a2222222-2222-2222-2222-000000000011',
   'Comercial',
   'a1111111-1111-1111-1111-000000000002', 'area', 2, 'Comercial',
   'Equipo de ventas: Guillermo, Alexis, Enzo (externo).', '#2a5a2a', 20, true),

  ('a2222222-2222-2222-2222-000000000012',
   'Administración',
   'a1111111-1111-1111-1111-000000000002', 'area', 2, 'Administración',
   'María del Carmen Delgado (RRHH/General) + Maira Herrera (Facturación).', '#5a2a7a', 30, true),

  -- ─── L3 · Bajo Operaciones ────────────────────────────────────
  ('a3333333-3333-3333-3333-000000000001',
   'Coordinación',
   'a2222222-2222-2222-2222-000000000010', 'sector', 3, 'Coordinación',
   'Customer Service y planificación: Marcos (EXPO), Alan (IMPO), Luna (Tráfico). Despliega Personal de Puerto.', '#1a6090', 10, true),

  ('a3333333-3333-3333-3333-000000000002',
   'Depósito',
   'a2222222-2222-2222-2222-000000000010', 'sector', 3, 'Depósito',
   'Operativa física: Supervisor (Marcelo), Apuntadores, Maquinistas, Plazoleta, Balanza, Maestranza.', '#2a3a6a', 20, true),

  -- ─── L3 · Bajo Administración ─────────────────────────────────
  ('a3333333-3333-3333-3333-000000000010',
   'Seguridad e Higiene',
   'a2222222-2222-2222-2222-000000000012', 'sector', 3, 'Seguridad e Higiene',
   'Fernando Ponzi — Responsable SySO (ART, comité mixto, EPP).', '#8a4020', 10, true),

  ('a3333333-3333-3333-3333-000000000011',
   'Mantenimiento · Externo',
   'a2222222-2222-2222-2222-000000000012', 'externo', 3, 'Mantenimiento',
   'Toti — proveedor externo, supervisado por Marcelo o María según tarea.', '#444444', 20, true);

-- ─── Re-vincular job_profiles a sus nodos por area ───────────────
UPDATE job_profiles jp
   SET org_node_id = n.id
  FROM org_chart_nodes n
 WHERE n.is_active = true
   AND CASE
        WHEN jp.role_label = 'Director General / Líder SGI'        THEN n.id = 'a1111111-1111-1111-1111-000000000001'
        WHEN jp.role_label = 'CEO / Gerente General'                THEN n.id = 'a1111111-1111-1111-1111-000000000002'
        WHEN jp.role_label = 'Representante Legal y Técnica'        THEN n.id = 'a1111111-1111-1111-1111-000000000003'
        WHEN jp.role_label = 'Responsable de Tecnología'            THEN n.id = 'a2222222-2222-2222-2222-000000000001'
        WHEN jp.role_label = 'Directora SGI (Consultora Externa)'   THEN n.id = 'a2222222-2222-2222-2222-000000000002'
        WHEN jp.role_label = 'Gerente de Operaciones'               THEN n.id = 'a2222222-2222-2222-2222-000000000010'
        WHEN jp.area = 'Comercial'                                  THEN n.id = 'a2222222-2222-2222-2222-000000000011'
        WHEN jp.area = 'Administración'                             THEN n.id = 'a2222222-2222-2222-2222-000000000012'
        WHEN jp.area = 'Coordinación' OR jp.area = 'Coordinación IMPO' THEN n.id = 'a3333333-3333-3333-3333-000000000001'
        WHEN jp.area = 'Depósito'                                   THEN n.id = 'a3333333-3333-3333-3333-000000000002'
        WHEN jp.area = 'Seguridad e Higiene'                        THEN n.id = 'a3333333-3333-3333-3333-000000000010'
        WHEN jp.area = 'Operaciones' AND jp.seniority = 'externo'   THEN n.id = 'a3333333-3333-3333-3333-000000000011'
        ELSE FALSE
       END;

COMMIT;
