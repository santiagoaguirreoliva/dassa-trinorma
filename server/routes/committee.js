import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Contexto canónico DEPOFIS/DASSA — fuente única: dassa4/docs/DEPOFIS-AGENT-CONTEXT.md
// (redistribuir con dassa4/docs/distribuir-depofis-context.sh tras editarlo).
function loadDepofisContext() {
  const candidates = [
    process.env.DEPOFIS_CONTEXT_PATH,
    '/home/dassa/dassa4/apps/sgi/DEPOFIS-AGENT-CONTEXT.md',
    '/home/dassa/dassa4/docs/DEPOFIS-AGENT-CONTEXT.md',
  ].filter(Boolean);
  for (const p of candidates) {
    try { return readFileSync(p, 'utf8').trim(); } catch { /* probar siguiente */ }
  }
  return '';
}
const DEPOFIS_CONTEXT = loadDepofisContext();

// GET /api/committee
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cm.*, u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM committee_tasks ct WHERE ct.meeting_id = cm.id)::int AS tasks_count,
              (SELECT COUNT(*) FROM committee_tasks ct WHERE ct.meeting_id = cm.id AND ct.status = 'completada')::int AS tasks_done
         FROM committee_meetings cm
         LEFT JOIN users u ON u.id = cm.created_by
        ORDER BY cm.meeting_date DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/committee/:id
