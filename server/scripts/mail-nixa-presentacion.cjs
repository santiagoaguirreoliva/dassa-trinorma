// =============================================================================
// Envío único — Triny se presenta a Nixa como su asistente para la conformidad
// de las 3 normas ISO. Programado para el 2026-05-18 08:00 AR vía cron.
// Idempotente: un flag file evita el reenvío.
// Es la única comunicación por correo; el seguimiento posterior Triny↔Nixa
// continúa por el inbox de la plataforma Trinorma.
// =============================================================================
const fs = require('fs');
const path = require('path');
const mailer = require('../services/mailer.cjs');

const FLAG = path.join(__dirname, '.mail-nixa-presentacion.sent');
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';

const body = `
  <p>Hola <strong>Nixa</strong>,</p>
  <p>Soy <strong>Triny</strong>, el asistente de IA del Sistema de Gestión Integrado de DASSA.
  Te escribo para presentarme: voy a ser <strong>tu asistente para toda la conformidad de las tres
  normas</strong> — ISO 9001 (Calidad), ISO 14001 (Ambiente) e ISO 45001 (Seguridad y Salud
  Ocupacional).</p>
  <p>Mi trabajo es ayudarte a que el sistema esté siempre al día: te aviso de lo que vence, analizo
  las no conformidades, armo informes y te acompaño en el seguimiento.</p>

  <h3 style="color:#0F1A4A;font-size:15px;margin:20px 0 8px">Para empezar, te pido que:</h3>
  <ol style="line-height:1.7;font-size:14px;color:#444;padding-left:20px">
    <li>Entres a la plataforma <strong>Trinorma</strong> y la recorras con calma.</li>
    <li>Revises tu <strong>inbox</strong> y las <strong>tareas pendientes</strong> que tengas asignadas.</li>
    <li>Te pongas a <strong>actualizar la app</strong> — cargando y completando la información que
    falte para que el sistema refleje la realidad de la operación.</li>
  </ol>

  <p style="font-size:14px;color:#444">Cualquier duda con el sistema, escribime o avisale a
  Santiago. Vamos a hacer un gran equipo.</p>
  <p style="font-size:14px;color:#444">Y mirando más adelante: cuando conozcas la plataforma a
  fondo, hay una oportunidad linda — esta herramienta puede ofrecerse a otras empresas que
  necesiten ordenar su conformidad ISO. Lo charlamos cuando estés lista.</p>
  <p style="font-size:14px;color:#444">A partir de acá seguimos en contacto por el inbox de la
  plataforma. Un abrazo y bienvenida,<br><strong>TRINY 🤖</strong> — Asistente del SGI Trinorma</p>
`;

(async () => {
  if (fs.existsSync(FLAG)) {
    console.log('[mail-nixa-presentacion] ya enviado anteriormente — se omite');
    process.exit(0);
  }
  const res = await mailer.sendMail({
    to: 'nixa.8908@gmail.com',
    from: 'TRINY DASSA 🤖 <auto@dassa.com.ar>',
    replyTo: 'santiago@dassa.com.ar',
    subject: '👋 Hola Nixa — soy Triny, tu asistente para la conformidad TRINORMA',
    html: mailer.layout({
      title: 'Hola Nixa, soy Triny',
      body,
      ctaUrl: APP_URL,
      ctaLabel: 'Entrar a la plataforma Trinorma',
      footerNote: 'Mensaje de presentación de Triny, asistente del SGI Trinorma.',
    }),
  });
  console.log('[mail-nixa-presentacion]', JSON.stringify(res));
  if (res.ok || res.skipped) fs.writeFileSync(FLAG, new Date().toISOString());
  process.exit(0);
})().catch(e => { console.error('[mail-nixa-presentacion] error:', e.message); process.exit(1); });
