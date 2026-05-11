// =============================================================================
// /api/orgchart · organigrama + puestos + empleados
// =============================================================================
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

// GET /api/orgchart · árbol completo
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
             jp.key_results, jp.competencies, jp.training_required, jp.source,
             COALESCE((SELECT json_agg(json_build_object(
               'id', e.id, 'full_name', e.full_name, 'position', e.position, 'is_primary', jpe.is_primary, 'notes', jpe.notes
             )) FROM job_profile_employees jpe
                  JOIN employees e ON e.id = jpe.employee_id
              WHERE jpe.profile_id = jp.id AND jpe.until IS NULL), '[]'::json) AS employees
      FROM job_profiles jp
      WHERE jp.is_active = TRUE
      ORDER BY jp.area, jp.role_label
    `);
    res.json({ ok: true, nodes, profiles });
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

// GET /api/orgchart/mi-puesto · puestos del user logueado
router.get('/mi-puesto', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.mission, jp.key_results,
             jp.competencies, jp.training_required, jpe.is_primary, jpe.since, jpe.notes
      FROM job_profile_employees jpe
      JOIN job_profiles jp ON jp.id = jpe.profile_id
      JOIN employees e ON e.id = jpe.employee_id
      WHERE e.user_id = $1 AND jpe.until IS NULL AND jp.is_active = TRUE
      ORDER BY jpe.is_primary DESC
    `, [req.user.id]);
    res.json({ ok: true, profiles: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
