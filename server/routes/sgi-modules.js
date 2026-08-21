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
    // Los ocultos (tablero interno, fuera del F-TRI-04) no se listan
    let where = 'o.year = $1 AND o.deleted_at IS NULL';
    if (req.query.tier) { params.push(req.query.tier); where += ` AND o.tier = $${params.length}`; }  // 'estrategico' = tablero 3 niveles
    const { rows } = await query(`
      SELECT o.*, u.full_name AS responsible_name,
             (SELECT COUNT(*) FROM objective_indicators oi WHERE oi.objective_id = o.id) AS num_indicators,
             (SELECT COUNT(*) FROM objective_indicators oi WHERE oi.objective_id = o.id AND oi.enabled) AS num_enabled,
             (SELECT COUNT(DISTINCT oi.id) FROM objective_indicators oi
                JOIN objective_measurements m ON m.indicator_id = oi.id WHERE oi.objective_id = o.id) AS num_with_data,
             -- Indicadores con su serie mensual del año: es lo que el F-TRI-04 muestra
             -- como Ene..Dic, y permite el acumulado del año contra la meta anual.
             (SELECT json_agg(json_build_object(
                 'id', oi.id, 'indicator_name', oi.indicator_name, 'item_medido', oi.item_medido,
                 'unit', oi.unit, 'frequency', oi.frequency, 'target_value', oi.target_value,
                 'target_text', oi.target_text, 'direction', oi.direction,
                 -- El año del objetivo y el anterior: la planilla muestra el año en
                 -- curso sobre el baseline del año pasado, y así se lee si mejora.
                 'mediciones', (SELECT json_agg(json_build_object(
                       'mes', to_char(m.period,'YYYY-MM'), 'valor', m.value, 'notes', m.notes,
                       'anio', date_part('year', m.period))
                     ORDER BY m.period)
                   FROM objective_measurements m
                   WHERE m.indicator_id = oi.id
                     AND date_part('year', m.period) IN (o.year, o.year - 1)))
               ORDER BY oi.kpi_order)
              FROM objective_indicators oi
              WHERE oi.objective_id = o.id AND oi.enabled) AS kpis
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
  try {
    const FIELDS = ['enabled','connector_source','connection_status','target_text','baseline_value','unit','indicator_name','frequency','kpi_order','item_medido','target_value','direction','admissible_value'];
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

// Editar la ficha del objetivo. Abierto a cualquier usuario por decisión de
// Dirección: la gente que ejecuta es la que tiene el dato. Como contrapartida
// cada cambio deja asiento en objective_entries con qué campo cambió, de qué
// valor a cuál y quién lo hizo — es la evidencia de control de cambios que pide
// ISO 9001 7.5.3 y lo que permite revertir si alguien se equivoca.
const OBJ_LABELS = {
  name: 'Nombre', description: 'Descripción', area: 'Área', target_metric: 'Indicador',
  target_value: 'META', admissible_value: 'Admisible', baseline_value: 'Baseline',
  current_value: 'Valor actual', status: 'Estado', enabled: 'Habilitado',
  responsible_text: 'Responsable', acciones_asociadas: 'Acciones asociadas',
  recursos: 'Recursos', plazo_frecuencia: 'Plazo/Frecuencia',
  cumplimiento_nota: 'Cumplimiento', acciones_si_no_llega: 'Si no se llega',
};
objectivesRouter.patch('/:id', async (req, res) => {
  try {
    const FIELDS = ['name','description','area','target_metric','target_value','admissible_value',
      'baseline_value','current_value','status','enabled','tier','responsible_text','responsible_id',
      'acciones_asociadas','recursos','plazo_frecuencia','cumplimiento_nota','acciones_si_no_llega'];
    const { rows: antes } = await query('SELECT * FROM objectives WHERE id = $1', [req.params.id]);
    if (!antes[0]) return res.status(404).json({ error: 'No encontrado' });

    const updates = []; const values = []; const cambios = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) {
      const previo = antes[0][f];
      if (String(previo ?? '') === String(req.body[f] ?? '')) continue;  // sin cambio real
      updates.push(`${f} = $${i++}`); values.push(req.body[f]);
      if (OBJ_LABELS[f]) {
        cambios.push(`${OBJ_LABELS[f]}: "${previo ?? '(vacío)'}" → "${req.body[f] ?? '(vacío)'}"`);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE objectives SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    if (cambios.length) {
      await query(
        `INSERT INTO objective_entries (objective_id, entry_type, content, created_by)
         VALUES ($1,'edicion',$2,$3)`,
        [req.params.id, cambios.join(' · '), req.user.id]);
    }
    res.json({ ok: true, objective: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Detalle completo para el panel: ficha + KPIs con mediciones + vínculos + bitácora ──
objectivesRouter.get('/:id/detalle', async (req, res) => {
  try {
    const [obj, inds, links, entries] = await Promise.all([
      query(`SELECT o.*, u.full_name AS responsible_name FROM objectives o
               LEFT JOIN users u ON u.id=o.responsible_id WHERE o.id=$1`, [req.params.id]),
      query(`SELECT oi.*,
               (SELECT json_agg(json_build_object('mes', to_char(period,'YYYY-MM'), 'valor', value, 'notes', notes)
                  ORDER BY period) FROM objective_measurements m WHERE m.indicator_id=oi.id) AS mediciones
             FROM objective_indicators oi WHERE oi.objective_id=$1 ORDER BY oi.kpi_order`, [req.params.id]),
      // El nombre de cada entidad vinculada se resuelve acá: el panel muestra
      // "Sensibilización ISO", no un uuid.
      query(`SELECT l.*, u.full_name AS created_by_name,
               COALESCE(t.title, p.name, c.title, f.title, r.hazard, '(eliminado)') AS entity_name,
               COALESCE(c.code, f.code, p.code) AS entity_code
             FROM objective_links l
               LEFT JOIN users u ON u.id = l.created_by
               LEFT JOIN trainings t          ON l.entity_type='capacitacion' AND t.id = l.entity_id
               LEFT JOIN strategic_projects p ON l.entity_type='proyecto'     AND p.id = l.entity_id
               LEFT JOIN change_requests c    ON l.entity_type='cambio'       AND c.id = l.entity_id
               LEFT JOIN findings f           ON l.entity_type='hallazgo'     AND f.id = l.entity_id
               LEFT JOIN risks r              ON l.entity_type='riesgo'       AND r.id = l.entity_id
             WHERE l.objective_id=$1 ORDER BY l.created_at DESC`, [req.params.id]),
      query(`SELECT e.*, u.full_name AS created_by_name FROM objective_entries e
               LEFT JOIN users u ON u.id=e.created_by
              WHERE e.objective_id=$1 ORDER BY e.created_at DESC`, [req.params.id]),
    ]);
    if (!obj.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, objective: obj.rows[0], indicators: inds.rows, links: links.rows, entries: entries.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Registros que escribe cualquiera: avance, nota o evidencia
objectivesRouter.post('/:id/entries', async (req, res) => {
  const { content, entry_type } = req.body;
  if (!content || !String(content).trim()) return res.status(400).json({ error: 'Escribí el registro' });
  if (entry_type === 'edicion') return res.status(400).json({ error: 'El tipo edición lo genera el sistema' });
  try {
    const { rows } = await query(
      `INSERT INTO objective_entries (objective_id, entry_type, content, created_by)
       VALUES ($1, COALESCE($2,'nota'), $3, $4) RETURNING *`,
      [req.params.id, entry_type || null, String(content).trim(), req.user.id]);
    res.status(201).json({ ok: true, entry: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vincular / desvincular capacitaciones, proyectos, cambios, hallazgos y riesgos
objectivesRouter.post('/:id/links', async (req, res) => {
  const { entity_type, entity_id, note } = req.body;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'Elegí qué vincular' });
  try {
    const { rows } = await query(
      `INSERT INTO objective_links (objective_id, entity_type, entity_id, note, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (objective_id, entity_type, entity_id) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [req.params.id, entity_type, entity_id, note || null, req.user.id]);
    res.status(201).json({ ok: true, link: rows[0] });
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ error: 'Ese registro ya no existe' });
    res.status(500).json({ error: e.message });
  }
});

