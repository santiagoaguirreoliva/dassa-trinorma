import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/suppliers
router.get('/', async (req, res) => {
  const { search, category, active } = req.query;
  const where = ['1=1'];
  const params = [];
  let i = 1;
  if (search)   { where.push(`name ILIKE $${i++}`); params.push(`%${search}%`); }
  if (category) { where.push(`category = $${i++}`); params.push(category); }
  if (active !== undefined) { where.push(`is_active = $${i++}`); params.push(active === 'true'); }

  try {
    const { rows } = await query(
      `SELECT * FROM suppliers WHERE ${where.join(' AND ')} ORDER BY name ASC`, params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  const { name, cuit, category, contact_name, contact_email, contact_phone,
          address, is_homologated, homologation_date, homologation_expiry,
          score, notes, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO suppliers
         (name, cuit, category, contact_name, contact_email, contact_phone,
          address, is_homologated, homologation_date, homologation_expiry,
          score, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [name, cuit||null, category||null, contact_name||null,
       contact_email||null, contact_phone||null, address||null,
       is_homologated||false, homologation_date||null, homologation_expiry||null,
       score||null, notes||null, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/suppliers/:id
router.patch('/:id', async (req, res) => {
  const FIELDS = ['name','cuit','category','contact_name','contact_email',
    'contact_phone','address','is_homologated','homologation_date',
    'homologation_expiry','score','notes','is_active'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE id=$${i} RETURNING *`, values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
