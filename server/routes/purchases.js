import { Router } from 'express';
import { createRequire } from 'module';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const require = createRequire(import.meta.url);
const { parseProductInfo } = require('../services/url-importer.cjs');

const router = Router();
router.use(authenticate);

// ─── Helper: permisos del usuario ──────────────────────────
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

// ═══════════════════════════════════════════════════════════
// PURCHASE PERMISSIONS (admin) — must be BEFORE /:id routes
// ═══════════════════════════════════════════════════════════

// GET /api/purchases/permissions-all — lista todos los permisos
router.get('/permissions-all', async (req, res) => {
  if (!['master_admin', 'director', 'sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin acceso' });
  }
  try {
    const { rows } = await query('SELECT * FROM purchase_permissions');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/purchases/permissions/:userId — crear o actualizar permisos
router.put('/permissions/:userId', async (req, res) => {
  if (!['master_admin', 'director'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Solo admin puede cambiar permisos' });
  }
  const { can_request, can_authorize, can_execute } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO purchase_permissions (user_id, can_request, can_authorize, can_execute)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET can_request = $2, can_authorize = $3, can_execute = $4
       RETURNING *`,
      [req.params.userId, !!can_request, !!can_authorize, !!can_execute]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// PURCHASES CRUD
// ═══════════════════════════════════════════════════════════

// GET /api/purchases — lista con joins y búsqueda
router.get('/', async (req, res) => {
  const { status, category, search } = req.query;
  const where = ['1=1'];
  const params = [];
  let i = 1;
  if (status)   { where.push(`p.status = $${i++}`);   params.push(status); }
  if (category) { where.push(`p.category = $${i++}`); params.push(category); }
  if (search)   { where.push(`(p.description ILIKE $${i} OR p.code ILIKE $${i} OR p.recommended_supplier ILIKE $${i} OR p.supplier_name ILIKE $${i})`); params.push(`%${search}%`); i++; }

  try {
    const { rows } = await query(
      `SELECT p.*,
              COALESCE(req.full_name, p.requester_name) AS requested_by_name,
              apr.full_name  AS approved_by_name,
              exe.full_name  AS executed_by_name,
              (SELECT COUNT(*) FROM purchase_comments pc WHERE pc.purchase_id = p.id)::int AS comments_count
         FROM purchases p
         LEFT JOIN users req ON req.id = p.requested_by
         LEFT JOIN users apr ON apr.id = p.approved_by
         LEFT JOIN users exe ON exe.id = p.executed_by
        WHERE ${where.join(' AND ')}
        ORDER BY
          CASE WHEN p.status IN ('borrador','aprobada','en_ejecucion') THEN 0 ELSE 1 END,
          CASE p.priority
            WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3
          END,
          p.created_at DESC`,
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

// GET /api/purchases/permissions — todos (solo admin)
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

// POST /api/purchases/permissions — guardar permisos
router.post('/permissions', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { permissions } = req.body;
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

// GET /api/purchases/stats
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

// GET /api/purchases/:id — detalle con comentarios
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
              COALESCE(req.full_name, p.requester_name) AS requested_by_name,
              apr.full_name AS approved_by_name,
              exe.full_name AS executed_by_name
         FROM purchases p
         LEFT JOIN users req ON req.id = p.requested_by
         LEFT JOIN users apr ON apr.id = p.approved_by
         LEFT JOIN users exe ON exe.id = p.executed_by
        WHERE p.id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    const { rows: comments } = await query(
      `SELECT c.*, u.full_name AS user_name
         FROM purchase_comments c
         LEFT JOIN users u ON u.id = c.user_id
        WHERE c.purchase_id = $1
        ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...rows[0], comments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/purchases — crear solicitud
router.post('/', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_request) return res.status(403).json({ error: 'Sin permiso para crear solicitudes' });

  const { description, category, priority, estimated_budget,
          required_date, purpose, recommended_supplier, requesting_area,
          source_url, long_description, item_specs, photo_urls, quantity } = req.body;
  if (!description) return res.status(400).json({ error: 'Descripción requerida' });

  try {
    const { rows } = await query(
      `INSERT INTO purchases
         (description, category, priority, estimated_budget, required_date,
          purpose, recommended_supplier, requesting_area, requested_by, status,
          source_url, long_description, item_specs, photo_urls, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'borrador',$10,$11,$12,$13,$14)
       RETURNING *`,
      [description, category || 'general', priority || 'media',
       estimated_budget || null, required_date || new Date().toISOString().split('T')[0],
       purpose || null, recommended_supplier || null, requesting_area || null, req.user.id,
       source_url || null, long_description || null,
       item_specs ? JSON.stringify(item_specs) : null,
       photo_urls && Array.isArray(photo_urls) ? photo_urls : null,
       Number.isInteger(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : null]
    );

    // Notificar a usuarios con permiso de autorizar
    const { rows: authorizers } = await query(
      `SELECT u.id FROM users u
       INNER JOIN purchase_permissions pp ON pp.user_id = u.id
       WHERE pp.can_authorize = true AND u.id != $1
       UNION
       SELECT id FROM users WHERE role IN ('master_admin','director') AND id != $1`,
      [req.user.id]
    );
    for (const a of authorizers) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','purchases')`,
        [a.id, `Nueva solicitud de compra: ${rows[0].code}`,
         `${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`]
      );
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/purchases/parse-product-info — CAPA 2 · IA parsea URL y/o texto pegado
router.post('/parse-product-info', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_request) return res.status(403).json({ error: 'Sin permiso para crear solicitudes' });

  const { url, text } = req.body || {};
  try {
    const data = await parseProductInfo({ url: url?.trim(), text: text?.trim() });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[purchases/parse-product-info]', e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Alias compat (mismo handler) para deploys que ya cachearon el endpoint viejo
router.post('/import-from-url', async (req, res) => {
  const perms = await getPerms(req.user.id, req.user.role);
  if (!perms.can_request) return res.status(403).json({ error: 'Sin permiso para crear solicitudes' });
  const { url, text } = req.body || {};
  try {
    const data = await parseProductInfo({ url: url?.trim(), text: text?.trim() });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// PATCH /api/purchases/:id — editar campos (borrador o rechazada para re-enviar)
router.patch('/:id', async (req, res) => {
  const FIELDS = ['description','category','priority','estimated_budget',
                  'required_date','purpose','recommended_supplier','requesting_area',
                  'source_url','long_description','item_specs','photo_urls','quantity'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      // item_specs es JSONB — stringify si llega como objeto
      values.push(f === 'item_specs' && typeof req.body[f] === 'object' && req.body[f] !== null
        ? JSON.stringify(req.body[f])
        : req.body[f]);
    }
  }
  // Allow re-submitting a rejected purchase
  if (req.body.resubmit) {
    updates.push(`status = $${i++}`); values.push('borrador');
    updates.push(`approved_by = $${i++}`); values.push(null);
    updates.push(`approved_at = $${i++}`); values.push(null);
    updates.push(`approval_notes = $${i++}`); values.push(null);
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE purchases SET ${updates.join(', ')} WHERE id = $${i} AND status IN ('borrador','rechazada') RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada o estado no permite edición' });
    res.json(rows[0]);
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

// PATCH /api/purchases/:id/cancel — cancelar desde cualquier estado (excepto completada)
router.patch('/:id/cancel', async (req, res) => {
  const { reason } = req.body;
  try {
    const { rows } = await query(
      `UPDATE purchases SET status = 'cancelada'
        WHERE id = $1 AND status NOT IN ('completada','cancelada')
        RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada o no se puede cancelar' });

    // Add cancellation comment
    if (reason) {
      await query(
        `INSERT INTO purchase_comments (purchase_id, user_id, content)
         VALUES ($1, $2, $3)`,
        [req.params.id, req.user.id, `Cancelada: ${reason}`]
      );
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/purchases/:id — eliminar (solo borrador o cancelada)
router.delete('/:id', async (req, res) => {
  try {
    // Eliminar dependencias
    await query('DELETE FROM purchase_comments WHERE purchase_id=$1', [req.params.id]);
    const { rowCount } = await query(
      `DELETE FROM purchases WHERE id=$1 AND status IN ('borrador','cancelada','rechazada')`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'No encontrada o estado no permite eliminación' });
    res.json({ message: 'Solicitud eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════

// GET /api/purchases/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.full_name AS user_name
         FROM purchase_comments c
         LEFT JOIN users u ON u.id = c.user_id
        WHERE c.purchase_id = $1
        ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/purchases/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO purchase_comments (purchase_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/purchases/:id/comments/:cid
router.delete('/:id/comments/:cid', async (req, res) => {
  try {
    await query('DELETE FROM purchase_comments WHERE id=$1 AND user_id=$2',
      [req.params.cid, req.user.id]);
    res.json({ message: 'Comentario eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
