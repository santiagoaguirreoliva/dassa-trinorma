-- 080 · Objetivos — columna "Cumplim." del F-TRI-04
-- Última columna de la planilla que no tenía campo. Es la valoración escrita del
-- período (OK / parcial / observación), distinta de `status`, que es el estado
-- del objetivo dentro de la app.
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS cumplimiento_nota text;
