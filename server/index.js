import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const authExtraRouter = require('./routes/auth-extra.cjs');
const usersExtraRouter = require('./routes/users-extra.cjs');
const auditorRouter = require('./routes/auditor.cjs');
const tasksMineRouter = require('./routes/tasks-mine.cjs');
const profilesRouter = require('./routes/profiles.cjs');

const { startScheduler: startAuditorScheduler } = require('./services/auditor-cron.cjs');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import 'dotenv/config';

import bienvenidaRouter from './routes/bienvenida.js';
import trinyRouter from './routes/triny.js';
import authRouter           from './routes/auth.js';
import ssoRouter            from './routes/sso.js';  // SSO Smart DASSA Apps
import publicNcRouter       from './routes/public-nc.js';  // router público dedicado (H-06)
import publicChecklistRouter from './routes/public-checklist.js';  // checklist maquinaria QR+PIN
import dashboardRouter      from './routes/dashboard.js';
import findingsRouter       from './routes/findings.js';
import purchasesRouter      from './routes/purchases.js';
import committeeRouter      from './routes/committee.js';
import usersRouter          from './routes/users.js';
import trainingsRouter      from './routes/trainings.js';
import accessRequestsRouter from './routes/accessRequests.js';
import { risksRouter, legalRouter } from './routes/misc.js';
import tasksRouter from './routes/tasks.js';
import inspectionsRouter from './routes/inspections.js';  // Módulo Ronda de Inspecciones
import { runInspectionsDaily } from './services/inspections-generator.js';
import { buildWeeklyRollup } from './services/inspections-rollup.js';
import { busRouter } from './agent-bus.js';
import { checkOverdueTasks, sendBimonthlyDigest } from './services/email.js';
import { query as dbQuery } from './db/db.js';
import cron from 'node-cron';

// CRON · TRINY mailer jobs (recordatorios lunes, resumen viernes, informe mensual, intimacion diaria)
(async () => {
  try {
    const { createRequire: cr } = await import('module');
    const reqCjs = cr(import.meta.url);
    const trinyMailer = reqCjs('./services/triny-mailer.cjs');

    cron.schedule('0 8 * * 1', async () => {
      try { const r = await trinyMailer.jobRecordatoriosLunes(); console.log('[triny] recordatorios lunes:', r.users_processed); } catch (e) { console.error('[triny lunes]', e.message); }
    }, { timezone: 'America/Argentina/Buenos_Aires' });

    cron.schedule('0 16 * * 5', async () => {
      try { const r = await trinyMailer.jobResumenViernes(); console.log('[triny] resumen viernes:', r.recipients); } catch (e) { console.error('[triny viernes]', e.message); }
    }, { timezone: 'America/Argentina/Buenos_Aires' });

    cron.schedule('0 9 1 * *', async () => {
      try { const r = await trinyMailer.jobInformeMensual(); console.log('[triny] informe mensual:', r.recipients); } catch (e) { console.error('[triny mensual]', e.message); }
    }, { timezone: 'America/Argentina/Buenos_Aires' });

    cron.schedule('0 10 * * *', async () => {
      try { const r = await trinyMailer.jobIntimacionVencidas(); console.log('[triny] intimacion:', r.users_with_overdue); } catch (e) { console.error('[triny intim]', e.message); }
    }, { timezone: 'America/Argentina/Buenos_Aires' });

    console.log('[triny] 4 cron jobs registrados (recordatorios L 8h · resumen V 16h · informe 1d 9h · intim diario 10h)');
  } catch (e) { console.error('[triny cron setup]', e.message); }
})();

