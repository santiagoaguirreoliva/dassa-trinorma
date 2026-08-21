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
//    AGENCIA = el cliente comercial (ingresadas_en_stock.agencia =
//    stock.transporte, lookback 2023). Caso canónico OI 43855: Agencia=ABIMEX
//    (cliente) / Consignatario=RUEDA OESTE (dueño de la carga, columna
//    cliente, NO cuenta). Definición final de Santi 05/08.
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
const SQL_NUEVAS_AGENCIAS = `
WITH primera AS (
  SELECT upper(btrim(agencia)) ag, min(fecha_ing) f1
  FROM depofis_mirror.ingresadas_en_stock
  WHERE tipo_oper IN ('IMPORTACION','EXPORTACION')
    AND agencia IS NOT NULL AND btrim(agencia) NOT IN ('','0')
  GROUP BY 1
)
SELECT to_char(f1,'YYYY-MM') mes, count(*)::int casos, count(*)::numeric valor
FROM primera
WHERE f1 >= $1::date AND f1 < $2::date
GROUP BY 1 ORDER BY 1`;

// 4. Operaciones IMPO/EXPO por mes y mix (OBJ-2026-02/03/04): contenedores de
//    cordicar por sentido. Es la misma fuente con la que se mide el forzoso, así
//    que los dos KPIs cuentan lo mismo. Se recarga TODO el año en curso para que
//    la vista anual y el acumulado no dependan de que el cron corriera cada mes.
const SQL_OPERACIONES = `
SELECT to_char(fecha,'YYYY-MM') mes,
       count(*) FILTER (WHERE tipo_oper ILIKE '%IMPO%')::int impo,
       count(*) FILTER (WHERE tipo_oper ILIKE '%EXPO%')::int expo
FROM depofis_mirror.cordicar
WHERE COALESCE(us_del,'')='' AND fecha >= $1::date AND fecha < $2::date
GROUP BY 1 ORDER BY 1`;

// Los indicadores del F-TRI-04 se resuelven por código de objetivo, no por UUID:
// si se recarga la planilla los ids cambian y el cron no debe romperse por eso.
async function idsPorCodigo(sgi, codigos) {
  const { rows } = await sgi.query(
    `SELECT o.code, i.id FROM objective_indicators i
       JOIN objectives o ON o.id = i.objective_id
      WHERE o.code = ANY($1) AND i.enabled AND o.deleted_at IS NULL
      ORDER BY i.kpi_order`, [codigos]);
  return Object.fromEntries(rows.map(r => [r.code, r.id]));
}

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
    for (const r of (await mirror.query(SQL_NUEVAS_AGENCIAS, params)).rows) {
      await upsert(IND.nuevos_clientes, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · 1ª op como AGENCIA (cliente comercial) · auto`);
      console.log(`[kpi-obj] nuevas agencias ${r.mes}: ${r.valor}`);
      cargadas++;
    }
    // Operaciones IMPO/EXPO: año completo en curso (incluye el mes corriente, parcial)
    const ops = await idsPorCodigo(sgi, ['OBJ-2026-02', 'OBJ-2026-03', 'OBJ-2026-04']);
    if (ops['OBJ-2026-02'] || ops['OBJ-2026-03']) {
      const anio = now.getFullYear();
      const finVentana = new Date(anio, now.getMonth() + 1, 1);
      const mesActual = `${anio}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const filas = (await mirror.query(SQL_OPERACIONES, [`${anio}-01-01`, iso(finVentana)])).rows;
      for (const r of filas) {
        const parcial = r.mes === mesActual ? ' · mes en curso, parcial' : '';
        const nota = (t) => `real ${anio} · ${t} desde cordicar${parcial} · auto`;
        if (ops['OBJ-2026-02']) await upsert(ops['OBJ-2026-02'], r.mes, r.impo, nota('CNTs IMPO'));
        if (ops['OBJ-2026-03']) await upsert(ops['OBJ-2026-03'], r.mes, r.expo, nota('CNTs EXPO'));
        const total = r.impo + r.expo;
        if (ops['OBJ-2026-04'] && total > 0) {
          await upsert(ops['OBJ-2026-04'], r.mes, Math.round(1000 * r.impo / total) / 10, nota('mix IMPO'));
        }
        console.log(`[kpi-obj] operaciones ${r.mes}: IMPO ${r.impo} · EXPO ${r.expo}`);
        cargadas += 2;
      }
    }

    if (!cargadas) console.log('[kpi-obj] sin datos en la ventana, nada que cargar');
    return { ok: true, mediciones: cargadas };
  } finally {
    await mirror.end();
    await sgi.end();
  }
}

module.exports = { runKpisObjetivos };
