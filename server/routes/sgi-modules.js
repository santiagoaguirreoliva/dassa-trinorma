// =============================================================================
// /api/objetivos · /api/cambios · /api/procedimientos · /api/riesgos-amfe
// =============================================================================
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const objectivesRouter = express.Router();
const changesRouter = express.Router();
const proceduresRouter = express.Router();
const risksAmfeRouter = express.Router();

[objectivesRouter, changesRouter, proceduresRouter, risksAmfeRouter].forEach(r => r.use(authenticate));

// ─── OBJETIVOS ──────────────────────────────────────────────────────────────
objectivesRouter.get('/', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const { rows } = await query(`
      SELECT o.*, u.full_name AS responsible_name,
             (SELECT COUNT(*) FROM objective_indicators WHERE objective_id = o.id) AS num_indicators
      FROM objectives o LEFT JOIN users u ON u.id = o.responsible_id
      WHERE o.year = $1 ORDER BY o.code
    `, [year]);
    res.json({ ok: true, objectives: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

objectivesRouter.get('/:id', async (req, res) => {
  try {
    const { rows: obj } = await query('SELECT * FROM objectives WHERE id = $1', [req.params.id]);
    if (!obj[0]) return res.status(404).json({ error: 'No encontrado' });
    const { rows: indicators } = await query(`
      SELECT oi.*, (SELECT json_agg(json_build_object('period', period, 'value', value))
                    FROM objective_measurements om WHERE om.indicator_id = oi.id ORDER BY period) AS measurements
      FROM objective_indicators oi WHERE oi.objective_id = $1
    `, [req.params.id]);
    res.json({ ok: true, objective: obj[0], indicators });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CAMBIOS ────────────────────────────────────────────────────────────────
changesRouter.get('/', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const params = year ? [year] : [];
    const where = year ? 'WHERE year = $1' : '';
    const { rows } = await query(`
      SELECT cr.*, u.full_name AS responsible_name,
             (SELECT COUNT(*) FROM change_request_items WHERE change_request_id = cr.id) AS num_items
      FROM change_requests cr LEFT JOIN users u ON u.id = cr.responsible_id
      ${where} ORDER BY cr.code DESC
    `, params);
    res.json({ ok: true, changes: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

changesRouter.get('/:id', async (req, res) => {
  try {
    const { rows: cr } = await query('SELECT * FROM change_requests WHERE id = $1', [req.params.id]);
    if (!cr[0]) return res.status(404).json({ error: 'No encontrado' });
    const { rows: items } = await query(`
      SELECT cri.*, u.full_name AS responsible_name
      FROM change_request_items cri LEFT JOIN users u ON u.id = cri.responsible_id
      WHERE cri.change_request_id = $1 ORDER BY cri.item_number
    `, [req.params.id]);
    res.json({ ok: true, change: cr[0], items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PROCEDIMIENTOS ─────────────────────────────────────────────────────────
proceduresRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*,
             (SELECT COUNT(*) FROM procedure_steps WHERE procedure_id = p.id) AS num_steps,
             (SELECT COUNT(*) FROM procedure_risk_links WHERE procedure_id = p.id) AS num_risks
      FROM procedures p ORDER BY p.code
    `);
    res.json({ ok: true, procedures: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

proceduresRouter.get('/:id', async (req, res) => {
  try {
    const { rows: p } = await query('SELECT * FROM procedures WHERE id = $1', [req.params.id]);
    if (!p[0]) return res.status(404).json({ error: 'No encontrado' });
    const { rows: steps } = await query(
      'SELECT * FROM procedure_steps WHERE procedure_id = $1 ORDER BY step_number', [req.params.id]
    );
    const { rows: risks } = await query(`
      SELECT r.id, r.code, r.activity, r.npr, r.npr_level, prl.contribution
      FROM procedure_risk_links prl JOIN risks r ON r.id = prl.risk_id
      WHERE prl.procedure_id = $1
    `, [req.params.id]);
    res.json({ ok: true, procedure: p[0], steps, risks });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RIESGOS AMFE ───────────────────────────────────────────────────────────
risksAmfeRouter.get('/', async (req, res) => {
  try {
    const { process: proc, level } = req.query;
    const conds = ['is_active = TRUE'];
    const params = [];
    if (proc)  { params.push(proc);  conds.push(`process = $${params.length}`); }
    if (level) { params.push(level); conds.push(`npr_level = $${params.length}::npr_significance`); }
    const { rows } = await query(`
      SELECT id, code, activity, hazard, risk_factor, severity, probability, detection,
             ir, npr, npr_level, current_controls, current_controls_text,
             causes, recommended_action, opportunity, process, affected_parties,
             plazo, resultado_acciones, eficacia_verificada
      FROM risks WHERE ${conds.join(' AND ')}
      ORDER BY npr DESC NULLS LAST, ir DESC LIMIT 100
    `, params);
    res.json({ ok: true, risks: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/riesgos-amfe/sugerir-ia · genera propuestas de nuevos riesgos
risksAmfeRouter.post('/sugerir-ia', requireRole('master_admin','director','sgi_leader'), async (req, res) => {
  try {
    const { createRequire } = await import('module');
    const requireCJS = createRequire(import.meta.url);
    const Anthropic = requireCJS('@anthropic-ai/sdk').default || requireCJS('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const { rows: foda } = await query(`SELECT foda_type, category, description FROM context_analysis WHERE is_active = TRUE`);
    const { rows: profiles } = await query(`SELECT role_label, area, mission FROM job_profiles WHERE is_active = TRUE`);
    const { rows: existing } = await query(`SELECT activity, hazard FROM risks WHERE is_active = TRUE LIMIT 30`);

    const prompt = `Sos experto AMFE TRINORMA. DASSA SA · depósito fiscal Buenos Aires.
A partir del FODA, fichas de puesto y riesgos existentes, sugerí 5 nuevos riesgos plausibles que NO estén ya cubiertos.
FODA actual: ${JSON.stringify(foda).slice(0, 1500)}
Puestos: ${JSON.stringify(profiles.map(p => p.role_label)).slice(0, 800)}
Riesgos ya existentes: ${JSON.stringify(existing.map(r => r.activity + ' / ' + r.hazard)).slice(0, 1500)}

Devolvé JSON estricto array de 5 sugerencias:
[{"process":"...", "activity":"...", "hazard":"...", "risk_factor":"...", "severity":1-5, "probability":1-4, "detection":1-4, "causes":"...", "recommended_action":"...", "opportunity":"..." }]`;

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = resp.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'IA no devolvió JSON' });
    const suggestions = JSON.parse(match[0]);
    res.json({ ok: true, suggestions, usage: resp.usage });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { objectivesRouter, changesRouter, proceduresRouter, risksAmfeRouter };
