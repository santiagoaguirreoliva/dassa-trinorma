import nodemailer from 'nodemailer';
import 'dotenv/config';

// Configure SMTP transporter
// Set these in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'DASSA SGI <no-reply@dassa.com.ar>';
const APP_URL = process.env.APP_URL || 'http://181.174.193.98';

function priorityLabel(p) {
  return { urgente: 'URGENTE', alta: 'ALTA', media: 'Media', baja: 'Baja' }[p] || p;
}

function priorityColor(p) {
  return { urgente: '#dc2626', alta: '#ea580c', media: '#d97706', baja: '#16a34a' }[p] || '#6b7280';
}

const templates = {
  assigned: ({ userName, taskTitle, dueDate, priority, createdBy }) => ({
    subject: `[DASSA SGI] Nueva tarea asignada: ${taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;">
        <div style="background:linear-gradient(135deg,#1e40af,#0ea5e9);padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">DASSA SGI — Trinorma</h1>
          <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">ISO 9001 · 14001 · 45001</p>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 16px;">Hola <strong>${userName}</strong>,</p>
          <p style="margin:0 0 16px;">Se te ha asignado una nueva tarea en el sistema:</p>
          <div style="background:#f1f5f9;padding:16px;border-radius:6px;border-left:4px solid ${priorityColor(priority)};margin:0 0 16px;">
            <p style="margin:0 0 8px;font-weight:bold;font-size:15px;">${taskTitle}</p>
            <table style="font-size:13px;">
              <tr><td style="color:#64748b;padding:2px 12px 2px 0;">Prioridad:</td><td><strong style="color:${priorityColor(priority)}">${priorityLabel(priority)}</strong></td></tr>
              <tr><td style="color:#64748b;padding:2px 12px 2px 0;">Fecha límite:</td><td>${dueDate || 'Sin fecha'}</td></tr>
              <tr><td style="color:#64748b;padding:2px 12px 2px 0;">Asignada por:</td><td>${createdBy}</td></tr>
            </table>
          </div>
          <a href="${APP_URL}/tasks" style="display:inline-block;background:#2563eb;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">Ver en DASSA SGI</a>
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Este es un mensaje automático del sistema DASSA SGI Trinorma.</p>
      </div>`,
  }),

  overdue: ({ userName, tasks }) => ({
    subject: `[DASSA SGI] Tienes ${tasks.length} tarea(s) vencida(s)`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;">
        <div style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">DASSA SGI — Tareas Vencidas</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 16px;">Hola <strong>${userName}</strong>,</p>
          <p style="margin:0 0 16px;">Las siguientes tareas están vencidas y requieren tu atención:</p>
          ${tasks.map(t => `
            <div style="background:#fef2f2;padding:12px;border-radius:6px;border-left:4px solid #dc2626;margin:0 0 10px;">
              <p style="margin:0;font-weight:bold;font-size:13px;">${t.title}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Vencimiento: ${t.due_date} · Prioridad: ${priorityLabel(t.priority)}</p>
            </div>`).join('')}
          <a href="${APP_URL}/tasks" style="display:inline-block;background:#dc2626;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;margin-top:8px;">Revisar tareas</a>
        </div>
      </div>`,
  }),

  upcoming: ({ userName, tasks }) => ({
    subject: `[DASSA SGI] ${tasks.length} tarea(s) próxima(s) a vencer`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px;">
        <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="color:white;margin:0;font-size:18px;">DASSA SGI — Recordatorio de Tareas</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 16px;">Hola <strong>${userName}</strong>,</p>
          <p style="margin:0 0 16px;">Estas tareas vencen en los próximos 7 días:</p>
          ${tasks.map(t => `
            <div style="background:#fffbeb;padding:12px;border-radius:6px;border-left:4px solid #d97706;margin:0 0 10px;">
              <p style="margin:0;font-weight:bold;font-size:13px;">${t.title}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Vencimiento: ${t.due_date} · Prioridad: ${priorityLabel(t.priority)}</p>
            </div>`).join('')}
          <a href="${APP_URL}/tasks" style="display:inline-block;background:#d97706;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;margin-top:8px;">Ver tareas</a>
        </div>
      </div>`,
  }),

  // ─── Resumen quincenal de tareas pendientes ───────────────────
  digest: ({ userName, date, overdueTasks, pendingTasks, inProgressTasks, summary }) => {
    const fmtDate = (d) => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }); }
      catch { return d; }
    };
    const taskRow = (t, borderColor) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;">${t.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">
          <span style="color:${priorityColor(t.priority)};font-weight:bold;font-size:12px;">${priorityLabel(t.priority)}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b;">${fmtDate(t.due_date)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:11px;color:#64748b;">${t.category || '—'}</td>
      </tr>`;

    const tableHeader = `
      <table style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="text-align:left;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Tarea</th>
            <th style="text-align:center;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Prioridad</th>
            <th style="text-align:center;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Vencimiento</th>
            <th style="text-align:center;padding:8px 10px;font-size:11px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;">Categoría</th>
          </tr>
        </thead>
        <tbody>`;
    const tableFooter = `</tbody></table>`;

    let sections = '';

    // Summary boxes
    sections += `
      <div style="display:flex;gap:12px;margin:0 0 20px;">
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#dc2626;">${summary.overdue}</div>
          <div style="font-size:11px;color:#991b1b;margin-top:2px;">Vencidas</div>
        </div>
        <div style="flex:1;background:#fffbeb;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#d97706;">${summary.pending}</div>
          <div style="font-size:11px;color:#92400e;margin-top:2px;">Pendientes</div>
        </div>
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#2563eb;">${summary.in_progress}</div>
          <div style="font-size:11px;color:#1e40af;margin-top:2px;">En curso</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#16a34a;">${summary.total}</div>
          <div style="font-size:11px;color:#166534;margin-top:2px;">Total activas</div>
        </div>
      </div>`;

    // Overdue section
    if (overdueTasks.length > 0) {
      sections += `
        <div style="margin:0 0 20px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#dc2626;border-bottom:2px solid #fecaca;padding-bottom:6px;">
            ⚠ Tareas VENCIDAS (${overdueTasks.length})
          </h3>
          ${tableHeader}
          ${overdueTasks.map(t => taskRow(t, '#dc2626')).join('')}
          ${tableFooter}
        </div>`;
    }

    // Pending section
    if (pendingTasks.length > 0) {
      sections += `
        <div style="margin:0 0 20px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#d97706;border-bottom:2px solid #fde68a;padding-bottom:6px;">
            Tareas pendientes (${pendingTasks.length})
          </h3>
          ${tableHeader}
          ${pendingTasks.map(t => taskRow(t, '#d97706')).join('')}
          ${tableFooter}
        </div>`;
    }

    // In progress section
    if (inProgressTasks.length > 0) {
      sections += `
        <div style="margin:0 0 20px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#2563eb;border-bottom:2px solid #bfdbfe;padding-bottom:6px;">
            Tareas en curso (${inProgressTasks.length})
          </h3>
          ${tableHeader}
          ${inProgressTasks.map(t => taskRow(t, '#2563eb')).join('')}
          ${tableFooter}
        </div>`;
    }

    return {
      subject: `[DASSA SGI] Resumen quincenal de tareas — ${date}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">
          <div style="background:linear-gradient(135deg,#1e40af,#0ea5e9);padding:20px;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;font-size:18px;">DASSA SGI — Resumen Quincenal de Tareas</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">ISO 9001 · 14001 · 45001 — ${date}</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 16px;font-size:14px;">Hola <strong>${userName}</strong>,</p>
            <p style="margin:0 0 20px;font-size:13px;color:#475569;">
              Este es tu resumen quincenal de tareas del Sistema de Gestión Integrado.
              A continuación encontrarás el estado de tus tareas asignadas:
            </p>
            ${sections}
            ${summary.total === 0
              ? '<p style="text-align:center;padding:20px;color:#16a34a;font-size:14px;font-weight:bold;">✓ No tenés tareas pendientes. ¡Excelente!</p>'
              : ''}
            <div style="text-align:center;margin-top:16px;">
              <a href="${APP_URL}/tasks" style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
                Ver mis tareas en DASSA SGI
              </a>
            </div>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">
            Envío automático quincenal (1 y 16 de cada mes) — DASSA SGI Trinorma
          </p>
        </div>`,
    };
  },
};

export async function sendTaskEmail(type, data) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email] SMTP not configured — skipping ${type} email to ${data.to || 'N/A'}`);
    return;
  }
  const template = templates[type];
  if (!template) throw new Error(`Unknown email template: ${type}`);
  const { subject, html } = template(data);
  try {
    await transporter.sendMail({ from: FROM, to: data.to, subject, html });
    console.log(`[Email] Sent ${type} to ${data.to}`);
  } catch (err) {
    console.error(`[Email] Failed ${type} to ${data.to}:`, err.message);
    throw err;
  }
}

