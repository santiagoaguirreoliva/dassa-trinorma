-- ============================================================
-- DASSA TRINORMA MANAGER — Datos Iniciales (Seed)
-- Ejecutar DESPUÉS del schema (002)
-- ============================================================

-- ─── RIESGOS INICIALES (ISO 45001 + 14001) ──────────────────
INSERT INTO risks (code, hazard_aspect, risk_impact, probability, severity, detection, risk_type, process_area, control_description, potential_cause) VALUES
('R-001', 'Derrame de sustancias peligrosas (DG)', 'Contaminación suelo/agua, daño personas', 2, 4, 2, 'riesgo', 'Almacenamiento DG', 'Kit de derrames, procedimiento P-SEG-001, señalización ADR', 'Rotura de envase, manipulación incorrecta'),
('R-002', 'Accidente con autoelevador', 'Lesiones graves a operarios o visitas', 3, 3, 2, 'riesgo', 'Patio / Interior Depósito', 'Licencias habilitantes, señalización de tránsito, velocidad máxima 10 km/h', 'Exceso de velocidad, falta de visibilidad, piso mojado'),
('R-003', 'Incendio en depósito', 'Pérdida total de mercadería, daño a personas', 1, 4, 2, 'riesgo', 'General', 'Matafuegos homologados, red de hidrantes, plan de evacuación', 'Cortocircuito, mercadería inflamable no declarada'),
('R-004', 'Caída de altura en estructura/mezzanine', 'Lesiones graves', 2, 3, 3, 'riesgo', 'Mezzanine / Estructura', 'Arnés obligatorio, líneas de vida, inspección mensual', 'Falta de EPP, protecciones perimetrales deficientes'),
('R-005', 'Contaminación de suelo por efluentes', 'Daño ambiental, sanción regulatoria', 1, 3, 2, 'riesgo', 'Patio exterior', 'Separadores de hidrocarburos, inspección trimestral', 'Pérdida de fluidos en autoelevadores, agua de lluvia con residuos'),
('R-006', 'Exposición a ruido excesivo (autoelevadores/generadores)', 'Daño auditivo crónico', 2, 2, 3, 'riesgo', 'Patio / Interior', 'Protectores auditivos, medicación periódica de ruido', 'Operación prolongada sin EPP'),
('R-007', 'Accidente vial en ingreso/egreso de camiones', 'Lesiones a conductores o peatones', 2, 3, 2, 'riesgo', 'Portería / Acceso', 'Procedimiento de portería P-OP-001, semáforo de acceso', 'Falta de coordinación, baja visibilidad nocturna'),
('R-008', 'Falta de habilitación o certificados vencidos', 'Sanción ADUANA, pérdida de habilitación fiscal', 2, 4, 1, 'riesgo', 'Legal / Cumplimiento', 'Registro de vencimientos, alerta automática 60 días antes', 'Falta de seguimiento, cambios normativos no detectados');

-- ─── REQUISITOS LEGALES INICIALES ──────────────────────────

INSERT INTO legal_requirements (code, title, category, issuing_authority, applicable_area, expiration_date, is_active) VALUES
('RL-001', 'Habilitación Municipal — Actividad Industrial', 'Municipal', 'Municipio de Avellaneda', 'General', '2026-06-30', true),
('RL-002', 'Certificado de Aptitud Ambiental (CAA)', 'Provincial', 'OPDS / Min. Ambiente PBA', 'Ambiente', '2026-03-31', true),
('RL-003', 'Registro SENASA — Depósito Fiscal', 'Nacional', 'SENASA', 'Comercio Exterior', '2026-12-15', true),
('RL-004', 'Homologación ADR — Cargas Peligrosas', 'Nacional', 'RENATRE / Secretaría Transporte', 'Seguridad / DG', '2026-05-01', true),
('RL-005', 'Inscripción Registro Industrial (Ley 11459 PBA)', 'Provincial', 'Ministerio Producción PBA', 'General', '2027-01-01', true),
('RL-006', 'ART — Cobertura por Accidentes de Trabajo', 'Nacional', 'SRT / ART contratada', 'RRHH', '2026-08-01', true),
('RL-007', 'Programa de Vigilancia de la Salud (Exámenes Médicos)', 'Nacional', 'SRT', 'RRHH / Seguridad', NULL, true),
('RL-008', 'Plan de Gestión de Residuos Peligrosos', 'Provincial', 'OPDS', 'Ambiente', '2026-10-31', true);

