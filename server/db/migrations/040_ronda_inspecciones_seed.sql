-- 040_ronda_inspecciones_seed.sql
-- Carga inicial del módulo "Ronda de Inspecciones": plantillas, ítems
-- (extraídos de la planilla F-TRI), responsables, máquinas y geofence.
-- Ref: docs/SPEC-RONDA-INSPECCIONES.md

BEGIN;

-- ─── Plantillas ───────────────────────────────────────────────────
INSERT INTO insp_templates (code, name, family, frequency, gen_cron, due_offset_days, requires_cosign, machine_type)
VALUES
  ('F-TRI-23','Ronda de Limpieza',            'rondin',     'semanal',   '0 6 * * 1',    3, false, NULL),
  ('F-TRI-20','Ronda de Mantenimiento',       'rondin',     'semanal',   '0 6 * * 1',    3, true,  NULL),
  ('SSHH',    'Ronda de Seguridad e Higiene', 'rondin',     'quincenal', '0 6 1,15 * *', 5, true,  NULL),
  ('F-TRI-19','Checklist Diario de Autoelevador','maquinaria','diaria',  '0 6 * * *',    1, false, 'autoelevador')
ON CONFLICT (code) DO NOTHING;

-- ─── Ítems F-TRI-19 · Checklist diario autoelevador (21 ítems) ────
INSERT INTO insp_template_items (template_id, section, order_idx, label, response_type, is_critical, photo_on_fail)
SELECT t.id, x.section, x.ord, x.label, 'si_no', x.crit, x.crit
FROM insp_templates t CROSS JOIN (VALUES
  ('Niveles y fluidos',     1,'Nafta / Gas',                                                    false),
  ('Niveles y fluidos',     2,'Nivel de agua',                                                  false),
  ('Niveles y fluidos',     3,'Nivel de aceite',                                                false),
  ('Niveles y fluidos',     4,'Lavado',                                                         false),
  ('Luces y señales',       5,'Luces',                                                          true),
  ('Luces y señales',       6,'Bocina',                                                         true),
  ('Luces y señales',       7,'Aviso de retroceso: sonido / luz',                               true),
  ('Luces y señales',       8,'Espejos retrovisores en ambos lados',                            true),
  ('Seguridad',             9,'Freno de pie y de mano',                                         true),
  ('Seguridad',            10,'Ruedas (presión, desgaste, cortes y marcas)',                    true),
  ('Estructura y mandos',  11,'Fijación de brazos / horquilla / uñas / accesorio',              true),
  ('Estructura y mandos',  12,'Sistema de transmisión',                                         false),
  ('Estructura y mandos',  13,'Sin pérdidas del circuito hidráulico / mangueras / conexiones',  true),
  ('Estructura y mandos',  14,'Mandos en servicio',                                             true),
  ('Seguridad',            15,'Cinturón de seguridad',                                          true),
  ('Seguridad',            16,'Extintor presente y con vigencia',                               true),
  ('Seguridad',            17,'Superficie antideslizante en el pedal de mando',                 false),
  ('Seguridad',            18,'Superficie antideslizante en la zona de ascenso',                false),
  ('Otros',                19,'Estado del asiento',                                             false),
  ('Otros',                20,'Estado del carro de garrafa',                                    false),
  ('Otros',                21,'¿Fui el último en usarla?',                                      false)
) AS x(section, ord, label, crit)
WHERE t.code = 'F-TRI-19';

-- ─── Ítems F-TRI-23 · Ronda de limpieza (19 ítems) ────────────────
INSERT INTO insp_template_items (template_id, section, order_idx, label, response_type, is_critical, photo_on_fail)
SELECT t.id, x.section, x.ord, x.label, 'cumple', false, false
FROM insp_templates t CROSS JOIN (VALUES
  ('Recorrido diario', 1,'Limpieza general — Entrada Larralde'),
  ('Recorrido diario', 2,'Limpieza general — Sector vigilancia entrada Larralde'),
  ('Recorrido diario', 3,'Limpiar y desinfectar — Vestuarios y baños (recorrido 1)'),
  ('Recorrido diario', 4,'Barrido — Parking'),
  ('Recorrido diario', 5,'Limpieza general — Comedores, oficinas de depósito/transporte y oficina de maquinistas'),
  ('Recorrido diario', 6,'Limpieza general — Dispensers de agua y montacargas'),
  ('Recorrido diario', 7,'Limpiar y desinfectar — Vestuarios y baños (recorrido 2)'),
  ('Recorrido diario', 8,'Limpiar y desinfectar — Oficina de mantenimiento y archivo'),
  ('Recorrido diario', 9,'Limpiar y desinfectar — Rezago'),
  ('Recorrido diario',10,'Barrido — Depósito'),
  ('Recorrido diario',11,'Barrido — Zona tinglado'),
  ('Recorrido diario',12,'Vaciar papeleras y basureros — Todos los sectores'),
  ('Recorrido diario',13,'Revisión y reabastecimiento de productos de limpieza — Baños, cocina y oficinas'),
  ('Extras',          14,'Protocolo días de lluvia — Zona plazoleta y entrada principal'),
  ('Extras',          15,'Limpieza de cartelería'),
  ('Extras',          16,'Desinfección de paredes y techo (tela de araña)'),
  ('Extras',          17,'Limpieza de matafuegos'),
  ('Extras',          18,'Limpieza del escáner'),
  ('Extras',          19,'Limpieza general — Naves 1, 2, 3 y 4')
) AS x(section, ord, label)
WHERE t.code = 'F-TRI-23';

