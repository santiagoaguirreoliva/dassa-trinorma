import express from 'express';
import bcryptjs from 'bcryptjs';
import { query } from '../db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const passwordMatch = bcryptjs.compareSync(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
  }
  try {
    const passwordHash = bcryptjs.hashSync(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,'usuario') RETURNING id`,
      [email, passwordHash, name]
    );
    const token = generateToken(rows[0].id);
    res.status(201).json({ token, user: { id: rows[0].id, email, name, role: 'usuario' } });
  } catch (error) {
    res.status(400).json({ error: 'El email ya está registrado' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, email, name, role FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
