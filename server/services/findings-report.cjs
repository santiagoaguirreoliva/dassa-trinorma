// =============================================================================
// DASSA SGI — Informe mensual de No Conformidades / Desvíos (Triny)
// Recolecta el tratamiento de las NC del mes, lo hace analizar por la IA y
// envía el informe por correo al equipo de calidad. Cron: día 1, 08:00 AR.
// =============================================================================
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const mailer = require('./mailer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MODEL = process.env.FINDINGS_AI_MODEL || 'claude-sonnet-4-5';
const APP_URL = process.env.APP_URL || 'https://trinorma.dassa.com.ar';
const REPORT_TO = (process.env.FINDINGS_ALERT_TO || 'maria@dassa.com.ar,santiago@dassa.com.ar')
  .split(',').map(s => s.trim()).filter(Boolean);

const TYPE_LABEL = {
  nc_real: 'NC Reales', nc_potencial: 'NC Potenciales',
  mejora: 'Oportunidades de Mejora', desvio_cliente: 'Desvíos de Cliente',
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = require('./llm-meter.cjs').meterClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), require('path').basename(__filename, '.cjs'));
  return _client;
}

function esc(s) {
  return String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

// ── Recolección de datos del mes anterior ───────────────────────
async function collectData() {
  // [from, to) = mes calendario anterior completo
  const { rows: per } = await pool.query(
    `SELECT date_trunc('month', NOW() - INTERVAL '1 month') AS from_d,
            date_trunc('month', NOW())                      AS to_d`
  );
  const from = per[0].from_d, to = per[0].to_d;
  // El label se deriva de los componentes UTC del inicio del período para
  // evitar que la conversión de zona corra la medianoche al mes anterior.
  const fd = new Date(from);
  const periodLabel = `${MESES[fd.getUTCMonth()]} de ${fd.getUTCFullYear()}`;

  const q = (sql, params) => pool.query(sql, params).then(r => r.rows);

  const [resumen, porTipo, porSector, tiempo, detalle] = await Promise.all([
    q(`SELECT
         COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS creadas,
         COUNT(*) FILTER (WHERE closed_at  >= $1 AND closed_at  < $2)::int AS cerradas,
         COUNT(*) FILTER (WHERE status != 'cerrado')::int                  AS abiertas_actual,
         COUNT(*) FILTER (WHERE status != 'cerrado' AND due_date IS NOT NULL AND due_date < NOW())::int AS vencidas_actual
       FROM findings WHERE deleted_at IS NULL`, [from, to]),
    q(`SELECT finding_type, COUNT(*)::int AS n FROM findings
       WHERE deleted_at IS NULL AND created_at >= $1 AND created_at < $2
       GROUP BY finding_type ORDER BY n DESC`, [from, to]),
    q(`SELECT COALESCE(NULLIF(area,''),'(sin sector)') AS area, COUNT(*)::int AS n FROM findings
       WHERE deleted_at IS NULL AND created_at >= $1 AND created_at < $2
       GROUP BY area ORDER BY n DESC LIMIT 6`, [from, to]),
    q(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/86400)::numeric, 1) AS dias_prom
       FROM findings WHERE deleted_at IS NULL AND closed_at >= $1 AND closed_at < $2`, [from, to]),
    q(`SELECT code, title, finding_type, status, area, origin, created_at, closed_at
       FROM findings WHERE deleted_at IS NULL AND created_at >= $1 AND created_at < $2
       ORDER BY created_at`, [from, to]),
  ]);

  return {
    periodLabel,
    from, to,
    resumen: resumen[0],
    porTipo,
    porSector,
    diasPromCierre: tiempo[0]?.dias_prom != null ? Number(tiempo[0].dias_prom) : null,
    detalle,
  };
}

// ── Análisis narrativo de Triny ─────────────────────────────────
async function buildNarrative(data) {
  const SYSTEM = `Sos Triny, el analista de calidad del SGI de DASSA (ISO 9001/14001/45001).
Redactás el análisis del informe mensual de No Conformidades y desvíos para la dirección.
Tono profesional, español rioplatense, conciso. Devolvés SOLO un objeto JSON válido sin markdown:
{
  "tendencia": "2-3 oraciones sobre cómo evolucionó el tratamiento de NC este mes",
  "focos": ["foco de atención 1", "foco de atención 2"],
  "recomendaciones": ["recomendación 1", "recomendación 2", "recomendación 3"]
}`;

  const lista = data.detalle.slice(0, 40).map(f =>
    `- ${f.code} [${f.finding_type}/${f.status}] ${f.title} · sector ${f.area || '—'}`
  ).join('\n') || '(no hubo NC nuevas este mes)';

  const userPrompt = `Período: ${data.periodLabel}
NC creadas: ${data.resumen.creadas} · cerradas: ${data.resumen.cerradas}
Abiertas hoy: ${data.resumen.abiertas_actual} · vencidas hoy: ${data.resumen.vencidas_actual}
Tiempo promedio de cierre: ${data.diasPromCierre != null ? data.diasPromCierre + ' días' : 's/d'}
Por tipo: ${data.porTipo.map(t => `${t.finding_type}=${t.n}`).join(', ') || '—'}
Por sector: ${data.porSector.map(s => `${s.area}=${s.n}`).join(', ') || '—'}

Detalle de NC del período:
${lista}

Analizá el tratamiento de las NC/desvíos y devolvé el JSON.`;

  try {
    const resp = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1100,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = (resp.content || []).map(b => b.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('sin JSON');
    const p = JSON.parse(m[0]);
    return {
      tendencia: String(p.tendencia || ''),
      focos: Array.isArray(p.focos) ? p.focos.map(String) : [],
      recomendaciones: Array.isArray(p.recomendaciones) ? p.recomendaciones.map(String) : [],
    };
  } catch (e) {
    // El informe se envía igual con los datos duros si la IA falla.
    return { tendencia: `(Análisis IA no disponible: ${e.message})`, focos: [], recomendaciones: [] };
  }
}

// ── Generación del informe completo ─────────────────────────────
async function generateMonthlyReport() {
  const data = await collectData();
  const narrative = await buildNarrative(data);
  return { data, narrative };
}

function renderHtml({ data, narrative }) {
  const r = data.resumen;
  const kpi = (label, val, color) =>
    `<td style="padding:12px;text-align:center;border:1px solid #eee">
       <div style="font-size:26px;font-weight:900;color:${color}">${val}</div>
       <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px">${label}</div>
     </td>`;

  const tipoRows = data.porTipo.map(t =>
    `<tr><td style="padding:6px 12px;border:1px solid #eee">${esc(TYPE_LABEL[t.finding_type] || t.finding_type)}</td>
         <td style="padding:6px 12px;border:1px solid #eee;text-align:right;font-weight:700">${t.n}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="padding:6px 12px;border:1px solid #eee;color:#999">Sin NC nuevas</td></tr>';

  const sectorRows = data.porSector.map(s =>
    `<tr><td style="padding:6px 12px;border:1px solid #eee">${esc(s.area)}</td>
         <td style="padding:6px 12px;border:1px solid #eee;text-align:right;font-weight:700">${s.n}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="padding:6px 12px;border:1px solid #eee;color:#999">—</td></tr>';

  const list = item =>
    `<li style="margin-bottom:6px;line-height:1.5">${esc(item)}</li>`;

  const body = `
    <p>Informe del tratamiento de No Conformidades y desvíos correspondiente a <strong>${esc(data.periodLabel)}</strong>.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        ${kpi('Creadas', r.creadas, '#0F1A4A')}
        ${kpi('Cerradas', r.cerradas, '#1a8a52')}
        ${kpi('Abiertas hoy', r.abiertas_actual, '#C8202C')}
        ${kpi('Vencidas hoy', r.vencidas_actual, r.vencidas_actual > 0 ? '#C8202C' : '#999')}
      </tr>
    </table>
    <p style="font-size:13px;color:#666">Tiempo promedio de cierre del período:
      <strong>${data.diasPromCierre != null ? data.diasPromCierre + ' días' : 'sin datos'}</strong></p>

    <h3 style="color:#0F1A4A;margin:22px 0 8px;font-size:15px">Distribución por tipo</h3>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">${tipoRows}</table>

    <h3 style="color:#0F1A4A;margin:22px 0 8px;font-size:15px">NC nuevas por sector</h3>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px">${sectorRows}</table>

    <h3 style="color:#0F1A4A;margin:22px 0 8px;font-size:15px">Análisis de Triny</h3>
    <div style="background:#F4F2FB;border-left:4px solid #7c3aed;padding:14px;line-height:1.6;font-size:14px">
      ${esc(narrative.tendencia)}
    </div>
    ${narrative.focos.length ? `<p style="margin:14px 0 4px;font-weight:700;color:#0F1A4A">Focos de atención</p>
      <ul style="font-size:13px;color:#444;padding-left:20px">${narrative.focos.map(list).join('')}</ul>` : ''}
    ${narrative.recomendaciones.length ? `<p style="margin:14px 0 4px;font-weight:700;color:#0F1A4A">Recomendaciones</p>
      <ul style="font-size:13px;color:#444;padding-left:20px">${narrative.recomendaciones.map(list).join('')}</ul>` : ''}
  `;

  return mailer.layout({
    title: `Informe mensual de NC · ${data.periodLabel}`,
    body,
    ctaUrl: `${APP_URL}/findings`,
    ctaLabel: 'Ver el módulo de NC',
    footerNote: 'Informe automático generado por Triny · módulo de No Conformidades · ISO 10.2.',
  });
}

// Persiste un informe en el histórico (un registro por período — upsert).
async function persistReport(report, opts = {}) {
  const { data, narrative } = report;
  const { rows } = await pool.query(
    `INSERT INTO findings_reports
       (period_label, period_from, period_to, data, narrative, generated_by, recipients, email_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (period_from) DO UPDATE SET
       period_label = EXCLUDED.period_label,
       period_to    = EXCLUDED.period_to,
       data         = EXCLUDED.data,
       narrative    = EXCLUDED.narrative,
       generated_at = NOW(),
       generated_by = EXCLUDED.generated_by,
       recipients   = EXCLUDED.recipients,
       email_status = EXCLUDED.email_status
     RETURNING id`,
    [data.periodLabel, data.from, data.to, JSON.stringify(data), JSON.stringify(narrative),
     opts.generatedBy || null, opts.recipients || null, opts.emailStatus || null]
  );
  return rows[0].id;
}

/**
 * Genera el informe mensual de NC, lo persiste en el histórico y —si no es
 * dryRun— lo envía por correo.
 * @param {object} opts { dryRun, generatedBy } — dryRun: genera y guarda sin enviar.
 */
async function sendMonthlyFindingsReport(opts = {}) {
  const report = await generateMonthlyReport();
  const html = renderHtml(report);
  const subject = `📊 Informe mensual de NC y desvíos · ${report.data.periodLabel}`;

  let emailStatus = 'no_enviado';
  let sendRes = { skipped: true };
  if (!opts.dryRun) {
    sendRes = await mailer.sendMail({
      to: REPORT_TO.join(', '), replyTo: 'santiago@dassa.com.ar', subject, html,
    });
    emailStatus = sendRes.ok ? 'enviado' : (sendRes.skipped ? 'omitido_sin_smtp' : 'error');
  }

  const id = await persistReport(report, {
    generatedBy: opts.generatedBy || null,
    recipients: REPORT_TO.join(', '),
    emailStatus,
  });

  return {
    ok: true, id, dryRun: !!opts.dryRun, sent: !opts.dryRun,
    recipients: REPORT_TO, period: report.data.periodLabel, emailStatus, report,
  };
}

// Lista de informes del histórico (metadata + resumen, sin el detalle completo).
async function listReports() {
  const { rows } = await pool.query(
    `SELECT r.id, r.period_label, r.period_from, r.generated_at,
            r.recipients, r.email_status,
            r.data->'resumen' AS resumen,
            u.full_name AS generated_by_name
       FROM findings_reports r
       LEFT JOIN users u ON u.id = r.generated_by
      ORDER BY r.period_from DESC`
  );
  return rows;
}

// Informe completo por id.
async function getReport(id) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name AS generated_by_name
       FROM findings_reports r
       LEFT JOIN users u ON u.id = r.generated_by
      WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { generateMonthlyReport, sendMonthlyFindingsReport, listReports, getReport };
