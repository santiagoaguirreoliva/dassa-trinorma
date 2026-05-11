// /api/calendar · Calendar events + Calendario NIXA + firma digital
import express from 'express';
import crypto from 'crypto';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

// GET /api/calendar/nixa/:year · genera eventos del calendar anual NIXA
router.get('/nixa/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { rows: reviews } = await query(`
      SELECT r.id, r.entity_type, r.status, r.scheduled_for, r.validated_at,
             u_rev.full_name AS reviewer_name, u_val.full_name AS validator_name
      FROM reviews r
      LEFT JOIN review_cycles rc ON rc.id = r.cycle_id
      LEFT JOIN users u_rev ON u_rev.id = r.reviewer_id
      LEFT JOIN users u_val ON u_val.id = r.validator_id
      WHERE rc.year = $1
      ORDER BY r.scheduled_for
    `, [year]);

    // Cada review genera un evento de calendar
    const events = reviews.map(r => ({
      id: r.id,
      title: `Validar: ${r.entity_type}`,
      date: r.scheduled_for,
      status: r.status,
      reviewer: r.reviewer_name,
      validator: r.validator_name,
      validated_at: r.validated_at,
      type: 'review',
      color: r.status==='validada' ? '#10B981' : r.status==='bloqueada' ? '#9CA3AF' : '#F59E0B'
    }));

    // Agregar requisitos legales que vencen este año
    const { rows: legal } = await query(`
      SELECT id, code, title, expiration_date
      FROM legal_requirements
      WHERE is_active = TRUE
        AND EXTRACT(year FROM expiration_date) = $1
    `, [year]);
    legal.forEach(l => events.push({
      id: l.id, title: `Vence: ${l.title}`,
      date: l.expiration_date, type: 'legal', color: '#EF4444'
    }));

    res.json({ ok: true, year, events });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/calendar/sign/:reviewId · firma digital de una review
router.post('/sign/:reviewId', async (req, res) => {
  try {
    const { rows: r } = await query('SELECT * FROM reviews WHERE id = $1', [req.params.reviewId]);
    if (!r[0]) return res.status(404).json({ error: 'Review no encontrada' });
    if (r[0].validator_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el validator puede firmar' });
    }
    if (r[0].status !== 'validada') {
      return res.status(409).json({ error: 'La review debe estar validada antes de firmar' });
    }

    const snapshot = {
      review_id: r[0].id,
      entity_type: r[0].entity_type,
      status: r[0].status,
      validated_at: r[0].validated_at,
      notes: r[0].notes,
      signed_by_user_id: req.user.id,
      signed_by_name: req.user.full_name,
      timestamp: new Date().toISOString(),
    };
    const hash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

    const { rows: sig } = await query(`
      INSERT INTO validation_signatures (review_id, signed_by, payload_hash, snapshot_data, ip_address, user_agent, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (review_id, signed_by) DO UPDATE SET signed_at = NOW(), payload_hash = EXCLUDED.payload_hash
      RETURNING *
    `, [r[0].id, req.user.id, hash, JSON.stringify(snapshot), req.ip, req.headers['user-agent']||null, req.body?.notes||null]);
    res.json({ ok: true, signature: sig[0], hash, snapshot });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/calendar/sign/:reviewId/verify · verificar firma
router.get('/sign/:reviewId/verify', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT vs.*, u.full_name AS signer_name
      FROM validation_signatures vs
      JOIN users u ON u.id = vs.signed_by
      WHERE vs.review_id = $1
    `, [req.params.reviewId]);
    if (!rows[0]) return res.json({ ok: true, signed: false });

    // Recalcular hash y comparar
    const recalculated = crypto.createHash('sha256').update(JSON.stringify(rows[0].snapshot_data)).digest('hex');
    const valid = recalculated === rows[0].payload_hash;
    res.json({ ok: true, signed: true, valid, signature: rows[0], recalculated_hash: recalculated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
