import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../uploads');

try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const router = Router();

// ─── UTILIDADES ─────────────────────────────────────────────
function saveBase64File(base64Data, filename) {
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[1].split('/')[1] || 'bin';
  const fname = `${Date.now()}-${filename}.${ext}`;
  const fpath = join(UPLOADS_DIR, fname);
  writeFileSync(fpath, Buffer.from(matches[2], 'base64'));
  return `/uploads/${fname}`;
}

const ADMIN_ROLES = ['master_admin', 'director', 'sgi_leader'];

// ─── RUTA PÚBLICA (sin auth) ─────────────────────────────────
// POST /api/public/nc — desde el QR público
router.post('/nc', async (req, res) => {
  const {
    description, area, detected_by, detected_by_email,
    affected_client, client_complaint,
    immediate_action_required, immediate_action,
    current_status, comments,
    photo_base64
  } = req.body;

  if (!description || !area) {
    return res.status(400).json({ error: 'Descripción y sector son requeridos' });
  }

  try {
    let evidence_urls = [];
    if (photo_base64) {
      const url = saveBase64File(photo_base64, 'nc-publica');
      if (url) evidence_urls = [url];
    }

    const { rows } = await query(
      `INSERT INTO findings
         (title, description, finding_type, status, origin, area,
          immediate_action, evidence_urls)
       VALUES ($1,$2,'nc_real','abierto','desvio_operativo',$3,$4,$5)
       RETURNING id, code`,
      [
        description.substring(0, 120),
        `${description}\n\n---\nDetectó: ${detected_by || 'Anónimo'} ${detected_by_email ? '(' + detected_by_email + ')' : ''}\nAfectó cliente: ${affected_client || 'No'}\nReclamo cliente: ${client_complaint || 'No'}\nAcción inmediata requerida: ${immediate_action_required || 'No'}\nEstado actual: ${current_status || ''}\nComentarios: ${comments || ''}`,
        area,
        immediate_action || null,
        evidence_urls.length ? evidence_urls : null
      ]
    );

    // Notificación in-app a SGI leaders y admins
    const { rows: admins } = await query(
      `SELECT id FROM users WHERE role IN ('master_admin','director','sgi_leader') AND is_active = true`
    );
    for (const admin of admins) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [admin.id, `Nueva NC pública: ${rows[0].code}`, `Sector: ${area} — ${description.substring(0, 80)}`]
      );
    }

    res.status(201).json({
      success: true,
      code: rows[0].code,
      message: 'No conformidad registrada correctamente'
    });
  } catch (err) {
    console.error('Public NC error:', err);
    res.status(500).json({ error: 'Error al registrar la no conformidad' });
  }
});

// ─── RUTAS PRIVADAS (requieren auth) ────────────────────────
router.use(authenticate);

