import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/employees
router.get('/', async (req, res) => {
  const { sector, status, search } = req.query;
  let sql = `SELECT e.*, ev.full_name AS evaluator_name, ev2.full_name AS secondary_evaluator_name
             FROM employees e
             LEFT JOIN employees ev ON ev.id = e.evaluator_id
             LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
             WHERE 1=1`;
  const params = [];

  if (sector)  sql += ` AND e.sector = ${p(params, sector)}`;
  if (status === 'activo')   sql += ` AND e.is_active = true`;
  if (status === 'inactivo') sql += ` AND e.is_active = false`;
  if (search) {
    sql += ` AND (e.full_name ILIKE ${p(params, `%${search}%`)} OR e.email ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY e.full_name ASC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error employees GET:', err.message);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// GET /api/employees/:id — ficha completa con puestos y certificaciones
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*,
              ev.full_name  AS evaluator_name,
              ev2.full_name AS secondary_evaluator_name,
              sup.full_name AS supervisor_name
         FROM employees e
         LEFT JOIN employees ev  ON ev.id  = e.evaluator_id
         LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
         LEFT JOIN employees sup ON sup.id = e.supervisor_id
        WHERE e.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });

    const positions = await query(
      `SELECT jpe.id, jpe.profile_id, jp.role_label, jp.area, jp.seniority,
              jpe.is_primary, jpe.since, jpe.until, jpe.notes
         FROM job_profile_employees jpe
         JOIN job_profiles jp ON jp.id = jpe.profile_id
        WHERE jpe.employee_id = $1
        ORDER BY jpe.is_primary DESC, jpe.since DESC`, [req.params.id]);

    const certs = await query(
      `SELECT id, cert_type, cert_name, issued_by, issue_date, expiry_date,
              status, file_url, notes
         FROM employee_certifications
        WHERE employee_id = $1
        ORDER BY expiry_date NULLS LAST, issue_date DESC`, [req.params.id]);

    res.json({ ...rows[0], positions: positions.rows, certifications: certs.rows });
  } catch (err) {
    console.error('Error employees GET /:id:', err.message);
    res.status(500).json({ error: 'Error al obtener empleado' });
  }
});

const EDITABLE_FIELDS = [
  'full_name','email','phone','whatsapp',
  'sector','position','evaluator_id','secondary_evaluator_id','supervisor_id','user_id','is_active',
  'cuil','birth_date','address',
  'emergency_contact_name','emergency_contact_phone','emergency_contact_relation',
  'hire_date','contract_type','work_schedule','notes'
];

// POST /api/employees
router.post('/', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  if (!req.body.full_name) return res.status(400).json({ error: 'El nombre completo es requerido' });

  const cols = [];
  const placeholders = [];
  const params = [];
  for (const k of EDITABLE_FIELDS) {
    if (req.body[k] !== undefined) {
      cols.push(k);
      const val = req.body[k] === '' ? null : req.body[k];
      placeholders.push(p(params, val));
    }
  }

  try {
    const { rows } = await query(
      `INSERT INTO employees (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error employees POST:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/employees/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const updates = [];
  const params = [];

  for (const key of EDITABLE_FIELDS) {
    if (req.body[key] !== undefined) {
      const val = req.body[key] === '' ? null : req.body[key];
      updates.push(`${key} = ${p(params, val)}`);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE employees SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ═══ CERTIFICACIONES ════════════════════════════════════════════════
// GET /api/employees/:id/certifications
router.get('/:id/certifications', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM employee_certifications
        WHERE employee_id=$1
        ORDER BY expiry_date NULLS LAST, issue_date DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/employees/:id/certifications
router.post('/:id/certifications', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { cert_type, cert_name, issued_by, issue_date, expiry_date, status, file_url, notes } = req.body;
  if (!cert_name) return res.status(400).json({ error: 'cert_name es requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO employee_certifications
         (employee_id, cert_type, cert_name, issued_by, issue_date, expiry_date, status, file_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'vigente'),$8,$9) RETURNING *`,
      [req.params.id, cert_type || null, cert_name, issued_by || null,
       issue_date || null, expiry_date || null, status, file_url || null, notes || null]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/certifications/:certId', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const allowed = ['cert_type','cert_name','issued_by','issue_date','expiry_date','status','file_url','notes'];
  const sets = []; const params = [];
  for (const k of allowed)
    if (req.body[k] !== undefined) sets.push(`${k}=${p(params, req.body[k] === '' ? null : req.body[k])}`);
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
  params.push(req.params.certId, req.params.id);
  try {
    const { rows } = await query(
      `UPDATE employee_certifications SET ${sets.join(', ')}, updated_at=NOW()
        WHERE id=$${params.length - 1} AND employee_id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Certificación no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/certifications/:certId', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM employee_certifications WHERE id=$1 AND employee_id=$2`,
      [req.params.certId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Certificación no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══ ASIGNACIÓN A PUESTOS (job_profile_employees) ═══════════════════
router.get('/:id/positions', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT jpe.id, jpe.profile_id, jp.role_label, jp.area, jp.seniority,
              jpe.is_primary, jpe.since, jpe.until, jpe.notes
         FROM job_profile_employees jpe
         JOIN job_profiles jp ON jp.id = jpe.profile_id
        WHERE jpe.employee_id = $1
        ORDER BY jpe.is_primary DESC, jpe.since DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/positions', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { profile_id, is_primary, since, until, notes } = req.body;
  if (!profile_id) return res.status(400).json({ error: 'profile_id es requerido' });
  try {
    // Si is_primary=true, bajamos los demás del mismo empleado
    if (is_primary) {
      await query(`UPDATE job_profile_employees SET is_primary=false WHERE employee_id=$1`, [req.params.id]);
    }
    const { rows } = await query(
      `INSERT INTO job_profile_employees (employee_id, profile_id, is_primary, since, until, notes)
       VALUES ($1,$2,COALESCE($3,false),$4,$5,$6) RETURNING *`,
      [req.params.id, profile_id, is_primary, since || null, until || null, notes || null]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/positions/:assignId', requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM job_profile_employees WHERE id=$1 AND employee_id=$2`,
      [req.params.assignId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Asignación no encontrada' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/employees/:id (soft delete)
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE employees SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar empleado' });
  }
});

export default router;
