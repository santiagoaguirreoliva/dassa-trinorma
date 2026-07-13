import { Router as UserRouter } from 'express';
import { Router as RiskRouter } from 'express';
import { Router as LegalRouter } from 'express';
// TaskRouter moved to tasks.js
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

// ─── USERS ──────────────────────────────────────────────────
export const usersRouter = UserRouter();
usersRouter.use(authenticate);

usersRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, position, department, avatar_url, phone, is_active, last_login, created_at
         FROM users ORDER BY full_name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

usersRouter.post('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { email, password, full_name, role, position, department, phone } = req.body;
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Campos requeridos: email, password, full_name, role' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, role, position, department, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, full_name, role, position, department`,
      [email.toLowerCase(), hash, full_name, role, position, department, phone]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: err.message });
  }
});

usersRouter.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const allowed = ['full_name','role','position','department','phone','is_active','avatar_url'];
  const updates = []; const values = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, full_name, role, position`,
      values
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

usersRouter.post('/:id/reset-password', requireRole('master_admin', 'director'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ message: 'Contraseña reseteada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── RISKS ──────────────────────────────────────────────────
export const risksRouter = RiskRouter();
risksRouter.use(authenticate);

risksRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*, u.full_name as responsible_name
         FROM risks r
         LEFT JOIN users u ON u.id = r.responsible_id
        WHERE r.is_active = true
        ORDER BY r.ir DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

risksRouter.post('/', requireRole('master_admin','sgi_leader','seguridad_higiene'), async (req, res) => {
  const { code, activity, hazard, risk_factor, activity_type, impact,
          probability, severity, legal_req, current_controls, responsible_id,
          area, condition, control_status, recommended_action, start_date, end_date,
          residual_probability, residual_severity } = req.body;
  if (!activity || !hazard || !probability || !severity) {
    return res.status(400).json({ error: 'Campos requeridos: activity, hazard, probability, severity' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO risks (code, activity, hazard, risk_factor, activity_type, impact,
         probability, severity, legal_req, current_controls, responsible_id,
         area, condition, control_status, recommended_action, start_date, end_date,
         residual_probability, residual_severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [code || `R-${Date.now()}`, activity, hazard, risk_factor, activity_type, impact,
       probability, severity, legal_req || false, current_controls, responsible_id || null,
       area || null, condition || null, control_status ?? 0, recommended_action || null,
       start_date || null, end_date || null, residual_probability || null, residual_severity || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

risksRouter.patch('/:id', requireRole('master_admin','sgi_leader','seguridad_higiene'), async (req, res) => {
  const allowed = ['activity','hazard','risk_factor','activity_type','impact','probability',
    'severity','legal_req','current_controls','responsible_id','control_status',
    'residual_probability','residual_severity','is_active',
    'area','condition','recommended_action','start_date','end_date'];
  const updates = []; const values = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(`UPDATE risks SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LEGAL REQUIREMENTS ─────────────────────────────────────
export const legalRouter = LegalRouter();
legalRouter.use(authenticate);

legalRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT lr.*, u.full_name as responsible_name,
              CASE
                WHEN expiration_date IS NULL THEN NULL
                WHEN expiration_date < CURRENT_DATE THEN 'vencido'
                WHEN expiration_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(alert_days_before,90) THEN 'por_vencer'
                ELSE 'vigente'
              END as computed_status,
              expiration_date - CURRENT_DATE as days_remaining
         FROM legal_requirements lr
         LEFT JOIN users u ON u.id = lr.responsible_id
        WHERE lr.is_active = true
        ORDER BY expiration_date ASC NULLS LAST`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

legalRouter.post('/', requireRole('master_admin','sgi_leader'), async (req, res) => {
  const { code, title, category, issuing_authority, applicable_area,
          effective_date, expiration_date, alert_days_before, responsible_id, description } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'Título y categoría requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO legal_requirements
         (code, title, description, category, issuing_authority, applicable_area,
          effective_date, expiration_date, alert_days_before, responsible_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [code || `RL-${Date.now()}`, title, description, category, issuing_authority,
       applicable_area, effective_date, expiration_date, alert_days_before || 90, responsible_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

legalRouter.patch('/:id', requireRole('master_admin','sgi_leader'), async (req, res) => {
  const allowed = ['title','description','category','issuing_authority','applicable_area',
    'effective_date','expiration_date','alert_days_before','responsible_id','evidence_url','evidence_notes'];
  const updates = []; const values = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(`UPDATE legal_requirements SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tasks router moved to server/routes/tasks.js
