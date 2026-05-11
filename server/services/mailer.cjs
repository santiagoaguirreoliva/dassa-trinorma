// =============================================================================
// DASSA SGI — Email service (Gmail SMTP via info@dassa.com.ar)
// =============================================================================
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'info@dassa.com.ar';
const SMTP_PASS = process.env.SMTP_PASS;  // App password de Gmail
const SMTP_FROM = process.env.SMTP_FROM || `"DASSA SGI" <${SMTP_USER}>`;
const APP_URL   = process.env.APP_URL || 'https://trinorma.dassa.com.ar:8443';

let transport = null;
function getTransport() {
  if (transport) return transport;
  if (!SMTP_PASS) {
    console.warn('[mailer] SMTP_PASS no configurado — emails NO se van a enviar');
    return null;
  }
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transport;
}

/** Layout HTML branded DASSA */
function layout({ title, body, ctaUrl, ctaLabel, footerNote }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;padding:20px;color:#141414;margin:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ddd">
    <tr>
      <td style="background:#BF1E2E;padding:24px">
        <div style="color:#fff;font-weight:900;font-size:28px;letter-spacing:-1px;font-family:'Montserrat Alternates',sans-serif">DASSA</div>
        <div style="color:#fff;opacity:0.85;font-size:11px;letter-spacing:2px;margin-top:6px;text-transform:uppercase">Sistema de Gestión Integrado · TRINORMA</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <h1 style="color:#0F1A4A;margin:0 0 18px;font-size:22px;font-weight:700">${title}</h1>
        <div style="color:#444;line-height:1.65;font-size:15px">${body}</div>
        ${ctaUrl ? `<div style="margin-top:28px"><a href="${ctaUrl}" style="display:inline-block;background:#BF1E2E;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px">${ctaLabel || 'Ver en SGI'}</a></div>` : ''}
        ${footerNote ? `<p style="color:#999;font-size:12px;margin-top:24px">${footerNote}</p>` : ''}
      </td>
    </tr>
    <tr>
      <td style="background:#f5f5f5;padding:18px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee">
        DASSA · Depósito Aduanero y Servicios Especializados S.A.<br>
        Sistema de Gestión Integrado TRINORMA · ISO 9001 · ISO 14001 · ISO 45001
      </td>
    </tr>
  </table>
</body></html>`;
}

async function sendMail({ to, subject, html, text, replyTo }) {
  const t = getTransport();
  if (!t) {
    console.warn(`[mailer] SKIP "${subject}" → ${to}`);
    return { skipped: true };
  }
  try {
    const info = await t.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || subject,
      replyTo,
    });
    console.log(`[mailer] ✓ ${subject} → ${to} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error(`[mailer] ✗ ${subject} → ${to}:`, e.message);
    return { ok: false, error: e.message };
  }
}

// Templates específicos
async function sendPasswordReset(user, token) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendMail({
    to: user.email,
    subject: '🔑 Recuperar contraseña — DASSA SGI',
    html: layout({
      title: 'Recuperación de contraseña',
      body: `
        <p>Hola <strong>${user.full_name || user.email}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en el SGI Trinorma.</p>
        <p>Hacé click en el botón de abajo para crear una nueva contraseña. <strong>El link vence en 1 hora.</strong></p>
      `,
      ctaUrl: url,
      ctaLabel: 'Restablecer contraseña',
      footerNote: 'Si no fuiste vos, podés ignorar este email — tu contraseña actual sigue siendo válida.',
    }),
  });
}