objectivesRouter.delete('/:id/links/:linkId', async (req, res) => {
  try {
    await query('DELETE FROM objective_links WHERE id=$1 AND objective_id=$2', [req.params.linkId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Catálogo de lo que se puede vincular (para los selectores del panel)
objectivesRouter.get('/vinculables/todo', async (_req, res) => {
  try {
    const [caps, procs, cambios, halls, riesgos] = await Promise.all([
      query(`SELECT id, title AS nombre, to_char(scheduled_date,'DD/MM/YYYY') AS detalle
               FROM trainings ORDER BY scheduled_date DESC NULLS LAST LIMIT 200`),
      query(`SELECT id, name AS nombre, COALESCE(status,'') AS detalle FROM strategic_projects ORDER BY name`),
      query(`SELECT id, title AS nombre, code AS detalle FROM change_requests
              WHERE deleted_at IS NULL ORDER BY code DESC`),
      query(`SELECT id, title AS nombre, code AS detalle FROM findings
              WHERE deleted_at IS NULL ORDER BY code DESC LIMIT 200`),
      query(`SELECT id, hazard AS nombre, COALESCE(area,'') AS detalle FROM risks
              WHERE is_active ORDER BY hazard LIMIT 200`),
    ]);
    res.json({ ok: true, capacitacion: caps.rows, proyecto: procs.rows,
               cambio: cambios.rows, hallazgo: halls.rows, riesgo: riesgos.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cargar o corregir la medición de un período
objectivesRouter.post('/:id/mediciones', async (req, res) => {
  const { indicator_id, mes, valor, notes } = req.body;
  if (!indicator_id || !mes) return res.status(400).json({ error: 'Falta el indicador o el período' });
  if (valor === '' || valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return res.status(400).json({ error: 'El valor tiene que ser un número' });
  }
  try {
    const { rows: ok } = await query(
      'SELECT 1 FROM objective_indicators WHERE id=$1 AND objective_id=$2', [indicator_id, req.params.id]);
    if (!ok[0]) return res.status(400).json({ error: 'Ese indicador no es de este objetivo' });
    const { rows } = await query(
      `INSERT INTO objective_measurements (indicator_id, period, value, notes, recorded_by)
       VALUES ($1, ($2||'-25')::date, $3, $4, $5)
       ON CONFLICT (indicator_id, period) DO UPDATE
         SET value=EXCLUDED.value, notes=EXCLUDED.notes, recorded_by=EXCLUDED.recorded_by
       RETURNING *`,
      [indicator_id, mes, Number(valor), notes || `cargado a mano`, req.user.id]);
    res.status(201).json({ ok: true, medicion: rows[0] });
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
    // Los dados de baja (objetivos mal registrados como cambios) se conservan pero no se listan
    const where = year ? 'WHERE year = $1 AND cr.deleted_at IS NULL' : 'WHERE cr.deleted_at IS NULL';
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
    const { title, purpose, impact_description, year, plazo_target, budget_estimated, recursos, verificacion } = req.body;
    if (!title) return res.status(400).json({ error: 'title requerido' });
    const yr = year || new Date().getFullYear();
    const { rows: cnt } = await query('SELECT COUNT(*)::int AS n FROM change_requests WHERE year = $1', [yr]);
    const code = `CC-${yr}-${String(cnt[0].n + 1).padStart(2, '0')}`;
    const { rows } = await query(`
      INSERT INTO change_requests (code, title, purpose, impact_description, year, plazo_target, budget_estimated, recursos, verificacion, responsible_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'propuesto') RETURNING *
    `, [code, title, purpose||null, impact_description||null, yr, plazo_target||null, budget_estimated||null, recursos||null, verificacion||null, req.user.id]);
    res.status(201).json({ ok: true, change: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

changesRouter.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['title','purpose','impact_description','status','plazo_target','plazo_real','budget_estimated','budget_real','related_risks_text','recursos','verificacion'];
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
