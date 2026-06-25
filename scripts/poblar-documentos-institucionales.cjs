#!/usr/bin/env node
// Carga en strategic_documents los documentos institucionales de marca DASSA:
// Misión, Visión, Valores y Política de Gestión Integrada (PDF oficial).
// Sirven a ISO 5.2 (política) y 7.3 (concientización); se exponen on-brand en Mi Perfil.
// Fuente: scripts/data/documentos-institucionales.json. Idempotente (ON CONFLICT code).
// Uso: node scripts/poblar-documentos-institucionales.cjs [--dry]
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DRY = process.argv.includes('--dry');
const DATA = path.join(__dirname, 'data', 'documentos-institucionales.json');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const docs = JSON.parse(fs.readFileSync(DATA, 'utf8')).documentos;
  console.log(`📄 ${docs.length} documentos institucionales`);
  for (const d of docs) {
    if (!d.code || !d.doc_type || !d.title) throw new Error(`Documento incompleto: ${JSON.stringify(d).slice(0, 80)}`);
  }

  const su = await pool.query("SELECT id FROM users WHERE email='santiago@dassa.com.ar'");
  const approvedBy = su.rows[0] ? su.rows[0].id : null;

  if (DRY) {
    docs.forEach((d) => {
      const n = d.metadata?.items?.length;
      console.log(`  [${d.doc_type}] ${d.title}${n ? ` · ${n} ítems` : ''} · icon ${d.metadata?.icon}`);
    });
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const d of docs) {
      await client.query(
        `INSERT INTO strategic_documents (code, doc_type, title, body_md, version, effective_from, approved_by, is_active, metadata)
         VALUES ($1,$2,$3,$4,'1.0',CURRENT_DATE,$5,true,$6::jsonb)
         ON CONFLICT (code) DO UPDATE SET
           doc_type=EXCLUDED.doc_type, title=EXCLUDED.title, body_md=EXCLUDED.body_md,
           metadata=EXCLUDED.metadata, is_active=true, updated_at=NOW()`,
        [d.code, d.doc_type, d.title, d.body_md || '', approvedBy, JSON.stringify(d.metadata || {})]
      );
    }
    await client.query('COMMIT');
    const { rows } = await client.query(
      "SELECT doc_type, title FROM strategic_documents WHERE doc_type IN ('mision','vision','valores','politica_integrada') AND is_active ORDER BY (metadata->>'order')::int"
    );
    console.log(`\n✅ COMMIT · institucionales activos: ${rows.map((r) => r.title).join(' · ')}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
