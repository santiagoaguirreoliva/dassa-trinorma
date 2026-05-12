// /api/onboarding · Landing de bienvenida + pacto firmable
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

// GET /api/onboarding/status · ¿el user ya acepto el pacto?
router.get('/status', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT user_id, pact_version, accepted_at, landing_seen_count FROM user_onboarding WHERE user_id = $1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({ accepted: false, seen_count: 0 });
    }
    res.json({
      accepted: true,
      pact_version: rows[0].pact_version,
      accepted_at: rows[0].accepted_at,
      seen_count: rows[0].landing_seen_count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/onboarding/accept-pact · marca aceptacion
router.post('/accept-pact', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get('user-agent') || null;
    await query(
      `INSERT INTO user_onboarding (user_id, pact_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
         SET landing_seen_count = user_onboarding.landing_seen_count + 1,
             last_seen_at = NOW()`,
      [req.user.id, '1.0', ip, ua]
    );
    res.json({ ok: true, accepted_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/onboarding/seen · solo incrementa el contador (NO acepta)
router.post('/seen', async (req, res) => {
  try {
    await query(
      `INSERT INTO user_onboarding (user_id, accepted_at, pact_version, landing_seen_count, last_seen_at)
       VALUES ($1, NULL, '1.0', 1, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET landing_seen_count = user_onboarding.landing_seen_count + 1,
             last_seen_at = NOW()`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/bienvenida/news · novedades visibles para el user
router.get('/news', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, body_md, category, pinned, published_at
         FROM system_announcements
        WHERE (expires_at IS NULL OR expires_at > NOW())
          AND (audience = 'all' OR audience = $1 OR audience LIKE '%' || $2 || '%')
        ORDER BY pinned DESC, published_at DESC
        LIMIT 10`,
      [req.user.role, req.user.email]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
