// =============================================================================
// DASSA SGI · Compras 2.0 · CAPA 2 · URL Importer v3
// Acepta URL, texto pegado, o ambos. La IA siempre parsea.
// Estrategias:
//   - Solo URL → fetch HTML + JSON-LD + fallback IA (puede fallar en SPAs)
//   - Solo texto → IA parsea texto pegado (siempre funciona)
//   - Ambos → IA usa el texto, guarda URL como referencia
// =============================================================================

const Anthropic = require('@anthropic-ai/sdk');

const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 1_500_000;
const HAIKU_MAX_INPUT = 30_000;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function isHttpUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}

function detectSource(url) {
  if (!url) return 'manual';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('mercadolibre.com') || host.includes('mercadolivre.com')) return 'mercadolibre';
    if (host.includes('amazon.')) return 'amazon';
    if (host.includes('falabella.')) return 'falabella';
    if (host.includes('musimundo.')) return 'musimundo';
    if (host.includes('garbarino.')) return 'garbarino';
    return host;
  } catch { return 'unknown'; }
}

async function timedFetch(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { ...opts, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function fetchHtml(url) {
  const res = await timedFetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  const limited = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
  return new TextDecoder('utf-8', { fatal: false }).decode(limited);
}

function extractJsonLd(html) {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const results = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    try { results.push(JSON.parse(m[1].trim())); } catch {}
  }
  return results;
}

function findProductLd(ldList) {
  for (const ld of ldList) {
    if (!ld) continue;
    if (Array.isArray(ld)) { const r = findProductLd(ld); if (r) return r; }
    else if (ld['@type'] === 'Product' || (Array.isArray(ld['@type']) && ld['@type'].includes('Product'))) return ld;
    else if (ld['@graph']) { const r = findProductLd(ld['@graph']); if (r) return r; }
  }
  return null;
}

function mapJsonLdProduct(ld) {
  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
  let images = [];
  if (Array.isArray(ld.image)) images = ld.image;
  else if (typeof ld.image === 'string') images = [ld.image];
  else if (ld.image?.url) images = [ld.image.url];

  return {
    titulo:      ld.name || null,
    descripcion: ld.description || null,
    precio:      offers?.price ? Number(offers.price) : null,
    moneda:      offers?.priceCurrency || null,
    vendedor:    offers?.seller?.name || ld.brand?.name || null,
    fotos:       images.slice(0, 8),
    categoria:   ld.category || null,
    sku:         ld.sku || ld.mpn || null,
    condicion:   ld.itemCondition?.toString().replace(/.*\//, '').replace('Condition', '') || null,
    disponible:  offers?.availability ? offers.availability.toString().includes('InStock') : null,
    _source:     'json-ld',
  };
}

function cleanHtmlForAi(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseWithAi(content, sourceHint, isHtml = false) {
  const client = getClient();
  const input = (isHtml ? cleanHtmlForAi(content) : content).slice(0, HAIKU_MAX_INPUT);

  const sys = `Sos un asistente del módulo de Compras del SGI TRINORMA de DASSA (depósito fiscal argentino).
Tu trabajo: leer información de un producto/artículo (HTML, texto copiado de una web, descripción de mail o texto libre) y devolver los datos estructurados para cargar una solicitud de compra.

DEVOLVÉ EXCLUSIVAMENTE este JSON, sin texto extra, sin markdown:
{
  "titulo": "string corto y descriptivo o null",
  "descripcion": "string con detalle, specs técnicas y características o null",
  "precio": numero_o_null,
  "moneda": "ARS / USD / EUR / null",
  "vendedor": "nombre del vendedor/marca o null",
  "fotos": ["url1"] o [],
  "categoria": "categoría sugerida (servicios, materiales, equipamiento, etc) o null",
  "sku": "código del producto o null",
  "condicion": "Nuevo / Usado / Reacondicionado / null",
  "garantia": "string o null",
  "envio": "string o null",
  "disponible": true / false / null,
  "categoria_sgi": "general / servicios / materiales / equipamiento / otros"
}

REGLAS:
- Si no encontrás un dato, ponelo en null. NO inventes.
- precio: solo número (ej: 125000.50, sin separadores ni símbolo).
- fotos: solo URLs absolutas https://... (máximo 6).
- categoria_sgi: mapeá al esquema interno DASSA:
  * "servicios" → consultoría, mantenimiento, capacitación, certificaciones, software
  * "materiales" → insumos, EPP, productos químicos, repuestos pequeños
  * "equipamiento" → herramientas, maquinaria, hardware, mobiliario
  * "general" → si es mezclado o no claro
  * "otros" → solo si nada encaja`;

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: sys,
    messages: [{ role: 'user', content: `Origen: ${sourceHint}\n\nContenido:\n${input}` }],
  });

  const text = resp.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('IA no devolvió JSON parseable');
  const parsed = JSON.parse(match[0]);
  parsed._source = 'ai';
  parsed._usage = resp.usage;
  return parsed;
}

// ───────────────────────────────────────────────────────────────
// Función principal — acepta { url?, text? }
// ───────────────────────────────────────────────────────────────
async function parseProductInfo({ url, text } = {}) {
  const hasUrl = isHttpUrl(url);
  const hasText = text && typeof text === 'string' && text.trim().length > 10;

  if (!hasUrl && !hasText) {
    throw new Error('Necesitamos URL o texto (al menos uno con contenido útil)');
  }

  const source = hasUrl ? detectSource(url) : 'manual';
  const t0 = Date.now();

  // Caso 1: hay texto → IA lo parsea directamente (siempre funciona)
  if (hasText) {
    const result = await parseWithAi(text.trim(), source);
    return {
      ...result,
      _meta: {
        url: hasUrl ? url : null,
        source,
        strategy: 'text-ai',
        text_size: text.length,
        duration_ms: Date.now() - t0,
        imported_at: new Date().toISOString(),
      },
    };
  }

  // Caso 2: solo URL → intentar fetch + JSON-LD, fallback a IA del HTML
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    throw new Error(`No se pudo leer la página: ${e.message}. Tip: copiá y pegá el contenido del producto en el campo "Texto" en vez del link.`);
  }

  if (!html || html.length < 1000) {
    throw new Error(`La página devolvió muy poco contenido (${html?.length || 0} bytes) — probablemente es una SPA que necesita JavaScript. Copiá y pegá la información del producto en el campo "Texto".`);
  }

  let result = null;
  let strategy = 'unknown';

  try {
    const product = findProductLd(extractJsonLd(html));
    if (product) {
      result = mapJsonLdProduct(product);
      strategy = 'json-ld';
    }
  } catch (e) { console.warn('[url-importer] JSON-LD fail:', e.message); }

  if (!result || (!result.titulo && !result.precio)) {
    result = await parseWithAi(html, source, true);
    strategy = 'html-ai';
  }

  return {
    ...result,
    _meta: { url, source, strategy, html_size: html.length, duration_ms: Date.now() - t0, imported_at: new Date().toISOString() },
  };
}

module.exports = { parseProductInfo };
