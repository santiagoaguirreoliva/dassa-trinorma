import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ─── Helper: obtener permisos del usuario ────────────────────
async function getPerms(userId, role) {
  if (['master_admin', 'director'].includes(role)) {
    return { can_request: true, can_authorize: true, can_execute: true };
  }
  const { rows } = await query(
    `SELECT can_request, can_authorize, can_execute
       FROM purchase_permissions WHERE user_id = $1`, [userId]
  );
  return rows[0] || { can_request: false, can_authorize: false, can_execute: false };
}

// GET /api/purchases — lista con joins
router.get('/', async (req, res) => {
  const { status, category } = req.query;
  const where = ['1=1'];
  const params = [];
  let i = 1;
  if (status)   { where.push(`p.status = $${i++}`);   params.push(status); }
  if (category) { where.push(`p.category = $${i++}`); params.push(category); }

  try {
    const { rows } = await query(
      `SELECT p.*,
              req.full_name  AS requested_by_name,
              apr.full_name  AS approved_by_name,
              exe.full_name  AS executed_by_name
         FROM purchases p
         LEFT JOIN users req ON req.id = p.requested_by
         LEFT JOIN users apr ON apr.id = p.approved_by
         LEFT JOIN users exe ON exe.id = p.executed_by
        WHERE ${where.join(' AND ')}
        ORDER BY p.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/purchases/my-permissions
router.get('/my-permissions', async (req, res) => {
  try {
    const perms = await getPerms(req.user.id, req.user.role);
    res.json(perms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/purchases/permissions — todos los usuarios (solo admin)
router.get('/permissions', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.email, u.role,
              COALESCE(pp.can_request, false)   AS can_request,
              COALESCE(pp.can_authorize, false) AS can_authorize,
              COALESCE(pp.can_execute, false)   AS can_execute
         FROM users u
         LEFT JOIN purchase_permissions pp ON pp.user_id = u.id
        WHERE u.is_active = true
        ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/purchases/permissions — guardar permisos (solo admin)
router.post('/permissions', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { permissions } = req.body; // [{ user_id, can_request, can_authorize, can_execute }]
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array requerido' });
  try {
    for (const p of permissions) {
      await query(
        `INSERT INTO purchase_permissions (user_id, can_request, can_authorize, can_execute)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id) DO UPDATE
           SET can_request=$2, can_authorize=$3, can_execute=$4, updated_at=NOW()`,
        [p.user_id, p.can_request, p.can_authorize, p.can_execute]
      );
    }
    res.json({ message: 'Permisos guardados' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/purchases — crear solicitud
router.post('/', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_request) return res.status(403).json({ error: 'Sin permiso para crear solicitudes' });

  const { description, category, priority, estimated_budget,
          required_date, purpose, recommended_supplier } = req.body;
  if (!description) return res.status(400).json({ error: 'Descripción requerida' });

  try {
    const { rows } = await query(
      `INSERT INTO purchases
         (description, category, priority, estimated_budget, required_date,
          purpose, recommended_supplier, requested_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'borrador')
       RETURNING *`,
      [description, category || 'general', priority || 'media',
       estimated_budget || null, required_date || null,
       purpose || null, recommended_supplier || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/purchases/:id/authorize — aprobar o rechazar
router.patch('/:id/authorize', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_authorize) return res.status(403).json({ error: 'Sin permiso para autorizar' });

  const { approve, notes, deferred_until } = req.body;
  try {
    const newStatus = approve ? 'aprobada' : 'rechazada';
    const { rows } = await query(
      `UPDATE purchases
          SET status = $1, approved_by = $2, approved_at = NOW(),
              approval_notes = $3, deferred_until = $4
        WHERE id = $5 AND status = 'borrador'
        RETURNING *`,
      [newStatus, req.user.id, notes || null, deferred_until || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada o ya procesada' });

    // Notificar al solicitante
    if (rows[0].requested_by !== req.user.id) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,$4,'purchases')`,
        [rows[0].requested_by,
         `Compra ${rows[0].code} ${approve ? 'aprobada' : 'rechazada'}`,
         notes || (approve ? 'Tu solicitud fue aprobada' : 'Tu solicitud fue rechazada'),
         approve ? 'success' : 'danger']
      );
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/purchases/:id/execute — marcar en ejecución
router.patch('/:id/execute', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_execute) return res.status(403).json({ error: 'Sin permiso para ejecutar' });
  try {
    const { rows } = await query(
      `UPDATE purchases
          SET status = 'en_ejecucion', executed_by = $1
        WHERE id = $2 AND status = 'aprobada'
        RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada o estado incorrecto' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/purchases/:id/receive — registrar recepción
router.patch('/:id/receive', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_execute) return res.status(403).json({ error: 'Sin permiso' });
  const { purchase_date, amount, supplier_name, invoice_number, notes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE purchases
          SET status = 'completada', purchase_date = $1, amount = $2,
              supplier_name = $3, invoice_number = $4, payment_method = $5
        WHERE id = $6 AND status = 'en_ejecucion'
        RETURNING *`,
      [purchase_date || null, amount || null, supplier_name || null,
       invoice_number || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada o estado incorrecto' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/purchases/:id/close — cerrar compra
router.patch('/:id/close', async (req, res) => {
  const { detail_of_use } = req.body;
  try {
    const { rows } = await query(
      `UPDATE purchases
          SET status = 'cancelada'
        WHERE id = $1 AND status = 'completada'
        RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/purchases/:id — editar campos básicos (solo borrador)
router.patch('/:id', async (req, res) => {
  const FIELDS = ['description','category','priority','estimated_budget',
                  'required_date','purpose','recommended_supplier'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE purchases SET ${updates.join(', ')} WHERE id = $${i} AND status = 'borrador' RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/purchases/stats — para reportes
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         to_char(created_at, 'YYYY-MM') AS month,
         category,
         SUM(COALESCE(amount, estimated_budget, 0)) AS total,
         COUNT(*)::int AS count
       FROM purchases
       WHERE status IN ('completada','en_ejecucion')
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY 1, 2
       ORDER BY 1`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
