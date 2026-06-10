// =============================================================================
// /api/orgchart · organigrama + puestos + empleados + externos
// CRUD completo accesible desde la UI Trinorma (sin scripts).
// =============================================================================
import express from 'express';
import { authenticate, requireRole, ADMIN_ROLES } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// Editables y arrays soportados
const PROFILE_FIELDS = [
  'role_label','area','seniority','mission',
  'responsibilities','key_results','competencies','training_required',
  'org_node_id','is_active',
];
const NODE_FIELDS = [
  'name','parent_id','type','level','area','description','color','sort_order','is_active',
];
const EXTERNAL_FIELDS = [
  'full_name','role','organization','email','phone','whatsapp','address',
  'org_node_id','supervisor_in_dassa_id','notes','is_active',
];

// GET /api/orgchart · árbol completo + perfiles + externos
router.get('/', async (req, res) => {
  try {
    const { rows: nodes } = await query(`
      SELECT n.id, n.name, n.parent_id, n.type, n.level, n.area, n.description, n.color, n.sort_order
      FROM org_chart_nodes n
      WHERE n.is_active = TRUE
      ORDER BY n.level, n.sort_order
    `);
    const { rows: profiles } = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission, jp.org_node_id,
             jp.responsibilities, jp.key_results, jp.competencies, jp.training_required, jp.source,
             COALESCE((SELECT json_agg(json_build_object(
               'id', e.id, 'full_name', e.full_name, 'position', e.position, 'is_primary', jpe.is_primary, 'notes', jpe.notes
             ) ORDER BY jpe.is_primary DESC, e.full_name)
                FROM job_profile_employees jpe
                JOIN employees e ON e.id = jpe.employee_id
                WHERE jpe.profile_id = jp.id AND jpe.until IS NULL AND e.is_active=true), '[]'::json) AS employees
      FROM job_profiles jp
      WHERE jp.is_active = TRUE
      ORDER BY jp.area, jp.role_label
    `);
    const { rows: externals } = await query(`
      SELECT ec.id, ec.full_name, ec.role, ec.organization, ec.email, ec.phone,
             ec.org_node_id, ec.supervisor_in_dassa_id,
             sup.full_name AS supervisor_name
        FROM external_contacts ec
        LEFT JOIN employees sup ON sup.id = ec.supervisor_in_dassa_id
       WHERE ec.is_active = TRUE
       ORDER BY ec.full_name
    `);
    res.json({ ok: true, nodes, profiles, externals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/puestos · lista de puestos con cantidad de empleados
router.get('/puestos', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission,
             jp.org_node_id,
             (SELECT COUNT(*) FROM job_profile_employees jpe
                JOIN employees e ON e.id=jpe.employee_id
               WHERE jpe.profile_id=jp.id AND jpe.until IS NULL AND e.is_active=true)::int AS empleados_count,
             COALESCE((SELECT json_agg(json_build_object(
                  'id', e.id, 'full_name', e.full_name, 'is_primary', jpe.is_primary
                ) ORDER BY jpe.is_primary DESC, e.full_name)
                FROM job_profile_employees jpe
                JOIN employees e ON e.id=jpe.employee_id
                WHERE jpe.profile_id=jp.id AND jpe.until IS NULL AND e.is_active=true),
                '[]'::json) AS employees
        FROM job_profiles jp
       WHERE jp.is_active=true
       ORDER BY jp.area, jp.role_label
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/externals · contactos externos
router.get('/externals', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT ec.*, sup.full_name AS supervisor_name, n.name AS org_node_name
        FROM external_contacts ec
        LEFT JOIN employees sup ON sup.id = ec.supervisor_in_dassa_id
        LEFT JOIN org_chart_nodes n ON n.id = ec.org_node_id
       WHERE ec.is_active = true
       ORDER BY ec.full_name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/puesto/:id · detalle de un puesto
router.get('/puesto/:id', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT jp.*,
             n.name AS node_name, n.area AS node_area,
             jp.risks AS risks_text,
             COALESCE((SELECT json_agg(json_build_object(
               'id', e.id, 'full_name', e.full_name, 'position', e.position, 'since', jpe.since, 'is_primary', jpe.is_primary
             )) FROM job_profile_employees jpe JOIN employees e ON e.id=jpe.employee_id
                WHERE jpe.profile_id = jp.id AND jpe.until IS NULL), '[]'::json) AS employees,
             COALESCE((SELECT json_agg(json_build_object(
               'id', r.id, 'code', r.code, 'activity', r.activity, 'npr', r.npr, 'npr_level', r.npr_level
             )) FROM job_profile_risks jpr JOIN risks r ON r.id=jpr.risk_id
                WHERE jpr.profile_id = jp.id), '[]'::json) AS amfe_risks,
             COALESCE((SELECT json_agg(json_build_object(
               'id', p.id, 'code', p.code, 'title', p.title, 'module', p.module
             )) FROM job_profile_procedures jpp LEFT JOIN procedures p ON p.id=jpp.fk_procedure_id
                WHERE jpp.profile_id = jp.id), '[]'::json) AS procedures,
             (SELECT json_build_object(
               'coverage_level', s.coverage_level,
               'primary_replacement_text', s.primary_replacement_text,
               'secondary_replacement_text', s.secondary_replacement_text,
               'notes', s.notes
             ) FROM job_profile_succession s WHERE s.profile_id = jp.id LIMIT 1) AS succession
      FROM job_profiles jp
      LEFT JOIN org_chart_nodes n ON n.id = jp.org_node_id
      WHERE jp.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, profile: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/mi-puesto · ficha + puestos del user logueado (legacy)
router.get('/mi-puesto', async (req, res) => {
  try {
    // Empleado linkeado por user_id; si no hay link, intenta por email
    const employeeQ = await query(`
      SELECT e.*,
             sup.full_name AS supervisor_name, sup.email AS supervisor_email,
             sup.phone AS supervisor_phone
        FROM employees e
        LEFT JOIN employees sup ON sup.id = e.supervisor_id
       WHERE e.user_id = $1
          OR e.email = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`, [req.user.id]);
    const employee = employeeQ.rows[0] || null;

    let profiles = [];
    let certifications = [];

    if (employee) {
      const profQ = await query(`
        SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission,
               jp.responsibilities, jp.key_results, jp.competencies, jp.training_required,
               jpe.is_primary, jpe.since, jpe.notes
          FROM job_profile_employees jpe
          JOIN job_profiles jp ON jp.id = jpe.profile_id
         WHERE jpe.employee_id = $1 AND jpe.until IS NULL AND jp.is_active = TRUE
         ORDER BY jpe.is_primary DESC, jp.role_label`, [employee.id]);
      profiles = profQ.rows;

      const certQ = await query(`
        SELECT id, cert_type, cert_name, issued_by, issue_date, expiry_date, status, notes
          FROM employee_certifications
         WHERE employee_id = $1
         ORDER BY expiry_date NULLS LAST, issue_date DESC`, [employee.id]);
      certifications = certQ.rows;
    }

    res.json({ ok: true, employee, profiles, certifications });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/mi-perfil · vista 360 del operario (Master DASSA v2026)
// Devuelve: empleado + ficha primaria completa + KPIs estructurados + capacitaciones con estado
// + amonestaciones/avisos + certificaciones + métricas de cumplimiento
router.get('/mi-perfil', async (req, res) => {
  try {
    // 1) Resolver empleado
    const employeeQ = await query(`
      SELECT e.*,
             sup.full_name AS supervisor_name, sup.email AS supervisor_email,
             sup.phone AS supervisor_phone
        FROM employees e
        LEFT JOIN employees sup ON sup.id = e.supervisor_id
       WHERE e.user_id = $1
          OR e.email = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`, [req.user.id]);
    const employee = employeeQ.rows[0] || null;

    // 0) Objetivos de los que el usuario es responsable (año en curso) — destacados en su perfil.
    //    Se resuelve por req.user.id (objectives.responsible_id = users.id), independiente de la ficha de empleado,
    //    para que también los vean los directores sin employee linkeado.
    const objQ = await query(`
      SELECT o.id, o.code, o.name, o.area, o.target_metric, o.target_value, o.baseline_value,
             oi.indicator_name, oi.unit, oi.target_value AS ind_target, oi.frequency,
             (SELECT json_build_object('period', m.period, 'value', m.value)
                FROM objective_measurements m
               WHERE m.indicator_id = oi.id
                 AND date_part('year', m.period) = date_part('year', CURRENT_DATE)
               ORDER BY m.period DESC LIMIT 1) AS last_measurement,
             (SELECT COALESCE(SUM(m.value), 0) FROM objective_measurements m
               WHERE m.indicator_id = oi.id
                 AND date_part('year', m.period) = date_part('year', CURRENT_DATE)) AS ytd_sum,
             (SELECT COUNT(*) FROM objective_measurements m
               WHERE m.indicator_id = oi.id
                 AND date_part('year', m.period) = date_part('year', CURRENT_DATE)) AS ytd_count
        FROM objectives o
        LEFT JOIN LATERAL (
          SELECT * FROM objective_indicators WHERE objective_id = o.id ORDER BY created_at LIMIT 1
        ) oi ON TRUE
       WHERE o.responsible_id = $1
         AND o.year = date_part('year', CURRENT_DATE)::int
         AND o.status = 'activo'
       ORDER BY o.code`, [req.user.id]);
    const objectives = objQ.rows;

    if (!employee) {
      return res.json({ ok: true, employee: null, profiles: [], training_status: [], warnings: [], certifications: [], succession: [], objectives });
    }

    // 2) Fichas asignadas (con todos los campos del Master)
    const profQ = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission,
             jp.responsibilities, jp.authority, jp.objectives, jp.kpis,
             jp.competencies, jp.training_required, jp.training_recommended,
             jp.records_associated, jp.risks AS risks_text,
             jp.ai_principal, jp.ai_secondaries,
             jp.iso_9001, jp.iso_14001, jp.iso_45001,
             jp.autonomy_level, jp.is_critical, jp.reports_to_role,
             jp.source,
             jpe.is_primary, jpe.since, jpe.notes
        FROM job_profile_employees jpe
        JOIN job_profiles jp ON jp.id = jpe.profile_id
       WHERE jpe.employee_id = $1 AND jpe.until IS NULL AND jp.is_active = TRUE
       ORDER BY jpe.is_primary DESC, jp.role_label`, [employee.id]);
    const profiles = profQ.rows;

    // 3) Estado de capacitaciones requeridas
    const trainQ = await query(`
      SELECT vets.cap_code, vets.requirement, vets.training_title, vets.training_category,
             vets.recurrence_days, vets.last_attended_at, vets.next_programmed_at, vets.status
        FROM v_employee_training_status vets
       WHERE vets.employee_id = $1
       ORDER BY
         CASE vets.status
           WHEN 'vencida' THEN 1
           WHEN 'pendiente' THEN 2
           WHEN 'programada' THEN 3
           WHEN 'completada' THEN 4
         END,
         CASE vets.requirement WHEN 'obligatoria' THEN 1 ELSE 2 END,
         vets.cap_code`, [employee.id]);
    const training_status = trainQ.rows;

    // 4) Amonestaciones / avisos
    const warnQ = await query(`
      SELECT w.id, w.warning_type, w.title, w.body, w.severity,
             w.issued_at, w.acknowledged_at, w.issued_by_name,
             w.evidence_url, w.notes,
             u.full_name AS issued_by_user
        FROM employee_warnings w
        LEFT JOIN users u ON u.id = w.issued_by
       WHERE w.employee_id = $1
       ORDER BY w.issued_at DESC
       LIMIT 50`, [employee.id]);
    const warnings = warnQ.rows;

    // 5) Certificaciones
    const certQ = await query(`
      SELECT id, cert_type, cert_name, issued_by, issue_date, expiry_date, status, notes
        FROM employee_certifications
       WHERE employee_id = $1
       ORDER BY expiry_date NULLS LAST, issue_date DESC`, [employee.id]);
    const certifications = certQ.rows;

    // 6) Sucesión (puesto primario)
    let succession = null;
    if (profiles[0]?.id) {
      const sucQ = await query(`
        SELECT coverage_level, primary_replacement_text, secondary_replacement_text, notes
          FROM job_profile_succession
         WHERE profile_id = $1
         LIMIT 1`, [profiles[0].id]);
      succession = sucQ.rows[0] || null;
    }

    // 7) Métricas de cumplimiento (resumen)
    const total = training_status.length;
    const obligatorias = training_status.filter(t => t.requirement === 'obligatoria');
    const compliance = {
      total_requeridas: total,
      total_obligatorias: obligatorias.length,
      completadas: training_status.filter(t => t.status === 'completada').length,
      vencidas: training_status.filter(t => t.status === 'vencida').length,
      programadas: training_status.filter(t => t.status === 'programada').length,
      pendientes: training_status.filter(t => t.status === 'pendiente').length,
      obligatorias_completadas: obligatorias.filter(t => t.status === 'completada').length,
      pct_obligatorias_ok: obligatorias.length === 0
        ? 100
        : Math.round((obligatorias.filter(t => t.status === 'completada').length / obligatorias.length) * 100),
    };

    res.json({ ok: true, employee, profiles, training_status, warnings, certifications, succession, compliance, objectives });
  } catch (e) {
    console.error('[mi-perfil] error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CRUD · EMPLOYEE_WARNINGS (amonestaciones / avisos)
// ═══════════════════════════════════════════════════════════════════
router.get('/warnings/:employeeId', requireRole(...ADMIN_ROLES, 'sgi_leader', 'rrhh'), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT w.*, u.full_name AS issued_by_user
        FROM employee_warnings w
        LEFT JOIN users u ON u.id = w.issued_by
       WHERE w.employee_id = $1
       ORDER BY w.issued_at DESC`, [req.params.employeeId]);
    res.json({ ok: true, warnings: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/warnings', requireRole(...ADMIN_ROLES, 'sgi_leader', 'rrhh'), async (req, res) => {
  const { employee_id, warning_type, title, body, severity, evidence_url, related_finding_id, notes } = req.body;
  if (!employee_id || !warning_type || !title) {
    return res.status(400).json({ error: 'employee_id, warning_type y title son requeridos' });
  }
  try {
    const { rows } = await query(`
      INSERT INTO employee_warnings (employee_id, warning_type, title, body, severity, evidence_url, related_finding_id, notes, issued_by, issued_by_name)
      VALUES ($1, $2, $3, $4, COALESCE($5,'media'), $6, $7, $8, $9, $10)
      RETURNING *`,
      [employee_id, warning_type, title, body || null, severity || null, evidence_url || null, related_finding_id || null, notes || null, req.user.id, req.user.full_name]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/warnings/:id/acknowledge', async (req, res) => {
  // El propio empleado puede reconocer su amonestación
  try {
    const { rows } = await query(`
      UPDATE employee_warnings
         SET acknowledged_at = NOW(),
             acknowledged_signature = $2,
             updated_at = NOW()
       WHERE id = $1
         AND employee_id IN (SELECT id FROM employees WHERE user_id = $3)
       RETURNING *`,
      [req.params.id, req.body.signature || req.user.full_name, req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado o sin permisos' });
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CRUD · JOB PROFILES (fichas de puesto)
// ═══════════════════════════════════════════════════════════════════
router.post('/puestos', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { role_label } = req.body;
  if (!role_label) return res.status(400).json({ error: 'role_label es requerido' });
  try {
    const cols = [], placeholders = [], params = [];
    for (const k of PROFILE_FIELDS) {
      if (req.body[k] !== undefined) {
        cols.push(k);
        const val = req.body[k] === '' ? null : req.body[k];
        placeholders.push(p(params, val));
      }
    }
    cols.push('source'); placeholders.push(p(params, 'app-ui'));
    const { rows } = await query(
      `INSERT INTO job_profiles (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      params);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un puesto con ese role_label' });
    res.status(400).json({ error: e.message });
  }
});

router.patch('/puestos/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  const sets = [], params = [];
  for (const k of PROFILE_FIELDS) {
    if (req.body[k] !== undefined) {
      const val = req.body[k] === '' ? null : req.body[k];
      sets.push(`${k}=${p(params, val)}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE job_profiles SET ${sets.join(', ')}, updated_at=NOW()
        WHERE id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Puesto no encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/puestos/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    // Soft delete: marca inactive + libera asignaciones
    const { rows } = await query(
      `UPDATE job_profiles SET is_active=false, updated_at=NOW()
        WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Puesto no encontrado' });
    await query(`DELETE FROM job_profile_employees WHERE profile_id=$1`, [req.params.id]);
    res.json({ ok: true, soft_deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Asignar empleado a un puesto
router.post('/puestos/:id/empleados', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { employee_id, is_primary, since, until, notes } = req.body;
  if (!employee_id) return res.status(400).json({ error: 'employee_id es requerido' });
  try {
    if (is_primary) {
      await query(`UPDATE job_profile_employees SET is_primary=false WHERE profile_id=$1`, [req.params.id]);
    }
    const { rows } = await query(
      `INSERT INTO job_profile_employees (profile_id, employee_id, is_primary, since, until, notes)
       VALUES ($1,$2,COALESCE($3,false),$4,$5,$6) RETURNING *`,
      [req.params.id, employee_id, is_primary, since || null, until || null, notes || null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/puestos/:id/empleados/:assignId', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM job_profile_employees WHERE id=$1 AND profile_id=$2`,
      [req.params.assignId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Asignación no encontrada' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CRUD · ORG CHART NODES
// ═══════════════════════════════════════════════════════════════════
router.post('/nodes', requireRole(...ADMIN_ROLES), async (req, res) => {
  if (!req.body.name) return res.status(400).json({ error: 'name es requerido' });
  if (!req.body.type) return res.status(400).json({ error: 'type es requerido' });
  try {
    const cols = [], placeholders = [], params = [];
    for (const k of NODE_FIELDS) {
      if (req.body[k] !== undefined) {
        cols.push(k);
        placeholders.push(p(params, req.body[k] === '' ? null : req.body[k]));
      }
    }
    const { rows } = await query(
      `INSERT INTO org_chart_nodes (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      params);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/nodes/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  // Guarda contra ciclos: no permitir parent_id que sea descendiente del nodo
  if (req.body.parent_id) {
    if (req.body.parent_id === req.params.id)
      return res.status(400).json({ error: 'Un nodo no puede ser su propio padre' });
    const isDescendant = await query(`
      WITH RECURSIVE desc AS (
        SELECT id FROM org_chart_nodes WHERE parent_id = $1
        UNION ALL
        SELECT n.id FROM org_chart_nodes n JOIN desc d ON n.parent_id = d.id
      ) SELECT 1 FROM desc WHERE id = $2 LIMIT 1`, [req.params.id, req.body.parent_id]);
    if (isDescendant.rows.length)
      return res.status(400).json({ error: 'No se puede mover un nodo dentro de su propio descendiente' });
  }
  const sets = [], params = [];
  for (const k of NODE_FIELDS) {
    if (req.body[k] !== undefined) {
      sets.push(`${k}=${p(params, req.body[k] === '' ? null : req.body[k])}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE org_chart_nodes SET ${sets.join(', ')}, updated_at=NOW()
        WHERE id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Nodo no encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/nodes/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    // Verifica que no tenga hijos o puestos
    const checks = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM org_chart_nodes WHERE parent_id=$1`, [req.params.id]),
      query(`SELECT COUNT(*) AS c FROM job_profiles WHERE org_node_id=$1 AND is_active=true`, [req.params.id]),
      query(`SELECT COUNT(*) AS c FROM external_contacts WHERE org_node_id=$1 AND is_active=true`, [req.params.id]),
    ]);
    const children = +checks[0].rows[0].c;
    const profiles = +checks[1].rows[0].c;
    const externals = +checks[2].rows[0].c;
    if (children + profiles + externals > 0) {
      return res.status(409).json({
        error: `Nodo en uso: ${children} subnodos, ${profiles} puestos, ${externals} externos. Movelos antes de eliminar.`
      });
    }
    const { rowCount } = await query(`DELETE FROM org_chart_nodes WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Nodo no encontrado' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CRUD · EXTERNAL CONTACTS
// ═══════════════════════════════════════════════════════════════════
router.post('/externals', requireRole(...ADMIN_ROLES), async (req, res) => {
  if (!req.body.full_name) return res.status(400).json({ error: 'full_name es requerido' });
  try {
    const cols = [], placeholders = [], params = [];
    for (const k of EXTERNAL_FIELDS) {
      if (req.body[k] !== undefined) {
        cols.push(k);
        placeholders.push(p(params, req.body[k] === '' ? null : req.body[k]));
      }
    }
    const { rows } = await query(
      `INSERT INTO external_contacts (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      params);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/externals/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  const sets = [], params = [];
  for (const k of EXTERNAL_FIELDS) {
    if (req.body[k] !== undefined) {
      sets.push(`${k}=${p(params, req.body[k] === '' ? null : req.body[k])}`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE external_contacts SET ${sets.join(', ')}, updated_at=NOW()
        WHERE id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Contacto no encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/externals/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE external_contacts SET is_active=false, updated_at=NOW()
        WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Contacto no encontrado' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
