// =============================================================================
// DASSA SGI — Users: admin reset password + approve/reject access requests
// Se monta en: app.use('/api/users', usersExtraRouter)
// =============================================================================
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { sendPasswordChangedByAdmin, sendAccessApproved, sendAccessRejected } = require('../services/mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

// Auth con re-lectura de BD en cada request (no confía en los claims del JWT):
// valida is_active y role vigentes para que un admin desactivado/degradado deje
// de operar de inmediato (no espera 7 días a que expire el token).
async function authenticate(req, res, next) {
  const h = req.header('Authorization');
  if (!h) return res.status(401).json({ error: 'Token no proporcionado' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }
    req.user = { id: rows[0].id, role: rows[0].role };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
}
router.use(authenticate);

// Middleware: solo master_admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'master_admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

function generateTempPassword(len = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#%';
  return Array.from(crypto.randomBytes(len)).map(b => chars[b % chars.length]).join('');
}

// ─── POST /api/users/:id/admin-reset-password ─────────────────────────────────
// Admin resetea password de un usuario, le manda temporal por email
router.post('/:id/admin-reset-password', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, email, full_name FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    const user = rows[0];

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2',
      [hash, id]
    );

    const mail = await sendPasswordChangedByAdmin(user, tempPassword);
    res.json({ ok: true, email_sent: mail.ok || false, email_to: user.email });
  } catch (e) {
    console.error('[users/admin-reset-password] error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/users/:id/toggle-active ────────────────────────────────────────
// Admin habilita/deshabilita un usuario
router.post('/:id/toggle-active', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING email, is_active',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, email: rows[0].email, is_active: rows[0].is_active });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============================================================================
// ACCESS REQUESTS — Aprobación de nuevos usuarios
// =============================================================================

// GET /api/users/access-requests?status=pending
router.get('/access-requests', requireAdmin, async (req, res) => {
  const status = req.query.status || 'pending';
  try {
    const { rows } = await pool.query(
      `SELECT ar.*, u.full_name AS reviewed_by_name
       FROM access_requests ar
       LEFT JOIN users u ON u.id = ar.reviewed_by
       WHERE ar.status = $1
       ORDER BY ar.created_at DESC`,
      [status]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/access-requests/:id/approve { role, position?, department?, password? }
router.post('/access-requests/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role = 'operaciones', position, department, password } = req.body;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM access_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });
    const ar = rows[0];

    // Verificar que no exista user con ese email
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [ar.email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    const tempPassword = password || generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query('BEGIN');
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, position, department, is_active, must_change_password)
       VALUES ($1, $2, $3, $4::app_role, $5, $6, TRUE, TRUE)
       RETURNING id, email, full_name`,
      [ar.email, hash, ar.full_name, role, position || ar.position, department || ar.department]
    );

    await pool.query(
      'UPDATE access_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      ['approved', req.user.id, id]
    );
    await pool.query('COMMIT');

    const user = newUser.rows[0];
    // Si pasamos password explícita: notificación de bienvenida sin password
    // Si fue temporal: mandamos password temporal
    if (password) {
      await sendAccessApproved(user);
    } else {
      await sendPasswordChangedByAdmin(user, tempPassword);
    }

    res.json({ ok: true, user_id: user.id, email: user.email, temp_password_emailed: !password });
  } catch (e) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error('[users/approve] error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/access-requests/:id/reject { reason? }
router.post('/access-requests/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE access_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), reject_reason = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING email, full_name`,
      [req.user.id, reason || null, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    await sendAccessRejected(rows[0].email, rows[0].full_name, reason);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users/access-requests (público — registro)
// Cualquier persona puede solicitar acceso
router.post('/access-requests', async (req, res) => {
  const { full_name, email, position, department, message } = req.body;
  if (!full_name || !email) return res.status(400).json({ error: 'Nombre y email requeridos' });

  try {
    // Verificar que no exista user activo con ese email
    const userExists = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email. Probá iniciar sesión o recuperar contraseña.' });
    }

    const existing = await pool.query(
      `SELECT id, status FROM access_requests WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (existing.rows.length > 0 && existing.rows[0].status === 'pending') {
      return res.status(400).json({ error: 'Ya tenés una solicitud pendiente. Esperá la aprobación del administrador.' });
    }

    await pool.query(
      `INSERT INTO access_requests (full_name, email, position, department, message, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [full_name, email, position || null, department || null, message || null]
    );

    // Avisar a master_admin
    const admins = await pool.query("SELECT email FROM users WHERE role = 'master_admin' AND is_active = TRUE");
    const { sendMail, layout } = require('../services/mailer.cjs');
    for (const adm of admins.rows) {
      await sendMail({
        to: adm.email,
        subject: `🆕 Nueva solicitud de acceso al SGI — ${full_name}`,
        html: layout({
          title: 'Nueva solicitud de acceso',
          body: `
            <p><strong>${full_name}</strong> (${email}) solicitó acceso al SGI.</p>
            ${position ? `<p>Puesto: ${position}</p>` : ''}
            ${department ? `<p>Área: ${department}</p>` : ''}
            ${message ? `<p>Mensaje:<br><em>${message}</em></p>` : ''}
          `,
          ctaUrl: `${process.env.APP_URL || 'https://trinorma.dassa.com.ar'}/users?tab=requests`,
          ctaLabel: 'Revisar solicitud',
        }),
      });
    }

    res.json({ ok: true, message: 'Solicitud enviada. El administrador revisará y te enviará un email.' });
  } catch (e) {
    console.error('[access-requests] error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
