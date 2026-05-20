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
             COALESCE((SELECT json_agg(json_build_object(
               'id', e.id, 'full_name', e.full_name, 'position', e.position, 'since', jpe.since, 'is_primary', jpe.is_primary
             )) FROM job_profile_employees jpe JOIN employees e ON e.id=jpe.employee_id
                WHERE jpe.profile_id = jp.id AND jpe.until IS NULL), '[]'::json) AS employees,
             COALESCE((SELECT json_agg(json_build_object(
               'id', r.id, 'code', r.code, 'activity', r.activity, 'npr', r.npr, 'npr_level', r.npr_level
             )) FROM job_profile_risks jpr JOIN risks r ON r.id=jpr.risk_id
                WHERE jpr.profile_id = jp.id), '[]'::json) AS risks,
             COALESCE((SELECT json_agg(json_build_object(
               'id', p.id, 'code', p.code, 'title', p.title, 'module', p.module
             )) FROM job_profile_procedures jpp LEFT JOIN procedures p ON p.id=jpp.fk_procedure_id
                WHERE jpp.profile_id = jp.id), '[]'::json) AS procedures
      FROM job_profiles jp
      LEFT JOIN org_chart_nodes n ON n.id = jp.org_node_id
      WHERE jp.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true, profile: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orgchart/mi-puesto · ficha + puestos del user logueado
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
