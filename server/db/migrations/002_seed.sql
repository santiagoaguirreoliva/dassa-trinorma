-- ============================================================
-- DASSA SGI — Seed Data (datos reales)
-- Ejecutar DESPUÉS del schema
-- ============================================================

-- ─── USUARIOS INICIALES ──────────────────────────────────────
-- Contraseña por defecto: Dassa2026! (cambiar en primer login)
-- Hash de 'Dassa2026!' con bcrypt rounds=10
INSERT INTO users (email, password_hash, full_name, role, position, department) VALUES
('santiago@dassa.com.ar', '$2a$10$placeholder_hash_change_me', 'Santiago Aguirre Oliva', 'master_admin',       'Director General',       'Dirección'),
('manuel@dassa.com.ar',   '$2a$10$placeholder_hash_change_me', 'Manuel De La Arena',     'sgi_leader',         'Responsable SGI',        'Calidad'),
('maria@dassa.com.ar',    '$2a$10$placeholder_hash_change_me', 'María Del Carmen',       'rrhh',               'Responsable RRHH',       'RRHH'),
('fernando@dassa.com.ar', '$2a$10$placeholder_hash_change_me', 'Fernando Ponzi',         'seguridad_higiene',  'Resp. Seg. e Higiene',   'HSE'),
('christian@dassa.com.ar','$2a$10$placeholder_hash_change_me', 'Christian Carrasco',     'operaciones',        'Responsable Operaciones','Operaciones'),
('nixa@nixa.com.ar',      '$2a$10$placeholder_hash_change_me', 'NIXA Consultora',        'auditor_externo',    'Auditora Externa',       'Externo');

-- ─── SISTEMA DE GESTIÓN ──────────────────────────────────────
INSERT INTO system_content (section, title, content) VALUES
('mision', 'Misión', 'Garantizar la excelencia operativa en la gestión de depósito fiscal, proporcionando soluciones de almacenaje seguras, eficientes y responsables dentro de la cadena de comercio exterior, con el más alto estándar de calidad, seguridad y cuidado ambiental.'),
('vision', 'Visión', 'Ser el depósito fiscal líder en Argentina, reconocido por la innovación tecnológica, el compromiso ambiental y la excelencia en el servicio al cliente, consolidando nuestra posición como socio estratégico en el comercio exterior.'),
('valores', 'Valores', 'Integridad · Seguridad · Innovación · Compromiso Ambiental · Excelencia en el Servicio · Trabajo en Equipo · Responsabilidad'),
('politica_calidad', 'Política de Calidad', 'DASSA se compromete a brindar servicios de depósito fiscal con los más altos estándares de calidad, garantizando la satisfacción de nuestros clientes y el cumplimiento de todos los requisitos legales y normativos aplicables, en el marco de la mejora continua de nuestro Sistema de Gestión Integrado.'),
('politica_ambiental', 'Política Ambiental', 'DASSA se compromete a gestionar sus operaciones minimizando el impacto ambiental, cumpliendo con la legislación vigente, previniendo la contaminación y promoviendo el uso responsable de los recursos naturales, en el marco del Sistema de Gestión Ambiental ISO 14001.'),
('politica_sst', 'Política de Seguridad y Salud', 'DASSA se compromete a proteger la salud y seguridad de todos sus trabajadores, contratistas y visitantes, identificando y controlando los peligros y riesgos asociados a sus operaciones, promoviendo una cultura de seguridad y cumpliendo con la normativa vigente, en el marco del Sistema de Gestión ISO 45001.');

