// =============================================================================
// DASSA SGI — Análisis de No Conformidades asistido por IA (Triny / Nixa)
// Analiza una NC/desvío y sugiere causa raíz (5 porqués), acciones correctivas
// y una oportunidad de mejora. La sugerencia la revisa y aprueba el área de
// calidad — no reemplaza el análisis humano que exige ISO 10.2.
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

const TYPE_LABEL = {
  nc_real: 'No Conformidad Real', nc_potencial: 'No Conformidad Potencial',
  mejora: 'Oportunidad de Mejora', desvio_cliente: 'Desvío de Cliente',
};

const SYSTEM = `Sos Triny, el analista de calidad del Sistema de Gestión Integrado de DASSA
(Depósito Aduanero y Servicios Especializados S.A.), certificado bajo ISO 9001, ISO 14001 e ISO 45001.

Tu tarea: analizar una No Conformidad / desvío y producir un análisis técnico de causa raíz.

Aplicá la metodología de los 5 Porqués: encadenás 5 preguntas "¿por qué?" partiendo del
problema observado hasta llegar a la causa raíz sistémica (de proceso, no de persona).
Cada "por qué" debe ser consecuencia lógica del anterior.

Pautas:
- Hablás en español rioplatense, claro y profesional.
- Las causas apuntan a fallas de proceso, método, recurso o control — nunca culpan a un individuo.
- Las acciones correctivas eliminan la causa raíz (no son contención): son concretas, verificables y accionables.
- La oportunidad de mejora es una acción preventiva que evita recurrencia o eleva el estándar.
- Si la información es insuficiente, igual proponé el análisis más razonable y aclaralo en el summary.

Si te pasan un listado de NC anteriores del mismo sector y tipo, evaluá si esta NC
es RECURRENTE: si describe un problema sustancialmente igual o de la misma causa raíz
que alguna anterior. Una NC recurrente indica que la acción correctiva previa NO fue
eficaz — es un hallazgo grave para el SGI.

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "porques": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." },
  "root_cause": "causa raíz en una frase",
  "corrective_actions": ["acción correctiva 1", "acción correctiva 2"],
  "improvement_opportunity": "oportunidad de mejora / acción preventiva",
  "summary": "análisis breve en 2-3 oraciones",
  "recurrence": {
    "is_recurrent": false,
    "related_codes": ["NC-XXXX"],
    "note": "por qué es (o no) recurrente; si lo es, qué implica sobre la eficacia previa"
  }
}`;

/**
 * Analiza una NC y devuelve la sugerencia estructurada.
 * @param {object} finding fila de findings (title, description, area, origin, finding_type, immediate_action)
 * @param {Array}  similar NC anteriores del mismo sector/tipo, para evaluar recurrencia
 * @returns {Promise<object>} { porques, root_cause, corrective_actions, improvement_opportunity, summary, recurrence, _model }
 */
async function analyzeFinding(finding, similar = []) {
  if (!finding || !finding.description) throw new Error('La NC no tiene descripción para analizar');

  const similarBlock = (similar && similar.length)
    ? `\n\nNC anteriores del mismo sector y tipo (para evaluar recurrencia):\n` +
      similar.map(s =>
        `- ${s.code} [${s.status}] ${s.title}: ${String(s.description || '').slice(0, 200)}` +
        (s.root_cause ? ` · causa raíz registrada: ${s.root_cause}` : '')
      ).join('\n')
    : '\n\n(No hay NC anteriores comparables — is_recurrent debe ser false.)';

  const userPrompt = `Analizá esta No Conformidad / desvío del SGI de DASSA:

Tipo: ${TYPE_LABEL[finding.finding_type] || finding.finding_type || 'Hallazgo'}
Título: ${finding.title || '—'}
Sector / Área: ${finding.area || '—'}
Origen: ${(finding.origin || '—').replace(/_/g, ' ')}
Descripción: ${finding.description}
Acción inmediata ya tomada: ${finding.immediate_action || 'Ninguna registrada'}${similarBlock}

Generá el análisis de causa raíz, las sugerencias y la evaluación de recurrencia en el formato JSON indicado.`;

  const resp = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1400,
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = (resp.content || []).map(b => b.text || '').join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió un análisis válido');

  const parsed = JSON.parse(m[0]);
  // Normalización defensiva del shape esperado
  const p = parsed.porques || {};
  const rec = parsed.recurrence || {};
  return {
    porques: {
      p1: String(p.p1 || ''), p2: String(p.p2 || ''), p3: String(p.p3 || ''),
      p4: String(p.p4 || ''), p5: String(p.p5 || ''),
    },
    root_cause: String(parsed.root_cause || ''),
    corrective_actions: Array.isArray(parsed.corrective_actions)
      ? parsed.corrective_actions.map(String).filter(Boolean) : [],
    improvement_opportunity: String(parsed.improvement_opportunity || ''),
    summary: String(parsed.summary || ''),
    recurrence: {
      is_recurrent: rec.is_recurrent === true,
      related_codes: Array.isArray(rec.related_codes) ? rec.related_codes.map(String).filter(Boolean) : [],
      note: String(rec.note || ''),
    },
    _model: MODEL,
    _usage: resp.usage,
  };
}

module.exports = { analyzeFinding };