// GET /api/committee/pending-alive · todas las tareas vivas (pendiente/en_curso) del módulo comité
router.get('/pending-alive', async (req, res) => {
  try {
    const r = await query(`
      SELECT t.id, t.task_number, t.title, t.description, t.status, t.priority, t.due_date,
             t.committee_id, cm.meeting_date::date AS origin_meeting_date,
             COALESCE((SELECT json_agg(json_build_object('id',u.id,'name',u.full_name,'role',ta.role))
                       FROM task_assignees ta JOIN users u ON u.id=ta.user_id
                       WHERE ta.task_id=t.id),'[]'::json) AS assignees
      FROM tasks t
      LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
      WHERE t.source_module='committee' AND t.status IN ('pendiente','en_curso')
      ORDER BY cm.meeting_date NULLS FIRST, t.task_number
    `);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cm.*, u.full_name AS created_by_name
         FROM committee_meetings cm LEFT JOIN users u ON u.id = cm.created_by
        WHERE cm.id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const { rows: tasks } = await query(
      `SELECT ct.*, u.full_name AS responsible_name
         FROM committee_tasks ct LEFT JOIN users u ON u.id = ct.responsible_id
        WHERE ct.meeting_id = $1 ORDER BY ct.created_at`,
      [req.params.id]
    );
    res.json({ ...rows[0], tasks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/committee
router.post('/', async (req, res) => {
  const { meeting_date, attendees, agenda, location, next_meeting_date, meeting_number } = req.body;
  if (!meeting_date) return res.status(400).json({ error: 'Fecha requerida' });
  try {
    const yr = new Date(meeting_date).getFullYear();
    const mo = new Date(meeting_date).getMonth() + 1;
    const { rows } = await query(
      `INSERT INTO committee_meetings
         (meeting_date, year, month, attendees, agenda, location, next_meeting_date, meeting_number, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'programada') RETURNING *`,
      [meeting_date, yr, mo, attendees || [], agenda || null,
       location || 'DASSA — Sarandi', next_meeting_date || null, meeting_number || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/committee/:id
router.patch('/:id', async (req, res) => {
  const FIELDS = ['meeting_date','attendees','agenda','minutes','location',
    'next_meeting_date','status','meeting_number'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE committee_meetings SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/committee/:id/process-ai
router.post('/:id/process-ai', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT minutes, meeting_date FROM committee_meetings WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Reunión no encontrada' });
    if (!rows[0].minutes?.trim()) return res.status(400).json({ error: 'Cargá el acta antes de procesar con IA' });

    const { rows: users } = await query('SELECT id, full_name FROM users WHERE is_active = true');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada. Agregala al .env del servidor.' });

    const prompt = `Sos un asistente del Sistema de Gestión Integrado de DASSA (depósito fiscal en Argentina).
Analizá el acta del Comité Mixto de Higiene y Seguridad y hacé DOS cosas:

1. RESUMEN EJECUTIVO: 3-5 oraciones sobre los principales temas tratados.

2. EXTRACCIÓN DE TAREAS: Todas las tareas, compromisos y acciones pendientes.
Para cada tarea:
- description: descripción clara de la tarea
- responsible_text: nombre exacto como aparece en el acta
- due_date: fecha límite formato YYYY-MM-DD (null si no hay)
- priority: "alta" si es urgente/seguridad/legal, "media" para el resto

Personas del sistema:
${users.map(u => `- ${u.full_name}`).join('\n')}

Respondé SOLO con JSON válido sin markdown:
{"summary":"...","tasks":[{"description":"...","responsible_text":"...","due_date":"YYYY-MM-DD o null","priority":"alta o media"}]}

ACTA:
${rows[0].minutes}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        ...(DEPOFIS_CONTEXT ? { system: [{ type: 'text', text: DEPOFIS_CONTEXT, cache_control: { type: 'ephemeral' } }] } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'La IA no respondió' });

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (parseErr) {
      console.error('AI JSON parse error:', parseErr.message, 'Raw:', text.substring(0, 200));
      return res.status(500).json({ error: 'No se pudo parsear la respuesta de la IA' });
    }
    // Validar estructura esperada
    if (!parsed || typeof parsed.summary !== 'string') {
      return res.status(500).json({ error: 'La IA devolvio una estructura inesperada (falta summary)' });
    }
    if (!Array.isArray(parsed.tasks)) {
      parsed.tasks = [];
    }

    // Matching nombre → user_id
    const matchUser = (name) => {
      if (!name) return null;
      const nl = name.toLowerCase();
      return users.find(u =>
        u.full_name.toLowerCase().includes(nl.split(' ')[0]) ||
        nl.includes(u.full_name.toLowerCase().split(' ')[0])
      )?.id || null;
    };

    // Guardar resumen
    await query(
      `UPDATE committee_meetings SET ai_summary=$1, ai_processed=true, ai_tasks_extracted=$2 WHERE id=$3`,
      [parsed.summary, JSON.stringify(parsed.tasks), req.params.id]
    );

    // Limpiar tareas IA anteriores e insertar nuevas
    await query(`DELETE FROM committee_tasks WHERE meeting_id=$1 AND source='ai_extracted'`, [req.params.id]);

    const insertedTasks = [];
    for (const t of (parsed.tasks || [])) {
      const rid = matchUser(t.responsible_text);
      const { rows: ct } = await query(
        `INSERT INTO committee_tasks (meeting_id, title, responsible_id, due_date, priority, source, status)
         VALUES ($1,$2,$3,$4,$5,'ai_extracted','pendiente') RETURNING *`,
        [req.params.id, t.description, rid, t.due_date || null, t.priority || 'media']
      );
      insertedTasks.push({ ...ct[0], responsible_name: users.find(u => u.id === rid)?.full_name, responsible_text: t.responsible_text });

      // Notificar responsable
      if (rid) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, source_module) VALUES ($1,$2,$3,'info','committee')`,
          [rid, `Tarea del Comité: ${t.description.substring(0,60)}`,
           `Reunión ${new Date(rows[0].meeting_date).toLocaleDateString('es-AR')}`]
        );
      }
    }

    res.json({ summary: parsed.summary, tasks: insertedTasks, tasks_count: insertedTasks.length });
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/committee/:id/tasks
router.post('/:id/tasks', async (req, res) => {
  const { title, responsible_id, due_date, priority, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Título requerido' });
  try {
    const { rows } = await query(
      `INSERT INTO committee_tasks (meeting_id, title, description, responsible_id, due_date, priority, source, status)
       VALUES ($1,$2,$3,$4,$5,$6,'manual','pendiente') RETURNING *`,
      [req.params.id, title, description || null, responsible_id || null, due_date || null, priority || 'media']
    );
    if (responsible_id) {
      await query(
        `INSERT INTO tasks (title, committee_id, assigned_to, due_date, source_module, created_by)
         VALUES ($1,$2,$3,$4,'committee',$5)`,
        [title, req.params.id, responsible_id, due_date || null, req.user.id]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/committee/:id/tasks/:tid
router.patch('/:id/tasks/:tid', async (req, res) => {
  const { status, title, due_date, responsible_id, priority } = req.body;
  const updates = []; const values = []; let i = 1;
  if (status !== undefined)        { updates.push(`status=$${i++}`);        values.push(status); }
  if (title !== undefined)         { updates.push(`title=$${i++}`);         values.push(title); }
  if (due_date !== undefined)      { updates.push(`due_date=$${i++}`);      values.push(due_date); }
  if (responsible_id !== undefined){ updates.push(`responsible_id=$${i++}`);values.push(responsible_id); }
  if (priority !== undefined)      { updates.push(`priority=$${i++}`);      values.push(priority); }
  if (status === 'completada')     { updates.push(`completed_at=$${i++}`);  values.push(new Date()); }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.tid);
  try {
    const { rows } = await query(`UPDATE committee_tasks SET ${updates.join(',')} WHERE id=$${i} RETURNING *`, values);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── WIZARD: crear nueva reunión + traer pendientes anteriores ─────────────
// POST /api/committee/wizard
router.post('/wizard', async (req, res) => {
  const { meeting_date, location, attendees, topics_discussed, preamble, new_tasks } = req.body || {};
  if (!meeting_date || !Array.isArray(attendees) || attendees.length === 0) {
    return res.status(400).json({ error: 'meeting_date y attendees requeridos' });
  }
  const client = await req.app.locals.pool?.connect() || (await import('pg').then(m => new m.Pool({connectionString: process.env.DATABASE_URL}).connect()));
  try {
    await client.query('BEGIN');
    // Crear reunión
    const d = new Date(meeting_date);
    const r = await client.query(
      `INSERT INTO committee_meetings (meeting_date, year, month, attendees, location, status, topics_discussed, preamble, created_by, ai_processed)
       VALUES ($1,$2,$3,$4,$5,'programada',$6,$7,$8,false) RETURNING id`,
      [meeting_date, d.getFullYear(), d.getMonth()+1, attendees, location || 'DASSA Sarandí', JSON.stringify(topics_discussed || []), preamble || null, req.user.id]
    );
    const meetingId = r.rows[0].id;

    // Insertar new_tasks (cada una con responsables múltiples)
    let inserted = 0;
    for (const nt of (new_tasks || [])) {
      if (!nt.title || !Array.isArray(nt.assignees) || nt.assignees.length === 0) continue;
      const ins = await client.query(
        `INSERT INTO tasks (title, description, status, priority, due_date, source_module, committee_id, created_by, origin_type, observations)
         VALUES ($1,$2,'pendiente',$3,$4,'committee',$5,$6,'comite',$7) RETURNING id`,
        [nt.title.substring(0,500), nt.description || null, nt.priority || 'media', nt.due_date || null, meetingId, req.user.id, nt.observations || null]
      );
      const tid = ins.rows[0].id;
      for (let i=0; i<nt.assignees.length; i++) {
        await client.query(
          "INSERT INTO task_assignees (task_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [tid, nt.assignees[i], i===0 ? 'principal' : 'colaborador']
        );
      }
      await client.query("UPDATE tasks SET assigned_to=$1 WHERE id=$2", [nt.assignees[0], tid]);
      if (nt.assignees[1]) await client.query("UPDATE tasks SET collaborator_id=$1 WHERE id=$2", [nt.assignees[1], tid]);
      inserted++;
    }
    await client.query('COMMIT');
    res.json({ ok: true, meeting_id: meetingId, tasks_inserted: inserted });
  } catch (e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('[wizard]', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// GET /api/committee/:id/pending-from-previous · lista de tasks vivas que vienen de reuniones anteriores
router.get('/:id/pending-from-previous', async (req, res) => {
  try {
    const m = await query('SELECT meeting_date FROM committee_meetings WHERE id=$1', [req.params.id]);
    if (m.rowCount === 0) return res.status(404).json({ error: 'meeting not found' });
    const _meetingDate = m.rows[0].meeting_date;
    const r = await query(`
      SELECT t.id, t.task_number, t.title, t.description, t.status, t.priority, t.due_date,
             t.committee_id, cm.meeting_date AS origin_meeting_date,
             COALESCE((SELECT json_agg(json_build_object('id',u.id,'name',u.full_name,'role',ta.role))
                       FROM task_assignees ta JOIN users u ON u.id=ta.user_id
                       WHERE ta.task_id=t.id),'[]'::json) AS assignees
      FROM tasks t
      LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
      WHERE t.source_module='committee'
        AND t.status IN ('pendiente','en_curso')
        -- todas las vivas, sin filtrar por meeting
      ORDER BY cm.meeting_date NULLS FIRST, t.task_number
    `, [req.params.id]);
    res.json(r.rows);
  } catch (e) {
    console.error('[pending-from-previous]', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/committee/:id/close-with-signature · cerrar reunión con firma digital
router.patch('/:id/close-with-signature', async (req, res) => {
  try {
    const m = await query('SELECT signatures, attendees FROM committee_meetings WHERE id=$1', [req.params.id]);
    if (m.rowCount === 0) return res.status(404).json({ error: 'meeting not found' });
    const sigs = m.rows[0].signatures || [];
    const userR = await query('SELECT email, full_name FROM users WHERE id=$1', [req.user.id]);
    const u = userR.rows[0];
    if (sigs.find(s => s.user_id === req.user.id)) {
      return res.status(400).json({ error: 'Ya firmaste esta reunión' });
    }
    sigs.push({
      user_id: req.user.id, email: u.email, name: u.full_name,
      signed_at: new Date().toISOString(),
      ip: req.ip, user_agent: req.get('user-agent')
    });
    await query('UPDATE committee_meetings SET signatures=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(sigs), req.params.id]);
    // Si firmaron TODOS los asistentes registrados, marcar como cerrada
    const attendees = m.rows[0].attendees || [];
    const allSigned = attendees.every(a => sigs.find(s => s.name && (a.includes(s.name) || s.name.includes(a))));
    if (allSigned) {
      await query("UPDATE committee_meetings SET status='cerrada', closed_at=NOW() WHERE id=$1", [req.params.id]);
    }
    res.json({ ok: true, signatures_count: sigs.length, all_signed: allSigned });
  } catch (e) {
    console.error('[close-sig]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/committee/:id/full · meeting + tareas creadas + heredadas + firmas
router.get('/:id/full', async (req, res) => {
  try {
    const m = await query('SELECT * FROM committee_meetings WHERE id=$1', [req.params.id]);
    if (m.rowCount === 0) return res.status(404).json({ error: 'meeting not found' });
    const tasks = await query(`
      SELECT t.id, t.task_number, t.title, t.status, t.priority, t.due_date,
             COALESCE((SELECT json_agg(json_build_object('id',u.id,'name',u.full_name))
                       FROM task_assignees ta JOIN users u ON u.id=ta.user_id
                       WHERE ta.task_id=t.id),'[]'::json) AS assignees
      FROM tasks t
      WHERE t.committee_id=$1 ORDER BY t.task_number
    `, [req.params.id]);
    res.json({ meeting: m.rows[0], tasks: tasks.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



// ═══════════════════════════════════════════════════════════════════
// ACTA VIVA · puntos discretos de la reunión (committee_agenda_items)
// Se guarda punto por punto para no perder progreso durante la reunión.
// ═══════════════════════════════════════════════════════════════════

// GET /api/committee/:id/agenda · puntos del acta
router.get('/:id/agenda', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ai.*, u.full_name AS created_by_name
         FROM committee_agenda_items ai
         LEFT JOIN users u ON u.id = ai.created_by
        WHERE ai.meeting_id = $1
        ORDER BY ai.orden, ai.created_at`, [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/committee/:id/agenda · agregar un punto
router.post('/:id/agenda', async (req, res) => {
  const { tipo, texto, orden } = req.body || {};
  try {
    const ord = Number.isFinite(orden) ? orden : (await query(
      'SELECT COALESCE(MAX(orden),0)+1 AS n FROM committee_agenda_items WHERE meeting_id=$1',
      [req.params.id])).rows[0].n;
    const { rows } = await query(
      `INSERT INTO committee_agenda_items (meeting_id, tipo, texto, orden, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, tipo || 'nuevo', texto || '', ord, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/committee/:id/agenda/:itemId · editar/resolver punto (autosave)
router.patch('/:id/agenda/:itemId', async (req, res) => {
  const FIELDS = ['tipo', 'texto', 'resuelto', 'orden'];
  const updates = []; const values = []; let i = 1;
  for (const f of FIELDS) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  values.push(req.params.itemId);
  try {
    const { rows } = await query(
      `UPDATE committee_agenda_items SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/committee/:id/agenda/:itemId
router.delete('/:id/agenda/:itemId', async (req, res) => {
  try {
    await query('DELETE FROM committee_agenda_items WHERE id=$1 AND meeting_id=$2',
      [req.params.itemId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// TAREAS EN VIVO · escriben en `tasks` (fuente de verdad) + task_assignees
// Permite crear/actualizar tareas DURANTE la reunión (no solo en el wizard).
// ═══════════════════════════════════════════════════════════════════

// POST /api/committee/:id/live-task · crear tarea con multi-responsable
router.post('/:id/live-task', async (req, res) => {
  const { title, assignees, due_date, priority, description, origin_detail } = req.body || {};
  if (!title || !Array.isArray(assignees) || assignees.length === 0) {
    return res.status(400).json({ error: 'title y al menos un responsable (assignees) requeridos' });
  }
  try {
    const ins = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, source_module, committee_id, created_by, origin_type, origin_detail, assigned_to, collaborator_id)
       VALUES ($1,$2,'pendiente',$3,$4,'committee',$5,$6,'comite',$7,$8,$9) RETURNING id, task_number`,
      [title.substring(0, 500), description || null, priority || 'media', due_date || null,
       req.params.id, req.user.id, origin_detail || null, assignees[0], assignees[1] || null]);
    const tid = ins.rows[0].id;
    for (let i = 0; i < assignees.length; i++) {
      await query(
        'INSERT INTO task_assignees (task_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [tid, assignees[i], i === 0 ? 'principal' : 'colaborador']);
    }
    res.status(201).json({ id: tid, task_number: ins.rows[0].task_number });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/committee/:id/live-task/:tid · actualizar tarea (status de pendientes anteriores, etc.)
router.patch('/:id/live-task/:tid', async (req, res) => {
  const { status, title, due_date, priority } = req.body || {};
  const updates = []; const values = []; let i = 1;
  if (status !== undefined)   { updates.push(`status=$${i++}`);   values.push(status); }
  if (title !== undefined)    { updates.push(`title=$${i++}`);    values.push(title); }
  if (due_date !== undefined) { updates.push(`due_date=$${i++}`); values.push(due_date); }
  if (priority !== undefined) { updates.push(`priority=$${i++}`); values.push(priority); }
  if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
  updates.push('updated_at=NOW()');
  values.push(req.params.tid);
  try {
    const { rows } = await query(`UPDATE tasks SET ${updates.join(',')} WHERE id=$${i} RETURNING id, status`, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrada' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CONTEXTO de la reunión · lo que hay que revisar este mes
// NC/desvíos abiertos · capacitaciones del mes (+vencidas) · objetivos+mediciones
// ═══════════════════════════════════════════════════════════════════
router.get('/:id/context', async (req, res) => {
  try {
    const m = await query('SELECT meeting_date FROM committee_meetings WHERE id=$1', [req.params.id]);
    if (!m.rows[0]) return res.status(404).json({ error: 'meeting not found' });
    const md = m.rows[0].meeting_date;

    const findings = await query(
      `SELECT code, title, status, finding_type, due_date, area
         FROM findings
        WHERE status <> 'cerrado' AND deleted_at IS NULL
        ORDER BY due_date NULLS LAST, created_at DESC
        LIMIT 50`);

    const trainings = await query(
      `SELECT title, status, scheduled_date, category, is_mandatory
         FROM trainings
        WHERE scheduled_date IS NOT NULL
          AND date_trunc('month', scheduled_date) = date_trunc('month', $1::date)
        ORDER BY scheduled_date`, [md]);

    const overdue = await query(
      `SELECT COUNT(*)::int AS n FROM v_employee_training_status WHERE status = 'vencida'`);

    const objectives = await query(
      `SELECT o.code, o.name, o.area, o.target_value, oi.unit, oi.target_value AS ind_target,
              (SELECT json_build_object('period', mm.period, 'value', mm.value)
                 FROM objective_measurements mm
                WHERE mm.indicator_id = oi.id
                  AND date_part('year', mm.period) = date_part('year', CURRENT_DATE)
                ORDER BY mm.period DESC LIMIT 1) AS last_measurement
         FROM objectives o
         LEFT JOIN LATERAL (
           SELECT * FROM objective_indicators WHERE objective_id = o.id ORDER BY created_at LIMIT 1
         ) oi ON TRUE
        WHERE o.year = date_part('year', CURRENT_DATE)::int AND o.status = 'activo'
        ORDER BY o.code`);

    res.json({
      findings: findings.rows,
      trainings: trainings.rows,
      trainings_overdue: overdue.rows[0]?.n || 0,
      objectives: objectives.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// RESUMEN POR MAIL · al cerrar la reunión se envía a toda Trinorma
// ═══════════════════════════════════════════════════════════════════

// Helper: arma {subject, html} del resumen de una reunión
async function buildSummaryEmail(meetingId, { tag } = {}) {
  const m = (await query('SELECT * FROM committee_meetings WHERE id=$1', [meetingId])).rows[0];
  if (!m) return null;
  const items = (await query(
    'SELECT tipo, texto, resuelto FROM committee_agenda_items WHERE meeting_id=$1 ORDER BY orden, created_at', [meetingId])).rows;
  const tasks = (await query(`
    SELECT t.task_number, t.title, t.due_date,
           COALESCE((SELECT string_agg(u.full_name, ', ') FROM task_assignees ta JOIN users u ON u.id=ta.user_id WHERE ta.task_id=t.id),
                    (SELECT full_name FROM users WHERE id=t.assigned_to)) AS resp
      FROM tasks t WHERE t.committee_id=$1 ORDER BY t.task_number`, [meetingId])).rows;

  const fdate = new Date(m.meeting_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const TIPO_LBL = { pendiente: 'Pendiente anterior', nuevo: 'Tema nuevo', nc: 'NC / Desvío', capacitacion: 'Capacitación', medicion: 'Medición / Objetivo', auditoria: 'Auditoría', otro: 'Otro' };
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let body = `<p style="margin:0 0 12px"><strong>Fecha:</strong> ${fdate}<br><strong>Lugar:</strong> ${esc(m.location)}<br><strong>Asistentes:</strong> ${(m.attendees || []).map(esc).join(', ') || '—'}</p>`;
  if (m.preamble) body += `<p style="margin:0 0 12px;color:#555">${esc(m.preamble)}</p>`;
  if (items.length) {
    body += `<h3 style="color:#C8202C;margin:18px 0 6px">Puntos tratados</h3><ul style="margin:0;padding-left:18px">`;
    for (const it of items) body += `<li style="margin-bottom:6px"><strong>[${TIPO_LBL[it.tipo] || it.tipo}]</strong> ${esc(it.texto)}${it.resuelto ? ' <span style="color:#16a34a">✓ resuelto</span>' : ''}</li>`;
    body += `</ul>`;
  }
  if (tasks.length) {
    body += `<h3 style="color:#C8202C;margin:18px 0 6px">Tareas y compromisos (${tasks.length})</h3>`;
    body += `<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f3f4f6"><th align="left" style="padding:6px">#</th><th align="left" style="padding:6px">Tarea</th><th align="left" style="padding:6px">Responsable</th><th align="left" style="padding:6px">Vence</th></tr>`;
    for (const t of tasks) body += `<tr style="border-bottom:1px solid #eee"><td style="padding:6px;color:#888">${esc(t.task_number)}</td><td style="padding:6px">${esc(t.title)}</td><td style="padding:6px">${esc(t.resp) || '—'}</td><td style="padding:6px">${t.due_date ? new Date(t.due_date).toLocaleDateString('es-AR') : '—'}</td></tr>`;
    body += `</table>`;
  }
  if (!items.length && !tasks.length) body += `<p style="color:#888"><em>La reunión no registró puntos ni tareas.</em></p>`;
  body += `<p style="margin-top:16px;font-size:12px;color:#888">Cada responsable tiene sus tareas en <strong>Mis Pendientes</strong> de la app TRINORMA.</p>`;
  body += `<p style="margin-top:18px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#999">📋 Acta cerrada y firmada digitalmente por <strong>TRINY</strong> · Agente IA del SGI, en nombre del Comité Mixto de DASSA · ${new Date().toLocaleString('es-AR')}</p>`;

  const { createRequire } = await import('module');
  const reqCjs = createRequire(import.meta.url);
  const mailer = reqCjs('../services/mailer.cjs');
  const subject = `[Comité Mixto] Resumen de la reunión del ${fdate}${tag ? ` ${tag}` : ''}`;
  const html = mailer.layout
    ? mailer.layout({ title: 'Resumen · Comité Mixto', body, ctaUrl: (process.env.APP_URL || 'https://trinorma.dassa.com.ar') + '/committee/' + meetingId, ctaLabel: 'Ver la reunión en TRINORMA' })
    : `<h2>Resumen Comité Mixto</h2>${body}`;
  return { mailer, subject, html, fdate };
}

async function recipientsAll() {
  return (await query("SELECT email FROM users WHERE is_active=true AND email IS NOT NULL AND email <> ''")).rows.map(r => r.email);
}

// POST /:id/send-summary · { test:true } previsualiza al que dispara; sino a toda Trinorma
router.post('/:id/send-summary', async (req, res) => {
  const test = !!(req.body && req.body.test);
  try {
    const built = await buildSummaryEmail(req.params.id, { tag: test ? '(PRUEBA)' : '' });
    if (!built) return res.status(404).json({ error: 'meeting not found' });
    const recipients = test ? [req.user.email] : await recipientsAll();
    if (!recipients.length) return res.status(400).json({ error: 'Sin destinatarios con email' });
    await built.mailer.sendMail({ to: recipients.join(', '), subject: built.subject, html: built.html });
    if (!test) await query('UPDATE committee_meetings SET summary_sent_at=NOW(), summary_sent_count=$1, updated_at=NOW() WHERE id=$2', [recipients.length, req.params.id]);
    res.json({ ok: true, test, sent_to: recipients.length });
  } catch (e) {
    console.error('[send-summary]', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /:id/close-and-sign · TRINY firma y cierra la reunión + envía el resumen a toda Trinorma
router.post('/:id/close-and-sign', async (req, res) => {
  try {
    const m = (await query('SELECT signatures FROM committee_meetings WHERE id=$1', [req.params.id])).rows[0];
    if (!m) return res.status(404).json({ error: 'meeting not found' });
    const sigs = m.signatures || [];
    // Firma del agente TRINY (en nombre del comité), conservando quién la disparó
    sigs.push({
      agent: true, name: 'TRINY · Agente IA del SGI', role: 'agente_sgi',
      signed_at: new Date().toISOString(),
      triggered_by: req.user.full_name, triggered_by_id: req.user.id,
      note: 'Cierre del acta y notificación a Trinorma',
    });
    const built = await buildSummaryEmail(req.params.id, {});
    const recipients = await recipientsAll();
    if (recipients.length) await built.mailer.sendMail({ to: recipients.join(', '), subject: built.subject, html: built.html });
    await query(
      `UPDATE committee_meetings
          SET signatures=$1, status='cerrada', closed_at=NOW(),
              summary_sent_at=NOW(), summary_sent_count=$2, updated_at=NOW()
        WHERE id=$3`,
      [JSON.stringify(sigs), recipients.length, req.params.id]);
    res.json({ ok: true, closed: true, signed_by: 'TRINY', sent_to: recipients.length });
  } catch (e) {
    console.error('[close-and-sign]', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
