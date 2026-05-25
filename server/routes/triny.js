// /api/triny · API unificada del agente TRINY (capabilities múltiples)
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

router.get('/info', async (req, res) => {
  try {
    const r = await query(`SELECT key, label, description, icon, enabled, model, service_module, stats_endpoint FROM triny_capabilities ORDER BY key`);
    res.json({
      name: 'TRINY',
      tagline: 'Agente IA del Sistema Trinorma',
      version: '1.0.0',
      personality: 'Trabaja en segundo plano · te avisa lo importante · valida tus cargas · responde dudas',
      status: 'active',
      total_capabilities: r.rowCount,
      enabled_capabilities: r.rows.filter(x => x.enabled).length,
      capabilities: r.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/capabilities/:key', async (req, res) => {
  if (!['master_admin','sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { enabled, model } = req.body || {};
  try {
    const sets = [], params = [req.params.key];
    let i = 2;
    if (typeof enabled === 'boolean') { sets.push(`enabled = $${i++}`); params.push(enabled); }
    if (model)                        { sets.push(`model = $${i++}`);   params.push(model); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
    sets.push('updated_at=NOW()');
    sets.push(`updated_by = $${i++}`); params.push(req.user.id);
    const r = await query(`UPDATE triny_capabilities SET ${sets.join(', ')} WHERE key = $1 RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'capability no existe' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM auditor_runs)         AS auditor_runs_total,
        (SELECT COUNT(*)::int FROM agent_conversations WHERE created_at > NOW() - INTERVAL '7 days') AS chats_last_week,
        (SELECT COALESCE(SUM(cost_usd),0)::numeric(10,4) FROM agent_conversations WHERE created_at > NOW() - INTERVAL '30 days') AS cost_last_month
    `);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message, auditor_runs_total: 0, chats_last_week: 0, cost_last_month: 0 }); }
});

// GET /api/triny/policies · políticas actuales
router.get('/policies', async (req, res) => {
  try {
    const r = await query('SELECT * FROM triny_policies ORDER BY updated_at DESC LIMIT 1');
    res.json(r.rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/triny/jobs · lista de cron jobs configurados
router.get('/jobs', async (req, res) => {
  try {
    const r = await query('SELECT * FROM triny_scheduled_jobs ORDER BY key');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/triny/jobs/:key · toggle enabled/dry_run
router.patch('/jobs/:key', async (req, res) => {
  if (!['master_admin','sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { enabled, dry_run } = req.body || {};
  try {
    const sets = [], params = [req.params.key];
    let i = 2;
    if (typeof enabled === 'boolean') { sets.push(`enabled = $${i++}`); params.push(enabled); }
    if (typeof dry_run === 'boolean') { sets.push(`dry_run = $${i++}`); params.push(dry_run); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
    sets.push('updated_at=NOW()');
    const r = await query(`UPDATE triny_scheduled_jobs SET ${sets.join(', ')} WHERE key = $1 RETURNING *`, params);
    if (r.rowCount === 0) return res.status(404).json({ error: 'job no existe' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/triny/comms-log · log de comunicaciones enviadas
router.get('/comms-log', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const r = await query('SELECT id, job_type, tone, recipient_email, recipient_name, subject, success, error_message, sent_at, meta FROM triny_comms_log ORDER BY sent_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/triny/run-job/:key · ejecuta job manualmente (preview / force)
router.post('/run-job/:key', async (req, res) => {
  if (!['master_admin','sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { force_send } = req.body || {};
  try {
    const { createRequire } = await import('module');
    const reqCjs = createRequire(import.meta.url);
    const mailer = reqCjs('../services/triny-mailer.cjs');
    const fnMap = {
      'recordatorios_lunes': mailer.jobRecordatoriosLunes,
      'resumen_viernes':     mailer.jobResumenViernes,
      'informe_mensual':     mailer.jobInformeMensual,
      'intimacion_vencidas': mailer.jobIntimacionVencidas,
    };
    const fn = fnMap[req.params.key];
    if (!fn) return res.status(404).json({ error: 'job desconocido' });
    const result = await fn({ force: true, force_send: !!force_send });
    res.json(result);
  } catch (e) {
    console.error('[run-job]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/triny/preview/:job · renderiza el HTML de un mail sin enviarlo
// Lee los últimos `triny_comms_log` con job_type=:job en dry_run para mostrar el contenido tal cual saldría.
// Si no hay dry-runs guardados, fuerza un dry-run nuevo y devuelve el primer mail generado.
router.get('/preview/:job', async (req, res) => {
  if (!['master_admin','sgi_leader'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const jobKey = req.params.job;
  if (!['recordatorios_lunes','resumen_viernes','informe_mensual','intimacion_vencidas'].includes(jobKey)) {
    return res.status(404).json({ error: 'job desconocido' });
  }
  try {
    // 1) buscar el último dry-run de ese job; si no hay, forzar uno
    let row = (await query(
      `SELECT recipient_email, recipient_name, subject, body_html, body_text, sent_at
         FROM triny_comms_log
        WHERE job_type=$1 AND subject LIKE '[DRY_RUN]%'
        ORDER BY sent_at DESC LIMIT 1`,
      [jobKey]
    )).rows[0];

    if (!row) {
      const { createRequire } = await import('module');
      const reqCjs = createRequire(import.meta.url);
      const mailer = reqCjs('../services/triny-mailer.cjs');
      const fnMap = {
        'recordatorios_lunes': mailer.jobRecordatoriosLunes,
        'resumen_viernes':     mailer.jobResumenViernes,
        'informe_mensual':     mailer.jobInformeMensual,
        'intimacion_vencidas': mailer.jobIntimacionVencidas,
      };
      await fnMap[jobKey]({ force: true });
      row = (await query(
        `SELECT recipient_email, recipient_name, subject, body_html, body_text, sent_at
           FROM triny_comms_log
          WHERE job_type=$1 AND subject LIKE '[DRY_RUN]%'
          ORDER BY sent_at DESC LIMIT 1`,
        [jobKey]
      )).rows[0];
    }

    if (!row) return res.status(404).json({ error: 'no se pudo generar preview' });

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(row.body_html);
    }
    res.json({
      job: jobKey,
      sample_recipient: row.recipient_email,
      sample_name: row.recipient_name,
      subject: row.subject.replace(/^\[DRY_RUN\]\s*/, ''),
      html: row.body_html,
      text: row.body_text,
      generated_at: row.sent_at,
    });
  } catch (e) {
    console.error('[triny preview]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/triny/policies-doc · sirve el markdown de políticas
router.get('/policies-doc', async (req, res) => {
  try {
    const fs = await import('fs');
    const { join } = await import('path');
    const path = join(process.cwd(), 'server', 'policies', 'POLITICAS_TRINY.md');
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      res.json({ content });
    } else {
      res.status(404).json({ error: 'policies doc not found' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
