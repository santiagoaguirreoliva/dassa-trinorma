'use strict';
/**
 * llm-meter.cjs — envuelve un cliente Anthropic para loguear su consumo en
 * public.llm_usage (lo lee el Tablero de Costos · apps.dassa.com.ar/costos).
 *
 * Uso:  const { meterClient } = require('./llm-meter.cjs');
 *       _client = meterClient(new Anthropic({ apiKey: ... }), 'sgi-agent');
 *
 * NUNCA rompe la llamada real: todo el logging es fire-and-forget en try/catch.
 * Solo cubre messages.create() no-stream (lo que usa SGI).
 */
const { Pool } = require('pg');

const APP = process.env.LLM_METER_APP || 'sgi';

let _pool = null;
function pool() {
  if (_pool) return _pool;
  const dsn = process.env.DATABASE_URL;
  if (!dsn) return null;
  _pool = new Pool({
    connectionString: dsn, max: 2, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000,
    ssl: dsn.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
  _pool.on('error', () => {});
  return _pool;
}

// Precios mínimos USD/1M (input, output). cache_read = 0.1×, cache_write = 1.25×.
const PRICE = {
  'claude-opus-4-8': [5, 25], 'claude-opus-4-7': [5, 25], 'claude-opus-4-6': [5, 25], 'claude-opus-4-5': [5, 25],
  'claude-sonnet-4-6': [3, 15], 'claude-sonnet-4-5': [3, 15], 'claude-sonnet-4': [3, 15],
  'claude-haiku-4-5': [1, 5], 'claude-3-5-haiku': [0.8, 4],
};
function priceFor(m) {
  if (!m) return [3, 15];
  const k = Object.keys(PRICE).find((p) => String(m).startsWith(p));
  return k ? PRICE[k] : [3, 15];
}
function costUsd(model, u) {
  const [pi, po] = priceFor(model);
  const ti = u.input_tokens || 0, to = u.output_tokens || 0;
  const cr = u.cache_read_input_tokens || 0, cw = u.cache_creation_input_tokens || 0;
  return (ti * pi + cr * pi * 0.1 + cw * pi * 1.25 + to * po) / 1e6;
}
function logUsage(componente, params, res) {
  try {
    const p = pool();
    if (!p || !res || !res.usage) return;
    const u = res.usage;
    const model = (params && params.model) || res.model || null;
    p.query(
      `insert into public.llm_usage(app,componente,modelo,in_tokens,in_cached_tokens,out_tokens,costo_usd,ts)
       values($1,$2,$3,$4,$5,$6,$7,now())`,
      [APP, componente || null, model, u.input_tokens || 0,
       u.cache_read_input_tokens || 0, u.output_tokens || 0,
       Number(costUsd(model, u).toFixed(6))],
    ).catch(() => {});
  } catch (_) { /* never break the caller */ }
}

function meterClient(client, componente) {
  try {
    const m = client && client.messages;
    if (!m || typeof m.create !== 'function' || m.__metered) return client;
    const orig = m.create.bind(m);
    m.create = function (...args) {
      const r = orig(...args);
      try {
        if (r && typeof r.then === 'function') {
          Promise.resolve(r).then((res) => logUsage(componente, args[0], res)).catch(() => {});
        }
      } catch (_) { /* ignore */ }
      return r;
    };
    m.__metered = true;
  } catch (_) { /* never break */ }
  return client;
}

module.exports = { meterClient };
