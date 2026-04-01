import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
function p(params, val) { params.push(val); return `$${params.length}`; }

router.get('/', async (req, res) => {
  const { status, type, search } = req.query;
  let sql = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];
  if (status) sql += ` AND status = ${p(params, status)}`;
  if (type)   sql += ` AND type = ${p(params, type)}`;
  if (search) sql += ` AND name ILIKE ${p(params, `%${search}%`)}`;
  sql += ' ORDER BY name ASC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener proveedores' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener proveedor' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, cuit, type, contact_name, email, phone, address, status = 'activo', notes } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO suppliers (name, cuit, type, contact_name, email, phone, address, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, cuit||null, type||null, contact_name||null, email||null, phone||null, address||null, status, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al crear proveedor' }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { name, cuit, type, contact_name, email, phone, address, status, notes } = req.body;
  try {
    const updates = []; const params = [];
    if (name)                   updates.push(`name = ${p(params, name)}`);
    if (cuit !== undefined)     updates.push(`cuit = ${p(params, cuit)}`);
    if (type !== undefined)     updates.push(`type = ${p(params, type)}`);
    if (contact_name !== undefined) updates.push(`contact_name = ${p(params, contact_name)}`);
    if (email !== undefined)    updates.push(`email = ${p(params, email)}`);
    if (phone !== undefined)    updates.push(`phone = ${p(params, phone)}`);
    if (address !== undefined)  updates.push(`address = ${p(params, address)}`);
    if (status)                 updates.push(`status = ${p(params, status)}`);
    if (notes !== undefined)    updates.push(`notes = ${p(params, notes)}`);
    if (updates.length === 0)   return res.status(400).json({ error: 'No hay campos para actualizar' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar proveedor' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar proveedor' }); }
});

export default router;
