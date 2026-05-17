// =============================================================================
// DASSA SGI — Recordatorios automáticos de capacitaciones
// Cron diario: cuando una capacitación programada entra en su ventana de
// aviso (scheduled_date - reminder_days), notifica a los participantes y
// avisa a los emails configurados. Cada capacitación se recuerda una vez.
// =============================================================================
const { Pool } = require('pg');
const mailer = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';

/**
 * Corre los recordatorios de capacitaciones. Devuelve { enviados }.
 * @param {object} opts { dryRun }
 */
async function runTrainingReminders(opts = {}) {
  // Capacitaciones programadas, a futuro, dentro de la ventana de aviso y
  // todavía sin recordatorio enviado.
  const { rows: trainings } = await pool.query(`
    SELECT id, title, scheduled_date, location, instructor
      FROM trainings
     WHERE status = 'programada'
       AND reminder_sent_at IS NULL
       AND reminder_days IS NOT NULL
       AND scheduled_date >= NOW()
       AND scheduled_date::date <= (CURRENT_DATE + (reminder_days || ' days')::interval)
  `);

  if (opts.dryRun) {
    return { dryRun: true, enviados: trainings.length, capacitaciones: trainings.map(t => t.title) };
  }

  let enviados = 0;
  for (const t of trainings) {
    const fecha = new Date(t.scheduled_date).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    // Participantes con email + usuario interno
    const { rows: parts } = await pool.query(
      `SELECT u.id, u.email, u.full_name
         FROM training_participants tp JOIN users u ON u.id = tp.user_id
        WHERE tp.training_id = $1`,
      [t.id]
    );

    for (const p of parts) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','trainings')`,
        [p.id, `⏰ Capacitación próxima: ${t.title}`,
         `Se realiza el ${fecha}${t.location ? ' en ' + t.location : ''}`]
      );
    }

    // Emails de notificación configurados + participantes con email
    const cfg = await pool.query('SELECT email FROM training_notification_emails WHERE active = true');
    const dest = [
      ...new Set([
        ...parts.map(p => p.email).filter(Boolean),
        ...cfg.rows.map(r => r.email),
      ]),
    ];

    if (dest.length > 0) {
      await mailer.sendMail({
        to: dest.join(', '),
        replyTo: 'santiago@dassa.com.ar',
        subject: `⏰ Recordatorio de capacitación: ${t.title}`,
        html: mailer.layout({
          title: `Capacitación próxima: ${t.title}`,
          body: `
            <p>Te recordamos esta capacitación programada del SGI:</p>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;margin:14px 0">
              <tr><td style="background:#F8F8F8;padding:8px 12px;font-weight:600;border:1px solid #eee">Tema</td>
                  <td style="padding:8px 12px;border:1px solid #eee">${t.title}</td></tr>
              <tr><td style="background:#F8F8F8;padding:8px 12px;font-weight:600;border:1px solid #eee">Fecha</td>
                  <td style="padding:8px 12px;border:1px solid #eee">${fecha}</td></tr>
              <tr><td style="background:#F8F8F8;padding:8px 12px;font-weight:600;border:1px solid #eee">Lugar</td>
                  <td style="padding:8px 12px;border:1px solid #eee">${t.location || 'A confirmar'}</td></tr>
              <tr><td style="background:#F8F8F8;padding:8px 12px;font-weight:600;border:1px solid #eee">Instructor</td>
                  <td style="padding:8px 12px;border:1px solid #eee">${t.instructor || 'A confirmar'}</td></tr>
            </table>`,
          ctaUrl: `${APP_URL}/trainings`,
          ctaLabel: 'Ver en el SGI',
          footerNote: 'Recordatorio automático del módulo de Capacitaciones · ISO 9001 §7.2.',
        }),
      });
    }

    await pool.query('UPDATE trainings SET reminder_sent_at = NOW() WHERE id = $1', [t.id]);
    enviados++;
  }

  return { enviados, total: trainings.length };
}

module.exports = { runTrainingReminders };