-- ─── PARTES INTERESADAS ──────────────────────────────────────
INSERT INTO stakeholders (name, type, category, needs_expectations, influence_level) VALUES
('Aduana Argentina / AFIP', 'externo', 'Regulador', 'Cumplimiento normativo de depósito fiscal, documentación en orden', 'alto'),
('Navieras (MAERSK, MSC, CMA-CGM)', 'externo', 'Cliente', 'Custodia correcta de carga, tiempos de entrega, sin daños', 'alto'),
('Agentes de Carga / Despachantes', 'externo', 'Cliente', 'Respuesta rápida, información precisa de stock, tarifas competitivas', 'alto'),
('ART (Aseguradora Riesgos Trabajo)', 'externo', 'Regulador', 'Programa de SST vigente, estadísticas de siniestralidad', 'medio'),
('OPDS (Org. Provincial Desarrollo Sustentable)', 'externo', 'Regulador', 'Gestión ambiental conforme, informes periódicos', 'alto'),
('Proveedores de Servicios Logísticos', 'externo', 'Proveedor', 'Pago en término, continuidad del contrato', 'medio'),
('Personal Operativo DASSA', 'interno', 'Empleados', 'Ambiente seguro, capacitación, equidad y reconocimiento', 'alto'),
('Dirección / Socios DASSA', 'interno', 'Accionistas', 'Rentabilidad, cumplimiento legal, crecimiento sostenido', 'alto'),
('Vecinos / Comunidad Avellaneda', 'externo', 'Comunidad', 'Ausencia de ruidos, olores, impacto ambiental', 'bajo'),
('Municipio de Avellaneda', 'externo', 'Regulador', 'Cumplimiento habilitaciones, pago de tasas', 'medio');

-- ─── ANÁLISIS DE CONTEXTO (FODA) ────────────────────────────
INSERT INTO context_analysis (type, category, description, order_index) VALUES
-- Fortalezas
('strength', 'internal', 'Habilitación como Depósito Fiscal bajo control de AFIP — barrera de entrada regulatoria alta', 1),
('strength', 'internal', '10 años de trayectoria y reputación en el sector logístico de comercio exterior', 2),
('strength', 'internal', 'Infraestructura propia con capacidad para contenedores y carga general', 3),
('strength', 'internal', 'Equipo especializado en manejo de cargas peligrosas (DG) con certificaciones ADR', 4),
('strength', 'internal', 'Sistema MAGAYA integrado para trazabilidad de mercadería', 5),
-- Debilidades
('weakness', 'internal', 'Procesos documentados pero no digitalizados — dependencia de papel y planillas Excel', 1),
('weakness', 'internal', 'Alta rotación en personal operativo — pérdida de know-how', 2),
('weakness', 'internal', 'Capacidad de almacenamiento limitada en temporadas pico', 3),
('weakness', 'internal', 'Maquinaria con antigüedad promedio >8 años — mayor riesgo de fallo', 4),
-- Oportunidades
('opportunity', 'external', 'Crecimiento sostenido del comercio electrónico y demanda de logística de última milla', 1),
('opportunity', 'external', 'Expansión de operaciones con nuevas navieras (MSC, COSCO) que buscan depósitos certificados', 2),
('opportunity', 'external', 'Digitalización del comercio exterior — sinergias con sistemas AFIP/VUCE', 3),
('opportunity', 'external', 'Certificación Trinorma como ventaja competitiva diferencial frente a competidores no certificados', 4),
-- Amenazas
('threat', 'external', 'Inestabilidad macroeconómica argentina — impacto en volumen de importaciones/exportaciones', 1),
('threat', 'external', 'Cambios normativos frecuentes en legislación aduanera y ambiental', 2),
('threat', 'external', 'Competencia de depósitos fiscales de mayor escala con precios más bajos', 3),
('threat', 'external', 'Riesgo de pérdida de habilitación ante incumplimientos regulatorios', 4);
