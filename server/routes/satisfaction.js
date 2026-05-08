import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET / — list surveys with NPS computed from responses
router.get('/', async (req, res) => {
  try {
    const { rows: surveys } = await query(
      `SELECT s.*, u.full_name AS created_by_name,
              (SELECT count(*) FROM survey_responses sr WHERE sr.survey_id = s.id) AS response_count
         FROM surveys s
         LEFT JOIN users u ON u.id = s.created_by
        ORDER BY s.created_at DESC`
    );
    // Get all responses with nps_score for NPS calculation
    const { rows: responses } = await query(
      `SELECT nps_score FROM survey_responses WHERE nps_score IS NOT NULL`
    );
    const total = responses.length;
    const promoters  = responses.filter(r => r.nps_score >= 9).length;
    const detractors = responses.filter(r => r.nps_score <= 6).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
    const average_rating = total > 0
      ? (responses.reduce((sum, r) => sum + r.nps_score, 0) / total).toFixed(1)
      : 0;

    res.json({
      surveys,
      nps,
      total_surveys: surveys.length,
      total_responses: total,
      average_rating,
      promoters,
      detractors,
      passives: total - promoters - detractors,
    });
  } catch (err) {
    console.error('Satisfaction GET error:', err);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// GET /:id — single survey with questions & responses
router.get('/:id', async (req, res) => {
  try {
    const { rows: survey } = await query('SELECT * FROM surveys WHERE id = $1', [req.params.id]);
    if (!survey[0]) return res.status(404).json({ error: 'Encuesta no encontrada' });
    const { rows: questions } = await query('SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY order_index', [req.params.id]);
    const { rows: responses } = await query('SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY submitted_at DESC', [req.params.id]);
    res.json({ ...survey[0], questions, responses });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener encuesta' });
  }
});

// POST / — create survey
router.post('/', authenticate, async (req, res) => {
  const { title, survey_type, description, period, year, quarter, closes_at } = req.body;
  if (!title || !survey_type) {
    return res.status(400).json({ error: 'Título y tipo de encuesta son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO surveys (title, survey_type, description, period, year, quarter, closes_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, survey_type, description || null, period || null, year || null, quarter || null, closes_at || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Satisfaction POST error:', error);
    res.status(500).json({ error: 'Error al crear encuesta' });
  }
});

// PUT /:id — update survey
router.put('/:id', authenticate, async (req, res) => {
  const { title, description, period, year, quarter, closes_at, is_active } = req.body;
  const updates = []; const params = [];
  if (title !== undefined)       updates.push(`title = ${p(params, title)}`);
  if (description !== undefined) updates.push(`description = ${p(params, description)}`);
  if (period !== undefined)      updates.push(`period = ${p(params, period)}`);
  if (year !== undefined)        updates.push(`year = ${p(params, year)}`);
  if (quarter !== undefined)     updates.push(`quarter = ${p(params, quarter)}`);
  if (closes_at !== undefined)   updates.push(`closes_at = ${p(params, closes_at)}`);
  if (is_active !== undefined)   updates.push(`is_active = ${p(params, is_active)}`);
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  updates.push(`updated_at = NOW()`);
  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE surveys SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar encuesta' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM surveys WHERE id = $1', [req.params.id]);
    res.json({ message: 'Encuesta eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar encuesta' });
  }
});

export default router;
