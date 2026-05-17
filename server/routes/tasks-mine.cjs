// =============================================================================
// DASSA SGI — Tasks: endpoints para "mis pendientes"
// Reusa la tabla `tasks` existente
// Se monta en: app.use('/api/tasks', tasksMineRouter)
// =============================================================================
const express = require('express');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// Middleware auth (inline porque es CJS y el principal es ESM)
function authenticate(req, res, next) {
  const h = req.header('Authorization');
  if (!h) return res.status(401).json({ error: 'Token no proporcionado' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
}
router.use(authenticate);

// GET /api/tasks/mine — tareas asignadas al user actual
router.get('/mine', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.task_number, t.title, t.description, t.status, t.priority, t.due_date,
              t.category, t.iso_norm, t.source_module, t.origin_type, t.origin_detail,
              t.committee_id, t.finding_id,
              t.created_at, t.updated_at,
              CASE WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('completada','cancelada') THEN TRUE ELSE FALSE END AS overdue,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', u.id, 'name', u.full_name, 'email', u.email, 'role', ta.role
                ) ORDER BY ta.role) FROM task_assignees ta JOIN users u ON u.id=ta.user_id WHERE ta.task_id=t.id),
                '[]'::json
              ) AS assignees,
              cm.meeting_date AS committee_meeting_date
       FROM tasks t
       LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
       WHERE (
         t.assigned_to = $1
         OR t.collaborator_id = $1
         OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1)
       )
       AND t.status NOT IN ('completada', 'cancelada')
       ORDER BY
         CASE t.priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
         t.due_date NULLS LAST,
         t.created_at`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    console.error('[tasks/mine]', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/tasks/:id — actualizar estado de una tarea propia
router.patch('/mine/:id', async (req, res) => {
  try {
    // Verificar ownership
    const owner = await pool.query(
      `SELECT assigned_to, collaborator_id FROM tasks WHERE id = $1`,
      [req.params.id]
    );
    if (owner.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    const t = owner.rows[0];
    const isAssignee = await pool.query("SELECT 1 FROM task_assignees WHERE task_id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    if (t.assigned_to !== req.user.id && t.collaborator_id !== req.user.id && isAssignee.rowCount===0 && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { status, priority, observations } = req.body;
    const updates = [];
    const params = [req.params.id];
    let i = 2;
    if (priority) { updates.push(`priority = $${i++}`); params.push(priority); }
    if (status) {
      updates.push(`status = $${i++}::task_status`); params.push(status);
      // Al completar se sella la fecha de cierre; al reabrir se limpia.
      updates.push(status === 'completada'
        ? `completed_at = COALESCE(completed_at, NOW())`
        : `completed_at = NULL`);
    }
    if (observations && observations.trim()) {
      // La observación se agrega al historial del campo, no lo pisa.
      const prefix = status === 'completada'
        ? `[Cierre ${new Date().toLocaleDateString('es-AR')}] `
        : `[${new Date().toLocaleDateString('es-AR')}] `;
      updates.push(`observations = COALESCE(observations || E'\\n', '') || $${i++}`);
      params.push(prefix + observations.trim());
    }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) return res.status(400).json({ error: 'Nada para actualizar' });

    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $1`,
      params
    );

    // La observación queda también en el historial de comentarios
    if (observations && observations.trim()) {
      await pool.query(
        `INSERT INTO task_comments (task_id, user_id, body, kind) VALUES ($1,$2,$3,$4)`,
        [req.params.id, req.user.id, observations.trim(),
         status === 'completada' ? 'cierre' : 'comentario']
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tasks/team-overview (supervisores)
// Resumen de tareas activas por usuario — cuenta por los tres caminos de
// asignación (assigned_to, collaborator_id, task_assignees).
router.get('/team-overview', async (req, res) => {
  if (!['master_admin', 'sgi_leader', 'director'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.full_name, u.role, u.department,
             COUNT(t.id)::int AS pending_count,
             COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE)::int AS overdue_count,
             COUNT(t.id) FILTER (WHERE t.priority IN ('alta','urgente'))::int AS high_priority_count
      FROM users u
      LEFT JOIN tasks t
        ON t.status NOT IN ('completada', 'cancelada')
       AND (
             t.assigned_to = u.id
          OR t.collaborator_id = u.id
          OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = u.id)
           )
      WHERE u.is_active = TRUE
      GROUP BY u.id, u.full_name, u.role, u.department
      ORDER BY overdue_count DESC, pending_count DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
