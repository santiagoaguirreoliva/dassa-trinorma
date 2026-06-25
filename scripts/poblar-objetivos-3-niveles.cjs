#!/usr/bin/env node
// Carga el rediseño de Trinorma en 3 niveles desde la planilla editada por Dirección
// (scripts/data/objetivos-3-niveles.json, exportada de Plan-Objetivos-Trinorma-2026.xlsx):
//   NIVEL 1: 10 objetivos estratégicos (tier='estrategico') con N KPIs cada uno.
//            Cada KPI = objective_indicator con conector + estado de conexión + flag enabled.
//   NIVEL 2: strategic_projects.   NIVEL 3: investments.
//
// HABILITACIÓN PROGRESIVA: enabled = (estado de conexión 'vivo'). El resto queda definido
//   pero en preparación, para ir activando de a poco.
// PRESERVA LAS 91 MEDICIONES: cuando un KPI tiene origen OBJ-2026-XX / OBJ-2025-XX, se REASIGNA
//   el indicador viejo (UPDATE objective_id) en vez de crear uno nuevo — las mediciones cuelgan
//   del indicator_id (FK ON DELETE CASCADE), así que mover el indicador conserva su historial.
// Los objetivos viejos quedan enabled=false (no aparecen en el tablero nuevo, que filtra tier).
// Idempotente y transaccional. Uso: node scripts/poblar-objetivos-3-niveles.cjs [--dry]
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry');
const TENANT = '00000000-0000-0000-0000-000000000001';
const YEAR = 2026;
const DATA = path.join(__dirname, 'data', 'objetivos-3-niveles.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const oldCodeOf = (origen) => {
  const m = String(origen || '').match(/OBJ-20\d{2}-\d+/);
  return m ? m[0] : null;
};

async function main() {
  const { objetivos, kpis, proyectos, inversiones } = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  // enabled del objetivo = tiene algún KPI 'vivo'
  const vivoByObj = {};
  for (const k of kpis) if (k.estado === 'vivo') vivoByObj[k.objetivo] = true;
  console.log(`📄 ${objetivos.length} obj · ${kpis.length} KPIs · ${proyectos.length} proy · ${inversiones.length} inv`);
  if (DRY) {
    objetivos.forEach(o => console.log(`  ${o.code} ${o.name} enabled=${!!vivoByObj[o.code]}`));
    await pool.end(); return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── NIVEL 1 · Objetivos ──────────────────────────────────────
    const objId = {};
    for (const o of objetivos) {
      const enabled = !!vivoByObj[o.code];
      const { rows } = await client.query(
        `INSERT INTO objectives (code, year, name, description, area, responsible_text, status, tier, enabled, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,'activo','estrategico',$7,$8)
         ON CONFLICT (code) DO UPDATE SET
           name=EXCLUDED.name, description=EXCLUDED.description, area=EXCLUDED.area,
           responsible_text=EXCLUDED.responsible_text, tier='estrategico', enabled=EXCLUDED.enabled, updated_at=NOW()
         RETURNING id`,
        [o.code, YEAR, o.name, o.description, o.area, o.responsable, enabled, TENANT]
      );
      objId[o.code] = rows[0].id;
    }

    // ── NIVEL 1 · KPIs (indicadores) con reasignación que preserva mediciones ──
    let reassigned = 0, inserted = 0, updated = 0;
    const orderByObj = {};
    for (const k of kpis) {
      const oid = objId[k.objetivo];
      if (!oid) throw new Error(`KPI "${k.kpi}" referencia objetivo inexistente ${k.objetivo}`);
      orderByObj[k.objetivo] = (orderByObj[k.objetivo] || 0) + 1;
      const ord = orderByObj[k.objetivo];
      const enabled = k.estado === 'vivo';
      const vals = [k.kpi, k.unidad || null, k.target || null, k.baseline || null,
                    k.frecuencia || 'mensual', k.conector || null, k.estado || 'manual', enabled, ord];

      // ¿ya existe bajo el objetivo nuevo? → UPDATE (idempotencia)
      const ex = await client.query(
        'SELECT id FROM objective_indicators WHERE objective_id=$1 AND indicator_name=$2', [oid, k.kpi]);
      if (ex.rows[0]) {
        await client.query(
          `UPDATE objective_indicators SET unit=$2, target_text=$3, baseline_value=$4, frequency=$5,
             connector_source=$6, connection_status=$7, enabled=$8, kpi_order=$9, is_active=true WHERE id=$1`,
          [ex.rows[0].id, ...vals.slice(1)]);
        updated++;
        continue;
      }
      // ¿tiene origen viejo con indicador? → REASIGNAR (mueve indicador + sus mediciones)
      const oldCode = oldCodeOf(k.origen);
      let oldInd = null;
      if (oldCode) {
        const r = await client.query(
          `SELECT oi.id FROM objective_indicators oi JOIN objectives o ON o.id=oi.objective_id
           WHERE o.code=$1 AND o.tier IS DISTINCT FROM 'estrategico' ORDER BY oi.created_at LIMIT 1`, [oldCode]);
        oldInd = r.rows[0]?.id || null;
      }
      if (oldInd) {
        await client.query(
          `UPDATE objective_indicators SET objective_id=$1, indicator_name=$2, unit=$3, target_text=$4,
             baseline_value=$5, frequency=$6, connector_source=$7, connection_status=$8, enabled=$9,
             kpi_order=$10, is_active=true WHERE id=$11`,
          [oid, ...vals, oldInd]);
        reassigned++;
      } else {
        await client.query(
          `INSERT INTO objective_indicators
             (objective_id, indicator_name, unit, target_text, baseline_value, frequency,
              connector_source, connection_status, enabled, kpi_order, is_active, tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)`,
          [oid, ...vals, TENANT]);
        inserted++;
      }
    }

    // Objetivos viejos (no estratégicos) → enabled=false (fuera del tablero nuevo)
    await client.query(`UPDATE objectives SET enabled=false WHERE tier IS DISTINCT FROM 'estrategico'`);

    // ── NIVEL 2 · Proyectos estratégicos (idempotente por code) ──
    await client.query("DELETE FROM strategic_projects WHERE code LIKE 'PRY-%'");
    for (const p of proyectos) {
      await client.query(
        `INSERT INTO strategic_projects (code, name, area, objective_codes, status, progress_pct, responsible, notes, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [p.code, p.name, p.area, p.objetivos || null, p.estado || 'Planificado',
         (typeof p.avance === 'number' ? p.avance : null), p.responsable || null, p.notas || null, TENANT]);
    }

    // ── NIVEL 3 · Inversiones (idempotente: reemplaza el set) ──
    await client.query('DELETE FROM investments');
    for (const i of inversiones) {
      await client.query(
        `INSERT INTO investments (project, area, priority, amount_usd, amount_label, status, planned_date, real_date, roi_expected, notes, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [i.project, i.area, i.priority, i.amount_usd, i.amount_label, i.estado,
         i.fecha_prevista, i.fecha_real, i.roi, i.notas, TENANT]);
    }

    await client.query('COMMIT');
    console.log(`\n✅ COMMIT`);
    console.log(`   KPIs: ${reassigned} reasignados (con mediciones) · ${inserted} nuevos · ${updated} actualizados`);
    const en = (await client.query("SELECT count(*) FROM objectives WHERE tier='estrategico' AND enabled")).rows[0].count;
    const kEn = (await client.query("SELECT count(*) FROM objective_indicators WHERE enabled")).rows[0].count;
    console.log(`   Habilitados: ${en} objetivos · ${kEn} KPIs (el resto en preparación)`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
