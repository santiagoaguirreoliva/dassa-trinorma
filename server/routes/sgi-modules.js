// =============================================================================
// /api/objetivos · /api/cambios · /api/procedimientos · /api/riesgos-amfe
// Versión con CRUD completo (GET/POST/PATCH/DELETE)
// =============================================================================
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const objectivesRouter = express.Router();
const changesRouter = express.Router();
const proceduresRouter = express.Router();
const risksAmfeRouter = express.Router();

[objectivesRouter, changesRouter, proceduresRouter, risksAmfeRouter].forEach(r => r.use(authenticate));

const isLeader = (role) => ['master_admin','director','sgi_leader'].includes(role);

// ═══════════════════════════════════════════════════════════════════════════
// OBJETIVOS
// ═══════════════════════════════════════════════════════════════════════════
objectivesRouter.get('/', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const params = [year];
    let where = 'o.year = $1';
    if (req.query.tier) { params.push(req.query.tier); where += ` AND o.tier = $${params.length}`; }  // 'estrategico' = tablero 3 niveles
    const { rows } = await query(`
      SELECT o.*, u.full_name AS responsible_name,
             (SELECT COUNT(*) FROM objective_indicators oi WHERE oi.objective_id = o.id) AS num_indicators,
             (SELECT COUNT(*) FROM objective_indicators oi WHERE oi.objective_id = o.id AND oi.enabled) AS num_enabled,
             (SELECT COUNT(DISTINCT oi.id) FROM objective_indicators oi
                JOIN objective_measurements m ON m.indicator_id = oi.id WHERE oi.objective_id = o.id) AS num_with_data
      FROM objectives o LEFT JOIN users u ON u.id = o.responsible_id
      WHERE ${where} ORDER BY o.code
    `, params);
    res.json({ ok: true, objectives: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

objectivesRouter.get('/:id', async (req, res) => {
  try {
    const { rows: obj } = await query(
      'SELECT o.*, u.full_name AS responsible_name FROM objectives o LEFT JOIN users u ON u.id=o.responsible_id WHERE o.id = $1',
      [req.params.id]);
    if (!obj[0]) return res.status(404).json({ error: 'No encontrado' });
    const { rows: indicators } = await query(`
      SELECT oi.*,
             (SELECT json_agg(json_build_object('period', period, 'value', value) ORDER BY period)
                FROM objective_measurements om WHERE om.indicator_id = oi.id) AS measurements,
             (SELECT json_build_object('period', period, 'value', value) FROM objective_measurements om
               WHERE om.indicator_id = oi.id ORDER BY period DESC LIMIT 1) AS last_measurement
      FROM objective_indicators oi WHERE oi.objective_id = $1
      ORDER BY oi.kpi_order, oi.indicator_name
    `, [req.params.id]);
    res.json({ ok: true, objective: obj[0], indicators });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Toggle/edición de un KPI (indicador) del objetivo — habilitación progresiva
objectivesRouter.patch('/:id/indicators/:indId', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['enabled','connector_source','connection_status','target_text','baseline_value','unit','indicator_name','frequency','kpi_order'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.indId, req.params.id);
    const { rows } = await query(
      `UPDATE objective_indicators SET ${updates.join(', ')} WHERE id = $${i++} AND objective_id = $${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Indicador no encontrado' });
    res.json({ ok: true, indicator: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

objectivesRouter.post('/', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const { name, description, year, area, target_metric, target_value, admissible_value, baseline_value } = req.body;
    if (!name) return res.status(400).json({ error: 'name requerido' });
    const yr = year || new Date().getFullYear();
    const { rows: cnt } = await query('SELECT COUNT(*)::int AS n FROM objectives WHERE year = $1', [yr]);
    const code = `OBJ-${yr}-${String(cnt[0].n + 1).padStart(2, '0')}`;
    const { rows } = await query(`
      INSERT INTO objectives (code, name, description, year, area, target_metric, target_value, admissible_value, baseline_value, responsible_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'activo') RETURNING *
    `, [code, name, description||null, yr, area||null, target_metric||null, target_value||null, admissible_value||null, baseline_value||null, req.user.id]);
    res.status(201).json({ ok: true, objective: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

objectivesRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['name','description','area','target_metric','target_value','admissible_value','baseline_value','current_value','status','enabled','tier','responsible_text'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(`UPDATE objectives SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    res.json({ ok: true, objective: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

objectivesRouter.delete('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    await query('UPDATE objectives SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelado', req.params.id]);
    res.json({ ok: true, message: 'Objetivo cancelado (soft delete)' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIOS
// ═══════════════════════════════════════════════════════════════════════════
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

changesRouter.post('/', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const { title, purpose, impact_description, year, plazo_target, budget_estimated } = req.body;
    if (!title) return res.status(400).json({ error: 'title requerido' });
    const yr = year || new Date().getFullYear();
    const { rows: cnt } = await query('SELECT COUNT(*)::int AS n FROM change_requests WHERE year = $1', [yr]);
    const code = `CC-${yr}-${String(cnt[0].n + 1).padStart(2, '0')}`;
    const { rows } = await query(`
      INSERT INTO change_requests (code, title, purpose, impact_description, year, plazo_target, budget_estimated, responsible_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'propuesto') RETURNING *
    `, [code, title, purpose||null, impact_description||null, yr, plazo_target||null, budget_estimated||null, req.user.id]);
    res.status(201).json({ ok: true, change: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

changesRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['title','purpose','impact_description','status','plazo_target','plazo_real','budget_estimated','budget_real','related_risks_text'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(`UPDATE change_requests SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    res.json({ ok: true, change: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

changesRouter.delete('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    await query("UPDATE change_requests SET status = 'cancelado', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDIMIENTOS
// ═══════════════════════════════════════════════════════════════════════════
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
    const { rows: steps } = await query('SELECT * FROM procedure_steps WHERE procedure_id = $1 ORDER BY step_number', [req.params.id]);
    const { rows: risks } = await query(`
      SELECT r.id, r.code, r.activity, r.npr, r.npr_level, prl.contribution
      FROM procedure_risk_links prl JOIN risks r ON r.id = prl.risk_id
      WHERE prl.procedure_id = $1
    `, [req.params.id]);
    res.json({ ok: true, procedure: p[0], steps, risks });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

proceduresRouter.post('/', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const { title, module, description, instructions_md, norma } = req.body;
    if (!title) return res.status(400).json({ error: 'title requerido' });
    const { rows: cnt } = await query('SELECT COUNT(*)::int AS n FROM procedures');
    const code = `P-TRI-${String(cnt[0].n + 1).padStart(3, '0')}`;
    const { rows } = await query(`
      INSERT INTO procedures (code, title, module, description, instructions_md, norma, responsible_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'borrador') RETURNING *
    `, [code, title, module||null, description||null, instructions_md||null, norma||null, req.user.id]);
    res.status(201).json({ ok: true, procedure: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

proceduresRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['title','module','description','instructions_md','norma','status','version','effective_date','next_review_date','legacy_doc_url'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(`UPDATE procedures SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    res.json({ ok: true, procedure: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

proceduresRouter.delete('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    await query("UPDATE procedures SET status = 'obsoleto', updated_at = NOW() WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// RIESGOS AMFE
// ═══════════════════════════════════════════════════════════════════════════
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
             plazo, resultado_acciones, eficacia_verificada,
             ro_type, responsible_text, residual_severity, residual_probability, residual_detection,
             matrix_version, matrix_date
      FROM risks WHERE ${conds.join(' AND ')}
      ORDER BY npr DESC NULLS LAST, ir DESC LIMIT 100
    `, params);
    res.json({ ok: true, risks: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

risksAmfeRouter.post('/sugerir-ia', requireRole('master_admin','director','sgi_leader'), async (req, res) => {
  try {
    const { createRequire } = await import('module');
    const requireCJS = createRequire(import.meta.url);
    const Anthropic = requireCJS('@anthropic-ai/sdk').default || requireCJS('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { rows: foda } = await query(`SELECT foda_type, category, description FROM context_analysis WHERE is_active = TRUE`);
    const { rows: profiles } = await query(`SELECT role_label, area FROM job_profiles WHERE is_active = TRUE`);
    const { rows: existing } = await query(`SELECT activity, hazard FROM risks WHERE is_active = TRUE LIMIT 30`);
    const prompt = `Sos experto AMFE TRINORMA. DASSA SA · depósito fiscal Buenos Aires.
A partir del FODA, fichas y riesgos existentes, sugerí 5 nuevos riesgos plausibles que NO estén ya cubiertos.
FODA: ${JSON.stringify(foda).slice(0, 1500)}
Puestos: ${JSON.stringify(profiles.map(p => p.role_label)).slice(0, 800)}
Existentes: ${JSON.stringify(existing.map(r => r.activity + ' / ' + r.hazard)).slice(0, 1500)}
Devolvé JSON array de 5:
[{"process":"...", "activity":"...", "hazard":"...", "risk_factor":"...", "severity":1-5, "probability":1-4, "detection":1-4, "causes":"...", "recommended_action":"...", "opportunity":"..."}]`;
    const resp = await client.messages.create({ model: 'claude-sonnet-4-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] });
    const text = resp.content[0].text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'IA no devolvió JSON' });
    res.json({ ok: true, suggestions: JSON.parse(match[0]), usage: resp.usage });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

risksAmfeRouter.post('/', requireRole('master_admin','director','sgi_leader'), async (req, res) => {
  try {
    const { activity, hazard, risk_factor, severity, probability, detection, causes, current_controls, recommended_action, opportunity, process, affected_parties } = req.body;
    if (!activity || !hazard) return res.status(400).json({ error: 'activity y hazard requeridos' });
    const { rows: cnt } = await query('SELECT COUNT(*)::int AS n FROM risks');
    const code = `R-${String(cnt[0].n + 1).padStart(3, '0')}`;
    const { rows } = await query(`
      INSERT INTO risks (code, activity, hazard, risk_factor, severity, probability, detection,
                         causes, current_controls, recommended_action, opportunity, process, affected_parties, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE) RETURNING *
    `, [code, activity, hazard, risk_factor||null, severity||3, probability||2, detection||null,
        causes||null, current_controls||null, recommended_action||null, opportunity||null, process||null, affected_parties||null]);
    res.status(201).json({ ok: true, risk: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export { objectivesRouter, changesRouter, proceduresRouter, risksAmfeRouter };
