import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import 'dotenv/config';

import authRouter          from './routes/auth.js';
import dashboardRouter     from './routes/dashboard.js';
import findingsRouter      from './routes/findings.js';
import purchasesRouter     from './routes/purchases.js';
import committeeRouter     from './routes/committee.js';
import usersRouter         from './routes/users.js';
import accessRequestsRouter from './routes/accessRequests.js';
import { risksRouter, legalRouter, tasksRouter } from './routes/misc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../uploads');
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth',            authRouter);
app.use('/api/dashboard',       dashboardRouter);
app.use('/api/findings',        findingsRouter);
app.use('/api/public',          findingsRouter);
app.use('/api/users',           usersRouter);
app.use('/api/risks',           risksRouter);
app.use('/api/legal',           legalRouter);
app.use('/api/tasks',           tasksRouter);
app.use('/api/purchases',       purchasesRouter);
app.use('/api/committee',       committeeRouter);
app.use('/api/access-requests', accessRequestsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗\n  ║   DASSA SGI — http://localhost:${PORT}    ║\n  ╚══════════════════════════════════════╝`);
});
export default app;
