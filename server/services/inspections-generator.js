// services/inspections-generator.js — Motor de recurrencia (F2).
// Genera las instancias de inspección que corresponden al período actual
// (diaria / semanal / quincenal / mensual / trimestral / anual), crea la
// tarea pendiente vinculada para los rondines y marca las vencidas.
// Ref: docs/SPEC-RONDA-INSPECCIONES.md
import { query, getClient } from '../db/db.js';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// ─── helpers de fecha (todo en 'YYYY-MM-DD', hora local del server) ──
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - dow);
  return x;
}

// Semana ISO 8601 → { year, week }
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // jueves de la semana
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date - firstThu) / (7 * 86400000));
  return { year: date.getUTCFullYear(), week };
}

// Período vigente para una plantilla → { label, scheduled }
function periodFor(template, now) {
  const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
  switch (template.frequency) {
    case 'diaria':
      return { label: ymd(now), scheduled: ymd(now) };
    case 'semanal': {
      const { year, week } = isoWeek(now);
      return { label: `Semana ${year}-W${pad2(week)}`, scheduled: ymd(mondayOf(now)) };
    }
    case 'quincenal': {
      const q = D <= 15 ? 1 : 2;
      const day = q === 1 ? 1 : 16;
      return { label: `Quincena ${q} · ${Y}-${pad2(M + 1)}`,
               scheduled: `${Y}-${pad2(M + 1)}-${pad2(day)}` };
    }
    case 'mensual':
      return { label: `${Y}-${pad2(M + 1)}`, scheduled: `${Y}-${pad2(M + 1)}-01` };
    case 'trimestral': {
      const tq = Math.floor(M / 3) + 1;
      return { label: `${Y}-T${tq}`, scheduled: `${Y}-${pad2((tq - 1) * 3 + 1)}-01` };
    }
    case 'anual':
      return { label: `${Y}`, scheduled: `${Y}-01-01` };
    default:
      return { label: ymd(now), scheduled: ymd(now) };
  }
}

// Crea una instancia si no existe para (plantilla, período, máquina).
async function ensureInstance(t, period, machine) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const machineId = machine ? machine.id : null;
    const dup = await client.query(
      `SELECT id FROM insp_inspections
        WHERE template_id=$1 AND period_label=$2
          AND COALESCE(machine_id,$3::uuid) = COALESCE($4::uuid,$3::uuid)
          AND deleted_at IS NULL`,
      [t.id, period.label, NIL_UUID, machineId]);
    if (dup.rows.length) { await client.query('ROLLBACK'); return null; }

    const dueDate = addDaysStr(period.scheduled, t.due_offset_days || 0);
    const insp = (await client.query(
      `INSERT INTO insp_inspections
         (template_id, family, status, period_label, scheduled_date, due_date, machine_id)
       VALUES ($1,$2,'pendiente',$3,$4,$5,$6)
       RETURNING id, code`,
      [t.id, t.family, period.label, period.scheduled, dueDate, machineId])).rows[0];

    if (t.family === 'rondin') {
      const resp = (await client.query(
        'SELECT user_id, role FROM insp_template_responsibles WHERE template_id=$1', [t.id])).rows;
      if (resp.length) {
        const taskId = (await client.query(
          `INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, source_module)
           VALUES ($1,$2,'pendiente','alta',$3,$4,'rondas') RETURNING id`,
          [`Rondín: ${t.name} — ${period.label}`,
           `Completá el rondín "${t.name}" en el módulo Ronda de Inspecciones del SGI. ` +
           `Vence el ${dueDate}.`,
           dueDate, resp[0].user_id])).rows[0].id;
        await client.query('UPDATE insp_inspections SET task_id=$1 WHERE id=$2', [taskId, insp.id]);
        for (let k = 0; k < resp.length; k++) {
          const r = resp[k];
          // task_assignees solo admite 'principal' | 'colaborador'
          await client.query(
            'INSERT INTO task_assignees (task_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [taskId, r.user_id, k === 0 ? 'principal' : 'colaborador']);
          await client.query(
            `INSERT INTO insp_assignees (inspection_id, user_id, role) VALUES ($1,$2,$3)
             ON CONFLICT (inspection_id, user_id) DO NOTHING`,
            [insp.id, r.user_id, r.role]);
        }
      }
    }
    await client.query('COMMIT');
    return { code: insp.code, template: t.code, period: period.label, machine: machine?.code || null };
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return null; // carrera contra el índice único
    throw e;
  } finally {
    client.release();
  }
}

// Genera todas las inspecciones que faltan para el período actual.
export async function generateDueInspections(now = new Date()) {
  const created = [];
  const templates = (await query('SELECT * FROM insp_templates WHERE active=true')).rows;
  for (const t of templates) {
    const period = periodFor(t, now);
    if (t.family === 'maquinaria') {
      // Para checklists diarios respetamos el flag daily_checklist
      // (Mitsubishi y otras máquinas on-demand quedan fuera del cron diario)
      const where = t.frequency === 'diaria'
        ? 'WHERE active=true AND daily_checklist=true'
        : 'WHERE active=true';
      const machines = (await query(`SELECT * FROM insp_machines ${where}`)).rows;
      for (const m of machines) {
        const r = await ensureInstance(t, period, m);
        if (r) created.push(r);
      }
    } else {
      const r = await ensureInstance(t, period, null);
      if (r) created.push(r);
    }
  }
  return created;
}

// Marca como 'vencida' toda inspección pendiente/en curso pasada de fecha.
export async function markOverdueInspections() {
  const { rowCount } = await query(
    `UPDATE insp_inspections SET status='vencida'
      WHERE status IN ('pendiente','en_curso')
        AND due_date < CURRENT_DATE AND deleted_at IS NULL`);
  return rowCount;
}

// Job diario: generar + marcar vencidas.
export async function runInspectionsDaily() {
  const created = await generateDueInspections();
  const overdue = await markOverdueInspections();
  console.log(`[rondas-cron] generadas: ${created.length} · marcadas vencidas: ${overdue}`);
  return { created, overdue };
}
