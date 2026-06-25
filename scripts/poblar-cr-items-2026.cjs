#!/usr/bin/env node
// Puebla change_request_items con el checklist accionable por proyecto de mejora 2026.
// Cada item hereda responsable y plazo del change_request padre. Las acciones están
// ancladas en el propósito + KPI de cada CC-2026-XX (ver docs/PLAN-MEJORA-2026.md).
// Fuente de datos: scripts/data/cr-items-2026.json
// Idempotente: por cada CR borra sus items y reinserta. Transaccional.
// Uso: node scripts/poblar-cr-items-2026.cjs [--dry]
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry');
const TENANT = '00000000-0000-0000-0000-000000000001';
const DATA = path.join(__dirname, 'data', 'cr-items-2026.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const items = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const codes = Object.keys(items);
  const total = codes.reduce((n, c) => n + items[c].length, 0);
  console.log(`📄 ${codes.length} proyectos · ${total} items en el JSON`);
  if (codes.length !== 26) throw new Error(`Esperaba 26 proyectos, hay ${codes.length}`);

  const { rows } = await pool.query("SELECT id, code FROM change_requests WHERE year = 2026");
  const crByCode = Object.fromEntries(rows.map((r) => [r.code, r.id]));
  const missing = codes.filter((c) => !crByCode[c]);
  if (missing.length) throw new Error(`change_requests inexistentes: ${missing.join(', ')} (¿corriste poblar-plan-mejora-2026.cjs?)`);
  // valida forma
  for (const c of codes) for (const it of items[c]) {
    if (!it.action || !it.verification) throw new Error(`${c}: item sin action/verification`);
  }
  console.log('✅ Validado: 26 CR existen, todos los items tienen action + verification');

  if (DRY) {
    codes.forEach((c) => console.log(`  ${c}: ${items[c].length} items`));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const code of codes) {
      const crId = crByCode[code];
      await client.query('DELETE FROM change_request_items WHERE change_request_id = $1', [crId]);
      let n = 1;
      for (const it of items[code]) {
        await client.query(
          `INSERT INTO change_request_items
             (change_request_id, item_number, action, verification, responsible_id, plazo, status, tenant_id)
           VALUES ($1,$2,$3,$4,
                   (SELECT responsible_id FROM change_requests WHERE id = $1),
                   (SELECT plazo_target  FROM change_requests WHERE id = $1),
                   'pendiente',$5)`,
          [crId, n++, it.action, it.verification, TENANT]
        );
      }
    }
    await client.query('COMMIT');
    const cnt = (await client.query('SELECT count(*) FROM change_request_items')).rows[0].count;
    console.log(`\n✅ COMMIT · change_request_items=${cnt}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
