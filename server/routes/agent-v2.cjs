// =============================================================================
// DASSA SGI · /api/agent · endpoints del agente unificado
// =============================================================================
const express = require('express');
const { Pool } = require('pg');
const { authenticate, requireRole } = require('../middleware/auth.js');
const sgiAgent = require('../services/sgi-agent.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = express.Router();

router.use(authenticate);

// ─── POST /api/agent/chat ────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requerido (array no vacío)' });
  }
  if (messages.length > 30) return res.status(400).json({ error: 'Máx 30 mensajes' });

  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, role, department FROM users WHERE id = $1', [req.user.id]
    );
    const userContext = rows[0] ? { userId: rows[0].id, ...rows[0] } : { userId: req.user.id };
    const result = await sgiAgent.chat({ messages, userContext });

    // Log async (no bloquea respuesta)
    pool.query(
      `INSERT INTO agent_conversations (user_id, messages, response, tools_used, model, input_tokens, output_tokens, cost_usd, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [req.user.id, JSON.stringify(messages), result.content,
       JSON.stringify(result.tools_used.map(t => t.name)),
       result.model, result.usage.input_tokens, result.usage.output_tokens,
       sgiAgent.estimateCostUSD(result.usage, result.model)]
    ).catch(e => console.warn('[agent/chat] log err:', e.message));

    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[agent/chat]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/agent/config · admin only ─────────────────────────────────────
router.get('/config', requireRole('master_admin','director'), async (req, res) => {
  try {
    const cfg = await sgiAgent.getConfig();
    res.json({ ok: true, config: cfg, all_tools: sgiAgent.ALL_TOOLS.map(t => ({ name: t.name, description: t.description })), defaults: sgiAgent.DEFAULTS });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PATCH /api/agent/config · admin only ───────────────────────────────────
router.patch('/config', requireRole('master_admin','director'), async (req, res) => {
  const updates = req.body || {};
  const ALLOWED = ['assistant_model','assistant_max_tokens','assistant_temperature','assistant_enabled_tools','assistant_system_prompt_extra'];
  try {
    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      if (!ALLOWED.includes(key)) continue;
      const r = await sgiAgent.setConfig(key, value, req.user.id);
      results.push(r);
    }
    res.json({ ok: true, updated: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/agent/stats · admin only ──────────────────────────────────────
router.get('/stats', requireRole('master_admin','director'), async (req, res) => {
  try {
    const stats = await sgiAgent.getStats();
    const { rows: recent } = await pool.query(
      `SELECT c.id, c.created_at, c.model, c.input_tokens, c.output_tokens, c.cost_usd,
              c.tools_used, u.full_name AS user_name, LEFT(c.response, 200) AS preview
         FROM agent_conversations c LEFT JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC LIMIT 10`
    );
    res.json({ ok: true, stats, recent_conversations: recent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
