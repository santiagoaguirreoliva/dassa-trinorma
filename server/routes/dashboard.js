import { Router } from 'express';
import { query } from '../db/db.js';
import { authenticate, requireRole, ADMIN_ROLES } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [findings, risks, legal, trainings, tasks, incidents] = await Promise.all([
      query(`SELECT status, finding_type, due_date FROM findings`),
      query(`SELECT risk_level FROM risks WHERE is_active = true`),
      query(`SELECT expiration_date, alert_days_before FROM legal_requirements WHERE is_active = true`),
      query(`SELECT scheduled_date, status FROM trainings`),
      query(`SELECT status, due_date, assigned_to FROM tasks WHERE assigned_to = $1`, [req.user.id]),
      query(`SELECT status FROM incidents`),
    ]);

    const now = new Date();
    const in30 = new Date(now); in30.setDate(now.getDate() + 30);
    const in90 = new Date(now); in90.setDate(now.getDate() + 90);

    const stats = {
      openFindings: findings.rows.filter(f => f.status !== 'cerrado').length,
      overdueFindings: findings.rows.filter(f =>
        f.status !== 'cerrado' && f.due_date && new Date(f.due_date) < now
      ).length,
      highRisks: risks.rows.filter(r => r.risk_level === 'alto').length,
      mediumRisks: risks.rows.filter(r => r.risk_level === 'medio').length,
      expiringLegal: legal.rows.filter(l => {
        if (!l.expiration_date) return false;
        const d = new Date(l.expiration_date);
        const alertDate = new Date(d);
        alertDate.setDate(d.getDate() - (l.alert_days_before || 90));
        return now >= alertDate && d >= now;
      }).length,
      expiredLegal: legal.rows.filter(l =>
        l.expiration_date && new Date(l.expiration_date) < now
      ).length,
      upcomingTrainings: trainings.rows.filter(t => {
        const d = new Date(t.scheduled_date);
        return t.status === 'programada' && d >= now && d <= in30;
      }).length,
      openIncidents: incidents.rows.filter(i => i.status === 'abierto').length,
      myPendingTasks: tasks.rows.filter(t => t.status !== 'completada' && t.status !== 'cancelada').length,
      myOverdueTasks: tasks.rows.filter(t =>
        t.status !== 'completada' && t.status !== 'cancelada' &&
        t.due_date && new Date(t.due_date) < now
      ).length,
    };
    res.json(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/dashboard/my-tasks
router.get('/my-tasks', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.*, 
              u.full_name as created_by_name,
              f.code as finding_code, f.title as finding_title,
              cm.meeting_date as committee_date
         FROM tasks t
         LEFT JOIN users u ON u.id = t.created_by
         LEFT JOIN findings f ON f.id = t.finding_id
         LEFT JOIN committee_meetings cm ON cm.id = t.committee_id
        WHERE t.assigned_to = $1
          AND t.status NOT IN ('completada', 'cancelada')
        ORDER BY
          CASE t.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
          t.due_date ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// GET /api/dashboard/calendar — próximos 30 días
router.get('/calendar', async (req, res) => {
  try {
    const now = new Date();
    const in60 = new Date(now); in60.setDate(now.getDate() + 60);

    const [trainings, legal, committee, tasks] = await Promise.all([
      query(`SELECT id, title, scheduled_date, training_type, is_mandatory
               FROM trainings
              WHERE scheduled_date BETWEEN $1 AND $2
                AND status = 'programada'
              ORDER BY scheduled_date`, [now, in60]),
      query(`SELECT id, code, title, expiration_date, applicable_area
               FROM legal_requirements
              WHERE expiration_date BETWEEN $1 AND $2
                AND is_active = true
              ORDER BY expiration_date`, [now, in60]),
      query(`SELECT id, meeting_date, status
               FROM committee_meetings
              WHERE meeting_date BETWEEN $1 AND $2
              ORDER BY meeting_date`, [now, in60]),
      query(`SELECT id, title, due_date, priority, status
               FROM tasks
              WHERE assigned_to = $1
                AND due_date BETWEEN $2 AND $3
                AND status NOT IN ('completada','cancelada')
              ORDER BY due_date`, [req.user.id, now, in60]),
    ]);

    res.json({
      trainings: trainings.rows,
      legal: legal.rows,
      committee: committee.rows,
      tasks: tasks.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener calendario' });
  }
});

export default router;

// /api/dashboard/charts · datos agregados para charts del home
router.get('/charts', async (req, res) => {
  try {
    const { query: q } = await import('../db/db.js');
    const r = await Promise.all([
      q(`SELECT COALESCE(npr_level::text, 'sin_evaluar') AS name, COUNT(*) AS value FROM risks WHERE is_active = TRUE GROUP BY npr_level`),
      q(`SELECT COALESCE(status, 'sin estado') AS name, COUNT(*) AS value FROM findings GROUP BY status`),
      q(`SELECT COALESCE(sector, 'sin sector') AS name, COUNT(*) AS value FROM employees WHERE is_active = TRUE GROUP BY sector`),
      q(`SELECT COALESCE(status, 'borrador') AS name, COUNT(*) AS value FROM purchases GROUP BY status`),
      q(`SELECT COALESCE(severity::text, 'sin sev') AS name, COUNT(*) AS value FROM incidents WHERE date >= NOW() - INTERVAL '1 year' GROUP BY severity`),
      q(`SELECT COALESCE(status::text, 'pendiente') AS name, COUNT(*) AS value FROM trainings GROUP BY status`),
    ]);
    res.json({
      ok: true,
      risks_by_level: r[0].rows,
      findings_by_status: r[1].rows,
      employees_by_sector: r[2].rows,
      purchases_by_status: r[3].rows,
      incidents_by_severity: r[4].rows,
      trainings_by_status: r[5].rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;