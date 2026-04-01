import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM sistema_gestion', []);
    const result = {};
    rows.forEach(row => { result[row.section] = row.content; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sistema de gestión' });
  }
});

router.get('/:section', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM sistema_gestion WHERE section = $1', [req.params.section]);
    if (!rows[0]) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sección' });
  }
});

router.put('/:section', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'El contenido es requerido' });
  try {
    const { rows } = await query(
      `UPDATE sistema_gestion
       SET content = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
       WHERE section = $3 RETURNING *`,
      [content, req.userId, req.params.section]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la sección' });
  }
});

export default router;
