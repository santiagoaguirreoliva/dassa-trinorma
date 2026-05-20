// routes/inspections.js — Módulo "Ronda de Inspecciones" (F1).
// Router autenticado: inspecciones, plantillas, máquinas y operadores.
// Ref: docs/SPEC-RONDA-INSPECCIONES.md
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { query, getClient } from '../db/db.js';
import { authenticate, requireRole, ADMIN_ROLES } from '../middleware/auth.js';
import { saveBase64File } from '../services/uploads.js';
import { generateDueInspections, markOverdueInspections } from '../services/inspections-generator.js';

const router = Router();
router.use(authenticate);

// ─── helpers ──────────────────────────────────────────────────────
function p(params, val) { params.push(val); return `$${params.length}`; }

// Distancia Haversine en metros
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ¿El punto cae dentro del geofence DASSA? null si no hay datos suficientes.
async function geoInside(lat, lng) {
  if (lat == null || lng == null) return null;
  const { rows } = await query(
    `SELECT key, value FROM insp_config
      WHERE key IN ('geofence_lat','geofence_lng','geofence_radius_m')`
  );
  const c = Object.fromEntries(rows.map((r) => [r.key, parseFloat(r.value)]));
  if (!c.geofence_lat || !c.geofence_lng || !c.geofence_radius_m) return null;
  return distM(lat, lng, c.geofence_lat, c.geofence_lng) <= c.geofence_radius_m;
}

// Guarda un array de fotos base64 → array de URLs
function savePhotos(list, label) {
  const urls = [];
  for (const b64 of (list || [])) {
    const url = saveBase64File(b64, label);
    if (url) urls.push(url);
  }
  return urls;
}

// ════════════════════════════════════════════════════════════════
// STATS / ANALYTICS
// ════════════════════════════════════════════════════════════════
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='pendiente')::int AS pendientes,
        COUNT(*) FILTER (WHERE status IN ('en_curso','en_cofirma'))::int AS en_proceso,
        COUNT(*) FILTER (WHERE status='completada')::int AS completadas,
        COUNT(*) FILTER (WHERE status='vencida'
              OR (due_date < CURRENT_DATE AND status NOT IN ('completada','anulada')))::int AS vencidas,
        COUNT(*) FILTER (WHERE family='rondin')::int AS rondines,
        COUNT(*) FILTER (WHERE family='maquinaria')::int AS maquinaria,
        COALESCE(SUM(findings_count),0)::int AS hallazgos
      FROM insp_inspections WHERE deleted_at IS NULL`);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/analytics', async (_req, res) => {
  try {
    const [trend, byTemplate] = await Promise.all([
      query(`
        SELECT to_char(gs,'YYYY-MM-DD') AS semana,
          (SELECT COUNT(*) FROM insp_inspections i
            WHERE date_trunc('week',i.scheduled_date)=gs AND i.deleted_at IS NULL)::int AS programadas,
          (SELECT COUNT(*) FROM insp_inspections i
            WHERE date_trunc('week',i.scheduled_date)=gs AND i.status='completada'
              AND i.deleted_at IS NULL)::int AS completadas
        FROM generate_series(
               date_trunc('week',NOW()) - INTERVAL '7 weeks',
               date_trunc('week',NOW()), INTERVAL '1 week') gs
        ORDER BY gs`),
      query(`
        SELECT t.code, t.name,
          COUNT(i.id)::int AS total,
          COUNT(i.id) FILTER (WHERE i.status='completada')::int AS completadas
        FROM insp_templates t
        LEFT JOIN insp_inspections i ON i.template_id=t.id AND i.deleted_at IS NULL
        GROUP BY t.id, t.code, t.name ORDER BY t.code`),
    ]);
    res.json({ trend: trend.rows, by_template: byTemplate.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generación manual del período actual (admin) — sembrar o forzar el cron
router.post('/generate', requireRole(...ADMIN_ROLES), async (_req, res) => {
  try {
    const created = await generateDueInspections();
    const overdue = await markOverdueInspections();
    res.json({ created, overdue });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// CONFIG (key/value: geofence DASSA, etc.)
// ════════════════════════════════════════════════════════════════
router.get('/config', async (_req, res) => {
  try {
    const { rows } = await query('SELECT key, value FROM insp_config');
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/config/geofence', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { lat, lng, radius_m, calibrated } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || typeof radius_m !== 'number')
    return res.status(400).json({ error: 'lat, lng y radius_m son numéricos requeridos' });
  if (radius_m <= 0 || radius_m > 10000)
    return res.status(400).json({ error: 'radius_m debe ser > 0 y ≤ 10000' });
  try {
    const entries = [
      ['geofence_lat', String(lat)],
      ['geofence_lng', String(lng)],
      ['geofence_radius_m', String(radius_m)],
      ['geofence_calibrated', calibrated ? 'true' : 'false'],
    ];
    for (const [k, v] of entries) {
      await query(
        `INSERT INTO insp_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [k, v]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// PLANTILLAS
