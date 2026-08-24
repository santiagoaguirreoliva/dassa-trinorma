// KPIs de Objetivos con conector vivo al espejo depofis_mirror — cálculo mensual.
// Recalcula los 2 últimos meses CERRADOS (capta datos cargados tarde) y upsertea
// en objective_measurements. Sin IA, sin mails: script determinístico.
//
// 1. Desconsolidación TD (OBJ-2026-06): % de contenedores IMPO coordinados como
//    TD (cordicar.operacion='TD'): horas promedio entre el ingreso del camión a
//    balanza y el alta en stock de la mercadería, con marca en 72 h. Definición de Santi 2026-08-24
//    para la auditoría BV: el hito es el alta en stock del subrenglón, no el
//    cierre del tally (van casi juntos, pero el stock es cuándo la mercadería
//    quedó realmente disponible).
// 2. Forzoso en término (OBJ-2026-05): % de traslados IMPO (cordicar) con
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
WITH td AS (   -- universo: contenedores IMPO coordinados como TD (baja a piso)
  SELECT DISTINCT replace(upper(btrim(contenedor)),' ','') ctn
    FROM depofis_mirror.cordicar
   WHERE tipo_oper ILIKE '%IMPO%' AND btrim(coalesce(operacion,''))='TD'
     AND coalesce(btrim(us_del),'')='' AND btrim(coalesce(contenedor,''))<>''
     AND fecha >= $1::date - 45 AND fecha < $2::date
), bal AS (    -- t0: entrada a balanza. Agrupa por repesada: son el mismo camión.
  SELECT replace(upper(btrim(contenedor)),' ','') ctn, min(entrada) t0
    FROM depofis_mirror.balanza_pesada
   WHERE tipo_oper ILIKE '%IMPO%' AND coalesce(btrim(us_del),'')=''
     AND entrada > '1990-01-01' AND btrim(coalesce(contenedor,''))<>''
     AND fecha >= $1::date - 45 AND fecha < $2::date
   GROUP BY 1, coalesce(repesada,0)
), oi AS (     -- contenedor → orden_ing. suborden 0 es el encabezado de la
               -- operación (se crea al entrar el camión), no es mercadería.
  SELECT DISTINCT replace(upper(btrim(contenedor)),' ','') ctn, orden_ing
    FROM depofis_mirror.ingresadas_en_stock
   WHERE tipo_oper='IMPORTACION' AND suborden > 0
     AND fecha_ing >= $1::date - 60
), stk AS (    -- t1: alta en stock del ÚLTIMO subrenglón — el desco terminó
               -- cuando entró toda la mercadería del contenedor.
  SELECT orden_ing, max(fecha_add + coalesce(nullif(btrim(hora_add),'')::time,'12:00')) t1
    FROM depofis_mirror.stock
   WHERE suborden > 0 AND fecha_add > '1990-01-01'
   GROUP BY 1
), par AS (
  SELECT DISTINCT ON (b.ctn,b.t0) b.ctn, b.t0,
         EXTRACT(epoch FROM s.t1 - b.t0)/3600 AS horas
    FROM bal b JOIN td ON td.ctn = b.ctn JOIN oi ON oi.ctn = b.ctn
    JOIN stk s ON s.orden_ing = oi.orden_ing
             AND s.t1 > b.t0 AND s.t1 <= b.t0 + interval '45 days'
   ORDER BY b.ctn, b.t0, s.t1
)
SELECT to_char(t0,'YYYY-MM') mes, count(*)::int casos,
       round(avg(horas)::numeric,1) valor,                      -- la marca es 72 h promedio
       count(*) FILTER (WHERE horas <= 72)::int en_termino,
       round(100.0*count(*) FILTER (WHERE horas <= 72)/count(*),1) pct_72,
       round((percentile_cont(0.5) WITHIN GROUP (ORDER BY horas))::numeric,1) mediana_hs
  FROM par WHERE t0 >= $1::date AND t0 < $2::date
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
         SET value = EXCLUDED.value, notes = EXCLUDED.notes
       -- Sólo pisa lo que escribió el propio cron. Una medición cargada a mano
       -- (F-TRI-04 con el listado de coordinación) es el dato nuevo, no el viejo.
       WHERE COALESCE(objective_measurements.notes,'') LIKE '%auto'`,
      [indicatorId, `${mes}-25`, valor, nota]
    );

    let cargadas = 0;
    const ops = await idsPorCodigo(sgi, ['OBJ-2026-02', 'OBJ-2026-03', 'OBJ-2026-04', 'OBJ-2026-05', 'OBJ-2026-06']);
    for (const r of (await mirror.query(SQL_DESCONSOLIDACION, params)).rows) {
      const dest = ops['OBJ-2026-06'] || IND.desconsolidacion;
      await upsert(dest, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · ${r.casos} CNTs TD · mediana ${r.mediana_hs} h · `
        + `${r.en_termino} de ${r.casos} dentro de 72 h (${r.pct_72}%) · balanza→alta en stock · auto`);
      console.log(`[kpi-obj] desconsolidación TD ${r.mes}: ${r.valor} h prom (${r.casos} ctns, ${r.pct_72}% ≤72h)`);
      cargadas++;
    }
    for (const r of (await mirror.query(SQL_FORZOSO, params)).rows) {
      if (r.casos < MIN_CASOS_FORZOSO || r.valor === null) {
        console.log(`[kpi-obj] forzoso ${r.mes}: SKIP, muestra chica (${r.casos} ctns con fecha_buq)`);
        continue;
      }
      await upsert(ops['OBJ-2026-05'] || IND.forzoso, r.mes, r.valor,
        `real ${r.mes.slice(0, 4)} · ${Math.round(r.casos * r.valor / 100)}/${r.casos} ctns `
        + `≤10 días desde fecha de buque · auto`);
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
    if (ops['OBJ-2026-02'] || ops['OBJ-2026-03']) {
      const anio = now.getFullYear();
      const finVentana = new Date(anio, now.getMonth() + 1, 1);
      const mesActual = `${anio}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const filas = (await mirror.query(SQL_OPERACIONES, [`${anio}-01-01`, iso(finVentana)])).rows;
      for (const r of filas) {
        // El mes en curso no se carga: la serie del F-TRI-04 muestra meses
        // cerrados, y un parcial mezclado con el listado de coordinación
        // (que es la fuente declarada del indicador) no es comparable.
        if (r.mes === mesActual) continue;
        const nota = (t) => `real ${anio} · ${t} desde cordicar · auto`;
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
