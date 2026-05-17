import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { saveBase64File } from '../services/uploads.js';
import { unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../uploads');

// Roles con permiso de gestión sobre capacitaciones
const MGMT = ['master_admin', 'director', 'sgi_leader'];

const router = Router();
router.use(authenticate);

async function sendReminderEmail(to, subject, html) {
  if (!process.env.SMTP_HOST) return;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `DASSA SGI <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// Helper: obtener emails de notificación configurados
async function getNotificationEmails() {
  try {
    const { rows } = await query(
      `SELECT email FROM training_notification_emails WHERE active = true`
    );
    return rows.map(r => r.email);
  } catch {
    return [];
  }
}

// La tabla training_notification_emails la crea la migración 034.

// ═══════════════════════════════════════════════════════════
// TRAININGS CRUD
// ═══════════════════════════════════════════════════════════

// GET /api/trainings
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.*,
              u.full_name AS organized_by_name,
              (SELECT COUNT(*) FROM training_participants tp WHERE tp.training_id = t.id)::int AS participants_count,
              (SELECT COUNT(*) FROM training_participants tp WHERE tp.training_id = t.id AND tp.attended = true)::int AS attended_count,
              (SELECT COUNT(*) FROM training_evidence te WHERE te.training_id = t.id)::int AS evidence_count,
              CASE
                WHEN t.status = 'completada' AND t.completed_at IS NOT NULL AND t.recurrence_days IS NOT NULL
                  THEN t.completed_at + (t.recurrence_days || ' days')::interval
                ELSE t.scheduled_date
              END AS next_due_date,
              CASE
                WHEN t.status = 'completada' AND t.completed_at IS NOT NULL AND t.recurrence_days IS NOT NULL
                  THEN EXTRACT(DAY FROM (t.completed_at + (t.recurrence_days || ' days')::interval - NOW()))::int
                WHEN t.status = 'programada'
                  THEN EXTRACT(DAY FROM (t.scheduled_date - NOW()))::int
                ELSE NULL
              END AS days_until_due
         FROM trainings t
         LEFT JOIN users u ON u.id = t.organized_by
        ORDER BY
          CASE WHEN t.status IN ('programada','en_curso') THEN 0 ELSE 1 END,
          t.scheduled_date ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trainings/competency-matrix — cruce competencias-puesto vs capacitaciones
// Para cada empleado con puesto: qué capacitaciones requiere su ficha (ISO 7.2 a/b)
// y cuáles tiene cubiertas según las capacitaciones a las que asistió.
router.get('/competency-matrix', async (_req, res) => {
  try {
    const emp = await query(`
      SELECT u.id, u.full_name, jp.role_label, jp.training_required
        FROM job_profile_employees jpe
        JOIN job_profiles jp ON jp.id = jpe.profile_id
        JOIN users u        ON u.id  = jpe.employee_id
       WHERE u.is_active = true AND jp.is_active = true
         AND COALESCE(jpe.is_primary, true) = true
       ORDER BY u.full_name`);
    const att = await query(`
      SELECT tp.user_id, lower(t.title) AS title
        FROM training_participants tp
        JOIN trainings t ON t.id = tp.training_id
       WHERE tp.attended = true AND tp.user_id IS NOT NULL`);

    const byUser = {};
    for (const a of att.rows) { (byUser[a.user_id] ||= []).push(a.title); }
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    const matrix = emp.rows.map(e => {
      const titles = (byUser[e.id] || []).map(norm);
      const required = (e.training_required || []).map(r => {
        const nr = norm(r);
        const covered = titles.some(tt => {
          if (!tt || !nr) return false;
          if (tt.includes(nr) || nr.includes(tt)) return true;
          // coincidencia por palabra significativa (≥ 5 letras)
          return nr.split(/\s+/).filter(w => w.length >= 5).some(w => tt.includes(w));
        });
        return { label: r, covered };
      });
      const done = required.filter(x => x.covered).length;
      return {
        id: e.id, name: e.full_name, role: e.role_label,
        required, coverage: required.length ? Math.round((done / required.length) * 100) : null,
      };
    });
    res.json(matrix);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trainings/reminders/run — corre los recordatorios manualmente
router.post('/reminders/run', requireRole(...MGMT), async (req, res) => {
  try {
    const mod = await import('../services/trainings-reminders.cjs');
    const svc = mod.default || mod;
    const dryRun = req.query.dry_run === '1' || req.query.dry_run === 'true';
    res.json(await svc.runTrainingReminders({ dryRun }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trainings/upcoming — próximas (para dashboard)
router.get('/upcoming', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.title, t.scheduled_date, t.training_type, t.is_mandatory,
              t.location, t.instructor, t.duration_hours,
              (SELECT COUNT(*) FROM training_participants tp WHERE tp.training_id = t.id)::int AS participants_count
         FROM trainings t
        WHERE t.scheduled_date >= NOW()
          AND t.status = 'programada'
        ORDER BY t.scheduled_date ASC
        LIMIT 10`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/trainings/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.*, u.full_name AS organized_by_name,
              ev.full_name AS efficacy_evaluated_by_name
         FROM trainings t
         LEFT JOIN users u  ON u.id  = t.organized_by
         LEFT JOIN users ev ON ev.id = t.efficacy_evaluated_by
        WHERE t.id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });

    const [participants, evidence] = await Promise.all([
      query(
        `SELECT tp.*, u.full_name, u.position, u.department
           FROM training_participants tp
           LEFT JOIN users u ON u.id = tp.user_id
          WHERE tp.training_id = $1
          ORDER BY tp.created_at`,
        [req.params.id]
      ),
      query(
        `SELECT te.*, u.full_name AS uploaded_by_name
           FROM training_evidence te
           LEFT JOIN users u ON u.id = te.uploaded_by
          WHERE te.training_id = $1
          ORDER BY te.created_at`,
        [req.params.id]
      ),
    ]);

    res.json({ ...rows[0], participants: participants.rows, evidence: evidence.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trainings — crear capacitación (roles de gestión)
router.post('/', requireRole(...MGMT), async (req, res) => {
  const {
    title, description, objective, legal_framework, training_type,
    category, scheduled_date, location, instructor, duration_hours,
    max_participants, is_mandatory, reminder_days, recurrence_days, audience,
    date_confirmed,
    participants
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Título es requerido' });
  }
  if (!scheduled_date) {
    return res.status(400).json({ error: 'La fecha de la capacitación es requerida' });
  }

  try {
    const { rows } = await query(
      `INSERT INTO trainings
         (title, description, objective, legal_framework, training_type, category,
          scheduled_date, location, instructor, duration_hours, max_participants,
          is_mandatory, reminder_days, recurrence_days, audience, organized_by, status, date_confirmed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'programada',$17)
       RETURNING *`,
      [title, description || null, objective || null, legal_framework || null,
       training_type || 'capacitacion', category || 'obligatoria',
       scheduled_date || null, location || null, instructor || null,
       duration_hours || null, max_participants || null,
       is_mandatory || false, reminder_days || 30,
       recurrence_days || 365, audience || null, req.user.id,
       date_confirmed !== undefined ? date_confirmed : (scheduled_date ? true : false)]
    );
    const training = rows[0];

    // Insertar participantes
    if (Array.isArray(participants)) {
      for (const p of participants) {
        await query(
          `INSERT INTO training_participants
             (training_id, user_id, external_name, external_position, attended)
           VALUES ($1,$2,$3,$4,false)
           ON CONFLICT (training_id, user_id) DO NOTHING`,
          [training.id, p.user_id || null, p.name || null, p.position || null]
        );
      }
    }

    // Notificaciones + emails
    if (Array.isArray(participants)) {
      for (const p of participants) {
        if (p.user_id) {
          await query(
            `INSERT INTO notifications (user_id, title, message, type, source_module)
             VALUES ($1,$2,$3,'info','trainings')`,
            [p.user_id,
             `Capacitación programada: ${title}`,
             `Fecha: ${scheduled_date ? new Date(scheduled_date).toLocaleDateString('es-AR') : 'A confirmar'}${location ? ' — ' + location : ''}`]
          );
          const { rows: usr } = await query('SELECT email, full_name FROM users WHERE id=$1', [p.user_id]);
          if (usr[0]?.email) {
            sendReminderEmail(
              usr[0].email,
              `DASSA SGI — Capacitación: ${title}`,
              `<p>Hola ${usr[0].full_name},</p>
               <p>Tenés una capacitación programada:</p>
               <ul>
                 <li><strong>Tema:</strong> ${title}</li>
                 <li><strong>Fecha:</strong> ${scheduled_date ? new Date(scheduled_date).toLocaleDateString('es-AR') : 'A confirmar'}</li>
                 <li><strong>Lugar:</strong> ${location || 'A confirmar'}</li>
                 <li><strong>Instructor:</strong> ${instructor || 'A confirmar'}</li>
               </ul>
               <p><a href="http://${process.env.APP_HOST || '181.174.193.98'}/trainings">Ver en DASSA SGI</a></p>`
            );
          }
        }
      }
    }

    // Notificar a emails de notificación configurados
    const notifEmails = await getNotificationEmails();
    for (const email of notifEmails) {
      sendReminderEmail(
        email,
        `DASSA SGI — Nueva capacitación creada: ${title}`,
        `<p>Se creó una nueva capacitación:</p>
         <ul>
           <li><strong>Tema:</strong> ${title}</li>
           <li><strong>Tipo:</strong> ${training_type || 'capacitacion'}</li>
           <li><strong>Fecha:</strong> ${scheduled_date ? new Date(scheduled_date).toLocaleDateString('es-AR') : 'Sin fecha'}</li>
           <li><strong>Obligatoria:</strong> ${is_mandatory ? 'Sí' : 'No'}</li>
         </ul>
         <p><a href="http://${process.env.APP_HOST || '181.174.193.98'}/trainings">Ver en DASSA SGI</a></p>`
      );
    }

    res.status(201).json(training);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/trainings/:id — editar capacitación
router.patch('/:id', requireRole(...MGMT), async (req, res) => {
  const FIELDS = ['title','description','objective','legal_framework','training_type',
    'category','scheduled_date','location','instructor','duration_hours',
    'max_participants','is_mandatory','reminder_days','status','recurrence_days',
    'audience','date_confirmed'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${i++}`); values.push(req.body[f]); }
  }
  const completing = req.body.status === 'completada';
  if (completing) {
    updates.push(`completed_at=$${i++}`); values.push(new Date());
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE trainings SET ${updates.join(',')} WHERE id=$${i} RETURNING *`, values
    );
    const updated = rows[0];

    // Auto-crear próxima edición si tiene recurrencia y se acaba de completar
    if (completing && updated?.recurrence_days) {
      const nextDate = new Date(updated.completed_at || new Date());
      nextDate.setDate(nextDate.getDate() + updated.recurrence_days);
      await query(
        `INSERT INTO trainings
           (title, description, objective, legal_framework, training_type, category,
            scheduled_date, instructor, duration_hours, audience, is_mandatory,
            recurrence_days, reminder_days, status, date_confirmed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'programada',false)`,
        [updated.title, updated.description, updated.objective, updated.legal_framework,
         updated.training_type, updated.category, nextDate.toISOString(),
         updated.instructor, updated.duration_hours, updated.audience,
         updated.is_mandatory, updated.recurrence_days, updated.reminder_days || 30]
      );
    }

    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/trainings/:id — eliminar capacitación
router.delete('/:id', requireRole(...MGMT), async (req, res) => {
  try {
    // Eliminar dependencias primero
    await query('DELETE FROM training_evidence WHERE training_id=$1', [req.params.id]);
    await query('DELETE FROM training_participants WHERE training_id=$1', [req.params.id]);
    const { rowCount } = await query('DELETE FROM trainings WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Capacitación eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// PARTICIPANTS
// ═══════════════════════════════════════════════════════════

router.post('/:id/participants', requireRole(...MGMT), async (req, res) => {
  const { user_id, external_name, external_position, external_sector } = req.body;
  if (!user_id && !external_name) {
    return res.status(400).json({ error: 'user_id o external_name requerido' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO training_participants
         (training_id, user_id, external_name, external_position, external_sector, attended)
       VALUES ($1,$2,$3,$4,$5,false)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [req.params.id, user_id || null, external_name || null,
       external_position || null, external_sector || null]
    );
    res.status(201).json(rows[0] || { message: 'Ya existe' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/participants/:pid', requireRole(...MGMT), async (req, res) => {
  const { attended, score, dni, conforme } = req.body;
  try {
    const { rows } = await query(
      `UPDATE training_participants SET
         attended = COALESCE($1, attended),
         score = COALESCE($2, score),
         dni = COALESCE($3, dni),
         conforme = COALESCE($4, conforme),
         attendance_date = CASE WHEN $1 = true THEN NOW() ELSE attendance_date END
       WHERE id = $5 RETURNING *`,
      [attended ?? null, score ?? null, dni ?? null, conforme ?? null, req.params.pid]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/trainings/:id/efficacy — registrar evaluación de eficacia (ISO 7.2)
router.patch('/:id/efficacy', requireRole(...MGMT), async (req, res) => {
  const { efficacy_result, efficacy_method, efficacy_notes } = req.body;
  if (efficacy_result && !['eficaz', 'parcial', 'no_eficaz'].includes(efficacy_result)) {
    return res.status(400).json({ error: 'Resultado de eficacia no válido' });
  }
  try {
    const { rows } = await query(
      `UPDATE trainings SET
         efficacy_result = $1, efficacy_method = $2, efficacy_notes = $3,
         efficacy_evaluated_by = $4, efficacy_evaluated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [efficacy_result || null, efficacy_method || null, efficacy_notes || null,
       req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/participants/:pid', requireRole(...MGMT), async (req, res) => {
  try {
    await query('DELETE FROM training_participants WHERE id=$1', [req.params.pid]);
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// EVIDENCE
// ═══════════════════════════════════════════════════════════

router.post('/:id/evidence', requireRole(...MGMT), async (req, res) => {
  const { file_base64, file_name, file_type, description, kind } = req.body;
  if (!file_base64) return res.status(400).json({ error: 'Archivo requerido' });
  const fileKind = kind === 'material' ? 'material' : 'evidencia';
  try {
    const url = saveBase64File(file_base64, `training-${fileKind}`);
    if (!url) return res.status(400).json({ error: 'Tipo de archivo no permitido (jpg, png, webp, pdf)' });
    const { rows } = await query(
      `INSERT INTO training_evidence
         (training_id, file_url, file_name, file_type, description, uploaded_by, kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, url, file_name || null, file_type || null,
       description || null, req.user.id, fileKind]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/evidence/:eid', requireRole(...MGMT), async (req, res) => {
  try {
    const { rows } = await query('SELECT file_url FROM training_evidence WHERE id=$1', [req.params.eid]);
    if (rows[0]?.file_url) {
      try { unlinkSync(join(UPLOADS_DIR, basename(rows[0].file_url))); }
      catch { /* el archivo ya no está — seguimos */ }
    }
    await query('DELETE FROM training_evidence WHERE id=$1', [req.params.eid]);
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// SEND REMINDER
// ═══════════════════════════════════════════════════════════

router.post('/:id/send-reminder', requireRole(...MGMT), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.*, array_agg(DISTINCT u.email) FILTER (WHERE u.email IS NOT NULL) AS emails
         FROM trainings t
         JOIN training_participants tp ON tp.training_id = t.id
         LEFT JOIN users u ON u.id = tp.user_id
        WHERE t.id = $1
        GROUP BY t.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const t = rows[0];

    // Notif in-app
    const { rows: parts } = await query(
      `SELECT user_id FROM training_participants WHERE training_id=$1 AND user_id IS NOT NULL`,
      [req.params.id]
    );
    for (const p of parts) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','trainings')`,
        [p.user_id,
         `⏰ Recordatorio: ${t.title}`,
         `La capacitación es el ${new Date(t.scheduled_date).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}${t.location ? ' en ' + t.location : ''}`]
      );
    }

    // Emails a participantes
    const allEmails = [...(t.emails?.filter(Boolean) || [])];

    // También enviar a emails de notificación configurados
    const notifEmails = await getNotificationEmails();
    for (const ne of notifEmails) {
      if (!allEmails.includes(ne)) allEmails.push(ne);
    }

    for (const email of allEmails) {
      sendReminderEmail(
        email,
        `⏰ DASSA SGI — Recordatorio capacitación: ${t.title}`,
        `<p>Recordatorio de capacitación:</p>
         <ul>
           <li><strong>Tema:</strong> ${t.title}</li>
           <li><strong>Fecha:</strong> ${new Date(t.scheduled_date).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</li>
           <li><strong>Lugar:</strong> ${t.location || 'A confirmar'}</li>
           <li><strong>Instructor:</strong> ${t.instructor || 'A confirmar'}</li>
           <li><strong>Duración:</strong> ${t.duration_hours ? t.duration_hours + ' hs' : 'A confirmar'}</li>
         </ul>
         <p><a href="http://${process.env.APP_HOST || '181.174.193.98'}/trainings">Ver en DASSA SGI</a></p>`
      );
    }

    res.json({ message: `Recordatorio enviado a ${parts.length} participantes y ${notifEmails.length} emails configurados` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATION EMAILS CONFIG
// ═══════════════════════════════════════════════════════════

// GET /api/trainings-config/notification-emails
router.get('/config/notification-emails', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM training_notification_emails ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/trainings-config/notification-emails — agregar email
router.post('/config/notification-emails', requireRole(...MGMT), async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO training_notification_emails (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name=$2, active=true
       RETURNING *`,
      [email.toLowerCase().trim(), name || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/trainings-config/notification-emails/:id
router.delete('/config/notification-emails/:id', requireRole(...MGMT), async (req, res) => {
  try {
    await query('DELETE FROM training_notification_emails WHERE id=$1', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
