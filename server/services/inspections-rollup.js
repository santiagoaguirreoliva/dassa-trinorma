// services/inspections-rollup.js — Rollup semanal del módulo Ronda de
// Inspecciones. Lo dispara el cron de lunes 06:30: procesa los resultados
// de la semana ISO previa y guarda un snapshot en `insp_weekly_rollup`.
// Después, jobInformeMensual lee los 4 rollups del mes y los presenta en
// el informe mensual de Triny.
//
// Ref: docs/SPEC-RONDA-INSPECCIONES.md (Bloque 7 — Integraciones · Triny)
import { query } from '../db/db.js';

// ── helpers de fecha ─────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, '0');
const ymd  = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Semana ISO 8601 → { year, week } (lunes = inicio)
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

// Lunes 00:00 de la fecha pasada
function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

/**
 * Construye y persiste el rollup de UNA semana.
 * @param {Date} refDate - cualquier fecha dentro de la semana objetivo.
 *                          Default = semana pasada (refDate = hoy - 7d).
 * @returns el snapshot persistido.
 */
export async function buildWeeklyRollup(refDate) {
  const ref = refDate || (() => { const x = new Date(); x.setDate(x.getDate() - 7); return x; })();
  const weekStart = mondayOf(ref);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const { year: iso_year, week: iso_week } = isoWeek(ref);
  const startStr = ymd(weekStart), endStr = ymd(weekEnd);

  // ── 1. Totales del módulo en la ventana ─────────────────────────
  const summary = (await query(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='completada')::int  AS completadas,
        COUNT(*) FILTER (WHERE status='en_cofirma')::int  AS rondines_cosign,
        COUNT(*) FILTER (WHERE family='rondin')::int      AS rondines_total,
        COUNT(*) FILTER (WHERE family='rondin'    AND status='completada')::int AS rondines_completados,
        COUNT(*) FILTER (WHERE family='maquinaria')::int  AS maquinaria_total,
        COUNT(*) FILTER (WHERE family='maquinaria' AND status='completada')::int AS maquinaria_completados,
        COUNT(*) FILTER (WHERE (due_date < CURRENT_DATE AND status NOT IN ('completada','anulada'))
                          OR status='vencida')::int        AS vencidas,
        COALESCE(SUM(findings_count), 0)::int             AS hallazgos
       FROM insp_inspections
      WHERE scheduled_date BETWEEN $1 AND $2 AND deleted_at IS NULL`,
    [startStr, endStr])).rows[0];

  // ── 2. Items en falla / críticos en la ventana ──────────────────
  const items = (await query(
    `SELECT
        COUNT(*) FILTER (WHERE r.answer IN ('no','no_cumple'))::int                AS no_cumple,
        COUNT(*) FILTER (WHERE r.answer IN ('no','no_cumple') AND it.is_critical)::int AS criticos
       FROM insp_responses r
       JOIN insp_template_items it ON it.id=r.item_id
       JOIN insp_inspections i ON i.id=r.inspection_id
      WHERE i.scheduled_date BETWEEN $1 AND $2 AND i.deleted_at IS NULL`,
    [startStr, endStr])).rows[0];

  // ── 3. Cobertura máquina-día (cuántos check faltaron) ───────────
  // Para cada máquina activa con daily_checklist=true, hay 7 días en la
  // semana. Los días con check completado / total esperado.
  const cobertura = (await query(
    `WITH dias AS (
        SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS d
      ),
      maq AS (
        SELECT id, code FROM insp_machines WHERE active=true AND daily_checklist=true
      ),
      esperados AS (
        SELECT m.id AS machine_id, m.code, d.d
          FROM maq m CROSS JOIN dias d
      ),
      hechos AS (
        SELECT machine_id, scheduled_date
          FROM insp_inspections
         WHERE family='maquinaria' AND status='completada'
           AND scheduled_date BETWEEN $1 AND $2 AND deleted_at IS NULL
      )
      SELECT
        COUNT(*)::int AS esperado,
        COUNT(h.machine_id)::int AS cumplido,
        COUNT(*) FILTER (WHERE h.machine_id IS NULL)::int AS faltantes
        FROM esperados e
        LEFT JOIN hechos h ON h.machine_id=e.machine_id AND h.scheduled_date=e.d`,
    [startStr, endStr])).rows[0];

  // ── 4. Detalle por máquina (top con hallazgos / faltas) ─────────
  const detalleMaq = (await query(
    `SELECT m.code, m.name,
            COUNT(i.id) FILTER (WHERE i.status='completada')::int AS dias_completos,
            COUNT(i.id) FILTER (WHERE i.findings_count > 0)::int  AS dias_con_hallazgos,
            COALESCE(SUM(i.findings_count), 0)::int               AS hallazgos
       FROM insp_machines m
       LEFT JOIN insp_inspections i
         ON i.machine_id=m.id
        AND i.scheduled_date BETWEEN $1 AND $2
        AND i.deleted_at IS NULL
      WHERE m.active=true
      GROUP BY m.id, m.code, m.name
      ORDER BY hallazgos DESC, m.code`,
    [startStr, endStr])).rows;

  // ── 5. Detalle por plantilla ────────────────────────────────────
  const detalleTpl = (await query(
    `SELECT t.code, t.name, t.family,
            COUNT(i.id)::int AS total,
            COUNT(i.id) FILTER (WHERE i.status='completada')::int AS completadas
       FROM insp_templates t
       LEFT JOIN insp_inspections i
         ON i.template_id=t.id
        AND i.scheduled_date BETWEEN $1 AND $2
        AND i.deleted_at IS NULL
      WHERE t.active=true
      GROUP BY t.id, t.code, t.name, t.family
      ORDER BY t.code`,
    [startStr, endStr])).rows;

  const cumplimiento = summary.total ? Math.round((summary.completadas / summary.total) * 100) : null;

  const detail = {
    cobertura_maquina_dia: cobertura,
    por_maquina:  detalleMaq,
    por_plantilla: detalleTpl,
  };

  // ── 6. UPSERT del snapshot ─────────────────────────────────────
  const { rows } = await query(
    `INSERT INTO insp_weekly_rollup
       (iso_year, iso_week, week_start, week_end,
        total, completadas, vencidas, cumplimiento,
        rondines_total, rondines_completados, rondines_cosign,
        maquinaria_total, maquinaria_completados, maquinaria_dias_faltantes,
        hallazgos, items_no_cumple, items_criticos, detail)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb)
     ON CONFLICT (iso_year, iso_week) DO UPDATE SET
       week_start=EXCLUDED.week_start, week_end=EXCLUDED.week_end,
       total=EXCLUDED.total, completadas=EXCLUDED.completadas,
       vencidas=EXCLUDED.vencidas, cumplimiento=EXCLUDED.cumplimiento,
       rondines_total=EXCLUDED.rondines_total,
       rondines_completados=EXCLUDED.rondines_completados,
       rondines_cosign=EXCLUDED.rondines_cosign,
       maquinaria_total=EXCLUDED.maquinaria_total,
       maquinaria_completados=EXCLUDED.maquinaria_completados,
       maquinaria_dias_faltantes=EXCLUDED.maquinaria_dias_faltantes,
       hallazgos=EXCLUDED.hallazgos,
       items_no_cumple=EXCLUDED.items_no_cumple,
       items_criticos=EXCLUDED.items_criticos,
       detail=EXCLUDED.detail
     RETURNING *`,
    [iso_year, iso_week, startStr, endStr,
     summary.total, summary.completadas, summary.vencidas, cumplimiento,
     summary.rondines_total, summary.rondines_completados, summary.rondines_cosign,
     summary.maquinaria_total, summary.maquinaria_completados, cobertura.faltantes,
     summary.hallazgos, items.no_cumple, items.criticos,
     JSON.stringify(detail)]);

  console.log(
    `[rondas-rollup] ${iso_year}-W${pad2(iso_week)} (${startStr}..${endStr}) — ` +
    `total ${summary.total} · OK ${summary.completadas} · venc ${summary.vencidas} · ` +
    `hallazgos ${summary.hallazgos} · máquina-días faltantes ${cobertura.faltantes}`);

  return rows[0];
}

/**
 * Backfill: construye los rollups de las últimas N semanas (útil al deployar
 * la migración y querer arrancar con histórico).
 */
export async function backfillWeeklyRollups(weeks = 8) {
  const out = [];
  for (let i = weeks; i >= 1; i--) {
    const ref = new Date(); ref.setDate(ref.getDate() - i * 7);
    out.push(await buildWeeklyRollup(ref));
  }
  return out;
}

/**
 * Lee los rollups de las semanas que tocan al mes dado.
 * @param {Date} monthRef - cualquier fecha del mes objetivo.
 *                          Default = mes pasado.
 */
export async function rollupsOfMonth(monthRef) {
  const ref = monthRef || (() => { const x = new Date(); x.setDate(0); return x; })();
  const Y = ref.getFullYear(), M = ref.getMonth();
  const monthStart = `${Y}-${pad2(M + 1)}-01`;
  const monthEnd = new Date(Y, M + 1, 0); // último día del mes
  const monthEndStr = ymd(monthEnd);

  const { rows } = await query(
    `SELECT * FROM insp_weekly_rollup
      WHERE week_end >= $1 AND week_start <= $2
      ORDER BY week_start`,
    [monthStart, monthEndStr]);
  return rows;
}
