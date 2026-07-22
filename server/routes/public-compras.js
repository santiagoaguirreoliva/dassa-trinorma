// Router PÚBLICO — solicitudes de compra desde el link público (sin auth).
// Cualquier persona del equipo entra a trinorma.dassa.com.ar/solicitud-compra,
// describe lo que necesita (o pega un link de MercadoLibre y la IA lo analiza)
// y la solicitud entra al circuito normal de Compras (borrador → autorizan
// Manuel/Santiago → ejecuta María) con canal 'publica'.
//
// Endpoints:
//   POST /api/public/compras/analizar  { url?, text? }  → datos del producto (IA)
//   POST /api/public/compras           { ... }          → 201 { ok, code }
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import { query } from '../db/db.js';
import { saveBase64File } from '../services/uploads.js';

const require = createRequire(import.meta.url);
const { parseProductInfo } = require('../services/url-importer.cjs');

const router = Router();

// ─── Rate limits (mismo patrón que public-proveedores) ─────────────
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { error: 'Demasiadas solicitudes desde esta conexión. Esperá una hora.' },
  standardHeaders: true, legacyHeaders: false,
});
// El análisis usa IA (tiene costo) — límite más corto.
const parseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 15,
  message: { error: 'Demasiados análisis desde esta conexión. Esperá una hora.' },
  standardHeaders: true, legacyHeaders: false,
});

function cleanText(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s === '' ? null : s;
}

const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
const CATEGORIES = ['general', 'servicios', 'materiales', 'equipamiento', 'otros'];

// ─── POST /analizar — la IA lee el link (ML, etc.) o texto pegado ──
router.post('/analizar', parseLimiter, async (req, res) => {
  const { url, text } = req.body || {};
  try {
    const data = await parseProductInfo({ url: url?.trim(), text: text?.trim() });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[public/compras/analizar]', e.message);
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ─── POST / — alta de solicitud pública ────────────────────────────
router.post('/', submitLimiter, async (req, res) => {
  const b = req.body || {};
  const requester_name = cleanText(b.requester_name, 150);
  const requester_email = cleanText(b.requester_email, 200);
  const requesting_area = cleanText(b.requesting_area, 100);
  const description = cleanText(b.description, 300);
  const long_description = cleanText(b.long_description, 5000);
  const purpose = cleanText(b.purpose, 2000);
  const source_url = cleanText(b.source_url, 1000);
  const recommended_supplier = cleanText(b.recommended_supplier, 200);
  const priority = PRIORITIES.includes(b.priority) ? b.priority : 'media';
  const category = CATEGORIES.includes(b.category) ? b.category : 'general';
  const quantity = Number.isInteger(Number(b.quantity)) && Number(b.quantity) > 0
    ? Number(b.quantity) : null;
  const estimated_budget = Number(b.estimated_budget) > 0 ? Number(b.estimated_budget) : null;

  if (!requester_name) return res.status(400).json({ error: 'Ingresá tu nombre' });
  if (!requesting_area) return res.status(400).json({ error: 'Ingresá el sector' });
  if (!description) return res.status(400).json({ error: 'Contanos qué necesitás comprar' });

  try {
    let photo_urls = Array.isArray(b.photo_urls)
      ? b.photo_urls.filter(u => typeof u === 'string' && u.startsWith('https://')).slice(0, 6)
      : [];
    if (b.photo_base64) {
      const url = saveBase64File(b.photo_base64, 'compra-publica');
      if (url) photo_urls = [...photo_urls, url];
    }

    const { rows } = await query(
      `INSERT INTO purchases
         (description, category, priority, estimated_budget, required_date,
          purpose, recommended_supplier, requesting_area, status, channel,
          requester_name, requester_email, quantity,
          source_url, long_description, item_specs, photo_urls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'borrador','publica',$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, code`,
      [description, category, priority, estimated_budget,
       b.required_date || new Date().toISOString().split('T')[0],
       purpose, recommended_supplier, requesting_area,
       requester_name, requester_email, quantity,
       source_url, long_description,
       b.item_specs && typeof b.item_specs === 'object' ? JSON.stringify(b.item_specs) : null,
       photo_urls.length ? photo_urls : null]
    );

    // Notificar a quienes pueden autorizar (mismo criterio que el POST autenticado)
    const { rows: authorizers } = await query(
      `SELECT u.id FROM users u
       INNER JOIN purchase_permissions pp ON pp.user_id = u.id
       WHERE pp.can_authorize = true
       UNION
       SELECT id FROM users WHERE role IN ('master_admin','director')`
    );
    for (const a of authorizers) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, source_module)
         VALUES ($1,$2,$3,'info','purchases')`,
        [a.id, `Nueva solicitud de compra (pública): ${rows[0].code}`,
         `${requester_name} (${requesting_area}) — ${description.substring(0, 90)}`]
      );
    }

    res.status(201).json({ ok: true, code: rows[0].code });
  } catch (err) {
    console.error('public/compras error:', err.message);
    res.status(500).json({ error: 'Error interno — intentá de nuevo más tarde' });
  }
});

export default router;
