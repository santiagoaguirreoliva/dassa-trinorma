// Router público — checklist diario de maquinaria (F-TRI-19).
// Sin auth: gate por qr_token de la máquina + PIN bcrypt del operador.
// Token de sesión HMAC con expiración corta (5 min). Rate-limit por IP.
//
// Endpoints:
//   GET  /api/public/checklist/machine?token=<qr>       → máquina + plantilla
//   POST /api/public/checklist/verify-pin               → token efímero
//   POST /api/public/checklist                          → alta del checklist
//
// Ref: docs/SPEC-RONDA-INSPECCIONES.md (Bloque 3.B, Bloque 4)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { query, getClient } from '../db/db.js';
import { saveBase64File } from '../services/uploads.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────
const HMAC_SECRET = process.env.PUBLIC_CHECKLIST_HMAC_SECRET
  || process.env.JWT_SECRET
  || 'dev-only-secret-change-me';
const SESSION_TTL_MS = 5 * 60 * 1000;  // 5 minutos

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const exp = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('base64url');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
async function geoInside(lat, lng) {
  if (lat == null || lng == null) return null;
  const { rows } = await query(
    `SELECT key, value FROM insp_config
      WHERE key IN ('geofence_lat','geofence_lng','geofence_radius_m')`
  );
  const c = Object.fromEntries(rows.map(r => [r.key, parseFloat(r.value)]));
  if (!c.geofence_lat || !c.geofence_lng || !c.geofence_radius_m) return null;
  return distM(lat, lng, c.geofence_lat, c.geofence_lng) <= c.geofence_radius_m;
}

// ─── Rate limits ──────────────────────────────────────────────────
const machineLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: 'Demasiadas consultas. Esperá un minuto.' },
  standardHeaders: true, legacyHeaders: false,
});
const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 10,
  message: { error: 'Demasiados intentos. Esperá 5 minutos.' },
  standardHeaders: true, legacyHeaders: false,
});
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 6,
  message: { error: 'Demasiados envíos. Esperá unos minutos.' },
  standardHeaders: true, legacyHeaders: false,
});

