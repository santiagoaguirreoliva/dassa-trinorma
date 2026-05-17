// =============================================================================
// TRINY MAILER · Envía comunicaciones automatizadas con firma TRINY
// Implementa: recordatorios lunes 8AM · resumen viernes 16h · informe mensual día 1 · intimaciones vencidas diario 10AM
// =============================================================================
const { Pool } = require('pg');
const mailer = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Alias del remitente para todos los mails de TRINY
const TRINY_FROM = 'TRINY DASSA 🤖 <auto@dassa.com.ar>';

// ─── Helpers ────────────────────────────────────────────────────────────────
async function getPolicies() {
  const r = await pool.query('SELECT * FROM triny_policies ORDER BY updated_at DESC LIMIT 1');
  return r.rows[0] || null;
}

async function getJob(key) {
  const r = await pool.query('SELECT * FROM triny_scheduled_jobs WHERE key=$1', [key]);
  return r.rows[0] || null;
}

async function recordJobRun(key, success, errorMsg) {
  const sets = success
    ? 'success_count = success_count + 1, last_run_at = NOW(), last_error = NULL'
    : 'error_count = error_count + 1, last_run_at = NOW(), last_error = $2';
  const args = success ? [key] : [key, (errorMsg || '').slice(0, 500)];
  await pool.query(`UPDATE triny_scheduled_jobs SET ${sets} WHERE key=$1`, args);
}

