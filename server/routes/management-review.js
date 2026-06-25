// /api/management-review — Revisión por la Dirección (ISO 9001/14001/45001 · 9.3)
// Compila automáticamente las entradas de desempeño (9.3.2) desde objetivos/NC/incidentes/
// legal/capacitaciones/cambios, y gestiona el acta paso a paso con firma de cierre (9.3.3).
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);
const isLeader = (role) => ['master_admin', 'director', 'sgi_leader'].includes(role);

// Compila las entradas de desempeño del año (insumo para el acta)
async function compileInputs(year) {
  const [obj, find, inc, legal, train, chg] = await Promise.all([
    query(`
      SELECT o.code, o.name, o.area, o.enabled,
        (SELECT json_agg(json_build_object(
            'kpi', oi.indicator_name, 'unit', oi.unit, 'target', oi.target_text,
            'connection', oi.connection_status,
            'last_value', (SELECT m.value FROM objective_measurements m WHERE m.indicator_id=oi.id ORDER BY m.period DESC LIMIT 1),
            'last_period', (SELECT to_char(m.period,'YYYY-MM') FROM objective_measurements m WHERE m.indicator_id=oi.id ORDER BY m.period DESC LIMIT 1))
          ORDER BY oi.kpi_order)
          FROM objective_indicators oi WHERE oi.objective_id=o.id AND oi.enabled) AS kpis
      FROM objectives o WHERE o.tier='estrategico' AND o.year=$1 ORDER BY o.code`, [year]),
    query(`SELECT
        COUNT(*) FILTER (WHERE closed_at IS NULL) AS abiertas,
        COUNT(*) FILTER (WHERE closed_at IS NOT NULL AND date_part('year',closed_at)=$1) AS cerradas_periodo,
        COUNT(*) FILTER (WHERE origin='auditoria_interna') AS de_auditoria,
        COUNT(*) AS total
      FROM findings WHERE deleted_at IS NULL`, [year]),
    query(`SELECT COUNT(*) AS total, COALESCE(SUM(lost_time_days),0) AS dias_perdidos
      FROM incidents WHERE date_part('year',date)=$1`, [year]),
    query(`SELECT
        COUNT(*) FILTER (WHERE is_active) AS total,
        COUNT(*) FILTER (WHERE is_active AND (expiration_date IS NULL OR expiration_date >= CURRENT_DATE)) AS vigentes,
        COUNT(*) FILTER (WHERE is_active AND expiration_date < CURRENT_DATE) AS vencidos,
        COUNT(*) FILTER (WHERE is_active AND expiration_date >= CURRENT_DATE AND expiration_date < CURRENT_DATE + 60) AS por_vencer
      FROM legal_requirements`),
    query(`SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='completada' OR completed_at IS NOT NULL) AS realizadas,
        COUNT(*) FILTER (WHERE is_mandatory) AS obligatorias
      FROM trainings WHERE date_part('year',scheduled_date)=$1`, [year]),
    query(`SELECT status, COUNT(*)::int AS n FROM change_requests WHERE year=$1 GROUP BY status`, [year]),
  ]);
  return {
    objectives: obj.rows,
    findings: find.rows[0],
    incidents: inc.rows[0],
    legal: legal.rows[0],
    trainings: train.rows[0],
    changes: chg.rows,
  };
}

// GET inputs compilados del año (panel de ayuda en vivo)
router.get('/:year/inputs', async (req, res) => {
  try { res.json({ ok: true, inputs: await compileInputs(parseInt(req.params.year)) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET actas del año
router.get('/:year', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT mr.*, u.full_name AS created_by_name FROM management_reviews mr
       LEFT JOIN users u ON u.id=mr.created_by WHERE mr.year=$1 ORDER BY mr.meeting_date DESC NULLS LAST, mr.created_at DESC`,
      [parseInt(req.params.year)]);
    res.json({ ok: true, reviews: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET una acta
router.get('/one/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT mr.*, u.full_name AS created_by_name FROM management_reviews mr
       LEFT JOIN users u ON u.id=mr.created_by WHERE mr.id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
    res.json({ ok: true, review: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST crear acta del año (guarda foto de los inputs)
router.post('/', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const { year, period_label, meeting_date, location, attendees } = req.body;
    const yr = year || new Date().getFullYear();
    const snapshot = await compileInputs(yr);
    const { rows } = await query(
      `INSERT INTO management_reviews (year, period_label, meeting_date, location, attendees, inputs_snapshot, created_by)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
      [yr, period_label || `Revisión ${yr}`, meeting_date || null, location || null, attendees || null, JSON.stringify(snapshot), req.user.id]);
    res.status(201).json({ ok: true, review: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH editar campos del acta
router.patch('/:id', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const FIELDS = ['period_label','meeting_date','location','attendees','prior_actions_review','context_changes',
      'satisfaction_summary','objectives_summary','process_performance','nc_capa_summary','audit_summary',
      'legal_summary','providers_summary','resources_adequacy','risks_actions_eval','improvement_opportunities',
      'decisions','improvement_actions','status'];
    const updates = []; const values = []; let i = 1;
    for (const f of FIELDS) if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      values.push(f === 'improvement_actions' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    values.push(req.params.id);
    const { rows } = await query(`UPDATE management_reviews SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
    res.json({ ok: true, review: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST firmar y cerrar el acta
router.post('/:id/close-and-sign', async (req, res) => {
  if (!isLeader(req.user.role)) return res.status(403).json({ error: 'No autorizado' });
  try {
    const sig = { user_id: req.user.id, name: req.user.full_name, signed_at: new Date().toISOString() };
    const { rows } = await query(
      `UPDATE management_reviews
         SET signatures = COALESCE(signatures,'[]'::jsonb) || $1::jsonb,
             status='cerrada', closed_at=COALESCE(closed_at, NOW()), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [JSON.stringify([sig]), req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
    res.json({ ok: true, review: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
