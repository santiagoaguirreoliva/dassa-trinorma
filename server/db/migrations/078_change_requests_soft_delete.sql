-- 078 · Gestión de cambios (F-TRI-14) — baja lógica
-- La tabla no tenía forma de dar de baja un registro sin borrarlo. Al revisar la
-- cartera 2026 aparecieron ítems que no son cambios ni proyectos sino objetivos
-- con su indicador: tres nacieron declarándolo en el propio propósito ("Proyecto
-- agregado para cubrir los objetivos...") y dos son metas de KPI. Su lugar es
-- /objetivos, no el registro de gestión de cambios.
-- Se ocultan, no se borran: el registro y sus ítems se conservan por si el
-- auditor pregunta, y volver atrás es un UPDATE.
ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS deleted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS idx_change_requests_vivos ON change_requests(year)
  WHERE deleted_at IS NULL;