// CRON · Ronda de Inspecciones — genera instancias del período + marca vencidas (diario 06:00 AR)
if (process.env.CRON_DISABLED !== '1') {
  cron.schedule('0 6 * * *', async () => {
    try { await runInspectionsDaily(); }
    catch (e) { console.error('[rondas-cron]', e.message); }
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  // Rollup semanal: lunes 06:30 procesa los checks de la semana anterior.
  // Alimenta el informe mensual de Triny (jobInformeMensual).
  cron.schedule('30 6 * * 1', async () => {
    try {
      const ref = new Date(); ref.setDate(ref.getDate() - 7);
      await buildWeeklyRollup(ref);
    } catch (e) { console.error('[rondas-rollup]', e.message); }
  }, { timezone: 'America/Argentina/Buenos_Aires' });

  console.log('[rondas] crons registrados (instancias diario 06h · rollup semanal L 06:30)');
}

// CRON · Informe mensual de NC y desvíos (Triny) — día 1, 08:00 AR
cron.schedule('0 8 1 * *', async () => {
  try {
    const { createRequire: cr } = await import('module');
    const reqCjs = cr(import.meta.url);
    const findingsReport = reqCjs('./services/findings-report.cjs');
    const out = await findingsReport.sendMonthlyFindingsReport();
    console.log('[findings] informe mensual de NC enviado:', out.recipients, '·', out.period);
  } catch (e) { console.error('[findings informe mensual]', e.message); }
}, { timezone: 'America/Argentina/Buenos_Aires' });

// CRON · Recordatorios de capacitaciones próximas — diario, 07:00 AR
cron.schedule('0 7 * * *', async () => {
  try {
    const { createRequire: cr } = await import('module');
    const reqCjs = cr(import.meta.url);
    const tr = reqCjs('./services/trainings-reminders.cjs');
    const r = await tr.runTrainingReminders();
    console.log('[trainings] recordatorios:', JSON.stringify(r));
  } catch (e) { console.error('[trainings recordatorios]', e.message); }
}, { timezone: 'America/Argentina/Buenos_Aires' });

// CRON · Recordatorios de verificación de eficacia de NC — diario, 09:00 AR
cron.schedule('0 9 * * *', async () => {
  try {
    const { createRequire: cr } = await import('module');
    const reqCjs = cr(import.meta.url);
    const reminders = reqCjs('./services/findings-reminders.cjs');
    const r = await reminders.runEfficacyReminders();
    console.log('[findings] recordatorios de eficacia:', JSON.stringify(r));
  } catch (e) { console.error('[findings recordatorios eficacia]', e.message); }
}, { timezone: 'America/Argentina/Buenos_Aires' });

// Cron OLA 5 · Wake-up notifications cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  try {
    const { createRequire: cr } = await import('module');
    const reqCjs = cr(import.meta.url);
    const { generateWakeUpAlerts } = reqCjs('./services/ai-quality.cjs');
    const stats = await generateWakeUpAlerts();
    console.log('[wake-up]', stats);
  } catch (e) { console.error('[wake-up] err:', e.message); }
});
import http from 'http';

import documentsRouter      from './routes/documents.js';
import employeesRouter      from './routes/employees.js';
import agentsRouter         from './routes/agents.js';
import environmentalRouter  from './routes/environmental.js';
import incidentsRouter      from './routes/incidents.js';
// satisfactionRouter removed — unified into surveys module
import sistemaGestionRouter from './routes/sistema-gestion.js';
import suppliersRouter      from './routes/suppliers.js';
import contextRouter        from './routes/context.js';
import bibliotecaRouter     from './routes/biblioteca.js';
import surveysRouter        from './routes/surveys.js';
// import agentRouter (legacy Ollama/Gemini) archivado en _archive/
import agentV2Router from "./routes/agent-v2.js";
import reviewsRouter from './routes/reviews.js';
import orgchartRouter from './routes/orgchart.js';
import { objectivesRouter, changesRouter, proceduresRouter, risksAmfeRouter } from './routes/sgi-modules.js';
import nixaInboxRouter from './routes/nixa-inbox.js';
import aiQualityRouter from './routes/ai-quality.js';
import calendarNixaRouter from './routes/calendar-nixa.js';
import tenantsAdminRouter from './routes/tenants-admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const app = express();
app.set('trust proxy', 1); // detras de Nginx
const PORT = process.env.PORT || 4000;

// ─── Security ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://trinorma.dassa.com.ar', 'https://api.anthropic.com', 'https://generativelanguage.googleapis.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn('[CORS] origen rechazado:', origin);
    return cb(null, false);
  },
  credentials: true,
}));

// Body parsers (CRITICO: antes de cualquier router que lea req.body)
app.use(busRouter()); // Bus de Agentes — antes del JSON parser (HMAC sobre el body crudo)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Demasiados intentos de login. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: 'Demasiadas solicitudes de acceso. Esperá 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes. Esperá unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);
app.use('/api/auth', authExtraRouter);
app.use('/api/users', usersExtraRouter);

app.use('/uploads', express.static(UPLOADS_DIR));

// Apply specific rate limiters
app.use('/api/auth/login', loginLimiter);
app.use('/api/access-requests', registerLimiter);


