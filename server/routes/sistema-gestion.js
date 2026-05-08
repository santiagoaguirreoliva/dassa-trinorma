import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET / — all sections from system_content
router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM system_content ORDER BY section', []);
    const result = {};
    rows.forEach(row => { result[row.section] = row.content; });
    res.json(result);
  } catch (err) {
    console.error('Sistema-gestion GET error:', err);
    res.status(500).json({ error: 'Error al obtener sistema de gestión' });
  }
});

// GET /:section — single section
router.get('/:section', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM system_content WHERE section = $1', [req.params.section]);
    if (!rows[0]) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sección' });
  }
});

// PUT /:section — update a section
router.put('/:section', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'El contenido es requerido' });
  try {
    // Try update first
    const { rows } = await query(
      `UPDATE system_content
       SET content = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE section = $3 RETURNING *`,
      [content, req.user.id, req.params.section]
    );
    if (!rows[0]) {
      // Insert if not exists
      const { rows: inserted } = await query(
        `INSERT INTO system_content (section, title, content, updated_by)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.section, req.params.section, content, req.user.id]
      );
      return res.json(inserted[0]);
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Sistema-gestion PUT error:', error);
    res.status(500).json({ error: 'Error al actualizar la sección' });
  }
});

export default router;
