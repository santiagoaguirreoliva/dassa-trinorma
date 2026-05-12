-- =============================================================================
-- MIGRACIÓN 025+026: task_number único + multi-responsable
-- =============================================================================

-- ── 025: task_number ─────────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS task_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION next_task_number() RETURNS TEXT AS $$
BEGIN
  RETURN '#T-' || LPAD(nextval('task_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_assign_task_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_number IS NULL THEN
    NEW.task_number := next_task_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_assign_number ON tasks;
CREATE TRIGGER tasks_assign_number BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_assign_task_number();

-- Backfill numeración para las 36 existentes (cronológico)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM tasks WHERE task_number IS NULL
)
UPDATE tasks t SET task_number = '#T-' || LPAD(o.rn::text, 4, '0')
FROM ordered o WHERE t.id = o.id;

-- Avanzar la sequence al siguiente número libre
SELECT setval('task_number_seq', COALESCE((SELECT MAX(SUBSTRING(task_number FROM 4)::int) FROM tasks WHERE task_number ~ '^#T-[0-9]+$'), 0));

-- ── 026: task_assignees ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'principal' CHECK (role IN ('principal','colaborador')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes      TEXT,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

COMMENT ON TABLE task_assignees IS 'Multi-responsable de tareas. Una tarea puede tener varios responsables principal+colaboradores. Cada uno marca su parte como completada.';

-- Backfill: pasar assigned_to + collaborator_id de tabla `tasks` a `task_assignees`
INSERT INTO task_assignees (task_id, user_id, role, assigned_at)
SELECT id, assigned_to, 'principal', COALESCE(created_at, NOW())
FROM tasks WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

INSERT INTO task_assignees (task_id, user_id, role, assigned_at)
SELECT id, collaborator_id, 'colaborador', COALESCE(created_at, NOW())
FROM tasks WHERE collaborator_id IS NOT NULL AND collaborator_id != COALESCE(assigned_to, '00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Verificar
SELECT 'Tasks numeradas:' AS info, COUNT(*) FROM tasks WHERE task_number IS NOT NULL;
SELECT 'Asignaciones migradas:' AS info, COUNT(*) FROM task_assignees;
SELECT 'Próximo #:' AS info, next_task_number();
