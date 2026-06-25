#!/usr/bin/env node
// Reemplaza los ítems del FODA del ciclo 2025-2026 (context_analysis) por el set
// curado por la Dirección (scripts/data/foda-2026.json): 9 F · 9 O · 9 D · 8 A = 35.
// El FODA anterior NO se borra: se desactiva (is_active=false) y queda como historial.
// Los 35 nuevos quedan is_active=true, validation_status='pendiente' (a validar con NIXA).
// NO corre si el ciclo está homologado (congelado). Idempotente y transaccional.
// Uso: node scripts/poblar-foda-2026.cjs [--dry]
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry');
const TENANT = '00000000-0000-0000-0000-000000000001';
const CICLO = '2025-2026';
const SENTINEL = 'FODA curado por Dirección — 2026-06-25 (pendiente de validación NIXA)';
const DATA = path.join(__dirname, 'data', 'foda-2026.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TYPES = ['fortaleza', 'oportunidad', 'debilidad', 'amenaza'];

async function main() {
  const raw = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const items = [];
  for (const t of TYPES) {
    (raw[t] || []).forEach((it, i) => {
      if (!it.category || !it.description) throw new Error(`${t}[${i}] sin category/description`);
      items.push({ foda_type: t, order_index: i + 1, ...it });
    });
  }
  const byType = TYPES.map((t) => `${items.filter((x) => x.foda_type === t).length} ${t[0].toUpperCase()}`).join(' · ');
  console.log(`📄 ${items.length} ítems (${byType})`);
  if (items.length !== 35) throw new Error(`Esperaba 35 ítems, hay ${items.length}`);

  // Guard: no tocar un ciclo homologado
  const hom = await pool.query('SELECT estado FROM foda_homologacion WHERE ciclo = $1', [CICLO]);
  if (hom.rows[0] && hom.rows[0].estado !== 'borrador') {
    throw new Error(`Ciclo ${CICLO} está '${hom.rows[0].estado}' (no borrador): congelado, no se reemplaza`);
  }

  // created_by = Santiago (director)
  const su = await pool.query("SELECT id FROM users WHERE email = 'santiago@dassa.com.ar'");
  const createdBy = su.rows[0] ? su.rows[0].id : null;

  if (DRY) {
    items.forEach((it) => console.log(`  [${it.foda_type[0].toUpperCase()}#${it.order_index}] ${it.category}: ${it.description.slice(0, 60)}`));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1) Desactivar el FODA activo previo que NO sea de este seed (preserva historial)
    const deact = await client.query(
      `UPDATE context_analysis SET is_active = false, updated_at = NOW()
       WHERE ciclo = $1 AND is_active = true AND validation_note IS DISTINCT FROM $2`,
      [CICLO, SENTINEL]
    );
    // 2) Borrar corridas previas de este mismo seed (idempotencia)
    await client.query('DELETE FROM context_analysis WHERE ciclo = $1 AND validation_note = $2', [CICLO, SENTINEL]);
    // 3) Insertar los 35 nuevos
    for (const it of items) {
      await client.query(
        `INSERT INTO context_analysis
           (foda_type, category, description, vinculo, order_index, is_active, validation_status, validation_note, ciclo, created_by, tenant_id)
         VALUES ($1,$2,$3,$4,$5,true,'pendiente',$6,$7,$8,$9)`,
        [it.foda_type, it.category, it.description, it.vinculo || null, it.order_index, SENTINEL, CICLO, createdBy, TENANT]
      );
    }
    await client.query('COMMIT');
    const act = (await client.query("SELECT count(*) FROM context_analysis WHERE ciclo=$1 AND is_active=true", [CICLO])).rows[0].count;
    console.log(`\n✅ COMMIT · desactivados ${deact.rowCount} previos · FODA activo ciclo ${CICLO} = ${act}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
