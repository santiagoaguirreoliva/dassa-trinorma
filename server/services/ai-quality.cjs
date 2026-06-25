// =============================================================================
// DASSA SGI · OLA 5 · Auto-validador IA + Wake-up notifications
// =============================================================================
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = require('./llm-meter.cjs').meterClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), require('path').basename(__filename, '.cjs'));
  return _client;
}

// ───────────────────────────────────────────────────────────────
// AUTO-VALIDADOR · revisa coherencia de input antes de guardar
// ───────────────────────────────────────────────────────────────
async function validateInput({ entity_type, data, userContext = {} }) {
  const client = getClient();

  const SYSTEM = `Sos validador de calidad de datos del SGI TRINORMA DASSA.
Recibís el TIPO DE ENTIDAD y los DATOS que el usuario está por guardar.
Tu trabajo: revisar coherencia, completitud, redacción y sugerir mejoras ANTES de guardar.

Devolvé JSON estricto:
{
  "quality_score": 0-100,
  "warnings": ["..."],
  "suggestions": ["..."],
  "improved_fields": { "campo": "valor mejorado" },
  "is_ok_to_save": true/false,
  "summary": "1 oración"
}

Reglas:
- score >= 80: OK
- score 60-79: hay sugerencias pero se puede guardar
- score < 60: revisar antes de guardar (is_ok_to_save=false)
- suggestions: máx 3, accionables, breves
- improved_fields: SOLO si una redacción puede mejorarse claramente (ej. NC muy genérica)
- Para NCs: verificar que tenga título descriptivo, descripción específica, severidad coherente
- Para riesgos: verificar que G/O/D tengan sentido vs los controles
- Para compras: verificar que justificación + categoría sean coherentes`;

  const userPrompt = `ENTIDAD: ${entity_type}
CONTEXTO USUARIO: ${userContext.full_name || 'N/A'} (${userContext.role || 'usuario'})
DATOS:
${JSON.stringify(data, null, 2)}`;

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = resp.content[0].text;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { quality_score: 50, warnings: ['IA no devolvió JSON'], is_ok_to_save: true };
  return { ...JSON.parse(m[0]), _usage: resp.usage };
}

// ───────────────────────────────────────────────────────────────
// WAKE-UP NOTIFICATIONS · escanea proactivamente y genera alerts
// ───────────────────────────────────────────────────────────────
async function generateWakeUpAlerts() {
  const stats = { alertas_creadas: 0, escaneos: 0 };

  // 1. Reviews destrabadas que llevan >7 días sin iniciarse
  stats.escaneos++;
  const { rows: idleReviews } = await pool.query(`
    SELECT r.id, r.entity_type, r.reviewer_id, u.full_name AS reviewer_name
    FROM reviews r LEFT JOIN users u ON u.id = r.reviewer_id
    WHERE r.status = 'programada'
      AND NOT review_is_blocked(r.id)
      AND r.updated_at < NOW() - INTERVAL '7 days'
      AND r.reviewer_id IS NOT NULL
  `);
  for (const r of idleReviews) {
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, source_module)
      VALUES ($1, $2, $3, 'warning', 'reviews')
      ON CONFLICT DO NOTHING
    `, [r.reviewer_id, `⏰ Revisión "${r.entity_type}" lleva 7+ días sin iniciar`,
        'Está destrabada pero nadie la inició. Andá a /ciclo/2026 e iniciála para no atrasar el ciclo.']);
    stats.alertas_creadas++;
  }

  // 2. Riesgos críticos (NPR >= 16) sin acción recomendada
  stats.escaneos++;
  const { rows: criticalRisks } = await pool.query(`
    SELECT id, code, activity FROM risks
    WHERE is_active = TRUE AND npr_level = 'significativo'
      AND (recommended_action IS NULL OR LENGTH(recommended_action) < 10)
    LIMIT 10
  `);
  if (criticalRisks.length > 0) {
    const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role::text IN ('master_admin','sgi_leader') AND is_active = TRUE`);
    for (const a of admins) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, source_module)
        VALUES ($1, $2, $3, 'warning', 'risks') ON CONFLICT DO NOTHING
      `, [a.id, `⚠ ${criticalRisks.length} riesgos significativos sin acción`,
          `Tenés ${criticalRisks.length} riesgos NPR ≥16 que no tienen recommended_action cargado. Ej: ${criticalRisks[0].code}`]);
      stats.alertas_creadas++;
    }
  }

  // 3. Requisitos legales por vencer en próximos 60 días
  stats.escaneos++;
  const { rows: legalAlerts } = await pool.query(`
    SELECT id, code, title, expiration_date, responsible_id
    FROM legal_requirements
    WHERE is_active = TRUE
      AND expiration_date BETWEEN NOW() AND NOW() + INTERVAL '60 days'
      AND responsible_id IS NOT NULL
  `);
  for (const l of legalAlerts) {
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, source_module)
      VALUES ($1, $2, $3, 'warning', 'legal') ON CONFLICT DO NOTHING
    `, [l.responsible_id, `⚖ Requisito legal vence: ${l.code}`,
        `${l.title} · vence ${l.expiration_date}. Revisá si corresponde renovar o actualizar.`]);
    stats.alertas_creadas++;
  }

  // 4. Objetivos del año sin medición reciente
  stats.escaneos++;
  const yearNow = new Date().getFullYear();
  const { rows: idleObjectives } = await pool.query(`
    SELECT o.id, o.code, o.name FROM objectives o
    WHERE o.year = $1 AND o.status = 'activo'
      AND NOT EXISTS (
        SELECT 1 FROM objective_indicators oi
        JOIN objective_measurements om ON om.indicator_id = oi.id
        WHERE oi.objective_id = o.id AND om.period > NOW() - INTERVAL '60 days'
      )
  `, [yearNow]);
  if (idleObjectives.length > 0) {
    const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role::text = 'master_admin' AND is_active = TRUE LIMIT 1`);
    for (const a of admins) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, source_module)
        VALUES ($1, $2, $3, 'info', 'objectives') ON CONFLICT DO NOTHING
      `, [a.id, `📊 ${idleObjectives.length} objetivos sin medición reciente`,
          `Estos objetivos no tienen datos de los últimos 60 días: ${idleObjectives.slice(0, 3).map(o => o.code).join(', ')}`]);
      stats.alertas_creadas++;
    }
  }

  return stats;
}

module.exports = { validateInput, generateWakeUpAlerts };