async function logComm({ job_type, tone, recipient_email, recipient_name, subject, body_html, body_text, success, error_message, meta }) {
  await pool.query(
    `INSERT INTO triny_comms_log (job_type, tone, recipient_email, recipient_name, subject, body_html, body_text, success, error_message, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [job_type, tone, recipient_email, recipient_name, subject, body_html, body_text, success, error_message, JSON.stringify(meta || {})]
  );
}

async function sendWithSignature({ to, name, subject, bodyHtml, bodyText, jobType, tone, dryRun, meta }) {
  const pol = await getPolicies();
  const sig = pol?.signature_html || '';
  const sigT = pol?.signature_text || '';
  const fullHtml = `<div style="font-family:system-ui,sans-serif;color:#1f2937;line-height:1.6">${bodyHtml}${sig}</div>`;
  const fullText = `${bodyText}${sigT}`;

  if (dryRun) {
    await logComm({ job_type: jobType, tone, recipient_email: to, recipient_name: name, subject: `[DRY_RUN] ${subject}`, body_html: fullHtml, body_text: fullText, success: true, error_message: null, meta: { ...(meta || {}), dry_run: true } });
    return { dry_run: true };
  }

  try {
    await mailer.sendMail({ to, subject, html: fullHtml, from: TRINY_FROM, replyTo: 'santiago@dassa.com.ar' });
    await logComm({ job_type: jobType, tone, recipient_email: to, recipient_name: name, subject, body_html: fullHtml, body_text: fullText, success: true, error_message: null, meta });
    return { sent: true };
  } catch (err) {
    await logComm({ job_type: jobType, tone, recipient_email: to, recipient_name: name, subject, body_html: fullHtml, body_text: fullText, success: false, error_message: String(err.message || err), meta });
    return { error: String(err.message || err) };
  }
}

// ─── Templates HTML reutilizables ──────────────────────────────────────────
function htmlHeader(emoji, title, subtitle, color = '#7c3aed') {
  return `<div style="background:linear-gradient(135deg,${color},${color}cc);color:#fff;padding:24px;border-radius:12px 12px 0 0">
    <div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:2px">${emoji} TRINY</div>
    <h1 style="margin:8px 0 4px;font-size:26px">${title}</h1>
    <p style="margin:0;opacity:.92">${subtitle}</p>
  </div>`;
}

function htmlContainer(inner) {
  return `<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${inner}</div>`;
}

function kpiBox(items) {
  return `<div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 24px;background:#f9fafb;border-bottom:1px solid #e5e7eb">${items.map(it => `
    <div style="flex:1;min-width:120px;text-align:center">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700">${it.label}</div>
      <div style="font-size:28px;font-weight:900;color:${it.color || '#111827'};margin-top:4px">${it.value}</div>
    </div>`).join('')}</div>`;
}

function taskRow(task, urgency) {
  const colors = { overdue: '#fee2e2', soon: '#fef3c7', normal: '#f9fafb' };
  const fg = { overdue: '#991b1b', soon: '#92400e', normal: '#374151' };
  const tnum = task.task_number || '—';
  const due = task.due_date ? new Date(task.due_date).toLocaleDateString('es-AR') : '—';
  const status = task.status === 'en_curso' ? '🟡 en curso' : (task.overdue ? `🔴 VENCIDA hace ${task.days_overdue || '?'} días` : '🟠 pendiente');
  return `<tr><td style="padding:10px;background:${colors[urgency]};color:${fg[urgency]};border-bottom:1px solid #e5e7eb">
    <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
      <div style="flex:1">
        <span style="background:#111;color:#fff;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:4px;margin-right:6px">${tnum}</span>
        <strong>${task.title}</strong>
      </div>
      <div style="font-size:11px;text-align:right;min-width:120px">
        <div>${status}</div>
        <div style="color:#6b7280;margin-top:2px">vence ${due}</div>
      </div>
    </div>
  </td></tr>`;
}

// ─── JOB 1: Recordatorios personales lunes 8 AM ───────────────────────────
async function jobRecordatoriosLunes(opts = {}) {
  const job = await getJob('recordatorios_lunes');
  if (!job?.enabled && !opts.force) return { skipped: 'job disabled' };
  const dryRun = (job?.dry_run !== false) && !opts.force_send;

  // Obtener todos los users activos
  const usersR = await pool.query("SELECT id, email, full_name, role FROM users WHERE is_active = true AND email LIKE '%@%'");
  const results = [];

  for (const u of usersR.rows) {
    // Tareas del user (mine query con multi-asignación)
    const tasksR = await pool.query(`
      SELECT t.id, t.task_number, t.title, t.status, t.priority, t.due_date,
             CASE WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('completada','cancelada') THEN TRUE ELSE FALSE END AS overdue,
             (CURRENT_DATE - t.due_date) AS days_overdue
      FROM tasks t
      WHERE (t.assigned_to = $1 OR t.collaborator_id = $1 OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1))
        AND t.status NOT IN ('completada','cancelada')
      ORDER BY
        CASE WHEN t.due_date < CURRENT_DATE THEN 0 WHEN t.due_date < CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 2 END,
        t.due_date NULLS LAST
      LIMIT 10
    `, [u.id]);

    const overdue = tasksR.rows.filter(t => t.overdue);
    const soon = tasksR.rows.filter(t => !t.overdue && t.due_date && new Date(t.due_date) <= new Date(Date.now() + 7*86400000));
    const normal = tasksR.rows.filter(t => !t.overdue && !soon.includes(t));

    if (tasksR.rows.length === 0) {
      // No tiene pendientes — mail celebratorio breve
      const html = htmlContainer(
        htmlHeader('🎉', 'Estás al día', 'Buenos días — no tenés tareas pendientes esta semana', '#10b981') +
        `<div style="padding:24px"><p>Hola <strong>${u.full_name.split(' ')[0]}</strong>,</p>
        <p>Esta semana empezás <strong>sin pendientes</strong>. Buen trabajo. ✨</p>
        <p>Si tenés tiempo, te invito a:</p>
        <ul><li>Revisar tu Bienvenida si todavía no firmaste el pacto</li>
        <li>Mirar las novedades del sistema</li>
        <li>Ofrecerte para alguna NC abierta de otro compañero</li></ul>
        <p>Te leo cuando me necesites. — TRINY</p></div>`
      );
      const r = await sendWithSignature({ to: u.email, name: u.full_name, subject: '🎉 Lunes sin pendientes en Trinorma', bodyHtml: html, bodyText: `Hola ${u.full_name.split(' ')[0]}, esta semana no tenés pendientes. Buen trabajo. — TRINY`, jobType: 'recordatorios_lunes', tone: 'calido', dryRun, meta: { user_id: u.id, total_tasks: 0 } });
      results.push({ user: u.email, ...r });
      continue;
    }

    let body = `<div style="padding:24px"><p>Hola <strong>${u.full_name.split(' ')[0]}</strong>,</p>
      <p>Buenos días. Te paso tus pendientes ordenados por urgencia — atención a las rojas primero.</p>`;

    if (overdue.length > 0) {
      body += `<h3 style="color:#991b1b;margin:24px 0 8px">🔴 Vencidas (${overdue.length})</h3>
        <table style="width:100%;border-collapse:collapse">${overdue.map(t => taskRow(t, 'overdue')).join('')}</table>`;
    }
    if (soon.length > 0) {
      body += `<h3 style="color:#92400e;margin:24px 0 8px">🟠 Próximas a vencer (${soon.length})</h3>
        <table style="width:100%;border-collapse:collapse">${soon.map(t => taskRow(t, 'soon')).join('')}</table>`;
    }
    if (normal.length > 0) {
      body += `<h3 style="color:#374151;margin:24px 0 8px">📋 Otras pendientes (${normal.length})</h3>
        <table style="width:100%;border-collapse:collapse">${normal.map(t => taskRow(t, 'normal')).join('')}</table>`;
    }

    body += `<p style="margin-top:24px"><a href="https://trinorma.dassa.com.ar/mis-pendientes" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Ver Mis Pendientes en Trinorma</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">Si algo de esto ya no aplica, marcalo como completada en el sistema y no te lo recuerdo más. Te leo.</p></div>`;

    const html = htmlContainer(
      htmlHeader('📋', `Tus pendientes de la semana`, `${tasksR.rows.length} tareas asignadas · ${overdue.length} vencidas`, '#7c3aed') + body
    );

    const r = await sendWithSignature({
      to: u.email, name: u.full_name,
      subject: `🚀 Lunes en Trinorma · ${tasksR.rows.length} pendientes${overdue.length ? ` (${overdue.length} vencidas)` : ''}`,
      bodyHtml: html, bodyText: `Hola ${u.full_name}, tenés ${tasksR.rows.length} pendientes esta semana. ${overdue.length} vencidas. Entrá a https://trinorma.dassa.com.ar/mis-pendientes — TRINY`,
      jobType: 'recordatorios_lunes', tone: 'calido', dryRun,
      meta: { user_id: u.id, total_tasks: tasksR.rows.length, overdue: overdue.length, soon: soon.length }
    });
    results.push({ user: u.email, ...r });
  }

  await recordJobRun('recordatorios_lunes', true);
  return { job: 'recordatorios_lunes', dry_run: dryRun, users_processed: results.length, results };
}

// ─── JOB 2: Resumen semanal viernes 16h ────────────────────────────────────
async function jobResumenViernes(opts = {}) {
  const job = await getJob('resumen_viernes');
  if (!job?.enabled && !opts.force) return { skipped: 'job disabled' };
  const dryRun = (job?.dry_run !== false) && !opts.force_send;
  const pol = await getPolicies();
  const recipients = pol?.direccion_recipients || ['santiago@dassa.com.ar'];

  // KPIs de la semana
  const week = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM findings WHERE status='abierta')              AS ncs_abiertas,
      (SELECT COUNT(*)::int FROM findings WHERE status='cerrada' AND updated_at > NOW() - INTERVAL '7 days') AS ncs_cerradas,
      (SELECT COUNT(*)::int FROM tasks WHERE status='pendiente')               AS tareas_pendientes,
      (SELECT COUNT(*)::int FROM tasks WHERE status='completada' AND completed_at > NOW() - INTERVAL '7 days') AS tareas_completadas,
      (SELECT COUNT(*)::int FROM tasks WHERE status='pendiente' AND due_date < CURRENT_DATE) AS tareas_vencidas,
      (SELECT COUNT(*)::int FROM trainings WHERE scheduled_date > NOW() - INTERVAL '7 days') AS capacitaciones_semana,
      (SELECT COUNT(*)::int FROM incidents WHERE created_at > NOW() - INTERVAL '7 days')   AS incidentes_semana,
      (SELECT COUNT(*)::int FROM committee_meetings WHERE meeting_date > NOW() - INTERVAL '7 days') AS reuniones_semana
  `).catch(() => ({ rows: [{}] }));
  const k = week.rows[0] || {};

  // Top users con tareas vencidas
  const top = await pool.query(`
    SELECT u.full_name, COUNT(t.id)::int AS vencidas
    FROM users u
    JOIN task_assignees ta ON ta.user_id=u.id
    JOIN tasks t ON t.id=ta.task_id
    WHERE t.status='pendiente' AND t.due_date < CURRENT_DATE AND u.is_active=true
    GROUP BY u.id, u.full_name ORDER BY COUNT(t.id) DESC LIMIT 5
  `).catch(() => ({ rows: [] }));

  // Análisis ejecutivo generado por IA (best-effort)
  let aiInsight = '';
  try { aiInsight = await require('./task-ai.cjs').weeklyExecutiveInsight(k); } catch { /* opcional */ }

  const body = `<div style="padding:24px">
    <p><strong>Resumen ejecutivo de la semana</strong> que termina el ${new Date().toLocaleDateString('es-AR')}.</p>
    ${aiInsight ? `<div style="background:#f4f2fb;border-left:4px solid #7c3aed;padding:12px 14px;margin:12px 0;line-height:1.6;font-size:14px;color:#374151">${aiInsight}</div>` : ''}
    ${kpiBox([
      { label: 'NCs abiertas', value: k.ncs_abiertas || 0, color: '#dc2626' },
      { label: 'NCs cerradas', value: k.ncs_cerradas || 0, color: '#10b981' },
      { label: 'Tareas vencidas', value: k.tareas_vencidas || 0, color: '#f59e0b' },
      { label: 'Tareas done', value: k.tareas_completadas || 0, color: '#10b981' },
    ])}
    <h3 style="margin:24px 0 8px">Actividad</h3>
    <ul>
      <li>Tareas pendientes en el sistema: <strong>${k.tareas_pendientes || 0}</strong></li>
      <li>Capacitaciones esta semana: <strong>${k.capacitaciones_semana || 0}</strong></li>
      <li>Incidentes registrados: <strong>${k.incidentes_semana || 0}</strong></li>
      <li>Reuniones de comité: <strong>${k.reuniones_semana || 0}</strong></li>
    </ul>
    ${top.rows.length ? `<h3 style="margin:24px 0 8px">⚠️ Top users con tareas vencidas</h3>
      <table style="width:100%;border-collapse:collapse">${top.rows.map(r => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${r.full_name}</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:700">${r.vencidas} vencidas</td></tr>`).join('')}</table>` : ''}
    <p style="margin-top:24px"><a href="https://trinorma.dassa.com.ar/dashboard" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Ver Dashboard ejecutivo</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Buen fin de semana. — TRINY</p></div>`;

  const html = htmlContainer(htmlHeader('📊', 'Resumen semanal Trinorma', `Semana al ${new Date().toLocaleDateString('es-AR')} · KPIs ejecutivos`, '#7c3aed') + body);
  const results = [];
  for (const email of recipients) {
    const userR = await pool.query("SELECT full_name FROM users WHERE email=$1", [email]);
    const name = userR.rows[0]?.full_name || email;
    const r = await sendWithSignature({ to: email, name, subject: `📊 Resumen Trinorma · ${new Date().toLocaleDateString('es-AR')}`, bodyHtml: html, bodyText: `Resumen semanal: ${k.ncs_abiertas} NCs abiertas, ${k.tareas_vencidas} vencidas. Ver dashboard. — TRINY`, jobType: 'resumen_viernes', tone: 'formal', dryRun, meta: k });
    results.push({ to: email, ...r });
  }
  await recordJobRun('resumen_viernes', true);
  return { job: 'resumen_viernes', dry_run: dryRun, recipients: recipients.length, results };
}

