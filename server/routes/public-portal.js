// Router público — Portal del Empleado (externo, QR + PIN).
// Sin auth de la app: el operario escanea el QR de planta, ingresa su DNI + PIN de 6 dígitos
// (bcrypt) y obtiene una sesión HMAC efímera para ver, en read-only:
//   · LO SUYO        → ficha de puesto + capacitaciones + habilitaciones (por employee_id)
//   · INSTITUCIONAL  → organigrama + identidad DASSA (misión/visión/valores/política)
// Los procedimientos se sirven aparte por /api/public/procedimientos (ya existente).
//
// Espejo de la lógica de /api/orgchart/mi-perfil, pero resolviendo el empleado por PIN
// en vez de por user_id (estos operarios no tienen cuenta en la app).
//
// Endpoints:
//   POST /api/public/portal/login          { documento, pin }   → sesión efímera + empleado
//   GET  /api/public/portal/me             (x-portal-session)   → ficha + capacitaciones
//   GET  /api/public/portal/institucional  (x-portal-session)   → organigrama + identidad
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { query } from '../db/db.js';

const router = Router();

// ─── Sesión HMAC efímera (mismo patrón que public-checklist) ───────
const HMAC_SECRET = process.env.PORTAL_EMPLEADO_HMAC_SECRET
  || process.env.JWT_SECRET
  || 'dev-only-secret-change-me';
const SESSION_TTL_MS = 30 * 60 * 1000;  // 30 minutos (el operario navega varias secciones)
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

// Middleware: exige una sesión de portal válida (header x-portal-session o ?s=)
function requirePortalSession(req, res, next) {
  const token = req.get('x-portal-session') || req.query.s;
  const sess = verifySession(token);
  if (!sess?.eid) return res.status(401).json({ error: 'Sesión inválida o expirada — escaneá el QR de nuevo' });
  req.eid = sess.eid;
  next();
}

// ─── Rate limits ───────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 12,
  message: { error: 'Demasiados intentos. Esperá 5 minutos.' },
  standardHeaders: true, legacyHeaders: false,
});
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: { error: 'Demasiadas consultas. Esperá un minuto.' },
  standardHeaders: true, legacyHeaders: false,
});

// ─── 1. Login por DNI + PIN ────────────────────────────────────────
// El PIN se valida SOLO contra el empleado cuyo DNI matchea (un bcrypt.compare, no se
// itera sobre todos). El DNI se deriva del CUIL cargado (bloque central de 7-8 dígitos).
// Lockout por empleado tras N fallos + rate-limit por IP (defensa en capas).
const LOCKOUT_THRESHOLD = 5;                 // fallos consecutivos antes de bloquear
const LOCKOUT_MS = 15 * 60 * 1000;           // 15 minutos de bloqueo
const GENERIC_LOGIN_ERR = 'DNI o PIN incorrectos';  // no revela si el DNI existe

