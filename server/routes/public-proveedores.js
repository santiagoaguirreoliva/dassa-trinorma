// Router público — Acuse digital de requisitos para proveedores/contratistas.
// Sin auth de la app: el proveedor entra a la landing trinorma.dassa.com.ar/proveedores/,
// lee los requisitos (P-TRI-11 REV1 · F-TRI-18 REV00 · F-TRI-52 REV00) y deja constancia
// de aceptación → digitaliza la "ACEPTACIÓN firmada" con la que cierran F-TRI-18 y F-TRI-52.
// Si el CUIT matchea un proveedor de `suppliers`, el acuse queda vinculado (supplier_id).
//
// Endpoints:
//   POST /api/public/proveedores/acuse   { company_name, cuit, person_name, email,
//                                          phone?, activity_type, comments? } → 201 { ok, id }
// (el listado GET /api/proveedores/acuses es autenticado y vive en routes/proveedores.js)
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db/db.js';

const router = Router();

// ─── Rate limit (mismo patrón que public-portal) ───────────────────
const acuseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Demasiados envíos desde esta conexión. Esperá una hora.' },
  standardHeaders: true, legacyHeaders: false,
});

// ─── Validación / sanitización ─────────────────────────────────────
const ACTIVITY_TYPES = ['proveedor_insumos', 'contratista_obra', 'transportista', 'otro'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Texto plano saneado: string, trim, largo máximo. Devuelve null si queda vacío.
function cleanText(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s === '' ? null : s;
}

// ─── POST /acuse — registrar la aceptación de requisitos ───────────
router.post('/acuse', acuseLimiter, async (req, res) => {
  const b = req.body || {};
  const company_name = cleanText(b.company_name, 200);
  const person_name = cleanText(b.person_name, 150);
  const email = cleanText(b.email, 200);
  const phone = cleanText(b.phone, 50);
  const comments = cleanText(b.comments, 2000);
  const activity_type = typeof b.activity_type === 'string' ? b.activity_type.trim() : '';
  // CUIT: tolera guiones/espacios, deben quedar 11 dígitos (se guarda normalizado).
  const cuit = String(b.cuit || '').replace(/[\s-]/g, '');

  if (!company_name || company_name.length < 2) {
    return res.status(400).json({ error: 'Ingresá la razón social de la empresa' });
  }
  if (!/^\d{11}$/.test(cuit)) {
    return res.status(400).json({ error: 'CUIT inválido — deben ser 11 dígitos (ej: 30-12345678-9)' });
  }
  // Prefijo válido (persona/empresa): descarta 00.. que el mod-11 deja pasar.
  const CUIT_PREFIJOS = ['20', '23', '24', '25', '26', '27', '30', '33', '34'];
  if (!CUIT_PREFIJOS.includes(cuit.slice(0, 2))) {
    return res.status(400).json({ error: 'CUIT inválido (verificá el número)' });
  }
  // Dígito verificador mod-11 (AFIP): descarta CUITs de 11 dígitos inventados.
  const COEF = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = COEF.reduce((acc, c, idx) => acc + c * Number(cuit[idx]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10 || dv !== Number(cuit[10])) {
    return res.status(400).json({ error: 'CUIT inválido (verificá el número)' });
  }
  if (!person_name || person_name.length < 2) {
    return res.status(400).json({ error: 'Ingresá el nombre de quien acepta los requisitos' });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!ACTIVITY_TYPES.includes(activity_type)) {
    return res.status(400).json({ error: 'Tipo de actividad inválido' });
  }

  const ip = req.ip || null;
  const user_agent = (req.get('user-agent') || '').slice(0, 300) || null;

  try {
    // Vínculo por CUIT normalizado contra los proveedores ya cargados (si matchea).
    const { rows: sup } = await query(
      `SELECT id FROM suppliers
        WHERE regexp_replace(COALESCE(cuit, ''), '\\D', '', 'g') = $1
        LIMIT 1`, [cuit]);
    const supplier_id = sup[0]?.id || null;

    const { rows } = await query(
      `INSERT INTO supplier_acknowledgements
         (company_name, cuit, person_name, email, phone, activity_type, comments,
          ip, user_agent, supplier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [company_name, cuit, person_name, email, phone, activity_type, comments,
       ip, user_agent, supplier_id]);
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('public/proveedores/acuse error:', err.message);
    res.status(500).json({ error: 'Error interno — intentá de nuevo más tarde' });
  }
});

export default router;
