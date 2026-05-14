/**
 * routes/sso.js — endpoint para SSO desde Smart DASSA Apps (app madre).
 *
 * GET /api/sso/consume?ticket=XXX&next=/
 *   1. Recibe ticket emitido por SDA
 *   2. POST a SDA /api/sso/redeem con HMAC server-to-server
 *   3. Find-or-create user en tabla users de Trinorma por email
 *   4. Emite JWT compatible con flujo de auth.js (payload {userId, role})
 *   5. Devuelve HTML mínimo que setea localStorage `dassa_token` y redirige
 *
 * No reemplaza /api/auth/login — coexisten durante la transición.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';

const router = Router();

const APP_KEY = 'trinorma';

/** Map app_role de SDA → app_role de Trinorma (enum válido). */
function mapAppRoleToTrinorma(appRole) {
  const r = String(appRole || '').toLowerCase();
  if (r === 'admin' || r === 'superadmin' || r === 'director') return 'director';
  if (r === 'sgi_leader' || r === 'leader') return 'sgi_leader';
  if (r === 'seguridad_higiene' || r === 'sh') return 'seguridad_higiene';
  if (r === 'rrhh' || r === 'hr') return 'rrhh';
  if (r === 'auditor' || r === 'auditor_externo') return 'auditor_externo';
  return 'operaciones';
}

/** POST a SDA via loopback. */
function ssoRedeem(ticket) {
  return new Promise((resolve, reject) => {
    const secret = process.env.DASSA_APPS_SSO_SECRET || '';
    const url = process.env.DASSA_APPS_SSO_URL || 'http://127.0.0.1:3040';
    const signature = crypto.createHmac('sha256', secret).update(ticket + ':' + APP_KEY).digest('hex');
    const data = JSON.stringify({ ticket, app_key: APP_KEY, signature });
    const u = new URL(url + '/api/sso/redeem');
    const opts = {
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-dassa-app-key': APP_KEY,
      },
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 0, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode || 0, body: { raw: buf } }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('sso_timeout')));
    req.write(data);
    req.end();
  });
}

// ── GET /api/sso/consume ─────────────────────────────────────────────────

router.get('/consume', async (req, res) => {
  try {
    const ticket = String(req.query.ticket || '');
    const next = String(req.query.next || '/');
    if (!ticket) return res.status(400).send('<h1>400 · Falta ticket</h1>');

    let resp;
    try {
      resp = await ssoRedeem(ticket);
    } catch (e) {
      console.error('[sso] redeem error:', e?.message);
      return res.status(502).send('<h1>502 · SSO no disponible · ' + (e?.message || 'unknown') + '</h1>');
    }
    if (resp.status !== 200 || !resp.body?.ok || !resp.body?.user) {
      const err = resp.body?.error || 'invalid_ticket';
      return res.status(401).send('<h1>401 · Ticket inválido · ' + err + '</h1>');
    }

    const ssoUser = resp.body.user;
    const appRole = resp.body.app_role;

    const email = String(ssoUser.email).toLowerCase();
    const fullName = ssoUser.full_name || ssoUser.email;
    const role = mapAppRoleToTrinorma(appRole);

    // Find-or-create user en Trinorma
    let { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      const placeholder = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const ins = await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, last_login)
         VALUES ($1, $2, $3, $4, true, NOW())
         RETURNING *`,
        [email, placeholder, fullName, role]
      );
      user = ins.rows[0];
      console.log('[sso] usuario nuevo creado via SSO:', email, role);
    } else {
      if (!user.is_active) {
        return res.status(403).send('<h1>403 · Usuario inactivo en Trinorma</h1>');
      }
      // Actualizar role si difiere (SDA es la fuente de verdad)
      if (user.role !== role) {
        await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, user.id]);
        user.role = role;
      }
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    }

    // Emitir JWT compatible con el flujo normal
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeNext = next.startsWith('/') ? next : '/';
    const tokenJson = JSON.stringify(token);
    const nextJson = JSON.stringify(safeNext);

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Ingresando a Trinorma · Smart DASSA Apps</title>
  <meta name="robots" content="noindex">
  <style>
    body { background: #0a1224; color: #e8edf4; font-family: system-ui, -apple-system, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .b { text-align: center; }
    .s { color: #D4A24C; font-size: 1.4rem; margin-bottom: 1rem; }
    .h { font-size: 0.9rem; opacity: 0.65; }
  </style>
</head>
<body>
  <div class="b">
    <div class="s">✓ Identificado vía Smart DASSA Apps</div>
    <div class="h">Cargando Trinorma SGI…</div>
  </div>
  <script>
    try {
      localStorage.setItem('dassa_token', ${tokenJson});
    } catch (e) { console.error('SSO storage error', e); }
    location.replace(${nextJson});
  </script>
</body>
</html>`;
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[sso/consume] fatal:', e);
    res.status(500).send('<h1>500 · SSO error</h1>');
  }
});

// ── POST /api/sso/logout · best-effort ───────────────────────────────────

router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

// ── GET /api/sso/health ──────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app_key: APP_KEY,
    sso_url: process.env.DASSA_APPS_SSO_URL || 'http://127.0.0.1:3040',
    secret_configured: !!process.env.DASSA_APPS_SSO_SECRET,
  });
});

export default router;
