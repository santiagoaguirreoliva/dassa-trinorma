import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/users — listar todos
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, position, department,
              avatar_url, phone, is_active, last_login, created_at
         FROM users ORDER BY full_name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.position, u.department,
              u.avatar_url, u.phone, u.is_active, u.last_login, u.created_at,
              jp.responsibilities, jp.objectives, jp.kpis
         FROM users u
         LEFT JOIN job_profiles jp ON jp.user_id = u.id
        WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/me — el usuario edita su propio perfil
router.patch('/me', async (req, res) => {
  const { full_name, phone, position, department } = req.body;
  const updates = []; const values = []; let i = 1;
  if (full_name)   { updates.push(`full_name = $${i++}`);   values.push(full_name); }
  if (phone !== undefined) { updates.push(`phone = $${i++}`); values.push(phone); }
  if (position !== undefined) { updates.push(`position = $${i++}`); values.push(position); }
  if (department !== undefined) { updates.push(`department = $${i++}`); values.push(department); }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  values.push(req.user.id);
  try {
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, email, full_name, role, position, department, phone, avatar_url`,
      values
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users/me/change-password — cambiar propia contraseña
router.post('/me/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  try {
    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users — crear usuario (admin)
router.post('/', requireRole('master_admin', 'director'), async (req, res) => {
  const { email, password, full_name, role, position, department, phone } = req.body;
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Email, contraseña, nombre y rol son requeridos' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, role, position, department, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, full_name, role, position, department`,
      [email.toLowerCase().trim(), hash, full_name, role, position || null, department || null, phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id — editar usuario (admin)
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  // No se puede degradar a uno mismo
  if (req.params.id === req.user.id && req.body.role && req.body.role !== req.user.role) {
    return res.status(400).json({ error: 'No podés cambiar tu propio rol' });
  }
  const ALLOWED = ['full_name', 'role', 'position', 'department', 'phone', 'is_active'];
  const updates = []; const values = []; let i = 1;
  for (const f of ALLOWED) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, email, full_name, role, position, department, is_active`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users/:id/reset-password — admin resetea contraseña
router.post('/:id/reset-password', requireRole('master_admin', 'director'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ message: 'Contraseña reseteada correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
