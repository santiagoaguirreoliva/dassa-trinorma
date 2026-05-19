// ============================================================
// server/agent-bus.js — Bus de Agentes · lado Triny (SGI Trinorma).
//
// Conecta a Triny (gestión ISO/SGI) al canal inter-agente del ecosistema
// DASSA. Transporte HTTP por loopback + firma HMAC-SHA256 sobre el cuerpo
// crudo. Bandeja propia en JSON. ESM.
//
// Jerarquía: `directiva` es vinculante y SOLO la emite el CEO. Triny es par
// de los demás agentes; intercambia `pedido` con ellos.
// ============================================================
import crypto from 'node:crypto';
import express from 'express';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENT_NAME = 'triny';
const SECRET = process.env.AGENT_BUS_SECRET || '';
const __dirname = dirname(fileURLToPath(import.meta.url));
const INBOX_DIR = join(__dirname, '.agent-inbox');
const INBOX_FILE = join(INBOX_DIR, 'inbox.json');

// Registro central de peers del ecosistema (slug → URL del inbox).
const PEERS = {
  ceo:    'http://127.0.0.1:3040/api/agent-inbox',
  fico:   'http://127.0.0.1:3010/api/agent-inbox',
  luz:    'http://127.0.0.1:3500/api/agent-inbox',
  sincro: 'http://127.0.0.1:3030/api/agent-inbox',
  triny:  'http://127.0.0.1:4001/api/agent-inbox',
  comex:  'http://127.0.0.1:3505/api/agent-inbox',
  fort:   'http://127.0.0.1:3020/api/agent-inbox',
};
const TIPOS = ['directiva', 'pedido', 'consulta', 'confirmacion', 'actualizacion', 'reporte'];

function firmar(body) {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}
function verificarFirma(body, firma) {
  if (!SECRET || !firma) return false;
  const a = Buffer.from(firmar(body));
  const b = Buffer.from(String(firma));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function cargarInbox() {
  try {
    const arr = JSON.parse(readFileSync(INBOX_FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function guardarInbox(arr) {
  mkdirSync(INBOX_DIR, { recursive: true });
  writeFileSync(INBOX_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

/** Triny le envía un mensaje a otro agente del bus. */
export async function enviarAAgente({ para, tipo, asunto, payload, correlationId }) {
  if (!SECRET) return { ok: false, error: 'AGENT_BUS_SECRET no configurado' };
  const url = PEERS[para];
  if (!url) return { ok: false, error: `agente "${para}" no está en el registro de peers` };
  if (!TIPOS.includes(tipo)) return { ok: false, error: `tipo de mensaje inválido: "${tipo}"` };
  if (tipo === 'directiva' && AGENT_NAME !== 'ceo') {
    return { ok: false, error: `${AGENT_NAME} no tiene potestad para emitir directivas` };
  }
  const correlation_id = correlationId || crypto.randomUUID();
  const body = JSON.stringify({
    de: AGENT_NAME, para, tipo, asunto, payload: payload || {}, correlation_id,
  });
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-agent-from': AGENT_NAME,
        'x-agent-signature': firmar(body),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} del inbox de ${para}`);
    const inbox = cargarInbox();
    inbox.push({
      id: crypto.randomUUID(), direccion: 'saliente', de: AGENT_NAME, para,
      tipo, asunto, payload: payload || {}, correlation_id,
      estado: 'enviado', ts: new Date().toISOString(),
    });
    guardarInbox(inbox);
    return { ok: true, correlation_id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Router Express del bus. MONTAR ANTES del express.json() global: el HMAC se
 * valida sobre el cuerpo crudo, por eso el POST usa su propio parser raw.
 */
export function busRouter() {
  const router = express.Router();

  router.post('/api/agent-inbox', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    if (!verificarFirma(raw, req.headers['x-agent-signature'])) {
      return res.status(401).json({ error: 'Firma HMAC inválida o canal deshabilitado' });
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: 'Cuerpo JSON inválido' });
    }
    if (!msg.de || !msg.tipo || !msg.asunto) {
      return res.status(400).json({ error: 'mensaje incompleto (faltan de / tipo / asunto)' });
    }
    if (!TIPOS.includes(msg.tipo)) {
      return res.status(422).json({ error: `tipo de mensaje inválido: "${msg.tipo}"` });
    }
    // Potestad: una directiva solo es válida si la emite el CEO.
    if (msg.tipo === 'directiva' && msg.de !== 'ceo') {
      return res.status(422).json({ error: `"${msg.de}" no tiene potestad para emitir "directiva"` });
    }
    const item = {
      id: crypto.randomUUID(), direccion: 'entrante', de: msg.de, para: AGENT_NAME,
      tipo: msg.tipo, asunto: msg.asunto, payload: msg.payload || {},
      correlation_id: msg.correlation_id || null, estado: 'recibido',
      vinculante: msg.tipo === 'directiva', ts: new Date().toISOString(),
    };
    const inbox = cargarInbox();
    inbox.push(item);
    guardarInbox(inbox);
    return res.json({ ok: true, id: item.id, recibido_por: AGENT_NAME });
  });

  router.get('/api/agent-inbox', (_req, res) => {
    res.json({ items: cargarInbox().slice(-100).reverse() });
  });

  return router;
}
