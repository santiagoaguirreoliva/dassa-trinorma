import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  const { status, type, department, search } = req.query;
  let sql = 'SELECT * FROM trainings WHERE 1=1';
  const params = [];

  if (status)     sql += ` AND status = ${p(params, status)}`;
  if (type)       sql += ` AND type = ${p(params, type)}`;
  if (department) sql += ` AND department = ${p(params, department)}`;
  if (search) {
    sql += ` AND (title ILIKE ${p(params, `%${search}%`)} OR description ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY date DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener capacitaciones' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM trainings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Capacitación no encontrada' });

    const { rows: employees } = await query(
      `SELECT e.*, te.attendance, te.score, te.certificate_url
       FROM training_employees te
       JOIN employees e ON te.employee_id = e.id
       WHERE te.training_id = $1`,
      [req.params.id]
    );
    res.json({ ...rows[0], employees });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener capacitación' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { title, description, type, date, duration_hours, instructor, status = 'planificada', department, max_participants } = req.body;
  if (!title || !type || !date) {
    return res.status(400).json({ error: 'Título, tipo y fecha son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO trainings (title, description, type, date, duration_hours, instructor, status, department, max_participants)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description || null, type, date, duration_hours || null, instructor || null, status, department || null, max_participants || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear capacitación' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { title, description, type, date, duration_hours, instructor, status, department, max_participants } = req.body;
  try {
    const updates = [];
    const params = [];

    if (title)                    updates.push(`title = ${p(params, title)}`);
    if (description !== undefined) updates.push(`description = ${p(params, description)}`);
    if (type)                     updates.push(`type = ${p(params, type)}`);
    if (date)                     updates.push(`date = ${p(params, date)}`);
    if (duration_hours !== undefined) updates.push(`duration_hours = ${p(params, duration_hours)}`);
    if (instructor !== undefined) updates.push(`instructor = ${p(params, instructor)}`);
    if (status)                   updates.push(`status = ${p(params, status)}`);
    if (department !== undefined) updates.push(`department = ${p(params, department)}`);
    if (max_participants !== undefined) updates.push(`max_participants = ${p(params, max_participants)}`);

    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE trainings SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Capacitación no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar capacitación' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM training_employees WHERE training_id = $1', [req.params.id]);
    await query('DELETE FROM trainings WHERE id = $1', [req.params.id]);
    res.json({ message: 'Capacitación eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar capacitación' });
  }
});

// Training employees endpoints
router.post('/:id/employees', authenticateToken, async (req, res) => {
  const { employee_id, attendance, score, certificate_url } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id es requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO training_employees (training_id, employee_id, attendance, score, certificate_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [req.params.id, employee_id, attendance ?? null, score ?? null, certificate_url ?? null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (error) {
    res.status(400).json({ error: 'Error al añadir empleado a la capacitación' });
  }
});

router.put('/:id/employees/:empId', authenticateToken, async (req, res) => {
  const { attendance, score, certificate_url } = req.body;
  try {
    const updates = [];
    const params = [];

    if (attendance !== undefined)       updates.push(`attendance = ${p(params, attendance)}`);
    if (score !== undefined)            updates.push(`score = ${p(params, score)}`);
    if (certificate_url !== undefined)  updates.push(`certificate_url = ${p(params, certificate_url)}`);

    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    params.push(req.params.empId);
    await query(
      `UPDATE training_employees SET ${updates.join(', ')} WHERE training_id = $${params.length - 1} AND employee_id = $${params.length}`,
      params
    );
    res.json({ message: 'Actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

router.delete('/:id/employees/:empId', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM training_employees WHERE training_id = $1 AND employee_id = $2', [req.params.id, req.params.empId]);
    res.json({ message: 'Empleado removido de la capacitación' });
  } catch (error) {
    res.status(500).json({ error: 'Error al remover empleado' });
  }
});

export default router;
