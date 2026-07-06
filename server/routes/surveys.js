import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth — token-based access)
// ═══════════════════════════════════════════════════════════

// GET /api/surveys/public/:token — get survey for public response
router.get('/public/:token', async (req, res) => {
  try {
    const { rows: [recipient] } = await query(
      `SELECT sr.id AS recipient_id, sr.campaign_id, sr.name AS recipient_name,
              sr.email AS recipient_email, sr.status AS recipient_status,
              sr.evaluator_type, sr.employee_id,
              sc.survey_id, sc.title AS campaign_title, sc.status AS campaign_status, sc.due_date,
              s.title AS survey_title, s.description AS survey_description,
              s.type AS survey_type, s.is_anonymous,
              e.full_name AS employee_name
         FROM survey_recipients sr
         JOIN survey_campaigns sc ON sc.id = sr.campaign_id
         JOIN surveys s ON s.id = sc.survey_id
         LEFT JOIN employees e ON e.id = sr.employee_id
        WHERE sr.token = $1`,
      [req.params.token]
    );
    if (!recipient) return res.status(404).json({ error: 'Encuesta no encontrada' });
    if (recipient.campaign_status !== 'active') {
      return res.status(400).json({ error: 'Esta encuesta ya no está activa' });
    }
    if (recipient.recipient_status === 'completed') {
      return res.status(400).json({ error: 'Ya completaste esta encuesta', already_completed: true });
    }

    // Mark as opened
    await query(
      `UPDATE survey_recipients SET status = 'opened' WHERE token = $1 AND status IN ('pending','sent')`,
      [req.params.token]
    );

    // Get questions
    const { rows: questions } = await query(
      `SELECT id, sort_order, question_text, question_type, options, scale_labels,
              is_required, section
         FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order`,
      [recipient.survey_id]
    );

    res.json({
      recipient_id: recipient.recipient_id,
      campaign_id: recipient.campaign_id,
      survey_title: recipient.survey_title,
      survey_description: recipient.survey_description,
      survey_type: recipient.survey_type,
      is_anonymous: recipient.is_anonymous,
      campaign_title: recipient.campaign_title,
      due_date: recipient.due_date,
      recipient_name: recipient.recipient_name,
      evaluator_type: recipient.evaluator_type,
      employee_name: recipient.employee_name,
      questions
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys/public/:token/respond — submit public response
router.post('/public/:token/respond', async (req, res) => {
  try {
    const { rows: [recipient] } = await query(
      `SELECT sr.id AS recipient_id, sr.campaign_id, sr.status,
              sc.survey_id, sc.status AS campaign_status,
              s.is_anonymous
         FROM survey_recipients sr
         JOIN survey_campaigns sc ON sc.id = sr.campaign_id
         JOIN surveys s ON s.id = sc.survey_id
        WHERE sr.token = $1`,
      [req.params.token]
    );
    if (!recipient) return res.status(404).json({ error: 'Encuesta no encontrada' });
    if (recipient.campaign_status !== 'active') {
      return res.status(400).json({ error: 'Esta encuesta ya no está activa' });
    }
    if (recipient.status === 'completed') {
      return res.status(400).json({ error: 'Ya completaste esta encuesta' });
    }

    const { answers, respondent_name, respondent_email, respondent_company } = req.body;

    // Create response
    const { rows: [response] } = await query(
      `INSERT INTO survey_responses
        (campaign_id, recipient_id, respondent_name, respondent_email, respondent_company,
         is_anonymous, completed_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8) RETURNING id`,
      [
        recipient.campaign_id, recipient.recipient_id,
        recipient.is_anonymous ? null : (respondent_name || null),
        recipient.is_anonymous ? null : (respondent_email || null),
        respondent_company || null,
        recipient.is_anonymous,
        req.ip, req.headers['user-agent']
      ]
    );

    // Insert answers
    if (answers && Array.isArray(answers)) {
      for (const a of answers) {
        await query(
          `INSERT INTO survey_answers (response_id, question_id, answer_value, answer_array)
           VALUES ($1, $2, $3, $4)`,
          [response.id, a.question_id, a.answer_value || null,
           a.answer_array ? JSON.stringify(a.answer_array) : null]
        );
      }
    }

    // Mark recipient as completed
    await query(
      `UPDATE survey_recipients SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [recipient.recipient_id]
    );

    res.json({ message: 'Respuesta registrada correctamente', response_id: response.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════════════════
router.use(authenticate);

// ─── SURVEYS (templates) ─────────────────────────────────

// GET /api/surveys — list all survey templates
router.get('/', async (req, res) => {
  try {
    const { type, target } = req.query;
    let q = `SELECT s.*, u.full_name AS creator_name,
                    (SELECT COUNT(*) FROM survey_questions sq WHERE sq.survey_id = s.id) AS question_count,
                    (SELECT COUNT(*) FROM survey_campaigns sc WHERE sc.survey_id = s.id) AS campaign_count
               FROM surveys s
               LEFT JOIN users u ON u.id = s.created_by
              WHERE s.is_active = true`;
    const params = [];
    let i = 1;
    if (type) { q += ` AND s.type = $${i++}`; params.push(type); }
    if (target) { q += ` AND s.target = $${i++}`; params.push(target); }
    q += ' ORDER BY s.created_at DESC';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/surveys/:id — survey detail with questions
router.get('/:id', async (req, res) => {
  try {
    const { rows: [survey] } = await query(
      `SELECT s.*, u.full_name AS creator_name
         FROM surveys s LEFT JOIN users u ON u.id = s.created_by
        WHERE s.id = $1`, [req.params.id]);
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' });

    const { rows: questions } = await query(
      `SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order`,
      [req.params.id]);

    res.json({ ...survey, questions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys — create survey
router.post('/', async (req, res) => {
  try {
    const { title, description, type, target, frequency, is_anonymous, questions } = req.body;
    if (!title || !type || !target) {
      return res.status(400).json({ error: 'Título, tipo y destinatario son requeridos' });
    }
    const { rows: [survey] } = await query(
      `INSERT INTO surveys (title, description, type, target, frequency, is_anonymous, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description || null, type, target, frequency || 'semestral',
       is_anonymous || false, req.user.id]);

    // Insert questions if provided
    if (questions?.length) {
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        await query(
          `INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [survey.id, idx + 1, q.question_text, q.question_type || 'scale_1_5',
           q.options ? JSON.stringify(q.options) : null,
           q.scale_labels ? JSON.stringify(q.scale_labels) : null,
           q.is_required !== false, q.section || null]);
      }
    }

    res.status(201).json(survey);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/surveys/:id — update survey
router.patch('/:id', async (req, res) => {
  try {
    const ALLOWED = ['title', 'description', 'type', 'target', 'frequency', 'is_anonymous', 'is_active'];
    const updates = []; const values = []; let i = 1;
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    const { rows: [survey] } = await query(
      `UPDATE surveys SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' });
    res.json(survey);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── QUESTIONS ───────────────────────────────────────────

// PUT /api/surveys/:id/questions — replace all questions
router.put('/:id/questions', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Se requiere array de preguntas' });

    await query('DELETE FROM survey_questions WHERE survey_id = $1', [req.params.id]);
    const inserted = [];
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const { rows: [row] } = await query(
        `INSERT INTO survey_questions (survey_id, sort_order, question_text, question_type, options, scale_labels, is_required, section)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.params.id, idx + 1, q.question_text, q.question_type || 'scale_1_5',
         q.options ? JSON.stringify(q.options) : null,
         q.scale_labels ? JSON.stringify(q.scale_labels) : null,
         q.is_required !== false, q.section || null]);
      inserted.push(row);
    }
    res.json(inserted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CAMPAIGNS ───────────────────────────────────────────

// GET /api/surveys/campaigns/all — list all campaigns
router.get('/campaigns/all', async (req, res) => {
  try {
    const { status, survey_id } = req.query;
    let q = `SELECT sc.*, s.title AS survey_title, s.type AS survey_type, s.target AS survey_target,
                    u.full_name AS creator_name,
                    cl.name AS contact_list_name,
                    (SELECT COUNT(*) FROM survey_recipients sr WHERE sr.campaign_id = sc.id) AS recipient_count,
                    (SELECT COUNT(*) FROM survey_recipients sr WHERE sr.campaign_id = sc.id AND sr.status = 'completed') AS completed_count
               FROM survey_campaigns sc
               JOIN surveys s ON s.id = sc.survey_id
               LEFT JOIN users u ON u.id = sc.created_by
               LEFT JOIN contact_lists cl ON cl.id = sc.contact_list_id
              WHERE 1=1`;
    const params = []; let i = 1;
    if (status) { q += ` AND sc.status = $${i++}`; params.push(status); }
    if (survey_id) { q += ` AND sc.survey_id = $${i++}`; params.push(survey_id); }
    q += ' ORDER BY sc.created_at DESC';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/surveys/campaigns/:id — campaign detail with recipients
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { rows: [campaign] } = await query(
      `SELECT sc.*, s.title AS survey_title, s.type AS survey_type, s.target,
              s.is_anonymous, u.full_name AS creator_name
         FROM survey_campaigns sc
         JOIN surveys s ON s.id = sc.survey_id
         LEFT JOIN users u ON u.id = sc.created_by
        WHERE sc.id = $1`, [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });

    const { rows: recipients } = await query(
      `SELECT sr.*, e.full_name AS employee_name
         FROM survey_recipients sr
         LEFT JOIN employees e ON e.id = sr.employee_id
        WHERE sr.campaign_id = $1
        ORDER BY sr.name`, [req.params.id]);

    res.json({ ...campaign, recipients });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys/campaigns — create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { survey_id, title, target_type, contact_list_id, due_date, employee_ids } = req.body;
    if (!survey_id || !title) {
      return res.status(400).json({ error: 'Encuesta y título son requeridos' });
    }

    const { rows: [campaign] } = await query(
      `INSERT INTO survey_campaigns (survey_id, title, target_type, contact_list_id, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [survey_id, title, target_type || 'list', contact_list_id || null,
       due_date || null, req.user.id]);

    // Auto-generate recipients if employee_ids or contact_list provided
    if (target_type === 'employees' && employee_ids?.length) {
      for (const empId of employee_ids) {
        const token = crypto.randomBytes(24).toString('hex');
        const { rows: [emp] } = await query('SELECT full_name, email FROM employees WHERE id = $1', [empId]);
        await query(
          `INSERT INTO survey_recipients (campaign_id, employee_id, email, name, token)
           VALUES ($1,$2,$3,$4,$5)`,
          [campaign.id, empId, emp?.email || null, emp?.full_name || '', token]);
      }
    } else if (target_type === 'individual' && employee_ids?.length) {
      // Performance eval: self + supervisor for each employee
      await query('SELECT type FROM surveys WHERE id = $1', [survey_id]);
      for (const empId of employee_ids) {
        const { rows: [emp] } = await query(
          `SELECT e.full_name, e.email, e.evaluator_id,
                  ev.full_name AS evaluator_name, ev.email AS evaluator_email
             FROM employees e
             LEFT JOIN employees ev ON ev.id = e.evaluator_id
            WHERE e.id = $1`, [empId]);

        // Self-evaluation token
        const selfToken = crypto.randomBytes(24).toString('hex');
        await query(
          `INSERT INTO survey_recipients (campaign_id, employee_id, email, name, token, evaluator_type)
           VALUES ($1,$2,$3,$4,$5,'self')`,
          [campaign.id, empId, emp?.email || null, emp?.full_name || '', selfToken]);

        // Supervisor evaluation token (if has evaluator)
        if (emp?.evaluator_id) {
          const supToken = crypto.randomBytes(24).toString('hex');
          await query(
            `INSERT INTO survey_recipients (campaign_id, employee_id, email, name, token, evaluator_type)
             VALUES ($1,$2,$3,$4,$5,'supervisor')`,
            [campaign.id, empId, emp?.evaluator_email || null,
             `${emp?.evaluator_name || 'Evaluador'} → ${emp?.full_name || ''}`, supToken]);
        }
      }
    } else if (target_type === 'list' && contact_list_id) {
      const { rows: contacts } = await query(
        'SELECT id, name, email FROM contacts WHERE list_id = $1 AND is_active = true',
        [contact_list_id]);
      for (const c of contacts) {
        const token = crypto.randomBytes(24).toString('hex');
        await query(
          `INSERT INTO survey_recipients (campaign_id, contact_id, email, name, token)
           VALUES ($1,$2,$3,$4,$5)`,
          [campaign.id, c.id, c.email || null, c.name || '', token]);
      }
    }

    // Return with recipient count
    const { rows: [result] } = await query(
      `SELECT sc.*,
              (SELECT COUNT(*) FROM survey_recipients WHERE campaign_id = sc.id) AS recipient_count
         FROM survey_campaigns sc WHERE sc.id = $1`, [campaign.id]);
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/surveys/campaigns/:id — update campaign (activate, close, etc.)
router.patch('/campaigns/:id', async (req, res) => {
  try {
    const { status, title, due_date } = req.body;
    const updates = []; const values = []; let i = 1;
    if (status) {
      updates.push(`status = $${i++}`); values.push(status);
      if (status === 'active') { updates.push(`sent_at = COALESCE(sent_at, NOW())`); }
      if (status === 'closed') { updates.push(`closed_at = NOW()`); }
    }
    if (title) { updates.push(`title = $${i++}`); values.push(title); }
    if (due_date !== undefined) { updates.push(`due_date = $${i++}`); values.push(due_date); }
    if (!updates.length) return res.status(400).json({ error: 'Sin campos' });
    updates.push('updated_at = NOW()');
    values.push(req.params.id);
    const { rows: [campaign] } = await query(
      `UPDATE survey_campaigns SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys/campaigns/:id/add-recipients — add recipients manually
router.post('/campaigns/:id/add-recipients', async (req, res) => {
  try {
    const { recipients } = req.body; // [{ name, email, employee_id, evaluator_type }]
    if (!recipients?.length) return res.status(400).json({ error: 'Sin destinatarios' });
    const added = [];
    for (const r of recipients) {
      const token = crypto.randomBytes(24).toString('hex');
      const { rows: [row] } = await query(
        `INSERT INTO survey_recipients (campaign_id, employee_id, contact_id, email, name, token, evaluator_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.id, r.employee_id || null, r.contact_id || null,
         r.email || null, r.name || '', token, r.evaluator_type || null]);
      added.push(row);
    }
    res.status(201).json(added);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── RESULTS / STATISTICS ────────────────────────────────

// GET /api/surveys/campaigns/:id/results — campaign results with stats
router.get('/campaigns/:id/results', async (req, res) => {
  try {
    const { rows: [campaign] } = await query(
      `SELECT sc.*, s.title AS survey_title, s.type AS survey_type,
              s.is_anonymous, s.target
         FROM survey_campaigns sc
         JOIN surveys s ON s.id = sc.survey_id
        WHERE sc.id = $1`, [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });

    // Get questions
    const { rows: questions } = await query(
      `SELECT * FROM survey_questions WHERE survey_id = $1 ORDER BY sort_order`,
      [campaign.survey_id]);

    // Get all responses with answers
    const { rows: responses } = await query(
      `SELECT sr2.*, sr.name AS recipient_name, sr.evaluator_type, sr.employee_id,
              e.full_name AS employee_name
         FROM survey_responses sr2
         LEFT JOIN survey_recipients sr ON sr.id = sr2.recipient_id
         LEFT JOIN employees e ON e.id = sr.employee_id
        WHERE sr2.campaign_id = $1
        ORDER BY sr2.completed_at DESC`,
      [req.params.id]);

    // Get all answers
    const { rows: answers } = await query(
      `SELECT sa.* FROM survey_answers sa
         JOIN survey_responses sr ON sr.id = sa.response_id
        WHERE sr.campaign_id = $1`,
      [req.params.id]);

    // Compute statistics per question
    const stats = questions.map(q => {
      const qAnswers = answers.filter(a => a.question_id === q.id);
      const stat = { question_id: q.id, question_text: q.question_text,
                     question_type: q.question_type, section: q.section,
                     total_answers: qAnswers.length };

      if (['scale_1_5', 'scale_1_10', 'stars_1_5'].includes(q.question_type)) {
        const nums = qAnswers.map(a => parseFloat(a.answer_value)).filter(n => !isNaN(n));
        stat.average = nums.length ? (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2) : null;
        stat.min = nums.length ? Math.min(...nums) : null;
        stat.max = nums.length ? Math.max(...nums) : null;
        // Distribution
        const dist = {};
        nums.forEach(n => { dist[n] = (dist[n] || 0) + 1; });
        stat.distribution = dist;
      } else if (['multiple_choice', 'dropdown', 'yes_no'].includes(q.question_type)) {
        const dist = {};
        qAnswers.forEach(a => { if (a.answer_value) dist[a.answer_value] = (dist[a.answer_value] || 0) + 1; });
        stat.distribution = dist;
      } else if (q.question_type === 'checkbox') {
        const dist = {};
        qAnswers.forEach(a => {
          const arr = a.answer_array || [];
          arr.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
        });
        stat.distribution = dist;
      } else {
        // text answers
        stat.text_answers = qAnswers.map(a => a.answer_value).filter(Boolean);
      }
      return stat;
    });

    // Recipient status summary
    const { rows: recipientStats } = await query(
      `SELECT status, COUNT(*) AS count FROM survey_recipients
        WHERE campaign_id = $1 GROUP BY status`,
      [req.params.id]);

    res.json({
      campaign,
      questions,
      responses,
      stats,
      recipient_summary: recipientStats,
      total_recipients: recipientStats.reduce((s, r) => s + parseInt(r.count), 0),
      total_completed: parseInt(recipientStats.find(r => r.status === 'completed')?.count || 0)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/surveys/campaigns/:id/results/:employeeId — individual employee results (for evals)
router.get('/campaigns/:id/results/:employeeId', async (req, res) => {
  try {
    // Get all recipients for this employee in this campaign
    const { rows: recipients } = await query(
      `SELECT sr.*, e.full_name AS employee_name
         FROM survey_recipients sr
         LEFT JOIN employees e ON e.id = sr.employee_id
        WHERE sr.campaign_id = $1 AND sr.employee_id = $2`,
      [req.params.id, req.params.employeeId]);

    const result = {};
    for (const r of recipients) {
      const { rows: [response] } = await query(
        `SELECT * FROM survey_responses WHERE recipient_id = $1 ORDER BY completed_at DESC LIMIT 1`,
        [r.id]);
      if (response) {
        const { rows: answers } = await query(
          'SELECT * FROM survey_answers WHERE response_id = $1', [response.id]);
        result[r.evaluator_type || 'response'] = { recipient: r, response, answers };
      }
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── EMPLOYEES ───────────────────────────────────────────

// GET /api/surveys/employees — list all employees
router.get('/employees/all', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.*,
              ev.full_name AS evaluator_name,
              ev2.full_name AS secondary_evaluator_name,
              u.email AS user_email, u.full_name AS user_display_name
         FROM employees e
         LEFT JOIN employees ev ON ev.id = e.evaluator_id
         LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
         LEFT JOIN users u ON u.id = e.user_id
        WHERE e.is_active = true
        ORDER BY e.full_name`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/surveys/employees/:id
router.get('/employees/:id', async (req, res) => {
  try {
    const { rows: [emp] } = await query(
      `SELECT e.*,
              ev.full_name AS evaluator_name,
              ev2.full_name AS secondary_evaluator_name,
              u.email AS user_email
         FROM employees e
         LEFT JOIN employees ev ON ev.id = e.evaluator_id
         LEFT JOIN employees ev2 ON ev2.id = e.secondary_evaluator_id
         LEFT JOIN users u ON u.id = e.user_id
        WHERE e.id = $1`, [req.params.id]);
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(emp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// NOTA: los antiguos POST/PATCH /api/surveys/employees (crear/editar la nómina
// sin gate de rol) se retiraron por seguridad — cualquier autenticado podía
// alterar `employees` por la puerta de atrás. El CRUD canónico con requireRole
// (master_admin/director/sgi_leader) vive en routes/employees.js. El front no
// usaba estos endpoints. La lectura GET /employees y /employees/:id de este
// módulo se conserva (solo lectura para el armado de campañas).

// ─── CONTACT LISTS ───────────────────────────────────────

// GET /api/surveys/contact-lists
router.get('/contact-lists/all', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT cl.*,
              (SELECT COUNT(*) FROM contacts c WHERE c.list_id = cl.id AND c.is_active = true) AS contact_count
         FROM contact_lists cl ORDER BY cl.name`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/surveys/contact-lists/:id — with contacts
router.get('/contact-lists/:id', async (req, res) => {
  try {
    const { rows: [list] } = await query('SELECT * FROM contact_lists WHERE id = $1', [req.params.id]);
    if (!list) return res.status(404).json({ error: 'Lista no encontrada' });
    const { rows: contacts } = await query(
      'SELECT * FROM contacts WHERE list_id = $1 AND is_active = true ORDER BY name', [req.params.id]);
    res.json({ ...list, contacts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys/contact-lists — create list
router.post('/contact-lists', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre es requerido' });
    const { rows: [list] } = await query(
      `INSERT INTO contact_lists (name, description, created_by)
       VALUES ($1,$2,$3) RETURNING *`,
      [name, description || null, req.user.id]);
    res.status(201).json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/surveys/contact-lists/:id/contacts — add contacts (single or bulk CSV)
router.post('/contact-lists/:id/contacts', async (req, res) => {
  try {
    const { contacts } = req.body; // [{ name, email, company, phone, notes }]
    if (!contacts?.length) return res.status(400).json({ error: 'Sin contactos' });
    const added = [];
    for (const c of contacts) {
      const { rows: [row] } = await query(
        `INSERT INTO contacts (list_id, name, email, company, phone, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.params.id, c.name || null, c.email || null, c.company || null,
         c.phone || null, c.notes || null]);
      added.push(row);
    }
    res.status(201).json({ added: added.length, contacts: added });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/surveys/contact-lists/:id/contacts/:contactId
router.delete('/contact-lists/:listId/contacts/:contactId', async (req, res) => {
  try {
    await query('UPDATE contacts SET is_active = false WHERE id = $1 AND list_id = $2',
      [req.params.contactId, req.params.listId]);
    res.json({ message: 'Contacto eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
