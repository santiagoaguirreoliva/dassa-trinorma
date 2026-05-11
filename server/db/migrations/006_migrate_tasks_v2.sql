-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN: Módulo de Tareas y Mejoras Pendientes v2
-- DASSA SGI Trinorma — Abril 2026
-- ═══════════════════════════════════════════════════════════

-- 1. Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS iso_norm TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'manual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS origin_detail TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS observations TEXT;

-- 2. Create index for collaborator queries
CREATE INDEX IF NOT EXISTS idx_tasks_collaborator ON tasks(collaborator_id) WHERE collaborator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_origin ON tasks(origin_type);
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status) WHERE status NOT IN ('completada', 'cancelada');

-- 3. Add CHECK constraint for valid values (flexible, allows future additions)
-- No hard constraint on category/iso_norm to keep it flexible

-- Done
SELECT 'Migration tasks_v2 completed successfully' AS result;
