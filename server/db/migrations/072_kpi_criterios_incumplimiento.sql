-- 072: Auditoría interna 05/08/2026 — criterios de actuación ante incumplimiento
-- de meta mensual de KPIs de Objetivos (ISO 9001 6.2 / 9.1).
-- Escalera: 1 mes bajo nivel aceptable → aviso · 2 meses → alerta + plan de acción
-- · 3 meses consecutivos → NC automática al responsable del área.

ALTER TABLE objective_indicators
  ADD COLUMN IF NOT EXISTS admissible_value numeric,
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'mayor'
    CHECK (direction IN ('mayor','menor'));

COMMENT ON COLUMN objective_indicators.admissible_value IS
  'Nivel aceptable mensual. NULL = 90% de target_value (dirección mayor) o 110% (dirección menor).';
COMMENT ON COLUMN objective_indicators.direction IS
  'mayor = cumplir es estar por encima de la meta; menor = por debajo (ej. tiempos).';

-- KPIs donde "menos es mejor"
UPDATE objective_indicators SET direction = 'menor'
WHERE indicator_name ILIKE '%desconsolidaci%';

-- Registro auditable de incumplimientos y acciones tomadas (evidencia ISO 9.1)
CREATE TABLE IF NOT EXISTS kpi_breach_log (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicator_id uuid NOT NULL REFERENCES objective_indicators(id) ON DELETE CASCADE,
  period       date NOT NULL,               -- mes evaluado (día 1)
  value        numeric NOT NULL,
  target       numeric NOT NULL,
  admissible   numeric NOT NULL,
  streak       integer NOT NULL,            -- meses consecutivos incumplidos
  action       text NOT NULL CHECK (action IN ('aviso','alerta_plan_accion','nc_automatica','nc_ya_abierta')),
  finding_id   uuid REFERENCES findings(id),
  mailed_to    text[],
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (indicator_id, period)
);
