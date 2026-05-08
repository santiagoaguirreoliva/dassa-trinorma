// =============================================================================
// DASSA SGI — Auditor IA — Cron semanal (lunes 8 AM AR)
// =============================================================================
const cron = require('node-cron');
const { Pool } = require('pg');
const { generateUserReport, generateAdminInsights, estimateCost } = require('./auditor-anthropic.cjs');
const { buildUserContext, buildGlobalContext } = require('./auditor-context.cjs');
const { sendAuditorReport, sendMail, layout } = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Ejecutar la auditoría completa (todos los usuarios activos).
 * Llamado por el cron O manualmente desde /api/auditor/run-now
 */
async function runFullAudit({ triggeredBy = null, type = 'weekly' } = {}) {
  console.log(`[auditor-cron] Iniciando auditoría tipo=${type}...`);
  let runId = null;

  try {
    // 1. Crear run
    const runRes = await pool.query(
      `INSERT INTO auditor_runs (type, triggered_by, status) VALUES ($1, $2, 'running') RETURNING id`,
      [type, triggeredBy]
    );
    runId = runRes.rows[0].id;

    // 2. Obtener usuarios activos
    const usersQ = await pool.query(
      `SELECT id, email, full_name, role FROM users WHERE is_active = TRUE`
    );
    const users = usersQ.rows;
    console.log(`[auditor-cron] ${users.length} usuarios activos a auditar`);

    let alertsGenerated = 0;
    let reportsGenerated = 0;
    let emailsSent = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const errors = [];

    // 3. Iterar usuarios
    for (const user of users) {
      try {
        const ctx = await buildUserContext(user.id);

        // Si el user no tiene NADA pendiente, skipeamos (ahorra costos)
        const totalItems = ctx.tasks.length + ctx.findings.length + ctx.trainings.length + ctx.legal.length + ctx.documents.length;
        if (totalItems === 0) {
          console.log(`[auditor-cron] ${user.full_name}: sin pendientes, skip`);
          continue;
        }

        // Llamar a la IA
        const report = await generateUserReport(ctx);
        totalTokens += (report._usage.input_tokens + report._usage.output_tokens);
        totalCost += estimateCost(report._usage, report._model);

        // Guardar reporte
        const insertRes = await pool.query(
          `INSERT INTO auditor_reports
           (run_id, user_id, summary, pendientes_total, pendientes_vencidos, capacitaciones_pendientes, ncs_asignadas, riesgo_score, alertas, recommendations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            runId, user.id, report.summary,
            ctx.metrics.tasks_total, ctx.metrics.tasks_overdue,
            ctx.metrics.trainings_pending, ctx.metrics.ncs_open,
            report.riesgo_score || 0,
            JSON.stringify(report.alertas || []),
            report.recommendations || '',
          ]
        );

        reportsGenerated++;
        alertsGenerated += (report.alertas || []).length;

        // Mandar email
        const emailEnabled = await getConfig('auditor_email_enabled');
        if (emailEnabled) {
          const sent = await sendAuditorReport(user, {
            summary: report.summary,
            pendientes_total: ctx.metrics.tasks_total,
            pendientes_vencidos: ctx.metrics.tasks_overdue,
            capacitaciones_pendientes: ctx.metrics.trainings_pending,
            ncs_asignadas: ctx.metrics.ncs_open,
            riesgo_score: report.riesgo_score || 0,
            recommendations: report.recommendations || '',
          });
          if (sent.ok) {
            emailsSent++;
            await pool.query(
              `UPDATE auditor_reports SET email_sent = TRUE, email_sent_at = NOW() WHERE id = $1`,
              [insertRes.rows[0].id]
            );
          }
        }

        // Insertar alertas críticas en auditor_alerts
        for (const alerta of (report.alertas || [])) {
          if (alerta.severity === 'critical' || alerta.severity === 'warning') {
            await pool.query(
              `INSERT INTO auditor_alerts (type, severity, title, message, source_module, affected_user_id)
               VALUES ($1, $2, $3, $4, 'auditor', $5)
               ON CONFLICT DO NOTHING`,
              ['user_audit', alerta.severity, alerta.title, alerta.message, user.id]
            ).catch(() => {});
          }
        }
      } catch (e) {
        console.error(`[auditor-cron] Error con ${user.email}:`, e.message);
        errors.push({ user: user.email, error: e.message });
      }
    }

    // 4. Generar reporte ejecutivo para admin
    try {
      const adminEmail = await getConfig('auditor_admin_email') || 'info@dassa.com.ar';
      const globalCtx = await buildGlobalContext();
      const insights = await generateAdminInsights(globalCtx);
      totalTokens += (insights.usage.input_tokens + insights.usage.output_tokens);
      totalCost += estimateCost(insights.usage);

      await sendMail({
        to: adminEmail,
        subject: `📊 Auditoría TRINORMA semanal — ${new Date().toLocaleDateString('es-AR')}`,
        html: layout({
          title: 'Auditoría semanal del SGI',
          body: `
            <p>El Auditor IA terminó la auditoría semanal:</p>
            <ul>
              <li><strong>${reportsGenerated}</strong> reportes individuales generados</li>
              <li><strong>${emailsSent}</strong> emails enviados a usuarios</li>
              <li><strong>${alertsGenerated}</strong> alertas detectadas</li>
              <li>Costo: <strong>USD $${totalCost.toFixed(4)}</strong></li>
            </ul>
            <h3 style="color:#0F1A4A;margin-top:24px">Análisis ejecutivo</h3>
            <div style="background:#F8F8F8;padding:16px;border-left:4px solid #BF1E2E;line-height:1.65">
              ${insights.content.replace(/\n/g, '<br>')}
            </div>
          `,
          ctaUrl: `${process.env.APP_URL || 'https://trinorma.dassa.com.ar'}/auditor`,
          ctaLabel: 'Ver dashboard del Auditor',
        }),
      });
    } catch (e) {
      console.error('[auditor-cron] Error generando insights admin:', e.message);
    }

    // 5. Cerrar run
    await pool.query(
      `UPDATE auditor_runs SET
        finished_at = NOW(), status = $1, users_audited = $2, alerts_generated = $3,
        reports_generated = $4, emails_sent = $5, total_tokens = $6, total_cost_usd = $7,
        error_msg = $8
      WHERE id = $9`,
      [
        errors.length === 0 ? 'success' : 'partial',
        users.length, alertsGenerated, reportsGenerated, emailsSent,
        totalTokens, totalCost.toFixed(4),
        errors.length > 0 ? JSON.stringify(errors) : null,
        runId,
      ]
    );

    console.log(`[auditor-cron] Auditoría completada. ${reportsGenerated} reportes, ${emailsSent} emails, USD $${totalCost.toFixed(4)}`);
    return { runId, reportsGenerated, emailsSent, totalCost, errors };
  } catch (e) {
    if (runId) {
      await pool.query(`UPDATE auditor_runs SET status = 'failed', error_msg = $1, finished_at = NOW() WHERE id = $2`, [e.message, runId]);
    }
    console.error('[auditor-cron] Error fatal:', e);
    throw e;
  }
}

async function getConfig(key) {
  try {
    const { rows } = await pool.query('SELECT value FROM agent_config WHERE key = $1', [key]);
    return rows.length > 0 ? rows[0].value : null;
  } catch {
    return null;
  }
}

/**
 * Iniciar el scheduler. Lee el cron de agent_config.auditor_cron (default: lunes 8AM AR).
 */
async function startScheduler() {
  const enabled = await getConfig('auditor_enabled');
  if (enabled !== true) {
    console.log('[auditor-cron] Deshabilitado en agent_config.auditor_enabled');
    return;
  }

  const cronExpr = (await getConfig('auditor_cron')) || '0 8 * * 1';
  console.log(`[auditor-cron] Programando para: ${cronExpr} (timezone: America/Argentina/Buenos_Aires)`);

  cron.schedule(cronExpr, async () => {
    console.log('[auditor-cron] Disparando auditoría semanal automática...');
    await runFullAudit({ type: 'weekly' });
  }, { timezone: 'America/Argentina/Buenos_Aires' });
}

module.exports = { runFullAudit, startScheduler };
