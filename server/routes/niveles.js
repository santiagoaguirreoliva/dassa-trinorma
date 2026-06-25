// /api/proyectos · /api/inversiones — Niveles 2 y 3 del Sistema Integral de Gestión
//   Nivel 2: strategic_projects (proyectos que impulsan los objetivos)
//   Nivel 3: investments (plan de inversiones)
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const projectsRouter = express.Router();
const investmentsRouter = express.Router();
[projectsRouter, investmentsRouter].forEach(r => r.use(authenticate));

const isLeader = (role) => ['master_admin', 'director', 'sgi_leader'].includes(role);

// ── NIVEL 2 · Proyectos estratégicos ─────────────────────────────
projectsRouter.get('/', async (req, res) => {
  try {
    const params = []; let where = 'enabled = true';
    if (req.query.area) { params.push(req.query.area); where += ` AND area = $${params.length}`; }
    const { rows } = await query(
      `SELECT * FROM strategic_projects WHERE ${where} ORDER BY area, code`, params);
    res.json({ ok: true, projects: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

projectsRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['name', 'area', 'objective_codes', 'status', 'progress_pct', 'responsible', 'notes', 'enabled'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE strategic_projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, project: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NIVEL 3 · Plan de inversiones ────────────────────────────────
investmentsRouter.get('/', async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM investments ORDER BY amount_usd DESC NULLS LAST, project');
    const total = rows.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
    res.json({ ok: true, investments: rows, total_usd: total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

investmentsRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['project', 'area', 'priority', 'amount_usd', 'amount_label', 'status', 'planned_date', 'real_date', 'roi_expected', 'notes'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE investments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, investment: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { projectsRouter, investmentsRouter };
