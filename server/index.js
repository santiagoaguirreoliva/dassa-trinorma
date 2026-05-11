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

import authRouter           from './routes/auth.js';
import dashboardRouter      from './routes/dashboard.js';
import findingsRouter       from './routes/findings.js';
import purchasesRouter      from './routes/purchases.js';
import committeeRouter      from './routes/committee.js';
import usersRouter          from './routes/users.js';
import trainingsRouter      from './routes/trainings.js';
import accessRequestsRouter from './routes/accessRequests.js';
import { risksRouter, legalRouter } from './routes/misc.js';
import tasksRouter from './routes/tasks.js';
import { checkOverdueTasks, sendBimonthlyDigest } from './services/email.js';
import { query as dbQuery } from './db/db.js';
import cron from 'node-cron';
import http from 'http';

import documentsRouter      from './routes/documents.js';
import employeesRouter      from './routes/employees.js';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const app = express();
app.set('trust proxy', 1); // detras de Nginx
const PORT = process.env.PORT || 4000;

// ─── Security ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

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
app.use('/api/dashboard',       dashboardRouter);
app.use('/api/findings',        findingsRouter);
app.use('/api/public',          findingsRouter);
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

app.use('/api/tasks',           tasksRouter);
app.use('/api/purchases',       purchasesRouter);
app.use('/api/committee',       committeeRouter);
app.use('/api/trainings',       trainingsRouter);
app.use('/api/access-requests', accessRequestsRouter);
app.use('/api/documents',       documentsRouter);
app.use('/api/employees',       employeesRouter);
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
// Bimonthly digest: 1st and 16th of each month at 08:00 AM Argentina (UTC-3 = 11:00 UTC)
cron.schedule('0 11 1,16 * *', async () => {
  console.log(`[Cron] Running bimonthly digest at ${new Date().toISOString()}`);
  try {
    const result = await sendBimonthlyDigest(dbQuery);
    console.log('[Cron] Bimonthly digest result:', result);
  } catch (err) {
    console.error('[Cron] Bimonthly digest failed:', err.message);
  }
}, { timezone: 'America/Argentina/Buenos_Aires' });

console.log('[Cron] Bimonthly task digest scheduled: 1st & 16th of each month at 08:00 AR');

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.use('/api/auditor', auditorRouter);
app.use('/api/profiles', profilesRouter);

// Start auditor cron
startAuditorScheduler().catch(e => console.error("auditor scheduler error:", e));

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗\n  ║   DASSA SGI — http://localhost:${PORT}    ║\n  ╚══════════════════════════════════════╝`);
});
export default app;