// ─── UGC One Proxy ───────────────────────────────────────────
// Redirige ugcone.pymetech.com.ar → localhost:3001
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host === 'ugcone.pymetech.com.ar') {
    // Clonar headers sin content-length (lo recalculamos si hay body)
    const headers = { ...req.headers, host: 'localhost:3001' };
    delete headers['content-length'];

    const opts = {
      hostname: 'localhost',
      port: 3001,
      path: req.url,
      method: req.method,
      headers,
    };
    const pr = http.request(opts, (ps) => {
      Object.entries(ps.headers).forEach(([k, v]) => {
        try { if (k !== 'transfer-encoding') res.setHeader(k, v); } catch(e) {}
      });
      res.writeHead(ps.statusCode);
      ps.pipe(res, { end: true });
    });
    pr.on('error', (e) => {
      console.error('[ugcone-proxy] error:', e.message);
      if (!res.headersSent) res.status(502).send('UGC One no disponible');
    });
    // express.json() ya consumio el body — reenviarlo manualmente si existe
    if (req.body !== undefined && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyStr = JSON.stringify(req.body);
      const buf = Buffer.from(bodyStr, 'utf8');
      pr.setHeader('content-type', 'application/json');
      pr.setHeader('content-length', buf.length);
      pr.write(buf);
      pr.end();
    } else {
      req.pipe(pr, { end: true });
    }
    return;
  }
  next();
});
// ─────────────────────────────────────────────────────────────

app.use('/api/auth',            authRouter);
app.use('/api/sso',             ssoRouter);  // SSO Smart DASSA Apps (app madre)
app.use('/api/bienvenida',     bienvenidaRouter);
app.use('/api/triny',          trinyRouter);
app.use('/api/dashboard',       dashboardRouter);
app.use('/api/findings',        findingsRouter);
app.use('/api/public',          publicNcRouter);  // solo POST /nc — desacoplado del findingsRouter (H-06)
app.use('/api/public/checklist', publicChecklistRouter);  // checklist maquinaria QR+PIN
app.use('/api/users',           usersRouter);
app.use('/api/risks',           risksRouter);
app.use('/api/legal',           legalRouter);
// Digest & notification endpoints (before tasksRouter to avoid auth middleware)
app.post('/api/tasks/send-digest', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const result = await sendBimonthlyDigest(dbQuery);
    res.json({ message: 'Resumen quincenal enviado', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/tasks',           tasksMineRouter);  // primero, para /mine antes que /:id
app.use('/api/tasks',           tasksRouter);
app.use('/api/inspections',     inspectionsRouter);  // Módulo Ronda de Inspecciones
app.use('/api/purchases',       purchasesRouter);
app.use('/api/committee',       committeeRouter);
app.use('/api/trainings',       trainingsRouter);
app.use('/api/access-requests', accessRequestsRouter);
app.use('/api/documents',       documentsRouter);
app.use('/api/employees',       employeesRouter);
app.use('/api/agents',          agentsRouter);
app.use('/api/environmental',   environmentalRouter);
app.use('/api/incidents',       incidentsRouter);
// /api/satisfaction removed — unified into /api/surveys
app.use('/api/sistema-gestion', sistemaGestionRouter);
app.use('/api/suppliers',       suppliersRouter);
app.use('/api/context',         contextRouter);
app.use('/api/biblioteca',      bibliotecaRouter);
app.use('/api/surveys',         surveysRouter);
app.use('/api/agent', agentV2Router);
app.use('/api/reviews', reviewsRouter);
app.use('/api/orgchart', orgchartRouter);
app.use('/api/objetivos', objectivesRouter);
app.use('/api/cambios', changesRouter);
app.use('/api/procedimientos', proceduresRouter);
app.use('/api/riesgos-amfe', risksAmfeRouter);
app.use('/api/nixa-inbox', nixaInboxRouter);
app.use('/api/ai-quality', aiQualityRouter);
app.use('/api/calendar', calendarNixaRouter);
app.use('/api/tenants', tenantsAdminRouter);
app.use('/api/auditor', auditorRouter);
app.use('/api/profiles', profilesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// Email notification check endpoint (can be called by cron or manually)
app.post('/api/tasks/check-notifications', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const result = await checkOverdueTasks(dbQuery);
    res.json({ message: 'Notificaciones procesadas', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Scheduled tasks ─────────────────────────────────────────────
// El digest quincenal de tareas (email.js) se desactivó: el seguimiento de
// tareas por correo lo centraliza Triny — recordatorio lunes, resumen viernes,
// intimación diaria de vencidas e informe mensual. Los endpoints manuales
// /api/tasks/send-digest y /api/tasks/check-notifications siguen disponibles.

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      } else if (/\.(js|css|woff2?|ttf|svg|png|jpg|webp|ico)$/.test(filePath)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Error handler — debe ir al final, después de todos los routers y del catch-all SPA
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start auditor cron
startAuditorScheduler().catch(e => console.error("auditor scheduler error:", e));

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗\n  ║   DASSA SGI — http://localhost:${PORT}    ║\n  ╚══════════════════════════════════════╝`);
});
export default app;


