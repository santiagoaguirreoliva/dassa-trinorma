import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

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

export default router;
