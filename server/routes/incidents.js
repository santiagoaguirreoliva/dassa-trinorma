import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/incidents
router.get('/', async (req, res) => {
  const { incident_type, status, severity, search } = req.query;
  let sql = `SELECT i.*, u.full_name AS reported_by_name, r.full_name AS responsible_name
             FROM incidents i
             LEFT JOIN users u ON u.id = i.reported_by
             LEFT JOIN users r ON r.id = i.responsible_id
             WHERE 1=1`;
  const params = [];

  if (incident_type) sql += ` AND i.incident_type = ${p(params, incident_type)}`;
  if (status)        sql += ` AND i.status = ${p(params, status)}`;
  if (severity)      sql += ` AND i.severity = ${p(params, severity)}`;
  if (search) {
    sql += ` AND (i.description ILIKE ${p(params, `%${search}%`)} OR i.area ILIKE ${p(params, `%${search}%`)} OR i.code ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY i.date DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Incidents GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener incidentes' });
  }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, u.full_name AS reported_by_name, r.full_name AS responsible_name
       FROM incidents i
       LEFT JOIN users u ON u.id = i.reported_by
       LEFT JOIN users r ON r.id = i.responsible_id
       WHERE i.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener incidente' });
  }
});

// POST /api/incidents
router.post('/', requireRole('master_admin', 'director', 'sgi_leader', 'area_responsible'), async (req, res) => {
  const {
    incident_type, date, time, area, severity, description,
    injured_person, witness, immediate_cause, root_cause,
    corrective_action, responsible_id, art_reported, lost_time_days
  } = req.body;

  if (!incident_type || !date || !description) {
    return res.status(400).json({ error: 'Tipo, fecha y descripción son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO incidents (incident_type, date, time, area, severity, description,
        injured_person, witness, immediate_cause, root_cause,
        corrective_action, reported_by, responsible_id, art_reported, lost_time_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [incident_type, date, time || null, area || null, severity || 'leve',
       description, injured_person || null, witness || null,
       immediate_cause || null, root_cause || null, corrective_action || null,
       req.userId, responsible_id || null, art_reported || false, lost_time_days || 0]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Incidents POST error:', error.message);
    res.status(500).json({ error: 'Error al crear incidente' });
  }
});

// PATCH /api/incidents/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader', 'area_responsible'), async (req, res) => {
  const ALLOWED = [
    'incident_type', 'date', 'time', 'area', 'severity', 'status', 'description',
    'injured_person', 'witness', 'immediate_cause', 'root_cause',
    'corrective_action', 'responsible_id', 'art_reported', 'lost_time_days'
  ];
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
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Incidents PATCH error:', error.message);
    res.status(500).json({ error: 'Error al actualizar incidente' });
  }
});

// DELETE /api/incidents/:id
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    await query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Incidente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar incidente' });
  }
});

export default router;
