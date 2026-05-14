// =============================================================================
// DASSA SGI — Job Profiles (responsabilidades por perfil)
// Reusa tabla job_profiles existente
// =============================================================================
const express = require('express');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

function authenticate(req, res, next) {
  const h = req.header('Authorization');
  if (!h) return res.status(401).json({ error: 'Token no proporcionado' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
}
router.use(authenticate);

function requireAdmin(req, res, next) {
  if (!req.user || !['master_admin', 'sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Solo admin o sgi_leader' });
  }
  next();
}

// GET /api/profiles — listar todos
router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT jp.*,
           u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
           sup.full_name AS reports_to_name
    FROM job_profiles jp
    LEFT JOIN users u ON u.id = jp.user_id
    LEFT JOIN users sup ON sup.id = jp.reports_to
    ORDER BY u.role, u.full_name
  `);
  res.json(rows);
});

// GET /api/profiles/me — el perfil del user actual
router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT jp.*, sup.full_name AS reports_to_name
     FROM job_profiles jp
     LEFT JOIN users sup ON sup.id = jp.reports_to
     WHERE jp.user_id = $1`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

// POST /api/profiles { user_id, role_label, responsibilities[], objectives[], kpis[], reports_to? }
router.post('/', requireAdmin, async (req, res) => {
  const { user_id, role_label, responsibilities, objectives, kpis, reports_to } = req.body;
  if (!user_id || !role_label) return res.status(400).json({ error: 'user_id y role_label requeridos' });

  try {
    const { rows } = await pool.query(`
      INSERT INTO job_profiles (user_id, role_label, responsibilities, objectives, kpis, reports_to)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        role_label = EXCLUDED.role_label,
        responsibilities = EXCLUDED.responsibilities,
        objectives = EXCLUDED.objectives,
        kpis = EXCLUDED.kpis,
        reports_to = EXCLUDED.reports_to,
        updated_at = NOW()
      RETURNING *
    `, [user_id, role_label, responsibilities || [], objectives || [], kpis || [], reports_to || null]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/profiles/:user_id
router.delete('/:user_id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM job_profiles WHERE user_id = $1', [req.params.user_id]);
  res.json({ ok: true });
});

module.exports = router;
