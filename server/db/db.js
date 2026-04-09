import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.LOG_QUERIES === 'true') {
      console.log('query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('DB query error:', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
}

export async function getClient() {
  return pool.connect();
}

// Migration runner
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node db.js schema.sql'); process.exit(1); }
  const sql = readFileSync(join(__dirname, file), 'utf8');
  try {
    await pool.query(sql);
    console.log(`✅ ${file} executed successfully`);
  } catch (err) {
    console.error(`❌ Error executing ${file}:`, err.message);
  } finally {
    await pool.end();
  }
}
