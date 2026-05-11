// /api/tenants · admin view (solo para vos · master_admin de DASSA)
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('master_admin','director'), async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT t.id, t.slug, t.name, t.industry, t.plan_tier, t.is_active, t.created_at,
             (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) AS num_users,
             (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id) AS num_employees,
             (SELECT COUNT(*) FROM findings WHERE tenant_id = t.id) AS num_findings,
             (SELECT COUNT(*) FROM risks WHERE tenant_id = t.id) AS num_risks
      FROM tenants t ORDER BY t.created_at DESC
    `);
    res.json({ ok: true, tenants: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/features', requireRole('master_admin'), async (req, res) => {
  try {
    const { features, plan_tier } = req.body;
    const updates = [];
    const params = [];
    let i = 1;
    if (features) { params.push(JSON.stringify(features)); updates.push(`features = $${i++}`); }
    if (plan_tier) { params.push(plan_tier); updates.push(`plan_tier = $${i++}`); }
    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, params);
    res.json({ ok: true, tenant: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
