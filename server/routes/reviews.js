// =============================================================================
// DASSA SGI · /api/reviews · Sistema de revisiones encadenadas (DAG)
// =============================================================================
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();
router.use(authenticate);

// ─── GET /api/reviews/cycle/:year · estado completo de un ciclo ─────────────
router.get('/cycle/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { rows: cycle } = await query(
      'SELECT id, year, name, status, opened_at, closed_at FROM review_cycles WHERE year = $1', [year]
    );
    if (!cycle[0]) return res.status(404).json({ error: `Ciclo ${year} no encontrado` });

    const { rows: reviews } = await query(`
      SELECT r.id, r.entity_type, r.status, r.scheduled_for, r.validated_at, r.notes,
             u_rev.full_name AS reviewer_name, u_rev.role AS reviewer_role,
             u_val.full_name AS validator_name,
             rt.sort_order, rt.description AS template_description, rt.depends_on_entity_types,
             review_is_blocked(r.id) AS is_blocked
        FROM reviews r
        LEFT JOIN review_templates rt ON rt.entity_type = r.entity_type
        LEFT JOIN users u_rev ON u_rev.id = r.reviewer_id
        LEFT JOIN users u_val ON u_val.id = r.validator_id
       WHERE r.cycle_id = $1
       ORDER BY rt.sort_order NULLS LAST, r.entity_type
    `, [cycle[0].id]);

    const { rows: deps } = await query(`
      SELECT parent.entity_type AS parent_type, child.entity_type AS child_type,
             parent.id AS parent_id, child.id AS child_id,
             rd.dep_type, parent.status AS parent_status
        FROM review_dependencies rd
        JOIN reviews parent ON parent.id = rd.parent_review_id
        JOIN reviews child  ON child.id = rd.child_review_id
       WHERE parent.cycle_id = $1
    `, [cycle[0].id]);

    res.json({ ok: true, cycle: cycle[0], reviews, dependencies: deps });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/reviews/:id/start · iniciar (programada → en_revision) ──────
router.post('/:id/start', async (req, res) => {
  try {
    const { rows: check } = await query('SELECT can_start, blockers FROM can_start_review($1)', [req.params.id]);
    if (!check[0].can_start) {
      return res.status(409).json({ error: 'Tiene dependencias sin validar', blockers: check[0].blockers });
    }
    const { rows } = await query(`
      UPDATE reviews SET status = 'en_revision', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('programada','bloqueada') RETURNING *
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Review no encontrada o estado no permite iniciar' });
    res.json({ ok: true, review: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/reviews/:id/validate · validar (solo validator) ─────────────
router.post('/:id/validate', async (req, res) => {
  try {
    const { notes, approve = true } = req.body || {};
    const { rows: r } = await query('SELECT validator_id, status FROM reviews WHERE id = $1', [req.params.id]);
    if (!r[0]) return res.status(404).json({ error: 'No encontrada' });
    if (r[0].validator_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el validator asignado puede validar' });
    }
    if (r[0].status !== 'en_revision') {
      return res.status(409).json({ error: `Solo se puede validar una review en estado en_revision (actual: ${r[0].status})` });
    }
    const newStatus = approve ? 'validada' : 'rechazada';
    const { rows: upd } = await query(`
      UPDATE reviews SET status = $2, validated_at = NOW(), validated_by = $3, notes = COALESCE(notes,'') || COALESCE($4, ''),
             updated_at = NOW() WHERE id = $1 RETURNING *
    `, [req.params.id, newStatus, req.user.id, notes ? '\n[validate] ' + notes : '']);
    res.json({ ok: true, review: upd[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/reviews/inbox · qué tengo que hacer yo ───────────────────────
router.get('/inbox', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT r.id, r.entity_type, r.status, r.scheduled_for, rc.year AS cycle_year,
             review_is_blocked(r.id) AS is_blocked,
             CASE
               WHEN r.reviewer_id = $1 AND r.status IN ('programada','en_revision') THEN 'review_pendiente'
               WHEN r.validator_id = $1 AND r.status = 'en_revision' THEN 'validacion_pendiente'
               ELSE 'otro'
             END AS reason
        FROM reviews r LEFT JOIN review_cycles rc ON rc.id = r.cycle_id
       WHERE (r.reviewer_id = $1 OR r.validator_id = $1)
         AND r.status IN ('programada','en_revision','bloqueada')
       ORDER BY r.scheduled_for NULLS LAST, r.created_at DESC
    `, [req.user.id]);
    res.json({ ok: true, items: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
