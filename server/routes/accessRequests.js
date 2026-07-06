import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Password temporal aleatoria (el usuario la cambia al primer ingreso).
function generateTempPassword(len = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#%';
  return Array.from(crypto.randomBytes(len)).map(b => chars[b % chars.length]).join('');
}

// POST /api/access-requests — público, sin auth
router.post('/', async (req, res) => {
  const { full_name, email, position, department, message } = req.body;
  if (!full_name || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  // Verificar que no exista ya como usuario
  const { rows: existing } = await query(
    'SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]
  );
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Ya existe un usuario con ese email. Intentá ingresar directamente.' });
  }

  try {
    await query(
      `INSERT INTO access_requests (full_name, email, position, department, message)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         position  = EXCLUDED.position,
         message   = EXCLUDED.message,
         status    = 'pending',
         created_at = NOW()`,
      [full_name, email.toLowerCase().trim(), position || null, department || null, message || null]
    );

    // Notificar a admins
    const { rows: admins } = await query(
      `SELECT id FROM users WHERE role IN ('master_admin','director') AND is_active = true`
    );
    for (const admin of admins) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','users')`,
        [admin.id, `Nueva solicitud de acceso: ${full_name}`, `${email} quiere unirse al sistema`]
      );
    }

    res.status(201).json({ message: 'Solicitud enviada correctamente. El administrador te notificará cuando sea aprobada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rutas privadas — solo admins
router.use(authenticate);

// GET /api/access-requests — listar solicitudes
router.get('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ar.*, u.full_name AS reviewed_by_name
         FROM access_requests ar
         LEFT JOIN users u ON u.id = ar.reviewed_by
        ORDER BY ar.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/access-requests/:id/approve
router.post('/:id/approve', requireRole('master_admin', 'director'), async (req, res) => {
  const { role, password } = req.body;
  if (!role) return res.status(400).json({ error: 'Rol requerido' });

  try {
    const { rows } = await query(
      'SELECT * FROM access_requests WHERE id = $1 AND status = $2',
      [req.params.id, 'pending']
    );
    if (!rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' });

    const req_ = rows[0];

    // No reactivar cuentas dadas de baja: si ya existe un usuario con ese email
    // (activo o inactivo) se rechaza la aprobación en vez de sobrescribirlo.
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [req_.email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Password temporal aleatoria + must_change_password (no hardcodeada).
    const tempPassword = password || generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    // Crear usuario
    const { rows: newUser } = await query(
      `INSERT INTO users (email, password_hash, full_name, role, position, department, is_active, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,true,true)
       RETURNING id, email, full_name, role`,
      [req_.email, hash, req_.full_name, role, req_.position || null, req_.department || null]
    );

    // Marcar solicitud como aprobada
    await query(
      `UPDATE access_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`,
      [req.user.id, req.params.id]
    );

    // Enviar la password temporal por email (si no se pasó una explícita).
    try {
      const { createRequire } = await import('module');
      const reqCjs = createRequire(import.meta.url);
      const mailer = reqCjs('../services/mailer.cjs');
      if (password) {
        await mailer.sendAccessApproved(newUser[0]);
      } else {
        await mailer.sendPasswordChangedByAdmin(newUser[0], tempPassword);
      }
    } catch (mailErr) {
      console.error('[access-requests/approve] mail error:', mailErr.message);
    }

    res.json({ message: 'Usuario creado correctamente', user: newUser[0], temp_password_emailed: !password });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/access-requests/:id/reject
router.post('/:id/reject', requireRole('master_admin', 'director'), async (req, res) => {
  const { reason } = req.body;
  try {
    await query(
      `UPDATE access_requests SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), reject_reason=$2
       WHERE id=$3`,
      [req.user.id, reason || null, req.params.id]
    );
    res.json({ message: 'Solicitud rechazada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