async function sendPasswordChangedByAdmin(user, tempPassword) {
  return sendMail({
    to: user.email,
    subject: '🔐 Tu contraseña fue restablecida — DASSA SGI',
    html: layout({
      title: 'Contraseña restablecida por administrador',
      body: `
        <p>Hola <strong>${user.full_name}</strong>,</p>
        <p>Un administrador restableció tu contraseña en el SGI Trinorma.</p>
        <p>Tu nueva contraseña temporal es:</p>
        <div style="background:#FBE7E9;border:1px solid #BF1E2E;padding:14px;font-family:monospace;font-size:18px;font-weight:bold;color:#BF1E2E;text-align:center;margin:16px 0">${tempPassword}</div>
        <p>Al ingresar al sistema te pediremos que la cambies por una nueva.</p>
      `,
      ctaUrl: `${APP_URL}/login`,
      ctaLabel: 'Ingresar al sistema',
    }),
  });
}

async function sendAccessApproved(user) {
  return sendMail({
    to: user.email,
    subject: '✅ Tu acceso al SGI fue aprobado — DASSA',
    html: layout({
      title: '¡Bienvenido al SGI Trinorma!',
      body: `
        <p>Hola <strong>${user.full_name}</strong>,</p>
        <p>Tu solicitud de acceso al Sistema de Gestión Integrado de DASSA fue <strong>aprobada</strong>.</p>
        <p>Ya podés ingresar con el email <code>${user.email}</code> y la contraseña que configuraste al registrarte.</p>
      `,
      ctaUrl: `${APP_URL}/login`,
      ctaLabel: 'Ingresar al sistema',
    }),
  });
}

async function sendAccessRejected(email, fullName, reason) {
  return sendMail({
    to: email,
    subject: 'Solicitud de acceso al SGI — DASSA',
    html: layout({
      title: 'Solicitud no aprobada',
      body: `
        <p>Hola <strong>${fullName}</strong>,</p>
        <p>Lamentamos informarte que tu solicitud de acceso al SGI Trinorma no fue aprobada en este momento.</p>
        ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        <p>Si tenés dudas, contactate con el área de SGI de DASSA.</p>
      `,
    }),
  });
}

async function sendAuditorReport(user, report) {
  return sendMail({
    to: user.email,
    subject: `📋 Tu reporte semanal del Auditor IA — ${new Date().toLocaleDateString('es-AR')}`,
    html: layout({
      title: `Reporte semanal — ${user.full_name}`,
      body: `
        <p>Tu auditor IA TRINORMA repasó tus pendientes y prioridades de la semana:</p>
        <div style="background:#F8F8F8;padding:18px;border-left:4px solid #BF1E2E;margin:18px 0;line-height:1.7">
          ${report.summary.replace(/\n/g, '<br>')}
        </div>
        <table cellpadding="8" cellspacing="0" style="width:100%;border:1px solid #eee;font-size:13px">
          <tr style="background:#F8F8F8"><td><strong>Pendientes totales</strong></td><td>${report.pendientes_total}</td></tr>
          <tr><td><strong>Pendientes vencidos</strong></td><td style="color:#BF1E2E"><strong>${report.pendientes_vencidos}</strong></td></tr>
          <tr style="background:#F8F8F8"><td><strong>Capacitaciones pendientes</strong></td><td>${report.capacitaciones_pendientes}</td></tr>
          <tr><td><strong>NCs asignadas</strong></td><td>${report.ncs_asignadas}</td></tr>
          <tr style="background:#F8F8F8"><td><strong>Score de riesgo</strong></td><td>${report.riesgo_score}/100</td></tr>
        </table>
        ${report.recommendations ? `<h3 style="color:#0F1A4A;margin-top:24px">Recomendaciones</h3><div style="line-height:1.65">${report.recommendations.replace(/\n/g, '<br>')}</div>` : ''}
      `,
      ctaUrl: `${APP_URL}/mis-pendientes`,
      ctaLabel: 'Ver mis pendientes',
      footerNote: 'Este reporte es generado automáticamente por el Auditor IA TRINORMA cada lunes a las 08:00 hs.',
    }),
  });
}

module.exports = {
  sendMail,
  layout,
  sendPasswordReset,
  sendPasswordChangedByAdmin,
  sendAccessApproved,
  sendAccessRejected,
  sendAuditorReport,
};
