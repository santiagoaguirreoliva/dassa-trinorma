import express from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ─── FODA (context_analysis) ───────────────────────────────

router.get('/foda', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ca.*, u.full_name AS created_by_name
         FROM context_analysis ca
         LEFT JOIN users u ON u.id = ca.created_by
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

router.post('/foda', async (req, res) => {
  const { foda_type, category, description, order_index } = req.body;
  if (!foda_type || !category || !description) {
    return res.status(400).json({ error: 'foda_type, category y description son requeridos' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO context_analysis (foda_type, category, description, order_index, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [foda_type, category, description, order_index || 0, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/foda/:id', async (req, res) => {
  const allowed = ['foda_type', 'category', 'description', 'order_index', 'is_active'];
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

router.delete('/foda/:id', async (req, res) => {
  try {
    await query('DELETE FROM context_analysis WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
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
