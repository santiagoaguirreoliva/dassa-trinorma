import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/environmental
router.get('/', async (req, res) => {
  const { area, search } = req.query;
  let sql = `SELECT ea.*, u.full_name AS responsible_name
             FROM environmental_aspects ea
             LEFT JOIN users u ON u.id = ea.responsible_id
             WHERE ea.is_active = true`;
  const params = [];

  if (area)   sql += ` AND ea.area = ${p(params, area)}`;
  if (search) {
    sql += ` AND (ea.aspect ILIKE ${p(params, `%${search}%`)} OR ea.activity ILIKE ${p(params, `%${search}%`)} OR ea.impact ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY ea.created_at DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Environmental GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener aspectos ambientales' });
  }
});

// GET /api/environmental/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ea.*, u.full_name AS responsible_name
       FROM environmental_aspects ea
       LEFT JOIN users u ON u.id = ea.responsible_id
       WHERE ea.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aspecto ambiental no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener aspecto ambiental' });
  }
});

// POST /api/environmental
// significance and is_significant are GENERATED ALWAYS columns — DB computes them
router.post('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { area, activity, aspect, impact, condition, frequency, severity, legal_req, control_measure, responsible_id } = req.body;
  if (!area || !activity || !aspect || !impact || !frequency || !severity) {
    return res.status(400).json({ error: 'Área, actividad, aspecto, impacto, frecuencia y severidad son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO environmental_aspects (area, activity, aspect, impact, condition, frequency, severity, legal_req, control_measure, responsible_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [area, activity, aspect, impact, condition || 'normal', frequency, severity,
       legal_req || false, control_measure || null, responsible_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Environmental POST error:', error.message);
    res.status(500).json({ error: 'Error al crear aspecto ambiental' });
  }
});

// PATCH /api/environmental/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const ALLOWED = ['area', 'activity', 'aspect', 'impact', 'condition',
                   'frequency', 'severity', 'legal_req', 'control_measure', 'responsible_id'];
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
      `UPDATE environmental_aspects SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Aspecto ambiental no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Environmental PATCH error:', error.message);
    res.status(500).json({ error: 'Error al actualizar aspecto ambiental' });
  }
});

// DELETE /api/environmental/:id (soft delete)
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE environmental_aspects SET is_active = false WHERE id = $1 RETURNING id`,
      [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aspecto ambiental no encontrado' });
    res.json({ message: 'Aspecto ambiental eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar aspecto ambiental' });
  }
});

export default router;
