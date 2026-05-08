import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/employees
router.get('/', async (req, res) => {
  const { sector, status, search } = req.query;
  let sql = `SELECT e.*, ev.full_name AS evaluator_name, ev2.full_name AS secondary_evaluator_name
             FROM employees e
             LEFT JOIN employees ev ON ev.id = e.evaluator_id
             LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
             WHERE 1=1`;
  const params = [];

  if (sector)  sql += ` AND e.sector = ${p(params, sector)}`;
  if (status === 'activo')   sql += ` AND e.is_active = true`;
  if (status === 'inactivo') sql += ` AND e.is_active = false`;
  if (search) {
    sql += ` AND (e.full_name ILIKE ${p(params, `%${search}%`)} OR e.email ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY e.full_name ASC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error employees GET:', err.message);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*, ev.full_name AS evaluator_name, ev2.full_name AS secondary_evaluator_name
       FROM employees e
       LEFT JOIN employees ev ON ev.id = e.evaluator_id
       LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
       WHERE e.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
});

// POST /api/employees
router.post('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { full_name, email, phone, sector, position, evaluator_id, secondary_evaluator_id, user_id } = req.body;
  if (!full_name) return res.status(400).json({ error: 'El nombre completo es requerido' });

  try {
    const { rows } = await query(
      `INSERT INTO employees (full_name, email, phone, sector, position, evaluator_id, secondary_evaluator_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [full_name, email || null, phone || null, sector || null, position || null,
       evaluator_id || null, secondary_evaluator_id || null, user_id || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error employees POST:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/employees/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const ALLOWED = ['full_name', 'email', 'phone', 'sector', 'position',
                   'evaluator_id', 'secondary_evaluator_id', 'user_id', 'is_active'];
  const updates = [];
  const params = [];

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ${p(params, req.body[key])}`);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE employees SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/employees/:id (soft delete)
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar empleado' });
  }
});

export default router;