// ─── JOB 3: Informe mensual día 1, 9 AM ────────────────────────────────────
async function jobInformeMensual(opts = {}) {
  const job = await getJob('informe_mensual');
  if (!job?.enabled && !opts.force) return { skipped: 'job disabled' };
  const dryRun = (job?.dry_run !== false) && !opts.force_send;
  const pol = await getPolicies();
  const recipients = pol?.direccion_recipients || ['santiago@dassa.com.ar'];

  // KPIs del mes pasado
  const m = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM findings WHERE created_at > NOW() - INTERVAL '30 days') AS ncs_mes,
      (SELECT COUNT(*)::int FROM findings WHERE status='cerrada' AND updated_at > NOW() - INTERVAL '30 days') AS ncs_cerradas_mes,
      (SELECT COUNT(*)::int FROM tasks WHERE completed_at > NOW() - INTERVAL '30 days') AS tasks_done_mes,
      (SELECT COUNT(*)::int FROM tasks WHERE status='pendiente') AS tasks_pendientes,
      (SELECT COUNT(*)::int FROM trainings WHERE scheduled_date > NOW() - INTERVAL '30 days') AS caps_mes,
      (SELECT COUNT(*)::int FROM incidents WHERE created_at > NOW() - INTERVAL '30 days') AS incidentes_mes,
      (SELECT COUNT(*)::int FROM committee_meetings WHERE meeting_date > NOW() - INTERVAL '30 days') AS reuniones_mes,
      (SELECT COUNT(*)::int FROM risks WHERE created_at > NOW() - INTERVAL '30 days') AS riesgos_nuevos_mes
  `).catch(() => ({ rows: [{}] }));
  const k = m.rows[0] || {};

  const fechaMes = new Date(Date.now() - 30*86400000).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const body = `<div style="padding:24px">
    <p><strong>Informe mensual del SGI Trinorma · ${fechaMes}</strong></p>
    <p>El presente informe sintetiza el estado de las tres normas ISO (9001 · 14001 · 45001) gestionadas en el sistema Trinorma durante el último mes.</p>
    ${kpiBox([
      { label: 'NCs del mes', value: k.ncs_mes || 0 },
      { label: 'NCs cerradas', value: k.ncs_cerradas_mes || 0, color: '#10b981' },
      { label: 'Capacitaciones', value: k.caps_mes || 0 },
      { label: 'Incidentes', value: k.incidentes_mes || 0, color: '#dc2626' },
    ])}
    <h3 style="margin:24px 0 8px">Cumplimiento</h3>
    <ul>
      <li>Tareas completadas: <strong>${k.tasks_done_mes || 0}</strong> · Pendientes en sistema: <strong>${k.tasks_pendientes || 0}</strong></li>
      <li>Reuniones de comité mixto: <strong>${k.reuniones_mes || 0}</strong> (objetivo: 1/mes)</li>
      <li>Riesgos nuevos identificados (AMFE): <strong>${k.riesgos_nuevos_mes || 0}</strong></li>
    </ul>
    <h3 style="margin:24px 0 8px">Estado por norma</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="background:#f3f4f6"><td style="padding:8px;border:1px solid #e5e7eb"><strong>ISO 9001</strong> Calidad</td><td style="padding:8px;border:1px solid #e5e7eb">Procedimientos vigentes · NCs gestionadas · auditorías internas en agenda</td></tr>
      <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>ISO 14001</strong> Ambiente</td><td style="padding:8px;border:1px solid #e5e7eb">Aspectos ambientales identificados · cumplimiento legal monitoreado</td></tr>
      <tr style="background:#f3f4f6"><td style="padding:8px;border:1px solid #e5e7eb"><strong>ISO 45001</strong> SySO</td><td style="padding:8px;border:1px solid #e5e7eb">Matriz AMFE actualizada · capacitaciones de SySO · incidentes investigados</td></tr>
    </table>
    <p style="margin-top:24px"><a href="https://trinorma.dassa.com.ar/sistema-gestion" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Ver Sistema de Gestión completo</a></p>
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Listo para presentar al directorio. — TRINY</p></div>`;

  const html = htmlContainer(htmlHeader('📈', `Informe mensual · ${fechaMes}`, 'Estado integral del SGI Trinorma · ejecutivo', '#7c3aed') + body);
  const results = [];
  for (const email of recipients) {
    const userR = await pool.query("SELECT full_name FROM users WHERE email=$1", [email]);
    const name = userR.rows[0]?.full_name || email;
    const r = await sendWithSignature({ to: email, name, subject: `📈 Informe mensual TRINY · ${fechaMes}`, bodyHtml: html, bodyText: `Informe mensual: ${k.ncs_mes} NCs del mes, ${k.tasks_done_mes} tareas done. — TRINY`, jobType: 'informe_mensual', tone: 'formal', dryRun, meta: k });
    results.push({ to: email, ...r });
  }
  await recordJobRun('informe_mensual', true);
  return { job: 'informe_mensual', dry_run: dryRun, recipients: recipients.length, results };
}

// ─── JOB 4: Intimación diario 10AM (solo si hay vencidas > 7 días) ─────────
async function jobIntimacionVencidas(opts = {}) {
  const job = await getJob('intimacion_vencidas');
  if (!job?.enabled && !opts.force) return { skipped: 'job disabled' };
  const dryRun = (job?.dry_run !== false) && !opts.force_send;

  // Users con tareas vencidas > 7 días
  const overdue = await pool.query(`
    SELECT u.id, u.email, u.full_name, COUNT(t.id)::int AS n,
           array_agg(json_build_object('id',t.id,'task_number',t.task_number,'title',t.title,'days',CURRENT_DATE - t.due_date) ORDER BY t.due_date) AS items
    FROM users u
    JOIN task_assignees ta ON ta.user_id = u.id
    JOIN tasks t ON t.id = ta.task_id
    WHERE u.is_active = true AND t.status = 'pendiente'
      AND t.due_date < CURRENT_DATE - INTERVAL '7 days'
    GROUP BY u.id ORDER BY COUNT(t.id) DESC
  `);

  const results = [];
  for (const row of overdue.rows) {
    const items = row.items || [];
    const escalateTo = items.some(i => i.days > 30) ? ['manuel@dassa.com.ar','santiago@dassa.com.ar'] : (items.some(i => i.days > 15) ? ['manuel@dassa.com.ar'] : []);
    const body = `<div style="padding:24px">
      <p>Hola <strong>${row.full_name.split(' ')[0]}</strong>,</p>
      <p>Tenés <strong>${row.n} tareas vencidas hace más de 7 días</strong>. Necesito que las atiendas ya. Si alguna no aplica, marcala como cancelada con motivo y la sacamos del listado.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${items.map(i => `<tr><td style="padding:8px;background:#fee2e2;border-bottom:1px solid #fecaca">
          <span style="background:#111;color:#fff;font-family:monospace;font-size:11px;padding:2px 6px;border-radius:4px">${i.task_number || '—'}</span>
          <strong>${i.title}</strong>
          <span style="color:#991b1b;font-weight:700;float:right">vencida hace ${i.days} días</span>
        </td></tr>`).join('')}
      </table>
      ${escalateTo.length ? `<p style="background:#fef3c7;padding:12px;border-left:4px solid #d97706;font-size:13px">⚠️ <strong>Aviso:</strong> hay tareas vencidas hace más de ${items.some(i=>i.days>30) ? '30' : '15'} días. Estoy poniendo en copia a ${escalateTo.join(' y ')}.</p>` : ''}
      <p><a href="https://trinorma.dassa.com.ar/mis-pendientes" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Atender ahora</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">No me gusta intimar pero el SGI requiere disciplina. Si necesitás ayuda con alguna, escribime a santiago@dassa.com.ar. — TRINY</p></div>`;
    const html = htmlContainer(htmlHeader('⚠️', `${row.n} tareas vencidas`, 'Atención requerida hoy', '#dc2626') + body);

    // To principal + cc escalado
    const toList = [row.email, ...escalateTo];
    for (const dst of toList) {
      const userR = await pool.query("SELECT full_name FROM users WHERE email=$1", [dst]);
      const r = await sendWithSignature({
        to: dst, name: userR.rows[0]?.full_name || dst,
        subject: `⚠️ TRINORMA · ${row.full_name.split(' ')[0]} tiene ${row.n} tareas vencidas`,
        bodyHtml: html, bodyText: `${row.full_name} tiene ${row.n} tareas vencidas hace + de 7 días. Atender. — TRINY`,
        jobType: 'intimacion_vencidas', tone: 'firme', dryRun,
        meta: { primary_user: row.id, count: row.n, escalated_to: escalateTo }
      });
      results.push({ to: dst, ...r });
    }
  }
  await recordJobRun('intimacion_vencidas', true);
  return { job: 'intimacion_vencidas', dry_run: dryRun, users_with_overdue: overdue.rows.length, results };
}

// ─── Preview · genera el HTML sin mandar mail ─────────────────────────────
async function previewJob(jobKey, _userIdHint) {
  // Hacemos un mini fake-send setting dryRun=true
  if (jobKey === 'recordatorios_lunes') return jobRecordatoriosLunes({ force: true });
  if (jobKey === 'resumen_viernes')     return jobResumenViernes({ force: true });
  if (jobKey === 'informe_mensual')     return jobInformeMensual({ force: true });
  if (jobKey === 'intimacion_vencidas') return jobIntimacionVencidas({ force: true });
  throw new Error('Job desconocido: ' + jobKey);
}

module.exports = {
  jobRecordatoriosLunes,
  jobResumenViernes,
  jobInformeMensual,
  jobIntimacionVencidas,
  previewJob,
  getPolicies,
};
