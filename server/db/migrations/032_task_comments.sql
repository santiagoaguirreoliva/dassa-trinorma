-- 032 — Tareas · historial de comentarios y observaciones
-- Comentarios con autor y fecha. kind distingue el comentario libre del
-- registro automático al cerrar o reabrir una tarea.

CREATE TABLE IF NOT EXISTS task_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),
  body        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'comentario'
              CHECK (kind IN ('comentario', 'cierre', 'reapertura')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task
  ON task_comments(task_id, created_at);
