// KPIs de Objetivos con conector vivo al espejo depofis_mirror — cálculo mensual.
// Recalcula los 2 últimos meses CERRADOS (capta datos cargados tarde) y upsertea
// en objective_measurements. Sin IA, sin mails: script determinístico.
//
// 1. Tiempo de desconsolidación (OBJ-03): prom. horas entre arribo del camión IMPO
//    (balanza_pesada.entrada) y tally marítimo (tally.fecha_add+hora_add), join
//    por contenedor con ventana de 45 días.
// 2. Forzoso en término (OBJ-03): % de traslados IMPO (cordicar) con
//    fechaarrib - fecha_buq <= 10 días corridos. Solo carga meses con muestra
//    confiable (>= 50 ctns con fecha_buq): Depofis no siempre la carga.
// 3. Nuevos clientes (OBJ-01): 1ª aparición histórica del nombre en el campo
//    CLIENTE DE CARGA de una operación IMPO/EXPO (ingresadas_en_stock.cliente
//    = stock.importador, lookback 2023). OJO: la columna `agencia` del espejo
//    es el Consignatario/Fw, NO el cliente de carga.
const { Pool } = require('pg');

const IND = {
  desconsolidacion: 'dd0698ac-1eb2-484e-a2ea-3334318591d1',
  forzoso: '76cf9609-b54c-47d1-88ea-c13c79e3d4e7',
  nuevos_clientes: '7ef98cbb-8f59-4d91-989b-b58789b8556e',
};
const MIN_CASOS_FORZOSO = 50;

const SQL_DESCONSOLIDACION = `
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
       round(avg(EXTRACT(epoch FROM ts_tally - ts_arribo)/3600)::numeric,1) valor
FROM pair
WHERE ts_tally >= $1::date AND ts_tally < $2::date
GROUP BY 1 ORDER BY 1`;

const SQL_FORZOSO = `
SELECT to_char(fecha,'YYYY-MM') mes,
       count(*) FILTER (WHERE fecha_buq > '2000-01-01' AND fechaarrib > '2000-01-01'
                          AND fechaarrib >= fecha_buq)::int casos,
       round(100.0*count(*) FILTER (WHERE fecha_buq > '2000-01-01' AND fechaarrib > '2000-01-01'
             AND fechaarrib - fecha_buq <= 10 AND fechaarrib >= fecha_buq)
        / NULLIF(count(*) FILTER (WHERE fecha_buq > '2000-01-01' AND fechaarrib > '2000-01-01'
                                    AND fechaarrib >= fecha_buq),0),1) valor
FROM depofis_mirror.cordicar
WHERE tipo_oper ILIKE '%IMPO%' AND COALESCE(us_del,'')=''
  AND fecha >= $1::date AND fecha < $2::date
GROUP BY 1 ORDER BY 1`;

// la 1ª aparición se calcula sobre TODO el histórico; la ventana solo filtra el resultado
const SQL_NUEVOS_CLIENTES_CARGA = `
WITH primera AS (
  SELECT upper(btrim(cliente)) cl, min(fecha_ing) f1
  FROM depofis_mirror.ingresadas_en_stock
  WHERE tipo_oper IN ('IMPORTACION','EXPORTACION')
    AND cliente IS NOT NULL AND btrim(cliente) NOT IN ('','0')
  GROUP BY 1
)
SELECT to_char(f1,'YYYY-MM') mes, count(*)::int casos, count(*)::numeric valor
FROM primera
WHERE f1 >= $1::date AND f1 < $2::date
GROUP BY 1 ORDER BY 1`;

async function runKpisObjetivos() {
  if (!process.env.MIRROR_PG_DSN) throw new Error('Falta MIRROR_PG_DSN en .env');
  const mirror = new Pool({ connectionString: process.env.MIRROR_PG_DSN, max: 1 });
  const sgi = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    // ventana: 2 últimos meses cerrados (el mes corriente no se carga)
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const hasta = new Date(now.getFullYear(), now.getMonth(), 1);
    const iso = (d) => d.toISOString().slice(0, 10);
    const params = [iso(desde), iso(hasta)];

    const upsert = (indicatorId, mes, valor, nota) => sgi.query(
      `INSERT INTO objective_measurements (indicator_id, period, value, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (indicator_id, period) DO UPDATE
         SET value = EXCLUDED.value, notes = EXCLUDED.notes`,
      [indicatorId, `${mes}-25`, valor, nota]
    );

    let cargadas = 0;
    for (const r of (await mirror.query(SQL_DESCONSOLIDACION, params)).rows) {
      await upsert(IND.desconsolidacion, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · prom. h balanza→tally (${r.casos} ctns) · auto`);
      console.log(`[kpi-obj] desconsolidación ${r.mes}: ${r.valor} h (${r.casos} ctns)`);
      cargadas++;
    }
    for (const r of (await mirror.query(SQL_FORZOSO, params)).rows) {
      if (r.casos < MIN_CASOS_FORZOSO || r.valor === null) {
        console.log(`[kpi-obj] forzoso ${r.mes}: SKIP, muestra chica (${r.casos} ctns con fecha_buq)`);
        continue;
      }
      await upsert(IND.forzoso, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · cordicar ≤10 días (${r.casos} ctns c/dato) · auto`);
      console.log(`[kpi-obj] forzoso ${r.mes}: ${r.valor}% (${r.casos} ctns)`);
      cargadas++;
    }
    for (const r of (await mirror.query(SQL_NUEVOS_CLIENTES_CARGA, params)).rows) {
      await upsert(IND.nuevos_clientes, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · 1ª op como CLIENTE DE CARGA · auto`);
      console.log(`[kpi-obj] nuevos clientes de carga ${r.mes}: ${r.valor}`);
      cargadas++;
    }
    if (!cargadas) console.log('[kpi-obj] sin datos en la ventana, nada que cargar');
    return { ok: true, mediciones: cargadas };
  } finally {
    await mirror.end();
    await sgi.end();
  }
}

module.exports = { runKpisObjetivos };
