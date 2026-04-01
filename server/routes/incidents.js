import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function generateIncidentCode(type) {
  const { rows } = await query(
    "SELECT COUNT(*) as count FROM incidents WHERE type = $1", [type]
  );
  const count = parseInt(rows[0].count);
  const prefix = type === 'incidente' ? 'INC-' : 'ACC-';
  return prefix + String(count + 1).padStart(3, '0');
}

function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  const { type, status, severity, search } = req.query;
  let sql = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];

  if (type)     sql += ` AND type = ${p(params, type)}`;
  if (status)   sql += ` AND status = ${p(params, status)}`;
  if (severity) sql += ` AND severity = ${p(params, severity)}`;
  if (search) {
    sql += ` AND (description ILIKE ${p(params, `%${search}%`)} OR area ILIKE ${p(params, `%${search}%`)} OR code ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY date DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener incidentes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener incidente' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { type, date, area, severity, status = 'abierto', description, employee_id, corrective_action } = req.body;
  if (!type || !date || !area || !severity) {
    return res.status(400).json({ error: 'Tipo, fecha, área y severidad son requeridos' });
  }
  try {
    const code = await generateIncidentCode(type);
    const { rows } = await query(
      `INSERT INTO incidents (code, type, date, area, severity, status, description, employee_id, corrective_action, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [code, type, date, area, severity, status, description || null, employee_id || null, corrective_action || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear incidente' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { type, date, area, severity, status, description, employee_id, corrective_action } = req.body;
  try {
    const updates = [];
    const params = [];

    if (type)                       updates.push(`type = ${p(params, type)}`);
    if (date)                       updates.push(`date = ${p(params, date)}`);
    if (area)                       updates.push(`area = ${p(params, area)}`);
    if (severity)                   updates.push(`severity = ${p(params, severity)}`);
    if (status)                     updates.push(`status = ${p(params, status)}`);
    if (description !== undefined)  updates.push(`description = ${p(params, description)}`);
    if (employee_id !== undefined)  updates.push(`employee_id = ${p(params, employee_id)}`);
    if (corrective_action !== undefined) updates.push(`corrective_action = ${p(params, corrective_action)}`);
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar incidente' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Incidente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar incidente' });
  }
});

export default router;
