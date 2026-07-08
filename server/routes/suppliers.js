import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
          score, notes, is_active, is_critical } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO suppliers
         (name, cuit, category, contact_name, contact_email, contact_phone,
          address, is_homologated, homologation_date, homologation_expiry,
          score, notes, is_active, is_critical)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [name, cuit||null, category||null, contact_name||null,
       contact_email||null, contact_phone||null, address||null,
       is_homologated||false, homologation_date||null, homologation_expiry||null,
       score||null, notes||null, is_active !== false, is_critical === true]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/suppliers/:id
router.patch('/:id', async (req, res) => {
  const FIELDS = ['name','cuit','category','contact_name','contact_email',
    'contact_phone','address','is_homologated','homologation_date',
    'homologation_expiry','score','notes','is_active','is_critical'];
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

// GET /api/suppliers/:id/evaluations — histórico F-TRI-17
router.get('/:id/evaluations', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const { rows } = await query(
      `SELECT e.*, u.full_name AS evaluated_by_name
         FROM supplier_evaluations e
         LEFT JOIN users u ON u.id = e.evaluated_by
        WHERE e.supplier_id = $1
        ORDER BY e.year DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('suppliers/evaluations GET error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/suppliers/:id/evaluations — evaluación anual F-TRI-17 (upsert por año).
// Tras guardar refleja en el proveedor el año más reciente: score = total,
// is_homologated = (result 'apto') y vigencia de homologación +1 año si es apto.
router.post('/:id/evaluations', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'ID inválido' });
  const { year, quality_score, payment_terms_score,
          price_quality_score, legal_compliance_score, observations } = req.body;
  const y = Number(year);
  const scores = [quality_score, payment_terms_score,
                  price_quality_score, legal_compliance_score].map(Number);
  if (!Number.isInteger(y) || y < 2000 || y > new Date().getFullYear() + 1 ||
      scores.some(s => !Number.isInteger(s) || s < 0 || s > 5)) {
    return res.status(400).json({ error: 'Año válido y 4 criterios con puntaje 0-5 son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO supplier_evaluations
         (supplier_id, year, quality_score, payment_terms_score,
          price_quality_score, legal_compliance_score, observations, evaluated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (supplier_id, year) DO UPDATE SET
         quality_score = EXCLUDED.quality_score,
         payment_terms_score = EXCLUDED.payment_terms_score,
         price_quality_score = EXCLUDED.price_quality_score,
         legal_compliance_score = EXCLUDED.legal_compliance_score,
         observations = EXCLUDED.observations,
         evaluated_by = EXCLUDED.evaluated_by
       RETURNING *`,
      [req.params.id, y, ...scores, observations || null, req.user.id]
    );
    const { rows: [latest] } = await query(
      'SELECT year, total, result FROM supplier_evaluations WHERE supplier_id = $1 ORDER BY year DESC LIMIT 1',
      [req.params.id]
    );
    // Reflejar en el proveedor solo si el año upserteado es el más reciente:
    // un backfill de un año viejo no debe re-extender la homologación desde hoy.
    if (latest.year === y) {
      await query(
        `UPDATE suppliers SET
           score = $1,
           is_homologated = $2,
           homologation_date   = CASE WHEN $2 THEN CURRENT_DATE ELSE homologation_date END,
           homologation_expiry = CASE WHEN $2 THEN (CURRENT_DATE + INTERVAL '1 year')::date ELSE homologation_expiry END
         WHERE id = $3`,
        [latest.total, latest.result === 'apto', req.params.id]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('suppliers/evaluations POST error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
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
