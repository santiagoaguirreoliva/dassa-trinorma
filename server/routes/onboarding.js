// /api/onboarding · Fase 7C · self-service de nuevos tenants
import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';

const router = express.Router();

// Endpoint PÚBLICO para que cualquier empresa se registre
router.post('/signup', async (req, res) => {
  const { tenant_name, tenant_slug, industry, admin_email, admin_name, admin_password, plan_tier } = req.body || {};
  if (!tenant_name || !tenant_slug || !admin_email || !admin_password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  try {
    await query('BEGIN');

    // 1) Crear tenant
    const { rows: tRes } = await query(`
      INSERT INTO tenants (slug, name, industry, plan_tier, is_active)
      VALUES ($1, $2, $3, $4, TRUE) RETURNING *
    `, [tenant_slug.toLowerCase().replace(/[^a-z0-9-]/g,'-'), tenant_name, industry || 'otros', plan_tier || 'free']);
    const tenant = tRes[0];

    // 2) Crear admin user
    const passHash = await bcrypt.hash(admin_password, 10);
    const { rows: uRes } = await query(`
      INSERT INTO users (tenant_id, email, full_name, password_hash, role, is_active, position)
      VALUES ($1, $2, $3, $4, 'master_admin'::app_role, TRUE, 'Administrador') RETURNING id, email, full_name
    `, [tenant.id, admin_email, admin_name || admin_email, passHash]);
    const admin = uRes[0];

    // 3) Provisionar template si industry matchea
    let stats = null;
    if (industry === 'logistica' || industry === 'logistica-deposito-fiscal') {
      const { rows: pRes } = await query(`SELECT provision_tenant_from_template($1, 'logistica-deposito-fiscal') AS stats`, [tenant.id]);
      stats = pRes[0].stats;
    } else if (industry === 'fabril') {
      const { rows: pRes } = await query(`SELECT provision_tenant_from_template($1, 'fabril-manufactura') AS stats`, [tenant.id]);
      stats = pRes[0].stats;
    } else if (industry === 'servicios') {
      const { rows: pRes } = await query(`SELECT provision_tenant_from_template($1, 'servicios-profesionales') AS stats`, [tenant.id]);
      stats = pRes[0].stats;
    }

    await query('COMMIT');
    res.status(201).json({ ok: true, tenant, admin, provisioned: stats });
  } catch (e) {
    await query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Slug ya en uso' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT industry_code, industry_name, description,
             jsonb_array_length(job_profiles) AS num_profiles,
             jsonb_array_length(risks) AS num_risks,
             jsonb_array_length(foda) AS num_foda
      FROM industry_templates ORDER BY industry_name
    `);
    res.json({ ok: true, templates: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
