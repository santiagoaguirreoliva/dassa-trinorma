// Criterios de actuación ante incumplimiento de meta mensual de KPIs (ISO 9001 6.2 / 9.1).
// Corre el día 1 (tras kpi_objetivos) sobre el último mes CERRADO con medición de cada
// KPI vivo/habilitado con meta. Determinístico, sin IA.
//
// Escalera (streak = meses consecutivos bajo nivel aceptable):
//   1 mes  → AVISO por mail al responsable del área.
//   2 meses → ALERTA formal: se requiere plan de acción al responsable.
//   3+ meses → NC AUTOMÁTICA en Hallazgos/NCs (una sola por KPI mientras siga abierta).
// Nivel aceptable = objective_indicators.admissible_value, o 90% de la meta (dirección
// 'mayor') / 110% (dirección 'menor') si no está definido.
// Todo incumplimiento queda registrado en kpi_breach_log (evidencia auditable);
// la unicidad (indicator_id, period) hace el job idempotente y evita mails duplicados.
const { Pool } = require('pg');
const { sendMail, layout } = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ALERT_TO = process.env.KPI_ALERT_TO || 'santiago@dassa.com.ar';
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';

const LADDER = {
  1: { action: 'aviso', label: 'AVISO' },
  2: { action: 'alerta_plan_accion', label: 'ALERTA · se requiere plan de acción' },
  3: { action: 'nc_automatica', label: 'NC AUTOMÁTICA' },
};

function admissibleOf(ind) {
  if (ind.admissible_value != null) return Number(ind.admissible_value);
  const t = Number(ind.target_value);
  return ind.direction === 'menor' ? t * 1.1 : t * 0.9;
}
const breaches = (ind, value, adm) =>
  ind.direction === 'menor' ? Number(value) > adm : Number(value) < adm;

const fmtMes = (d) => new Date(d).toISOString().slice(0, 7);

