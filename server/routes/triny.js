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

export default router;
