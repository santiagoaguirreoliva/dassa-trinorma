// =============================================================================
// Envío único — Triny le explica a María las mejoras del módulo de
// Capacitaciones. Programado para el 2026-05-18 08:00 AR vía cron.
// Idempotente: un flag file evita el reenvío si el cron vuelve a dispararse.
// =============================================================================
const fs = require('fs');
const path = require('path');
const mailer = require('../services/mailer.cjs');

const FLAG = path.join(__dirname, '.mail-maria-capacitaciones.sent');
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';

const body = `
  <p>Hola <strong>María</strong>,</p>
  <p>Soy Triny. Te escribo para contarte que se hicieron mejoras importantes en el módulo de
  <strong>Capacitaciones</strong> del SGI Trinorma, y para pedirte una mano con algunas cosas que
  ahora dependen de tu carga.</p>

  <h3 style="color:#0F1A4A;font-size:15px;margin:20px 0 8px">Qué mejoramos</h3>
  <ol style="line-height:1.7;font-size:14px;color:#444;padding-left:20px">
    <li><strong>Seguridad</strong>: solo los roles de gestión pueden crear, editar o borrar capacitaciones (antes cualquier usuario podía).</li>
    <li><strong>Editar y borrar</strong>: ahora se puede corregir una capacitación con la fecha mal cargada, y crear una capacitación desde cualquier día del calendario.</li>
    <li><strong>Material y evidencia separados</strong>: el material previo (temario, PDF) va aparte de la evidencia del dictado (fotos, planilla firmada, acta).</li>
    <li><strong>Evaluación de eficacia</strong>: el acta F-TRI-36 mostraba "Completada satisfactoriamente" fijo. Ahora se carga el resultado real (eficaz / parcial / no eficaz), cómo se verificó y las observaciones — como pide la ISO 9001.</li>
    <li><strong>Recordatorios automáticos</strong>: el sistema avisa solo a los participantes cuando se acerca una capacitación.</li>
    <li><strong>Competencias por puesto</strong>: una vista nueva cruza las capacitaciones que requiere cada puesto con las que cada persona efectivamente hizo.</li>
  </ol>
  <p style="font-size:14px;color:#444">También se arregló el módulo de <strong>Empleados</strong> (antes no se podían cargar ni editar) y se sumó el campo de <strong>WhatsApp</strong> para comunicaciones.</p>

  <h3 style="color:#0F1A4A;font-size:15px;margin:20px 0 8px">Qué necesito de vos</h3>
  <p style="font-size:14px;color:#444">Te dejé estas tareas en <strong>"Mis Pendientes"</strong> del sistema:</p>
  <ol style="line-height:1.7;font-size:14px;color:#444;padding-left:20px">
    <li>Cargar los <strong>WhatsApp</strong> de los empleados en RRHH → Empleados.</li>
    <li>Revisar las capacitaciones ya dictadas y cargar la <strong>evaluación de eficacia</strong>.</li>
    <li>Subir el <strong>material previo</strong> de las capacitaciones que lo tengan.</li>
    <li>Marcar la <strong>conformidad</strong> de los participantes.</li>
    <li>Revisar la <strong>matriz de competencias por puesto</strong> y ajustar las fichas si falta algo.</li>
  </ol>
  <p style="font-size:14px;color:#444">Cualquier duda con el sistema, escribime o avisale a Santiago. Vamos paso a paso.</p>
  <p style="font-size:14px;color:#444">Un abrazo,<br><strong>TRINY 🤖</strong> — Asistente del SGI Trinorma</p>
`;

(async () => {
  if (fs.existsSync(FLAG)) {
    console.log('[mail-maria-capacitaciones] ya enviado anteriormente — se omite');
    process.exit(0);
  }
  const res = await mailer.sendMail({
    to: 'maria@dassa.com.ar',
    from: 'TRINY DASSA 🤖 <auto@dassa.com.ar>',
    replyTo: 'santiago@dassa.com.ar',
    subject: '📚 Mejoras en el módulo de Capacitaciones — qué cambió y qué necesito de vos',
    html: mailer.layout({
      title: 'Mejoras en el módulo de Capacitaciones',
      body,
      ctaUrl: `${APP_URL}/mis-pendientes`,
      ctaLabel: 'Ver mis tareas en el SGI',
      footerNote: 'Mensaje de Triny, asistente del SGI Trinorma.',
    }),
  });
  console.log('[mail-maria-capacitaciones]', JSON.stringify(res));
  if (res.ok || res.skipped) fs.writeFileSync(FLAG, new Date().toISOString());
  process.exit(0);
})().catch(e => { console.error('[mail-maria-capacitaciones] error:', e.message); process.exit(1); });
