import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  try {
    const { rows: surveys } = await query('SELECT * FROM customer_surveys ORDER BY date DESC', []);
    const promoters  = surveys.filter(s => s.rating >= 9).length;
    const detractors = surveys.filter(s => s.rating <= 6).length;
    const nps = surveys.length > 0
      ? Math.round(((promoters - detractors) / surveys.length) * 100)
      : 0;
    res.json({
      surveys,
      nps,
      total_surveys: surveys.length,
      average_rating: surveys.length > 0
        ? (surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length).toFixed(1)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM customer_surveys WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { customer_name, date, rating, comments, category } = req.body;
  if (!customer_name || !date || !rating) {
    return res.status(400).json({ error: 'Nombre del cliente, fecha y calificación son requeridos' });
  }
  if (rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'La calificación debe estar entre 1 y 10' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO customer_surveys (customer_name, date, rating, comments, category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customer_name, date, rating, comments || null, category || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear encuesta' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { customer_name, date, rating, comments, category } = req.body;
  try {
    const updates = [];
    const params = [];

    if (customer_name)      updates.push(`customer_name = ${p(params, customer_name)}`);
    if (date)               updates.push(`date = ${p(params, date)}`);
    if (rating !== undefined) {
      if (rating < 1 || rating > 10)
        return res.status(400).json({ error: 'La calificación debe estar entre 1 y 10' });
      updates.push(`rating = ${p(params, rating)}`);
    }
    if (comments !== undefined) updates.push(`comments = ${p(params, comments)}`);
    if (category !== undefined) updates.push(`category = ${p(params, category)}`);

    if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE customer_surveys SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar encuesta' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM customer_surveys WHERE id = $1', [req.params.id]);
    res.json({ message: 'Encuesta eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar encuesta' });
  }
});

export default router;
