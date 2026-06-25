import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/documents
router.get('/', async (req, res) => {
  const { doc_type, norma, status, search } = req.query;
  let sql = `SELECT d.*, u.full_name AS created_by_name, r.full_name AS responsible_name,
                    a.full_name AS approved_by_name
             FROM documents d
             LEFT JOIN users u ON u.id = d.created_by
             LEFT JOIN users r ON r.id = d.responsible_id
             LEFT JOIN users a ON a.id = d.approved_by
             WHERE 1=1`;
  const params = [];

  if (doc_type) sql += ` AND d.doc_type = ${p(params, doc_type)}::doc_type`;
  if (norma)    sql += ` AND d.norma = ${p(params, norma)}`;
  if (status)   sql += ` AND d.status = ${p(params, status)}::doc_status`;
  if (search) {
    sql += ` AND (d.title ILIKE ${p(params, `%${search}%`)} OR d.code ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY d.created_at DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Documents GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*, u.full_name AS created_by_name, r.full_name AS responsible_name,
              a.full_name AS approved_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN users r ON r.id = d.responsible_id
       LEFT JOIN users a ON a.id = d.approved_by
       WHERE d.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// POST /api/documents
router.post('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { title, doc_type, norma, description, folder_id, responsible_id, review_date, file_url, file_name } = req.body;
  if (!title || !doc_type) {
    return res.status(400).json({ error: 'Título y tipo de documento son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO documents (code, title, description, doc_type, norma, folder_id, responsible_id, review_date, file_url, file_name, created_by)
       VALUES (
         'DOC-' || to_char(NOW(), 'YYMM') || '-' || LPAD((SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1 FROM documents WHERE code LIKE 'DOC-%')::TEXT, 3, '0'),
         $1,$2,$3::doc_type,$4,$5,$6,$7,$8,$9,$10
       ) RETURNING *`,
      [title, description || null, doc_type, norma || null, folder_id || null,
       responsible_id || null, review_date || null, file_url || null, file_name || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Documents POST error:', error.message);
    res.status(500).json({ error: 'Error al crear documento' });
  }
});

// PATCH /api/documents/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const ALLOWED = ['title', 'description', 'doc_type', 'norma', 'folder_id',
                   'status', 'responsible_id', 'approved_by', 'approved_at',
                   'effective_date', 'review_date', 'file_url', 'file_name',
                   'content_md', 'proceso', 'parent_document_id', 'keywords', 'needs_source'];
  const updates = [];
  const params = [];

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      if (key === 'doc_type') {
        updates.push(`${key} = ${p(params, req.body[key])}::doc_type`);
      } else if (key === 'status') {
        updates.push(`${key} = ${p(params, req.body[key])}::doc_status`);
      } else {
        updates.push(`${key} = ${p(params, req.body[key])}`);
      }
    }
  }

  // Auto-increment version on status change to 'vigente'
  if (req.body.status === 'vigente') {
    updates.push('version = version + 1');
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Documents PATCH error:', error.message);
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

export default router;
