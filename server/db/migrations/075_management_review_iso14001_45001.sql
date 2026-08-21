-- 075 · Revisión por la Dirección — entradas y salidas propias de ISO 14001 y 45001
-- El acta (migr 058) cubría las entradas de ISO 9001 9.3.2 a)-f). Las normas ambiental
-- y de SST piden entradas y salidas adicionales que no tenían campo, así que la Dirección
-- no podía dejarlas registradas (pedido de Nixa Méndez, 18 y 21/08/2026, sobre el
-- F-TRI-05 Acta de Revisión del Sistema por la Dirección).
-- Todo aditivo y nullable: las actas ya cargadas siguen igual.

-- Entradas adicionales (14001 9.3.2 / 45001 9.3)
ALTER TABLE management_reviews
  ADD COLUMN IF NOT EXISTS env_aspects_summary        text,  -- aspectos ambientales significativos
  ADD COLUMN IF NOT EXISTS lifecycle_summary          text,  -- etapas del ciclo de vida consideradas
  ADD COLUMN IF NOT EXISTS sst_hazards_summary        text,  -- peligros y evaluación de riesgos de SST
  ADD COLUMN IF NOT EXISTS policy_review              text,  -- adecuación y comunicación de la Política del SGI
  ADD COLUMN IF NOT EXISTS incidents_summary          text,  -- incidentes, accidentes y enfermedades profesionales
  ADD COLUMN IF NOT EXISTS consultation_participation text,  -- consulta y participación de los trabajadores (comité mixto)
  ADD COLUMN IF NOT EXISTS env_sst_objectives         text;  -- grado de logro de los objetivos ambientales y de SST

-- Salidas adicionales (14001 9.3 / 45001 9.3)
ALTER TABLE management_reviews
  ADD COLUMN IF NOT EXISTS conclusions_suitability   text,  -- conveniencia, adecuación y eficacia continuas del SGI
  ADD COLUMN IF NOT EXISTS improvement_decisions     text,  -- decisiones sobre oportunidades de mejora continua
  ADD COLUMN IF NOT EXISTS change_needs_resources    text,  -- necesidad de cambio en el SGI, incluidos los recursos
  ADD COLUMN IF NOT EXISTS unmet_objectives_actions  text,  -- acciones cuando no se lograron los objetivos amb. y SST
  ADD COLUMN IF NOT EXISTS integration_opportunities text,  -- integración del SGI a otros procesos de negocio
  ADD COLUMN IF NOT EXISTS strategic_implications    text;  -- implicaciones para la dirección estratégica