async function run({ dryRun = false } = {}) {
  const { rows: inds } = await pool.query(`
    SELECT oi.id, oi.indicator_name, oi.target_value, oi.admissible_value, oi.direction,
           oi.unit, o.code AS obj_code, o.name AS obj_name, o.area, o.responsible_text
    FROM objective_indicators oi
    JOIN objectives o ON o.id = oi.objective_id
    WHERE oi.is_active AND oi.enabled AND o.enabled
      AND oi.connection_status = 'vivo' AND oi.frequency = 'mensual'
      AND oi.target_value IS NOT NULL
    ORDER BY o.code, oi.kpi_order`);

  const results = [];
  for (const ind of inds) {
    // serie mensual descendente desde el último mes CERRADO con medición
    const { rows: serie } = await pool.query(`
      SELECT date_trunc('month', period)::date AS mes, avg(value) AS value
      FROM objective_measurements
      WHERE indicator_id = $1 AND period < date_trunc('month', now())
      GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, [ind.id]);
    if (!serie.length) continue;

    const adm = admissibleOf(ind);
    const evalMes = serie[0];
    if (!breaches(ind, evalMes.value, adm)) {
      results.push({ kpi: ind.indicator_name, mes: fmtMes(evalMes.mes), value: Number(evalMes.value), status: 'cumple' });
      continue;
    }
    // racha de meses consecutivos incumplidos (un hueco de medición la corta)
    let streak = 0;
    let expect = new Date(evalMes.mes);
    for (const m of serie) {
      const md = new Date(m.mes);
      if (md.getTime() !== expect.getTime() || !breaches(ind, m.value, adm)) break;
      streak++;
      expect = new Date(Date.UTC(md.getUTCFullYear(), md.getUTCMonth() - 1, 1));
    }

    const step = LADDER[Math.min(streak, 3)];
    const res = {
      kpi: ind.indicator_name, obj: ind.obj_code, area: ind.area, responsable: ind.responsible_text,
      mes: fmtMes(evalMes.mes), value: Number(evalMes.value), target: Number(ind.target_value),
      admissible: adm, streak, action: step.action, dryRun,
    };
    results.push(res);
    if (dryRun) continue;

    // idempotencia: un solo disparo por (KPI, mes)
    const dup = await pool.query(
      'SELECT 1 FROM kpi_breach_log WHERE indicator_id=$1 AND period=$2', [ind.id, evalMes.mes]);
    if (dup.rowCount) { res.skipped = 'ya_registrado'; continue; }

    let findingId = null;
    let action = step.action;
    if (step.action === 'nc_automatica') {
      // una sola NC automática viva por KPI
      const open = await pool.query(`
        SELECT f.id FROM kpi_breach_log b JOIN findings f ON f.id = b.finding_id
        WHERE b.indicator_id = $1 AND f.status <> 'cerrado' AND f.deleted_at IS NULL
        LIMIT 1`, [ind.id]);
      if (open.rowCount) {
        action = 'nc_ya_abierta';
        findingId = open.rows[0].id;
      } else {
        const desc = [
          `NC generada automáticamente por el seguimiento de objetivos (ISO 9001 6.2 / 9.1).`,
          `KPI "${ind.indicator_name}" (${ind.obj_code} · ${ind.obj_name}) lleva ${streak} meses consecutivos por ${ind.direction === 'menor' ? 'encima' : 'debajo'} del nivel aceptable.`,
          `Último mes ${fmtMes(evalMes.mes)}: ${Number(evalMes.value)} ${ind.unit || ''} · meta mensual ${ind.target_value} · nivel aceptable ${adm.toFixed(1)}.`,
          `Serie reciente: ${serie.slice(0, streak).reverse().map(m => `${fmtMes(m.mes)}=${Number(m.value)}`).join(' · ')}.`,
          `Se requiere al responsable del área (${ind.responsible_text || ind.area}) análisis de causa y plan de acción.`,
        ].join('\n');
        const ins = await pool.query(`
          INSERT INTO findings (title, description, finding_type, origin, area, due_date)
          VALUES ($1, $2, 'nc_real', 'desvio_operativo', $3, current_date + 30)
          RETURNING id, code`, [
          `KPI "${ind.indicator_name}" bajo nivel aceptable ${streak} meses consecutivos`,
          desc, ind.area || ind.obj_code,
        ]);
        findingId = ins.rows[0].id;
        res.finding_code = ins.rows[0].code;
      }
    }

    const mailed = [ALERT_TO];
    await sendMail({
      to: ALERT_TO,
      subject: `[Objetivos] ${step.label} · ${ind.indicator_name} (${ind.obj_code}) · ${fmtMes(evalMes.mes)}`,
      html: layout({
        title: `${step.label} — KPI "${ind.indicator_name}"`,
        body: `
          <p><strong>${ind.obj_code} · ${ind.obj_name}</strong> — área ${ind.area || '—'} · responsable: ${ind.responsible_text || '—'}</p>
          <p>El KPI <strong>${ind.indicator_name}</strong> lleva <strong>${streak} mes(es) consecutivo(s)</strong>
          por ${ind.direction === 'menor' ? 'encima' : 'debajo'} del nivel aceptable.</p>
          <ul>
            <li>Mes evaluado: <strong>${fmtMes(evalMes.mes)}</strong> → valor <strong>${Number(evalMes.value)}</strong> ${ind.unit || ''}</li>
            <li>Meta mensual: ${ind.target_value} · Nivel aceptable: ${adm.toFixed(1)}</li>
          </ul>
          <p>${streak >= 3
            ? (action === 'nc_automatica'
              ? `Se generó la <strong>NC ${res.finding_code}</strong> con requerimiento de análisis de causa y plan de acción al responsable del área.`
              : 'Ya existe una NC abierta por este KPI; el incumplimiento quedó registrado en su seguimiento.')
            : streak === 2
              ? 'Criterio: al segundo mes consecutivo se <strong>requiere plan de acción</strong> del responsable del área. Al tercer mes se genera NC automática.'
              : 'Criterio: primer mes bajo nivel aceptable. Si se repite el próximo mes, se requerirá plan de acción; al tercero se genera NC automática.'}</p>`,
        ctaUrl: `${APP_URL}/objetivos`,
        ctaLabel: 'Ver tablero de objetivos',
      }),
    });

    await pool.query(`
      INSERT INTO kpi_breach_log (indicator_id, period, value, target, admissible, streak, action, finding_id, mailed_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
      ind.id, evalMes.mes, evalMes.value, ind.target_value, adm, streak, action, findingId, mailed,
    ]);
    res.action = action;
  }
  return { evaluated: inds.length, results };
}

module.exports = { run };
