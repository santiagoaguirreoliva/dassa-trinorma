-- 045 — Sincronización masiva del plantel DASSA según fichas finales
-- Fuente: DASSA_FICHAS_PUESTOS.md · F-TRI-34 v2024 · revisado 2026-05-20.
-- Aplica 27 cambios al plantel:
--   · 1 alta (Pepo)
--   · 1 rename (María Delgado → María del Carmen Delgado)
--   · 26 updates de puesto/sector
--   · 27 asignaciones de supervisor_id
-- Excluye externos Nixa y Toti (van a tabla aparte external_contacts).
-- Enzo Nieto se mantiene como interno por excepción.
-- Idempotente: ejecutar varias veces no rompe nada.

BEGIN;

-- ─── 1. RENAME (preserva id, evaluaciones, tareas) ────────────────
UPDATE employees
   SET full_name = 'María del Carmen Delgado',
       updated_at = NOW()
 WHERE full_name = 'María Delgado';

-- ─── 2. ALTA de Pepo ──────────────────────────────────────────────
INSERT INTO employees (full_name, position, sector, is_active)
SELECT 'Pepo', 'Personal de Puerto (Exolgan)', 'Coordinación IMPO', true
 WHERE NOT EXISTS (SELECT 1 FROM employees WHERE full_name = 'Pepo');

-- ─── 3. UPDATES de puesto y sector ────────────────────────────────
-- Tabla local con los datos finales del MD; el UPDATE matchea por nombre.
WITH plantel(full_name, new_position, new_sector) AS (VALUES
  ('Santiago Aguirre Oliva',     'Director General / Líder SGI',                   'Dirección'),
  ('Manuel De La Arena',         'CEO / Gerente General',                          'Gerencia'),
  ('Francisco Urtubey',          'Representante Legal y Técnica',                  'Dirección'),
  ('Facundo Lastra',             'Responsable de Tecnología',                      'Tecnología'),
  ('Christian Medina',           'Gerente de Operaciones',                         'Operaciones'),
  ('Guillermo Jorge',            'Vendedor',                                       'Comercial'),
  ('Alexis Dalpra',              'Vendedor',                                       'Comercial'),
  ('Enzo Nieto',                 'Vendedor',                                       'Comercial'),
  ('María del Carmen Delgado',   'Administración General / RRHH',                  'Administración'),
  ('Maira Herrera',              'Facturación · Cobranzas · Asist. Dirección',     'Administración'),
  ('Fernando Ponzi',             'Responsable SySO',                               'Seguridad e Higiene'),
  ('Marcelo Stizza',             'Supervisor de Depósito',                         'Depósito'),
  ('Marcos Coria',               'Administrativo de Exportación',                  'Coordinación'),
  ('Alan Santibañez',            'Administrativo de Importación',                  'Coordinación'),
  ('Luna Villar',                'Administrativo de Tráfico',                      'Coordinación'),
  ('Carlos Vera',                'Personal de Puerto',                             'Coordinación IMPO'),
  ('Pepo',                       'Personal de Puerto (Exolgan)',                   'Coordinación IMPO'),
  ('Cristian Andreini',          'Balancero',                                      'Depósito'),
  ('Franco Di Dio',              'Plazoletero',                                    'Depósito'),
  ('Franco Pérez',               'Apuntador',                                      'Depósito'),
  ('Claudio Estigarribia',       'Apuntador — Controlador EXPO',                   'Depósito'),
  ('Federico Estigarribia',      'Apuntador — Controlador IMPO',                   'Depósito'),
  ('Nicolás Nuñez',              'Apuntador — Esp. Mudanzas',                      'Depósito'),
  ('Maximiliano Sandoval',       'Operario Carga y Descarga',                      'Depósito'),
  ('Mario Goroso',               'Operario Carga y Descarga',                      'Depósito'),
  ('Emmanuel Fernández',         'Maquinista',                                     'Depósito'),
  ('Fabián Fuentes',             'Maquinista',                                     'Depósito'),
  ('Matías Díaz',                'Maquinista Containera',                          'Depósito'),
  ('Rodolfo Espíndola',          'Maquinista',                                     'Depósito'),
  ('Lidia Miño',                 'Maestranza',                                     'Depósito')
)
UPDATE employees e
   SET position = p.new_position,
       sector   = p.new_sector,
       updated_at = NOW()
  FROM plantel p
 WHERE e.full_name = p.full_name;

-- ─── 4. SUPERVISOR_ID — cadena jerárquica del MD ─────────────────
WITH sup_map(empleado, supervisor) AS (VALUES
  ('Facundo Lastra',           'Santiago Aguirre Oliva'),
  ('Christian Medina',         'Manuel De La Arena'),
  ('Guillermo Jorge',          'Manuel De La Arena'),
  ('Alexis Dalpra',            'Manuel De La Arena'),
  ('Enzo Nieto',               'Manuel De La Arena'),
  ('María del Carmen Delgado', 'Manuel De La Arena'),
  ('Maira Herrera',            'Manuel De La Arena'),
  ('Fernando Ponzi',           'María del Carmen Delgado'),
  ('Marcelo Stizza',           'Christian Medina'),
  ('Marcos Coria',             'Christian Medina'),
  ('Alan Santibañez',          'Christian Medina'),
  ('Luna Villar',               'Christian Medina'),
  ('Carlos Vera',              'Alan Santibañez'),
  ('Pepo',                     'Alan Santibañez'),
  ('Cristian Andreini',        'Christian Medina'),
  ('Franco Di Dio',            'Cristian Andreini'),
  ('Franco Pérez',             'Marcelo Stizza'),
  ('Claudio Estigarribia',     'Marcelo Stizza'),
  ('Federico Estigarribia',    'Marcelo Stizza'),
  ('Nicolás Nuñez',            'Marcelo Stizza'),
  ('Maximiliano Sandoval',     'Marcelo Stizza'),
  ('Mario Goroso',             'Marcelo Stizza'),
  ('Emmanuel Fernández',       'Marcelo Stizza'),
  ('Fabián Fuentes',           'Marcelo Stizza'),
  ('Matías Díaz',              'Marcelo Stizza'),
  ('Rodolfo Espíndola',        'Marcelo Stizza'),
  ('Lidia Miño',               'Marcelo Stizza')
)
UPDATE employees e
   SET supervisor_id = sup.id,
       updated_at = NOW()
  FROM sup_map m
  JOIN employees sup ON sup.full_name = m.supervisor
 WHERE e.full_name = m.empleado;

COMMIT;
