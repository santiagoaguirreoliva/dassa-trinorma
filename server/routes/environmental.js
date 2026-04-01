import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM environmental_aspects ORDER BY created_at DESC', []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener aspectos ambientales' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM environmental_aspects WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aspecto ambiental no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener aspecto ambiental' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { aspect, activity, impact, frequency, severity, detection, control_measure } = req.body;
  if (!aspect || !frequency || !severity || !detection) {
    return res.status(400).json({ error: 'Aspecto, frecuencia, severidad y detección son requeridos' });
  }
  const significance = frequency * severity * detection;
  const is_significant = significance > 36;
  try {
    const { rows } = await query(
      `INSERT INTO environmental_aspects (aspect, activity, impact, frequency, severity, detection, significance, is_significant, control_measure)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [aspect, activity || null, impact || null, frequency, severity, detection, significance, is_significant, control_measure || null]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear aspecto ambiental' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { aspect, activity, impact, frequency, severity, detection, control_measure } = req.body;
  try {
    const updates = [];
    const params = [];

    if (aspect !== undefined)   updates.push(`aspect = ${p(params, aspect)}`);
    if (activity !== undefined) updates.push(`activity = ${p(params, activity)}`);
    if (impact !== undefined)   updates.push(`impact = ${p(params, impact)}`);
    if (frequency !== undefined) updates.push(`frequency = ${p(params, frequency)}`);
    if (severity !== undefined)  updates.push(`severity = ${p(params, severity)}`);
    if (detection !== undefined) updates.push(`detection = ${p(params, detection)}`);

    // Recalculate significance if F, S, or D changed
    if (frequency !== undefined || severity !== undefined || detection !== undefined) {
      const { rows: cur } = await query(
        'SELECT frequency, severity, detection FROM environmental_aspects WHERE id = $1', [req.params.id]
      );
      const f = frequency !== undefined ? frequency : cur[0].frequency;
      const s = severity  !== undefined ? severity  : cur[0].severity;
      const d = detection !== undefined ? detection : cur[0].detection;
      const sig = f * s * d;
      updates.push(`significance = ${p(params, sig)}`);
      updates.push(`is_significant = ${p(params, sig > 36)}`);
    }

    if (control_measure !== undefined) updates.push(`control_measure = ${p(params, control_measure)}`);

    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE environmental_aspects SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Aspecto ambiental no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar aspecto ambiental' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM environmental_aspects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Aspecto ambiental eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar aspecto ambiental' });
  }
});

export default router;
