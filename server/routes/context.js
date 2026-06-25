import express from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Roles que pueden construir el FODA (CRUD) y homologar el ciclo
const FODA_ADMIN = ['master_admin', 'director', 'sgi_leader'];
const FODA_HOMOLOGA = ['master_admin', 'director'];

// ¿el ciclo está homologado (congelado)? Bloquea edición.
async function cicloHomologado(ciclo) {
  if (!ciclo) return false;
  const { rows } = await query('SELECT estado FROM foda_homologacion WHERE ciclo = $1', [ciclo]);
  return rows[0]?.estado === 'homologado';
}

// ─── FODA (context_analysis) ───────────────────────────────

router.get('/foda', async (req, res) => {
  try {
    const onlyActive = req.query.active === '1' || req.query.active === 'true';
    const { rows } = await query(
      `SELECT ca.*, u.full_name AS created_by_name, vu.full_name AS validated_by_name
         FROM context_analysis ca
         LEFT JOIN users u ON u.id = ca.created_by
         LEFT JOIN users vu ON vu.id = ca.validated_by
        ${onlyActive ? 'WHERE ca.is_active = TRUE' : ''}
        ORDER BY ca.foda_type, ca.order_index`
    );
    // group by type
    const grouped = { fortaleza: [], oportunidad: [], debilidad: [], amenaza: [] };
    for (const r of rows) {
      if (grouped[r.foda_type]) grouped[r.foda_type].push(r);
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/foda', requireRole(...FODA_ADMIN), async (req, res) => {
  const { foda_type, category, description, order_index, vinculo, ciclo } = req.body;
  if (!foda_type || !category || !description) {
    return res.status(400).json({ error: 'foda_type, category y description son requeridos' });
  }
  const cicloFinal = ciclo || '2025-2026';
  if (await cicloHomologado(cicloFinal)) {
    return res.status(423).json({ error: `El FODA del ciclo ${cicloFinal} está homologado (cerrado). Reabrilo para editar.` });
  }
  try {
    const { rows } = await query(
      `INSERT INTO context_analysis (foda_type, category, description, order_index, vinculo, ciclo, is_active, validation_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,'pendiente',$7) RETURNING *`,
      [foda_type, category, description, order_index || 0, vinculo || null, cicloFinal, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/foda/:id', requireRole(...FODA_ADMIN), async (req, res) => {
  const cur = await query('SELECT ciclo FROM context_analysis WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'No encontrado' });
  if (await cicloHomologado(cur.rows[0].ciclo)) {
    return res.status(423).json({ error: `El FODA del ciclo ${cur.rows[0].ciclo} está homologado (cerrado). Reabrilo para editar.` });
  }
  const allowed = ['foda_type', 'category', 'description', 'order_index', 'is_active', 'vinculo', 'ciclo'];
  const sets = []; const vals = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(req.body[f]); }
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE context_analysis SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validar / rechazar un punto del FODA (cierre con NIXA antes de derivar acciones)
router.patch('/foda/:id/validation', async (req, res) => {
  const { status, note } = req.body || {};
  if (!['pendiente', 'validado', 'rechazado'].includes(status)) {
    return res.status(400).json({ error: "status debe ser 'pendiente', 'validado' o 'rechazado'" });
  }
  try {
    const { rows } = await query(
      `UPDATE context_analysis
          SET validation_status = $1, validation_note = $2,
              validated_by = $3, validated_at = NOW(), updated_at = NOW()
        WHERE id = $4 RETURNING *`,
      [status, note || null, req.user.id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/foda/:id', requireRole(...FODA_ADMIN), async (req, res) => {
  try {
    const cur = await query('SELECT ciclo FROM context_analysis WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'No encontrado' });
    if (await cicloHomologado(cur.rows[0].ciclo)) {
      return res.status(423).json({ error: `El FODA del ciclo ${cur.rows[0].ciclo} está homologado (cerrado). Reabrilo para eliminar.` });
    }
    await query('DELETE FROM context_analysis WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Homologación del FODA por ciclo (cierre con fecha) ─────
router.get('/foda/ciclo', async (req, res) => {
  const ciclo = req.query.ciclo || '2025-2026';
  try {
    const { rows } = await query(
      `SELECT h.*, u.full_name AS homologado_by_name,
              (SELECT COUNT(*) FROM context_analysis WHERE ciclo = h.ciclo AND is_active = TRUE)::int AS items,
              (SELECT COUNT(*) FROM context_analysis WHERE ciclo = h.ciclo AND is_active = TRUE AND validation_status = 'validado')::int AS validados,
              (SELECT COUNT(*) FROM context_analysis WHERE ciclo = h.ciclo AND is_active = TRUE AND (validation_status IS NULL OR validation_status = 'pendiente'))::int AS pendientes
         FROM foda_homologacion h LEFT JOIN users u ON u.id = h.homologado_by
        WHERE h.ciclo = $1`, [ciclo]);
    res.json(rows[0] || { ciclo, estado: 'borrador', items: 0, validados: 0, pendientes: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/foda/homologar', requireRole(...FODA_HOMOLOGA), async (req, res) => {
  const ciclo = req.body.ciclo || '2025-2026';
  const nota = req.body.nota || null;
  try {
    const pend = await query(
      "SELECT COUNT(*)::int AS n FROM context_analysis WHERE ciclo = $1 AND is_active = TRUE AND (validation_status IS NULL OR validation_status = 'pendiente')", [ciclo]);
    if (pend.rows[0].n > 0 && !req.body.force) {
      return res.status(409).json({ error: `Quedan ${pend.rows[0].n} ítems sin validar en el ciclo ${ciclo}. Validalos o homologá con force=true.`, pendientes: pend.rows[0].n });
    }
    const { rows } = await query(
      `INSERT INTO foda_homologacion (ciclo, estado, homologado_at, homologado_by, nota, updated_at)
       VALUES ($1,'homologado',NOW(),$2,$3,NOW())
       ON CONFLICT (ciclo) DO UPDATE SET estado='homologado', homologado_at=NOW(), homologado_by=$2, nota=$3, updated_at=NOW()
       RETURNING *`, [ciclo, req.user.id, nota]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/foda/reabrir', requireRole(...FODA_HOMOLOGA), async (req, res) => {
  const ciclo = req.body.ciclo || '2025-2026';
  try {
    const { rows } = await query(
      `UPDATE foda_homologacion SET estado='borrador', homologado_at=NULL, homologado_by=NULL, updated_at=NOW()
        WHERE ciclo = $1 RETURNING *`, [ciclo]);
    if (!rows.length) return res.status(404).json({ error: 'Ciclo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STRATEGIES (context_strategies) ────────────────────────

router.get('/strategies', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cs.*, u.full_name AS responsible_name
         FROM context_strategies cs
         LEFT JOIN users u ON u.id = cs.responsible_id
        ORDER BY cs.strategy_type, cs.created_at`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/strategies', async (req, res) => {
  const { strategy_type, name, description, actions, deadline, responsible_id, status } = req.body;
  if (!strategy_type || !name) {
    return res.status(400).json({ error: 'strategy_type y name son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO context_strategies (strategy_type, name, description, actions, deadline, responsible_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [strategy_type, name, description || '', JSON.stringify(actions || []), deadline || null, responsible_id || null, status || 'planned']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/strategies/:id', async (req, res) => {
  const allowed = ['strategy_type', 'name', 'description', 'actions', 'deadline', 'responsible_id', 'status'];
  const sets = []; const vals = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${i++}`);
      vals.push(f === 'actions' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE context_strategies SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/strategies/:id', async (req, res) => {
  try {
    await query('DELETE FROM context_strategies WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STAKEHOLDERS (partes interesadas) ──────────────────────

router.get('/stakeholders', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM stakeholders ORDER BY stakeholder_type, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stakeholders', async (req, res) => {
  const { name, stakeholder_type, category, needs_expectations, influence_level } = req.body;
  if (!name || !stakeholder_type) {
    return res.status(400).json({ error: 'name y stakeholder_type son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO stakeholders (name, stakeholder_type, category, needs_expectations, influence_level)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, stakeholder_type, category || null, needs_expectations || '', influence_level || 'medio']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/stakeholders/:id', async (req, res) => {
  const allowed = ['name', 'stakeholder_type', 'category', 'needs_expectations', 'influence_level', 'is_active'];
  const sets = []; const vals = []; let i = 1;
  for (const f of allowed) {
    if (req.body[f] !== undefined) { sets.push(`${f} = $${i++}`); vals.push(req.body[f]); }
  }
  if (!sets.length) return res.status(400).json({ error: 'Sin campos' });
  vals.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE stakeholders SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/stakeholders/:id', async (req, res) => {
  try {
    await query('DELETE FROM stakeholders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
