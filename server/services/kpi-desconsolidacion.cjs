// KPI "Tiempo de desconsolidación" (OBJ-03) — cálculo automático mensual.
// Promedio de horas entre el arribo del camión IMPO (balanza_pesada.entrada)
// y el tally marítimo (tally.fecha_add + hora_add), join por contenedor con
// ventana de 45 días, sobre el espejo depofis_mirror (Supabase).
// Recalcula los 2 últimos meses CERRADOS (capta tallys cargados tarde) y
// upsertea en objective_measurements. Sin IA, sin mails: script determinístico.
const { Pool } = require('pg');

const INDICATOR_ID = 'dd0698ac-1eb2-484e-a2ea-3334318591d1'; // OBJ-03 · Tiempo de desconsolidación

const CALC_SQL = `
WITH tly AS (
  SELECT btrim(contenedor) ctn, min(fecha) f_tally,
         min(fecha_add + COALESCE(NULLIF(btrim(hora_add),'')::time,'12:00')) ts_tally
  FROM depofis_mirror.tally
  WHERE fecha >= $1::date - interval '45 days' AND fecha < $2::date
    AND COALESCE(us_del,'')='' AND btrim(COALESCE(contenedor,'')) <> ''
  GROUP BY 1
), bal AS (
  SELECT btrim(contenedor) ctn, COALESCE(entrada, fecha) ts_arribo
  FROM depofis_mirror.balanza_pesada
  WHERE tipo_oper ILIKE '%IMPO%' AND btrim(COALESCE(contenedor,'')) <> ''
    AND COALESCE(us_del,'') = '' AND fecha >= $1::date - interval '90 days'
), pair AS (
  SELECT DISTINCT ON (t.ctn, t.f_tally) t.ts_tally, b.ts_arribo
  FROM tly t JOIN bal b ON b.ctn = t.ctn
   AND b.ts_arribo <= t.ts_tally AND b.ts_arribo >= t.ts_tally - interval '45 days'
  ORDER BY t.ctn, t.f_tally, b.ts_arribo DESC
)
SELECT to_char(ts_tally,'YYYY-MM') mes, count(*)::int casos,
       round(avg(EXTRACT(epoch FROM ts_tally - ts_arribo)/3600)::numeric,1) prom_h
FROM pair
WHERE ts_tally >= $1::date AND ts_tally < $2::date
GROUP BY 1 ORDER BY 1`;

async function runKpiDesconsolidacion() {
  if (!process.env.MIRROR_PG_DSN) throw new Error('Falta MIRROR_PG_DSN en .env');
  const mirror = new Pool({ connectionString: process.env.MIRROR_PG_DSN, max: 1 });
  const sgi = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    // ventana: 2 últimos meses cerrados (el mes corriente no se carga)
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const hasta = new Date(now.getFullYear(), now.getMonth(), 1);
    const iso = (d) => d.toISOString().slice(0, 10);

    const { rows } = await mirror.query(CALC_SQL, [iso(desde), iso(hasta)]);
    for (const r of rows) {
      const period = `${r.mes}-25`; // convención de la serie existente
      await sgi.query(
        `INSERT INTO objective_measurements (indicator_id, period, value, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (indicator_id, period) DO UPDATE
           SET value = EXCLUDED.value, notes = EXCLUDED.notes`,
        [INDICATOR_ID, period, r.prom_h,
         `real ${r.mes.slice(0, 4)} · prom. h balanza→tally (${r.casos} ctns) · auto`]
      );
      console.log(`[kpi-desco] ${r.mes}: ${r.prom_h} h (${r.casos} ctns)`);
    }
    if (!rows.length) console.log('[kpi-desco] sin tallys en la ventana, nada que cargar');
    return { ok: true, meses: rows.length };
  } finally {
    await mirror.end();
    await sgi.end();
  }
}

module.exports = { runKpiDesconsolidacion };
