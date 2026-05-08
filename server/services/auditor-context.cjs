// =============================================================================
// DASSA SGI — Auditor IA — Recolector de contexto por usuario
// Junta TODOS los datos relevantes para auditar a un usuario individual
// =============================================================================
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Recolecta el contexto completo de un usuario para que la IA genere su reporte.
 * Devuelve un objeto con todas las dimensiones: tareas, NCs, capacitaciones, etc.
 */
async function buildUserContext(userId) {
  // Datos básicos del usuario
  const userQ = await pool.query(
    'SELECT id, email, full_name, role, position, department FROM users WHERE id = $1',
    [userId]
  );
  if (userQ.rows.length === 0) throw new Error(`User ${userId} no existe`);
  const user = userQ.rows[0];

  // Tareas pendientes (asignadas como assigned_to o collaborator_id)
  const tasksQ = await pool.query(
    `SELECT id, title, description, status, priority, due_date, source_module, category, iso_norm,
            EXTRACT(DAY FROM (NOW() - created_at))::int AS days_open,
            CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('completada','cancelada') THEN TRUE ELSE FALSE END AS overdue
     FROM tasks
     WHERE (assigned_to = $1 OR collaborator_id = $1)
       AND status NOT IN ('completada', 'cancelada')
     ORDER BY due_date NULLS LAST, priority`,
    [userId]
  );

  // NCs/findings asignadas
  const findingsQ = await pool.query(
    `SELECT id, title, status, severity, area, due_date,
            EXTRACT(DAY FROM (NOW() - created_at))::int AS days_open
     FROM findings
     WHERE assigned_to = $1
       AND status NOT IN ('cerrada', 'verificada', 'cancelada')
     ORDER BY created_at`,
    [userId]
  ).catch(() => ({ rows: [] }));

  // Capacitaciones donde es organizador o participante
  const trainingsQ = await pool.query(
    `SELECT t.id, t.title, t.scheduled_date, t.status, 'organizador' AS role
     FROM trainings t
     WHERE organized_by = $1 AND t.status IN ('programada', 'pendiente')
     UNION ALL
     SELECT t.id, t.title, t.scheduled_date, COALESCE(tp.attended::text, 'pendiente') AS status, 'participante' AS role
     FROM trainings t
     JOIN training_participants tp ON tp.training_id = t.id
     WHERE tp.user_id = $1 AND t.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
     ORDER BY 3
     LIMIT 20`,
    [userId]
  ).catch(() => ({ rows: [] }));

  // Requisitos legales donde es responsable
  const legalQ = await pool.query(
    `SELECT id, title, fecha_vencimiento, status, area
     FROM legal_requirements
     WHERE responsible_id = $1
       AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days')
     ORDER BY fecha_vencimiento NULLS LAST
     LIMIT 30`,
    [userId]
  ).catch(() => ({ rows: [] }));

  // Documentos donde es responsable y necesitan revisión
  const docsQ = await pool.query(
    `SELECT id, title, last_review_date AS last_review, next_review_date
     FROM documents
     WHERE responsible_id = $1
       AND (next_review_date IS NULL OR next_review_date <= CURRENT_DATE + INTERVAL '60 days')
     LIMIT 20`,
    [userId]
  ).catch(() => ({ rows: [] }));

  // Job profile (responsabilidades)
  const profileQ = await pool.query(
    'SELECT role_label, responsibilities, objectives, kpis FROM job_profiles WHERE user_id = $1',
    [userId]
  );

  return {
    user,
    profile: profileQ.rows[0] || null,
    tasks: tasksQ.rows,
    findings: findingsQ.rows,
    trainings: trainingsQ.rows,
    legal: legalQ.rows,
    documents: docsQ.rows,
    metrics: {
      tasks_total: tasksQ.rows.length,
      tasks_overdue: tasksQ.rows.filter(t => t.overdue).length,
      ncs_open: findingsQ.rows.length,
      trainings_pending: trainingsQ.rows.length,
      legal_responsible: legalQ.rows.length,
      docs_to_review: docsQ.rows.length,
    },
  };
}

/**
 * Métricas globales del SGI para el reporte ejecutivo del admin
 */
async function buildGlobalContext() {
  const [ncsOpen, ncsStale, trainingsPending, legal30d, docsOld, tasksOverdue, topOverloaded] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS c FROM findings WHERE status NOT IN ('cerrada','verificada','cancelada')`).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM findings WHERE status NOT IN ('cerrada','verificada','cancelada') AND created_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM trainings WHERE status IN ('programada','pendiente')`).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM legal_requirements WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM documents WHERE last_review_date < NOW() - INTERVAL '18 months'`).catch(() => ({ rows: [{ c: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS c FROM tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('completada','cancelada')`),
    pool.query(`
      SELECT u.full_name AS name, COUNT(t.id)::int AS count
      FROM users u
      JOIN tasks t ON t.assigned_to = u.id
      WHERE t.status NOT IN ('completada','cancelada')
      GROUP BY u.id, u.full_name
      ORDER BY count DESC
      LIMIT 5
    `),
  ]);

  return {
    ncs_open: ncsOpen.rows[0].c,
    ncs_stale: ncsStale.rows[0].c,
    trainings_pending: trainingsPending.rows[0].c,
    legal_30d: legal30d.rows[0].c,
    docs_old: docsOld.rows[0].c,
    tasks_overdue: tasksOverdue.rows[0].c,
    top_overloaded: topOverloaded.rows,
  };
}

module.exports = { buildUserContext, buildGlobalContext };
