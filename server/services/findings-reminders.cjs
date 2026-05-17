// =============================================================================
// DASSA SGI — Recordatorios de verificación de eficacia de NC (ISO 10.2 d)
// Cron diario: cuando una NC cumple 30 / 60 días desde que entró a verificación
// y todavía no se verificó la eficacia de su acción correctiva, intima al
// responsable y avisa al equipo de calidad. Cada recordatorio se manda una vez.
// =============================================================================
const { Pool } = require('pg');
const mailer = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';
const ALERT_TO = (process.env.FINDINGS_ALERT_TO || 'maria@dassa.com.ar,santiago@dassa.com.ar')
  .split(',').map(s => s.trim()).filter(Boolean);

function esc(s) {
  return String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

/**
 * Corre los recordatorios de eficacia. Devuelve { v30, v60, total }.
 * @param {object} opts { dryRun } — si dryRun, no escribe ni envía.
 */
async function runEfficacyReminders(opts = {}) {
  // NC en verificación o cerradas, sin eficacia verificada todavía.
  // El reloj arranca cuando la NC entró a 'verificacion' (o, en su defecto,
  // cuando se cerró / se creó).
  const { rows } = await pool.query(`
    SELECT f.id, f.code, f.title, f.assigned_to,
           f.v30_done, f.v60_done, f.v30_reminded_at, f.v60_reminded_at,
           a.full_name AS assigned_name,
           EXTRACT(DAY FROM NOW() - COALESCE(
             (SELECT MIN(changed_at) FROM finding_status_history h
               WHERE h.finding_id = f.id AND h.to_status = 'verificacion'),
             f.closed_at, f.created_at))::int AS dias_verif
      FROM findings f
      LEFT JOIN users a ON a.id = f.assigned_to
     WHERE f.deleted_at IS NULL
       AND f.status IN ('verificacion','cerrado')
       AND f.efficacy_verified = false
  `);

  const pend = { v30: [], v60: [] };
  for (const f of rows) {
    if (f.dias_verif >= 60 && !f.v60_done && !f.v60_reminded_at) pend.v60.push(f);
    else if (f.dias_verif >= 30 && !f.v30_done && !f.v30_reminded_at) pend.v30.push(f);
  }

  const all = [...pend.v60, ...pend.v30];
  if (opts.dryRun) {
    return { dryRun: true, v30: pend.v30.length, v60: pend.v60.length, total: all.length };
  }

  // Notificación in-app al responsable + marca de recordado
  for (const f of pend.v30) {
    if (f.assigned_to) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [f.assigned_to, `Verificá la eficacia — ${f.code}`,
         `La NC ${f.code} cumplió 30 días: corresponde verificar la eficacia de la acción correctiva.`]
      );
    }
    await pool.query('UPDATE findings SET v30_reminded_at = NOW() WHERE id = $1', [f.id]);
  }
  for (const f of pend.v60) {
    if (f.assigned_to) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'warning','findings')`,
        [f.assigned_to, `Verificá la eficacia (60 días) — ${f.code}`,
         `La NC ${f.code} cumplió 60 días: corresponde la verificación final de eficacia.`]
      );
    }
    await pool.query('UPDATE findings SET v60_reminded_at = NOW() WHERE id = $1', [f.id]);
  }

  // Digest por correo al equipo de calidad
  if (all.length > 0) {
    const li = (f, hito) =>
      `<li style="margin-bottom:6px;line-height:1.5">
         <strong style="color:#C8202C">${esc(f.code)}</strong> — ${esc(f.title)}
         <span style="color:#999"> · ${hito} · responsable: ${esc(f.assigned_name || 'sin asignar')}</span>
       </li>`;
    const body = `
      <p>Las siguientes NC requieren verificación de eficacia de la acción correctiva (ISO 10.2 d):</p>
      ${pend.v60.length ? `<h3 style="color:#0F1A4A;font-size:14px;margin:16px 0 6px">Verificación a 60 días</h3>
        <ul style="font-size:13px;color:#444;padding-left:20px">${pend.v60.map(f => li(f, '60 días')).join('')}</ul>` : ''}
      ${pend.v30.length ? `<h3 style="color:#0F1A4A;font-size:14px;margin:16px 0 6px">Verificación a 30 días</h3>
        <ul style="font-size:13px;color:#444;padding-left:20px">${pend.v30.map(f => li(f, '30 días')).join('')}</ul>` : ''}
    `;
    await mailer.sendMail({
      to: ALERT_TO.join(', '),
      replyTo: 'santiago@dassa.com.ar',
      subject: `⏰ ${all.length} NC pendientes de verificar eficacia`,
      html: mailer.layout({
        title: 'Verificación de eficacia pendiente',
        body,
        ctaUrl: `${APP_URL}/findings`,
        ctaLabel: 'Ver el módulo de NC',
        footerNote: 'Recordatorio automático · verificación de eficacia de acciones correctivas · ISO 10.2 d.',
      }),
    });
  }

  return { v30: pend.v30.length, v60: pend.v60.length, total: all.length };
}

module.exports = { runEfficacyReminders };
