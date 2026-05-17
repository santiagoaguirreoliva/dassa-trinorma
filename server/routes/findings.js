import { Router } from 'express';
import { query, getClient } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';
import { saveBase64File } from '../services/uploads.js';

const router = Router();

const ADMIN_ROLES = ['master_admin', 'director', 'sgi_leader'];
const VALID_STATUS = ['abierto', 'analisis', 'plan_accion', 'en_ejecucion', 'verificacion', 'cerrado'];
const STATUS_LABEL = {
  abierto: 'Detectado', analisis: 'En Análisis', plan_accion: 'Plan de AC',
  en_ejecucion: 'En Ejecución', verificacion: 'Verificación', cerrado: 'Cerrado',
};

// ─── RUTAS PRIVADAS (requieren auth) ────────────────────────
// La ruta pública POST /nc se movió a routes/public-nc.js (H-06).
router.use(authenticate);

// GET /api/findings — listado con búsqueda y filtros
router.get('/', async (req, res) => {
  const { status, type, area, assigned, search } = req.query;
  // F-C: por defecto solo NC vigentes; ?include_deleted=1 las incluye (admins)
  const where = ['f.deleted_at IS NULL'];
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
              -- F-E: en NC cerradas, los días se congelan en closed_at
              EXTRACT(DAY FROM COALESCE(f.closed_at, NOW()) - f.created_at)::int AS days_open,
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
      WHERE deleted_at IS NULL
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
              cl.full_name AS closed_by_name,
              EXTRACT(DAY FROM COALESCE(f.closed_at, NOW()) - f.created_at)::int AS days_open
         FROM findings f
         LEFT JOIN users r  ON r.id  = f.reported_by
         LEFT JOIN users a  ON a.id  = f.assigned_to
         LEFT JOIN users v  ON v.id  = f.verified_by
         LEFT JOIN users cl ON cl.id = f.closed_by
        WHERE f.id = $1 AND f.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    const [actions, comments, history] = await Promise.all([
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
      // F-D: historial de transiciones de estado
      query(
        `SELECT h.*, u.full_name AS changed_by_name
           FROM finding_status_history h
           LEFT JOIN users u ON u.id = h.changed_by
          WHERE h.finding_id = $1 ORDER BY h.changed_at`,
        [req.params.id]
      ),
    ]);

    res.json({ ...rows[0], actions: actions.rows, comments: comments.rows, history: history.rows });
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

  // F-F: todo el alta (NC + historial + notificaciones) en una sola transacción
  const client = await getClient();
  try {
    await client.query('BEGIN');

    let evidence_urls = [];
    if (photo_base64) {
      const url = saveBase64File(photo_base64, 'nc-interna');
      if (url) evidence_urls = [url];
    }

    const { rows } = await client.query(
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
    const finding = rows[0];

    // F-D: registrar el alta en el historial de estados
    await client.query(
      `INSERT INTO finding_status_history (finding_id, from_status, to_status, changed_by, note)
       VALUES ($1, NULL, $2, $3, 'Alta de la NC')`,
      [finding.id, finding.status, req.user.id]
    );

    // Notificar al responsable asignado
    if (assigned_to && assigned_to !== req.user.id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [assigned_to, `Nueva NC asignada: ${finding.code}`, title]
      );
    }

    // Notificar a SGI leaders si el reportante no es admin
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const { rows: leaders } = await client.query(
        `SELECT id FROM users WHERE role IN ('master_admin','director','sgi_leader') AND is_active = true AND id != $1`,
        [req.user.id]
      );
      for (const l of leaders) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, source_module)
           VALUES ($1,$2,$3,'info','findings')`,
          [l.id, `Nuevo hallazgo reportado: ${finding.code}`, `${req.user.full_name} reportó: ${title}`]
        );
      }
    }

    await client.query('COMMIT');

    // Aviso por correo al equipo de calidad (best-effort, fuera de la transacción)
    if (finding.assigned_to) {
      try {
        const { rows: an } = await query('SELECT full_name FROM users WHERE id = $1', [finding.assigned_to]);
        finding.assigned_to_name = an[0]?.full_name || null;
      } catch { /* nombre del responsable es opcional para el aviso */ }
    }
    notifyNewFinding(finding, req.user).catch(e => console.error('[findings] mail alta NC:', e.message));

    // Pre-análisis de Nixa: la IA estudia la NC apenas se registra y deja
    // su sugerencia de causa raíz lista para que calidad la revise.
    runAiAnalysis(finding.id).catch(e => console.error('[findings] pre-análisis Nixa:', e.message));

    res.status(201).json(finding);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
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
      `UPDATE findings SET ${updates.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
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
  // F-A: el cambio de estado es una acción de gestión — solo roles admin del SGI
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permiso para cambiar el estado de hallazgos' });
  }

  const { status, note } = req.body;
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const cur = await client.query(
      'SELECT status, efficacy_verified, deleted_at FROM findings WHERE id = $1',
      [req.params.id]
    );
    if (!cur.rows[0] || cur.rows[0].deleted_at) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontrado' });
    }
    const fromStatus = cur.rows[0].status;

    // F-B: ISO 10.2(d) — no se puede cerrar una NC sin verificar la eficacia
    // de la acción correctiva tomada.
    if (status === 'cerrado' && !cur.rows[0].efficacy_verified) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'No se puede cerrar la NC sin verificar la eficacia de la acción correctiva (ISO 10.2 d). Marcá "Eficacia verificada" en el panel de verificación antes de cerrar.',
      });
    }

    const closing = status === 'cerrado';
    const { rows } = await client.query(
      `UPDATE findings
          SET status = $1
              ${closing ? ', closed_at = NOW(), closed_by = $3' : ''}
        WHERE id = $2
      RETURNING id, code, title, status, assigned_to`,
      closing ? [status, req.params.id, req.user.id] : [status, req.params.id]
    );

    // F-D: registrar la transición en el historial
    await client.query(
      `INSERT INTO finding_status_history (finding_id, from_status, to_status, changed_by, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, fromStatus, status, req.user.id, note || null]
    );

    // Notificar al responsable cuando cambia estado
    if (rows[0].assigned_to && rows[0].assigned_to !== req.user.id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','findings')`,
        [rows[0].assigned_to, `NC ${rows[0].code} cambió a ${STATUS_LABEL[status]}`, `Actualizado por ${req.user.full_name}`]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/findings/:id — F-C: archiva (soft-delete), no borra.
// ISO 10.2 exige retener la información documentada de las NC.
router.delete('/:id', async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permiso para archivar hallazgos' });
  }
  try {
    const { rows } = await query(
      `UPDATE findings SET deleted_at = NOW(), deleted_by = $1
        WHERE id = $2 AND deleted_at IS NULL
      RETURNING id, code`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado o ya archivado' });
    res.json({ message: `Hallazgo ${rows[0].code} archivado — la evidencia queda preservada` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/findings/:id/actions
router.post('/:id/actions', async (req, res) => {
  const { description, responsible_id, due_date } = req.body;
  if (!description) return res.status(400).json({ error: 'Descripción requerida' });

  // F-F: acción + tarea vinculada + notificación en una sola transacción
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const fnd = await client.query(
      'SELECT code FROM findings WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (!fnd.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Hallazgo no encontrado' });
    }

    const { rows } = await client.query(
      `INSERT INTO finding_actions (finding_id, description, responsible_id, due_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, description, responsible_id || null, due_date || null]
    );

    if (responsible_id) {
      await client.query(
        `INSERT INTO tasks (title, finding_id, assigned_to, due_date, source_module, created_by)
         VALUES ($1,$2,$3,$4,'findings',$5)`,
        [description, req.params.id, responsible_id, due_date || null, req.user.id]
      );
      if (responsible_id !== req.user.id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, source_module)
           VALUES ($1,$2,$3,'info','findings')`,
          [responsible_id, `Nueva acción correctiva asignada`, `${fnd.rows[0].code}: ${description.substring(0, 80)}`]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
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

// POST /api/findings/:id/ai-analyze — Triny analiza la NC: causa raíz (5 porqués)
// + acciones correctivas + oportunidad de mejora. Guarda la sugerencia en ai_analysis.
router.post('/:id/ai-analyze', async (req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin permiso para ejecutar el análisis IA' });
  }
  try {
    const result = await runAiAnalysis(req.params.id);
    res.json(result);
  } catch (err) {
    const notFound = /no encontrad/i.test(err.message);
    res.status(notFound ? 404 : 500).json({ error: err.message });
  }
});

// runAiAnalysis — corre el análisis IA de una NC y persiste la sugerencia.
// Usado por el endpoint on-demand y por el pre-análisis automático al dar de alta.
async function runAiAnalysis(findingId) {
  const { rows } = await query(
    'SELECT * FROM findings WHERE id = $1 AND deleted_at IS NULL', [findingId]
  );
  if (!rows[0]) throw new Error('Hallazgo no encontrado');

  const mod = await import('../services/findings-ai.cjs');
  const ai = mod.default || mod;
  const result = await ai.analyzeFinding(rows[0]);

  await query(
    'UPDATE findings SET ai_analysis = $1, ai_analyzed_at = NOW() WHERE id = $2',
    [JSON.stringify(result), findingId]
  );
  return result;
}

// notifyNewFinding — aviso por correo al equipo de calidad cuando entra una NC.
// Se resuelve de forma perezosa para no acoplar el router al mailer.
async function notifyNewFinding(finding, reporter) {
  try {
    const mod = await import('../services/findings-mailer.cjs');
    const mailer = mod.default || mod;
    if (typeof mailer.sendNewFindingAlert === 'function') {
      await mailer.sendNewFindingAlert(finding, reporter);
    }
  } catch (err) {
    console.error('[findings] notifyNewFinding:', err.message);
  }
}

export default router;
