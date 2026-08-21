-- 079 · Objetivos — campos del F-TRI-04 y baja lógica
-- La planilla F-TRI-04 tiene columnas que el modelo no guardaba: acciones
-- asociadas, recursos e ítem a medir. Sin ellas la app no puede mostrar el
-- formulario completo que el auditor compara contra la planilla.
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS acciones_asociadas text,   -- col. ACCIONES ASOCIADAS
  ADD COLUMN IF NOT EXISTS recursos           text,   -- col. Recursos
  ADD COLUMN IF NOT EXISTS plazo_frecuencia   text,   -- col. Plazo/Frec.
  ADD COLUMN IF NOT EXISTS acciones_si_no_llega text, -- col. Acciones a tomar si no se llega (F-TRI-04 2025)
  ADD COLUMN IF NOT EXISTS deleted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason     text;

-- El "Ítem a medir" es qué se mide concretamente; `formula` guarda el cálculo.
ALTER TABLE objective_indicators
  ADD COLUMN IF NOT EXISTS item_medido text;

CREATE INDEX IF NOT EXISTS idx_objectives_vivos ON objectives(year)
  WHERE deleted_at IS NULL;
