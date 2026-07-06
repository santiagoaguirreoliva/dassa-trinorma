import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = Router();

// GET /api/biblioteca — full document tree
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, code, version, title, process_name, process_order,
              doc_type, doc_class, norma, summary, module_path,
              review_date, status, is_active, updated_at
       FROM sgi_biblioteca
       WHERE is_active = true
       ORDER BY process_order ASC, doc_type ASC, code ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('biblioteca GET error:', err);
    res.status(500).json({ error: 'Error al obtener biblioteca' });
  }
});

// GET /api/biblioteca/:code — single document with full content
router.get('/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const result = await query(
      `SELECT b.*, u.full_name AS updated_by_name
       FROM sgi_biblioteca b
       LEFT JOIN users u ON u.id = b.updated_by
       WHERE b.code = $1 AND b.is_active = true`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('biblioteca GET/:code error:', err);
    res.status(500).json({ error: 'Error al obtener documento' });
  }
});

// PUT /api/biblioteca/:code — update content (director + sgi_leader only)
router.put('/:code', authenticate, async (req, res) => {
  const { role } = req.user;
  if (!['director', 'sgi_leader', 'master_admin'].includes(role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  try {
    const { code } = req.params;
    const { content, summary, status, version } = req.body;
    const result = await query(
      `UPDATE sgi_biblioteca
       SET content    = COALESCE($1, content),
           summary    = COALESCE($2, summary),
           status     = COALESCE($3, status),
           version    = COALESCE($4, version),
           updated_by = $5,
           updated_at = now()
       WHERE code = $6 AND is_active = true
       RETURNING *`,
      [content, summary, status, version, req.user.id, code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('biblioteca PUT error:', err);
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
});

export default router;