// GET /api/findings — listado con búsqueda y filtros
router.get('/', async (req, res) => {
  const { status, type, area, assigned, search } = req.query;
  const where = ['1=1'];
  const params = [];
  let i = 1;
  if (status)   { where.push(`f.status = $${i++}`);       params.push(status); }
  if (type)     { where.push(`f.finding_type = $${i++}`); params.push(type); }
  if (area)     { where.push(`f.area ILIKE $${i++}`);     params.push(`%${area}%`); }
  if (assigned) { where.push(`f.assigned_to = $${i++}`);  params.push(assigned); }
  if (search) {
    where.push(`(f.title ILIKE $${i} OR f.code ILIKE $${i} OR f.description ILIKE $${i} OR f.area ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }

  try {
    const { rows } = await query(
      `SELECT f.*,
              r.full_name AS reported_by_name,
              a.full_name AS assigned_to_name, a.avatar_url AS assigned_to_avatar,
              EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open,
              (SELECT COUNT(*) FROM finding_actions fa WHERE fa.finding_id = f.id)::int AS actions_count,
              (SELECT COUNT(*) FROM finding_actions fa WHERE fa.finding_id = f.id AND fa.status = 'completada')::int AS actions_done,
              (SELECT COUNT(*) FROM finding_comments fc WHERE fc.finding_id = f.id)::int AS comments_count
         FROM findings f
         LEFT JOIN users r ON r.id = f.reported_by
         LEFT JOIN users a ON a.id = f.assigned_to
        WHERE ${where.join(' AND ')}
        ORDER BY
          CASE f.status
            WHEN 'abierto' THEN 1
            WHEN 'analisis' THEN 2
            WHEN 'plan_accion' THEN 3
            WHEN 'en_ejecucion' THEN 4
            WHEN 'verificacion' THEN 5
            WHEN 'cerrado' THEN 6
          END,
          CASE WHEN f.due_date IS NOT NULL AND f.due_date < NOW() AND f.status != 'cerrado' THEN 0 ELSE 1 END,
          f.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/findings/stats — KPIs
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'cerrado')::int AS open_count,
        COUNT(*) FILTER (WHERE status != 'cerrado' AND due_date IS NOT NULL AND due_date < NOW())::int AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'cerrado' AND closed_at >= NOW() - INTERVAL '30 days')::int AS closed_30d,
        COUNT(*) FILTER (WHERE finding_type = 'nc_real')::int AS nc_real,
        COUNT(*) FILTER (WHERE finding_type = 'nc_potencial')::int AS nc_potencial,
        COUNT(*) FILTER (WHERE finding_type = 'mejora')::int AS mejora,
        COUNT(*) FILTER (WHERE finding_type = 'desvio_cliente')::int AS desvio_cliente,
        COUNT(*)::int AS total
      FROM findings
    `);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/findings/:id — detalle completo
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT f.*,
              r.full_name AS reported_by_name,
              a.full_name AS assigned_to_name,
              v.full_name AS verified_by_name,
              EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open
         FROM findings f
         LEFT JOIN users r ON r.id = f.reported_by
         LEFT JOIN users a ON a.id = f.assigned_to
         LEFT JOIN users v ON v.id = f.verified_by
        WHERE f.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    const [actions, comments] = await Promise.all([
      query(
        `SELECT fa.*, u.full_name AS responsible_name
           FROM finding_actions fa
           LEFT JOIN users u ON u.id = fa.responsible_id
          WHERE fa.finding_id = $1 ORDER BY fa.created_at`,
        [req.params.id]
      ),
      query(
        `SELECT fc.*, u.full_name, u.avatar_url
           FROM finding_comments fc
           JOIN users u ON u.id = fc.user_id
          WHERE fc.finding_id = $1 ORDER BY fc.created_at`,
        [req.params.id]
      ),
    ]);

    res.json({ ...rows[0], actions: actions.rows, comments: comments.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/findings — crear NC (TODOS los usuarios autenticados pueden reportar)
router.post('/', async (req, res) => {
  const {
    title, description, finding_type, origin, area,
    due_date, assigned_to, immediate_action,
    cause_analysis_type, cause_analysis_content,
    affected_client: _ac, client_complaint: _cc,
    photo_base64
  } = req.body;

  if (!title || !description || !finding_type) {
    return res.status(400).json({ error: 'Título, descripción y tipo son requeridos' });
  }

  try {
    let evidence_urls = [];
    if (photo_base64) {
      const url = saveBase64File(photo_base64, 'nc-interna');
      if (url) evidence_urls = [url];
    }

    const { rows } = await query(
      `INSERT INTO findings
         (title, description, finding_type, origin, area, due_date,
          assigned_to, immediate_action, cause_analysis_type, cause_analysis_content,
          evidence_urls, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        title, description, finding_type,
        origin || 'desvio_operativo', area,
        due_date || null, assigned_to || null,
        immediate_action || null,
        cause_analysis_type || null,
        cause_analysis_content ? JSON.stringify(cause_analysis_content) : null,
        evidence_urls.length ? evidence_urls : null,
        req.user.id
      ]
    );

    // Notificar al responsable asignado
    if (assigned_to && assigned_to !== req.user.id) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [assigned_to, `Nueva NC asignada: ${rows[0].code}`, title]
      );
    }

    // Notificar a SGI leaders si el reportante no es admin
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const { rows: leaders } = await query(
        `SELECT id FROM users WHERE role IN ('master_admin','director','sgi_leader') AND is_active = true AND id != $1`,
        [req.user.id]
      );
      for (const l of leaders) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, source_module)
           VALUES ($1,$2,$3,'info','findings')`,
          [l.id, `Nuevo hallazgo reportado: ${rows[0].code}`, `${req.user.full_name} reportó: ${title}`]
        );
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/findings/:id — editar NC
router.patch('/:id', async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permiso para editar hallazgos' });
  }

  const FIELDS = [
    'title','description','status','origin','area','due_date',
    'assigned_to','verified_by','immediate_action',
    'cause_analysis_type','cause_analysis_content',
    'financial_impact','v30_done','v60_done','efficacy_verified'
  ];

  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${i++}`);
      values.push(f === 'cause_analysis_content' && typeof req.body[f] === 'object'
        ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }

  // Agregar foto si viene
  if (req.body.photo_base64) {
    const url = saveBase64File(req.body.photo_base64, 'nc-evidencia');
    if (url) {
      updates.push(`evidence_urls = array_append(COALESCE(evidence_urls, '{}'), $${i++})`);
      values.push(url);
    }
  }

  if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
  values.push(req.params.id);

  try {
    const { rows } = await query(
      `UPDATE findings SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    // Si se asignó nuevo responsable, notificar
    if (req.body.assigned_to && req.body.assigned_to !== req.user.id) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','findings')`,
        [req.body.assigned_to, `NC asignada: ${rows[0].code}`, rows[0].title]
      );
    }

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/findings/:id/status — mover entre columnas kanban
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['abierto','analisis','plan_accion','en_ejecucion','verificacion','cerrado'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado no válido' });

  try {
    const extra = status === 'cerrado' ? ', closed_at = NOW()' : '';
    const { rows } = await query(
      `UPDATE findings SET status = $1${extra} WHERE id = $2 RETURNING id, code, status, assigned_to`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    // Notificar al responsable cuando cambia estado
    if (rows[0].assigned_to && rows[0].assigned_to !== req.user.id) {
      const statusLabel = { abierto: 'Detectado', analisis: 'En Análisis', plan_accion: 'Plan de AC', en_ejecucion: 'En Ejecución', verificacion: 'Verificación', cerrado: 'Cerrado' };
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','findings')`,
        [rows[0].assigned_to, `NC ${rows[0].code} cambió a ${statusLabel[status]}`, `Actualizado por ${req.user.full_name}`]
      );
    }

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/findings/:id — admins pueden eliminar
router.delete('/:id', async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permiso para eliminar' });
  }
  try {
    await query('DELETE FROM finding_comments WHERE finding_id = $1', [req.params.id]);
    await query('DELETE FROM finding_actions WHERE finding_id = $1', [req.params.id]);
    await query('DELETE FROM findings WHERE id = $1', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/findings/:id/actions
router.post('/:id/actions', async (req, res) => {
  const { description, responsible_id, due_date } = req.body;
  if (!description) return res.status(400).json({ error: 'Descripción requerida' });
  try {
    const { rows } = await query(
      `INSERT INTO finding_actions (finding_id, description, responsible_id, due_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, description, responsible_id || null, due_date || null]
    );

    // Crear tarea vinculada si tiene responsable
    if (responsible_id) {
      await query(
        `INSERT INTO tasks (title, finding_id, assigned_to, due_date, source_module, created_by)
         VALUES ($1,$2,$3,$4,'findings',$5)`,
        [description, req.params.id, responsible_id, due_date || null, req.user.id]
      );
      // Notificar al responsable
      if (responsible_id !== req.user.id) {
        const { rows: findingRows } = await query('SELECT code FROM findings WHERE id = $1', [req.params.id]);
        await query(
          `INSERT INTO notifications (user_id, title, message, type, source_module)
           VALUES ($1,$2,$3,'info','findings')`,
          [responsible_id, `Nueva acción correctiva asignada`, `${findingRows[0]?.code}: ${description.substring(0, 80)}`]
        );
      }
    }

    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/findings/:id/actions/:aid
router.patch('/:id/actions/:aid', async (req, res) => {
  const { status, description, due_date, responsible_id } = req.body;
  const updates = []; const values = []; let i = 1;
  if (status)        { updates.push(`status = $${i++}`);         values.push(status); }
  if (description)   { updates.push(`description = $${i++}`);    values.push(description); }
  if (due_date)      { updates.push(`due_date = $${i++}`);       values.push(due_date); }
  if (responsible_id){ updates.push(`responsible_id = $${i++}`); values.push(responsible_id); }
  if (status === 'completada') { updates.push(`completed_at = $${i++}`); values.push(new Date()); }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.aid);
  try {
    const { rows } = await query(
      `UPDATE finding_actions SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/findings/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO finding_comments (finding_id, user_id, content)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json({ ...rows[0], full_name: req.user.full_name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/findings/:id/comments/:cid
router.delete('/:id/comments/:cid', async (req, res) => {
  try {
    const { rows } = await query('SELECT user_id FROM finding_comments WHERE id = $1', [req.params.cid]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    if (rows[0].user_id !== req.user.id && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Solo podés eliminar tus propios comentarios' });
    }
    await query('DELETE FROM finding_comments WHERE id = $1', [req.params.cid]);
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
