// =============================================================================
// DASSA SGI — Análisis IA para el seguimiento de tareas (Triny)
// Genera el párrafo de análisis ejecutivo del resumen semanal.
// =============================================================================
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.FINDINGS_AI_MODEL || 'claude-sonnet-4-5';

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = require('./llm-meter.cjs').meterClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), require('path').basename(__filename, '.cjs'));
  return _client;
}

/**
 * Análisis ejecutivo de los KPIs de la semana para el resumen del viernes.
 * Best-effort: si la IA falla, devuelve '' y el mail se envía igual.
 */
async function weeklyExecutiveInsight(k = {}) {
  try {
    const resp = await getClient().messages.create({
      model: MODEL,
      max_tokens: 400,
      system: 'Sos Triny, analista del Sistema de Gestión Integrado de DASSA (ISO 9001/14001/45001). '
        + 'Escribís 2-3 oraciones de análisis ejecutivo del estado semanal del SGI para la dirección. '
        + 'Español rioplatense, tono profesional y concreto. Señalá el foco de atención si lo hay. '
        + 'Respondé solo el texto, sin markdown ni encabezados.',
      messages: [{
        role: 'user',
        content: `KPIs de la semana del SGI de DASSA:
- NC abiertas: ${k.ncs_abiertas || 0}
- NC cerradas esta semana: ${k.ncs_cerradas || 0}
- Tareas pendientes: ${k.tareas_pendientes || 0}
- Tareas vencidas: ${k.tareas_vencidas || 0}
- Tareas completadas esta semana: ${k.tareas_completadas || 0}
- Capacitaciones de la semana: ${k.capacitaciones_semana || 0}
- Incidentes registrados: ${k.incidentes_semana || 0}
- Reuniones de comité: ${k.reuniones_semana || 0}

Escribí el análisis ejecutivo.`,
      }],
    });
    return (resp.content || []).map(b => b.text || '').join('').trim();
  } catch (e) {
    console.error('[task-ai] weeklyExecutiveInsight:', e.message);
    return '';
  }
}

module.exports = { weeklyExecutiveInsight };
