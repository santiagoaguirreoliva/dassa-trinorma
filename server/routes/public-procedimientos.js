// Router público — árbol de procedimientos del SGI (solo lectura, sin login).
// Expone únicamente procedimientos APROBADOS (doc_type='procedimiento'); no
// expone instructivos de la app, borradores ni ningún otro dato. Rate-limit por IP.
//   GET /api/public/procedimientos        → lista de procedimientos aprobados
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db/db.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, code, title, content_md, proceso, norma, parent_document_id, needs_source, keywords
         FROM documents
        WHERE doc_type = 'procedimiento' AND status = 'aprobado'
        ORDER BY proceso, code`
    );
    res.set('Cache-Control', 'public, max-age=300');
    res.json(rows);
  } catch (err) {
    console.error('public procedimientos error:', err.message);
    res.status(500).json({ error: 'Error al obtener procedimientos' });
  }
});

export default router;
