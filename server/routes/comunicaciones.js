// =============================================================================
// /api/comunicaciones · sistema de comunicaciones formales
// Incluye endpoint público /c/:token (sin auth) para lectura externa
// =============================================================================
import express from 'express';
import crypto from 'crypto';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
const publicRouter = express.Router();

// ─── PÚBLICO · sin authenticate ─────────────────────────────────────────────
publicRouter.get('/c/:token', async (req, res) => {
  try {
    const { rows: comm } = await query(`
      SELECT c.id, c.code, c.title, c.body_md, c.category, c.norma,
             c.sent_at, u.full_name AS sender_name
      FROM communications c LEFT JOIN users u ON u.id = c.sender_id
      WHERE c.public_token = $1 AND c.status = 'enviada'
    `, [req.params.token]);
    if (!comm[0]) return res.status(404).json({ error: 'Link inválido o comunicación no enviada' });

    // Registrar lectura (sin user_id si es externo)
    await query(`
      INSERT INTO communication_reads (communication_id, read_via, ip_address, user_agent)
      VALUES ($1, 'web_link_public', $2, $3)
    `, [comm[0].id, req.ip, req.headers['user-agent'] || null]).catch(() => {});

    res.json({ ok: true, communication: comm[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

publicRouter.post('/c/:token/confirm', async (req, res) => {
  try {
    const { confirmed_by_name, feedback } = req.body || {};
    const { rows: comm } = await query(`SELECT id FROM communications WHERE public_token = $1`, [req.params.token]);
    if (!comm[0]) return res.status(404).json({ error: 'Token inválido' });
    await query(`
      INSERT INTO communication_reads (communication_id, read_via, confirmed_at, ip_address, user_agent, feedback_notes, device_info)
      VALUES ($1, 'web_link_public', NOW(), $2, $3, $4, $5)
    `, [comm[0].id, req.ip, req.headers['user-agent']||null, feedback||null, confirmed_by_name||null]);
    res.json({ ok: true, message: 'Lectura confirmada · ¡Gracias!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AUTENTICADOS ──────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/templates', async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM communication_templates WHERE is_active = TRUE ORDER BY element`);
    res.json({ ok: true, templates: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status && status !== 'todas') { params.push(status); where = `WHERE c.status = $${params.length}`; }
    const { rows } = await query(`
      SELECT c.*, u.full_name AS sender_name,
             (SELECT COUNT(*) FROM communication_recipients WHERE communication_id = c.id) AS num_recipients,
             (SELECT COUNT(*) FROM communication_reads WHERE communication_id = c.id) AS num_reads,
             (SELECT COUNT(*) FROM communication_reads WHERE communication_id = c.id AND confirmed_at IS NOT NULL) AS num_confirmed
      FROM communications c LEFT JOIN users u ON u.id = c.sender_id
      ${where}
      ORDER BY c.created_at DESC LIMIT 50
    `, params);
    res.json({ ok: true, communications: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: c } = await query(`SELECT c.*, u.full_name AS sender_name FROM communications c LEFT JOIN users u ON u.id = c.sender_id WHERE c.id = $1`, [req.params.id]);
    if (!c[0]) return res.status(404).json({ error: 'No encontrada' });
    const { rows: recipients } = await query(`
      SELECT cr.*,
             u.full_name AS user_name, e.full_name AS employee_name,
             jp.role_label AS profile_name,
             (SELECT COUNT(*) FROM communication_reads cre WHERE cre.recipient_id = cr.id AND cre.confirmed_at IS NOT NULL) > 0 AS confirmed
      FROM communication_recipients cr
      LEFT JOIN users u ON u.id = cr.user_id
      LEFT JOIN employees e ON e.id = cr.employee_id
      LEFT JOIN job_profiles jp ON jp.id = cr.job_profile_id
      WHERE cr.communication_id = $1
    `, [req.params.id]);
    const { rows: reads } = await query(`
      SELECT cre.*, u.full_name AS user_name FROM communication_reads cre LEFT JOIN users u ON u.id = cre.user_id
      WHERE cre.communication_id = $1 ORDER BY cre.read_at DESC LIMIT 50
    `, [req.params.id]);
    res.json({ ok: true, communication: c[0], recipients, reads });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, body_md, category, norma, scope, expires_at, recipients = [] } = req.body || {};
    if (!title || !body_md) return res.status(400).json({ error: 'title y body_md requeridos' });
    const code = `COM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const token = crypto.randomBytes(24).toString('hex');
    const { rows } = await query(`
      INSERT INTO communications (code, title, body_md, category, norma, sender_id, scope, public_token, expires_at, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'borrador') RETURNING *
    `, [code, title, body_md, category || 'info', norma || null, req.user.id, scope || 'internal', token, expires_at || null]);
    const comm = rows[0];

    // Insertar recipients
    for (const r of recipients) {
      await query(`
        INSERT INTO communication_recipients (communication_id, user_id, employee_id, job_profile_id, area, is_external, external_name, external_email, external_phone, delivery_channels)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [comm.id, r.user_id||null, r.employee_id||null, r.job_profile_id||null, r.area||null, r.is_external||false, r.external_name||null, r.external_email||null, r.external_phone||null, r.delivery_channels||['web']]);
    }

    res.status(201).json({ ok: true, communication: comm });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { rows } = await query(`UPDATE communications SET status = 'enviada', sent_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'borrador' RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(409).json({ error: 'Comunicación no encontrada o ya enviada' });
    const publicUrl = `${process.env.APP_URL || 'https://trinorma.dassa.com.ar'}/c/${rows[0].public_token}`;
    res.json({ ok: true, communication: rows[0], public_url: publicUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INBOX NIXA · cosas pendientes de validación ────────────────────────────
router.get('/nixa-inbox', requireRole('auditor_externo','master_admin','director'), async (req, res) => {
  try {
    const { rows: pendingValidation } = await query(`
      SELECT r.id, r.entity_type, r.status, r.scheduled_for,
             rc.year AS cycle_year,
             CASE WHEN review_is_blocked(r.id) THEN 'esperando_deps' ELSE 'lista' END AS bloqueo
      FROM reviews r
      LEFT JOIN review_cycles rc ON rc.id = r.cycle_id
      WHERE r.validator_id IN (SELECT id FROM users WHERE role::text = 'auditor_externo')
        AND r.status IN ('en_revision','programada','bloqueada')
      ORDER BY (r.status = 'en_revision') DESC, r.scheduled_for NULLS LAST
    `);
    const { rows: counts } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'en_revision') AS para_validar,
        COUNT(*) FILTER (WHERE status = 'programada') AS programadas,
        COUNT(*) FILTER (WHERE status = 'bloqueada') AS bloqueadas,
        COUNT(*) FILTER (WHERE status = 'validada') AS validadas_total
      FROM reviews
      WHERE validator_id IN (SELECT id FROM users WHERE role::text = 'auditor_externo')
    `);
    res.json({ ok: true, items: pendingValidation, summary: counts[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { router as default, publicRouter };