// DNI a partir del texto ingresado o del CUIL guardado: dejamos solo dígitos y, si son
// 11 (CUIL completo), extraemos el bloque central (posiciones 3..10 → 7-8 dígitos de DNI).
function dniFromRaw(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 11 ? d.slice(2, 10) : d;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { documento, pin } = req.body || {};
  const dni = dniFromRaw(documento);
  if (!/^\d{7,8}$/.test(dni)) return res.status(400).json({ error: 'DNI inválido' });
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'El PIN debe tener 6 dígitos' });
  }
  try {
    // Resolvemos al empleado por DNI derivado del CUIL (normalizado sin guiones).
    const { rows } = await query(
      `SELECT id, full_name, position, sector, portal_pin_hash, portal_locked_until,
              (portal_onboarded_at IS NOT NULL) AS onboarded
         FROM employees
        WHERE is_active = TRUE AND portal_pin_hash IS NOT NULL
          AND substring(regexp_replace(cuil, '\\D', '', 'g') from 3 for 8) = $1`, [dni]);
    const emp = rows[0];
    // DNI inexistente o sin PIN → mismo error genérico (no filtra si el DNI existe).
    if (!emp) return res.status(401).json({ error: GENERIC_LOGIN_ERR });
    if (emp.portal_locked_until && new Date(emp.portal_locked_until) > new Date()) {
      return res.status(429).json({ error: 'Cuenta bloqueada por intentos fallidos. Esperá unos minutos.' });
    }
    if (!(await bcrypt.compare(pin, emp.portal_pin_hash))) {
      // Suma un fallo; al llegar al umbral, bloquea a este empleado por LOCKOUT_MS.
      await query(
        `UPDATE employees
            SET portal_failed_attempts = portal_failed_attempts + 1,
                portal_locked_until = CASE WHEN portal_failed_attempts + 1 >= $2
                                           THEN NOW() + ($3 || ' milliseconds')::interval
                                           ELSE portal_locked_until END
          WHERE id = $1`, [emp.id, LOCKOUT_THRESHOLD, String(LOCKOUT_MS)]);
      return res.status(401).json({ error: GENERIC_LOGIN_ERR });
    }
    // Acierto → resetea contador/bloqueo y registra el login.
    await query(
      `UPDATE employees SET portal_last_login_at = NOW(),
              portal_failed_attempts = 0, portal_locked_until = NULL
        WHERE id = $1`, [emp.id]);
    const session = signSession({ eid: emp.id, exp: Date.now() + SESSION_TTL_MS });
    res.json({
      session,
      employee: { id: emp.id, full_name: emp.full_name, position: emp.position, sector: emp.sector },
      onboarded: emp.onboarded,
      expires_in: Math.floor(SESSION_TTL_MS / 1000),
    });
  } catch (err) {
    console.error('public/portal/login error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 1b. Primer acceso · validar link de invitación ───────────────
router.get('/activate/:token', loginLimiter, async (req, res) => {
  const token = req.params.token;
  if (!UUID_RE.test(token)) return res.status(404).json({ error: 'Link inválido' });
  try {
    const { rows } = await query(
      `SELECT full_name, position, sector,
              (portal_activated_at IS NOT NULL) AS activated,
              (portal_onboarded_at IS NOT NULL) AS onboarded
         FROM employees WHERE portal_invite_token = $1 AND is_active = TRUE`, [token]);
    if (!rows[0]) return res.status(404).json({ error: 'Link inválido o vencido' });
    res.json({ ok: true, ...rows[0] });
  } catch (err) {
    console.error('public/portal/activate GET error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ¿el PIN ya está en uso por OTRO empleado? (unicidad global del PIN-solo)
async function pinTaken(pin, exceptId) {
  const { rows } = await query(
    `SELECT id, portal_pin_hash FROM employees
      WHERE is_active = TRUE AND portal_pin_hash IS NOT NULL AND id <> $1`, [exceptId]);
  for (const e of rows) if (await bcrypt.compare(pin, e.portal_pin_hash)) return true;
  return false;
}
// PINs triviales de 6 dígitos (repetidos o secuencias) — bloqueados en la activación.
function isTrivialPin(pin) {
  if (/^(\d)\1{5}$/.test(pin)) return true;              // 000000, 111111, …
  if ('0123456789'.includes(pin)) return true;          // 012345 … 456789
  if ('9876543210'.includes(pin)) return true;          // 987654 … 543210
  if (pin === '123456' || pin === '654321') return true;
  return false;
}

// ─── 1c. Primer acceso · crear PIN propio ──────────────────────────
router.post('/activate', loginLimiter, async (req, res) => {
  const { token, pin } = req.body || {};
  if (typeof token !== 'string' || !UUID_RE.test(token)) return res.status(404).json({ error: 'Link inválido' });
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'El PIN debe tener 6 dígitos' });
  if (isTrivialPin(pin)) return res.status(400).json({ error: 'Elegí un PIN menos obvio (no 123456, 000000, etc.)' });
  try {
    const { rows } = await query(
      `SELECT id, full_name, position, sector, (portal_onboarded_at IS NOT NULL) AS onboarded
         FROM employees WHERE portal_invite_token = $1 AND is_active = TRUE`, [token]);
    const emp = rows[0];
    if (!emp) return res.status(404).json({ error: 'Link inválido o vencido' });
    if (await pinTaken(pin, emp.id)) return res.status(409).json({ error: 'Ese PIN ya está en uso. Elegí otro.' });

    const hash = await bcrypt.hash(pin, 10);
    await query(
      `UPDATE employees
          SET portal_pin_hash = $2, portal_pin_set_at = NOW(),
              portal_activated_at = COALESCE(portal_activated_at, NOW()),
              portal_last_login_at = NOW()
        WHERE id = $1`, [emp.id, hash]);
    const session = signSession({ eid: emp.id, exp: Date.now() + SESSION_TTL_MS });
    res.json({
      session,
      employee: { id: emp.id, full_name: emp.full_name, position: emp.position, sector: emp.sector },
      onboarded: emp.onboarded,
      expires_in: Math.floor(SESSION_TTL_MS / 1000),
    });
  } catch (err) {
    console.error('public/portal/activate POST error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 2. Lo MÍO · ficha + capacitaciones + habilitaciones ───────────
//     Espejo de /api/orgchart/mi-perfil resuelto por employee_id (req.eid).
router.get('/me', readLimiter, requirePortalSession, async (req, res) => {
  try {
    const empQ = await query(`
      SELECT e.id, e.full_name, e.email, e.phone, e.sector, e.position, e.hire_date,
             sup.full_name AS supervisor_name
        FROM employees e
        LEFT JOIN employees sup ON sup.id = e.supervisor_id
       WHERE e.id = $1 AND e.is_active = TRUE LIMIT 1`, [req.eid]);
    const employee = empQ.rows[0] || null;
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });

    const profQ = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission,
             jp.responsibilities, jp.authority, jp.objectives, jp.kpis,
             jp.competencies, jp.training_required, jp.training_recommended,
             jp.iso_9001, jp.iso_14001, jp.iso_45001,
             jp.autonomy_level, jp.is_critical, jp.reports_to_role,
             jpe.is_primary, jpe.since
        FROM job_profile_employees jpe
        JOIN job_profiles jp ON jp.id = jpe.profile_id
       WHERE jpe.employee_id = $1 AND jpe.until IS NULL AND jp.is_active = TRUE
       ORDER BY jpe.is_primary DESC, jp.role_label`, [req.eid]);
    const profiles = profQ.rows;

    // Procedimientos de los puestos del empleado (deduplicados) — mismo origen que mi-perfil.
    const procQ = await query(`
      SELECT id, code, title, module, norma, document_id FROM (
        SELECT DISTINCT ON (COALESCE(d.id, p.id))
               COALESCE(d.id, p.id) AS id,
               COALESCE(d.code, p.code) AS code,
               COALESCE(d.title, p.title) AS title,
               COALESCE(d.proceso, p.module) AS module,
               d.norma AS norma, d.id AS document_id
          FROM job_profile_employees jpe
          JOIN job_profile_procedures jpp ON jpp.profile_id = jpe.profile_id
          LEFT JOIN procedures p ON p.id = COALESCE(jpp.fk_procedure_id, jpp.procedure_id)
          LEFT JOIN documents d ON d.id = jpp.document_id
         WHERE jpe.employee_id = $1 AND jpe.until IS NULL
           AND (d.id IS NOT NULL OR p.id IS NOT NULL)
      ) t ORDER BY code`, [req.eid]);
    const procedures = procQ.rows;

    const trainQ = await query(`
      SELECT vets.cap_code, vets.requirement, vets.training_title, vets.training_category,
             vets.recurrence_days, vets.last_attended_at, vets.next_programmed_at, vets.status
        FROM v_employee_training_status vets
       WHERE vets.employee_id = $1
       ORDER BY
         CASE vets.status
           WHEN 'vencida' THEN 1 WHEN 'pendiente' THEN 2
           WHEN 'programada' THEN 3 WHEN 'completada' THEN 4 END,
         CASE vets.requirement WHEN 'obligatoria' THEN 1 ELSE 2 END,
         vets.cap_code`, [req.eid]);
    const training_status = trainQ.rows;

    const certQ = await query(`
      SELECT id, cert_type, cert_name, issued_by, issue_date, expiry_date, status
        FROM employee_certifications
       WHERE employee_id = $1
       ORDER BY expiry_date NULLS LAST, issue_date DESC`, [req.eid]);
    const certifications = certQ.rows;

    const obligatorias = training_status.filter(t => t.requirement === 'obligatoria');
    const compliance = {
      total_requeridas: training_status.length,
      total_obligatorias: obligatorias.length,
      completadas: training_status.filter(t => t.status === 'completada').length,
      vencidas: training_status.filter(t => t.status === 'vencida').length,
      programadas: training_status.filter(t => t.status === 'programada').length,
      pendientes: training_status.filter(t => t.status === 'pendiente').length,
      pct_obligatorias_ok: obligatorias.length === 0 ? 100
        : Math.round((obligatorias.filter(t => t.status === 'completada').length / obligatorias.length) * 100),
    };

    res.json({ ok: true, employee, profiles, procedures, training_status, certifications, compliance });
  } catch (err) {
    console.error('public/portal/me error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 2b. Legajo · self-service (onboarding obligatorio + edición) ──
// Campos que el empleado puede editar de su propio legajo (RRHH maneja el resto).
const SELF_FIELDS = ['birth_date', 'marital_status', 'cuil', 'address', 'phone', 'whatsapp', 'email',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'];
// Mínimos para dar el onboarding por cerrado (Personales + Emergencia; Contacto = phone|whatsapp).
const REQUIRED_ONBOARDING = ['birth_date', 'cuil', 'address', 'marital_status',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'];
const CUIL_RE = /^\d{2}-?\d{7,8}-?\d$/;

function onboardingComplete(e) {
  const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  if (!REQUIRED_ONBOARDING.every(f => has(e[f]))) return false;
  return has(e.phone) || has(e.whatsapp);  // al menos un canal de contacto
}

router.get('/me/legajo', readLimiter, requirePortalSession, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, full_name, sector, position,
              birth_date, marital_status, cuil, address, phone, whatsapp, email,
              emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
              (portal_onboarded_at IS NOT NULL) AS onboarded
         FROM employees WHERE id = $1`, [req.eid]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ ok: true, legajo: rows[0] });
  } catch (err) {
    console.error('public/portal/me/legajo GET error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.patch('/me/legajo', readLimiter, requirePortalSession, async (req, res) => {
  const body = req.body || {};
  if (body.cuil && !CUIL_RE.test(String(body.cuil).trim())) {
    return res.status(400).json({ error: 'CUIL inválido (formato 20-12345678-9)' });
  }
  const sets = [], params = [req.eid];
  for (const f of SELF_FIELDS) if (body[f] !== undefined) {
    params.push(body[f] === '' ? null : body[f]);
    sets.push(`${f} = $${params.length}`);
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin cambios' });
  try {
    const upd = await query(
      `UPDATE employees SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1
       RETURNING birth_date, marital_status, cuil, address, phone, whatsapp, email,
                 emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
                 portal_onboarded_at`, params);
    const e = upd.rows[0];
    let onboarded = e.portal_onboarded_at != null;
    // Cierra el onboarding la primera vez que se completan los mínimos.
    if (!onboarded && onboardingComplete(e)) {
      await query('UPDATE employees SET portal_onboarded_at = NOW() WHERE id = $1', [req.eid]);
      onboarded = true;
    }
    res.json({ ok: true, onboarded, complete: onboardingComplete(e) });
  } catch (err) {
    console.error('public/portal/me/legajo PATCH error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ─── 3. INSTITUCIONAL · organigrama + identidad DASSA ──────────────
router.get('/institucional', readLimiter, requirePortalSession, async (req, res) => {
  try {
    const { rows: nodes } = await query(`
      SELECT id, name, parent_id, type, level, area, description, color, sort_order
        FROM org_chart_nodes WHERE is_active = TRUE
       ORDER BY level, sort_order`);
    const { rows: profiles } = await query(`
      SELECT jp.id, jp.role_label, jp.area, jp.org_node_id,
             COALESCE((SELECT json_agg(json_build_object(
               'full_name', e.full_name, 'is_primary', jpe.is_primary
             ) ORDER BY jpe.is_primary DESC, e.full_name)
                FROM job_profile_employees jpe
                JOIN employees e ON e.id = jpe.employee_id
                WHERE jpe.profile_id = jp.id AND jpe.until IS NULL AND e.is_active = TRUE), '[]'::json) AS employees
        FROM job_profiles jp
       WHERE jp.is_active = TRUE
       ORDER BY jp.area, jp.role_label`);
    const { rows: strategic_docs } = await query(`
      SELECT code, doc_type, title, body_md, metadata
        FROM strategic_documents
       WHERE code IN ('MISION_DASSA','VISION_DASSA','VALORES_DASSA','POLITICA_GESTION_INTEGRADA')
         AND is_active = TRUE
       ORDER BY COALESCE((metadata->>'order')::int, 999), code`);
    res.json({ ok: true, organigrama: { nodes, profiles }, strategic_docs });
  } catch (err) {
    console.error('public/portal/institucional error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── 4. COMUNICACIONES + novedades (con acuse de lectura · ISO 7.3) ─
// Feed del empleado: comunicaciones formales (communications status='enviada', con acuse)
// + novedades informativas (system_announcements vigentes). Hoy las comunicaciones son
// broadcast a todo el personal (recipients aún sin segmentar).
router.get('/me/comunicaciones', readLimiter, requirePortalSession, async (req, res) => {
  try {
    const { rows: comunicaciones } = await query(`
      SELECT c.id, c.code, c.title, c.body_md, c.category, c.norma, c.sent_at, c.attachment_urls,
             (cr.confirmed_at IS NOT NULL) AS leida, cr.confirmed_at
        FROM communications c
        LEFT JOIN communication_reads cr
               ON cr.communication_id = c.id AND cr.employee_id = $1
       WHERE c.status = 'enviada'
       ORDER BY c.sent_at DESC NULLS LAST, c.created_at DESC
       LIMIT 100`, [req.eid]);
    const { rows: novedades } = await query(`
      SELECT id, title, body_md, category, published_at, pinned
        FROM system_announcements
       WHERE (expires_at IS NULL OR expires_at > NOW())
         AND audience IN ('all', 'empleados', 'operarios', 'personal')
       ORDER BY pinned DESC, published_at DESC
       LIMIT 50`);
    const unread = comunicaciones.filter(c => !c.leida).length;
    res.json({ ok: true, comunicaciones, novedades, unread });
  } catch (err) {
    console.error('public/portal/me/comunicaciones error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Confirmar lectura ("leí y entendí") de una comunicación → evidencia ISO 7.3.
router.post('/me/comunicaciones/:id/leer', readLimiter, requirePortalSession, async (req, res) => {
  const id = req.params.id;
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Comunicación inválida' });
  try {
    const { rows: c } = await query(`SELECT id FROM communications WHERE id = $1 AND status = 'enviada'`, [id]);
    if (!c[0]) return res.status(404).json({ error: 'Comunicación no encontrada' });
    await query(`
      INSERT INTO communication_reads (communication_id, employee_id, read_via, read_at, confirmed_at, ip_address, user_agent)
      VALUES ($1, $2, 'portal', NOW(), NOW(), $3, $4)
      ON CONFLICT (communication_id, employee_id) WHERE employee_id IS NOT NULL
      DO UPDATE SET confirmed_at = COALESCE(communication_reads.confirmed_at, NOW())`,
      [id, req.eid, req.ip, (req.get('user-agent') || '').slice(0, 300)]);
    res.json({ ok: true });
  } catch (err) {
    console.error('public/portal/me/comunicaciones leer error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
