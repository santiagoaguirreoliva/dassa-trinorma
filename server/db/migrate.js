#!/usr/bin/env node
/**
 * Migration runner · DASSA SGI
 * Aplica migraciones SQL en orden alfanumérico desde server/db/migrations/
 * Idempotente: rastrea aplicaciones en tabla _schema_migrations.
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  // Tabla de tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duration_ms INTEGER,
      checksum    TEXT
    );
  `);

  const applied = (await pool.query('SELECT filename FROM _schema_migrations'))
    .rows.map(r => r.filename);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const pending = files.filter(f => !applied.includes(f));

  if (pending.length === 0) {
    console.log('✓ Todas las migraciones aplicadas (' + applied.length + ' totales).');
    await pool.end();
    return;
  }

  console.log(`Aplicadas: ${applied.length} · Pendientes: ${pending.length}\n`);

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`→ ${file} ${dryRun ? '[DRY-RUN]' : ''}`);

    if (dryRun) {
      console.log('   ' + sql.split('\n').slice(0, 3).join('\n   ') + '...');
      continue;
    }

    const t0 = Date.now();
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      const duration = Date.now() - t0;
      await pool.query(
        'INSERT INTO _schema_migrations (filename, duration_ms) VALUES ($1, $2)',
        [file, duration]
      );
      await pool.query('COMMIT');
      console.log(`   ✓ aplicada (${duration}ms)`);
    } catch (e) {
      await pool.query('ROLLBACK');
      // Si la migración falla por "objeto ya existe", la marcamos como aplicada (legacy)
      if (force || e.message.match(/already exists|duplicate|relation .* already/i)) {
        await pool.query(
          'INSERT INTO _schema_migrations (filename, duration_ms) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [file, 0]
        );
        console.log(`   ⊘ marcada como aplicada (legacy/idempotente): ${e.message}`);
      } else {
        console.error(`   ✗ ERROR: ${e.message}`);
        await pool.end();
        process.exit(1);
      }
    }
  }

  await pool.end();
  console.log('\n✓ Migraciones completas.');
}

run().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
