// =============================================================================
// DASSA SGI — Auditor IA — API endpoints
// Se monta en: app.use('/api/auditor', auditorRouter)
// =============================================================================
const express = require('express');
const { Pool } = require('pg');
const { runFullAudit } = require('../services/auditor-cron.cjs');
const { generateUserReport, chat: aiChat } = require('../services/auditor-anthropic.cjs');
const { buildUserContext, buildGlobalContext } = require('../services/auditor-context.cjs');
const { buildContext: ragContext, listDocuments, ingestDocument, softDeleteDocument } = require('../services/auditor-rag.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'master_admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

// ─── POST /api/auditor/run-now (admin) ────────────────────────────────────────
router.post('/run-now', requireAdmin, async (req, res) => {
  try {
    // Disparar en background (no esperar)
    runFullAudit({ triggeredBy: req.user.id, type: 'manual' })
      .then(r => console.log('[auditor] Run manual completado:', r))
      .catch(e => console.error('[auditor] Run manual falló:', e));

    res.json({ ok: true, message: 'Auditoría iniciada en background. Revisá /api/auditor/runs en unos minutos.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/auditor/run-for-user/:id ──────────────────────────────────────
// Genera y guarda reporte de UN usuario individual (sincrónico, espera respuesta IA)
router.post('/run-for-user/:id', async (req, res) => {
  // El propio user puede pedir su reporte; el admin puede pedir el de cualquiera
  if (req.user.role !== 'master_admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  try {
    const ctx = await buildUserContext(req.params.id);
    const report = await generateUserReport(ctx);

    // Guardar como un mini-run
    const runRes = await pool.query(
      `INSERT INTO auditor_runs (type, triggered_by, status, finished_at, users_audited, reports_generated)
       VALUES ('user', $1, 'success', NOW(), 1, 1) RETURNING id`,
      [req.user.id]
    );
    await pool.query(
      `INSERT INTO auditor_reports
       (run_id, user_id, summary, pendientes_total, pendientes_vencidos, capacitaciones_pendientes, ncs_asignadas, riesgo_score, alertas, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        runRes.rows[0].id, req.params.id, report.summary,
        ctx.metrics.tasks_total, ctx.metrics.tasks_overdue,
        ctx.metrics.trainings_pending, ctx.metrics.ncs_open,
        report.riesgo_score || 0,
        JSON.stringify(report.alertas || []),
        report.recommendations || '',
      ]
    );

    res.json({ report, context_metrics: ctx.metrics });
  } catch (e) {
    console.error('[auditor/run-for-user] error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/auditor/runs ───────────────────────────────────────────────────
router.get('/runs', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, type, started_at, finished_at, users_audited, reports_generated, emails_sent,
            alerts_generated, status, total_cost_usd
     FROM auditor_runs ORDER BY started_at DESC LIMIT 50`
  );
  res.json(rows);
});

// ─── GET /api/auditor/reports/:userId ────────────────────────────────────────
router.get('/reports/:userId', async (req, res) => {
  if (req.user.role !== 'master_admin' && req.user.id !== req.params.userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { rows } = await pool.query(
    `SELECT id, run_id, summary, riesgo_score, pendientes_total, pendientes_vencidos,
            ncs_asignadas, alertas, recommendations, email_sent, created_at
     FROM auditor_reports
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [req.params.userId]
  );
  res.json(rows);
});

// ─── GET /api/auditor/my-latest-report ───────────────────────────────────────
router.get('/my-latest-report', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, summary, riesgo_score, pendientes_total, pendientes_vencidos,
            ncs_asignadas, alertas, recommendations, created_at
     FROM auditor_reports
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.user.id]
  );
  res.json(rows[0] || null);
});

// ─── GET /api/auditor/alerts ─────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  const { severity, resolved } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (severity) { params.push(severity); where += ` AND severity = $${params.length}`; }
  if (resolved !== undefined) { params.push(resolved === 'true'); where += ` AND resolved = $${params.length}`; }
  const { rows } = await pool.query(
    `SELECT * FROM auditor_alerts ${where} ORDER BY created_at DESC LIMIT 100`,
    params
  );
  res.json(rows);
});

// ─── POST /api/auditor/alerts/:id/resolve ────────────────────────────────────
router.post('/alerts/:id/resolve', async (req, res) => {
  await pool.query(
    'UPDATE auditor_alerts SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1 WHERE id = $2',
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
});

// ─── GET /api/auditor/insights ───────────────────────────────────────────────
router.get('/insights', requireAdmin, async (req, res) => {
  try {
    const ctx = await buildGlobalContext();
    res.json(ctx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/auditor/chat ──────────────────────────────────────────────────
// Chat especializado con el agente Auditor TRINORMA (con RAG)
router.post('/chat', async (req, res) => {
  const { messages, use_rag = true } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array requerido' });
  }
  try {
    const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const rag = use_rag ? await ragContext(lastUserMsg) : '';

    const result = await aiChat({ messages, ragContext: rag });

    // Log la conversación en agent_conversations
    const sessionId = req.body.session_id || `auditor-${req.user.id}-${Date.now()}`;
    for (const m of messages.slice(-2)) { // último user + skip
      if (m.role === 'user') {
        await pool.query(
          `INSERT INTO agent_conversations (user_id, session_id, role, content, model)
           VALUES ($1, $2, 'user', $3, 'claude-auditor')`,
          [req.user.id, sessionId, m.content]
        );
      }
    }
    await pool.query(
      `INSERT INTO agent_conversations (user_id, session_id, role, content, model, tokens_used)
       VALUES ($1, $2, 'assistant', $3, $4, $5)`,
      [req.user.id, sessionId, result.content, result.model, (result.usage.input_tokens + result.usage.output_tokens)]
    );

    res.json({ content: result.content, session_id: sessionId, usage: result.usage });
  } catch (e) {
    console.error('[auditor/chat] error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── KNOWLEDGE BASE (RAG) ────────────────────────────────────────────────────

router.get('/knowledge', requireAdmin, async (req, res) => {
  try {
    const docs = await listDocuments({ category: req.query.category });
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/knowledge', requireAdmin, async (req, res) => {
  try {
    const doc = await ingestDocument({
      ...req.body,
      uploaded_by: req.user.id,
    });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/knowledge/:id', requireAdmin, async (req, res) => {
  await softDeleteDocument(req.params.id);
  res.json({ ok: true });
});

router.get('/knowledge/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q requerido' });
  const { search } = require('../services/auditor-rag.cjs');
  const results = await search(q, { limit: parseInt(req.query.limit || '10', 10) });
  res.json(results);
});

module.exports = router;
