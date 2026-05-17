// =============================================================================
// server/services/madre-feed.js
// Replica las comunicaciones de SGI Trinorma en el Centro de Comunicaciones de
// la app madre (Smart DASSA Apps), vía el endpoint HMAC /api/feed/publish.
//
// Best-effort: nunca lanza. Si la madre está caída, el envío en Trinorma sigue
// igual — la comunicación es autoritativa acá; la madre solo la agrega al feed.
// =============================================================================
import crypto from 'crypto';

const APP_KEY = 'trinorma';
const MADRE_URL = (process.env.DASSA_APPS_SSO_URL || 'http://127.0.0.1:3040').replace(/\/$/, '');
const SECRET = process.env.DASSA_APPS_SSO_SECRET || '';
const APP_URL = (process.env.APP_URL || 'https://trinorma.dassa.com.ar').replace(/\/$/, '');

// Mapea el campo `norma` (texto libre en Trinorma) a los códigos ISO que
// entiende la madre (9001 / 14001 / 45001).
function parseNormas(norma) {
  const s = String(norma || '');
  return ['9001', '14001', '45001'].filter(code => s.includes(code));
}

// Resumen plano del cuerpo Markdown para la tarjeta del feed de la madre.
function plainSummary(md, max = 280) {
  const txt = String(md || '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → solo texto
    .replace(/[#*_`>~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
}

// Publica (o re-confirma — es idempotente por external_ref) una comunicación
// enviada en el Centro de Comunicaciones de la app madre.
export async function pushToMadre(comm, { log = console } = {}) {
  if (!SECRET) {
    log.warn?.('[madre-feed] sin DASSA_APPS_SSO_SECRET · push omitido');
    return { ok: false, skipped: true };
  }
  const externalRef = comm.code || `comm-${comm.id}`;
  const title = String(comm.title || '').trim();
  const signature = crypto.createHmac('sha256', SECRET)
    .update(`${APP_KEY}:${externalRef}:${title}`)
    .digest('hex');

  const payload = {
    app_key: APP_KEY,
    external_ref: externalRef,
    kind: 'comunicado',
    category: comm.category || null,             // politica|cambio|capacitacion|alerta|info
    normas: parseNormas(comm.norma),             // {9001,14001,45001}
    scope: comm.scope || 'internal',             // internal|external|both
    title,
    summary: plainSummary(comm.body_md),
    // El feed de la madre enlaza a la página de confirmación real de Trinorma.
    url: comm.public_token ? `${APP_URL}/c/${comm.public_token}` : APP_URL,
    signature,
  };

  try {
    const res = await fetch(`${MADRE_URL}/api/feed/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn?.(`[madre-feed] push falló (${res.status}): ${data.error || 'sin detalle'}`);
      return { ok: false, status: res.status, ...data };
    }
    log.info?.(`[madre-feed] comunicación ${externalRef} en la madre (id=${data.id}, dest=${data.recipients ?? '?'})`);
    return { ok: true, ...data };
  } catch (e) {
    log.warn?.(`[madre-feed] push error: ${e.message}`);
    return { ok: false, error: e.message };
  }
}