// ════════════════════════════════════════════════════════════════
router.get('/templates', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT t.*,
        (SELECT COUNT(*)::int FROM insp_template_items i WHERE i.template_id=t.id) AS items_count,
        COALESCE((SELECT json_agg(json_build_object('user_id',r.user_id,'name',u.full_name,'role',r.role))
                  FROM insp_template_responsibles r JOIN users u ON u.id=r.user_id
                  WHERE r.template_id=t.id),'[]'::json) AS responsibles
      FROM insp_templates t ORDER BY t.code`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM insp_templates WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const items = await query(
      'SELECT * FROM insp_template_items WHERE template_id=$1 ORDER BY order_idx', [req.params.id]);
    const resp = await query(
      `SELECT r.user_id, r.role, u.full_name AS name
         FROM insp_template_responsibles r JOIN users u ON u.id=r.user_id
        WHERE r.template_id=$1`, [req.params.id]);
    res.json({ ...rows[0], items: items.rows, responsibles: resp.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/templates', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { code, name, family, frequency, gen_cron, due_offset_days,
          requires_cosign, machine_type } = req.body;
  if (!code || !name || !family || !frequency)
    return res.status(400).json({ error: 'code, name, family y frequency son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO insp_templates (code,name,family,frequency,gen_cron,due_offset_days,requires_cosign,machine_type)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,2),COALESCE($7,false),$8) RETURNING *`,
      [code, name, family, frequency, gen_cron || null, due_offset_days,
       requires_cosign, machine_type || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una plantilla con ese código' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/templates/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const allowed = ['name','frequency','gen_cron','due_offset_days','requires_cosign','machine_type','active'];
    const sets = [], params = [];
    for (const k of allowed)
      if (k in req.body) sets.push(`${k}=${p(params, req.body[k])}`);
    if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE insp_templates SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reemplazar el set completo de ítems de una plantilla (editar checklist)
router.put('/templates/:id/items', requireRole(...ADMIN_ROLES), async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items debe ser un array' });
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM insp_template_items WHERE template_id=$1', [req.params.id]);
    let idx = 1;
    for (const it of items) {
      await client.query(
        `INSERT INTO insp_template_items
           (template_id,section,order_idx,label,response_type,is_critical,photo_on_fail)
         VALUES ($1,$2,$3,$4,COALESCE($5,'cumple'),COALESCE($6,false),COALESCE($7,false))`,
        [req.params.id, it.section || null, it.order_idx || idx++, it.label,
         it.response_type, it.is_critical, it.photo_on_fail]);
    }
    await client.query('COMMIT');
    const { rows } = await query(
      'SELECT * FROM insp_template_items WHERE template_id=$1 ORDER BY order_idx', [req.params.id]);
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ════════════════════════════════════════════════════════════════
// MÁQUINAS
// ════════════════════════════════════════════════════════════════
router.get('/machines', async (req, res) => {
  try {
    const params = [];
    let q = 'SELECT * FROM insp_machines WHERE 1=1';
    if (req.query.active === 'true') q += ' AND active=true';
    q += ' ORDER BY code';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/machines', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { code, name, type } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code y name son requeridos' });
  try {
    const { rows } = await query(
      `INSERT INTO insp_machines (code,name,type) VALUES ($1,$2,COALESCE($3,'autoelevador')) RETURNING *`,
      [code, name, type]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe una máquina con ese código' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/machines/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const allowed = ['code','name','type','active'];
    const sets = [], params = [];
    for (const k of allowed)
      if (k in req.body) sets.push(`${k}=${p(params, req.body[k])}`);
    if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE insp_machines SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Máquina no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/machines/:id/rotate-qr', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE insp_machines SET qr_token=uuid_generate_v4() WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Máquina no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// QR imprimible: data-URL PNG + URL pública del checklist
router.get('/machines/:id/qr', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM insp_machines WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Máquina no encontrada' });
    const base = process.env.APP_URL || `https://${req.get('host')}`;
    const url = `${base}/checklist-maquina?m=${rows[0].qr_token}`;
    const png = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    res.json({ machine: rows[0], url, png });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// OPERADORES (choferes/maquinistas — sin usuario SSO)
// ════════════════════════════════════════════════════════════════
router.get('/operators', async (req, res) => {
  try {
    const params = [];
    let q = `SELECT id, employee_id, full_name, active, created_at, updated_at
               FROM insp_operators WHERE 1=1`;
    if (req.query.active === 'true') q += ' AND active=true';
    q += ' ORDER BY full_name';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function validPin(pin) { return typeof pin === 'string' && /^\d{4}$/.test(pin); }

router.post('/operators', requireRole(...ADMIN_ROLES), async (req, res) => {
  const { full_name, employee_id, pin } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name es requerido' });
  if (!validPin(pin)) return res.status(400).json({ error: 'El PIN debe tener 4 dígitos' });
  try {
    const hash = await bcrypt.hash(pin, 10);
    const { rows } = await query(
      `INSERT INTO insp_operators (full_name,employee_id,pin_hash)
       VALUES ($1,$2,$3) RETURNING id, employee_id, full_name, active, created_at`,
      [full_name, employee_id || null, hash]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/operators/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const sets = [], params = [];
    for (const k of ['full_name','employee_id','active'])
      if (k in req.body) sets.push(`${k}=${p(params, req.body[k])}`);
    if ('pin' in req.body) {
      if (!validPin(req.body.pin)) return res.status(400).json({ error: 'El PIN debe tener 4 dígitos' });
      sets.push(`pin_hash=${p(params, await bcrypt.hash(req.body.pin, 10))}`);
    }
    if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE insp_operators SET ${sets.join(', ')} WHERE id=$${params.length}
       RETURNING id, employee_id, full_name, active, updated_at`, params);
    if (!rows[0]) return res.status(404).json({ error: 'Operador no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// INSPECCIONES — listado
// ════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { family, status, template_id, machine_id, desde, hasta, mine, overdue } = req.query;
    let q = `
      SELECT i.*, t.code AS template_code, t.name AS template_name, t.requires_cosign,
             m.code AS machine_code, m.name AS machine_name,
             o.full_name AS operator_name,
             cu.full_name AS completed_by_name,
             COALESCE((SELECT json_agg(json_build_object(
                         'user_id',a.user_id,'name',u.full_name,'role',a.role,'signed',a.signed)
                       ORDER BY a.role)
                       FROM insp_assignees a JOIN users u ON u.id=a.user_id
                      WHERE a.inspection_id=i.id),'[]'::json) AS assignees
        FROM insp_inspections i
        JOIN insp_templates t  ON t.id=i.template_id
        LEFT JOIN insp_machines m  ON m.id=i.machine_id
        LEFT JOIN insp_operators o ON o.id=i.operator_id
        LEFT JOIN users cu ON cu.id=i.completed_by
       WHERE i.deleted_at IS NULL`;
    const params = [];
    if (family)      q += ` AND i.family=${p(params, family)}`;
    if (status)      q += ` AND i.status=${p(params, status)}`;
    if (template_id) q += ` AND i.template_id=${p(params, template_id)}`;
    if (machine_id)  q += ` AND i.machine_id=${p(params, machine_id)}`;
    if (desde)       q += ` AND i.scheduled_date>=${p(params, desde)}`;
    if (hasta)       q += ` AND i.scheduled_date<=${p(params, hasta)}`;
    if (overdue === 'true')
      q += ` AND i.due_date<CURRENT_DATE AND i.status NOT IN ('completada','anulada')`;
    if (mine === 'true')
      q += ` AND EXISTS (SELECT 1 FROM insp_assignees a
                          WHERE a.inspection_id=i.id AND a.user_id=${p(params, req.user.id)})`;
    q += ' ORDER BY i.scheduled_date DESC, i.created_at DESC LIMIT 500';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Detalle con ítems de plantilla, respuestas y asignados
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT i.*, t.code AS template_code, t.name AS template_name,
             t.family AS template_family, t.requires_cosign,
             m.code AS machine_code, m.name AS machine_name,
             o.full_name AS operator_name, cu.full_name AS completed_by_name,
             co.full_name AS cosigned_by_name
        FROM insp_inspections i
        JOIN insp_templates t ON t.id=i.template_id
        LEFT JOIN insp_machines m  ON m.id=i.machine_id
        LEFT JOIN insp_operators o ON o.id=i.operator_id
        LEFT JOIN users cu ON cu.id=i.completed_by
        LEFT JOIN users co ON co.id=i.cosigned_by
       WHERE i.id=$1 AND i.deleted_at IS NULL`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inspección no encontrada' });
    const items = await query(`
      SELECT it.*, r.id AS response_id, r.answer, r.observations, r.photo_urls, r.finding_id
        FROM insp_template_items it
        LEFT JOIN insp_responses r ON r.item_id=it.id AND r.inspection_id=$1
       WHERE it.template_id=$2 ORDER BY it.order_idx`, [req.params.id, rows[0].template_id]);
    const assignees = await query(`
      SELECT a.user_id, a.role, a.signed, a.signed_at, u.full_name AS name
        FROM insp_assignees a JOIN users u ON u.id=a.user_id
       WHERE a.inspection_id=$1 ORDER BY a.role`, [req.params.id]);
    res.json({ ...rows[0], items: items.rows, assignees: assignees.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Marcar en curso
router.post('/:id/start', async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE insp_inspections SET status='en_curso'
        WHERE id=$1 AND status='pendiente' AND deleted_at IS NULL RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(409).json({ error: 'La inspección no está pendiente' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Completar — guarda respuestas, geo, firma; co-firma si la plantilla lo exige
router.post('/:id/complete', async (req, res) => {
  const { responses, geo_lat, geo_lng, signature_base64, machine_hours, notes } = req.body;
  if (!Array.isArray(responses))
    return res.status(400).json({ error: 'responses debe ser un array' });
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const insp = (await client.query(
      `SELECT i.*, t.requires_cosign FROM insp_inspections i
         JOIN insp_templates t ON t.id=i.template_id
        WHERE i.id=$1 AND i.deleted_at IS NULL FOR UPDATE OF i`, [req.params.id])).rows[0];
    if (!insp) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Inspección no encontrada' }); }
    if (!['pendiente','en_curso'].includes(insp.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `No se puede completar una inspección en estado ${insp.status}` });
    }
    // permiso: en rondines, el que completa debe ser asignado (o admin)
    if (insp.family === 'rondin' && !ADMIN_ROLES.includes(req.user.role)) {
      const isAssignee = (await client.query(
        'SELECT 1 FROM insp_assignees WHERE inspection_id=$1 AND user_id=$2',
        [req.params.id, req.user.id])).rowCount > 0;
      if (!isAssignee) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No sos responsable de este rondín' });
      }
    }
    // respuestas: reemplaza las previas
    await client.query('DELETE FROM insp_responses WHERE inspection_id=$1', [req.params.id]);
    for (const r of responses) {
      if (!r.item_id) continue;
      const photos = savePhotos(r.photos, `insp-${insp.code || 'x'}`);
      await client.query(
        `INSERT INTO insp_responses (inspection_id,item_id,answer,observations,photo_urls)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.params.id, r.item_id, r.answer || null, r.observations || null, photos]);
    }
    const sigUrl = signature_base64 ? saveBase64File(signature_base64, 'firma-insp') : null;
    const inside = await geoInside(geo_lat, geo_lng);
    const cosign = insp.requires_cosign === true;
    const newStatus = cosign ? 'en_cofirma' : 'completada';
    const upd = (await client.query(
      `UPDATE insp_inspections SET
         status=$2, completed_by=$3, signature_url=COALESCE($4,signature_url),
         geo_lat=$5, geo_lng=$6, geo_inside=$7, machine_hours=COALESCE($8,machine_hours),
         notes=COALESCE($9,notes), submitted_ip=$10, submitted_ua=$11,
         completed_at=CASE WHEN $2='completada' THEN NOW() ELSE completed_at END
       WHERE id=$1 RETURNING *`,
      [req.params.id, newStatus, req.user.id, sigUrl,
       geo_lat ?? null, geo_lng ?? null, inside, machine_hours ?? null,
       notes ?? null, req.ip, req.get('user-agent') || null])).rows[0];
    // firma del que completa
    await client.query(
      `UPDATE insp_assignees SET signed=true, signed_at=NOW()
        WHERE inspection_id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    // si quedó completada y hay tarea vinculada, cerrarla
    if (newStatus === 'completada' && insp.task_id)
      await client.query(
        `UPDATE tasks SET status='completada', completed_at=NOW() WHERE id=$1`, [insp.task_id]);
    await client.query('COMMIT');
    res.json(upd);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Co-firma del segundo responsable
router.post('/:id/cosign', async (req, res) => {
  const { signature_base64 } = req.body;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const insp = (await client.query(
      'SELECT * FROM insp_inspections WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
      [req.params.id])).rows[0];
    if (!insp) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Inspección no encontrada' }); }
    if (insp.status !== 'en_cofirma') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La inspección no está esperando co-firma' });
    }
    if (insp.completed_by === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La co-firma debe hacerla el otro responsable' });
    }
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const isAssignee = (await client.query(
        'SELECT 1 FROM insp_assignees WHERE inspection_id=$1 AND user_id=$2',
        [req.params.id, req.user.id])).rowCount > 0;
      if (!isAssignee) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'No sos responsable de este rondín' });
      }
    }
    const sigUrl = signature_base64 ? saveBase64File(signature_base64, 'cofirma-insp') : null;
    const upd = (await client.query(
      `UPDATE insp_inspections SET status='completada', cosigned_by=$2,
         cosign_url=COALESCE($3,cosign_url), completed_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id, req.user.id, sigUrl])).rows[0];
    await client.query(
      `UPDATE insp_assignees SET signed=true, signed_at=NOW()
        WHERE inspection_id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    if (insp.task_id)
      await client.query(
        `UPDATE tasks SET status='completada', completed_at=NOW() WHERE id=$1`, [insp.task_id]);
    await client.query('COMMIT');
    res.json(upd);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Generar No Conformidad desde un ítem en falla
router.post('/:id/finding', async (req, res) => {
  const { response_id, immediate_action } = req.body;
  if (!response_id) return res.status(400).json({ error: 'response_id es requerido' });
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const r = (await client.query(`
      SELECT r.*, it.label AS item_label, it.section,
             i.code AS insp_code, i.id AS insp_id,
             t.name AS template_name
        FROM insp_responses r
        JOIN insp_template_items it ON it.id=r.item_id
        JOIN insp_inspections i ON i.id=r.inspection_id
        JOIN insp_templates t ON t.id=i.template_id
       WHERE r.id=$1 AND r.inspection_id=$2`, [response_id, req.params.id])).rows[0];
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Respuesta no encontrada' }); }
    if (r.finding_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ese ítem ya tiene una NC asociada' });
    }
    const desc = `Hallazgo detectado en ${r.template_name} (${r.insp_code}).\n`
      + `Ítem: ${r.item_label}${r.section ? ' — ' + r.section : ''}\n`
      + `Resultado: ${r.answer || 's/d'}\n`
      + `Observaciones: ${r.observations || 'sin observaciones'}`;
    const f = (await client.query(
      `INSERT INTO findings (title,description,finding_type,status,origin,area,
                             immediate_action,evidence_urls,reported_by)
       VALUES ($1,$2,'nc_real','abierto','inspeccion',$3,$4,$5,$6)
       RETURNING id, code`,
      [r.item_label.substring(0, 120), desc, r.section || r.template_name,
       immediate_action || null,
       (r.photo_urls && r.photo_urls.length) ? r.photo_urls : null, req.user.id])).rows[0];
    await client.query('UPDATE insp_responses SET finding_id=$1 WHERE id=$2', [f.id, response_id]);
    await client.query(
      'UPDATE insp_inspections SET findings_count=findings_count+1 WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.status(201).json({ finding_id: f.id, code: f.code });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// Anular una inspección (admin)
router.delete('/:id', requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE insp_inspections SET deleted_at=NOW(), status='anulada'
        WHERE id=$1 AND deleted_at IS NULL RETURNING id`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inspección no encontrada' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
