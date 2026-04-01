import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
function p(params, val) { params.push(val); return `$${params.length}`; }

async function generatePurchaseCode() {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*) as count FROM purchases WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]
  );
  const seq = parseInt(rows[0].count) + 1;
  return `OC-${year}-${String(seq).padStart(3, '0')}`;
}

// GET all purchases with join to suppliers and users
router.get('/', async (req, res) => {
  const { status, category, search } = req.query;
  let sql = `SELECT p.*, u.name as requested_by_name
             FROM purchases p
             LEFT JOIN users u ON p.requested_by = u.id
             WHERE 1=1`;
  const params = [];
  if (status)   sql += ` AND p.status = ${p(params, status)}`;
  if (category) sql += ` AND p.category = ${p(params, category)}`;
  if (search)   sql += ` AND (p.supplier_name ILIKE ${p(params, `%${search}%`)} OR p.description ILIKE ${p(params, `%${search}%`)} OR p.code ILIKE ${p(params, `%${search}%`)})`;
  sql += ' ORDER BY p.created_at DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener compras' }); }
});

// GET reports: monthly spending by category
router.get('/reports/monthly', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month,
        TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') as month_label,
        category,
        SUM(amount) as total
      FROM purchases
      WHERE status NOT IN ('rechazada') AND amount IS NOT NULL
      GROUP BY DATE_TRUNC('month', date), category
      ORDER BY DATE_TRUNC('month', date) DESC
    `, []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al generar reporte' }); }
});

// GET stats summary
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'solicitud') as pendientes,
        COUNT(*) FILTER (WHERE status = 'autorizada') as autorizadas,
        COUNT(*) FILTER (WHERE status = 'en_ejecucion') as en_ejecucion,
        COALESCE(SUM(amount) FILTER (WHERE status NOT IN ('rechazada')), 0) as total_amount
      FROM purchases
    `, []);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener estadísticas' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.name as requested_by_name, s.name as supplier_full_name
       FROM purchases p
       LEFT JOIN users u ON p.requested_by = u.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al obtener compra' }); }
});

router.post('/', authenticateToken, async (req, res) => {
  const { supplier_id, supplier_name, description, amount, category = 'estandar', date, notes } = req.body;
  if (!supplier_name) return res.status(400).json({ error: 'El proveedor es requerido' });
  try {
    const code = await generatePurchaseCode();
    const { rows } = await query(
      `INSERT INTO purchases (code, supplier_id, supplier_name, description, amount, category, date, status, requested_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'solicitud',$8,$9) RETURNING *`,
      [code, supplier_id||null, supplier_name, description||null, amount||null, category,
       date || new Date().toISOString().split('T')[0], req.userId, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error POST /purchases:', err.message, err.stack);
    res.status(500).json({ error: 'Error al crear solicitud de compra', detail: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { supplier_id, supplier_name, description, amount, category, date,
          status, approved_by, rejection_reason, notes } = req.body;
  try {
    const updates = []; const params = [];
    if (supplier_id !== undefined)    updates.push(`supplier_id = ${p(params, supplier_id)}`);
    if (supplier_name)                updates.push(`supplier_name = ${p(params, supplier_name)}`);
    if (description !== undefined)    updates.push(`description = ${p(params, description)}`);
    if (amount !== undefined)         updates.push(`amount = ${p(params, amount)}`);
    if (category)                     updates.push(`category = ${p(params, category)}`);
    if (date)                         updates.push(`date = ${p(params, date)}`);
    if (status)                       updates.push(`status = ${p(params, status)}`);
    if (approved_by !== undefined)    updates.push(`approved_by = ${p(params, approved_by)}`);
    if (rejection_reason !== undefined) updates.push(`rejection_reason = ${p(params, rejection_reason)}`);
    if (notes !== undefined)          updates.push(`notes = ${p(params, notes)}`);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    if (updates.length === 1) return res.status(400).json({ error: 'No hay campos para actualizar' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE purchases SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar compra' }); }
});

// PATCH: quick status transition
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { status, approved_by, rejection_reason } = req.body;
  if (!status) return res.status(400).json({ error: 'El estado es requerido' });
  try {
    const { rows } = await query(
      `UPDATE purchases SET status=$1, approved_by=$2, rejection_reason=$3, updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [status, approved_by||null, rejection_reason||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar estado' }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
    res.json({ message: 'Compra eliminada' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar compra' }); }
});

export default router;
