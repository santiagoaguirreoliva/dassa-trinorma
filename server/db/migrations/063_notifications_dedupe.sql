-- 063 · Dedup de notificaciones del wake-up de TRINY (ai-quality.cjs · generateWakeUpAlerts)
-- El job wakeup corre cada 6h e inserta con `ON CONFLICT DO NOTHING`, pero `notifications`
-- sólo tenía PK sobre `id` (uuid autogenerado) → el conflicto NUNCA ocurría → 4 duplicados/día
-- por cada condición persistente (review ociosa / riesgo sin acción / requisito legal / objetivo).
--
-- Fix: índice único PARCIAL que identifica una notificación wakeup duplicada por
-- (user_id, title, source_module). Es PARCIAL sobre los 4 source_module que usa SÓLO el
-- wakeup ('reviews','risks','legal','objectives'); verificado que ningún otro
-- `INSERT INTO notifications` del código usa esos módulos (findings/tasks/committee/
-- trainings/purchases/access/checklist usan otros valores), así que no rompe inserciones
-- legítimas que sí deben permitir repetidos.
--
-- El INSERT del wakeup se ajusta a `ON CONFLICT (user_id, title, source_module) DO NOTHING`
-- para nombrar este índice explícitamente (ver server/services/ai-quality.cjs).

-- Pre-limpieza: la BD ya acumuló duplicados por el bug (hasta 4/día por condición).
-- Antes de crear el índice único, colapsamos cada grupo (user_id, title, source_module)
-- a su fila MÁS RECIENTE. Sólo toca los 4 source_module del wakeup — notificaciones
-- transitorias, seguro descartar las viejas repetidas.
DELETE FROM notifications n
 USING notifications keep
 WHERE n.source_module IN ('reviews', 'risks', 'legal', 'objectives')
   AND keep.source_module = n.source_module
   AND keep.user_id = n.user_id
   AND keep.title = n.title
   AND (keep.created_at, keep.id) > (n.created_at, n.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_wakeup_dedupe
  ON notifications (user_id, title, source_module)
  WHERE source_module IN ('reviews', 'risks', 'legal', 'objectives');