-- ─── MATRIZ DE RIESGOS (datos reales F-TRI-42) ───────────────
INSERT INTO risks (code, activity, hazard, risk_factor, activity_type, impact, probability, severity, legal_req, current_controls, control_status) VALUES
('R-001', 'TODAS LAS ÁREAS', 'CAIDAS A NIVEL', 'RIESGO FISICO', 'R', 'LESIÓN', 1, 3, true, 'Señalización de pisos, sendas peatonales, escaleras. Auditorías mensuales SST. Orden y limpieza.', 4),
('R-002', 'TODAS LAS ÁREAS', 'ELECTROCUCIÓN', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Mediciones anuales puesta a tierra y continuidad. Mantenimiento instalaciones eléctricas.', 2),
('R-003', 'TODAS LAS ÁREAS', 'ACCIDENTE IN-ITINERE', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 1, 5, true, 'Plan de capacitación sobre riesgos in itinere. Buenas prácticas viales.', 4),
('R-004', 'TODAS LAS ÁREAS', 'SOBRECARGA DE TRABAJO', 'RIESGO PSICOFISICO', 'R', 'STRESS', 1, 2, true, 'Valores empresariales comunicados. Cuidado de las personas como valor fundamental.', 4),
('R-005', 'TODAS LAS ÁREAS', 'BULLYING, VICTIMIZACIÓN E INTIMIDACIÓN', 'RIESGO PSICOFISICO', 'R', 'STRESS / RENUNCIA', 2, 2, false, 'Valores empresariales con comportamiento ético. Políticas de igualdad de condiciones.', 4),
('R-006', 'TODAS LAS ÁREAS', 'MANTENIMIENTO DEFICIENTE INFRAESTRUCTURA Y MÁQUINAS', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Mantenimiento preventivo containera y autoelevadores. Auditorías mensuales SST.', 2),
('R-007', 'TODAS LAS ÁREAS', 'DISEÑO ERGONÓMICO INAPROPIADO', 'RIESGO FISICO', 'R', 'ENFERMEDAD PROFESIONAL', 4, 3, true, 'Estudio ergonómico. Capacitación levantamiento manual de cargas. EPP según actividad.', 2),
('R-008', 'TODAS LAS ÁREAS', 'INCENDIO PARCIAL O TOTAL', 'RIESGO FISICO', 'EMERGENCIA', 'LESIÓN-MUERTE-DAÑO PSICOLÓGICO', 2, 5, true, 'Estudio anual carga de fuego. Plan evacuación. Brigada. Matafuegos. Simulacro anual.', 2),
('R-009', 'TODAS LAS ÁREAS', 'DERRUMBE PARCIAL O TOTAL', 'RIESGO FISICO', 'EMERGENCIA', 'LESIÓN-MUERTE-DAÑO PSICOLÓGICO', 2, 5, true, 'Mantenimiento preventivo edilicio. Plan de evacuación actualizado.', 2),
('R-010', 'TODAS LAS ÁREAS', 'ROBO DE MERCADERÍA EN INSTALACIONES', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE-DAÑO PSICOLÓGICO', 3, 5, false, 'Seguridad armada 24hs. 80 cámaras monitoreo 24hs. Iluminación automática.', 4),
('R-011', 'TODAS LAS ÁREAS', 'FUMADORES - TABACO - CIGARRILLO', 'RIESGO FISICO', 'R', 'ENFERMEDADES RESPIRATORIAS', 1, 4, true, 'Charlas y cartelería de concientización.', 4),
('R-012', 'ENTRADA Y SALIDA DE CAMIONES', 'ATROPELLAMIENTO POR CIRCULACIÓN DE VEHÍCULOS', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Semáforos con alarma sonora en portones de entrada y salida de vehículos.', 3),
('R-013', 'CARGA/DESCARGA CONTENEDORES - AUTOELEVADOR', 'CAÍDA DE OBJETOS EN ALTURA', 'RIESGO FISICO', 'R', 'LESIÓN', 2, 5, true, 'Verificación de palletizado correcto. Capacitación manejo autoelevadores Res. 960/2015.', 4),
('R-014', 'CARGA/DESCARGA CONTENEDORES - AUTOELEVADOR', 'ATROPELLAMIENTO DE PERSONA', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Capacitación manejo autoelevadores según Res. 960/2015.', 4),
('R-015', 'CARGA/DESCARGA CONTENEDORES - AUTOELEVADOR', 'VUELCO DEL AUTOELEVADOR', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Capacitación manejo autoelevadores según Res. 960/2015.', 4),
('R-016', 'MOVIMIENTO DE CONTENEDORES - CONTAINERA KALMAR', 'CAÍDA DE OBJETOS EN ALTURA', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Operadores con credencial habilitante. Señalización zona de circulación.', 4),
('R-017', 'MOVIMIENTO DE CONTENEDORES - CONTAINERA KALMAR', 'ATROPELLAMIENTO DE PERSONA', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Operadores con credencial habilitante. Señalización zona de circulación.', 4),
('R-018', 'MOVIMIENTO DE CONTENEDORES - CONTAINERA KALMAR', 'VUELCO DE LA CONTAINERA', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Operadores con credencial habilitante. Capacitación específica.', 4),
('R-019', 'CONDUCCIÓN DE AUTOELEVADOR', 'EXPOSICIÓN A RUIDO', 'RIESGO FISICO', 'R', 'LESIÓN - ENFERMEDAD PROFESIONAL', 3, 3, true, 'Capacitación personal. Entrega y uso de EPP auditivos. Medición periódica niveles de ruido.', 2),
('R-020', 'CONTROL DE BULTOS - EQUIPO RAYOS X', 'EXPOSICIÓN A RAYOS X', 'RIESGO FISICO', 'R', 'LESIONES Y ENFERMEDADES', 3, 4, true, 'Capacitar personal operador. Capacitar personal DASSA. Dosimetría periódica.', 2),
('R-021', 'MANIPULACIÓN Y ALMACENAMIENTO MERCADERÍA IMO', 'CAÍDA DE OBJETOS', 'RIESGO FISICO', 'R', 'LESIÓN-ENFERMEDAD-MUERTE', 3, 5, true, 'Habilitación para almacenamiento mercadería peligrosa. Procedimiento IMO. Señalización.', 3),
('R-022', 'MANIPULACIÓN Y ALMACENAMIENTO MERCADERÍA IMO', 'INTOXICACIÓN POR DERRAME', 'RIESGO QUIMICO', 'R', 'LESIÓN-ENFERMEDAD-MUERTE', 3, 5, true, 'Habilitación ADR. Kit de derrames. Brigada entrenada. Procedimiento emergencia química.', 3),
('R-023', 'MANIPULACIÓN Y ALMACENAMIENTO MERCADERÍA IMO', 'DERRAME DE SUSTANCIA PELIGROSA', 'RIESGO QUIMICO', 'R', 'LESIÓN-ENFERMEDAD-MUERTE', 3, 5, true, 'Habilitación ADR. Kit de derrames. Brigadistas. Hoja de seguridad por producto.', 3),
('R-024', 'MANIPULACIÓN Y ALMACENAMIENTO MERCADERÍA IMO', 'INCENDIO POR MERCADERÍA PELIGROSA', 'RIESGO FISICO', 'R', 'LESIÓN-ENFERMEDAD-MUERTE', 3, 5, true, 'Habilitación ADR. Matafuegos específicos. Plan emergencia. Separación por clase IMO.', 3),
('R-025', 'CAMBIO DE GARRAFA EN AUTOELEVADORES', 'EXPLOSIÓN', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Capacitación manipulación y cambio de garrafa. Almacenamiento adecuado. EPP.', 2),
('R-026', 'UTILIZACIÓN DE MONTACARGA', 'ATRAPAMIENTOS', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Cumplimiento legislación vigente. Mantenimiento por empresa habilitada.', 2),
('R-027', 'TAREAS DE MANTENIMIENTO EN ALTURA', 'CAÍDA EN ALTURA DE PERSONA', 'RIESGO FISICO', 'NR', 'LESIÓN-MUERTE', 2, 5, true, 'Arnés de seguridad obligatorio. Líneas de vida. Capacitación trabajo en altura.', 2),
('R-028', 'CIRCULACIÓN DE CAMIONES EN VÍA PÚBLICA', 'ACCIDENTE VIAL', 'RIESGO FISICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Solicitar VTVs. Control de seguros y licencias. Inducción conductores.', 2),
('R-029', 'TRANSPORTE DE MERCADERÍA IMO', 'DERRAME EN VÍA PÚBLICA', 'RIESGO QUIMICO', 'R', 'LESIÓN-MUERTE', 2, 5, true, 'Transportista habilitado ADR. Documentación DG. Plan emergencia transporte.', 2),
('R-030', 'EVENTO CLIMATOLÓGICO', 'GOLPES Y CAÍDA DE OBJETOS', 'RIESGO FISICO', 'NR', 'LESIÓN', 2, 4, false, 'Mantenimiento preventivo edilicio. Plan de evacuación. Recorridas periódicas seguridad.', 3);

-- ─── REQUISITOS LEGALES ──────────────────────────────────────
INSERT INTO legal_requirements (code, title, category, issuing_authority, applicable_area, expiration_date, alert_days_before) VALUES
('RL-001', 'Habilitación Municipal — Actividad Industrial',     'Municipal',   'Municipio de Avellaneda',           'General',          '2026-06-30', 90),
('RL-002', 'Certificado de Aptitud Ambiental (CAA)',            'Provincial',  'OPDS / Min. Ambiente PBA',          'Ambiente',         '2026-03-31', 90),
('RL-003', 'Registro SENASA — Depósito Fiscal',                 'Nacional',    'SENASA',                            'Comercio Exterior','2026-12-15', 60),
('RL-004', 'Homologación ADR — Transporte Cargas Peligrosas',   'Nacional',    'RENATRE / Secretaría Transporte',   'Seguridad / DG',   '2026-05-01', 90),
('RL-005', 'Inscripción Registro Industrial (Ley 11459 PBA)',   'Provincial',  'Min. Producción PBA',               'General',          '2027-01-01', 60),
('RL-006', 'ART — Cobertura por Accidentes de Trabajo',        'Nacional',    'SRT / ART contratada',              'RRHH',             '2026-08-01', 90),
('RL-007', 'Programa Vigilancia de la Salud (Exámenes Médicos)','Nacional',   'SRT',                               'RRHH / Seguridad', NULL,         60),
('RL-008', 'Plan de Gestión de Residuos Peligrosos',            'Provincial',  'OPDS',                              'Ambiente',         '2026-10-31', 90),
('RL-009', 'Habilitación Depósito Fiscal — AFIP/ADUANA',       'Nacional',    'AFIP / Aduana Argentina',           'Comercio Exterior', '2027-03-01', 120),
('RL-010', 'Seguro de Incendio — Edificio y Contenido',        'Privado',     'Federación Patronal',               'General',          '2026-09-15', 60);

-- ─── PARTES INTERESADAS ──────────────────────────────────────
INSERT INTO stakeholders (name, stakeholder_type, category, needs_expectations, influence_level) VALUES
('Aduana Argentina / AFIP',          'externo', 'Regulador',  'Cumplimiento normativo depósito fiscal, documentación en orden', 'alto'),
('Navieras (MAERSK, MSC, CMA-CGM)', 'externo', 'Cliente',    'Custodia correcta de carga, tiempos de entrega, sin daños',       'alto'),
('Agentes de Carga / Despachantes',  'externo', 'Cliente',    'Respuesta rápida, información precisa de stock, tarifas',         'alto'),
('ART — Aseguradora Riesgos Trabajo','externo', 'Regulador',  'Programa SST vigente, estadísticas de siniestralidad bajas',      'medio'),
('OPDS — Org. Provincial Des. Sust.','externo', 'Regulador',  'Gestión ambiental conforme, informes periódicos, CAA vigente',    'alto'),
('Proveedores de Servicios Logísticos','externo','Proveedor', 'Pago en término, continuidad del contrato',                       'medio'),
('Personal Operativo DASSA',          'interno', 'Empleados', 'Ambiente seguro, capacitación, equidad y reconocimiento',         'alto'),
('Dirección / Socios DASSA',          'interno', 'Accionistas','Rentabilidad, cumplimiento legal, crecimiento sostenido',         'alto'),
('Vecinos / Comunidad Avellaneda',    'externo', 'Comunidad', 'Ausencia de ruidos, olores, impacto ambiental',                   'bajo'),
('Municipio de Avellaneda',           'externo', 'Regulador', 'Cumplimiento habilitaciones, pago de tasas, buena vecindad',      'medio'),
('Sindicato de Trabajadores',         'interno', 'Empleados', 'Condiciones laborales dignas, seguridad, representación',         'medio');

-- ─── ANÁLISIS FODA ───────────────────────────────────────────
INSERT INTO context_analysis (foda_type, category, description, order_index) VALUES
-- Fortalezas
('fortaleza','interno','Habilitación como Depósito Fiscal bajo control AFIP — barrera de entrada regulatoria alta',1),
('fortaleza','interno','Más de 10 años de trayectoria y reputación en logística de comercio exterior',2),
('fortaleza','interno','Infraestructura propia con capacidad para contenedores, carga general y mercadería IMO',3),
('fortaleza','interno','Equipo especializado en manejo de cargas peligrosas (DG) con certificación ADR',4),
('fortaleza','interno','Sistema MAGAYA integrado para trazabilidad de mercadería y gestión operativa',5),
('fortaleza','interno','Certificación Trinorma en proceso (ISO 9001, 14001, 45001) — diferenciación competitiva',6),
-- Debilidades
('debilidad','interno','Procesos documentados pero no completamente digitalizados — dependencia de papel',1),
('debilidad','interno','Alta rotación en personal operativo — pérdida de know-how y experiencia',2),
('debilidad','interno','Capacidad de almacenamiento limitada en temporadas pico',3),
('debilidad','interno','Maquinaria con antigüedad promedio >8 años — mayor riesgo de fallo y mantenimiento',4),
-- Oportunidades
('oportunidad','externo','Crecimiento del comercio electrónico y demanda de logística de última milla',1),
('oportunidad','externo','Expansión con nuevas navieras que buscan depósitos certificados Trinorma',2),
('oportunidad','externo','Digitalización del comercio exterior — sinergias con AFIP/VUCE y nuevos sistemas',3),
('oportunidad','externo','Posibilidad de ampliar servicios: gestión de trámites aduaneros, last mile, etc.',4),
-- Amenazas
('amenaza','externo','Inestabilidad macroeconómica argentina — impacto en volumen de importaciones/exportaciones',1),
('amenaza','externo','Cambios normativos frecuentes en legislación aduanera, ambiental y laboral',2),
('amenaza','externo','Competencia de depósitos fiscales de mayor escala con precios más agresivos',3),
('amenaza','externo','Riesgo de pérdida de habilitación ante incumplimientos regulatorios',4);

-- ─── CARPETAS DE DOCUMENTOS ──────────────────────────────────
INSERT INTO document_folders (name, description, icon, order_index) VALUES
('Procedimientos',    'Procedimientos del SGI Trinorma',    'FileText', 1),
('Instrucciones',     'Instrucciones de trabajo',           'BookOpen', 2),
('Registros',         'Registros y formularios',            'ClipboardList', 3),
('Manuales',          'Manuales del sistema',               'Book', 4),
('ISO 9001',          'Documentos específicos calidad',     'Award', 5),
('ISO 14001',         'Documentos ambientales',             'Leaf', 6),
('ISO 45001',         'Documentos seguridad y salud',       'Shield', 7);