// ─── 1. Resolver máquina + plantilla por QR token ────────────────
router.get('/machine', machineLimiter, async (req, res) => {
  const token = req.query.token;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token requerido' });
  if (!UUID_RE.test(token)) return res.status(404).json({ error: 'QR inválido' });
  try {
    const { rows } = await query(
      `SELECT id, code, name, type FROM insp_machines
        WHERE qr_token=$1 AND active=true`, [token]);
    if (!rows[0]) return res.status(404).json({ error: 'QR inválido o máquina inactiva' });
    const machine = rows[0];
    // Plantilla F-TRI-19 (familia maquinaria, machine_type matchea o sin filtro)
    const { rows: tpls } = await query(
      `SELECT id, code, name FROM insp_templates
        WHERE family='maquinaria' AND active=true
          AND (machine_type IS NULL OR machine_type=$1)
        ORDER BY code LIMIT 1`, [machine.type]);
    if (!tpls[0]) return res.status(409).json({ error: 'No hay plantilla activa para esta máquina' });
    const { rows: items } = await query(
      `SELECT id, section, order_idx, label, response_type, is_critical, photo_on_fail
         FROM insp_template_items
        WHERE template_id=$1 ORDER BY order_idx`, [tpls[0].id]);
    res.json({ machine, template: tpls[0], items });
  } catch (err) {
    console.error('public/checklist/machine error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 2. Verificar PIN del chofer → token de sesión ────────────────
router.post('/verify-pin', pinLimiter, async (req, res) => {
  const { machine_token, pin } = req.body || {};
  if (!machine_token || !pin) return res.status(400).json({ error: 'machine_token y pin requeridos' });
  if (typeof machine_token !== 'string' || !UUID_RE.test(machine_token))
    return res.status(404).json({ error: 'QR inválido' });
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN inválido' });
  try {
    const { rows: m } = await query(
      `SELECT id FROM insp_machines WHERE qr_token=$1 AND active=true`, [machine_token]);
    if (!m[0]) return res.status(404).json({ error: 'QR inválido' });
    const { rows: ops } = await query(
      `SELECT id, full_name, pin_hash FROM insp_operators WHERE active=true`);
    let matched = null;
    for (const op of ops) {
      // bcrypt.compare es time-safe — iteramos hasta dar con uno
      // (la cantidad de operadores es chica: ~5-10)
      if (await bcrypt.compare(pin, op.pin_hash)) { matched = op; break; }
    }
    if (!matched) return res.status(401).json({ error: 'PIN incorrecto' });
    const session = signSession({
      mid: m[0].id, oid: matched.id, exp: Date.now() + SESSION_TTL_MS,
    });
    res.json({
      session,
      operator: { id: matched.id, name: matched.full_name },
      expires_in: Math.floor(SESSION_TTL_MS / 1000),
    });
  } catch (err) {
    console.error('public/checklist/verify-pin error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 3. Submit del checklist ──────────────────────────────────────
router.post('/', submitLimiter, async (req, res) => {
  const { session, responses, geo_lat, geo_lng, machine_hours, signature_base64, notes } = req.body || {};
  const sess = verifySession(session);
  if (!sess) return res.status(401).json({ error: 'Sesión inválida o expirada — escaneá de nuevo' });
  if (!Array.isArray(responses) || responses.length === 0)
    return res.status(400).json({ error: 'responses debe ser un array no vacío' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const machine = (await client.query(
      `SELECT id, code FROM insp_machines WHERE id=$1 AND active=true`, [sess.mid])).rows[0];
    if (!machine) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Máquina inactiva' }); }
    const tpl = (await client.query(
      `SELECT t.id FROM insp_templates t
        WHERE t.family='maquinaria' AND t.active=true
          AND (t.machine_type IS NULL OR t.machine_type=(SELECT type FROM insp_machines WHERE id=$1))
        ORDER BY t.code LIMIT 1`, [machine.id])).rows[0];
    if (!tpl) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Sin plantilla activa' }); }

    // Modelo on-demand: cada escaneo QR+PIN crea una instancia nueva, sin buscar del día.
    // Permite ejecutar varios checklists por máquina por día (cambio de turno, re-control, etc).
    const today = new Date().toISOString().slice(0, 10);
    const insp = (await client.query(
      `INSERT INTO insp_inspections
         (template_id, family, status, period_label, scheduled_date, due_date,
          machine_id, operator_id)
       VALUES ($1,'maquinaria','en_curso',$2,$3,$3,$4,$5)
       RETURNING id, status`,
      [tpl.id, today, today, machine.id, sess.oid])).rows[0];

    await client.query('DELETE FROM insp_responses WHERE inspection_id=$1', [insp.id]);
    let critFails = 0;
    for (const r of responses) {
      if (!r.item_id) continue;
      const urls = [];
      for (const b64 of (r.photos || [])) {
        const u = saveBase64File(b64, `maq-${machine.code}`);
        if (u) urls.push(u);
      }
      await client.query(
        `INSERT INTO insp_responses (inspection_id, item_id, answer, observations, photo_urls)
         VALUES ($1,$2,$3,$4,$5)`,
        [insp.id, r.item_id, r.answer || null, r.observations || null, urls]);
      if (r.answer === 'no') {
        const isCrit = (await client.query(
          `SELECT is_critical FROM insp_template_items WHERE id=$1`, [r.item_id])).rows[0]?.is_critical;
        if (isCrit) critFails++;
      }
    }

    const sigUrl = signature_base64 ? saveBase64File(signature_base64, 'firma-maq') : null;
    const inside = await geoInside(geo_lat, geo_lng);
    const updated = (await client.query(
      `UPDATE insp_inspections SET
         status='completada', operator_id=$2,
         machine_hours=COALESCE($3, machine_hours), notes=COALESCE($4, notes),
         geo_lat=$5, geo_lng=$6, geo_inside=$7,
         signature_url=COALESCE($8, signature_url),
         submitted_ip=$9, submitted_ua=$10, completed_at=NOW()
       WHERE id=$1 RETURNING id, code`,
      [insp.id, sess.oid, machine_hours ?? null, notes ?? null,
       geo_lat ?? null, geo_lng ?? null, inside, sigUrl,
       req.ip, req.get('user-agent') || null])).rows[0];

    // Alerta a Mantenimiento si hubo fallas críticas
    if (critFails > 0) {
      const { rows: admins } = await client.query(
        `SELECT id FROM users
          WHERE is_active=true AND role IN ('master_admin','director','sgi_leader')`);
      for (const a of admins) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, source_module)
           VALUES ($1, $2, $3, 'warning', 'rondas')`,
          [a.id,
           `${critFails} falla(s) crítica(s) — ${machine.code}`,
           `Checklist ${updated.code} reportó fallas en ítems críticos. Revisar antes de operar.`]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ok: true, code: updated.code, critical_failures: critFails });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('public/checklist submit error:', err);
    res.status(500).json({ error: 'Error al guardar el checklist' });
  } finally { client.release(); }
});

export default router;
