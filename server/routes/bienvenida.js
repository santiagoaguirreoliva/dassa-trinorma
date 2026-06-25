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
    if (rows[0].accepted_at === null) {
      return res.json({ accepted: false, seen_count: rows[0].landing_seen_count });
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
    // FIX 2026-06-25: este handler NUNCA seteaba accepted_at (ni en INSERT ni en
    // ON CONFLICT), así que el pacto quedaba en NULL para siempre y la pantalla de
    // Bienvenida reaparecía en cada visita (santiago la vio 131 veces). Ahora lo
    // persiste en ambas ramas; COALESCE conserva la fecha de la primera firma.
    const { rows } = await query(
      `INSERT INTO user_onboarding (user_id, pact_version, ip_address, user_agent, accepted_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET accepted_at  = COALESCE(user_onboarding.accepted_at, NOW()),
             pact_version = EXCLUDED.pact_version,
             ip_address   = EXCLUDED.ip_address,
             user_agent   = EXCLUDED.user_agent,
             last_seen_at = NOW()
       RETURNING accepted_at`,
      [req.user.id, '1.0', ip, ua]
    );
    res.json({ ok: true, accepted_at: rows[0]?.accepted_at });
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

// GET pacto-status (admin/auditor) - lista todos con su estado
router.get('/pacto-status', async (req, res) => {
  if (!['master_admin','auditor_externo'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Solo master_admin o auditor_externo' });
  }
  try {
    const { rows } = await query(`SELECT u.id, u.email, u.full_name, u.role, uo.accepted_at, uo.landing_seen_count, uo.last_seen_at FROM users u LEFT JOIN user_onboarding uo ON uo.user_id = u.id WHERE u.is_active = true ORDER BY u.role, u.full_name`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST send-welcome-email (master_admin) - envia email a 1 o todos
router.post('/send-welcome-email', async (req, res) => {
  if (req.user.role !== 'master_admin') return res.status(403).json({ error: 'Solo master_admin' });
  const { target_email, send_to_all } = req.body || {};
  try {
    const fs = await import('fs');
    const { join } = await import('path');
    const tplPath = join(process.cwd(), 'server', 'email-templates', 'bienvenida.html');
    const tpl = fs.readFileSync(tplPath, 'utf8');
    let rows;
    if (send_to_all) {
      const r = await query("SELECT email, full_name FROM users WHERE is_active=true AND email != $1", [req.user.email]);
      rows = r.rows;
    } else {
      if (!target_email) return res.status(400).json({ error: 'target_email requerido' });
      const r = await query("SELECT email, full_name FROM users WHERE email = $1", [target_email]);
      rows = r.rows;
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Sin destinatarios' });
    const { createRequire } = await import('module');
    const reqCjs = createRequire(import.meta.url);
    const mailer = reqCjs('../services/mailer.cjs');
    const results = [];
    for (const u of rows) {
      const html = tpl.replaceAll('{{NOMBRE}}', u.full_name || u.email).replaceAll('{{EMAIL}}', u.email);
      try {
        await mailer.sendMail({ to: u.email, subject: 'Bienvenida a TRINORMA - DASSA SGI', html });
        results.push({ email: u.email, ok: true });
      } catch (err) {
        results.push({ email: u.email, ok: false, error: String(err.message || err) });
      }
    }
    res.json({ sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET health-deep
router.get('/health-deep', async (req, res) => {
  const checks = {};
  try { const r = await query('SELECT 1 AS ok'); checks.db = r.rows[0]?.ok === 1 ? 'ok' : 'fail'; } catch (e) { checks.db = 'fail'; }
  try {
    const fs = await import('fs'); const { join } = await import('path');
    checks.dist = fs.existsSync(join(process.cwd(),'dist','index.html')) ? 'ok' : 'missing';
    checks.ai_quality_module = fs.existsSync(join(process.cwd(),'server','services','ai-quality.cjs')) ? 'ok' : 'missing';
    checks.email_template = fs.existsSync(join(process.cwd(),'server','email-templates','bienvenida.html')) ? 'ok' : 'missing';
  } catch (e) { checks.files = 'fail'; }
  try { const r = await query("SELECT COUNT(*)::int AS n FROM users WHERE is_active=true"); checks.active_users = r.rows[0].n; } catch (e) { checks.users = 'fail'; }
  const allOk = Object.values(checks).every(v => v === 'ok' || typeof v === 'number');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() });
});

// GET admin/news-all (master_admin) - lista TODOS sin filtrar audiencia
router.get('/admin/news-all', async (req, res) => {
  if (req.user.role !== 'master_admin') return res.status(403).json({ error: 'Solo master_admin' });
  try {
    const { rows } = await query("SELECT * FROM system_announcements ORDER BY pinned DESC, published_at DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST admin/news - crear
router.post('/admin/news', async (req, res) => {
  if (req.user.role !== 'master_admin') return res.status(403).json({ error: 'Solo master_admin' });
  const { title, body_md, category, audience, pinned, expires_at } = req.body || {};
  if (!title || !body_md) return res.status(400).json({ error: 'title y body_md requeridos' });
  try {
    const { rows } = await query(
      "INSERT INTO system_announcements (title, body_md, category, audience, pinned, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [title, body_md, category || 'novedad', audience || 'all', !!pinned, expires_at || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH admin/news/:id - editar
router.patch('/admin/news/:id', async (req, res) => {
  if (req.user.role !== 'master_admin') return res.status(403).json({ error: 'Solo master_admin' });
  const { title, body_md, category, audience, pinned, expires_at } = req.body || {};
  try {
    const { rows } = await query(
      "UPDATE system_announcements SET title=COALESCE($1,title), body_md=COALESCE($2,body_md), category=COALESCE($3,category), audience=COALESCE($4,audience), pinned=COALESCE($5,pinned), expires_at=$6 WHERE id=$7 RETURNING *",
      [title, body_md, category, audience, pinned, expires_at, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No existe' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE admin/news/:id
router.delete('/admin/news/:id', async (req, res) => {
  if (req.user.role !== 'master_admin') return res.status(403).json({ error: 'Solo master_admin' });
  try {
    await query("DELETE FROM system_announcements WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
