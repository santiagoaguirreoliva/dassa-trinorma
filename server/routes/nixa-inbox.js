// =============================================================================
// /api/nixa-inbox · bandeja de validación de Nixa (auditor externo)
// Cosas pendientes de validación en el ciclo de revisiones del SGI.
// (Antes vivía dentro de routes/comunicaciones.js; se separó al unificar el
//  módulo de comunicaciones en la app madre.)
// =============================================================================
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

router.get('/', requireRole('auditor_externo', 'master_admin', 'director'), async (req, res) => {
  try {
    const { rows: pendingValidation } = await query(`
      SELECT r.id, r.entity_type, r.status, r.scheduled_for,
             rc.year AS cycle_year,
             CASE WHEN review_is_blocked(r.id) THEN 'esperando_deps' ELSE 'lista' END AS bloqueo
      FROM reviews r
      LEFT JOIN review_cycles rc ON rc.id = r.cycle_id
      WHERE r.validator_id IN (SELECT id FROM users WHERE role::text = 'auditor_externo')
        AND r.status IN ('en_revision','programada','bloqueada')
      ORDER BY (r.status = 'en_revision') DESC, r.scheduled_for NULLS LAST
    `);
    const { rows: counts } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'en_revision') AS para_validar,
        COUNT(*) FILTER (WHERE status = 'programada') AS programadas,
        COUNT(*) FILTER (WHERE status = 'bloqueada') AS bloqueadas,
        COUNT(*) FILTER (WHERE status = 'validada') AS validadas_total
      FROM reviews
      WHERE validator_id IN (SELECT id FROM users WHERE role::text = 'auditor_externo')
    `);
    res.json({ ok: true, items: pendingValidation, summary: counts[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
