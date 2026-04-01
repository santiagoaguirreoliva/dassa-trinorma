import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  const { department, status, search } = req.query;
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];

  if (department) sql += ` AND department = ${p(params, department)}`;
  if (status)     sql += ` AND status = ${p(params, status)}`;
  if (search) {
    sql += ` AND (first_name ILIKE ${p(params, `%${search}%`)} OR last_name ILIKE ${p(params, `%${search}%`)} OR employee_number ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY employee_number ASC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { employee_number, first_name, last_name, position, department, hire_date, status = 'activo', email, phone } = req.body;
  if (!employee_number || !first_name || !last_name) {
    return res.status(400).json({ error: 'Número de empleado, nombre y apellido son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO employees (employee_number, first_name, last_name, position, department, hire_date, status, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [employee_number, first_name, last_name, position || null, department || null, hire_date || null, status, email || null, phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: 'El número de empleado ya existe' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { employee_number, first_name, last_name, position, department, hire_date, status, email, phone } = req.body;
  try {
    const updates = [];
    const params = [];

    if (employee_number)    updates.push(`employee_number = ${p(params, employee_number)}`);
    if (first_name)         updates.push(`first_name = ${p(params, first_name)}`);
    if (last_name)          updates.push(`last_name = ${p(params, last_name)}`);
    if (position !== undefined)   updates.push(`position = ${p(params, position)}`);
    if (department !== undefined) updates.push(`department = ${p(params, department)}`);
    if (hire_date !== undefined)  updates.push(`hire_date = ${p(params, hire_date)}`);
    if (status)             updates.push(`status = ${p(params, status)}`);
    if (email !== undefined)  updates.push(`email = ${p(params, email)}`);
    if (phone !== undefined)  updates.push(`phone = ${p(params, phone)}`);

    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

export default router;
