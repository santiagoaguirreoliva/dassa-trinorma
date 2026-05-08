// =============================================================================
// DASSA SGI — Auth: forgot-password + reset-password
// Se monta en: app.use('/api/auth', authExtraRouter)
// =============================================================================
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { sendPasswordReset } = require('../services/mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// Rate limiting simple en memoria (por IP)
const attempts = new Map();
function rateLimit(ip, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < windowMs);
  list.push(now);
  attempts.set(ip, list);
  return list.length <= max;
}

// POST /api/auth/forgot-password { email }
router.post('/forgot-password', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Esperá 15 minutos.' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  // Respuesta genérica siempre — no revelar si existe el email
  const genericResponse = {
    ok: true,
    message: 'Si el email existe, vas a recibir un link de recuperación.',
  };

  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      // No revelar — devolvemos OK pero no mandamos nada
      console.log(`[auth] forgot-password para email no encontrado/inactivo: ${email}`);
      return res.json(genericResponse);
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // Invalidar tokens previos del mismo user
    await pool.query(
      'UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, token, expiresAt, ip, req.get('user-agent') || null]
    );

    await sendPasswordReset(user, token);
    res.json(genericResponse);
  } catch (e) {
    console.error('[auth/forgot-password] error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/reset-password { token, new_password }
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT pr.id AS reset_id, pr.user_id, pr.expires_at, pr.used_at, u.email, u.full_name
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido' });
    }
    const r = rows[0];
    if (r.used_at) return res.status(400).json({ error: 'Token ya usado' });
    if (new Date(r.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expirado. Solicitá uno nuevo.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('BEGIN');
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
      [hash, r.user_id]
    );
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [r.reset_id]);
    await pool.query('COMMIT');

    res.json({ ok: true, message: 'Contraseña actualizada. Ya podés ingresar.' });
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[auth/reset-password] error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/validate-reset-token { token }  — Para mostrar/ocultar form
router.post('/validate-reset-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const { rows } = await pool.query(
      `SELECT pr.expires_at, pr.used_at, u.email
       FROM password_resets pr JOIN users u ON u.id = pr.user_id
       WHERE pr.token = $1`,
      [token]
    );
    if (rows.length === 0) return res.json({ valid: false, reason: 'no_existe' });
    const r = rows[0];
    if (r.used_at) return res.json({ valid: false, reason: 'usado' });
    if (new Date(r.expires_at) < new Date()) return res.json({ valid: false, reason: 'expirado' });
    return res.json({ valid: true, email: r.email.replace(/(.{2}).+@/, '$1***@') });
  } catch (e) {
    res.status(500).json({ valid: false, error: 'Error interno' });
  }
});

module.exports = router;
