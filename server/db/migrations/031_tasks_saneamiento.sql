-- 031 — Tareas · saneamiento del módulo
-- Quita un índice duplicado y pone integridad sobre la prioridad.

-- idx_tasks_assigned_status (003) es idéntico a idx_tasks_assigned (001)
DROP INDEX IF EXISTS idx_tasks_assigned_status;

-- Prioridad: normalizar valores fuera de rango y restringir a los 4 válidos
UPDATE tasks SET priority = 'media'
 WHERE priority IS NULL OR priority NOT IN ('baja', 'media', 'alta', 'urgente');

ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'media';
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_chk;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_chk
  CHECK (priority IN ('baja', 'media', 'alta', 'urgente'));
