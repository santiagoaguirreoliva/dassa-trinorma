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
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "porques": { "p1": "...", "p2": "...", "p3": "...", "p4": "...", "p5": "..." },
  "root_cause": "causa raíz en una frase",
  "corrective_actions": ["acción correctiva 1", "acción correctiva 2"],
  "improvement_opportunity": "oportunidad de mejora / acción preventiva",
  "summary": "análisis breve en 2-3 oraciones"
}`;

/**
 * Analiza una NC y devuelve la sugerencia estructurada.
 * @param {object} finding fila de findings (title, description, area, origin, finding_type, immediate_action)
 * @returns {Promise<object>} { porques, root_cause, corrective_actions, improvement_opportunity, summary, _model }
 */
async function analyzeFinding(finding) {
  if (!finding || !finding.description) throw new Error('La NC no tiene descripción para analizar');

  const userPrompt = `Analizá esta No Conformidad / desvío del SGI de DASSA:

Tipo: ${TYPE_LABEL[finding.finding_type] || finding.finding_type || 'Hallazgo'}
Título: ${finding.title || '—'}
Sector / Área: ${finding.area || '—'}
Origen: ${(finding.origin || '—').replace(/_/g, ' ')}
Descripción: ${finding.description}
Acción inmediata ya tomada: ${finding.immediate_action || 'Ninguna registrada'}

Generá el análisis de causa raíz y las sugerencias en el formato JSON indicado.`;

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
    _model: MODEL,
    _usage: resp.usage,
  };
}

module.exports = { analyzeFinding };