-- ─── Ítems F-TRI-20 · Ronda de mantenimiento (32 ítems) ───────────
INSERT INTO insp_template_items (template_id, section, order_idx, label, response_type, is_critical, photo_on_fail)
SELECT t.id, x.section, x.ord, x.label, 'cumple', x.crit, x.crit
FROM insp_templates t CROSS JOIN (VALUES
  ('Circulación y estructura', 1,'Senderos peatonales principales (impecabilidad)',                         false),
  ('Escáner y oficinas',       2,'Escáner (limpieza profunda, cartelería, área despejada)',                 false),
  ('Escáner y oficinas',       3,'Oficina de depósito (orden y limpieza profunda)',                         false),
  ('Perímetro y exterior',     4,'Muros perimetrales (estado, alambrados, sensores, limpieza)',             true),
  ('Circulación y estructura', 5,'Estado de pisos del depósito (delineamiento, pozos, baches, quebraduras)',false),
  ('Circulación y estructura', 6,'Techos de almacén y naves (estado de chapas, goteras)',                   true),
  ('Drenajes',                 7,'Canaletas plazoleta (canaletas, cañerías, apliques, fosas, cámaras)',     false),
  ('Drenajes',                 8,'Canaletas tinglado (limpieza y despeje)',                                 false),
  ('Naves',                    9,'Nave 1 — los 3 niveles',                                                  false),
  ('Naves',                   10,'Nave 2 + Nave 3',                                                         false),
  ('Naves',                   11,'Nave 4',                                                                  false),
  ('Naves',                   12,'Nave 5',                                                                  false),
  ('Naves',                   13,'Nave rezago 1° piso',                                                     false),
  ('Áreas de servicio',       14,'Canil DASSA (estado, limpieza)',                                          false),
  ('Áreas de servicio',       15,'Zona de pallets exterior (orden, limpieza, descarte y reparación)',       false),
  ('Perímetro y exterior',    16,'Espacios verdes y cantero (limpieza, poda, jardinería)',                  false),
  ('Perímetro y exterior',    17,'Fachada y calles exteriores (limpieza, poda, jardinería, basura)',        false),
  ('Áreas de servicio',       18,'Comedor (limpieza, estado, pasillo abierto a la calle)',                  false),
  ('Sanitarios',              19,'Baños y vestuarios del depósito (estado, higiene)',                       false),
  ('Sanitarios',              20,'Baños y vestuarios del personal DASSA (estado, higiene)',                 false),
  ('Sanitarios',              21,'Baños y vestuarios del personal externo (estado, higiene)',               false),
  ('Perímetro y exterior',    22,'Parking de camiones internacionales (vallas, limpieza)',                  false),
  ('Naves',                   23,'Nave externa (estado, limpieza, residuos de film)',                       false),
  ('Áreas de servicio',       24,'Pañol (orden, limpieza, reserva de diésel)',                              false),
  ('Áreas de servicio',       25,'Sala de stock (orden, limpieza, insumos)',                                false),
  ('Seguridad e instalaciones',26,'Prueba del sistema de alarmas',                                          true),
  ('Seguridad e instalaciones',27,'Cartelería y SSHH (estado, limpieza, ubicación)',                        false),
  ('Seguridad e instalaciones',28,'Matafuegos (vencimiento, limpieza, ubicación, accesibilidad)',           true),
  ('Seguridad e instalaciones',29,'Montacargas (funcionamiento, limpieza, fosa, electricidad, seguridad)',  true),
  ('Seguridad e instalaciones',30,'Tableros eléctricos (estado, disyuntores, seguridad)',                   true),
  ('Seguridad e instalaciones',31,'Prueba de luminarias',                                                   false),
  ('Seguridad e instalaciones',32,'Iluminación del depósito (tablero, campanas, focos, cableado)',          false)
) AS x(section, ord, label, crit)
WHERE t.code = 'F-TRI-20';