// ─── Bimonthly digest: sends summary email to each user on 1st and 16th ───
export async function sendBimonthlyDigest(queryFn) {
  if (!process.env.SMTP_USER) {
    console.log('[Email] SMTP not configured — skipping bimonthly digest');
    return { sent: 0 };
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  try {
    // Get all active users who have tasks assigned (as principal or collaborator)
    const { rows: usersWithTasks } = await queryFn(`
      SELECT DISTINCT u.id, u.full_name, u.email
        FROM users u
       WHERE u.is_active = true
         AND (
           EXISTS (SELECT 1 FROM tasks t WHERE t.assigned_to = u.id AND t.status NOT IN ('completada','cancelada'))
           OR EXISTS (SELECT 1 FROM tasks t WHERE t.collaborator_id = u.id AND t.status NOT IN ('completada','cancelada'))
         )
       ORDER BY u.full_name`);

    let sent = 0;
    const errors = [];

    for (const usr of usersWithTasks) {
      try {
        // Overdue tasks
        const { rows: overdueTasks } = await queryFn(`
          SELECT t.title, t.priority, t.due_date::text AS due_date, t.category, t.iso_norm
            FROM tasks t
           WHERE (t.assigned_to = $1 OR t.collaborator_id = $1)
             AND t.due_date < CURRENT_DATE
             AND t.status NOT IN ('completada','cancelada')
           ORDER BY t.due_date ASC`, [usr.id]);

        // Pending tasks (not overdue)
        const { rows: pendingTasks } = await queryFn(`
          SELECT t.title, t.priority, t.due_date::text AS due_date, t.category, t.iso_norm
            FROM tasks t
           WHERE (t.assigned_to = $1 OR t.collaborator_id = $1)
             AND t.status = 'pendiente'
             AND (t.due_date >= CURRENT_DATE OR t.due_date IS NULL)
           ORDER BY t.due_date ASC NULLS LAST`, [usr.id]);

        // In progress tasks
        const { rows: inProgressTasks } = await queryFn(`
          SELECT t.title, t.priority, t.due_date::text AS due_date, t.category, t.iso_norm
            FROM tasks t
           WHERE (t.assigned_to = $1 OR t.collaborator_id = $1)
             AND t.status = 'en_curso'
           ORDER BY t.due_date ASC NULLS LAST`, [usr.id]);

        const total = overdueTasks.length + pendingTasks.length + inProgressTasks.length;

        await sendTaskEmail('digest', {
          to: usr.email,
          userName: usr.full_name,
          date: dateStr,
          overdueTasks,
          pendingTasks,
          inProgressTasks,
          summary: {
            overdue: overdueTasks.length,
            pending: pendingTasks.length,
            in_progress: inProgressTasks.length,
            total,
          },
        });
        sent++;
      } catch (err) {
        errors.push({ user: usr.email, error: err.message });
      }
    }

    console.log(`[Email] Bimonthly digest sent to ${sent}/${usersWithTasks.length} users`);
    if (errors.length) console.error('[Email] Digest errors:', errors);
    return { sent, total: usersWithTasks.length, errors };
  } catch (err) {
    console.error('[Email] sendBimonthlyDigest error:', err.message);
    throw err;
  }
}

// Cron-like function to check overdue tasks (call from a scheduler or route)
export async function checkOverdueTasks(queryFn) {
  try {
    // Get users with overdue tasks
    const { rows } = await queryFn(`
      SELECT u.id, u.full_name, u.email,
             json_agg(json_build_object(
               'title', t.title,
               'due_date', t.due_date::text,
               'priority', t.priority
             ) ORDER BY t.due_date) AS tasks
        FROM tasks t
        JOIN users u ON u.id = t.assigned_to
       WHERE t.due_date < CURRENT_DATE
         AND t.status NOT IN ('completada','cancelada')
       GROUP BY u.id`);

    for (const user of rows) {
      await sendTaskEmail('overdue', {
        to: user.email,
        userName: user.full_name,
        tasks: user.tasks,
      }).catch(() => {});
    }

    // Get users with tasks due in next 7 days
    const { rows: upcoming } = await queryFn(`
      SELECT u.id, u.full_name, u.email,
             json_agg(json_build_object(
               'title', t.title,
               'due_date', t.due_date::text,
               'priority', t.priority
             ) ORDER BY t.due_date) AS tasks
        FROM tasks t
        JOIN users u ON u.id = t.assigned_to
       WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND t.status NOT IN ('completada','cancelada')
       GROUP BY u.id`);

    for (const user of upcoming) {
      await sendTaskEmail('upcoming', {
        to: user.email,
        userName: user.full_name,
        tasks: user.tasks,
      }).catch(() => {});
    }

    return { overdue: rows.length, upcoming: upcoming.length };
  } catch (err) {
    console.error('[Email] checkOverdueTasks error:', err.message);
    throw err;
  }
}
