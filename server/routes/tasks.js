import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { sendTaskEmail } from '../services/email.js';

const router = Router();
router.use(authenticate);

// ─── GET /api/tasks — list all tasks with filters ──────────────
router.get('/', async (req, res) => {
  try {
    const { mine, collaborator, status, priority, category, iso_norm,
            origin_type, assigned_to, search, overdue } = req.query;

    let q = `
      SELECT t.*,
             u.full_name  AS assigned_name,   u.email AS assigned_email,
             c.full_name  AS creator_name,
             col.full_name AS collaborator_name, col.email AS collaborator_email,
             f.code AS finding_code,
             cm.meeting_date AS committee_date
        FROM tasks t
        LEFT JOIN users u   ON u.id  = t.assigned_to
        LEFT JOIN users c   ON c.id  = t.created_by
        LEFT JOIN users col ON col.id = t.collaborator_id
        LEFT JOIN findings f ON f.id  = t.finding_id
        LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
       WHERE 1=1`;
    const params = [];
    let i = 1;

    if (mine === 'true') {
      q += ` AND (t.assigned_to = $${i} OR t.collaborator_id = $${i})`;
      params.push(req.user.id); i++;
    }
    if (assigned_to) {
      q += ` AND t.assigned_to = $${i}`;
      params.push(assigned_to); i++;
    }
    if (collaborator === 'true') {
      q += ` AND t.collaborator_id = $${i}`;
      params.push(req.user.id); i++;
    }
    if (status) {
      q += ` AND t.status = $${i}`;
      params.push(status); i++;
    }
    if (priority) {
      q += ` AND t.priority = $${i}`;
      params.push(priority); i++;
    }
    if (category) {
      q += ` AND t.category = $${i}`;
      params.push(category); i++;
    }
    if (iso_norm) {
      q += ` AND t.iso_norm = $${i}`;
      params.push(iso_norm); i++;
    }
    if (origin_type) {
      q += ` AND t.origin_type = $${i}`;
      params.push(origin_type); i++;
    }
    if (overdue === 'true') {
      q += ` AND t.due_date < CURRENT_DATE AND t.status NOT IN ('completada','cancelada')`;
    }
    if (search) {
      q += ` AND (t.title ILIKE $${i} OR t.description ILIKE $${i} OR t.observations ILIKE $${i})`;
      params.push(`%${search}%`); i++;
    }

    q += ` ORDER BY
      CASE t.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
      t.due_date ASC NULLS LAST`;

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/tasks/stats — aggregated stats ────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pendiente')::int AS pendientes,
        COUNT(*) FILTER (WHERE status = 'en_curso')::int AS en_curso,
        COUNT(*) FILTER (WHERE status = 'completada')::int AS completadas,
        COUNT(*) FILTER (WHERE status = 'cancelada')::int AS canceladas,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completada','cancelada'))::int AS vencidas,
        COUNT(*) FILTER (WHERE priority = 'alta' AND status NOT IN ('completada','cancelada'))::int AS prioridad_alta,
        COUNT(*) FILTER (WHERE priority = 'urgente' AND status NOT IN ('completada','cancelada'))::int AS urgentes
      FROM tasks
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/tasks/by-user — tasks grouped by assigned user ────
router.get('/by-user', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.full_name, u.email, u.role, u.department,
             COUNT(t.id)::int AS total,
             COUNT(t.id) FILTER (WHERE t.status = 'pendiente')::int AS pendientes,
             COUNT(t.id) FILTER (WHERE t.status = 'en_curso')::int AS en_curso,
             COUNT(t.id) FILTER (WHERE t.status = 'completada')::int AS completadas,
             COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completada','cancelada'))::int AS vencidas
        FROM users u
        LEFT JOIN tasks t ON t.assigned_to = u.id
       WHERE u.is_active = true
       GROUP BY u.id
       ORDER BY pendientes DESC, total DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/tasks/categories — distinct categories ────────────
router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await query(`SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL ORDER BY category`);
    res.json(rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/tasks/:id — single task detail ────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT t.*,
             u.full_name AS assigned_name, u.email AS assigned_email,
             c.full_name AS creator_name,
             col.full_name AS collaborator_name, col.email AS collaborator_email,
             f.code AS finding_code, f.title AS finding_title,
             cm.meeting_date AS committee_date
        FROM tasks t
        LEFT JOIN users u   ON u.id  = t.assigned_to
        LEFT JOIN users c   ON c.id  = t.created_by
        LEFT JOIN users col ON col.id = t.collaborator_id
        LEFT JOIN findings f ON f.id  = t.finding_id
        LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
       WHERE t.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/tasks — create task ──────────────────────────────
router.post('/', async (req, res) => {
  const { title, description, priority, due_date, assigned_to, collaborator_id,
          source_module, finding_id, committee_id, category, iso_norm,
          origin_type, origin_detail, observations } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });
  try {
    const { rows } = await query(`
      INSERT INTO tasks (title, description, priority, due_date, assigned_to, collaborator_id,
                         created_by, source_module, finding_id, committee_id,
                         category, iso_norm, origin_type, origin_detail, observations)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [title, description, priority || 'media', due_date, assigned_to,
       collaborator_id || null, req.user.id, source_module || 'general',
       finding_id || null, committee_id || null,
       category || null, iso_norm || null, origin_type || 'manual',
       origin_detail || null, observations || null]);

    // Send email notification to assigned user
    if (assigned_to) {
      const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [assigned_to]);
      if (userRes.rows[0]?.email) {
        sendTaskEmail('assigned', {
          to: userRes.rows[0].email,
          userName: userRes.rows[0].full_name,
          taskTitle: title,
          dueDate: due_date,
          priority: priority || 'media',
          createdBy: req.user.full_name || 'Sistema',
        }).catch(err => console.error('Email error:', err.message));
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/tasks/bulk — bulk import ─────────────────────────
router.post('/bulk', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { tasks: taskList } = req.body;
  if (!Array.isArray(taskList) || !taskList.length) {
    return res.status(400).json({ error: 'Se requiere un array de tareas' });
  }
  try {
    const created = [];
    for (const t of taskList) {
      const { rows } = await query(`
        INSERT INTO tasks (title, description, priority, due_date, assigned_to, collaborator_id,
                           created_by, source_module, category, iso_norm, origin_type,
                           origin_detail, observations, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id, title, status`,
        [t.title, t.description || null, t.priority || 'media', t.due_date || null,
         t.assigned_to || null, t.collaborator_id || null, req.user.id,
         t.source_module || 'general', t.category || null, t.iso_norm || null,
         t.origin_type || 'manual', t.origin_detail || null, t.observations || null,
         t.status || 'pendiente']);
      created.push(rows[0]);
    }
    res.status(201).json({ count: created.length, tasks: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PUT /api/tasks/:id — full update ───────────────────────────
router.put('/:id', async (req, res) => {
  const allowed = ['title', 'description', 'priority', 'due_date', 'assigned_to',
    'collaborator_id', 'source_module', 'category', 'iso_norm', 'origin_type',
    'origin_detail', 'observations', 'status'];
  const updates = []; const values = []; let i = 1;

  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      values.push(req.body[f]);
    }
  }
  // Handle status → completada
  if (req.body.status === 'completada') {
    updates.push(`completed_at = $${i++}`);
    values.push(new Date());
  }
  if (req.body.status && req.body.status !== 'completada') {
    updates.push(`completed_at = NULL`);
  }

  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  values.push(req.params.id);

  try {
    const { rows } = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/tasks/:id — quick status update (with completion notes) ──
router.patch('/:id', async (req, res) => {
  const { status, observations, completed_at } = req.body;
  if (!status) return res.status(400).json({ error: 'Status requerido' });
  // Require observations when completing a task
  if (status === 'completada' && !observations?.trim()) {
    return res.status(400).json({ error: 'Las observaciones son obligatorias al completar una tarea' });
  }
  try {
    const updates = ['status = $1'];
    const values = [status];
    let idx = 2;
    if (status === 'completada') {
      updates.push(`completed_at = $${idx++}`);
      values.push(completed_at ? new Date(completed_at) : new Date());
      updates.push(`observations = COALESCE(observations || E'\\n', '') || $${idx++}`);
      values.push(`[Completada ${new Date().toLocaleDateString('es-AR')}] ${observations.trim()}`);
    } else {
      updates.push('completed_at = NULL');
    }
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    if (!rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/tasks/:id ──────────────────────────────────────
router.delete('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ message: 'Tarea eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
