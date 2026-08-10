import { Router } from 'express';
import { query, getClient } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

function p(params, val) { params.push(val); return `$${params.length}`; }

// GET /api/incidents
router.get('/', async (req, res) => {
  const { incident_type, status, severity, search } = req.query;
  let sql = `SELECT i.*, u.full_name AS reported_by_name, r.full_name AS responsible_name
             FROM incidents i
             LEFT JOIN users u ON u.id = i.reported_by
             LEFT JOIN users r ON r.id = i.responsible_id
             WHERE 1=1`;
  const params = [];

  if (incident_type) sql += ` AND i.incident_type = ${p(params, incident_type)}`;
  if (status)        sql += ` AND i.status = ${p(params, status)}`;
  if (severity)      sql += ` AND i.severity = ${p(params, severity)}`;
  if (search) {
    sql += ` AND (i.description ILIKE ${p(params, `%${search}%`)} OR i.area ILIKE ${p(params, `%${search}%`)} OR i.code ILIKE ${p(params, `%${search}%`)})`;
  }
  sql += ' ORDER BY i.date DESC';

  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Incidents GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener incidentes' });
  }
});

// GET /api/incidents/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, u.full_name AS reported_by_name, r.full_name AS responsible_name
       FROM incidents i
       LEFT JOIN users u ON u.id = i.reported_by
       LEFT JOIN users r ON r.id = i.responsible_id
       WHERE i.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener incidente' });
  }
});

// POST /api/incidents
router.post('/', requireRole('master_admin', 'director', 'sgi_leader', 'area_responsible'), async (req, res) => {
  const {
    incident_type, date, time, area, severity, description,
    injured_person, witness, immediate_cause, root_cause,
    corrective_action, responsible_id, art_reported, lost_time_days
  } = req.body;

  if (!incident_type || !date || !description) {
    return res.status(400).json({ error: 'Tipo, fecha y descripción son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO incidents (incident_type, date, time, area, severity, description,
        injured_person, witness, immediate_cause, root_cause,
        corrective_action, reported_by, responsible_id, art_reported, lost_time_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [incident_type, date, time || null, area || null, severity || 'leve',
       description, injured_person || null, witness || null,
       immediate_cause || null, root_cause || null, corrective_action || null,
       req.user.id, responsible_id || null, art_reported || false, lost_time_days || 0]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Incidents POST error:', error.message);
    res.status(500).json({ error: 'Error al crear incidente' });
  }
});

// PATCH /api/incidents/:id
router.patch('/:id', requireRole('master_admin', 'director', 'sgi_leader', 'area_responsible'), async (req, res) => {
  const ALLOWED = [
    'incident_type', 'date', 'time', 'area', 'severity', 'status', 'description',
    'injured_person', 'witness', 'immediate_cause', 'root_cause',
    'corrective_action', 'responsible_id', 'art_reported', 'lost_time_days'
  ];
  const updates = [];
  const params = [];

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ${p(params, req.body[key])}`);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

  params.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params);
    if (!rows[0]) return res.status(404).json({ error: 'Incidente no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Incidents PATCH error:', error.message);
    res.status(500).json({ error: 'Error al actualizar incidente' });
  }
});

// POST /api/incidents/:id/to-finding — abre la no conformidad (o el aviso) que
// se desprende de un accidente o incidente. Ambos quedan vinculados: el
// incidente es el hecho, la NC es el desvío del sistema que lo permitió.
router.post('/:id/to-finding',
  requireRole('master_admin', 'director', 'sgi_leader'), async (req, res) => {
  const { title, finding_type, assigned_to, due_date, report_kind, reason } = req.body;
  const kind = report_kind === 'hallazgo' ? 'hallazgo' : 'nc';

  if (kind === 'nc' && !['nc_real', 'nc_potencial'].includes(finding_type)) {
    return res.status(400).json({ error: 'Indicá si es no conformidad real o potencial' });
  }
  if (kind === 'nc' && (!assigned_to || !due_date)) {
    return res.status(400).json({ error: 'La no conformidad necesita responsable y fecha límite' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // FOR UPDATE: dos clics simultáneos generaban dos NC para el mismo incidente.
    const cur = await client.query(
      'SELECT * FROM incidents WHERE id = $1 FOR UPDATE', [req.params.id]);
    const incident = cur.rows[0];
    if (!incident) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }
    if (incident.finding_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este incidente ya tiene un hallazgo asociado' });
    }

    const { rows } = await client.query(
      `INSERT INTO findings
         (title, description, finding_type, origin, area, due_date,
          assigned_to, immediate_action, reported_by, report_kind)
       VALUES ($1,$2,$3,'accidente',$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        title || `Desvío asociado a ${incident.code}`,
        `${incident.description}\n\n---\nOriginado en el ${incident.incident_type} ${incident.code} del ${incident.date}.`,
        kind === 'nc' ? finding_type : 'mejora',
        incident.area || null,
        due_date || null,
        assigned_to || null,
        incident.corrective_action || null,
        req.user.id,
        kind,
      ]
    );
    const finding = rows[0];

    await client.query('UPDATE incidents SET finding_id = $1 WHERE id = $2',
      [finding.id, incident.id]);

    await client.query(
      `INSERT INTO finding_kind_history (finding_id, from_kind, to_kind, reason, changed_by)
       VALUES ($1,'incidente',$2,$3,$4)`,
      [finding.id, kind,
       `${(reason || '').trim() || 'Desvío detectado a partir del incidente'} — originado en ${incident.code}`,
       req.user.id]
    );

    await client.query(
      `INSERT INTO finding_status_history (finding_id, from_status, to_status, changed_by, note)
       VALUES ($1, NULL, $2, $3, $4)`,
      [finding.id, finding.status, req.user.id, `Alta desde el incidente ${incident.code}`]
    );

    await client.query('COMMIT');
    res.status(201).json(finding);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Incidents to-finding error:', error.message);
    res.status(500).json({ error: 'Error al generar el hallazgo' });
  } finally {
    client.release();
  }
});

// DELETE /api/incidents/:id
router.delete('/:id', requireRole('master_admin', 'director'), async (req, res) => {
  try {
    await query('DELETE FROM incidents WHERE id = $1', [req.params.id]);
    res.json({ message: 'Incidente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar incidente' });
  }
});

export default router;
