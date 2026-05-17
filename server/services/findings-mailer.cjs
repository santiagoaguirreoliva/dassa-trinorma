// =============================================================================
// DASSA SGI — Mailer del módulo de No Conformidades / Desvíos
// Aviso automático al equipo de calidad cada vez que se registra una NC.
// =============================================================================
const mailer = require('./mailer.cjs');

const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';

// Destinatarios del aviso de NC. Configurable por env; default: calidad DASSA.
const ALERT_TO = (process.env.FINDINGS_ALERT_TO || 'maria@dassa.com.ar,santiago@dassa.com.ar')
  .split(',').map(s => s.trim()).filter(Boolean);

const TYPE_LABEL = {
  nc_real:        'No Conformidad Real',
  nc_potencial:   'No Conformidad Potencial',
  mejora:         'Oportunidad de Mejora',
  desvio_cliente: 'Desvío de Cliente',
};

const ORIGIN_LABEL = {
  desvio_operativo:   'Desvío operativo',
  auditoria_interna:  'Auditoría interna',
  auditoria_externa:  'Auditoría externa',
  reclamo_cliente:    'Reclamo de cliente',
  accidente:          'Accidente',
  inspeccion:         'Inspección',
  comite:             'Comité',
};

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-AR'); } catch { return String(d); }
}

function esc(s) {
  return String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

/**
 * Envía el aviso de una NC recién registrada al equipo de calidad.
 * Best-effort: nunca lanza — devuelve { ok } / { skipped } / { ok:false }.
 * @param {object} finding  fila de la tabla findings (code, title, description, ...)
 * @param {object} reporter usuario que reportó la NC ({ full_name, email })
 */
async function sendNewFindingAlert(finding, reporter) {
  if (!finding || !finding.code) return { ok: false, error: 'finding inválido' };

  const typeLabel   = TYPE_LABEL[finding.finding_type] || finding.finding_type || 'Hallazgo';
  const originLabel = ORIGIN_LABEL[finding.origin] || finding.origin || '—';
  const isNC        = finding.finding_type === 'nc_real' || finding.finding_type === 'nc_potencial';
  const emoji       = isNC ? '🚨' : '💡';

  const row = (k, v) => `
    <tr>
      <td style="background:#F8F8F8;padding:8px 12px;font-weight:600;color:#0F1A4A;width:38%;border:1px solid #eee">${k}</td>
      <td style="padding:8px 12px;color:#444;border:1px solid #eee">${v}</td>
    </tr>`;

  const body = `
    <p>Se registró un nuevo hallazgo en el Sistema de Gestión Integrado y requiere tratamiento del área de calidad.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">
      ${row('Código', `<strong style="color:#C8202C">${esc(finding.code)}</strong>`)}
      ${row('Tipo', esc(typeLabel))}
      ${row('Título', esc(finding.title))}
      ${row('Sector', esc(finding.area || '—'))}
      ${row('Origen', esc(originLabel))}
      ${row('Reportado por', esc(reporter?.full_name || reporter?.email || '—'))}
      ${row('Responsable AC', esc(finding.assigned_to_name || 'Sin asignar'))}
      ${row('Fecha límite', fmtDate(finding.due_date))}
    </table>
    <div style="background:#F8F8F8;padding:14px;border-left:4px solid #C8202C;margin:14px 0;line-height:1.6">
      <strong style="color:#0F1A4A">Descripción</strong><br>${esc(finding.description || '—')}
    </div>
    ${finding.immediate_action ? `
    <div style="background:#FBE5E6;padding:14px;border-left:4px solid #C8202C;margin:14px 0;line-height:1.6">
      <strong style="color:#0F1A4A">Acción inmediata tomada</strong><br>${esc(finding.immediate_action)}
    </div>` : ''}
  `;

  return mailer.sendMail({
    to: ALERT_TO.join(', '),
    replyTo: 'santiago@dassa.com.ar',
    subject: `${emoji} ${typeLabel} ${finding.code} — ${String(finding.title || '').slice(0, 60)}`,
    html: mailer.layout({
      title: `Nuevo hallazgo: ${finding.code}`,
      body,
      ctaUrl: `${APP_URL}/findings`,
      ctaLabel: 'Gestionar en el SGI',
      footerNote: 'Aviso automático del módulo de No Conformidades · ISO 9001 · 14001 · 45001 cláusula 10.2.',
    }),
  });
}

module.exports = { sendNewFindingAlert, ALERT_TO };
