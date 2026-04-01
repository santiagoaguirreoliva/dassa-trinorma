import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

async function generateDocumentCode() {
  const { rows } = await query('SELECT COUNT(*) as count FROM documents', []);
  const count = parseInt(rows[0].count);
  const prefix = count % 2 === 0 ? 'P-TRI-' : 'I-TRI-';
  return prefix + String(Math.floor(count / 2) + 1).padStart(3, '0');
}

// Helper: build $N placeholder and push value
function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  const { type, norma, status, search } = req.query;
  let sql = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  if (type)   sql += ` AND type = ${p(params, type)}`;
  if (norma)  sql += ` AND norma = ${p(params, norma)}`;
  if (status) sql += ` AND status = ${p(params, status)}`;
  if (search) {
    sql += ` AND (title ILIKE ${p(params, `%${search}%`)} OR code ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY created_at DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { title, type, norma, status = 'borrador', review_date, file_url } = req.body;
  if (!title || !type || !norma) {
    return res.status(400).json({ error: 'Título, tipo y norma son requeridos' });
  }
  try {
    const code = await generateDocumentCode();
    const { rows } = await query(
      `INSERT INTO documents (code, title, type, norma, status, review_date, file_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code, title, type, norma, status, review_date || null, file_url || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear documento' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { title, type, norma, version, status, review_date, file_url } = req.body;
  try {
    const updates = [];
    const params = [];

    if (title)              updates.push(`title = ${p(params, title)}`);
    if (type)               updates.push(`type = ${p(params, type)}`);
    if (norma)              updates.push(`norma = ${p(params, norma)}`);
    if (version !== undefined) updates.push(`version = ${p(params, version)}`);
    if (status)             updates.push(`status = ${p(params, status)}`);
    if (review_date)        updates.push(`review_date = ${p(params, review_date)}`);
    if (file_url)           updates.push(`file_url = ${p(params, file_url)}`);
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

export default router;