-- ─── Ítems SSHH · Ronda de Seguridad e Higiene (19 ítems) ─────────
-- BORRADOR: a validar/ajustar por Fernando Ponzi (Responsable SySO) desde /rondas/config.
INSERT INTO insp_template_items (template_id, section, order_idx, label, response_type, is_critical, photo_on_fail)
SELECT t.id, x.section, x.ord, x.label, 'cumple', x.crit, x.crit
FROM insp_templates t CROSS JOIN (VALUES
  ('Protección contra incendios', 1,'Matafuegos: carga vigente, presión y precinto',                    true),
  ('Protección contra incendios', 2,'Matafuegos: señalización, ubicación y acceso despejado',           true),
  ('Protección contra incendios', 3,'Bocas y mangueras de incendio en condiciones',                     true),
  ('Protección contra incendios', 4,'Luces de emergencia funcionando',                                  true),
  ('Vías de evacuación',          5,'Salidas de emergencia señalizadas, libres y operables',            true),
  ('Vías de evacuación',          6,'Cartelería de evacuación y planos visibles',                       false),
  ('Vías de evacuación',          7,'Pasillos y senderos peatonales despejados y demarcados',           false),
  ('Señalización y EPP',          8,'Señalética de seguridad completa y legible',                       false),
  ('Señalización y EPP',          9,'Personal usando el EPP correspondiente a la tarea',                true),
  ('Señalización y EPP',         10,'Stock y estado de EPP en pañol',                                   false),
  ('Riesgo eléctrico',           11,'Tableros eléctricos cerrados, señalizados y sin obstrucción',      true),
  ('Riesgo eléctrico',           12,'Cableado sin empalmes precarios ni daños visibles',                true),
  ('Primeros auxilios e higiene',13,'Botiquín de primeros auxilios completo y vigente',                 true),
  ('Primeros auxilios e higiene',14,'Lavaojos / duchas de emergencia operativos',                       true),
  ('Primeros auxilios e higiene',15,'Baños y vestuarios en condiciones de higiene',                     false),
  ('Orden y limpieza / riesgos', 16,'Orden y limpieza general (sin obstáculos ni derrames)',            false),
  ('Orden y limpieza / riesgos', 17,'Almacenamiento seguro de productos químicos / inflamables',        true),
  ('Orden y limpieza / riesgos', 18,'Estado de pisos, escaleras y barandas',                            false),
  ('Orden y limpieza / riesgos', 19,'Sin condiciones inseguras ni actos inseguros detectados',          false)
) AS x(section, ord, label, crit)
WHERE t.code = 'SSHH';

-- ─── Responsables (resueltos vía employees → users) ───────────────
-- F-TRI-23 Limpieza: María Delgado
INSERT INTO insp_template_responsibles (template_id, user_id, role)
SELECT t.id, e.user_id, 'responsable'
  FROM insp_templates t, employees e
 WHERE t.code = 'F-TRI-23' AND e.full_name = 'María Delgado' AND e.user_id IS NOT NULL
ON CONFLICT (template_id, user_id) DO NOTHING;

-- F-TRI-20 Mantenimiento: María Delgado + Marcelo Stizza
INSERT INTO insp_template_responsibles (template_id, user_id, role)
SELECT t.id, e.user_id, 'responsable'
  FROM insp_templates t, employees e
 WHERE t.code = 'F-TRI-20'
   AND e.full_name IN ('María Delgado','Marcelo Stizza') AND e.user_id IS NOT NULL
ON CONFLICT (template_id, user_id) DO NOTHING;

-- SSHH Seguridad e Higiene: Fernando Ponzi + María Delgado
INSERT INTO insp_template_responsibles (template_id, user_id, role)
SELECT t.id, e.user_id, 'responsable'
  FROM insp_templates t, employees e
 WHERE t.code = 'SSHH'
   AND e.full_name IN ('Fernando Ponzi','María Delgado') AND e.user_id IS NOT NULL
ON CONFLICT (template_id, user_id) DO NOTHING;

-- ─── Máquinas (autoelevadores — placeholder, ajustar en /rondas/config) ──
INSERT INTO insp_machines (code, name, type, active)
VALUES
  ('AE-01','Autoelevador 01','autoelevador', true),
  ('AE-02','Autoelevador 02','autoelevador', true),
  ('AE-03','Autoelevador 03','autoelevador', true)
ON CONFLICT (code) DO NOTHING;

-- ─── Config: geofence DASSA (SIN CALIBRAR — ajustar con lectura real en el predio) ──
INSERT INTO insp_config (key, value) VALUES
  ('geofence_lat',        '-34.5430'),
  ('geofence_lng',        '-58.4880'),
  ('geofence_radius_m',   '600'),
  ('geofence_calibrated', 'false')
ON CONFLICT (key) DO NOTHING;

COMMIT;
