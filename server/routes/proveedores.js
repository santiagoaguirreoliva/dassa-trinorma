// Rutas autenticadas del módulo Proveedores (complementa suppliers.js, que no se toca).
// Por ahora: listado de acuses digitales de requisitos que llegan de la landing pública
// trinorma.dassa.com.ar/proveedores/ (ver routes/public-proveedores.js + migración 065).
import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/proveedores/acuses — paginado simple (?limit hasta 200, ?offset)
router.get('/acuses', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const { rows } = await query(
      `SELECT id, company_name, cuit, person_name, email, phone, activity_type,
              comments, doc_version, ip, created_at
         FROM supplier_acknowledgements
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ items: rows });
  } catch (err) {
    console.error('proveedores/acuses error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
