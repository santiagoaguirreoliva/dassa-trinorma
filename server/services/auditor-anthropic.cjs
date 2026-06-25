// =============================================================================
// DASSA SGI — Auditor IA — Cliente Anthropic Claude SDK
// =============================================================================
const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const { SYSTEM_AUDITOR, SYSTEM_CHAT, NORMS_KNOWLEDGE } = require('./auditor-prompts.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no configurada en .env');
  }
  client = require('./llm-meter.cjs').meterClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), require('path').basename(__filename, '.cjs'));
  return client;
}

async function getModel() {
  // Buscar config en agent_config; fallback a sonnet
  try {
    const { rows } = await pool.query("SELECT value FROM agent_config WHERE key = 'auditor_model'");
    return rows.length > 0 ? rows[0].value : 'claude-sonnet-4-5';
  } catch {
    return 'claude-sonnet-4-5';
  }
}

/**
 * Generar reporte individual de auditoría para un usuario.
 * Recibe el contexto completo (tareas, NCs, capacitaciones, etc.) y devuelve JSON estructurado.
 */
async function generateUserReport(userContext) {
  const client = getClient();
  const model = await getModel();

  const userPrompt = `Generá un reporte de auditoría semanal para el siguiente usuario del SGI.

# DATOS DEL USUARIO
Nombre: ${userContext.user.full_name}
Email: ${userContext.user.email}
Rol: ${userContext.user.role}
Puesto: ${userContext.user.position || 'N/A'}
Área: ${userContext.user.department || 'N/A'}

# TAREAS PENDIENTES (${userContext.tasks.length} en total)
${userContext.tasks.map(t => `- [${t.priority || 'media'}] ${t.title} ${t.due_date ? `— vence ${t.due_date}` : ''} (estado: ${t.status})`).join('\n') || 'Sin tareas asignadas.'}

# NCs ASIGNADAS (${userContext.findings.length})
${userContext.findings.map(f => `- ${f.title || 'NC ' + f.id} — estado: ${f.status} — abierta hace ${f.days_open} días`).join('\n') || 'Sin NCs asignadas.'}

# CAPACITACIONES PRÓXIMAS / PENDIENTES (${userContext.trainings.length})
${userContext.trainings.map(t => `- ${t.title} — ${t.status} — ${t.scheduled_date || ''}`).join('\n') || 'Sin capacitaciones pendientes.'}

# REQUISITOS LEGALES EN SU ÁREA (${userContext.legal.length})
${userContext.legal.map(l => `- ${l.title} — vence ${l.fecha_vencimiento || 'sin fecha'}`).join('\n') || 'Sin requisitos legales pendientes en su área.'}

# DOCUMENTOS A REVISAR (${userContext.documents.length})
${userContext.documents.map(d => `- ${d.title} — última revisión ${d.last_review || 'desconocida'}`).join('\n') || 'Sin documentos pendientes.'}

# INSTRUCCIONES
1. Generá un resumen narrativo (2-4 oraciones) DIRIGIDO al usuario en segunda persona.
2. Calculá un score de riesgo de 0 a 100. Criterios:
   - 100 = sin pendientes ni vencidos
   - 80-99 = todo OK con algunos pendientes normales
   - 60-79 = algunos pendientes vencidos o NCs estancadas
   - 40-59 = situación crítica, varios atrasos
   - <40 = riesgo alto, requiere atención inmediata
3. Listá alertas concretas (máximo 5) con severidad: critical / warning / info
4. Recomendaciones priorizadas en formato Markdown bullets

DEVOLVÉ EXCLUSIVAMENTE JSON ESTRICTO, sin texto antes ni después, con esta estructura:
{
  "summary": "...",
  "riesgo_score": 75,
  "alertas": [
    {"severity": "critical", "title": "...", "message": "..."}
  ],
  "recommendations": "## Prioridad alta\\n- ...\\n## Prioridad media\\n- ..."
}`;

  // Hasta 2 intentos: el segundo refuerza la instrucción JSON si la IA salió de formato.
  let response, parsed, lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const finalPrompt = attempt === 1
      ? userPrompt
      : userPrompt + '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido. Devolvé EXCLUSIVAMENTE el objeto JSON, sin texto antes ni después, sin markdown, sin comentarios. Asegurate de cerrar todos los arrays y objetos correctamente, y de escapar correctamente los saltos de línea dentro de strings (\\n).';
    response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: SYSTEM_AUDITOR + '\n\n' + NORMS_KNOWLEDGE,
      messages: [{ role: 'user', content: finalPrompt }],
    });
    const text = response.content[0].text;
    try {
      parsed = extractAndParseJson(text);
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`[auditor] Intento ${attempt} JSON parse falló: ${e.message}. Snippet: ${text.slice(0, 200)}...`);
    }
  }

  if (!parsed) {
    // Fallback: devolver un reporte mínimo válido para que el usuario reciba al menos algo.
    console.error('[auditor] Fallback activado tras 2 intentos. Último error:', lastErr?.message);
    parsed = {
      summary: 'No se pudo generar el reporte automático esta semana. Revisá manualmente tus pendientes.',
      riesgo_score: 50,
      alertas: [{
        severity: 'warning',
        title: 'Reporte degradado',
        message: 'El auditor IA tuvo un problema al estructurar la respuesta. El equipo técnico ya fue notificado.',
      }],
      recommendations: '## Acción manual\n- Revisar pendientes en /mis-pendientes\n- Reportar al admin si ves algo crítico\n\n_(Reporte degradado — error: ' + (lastErr?.message || 'desconocido') + ')_',
      _degraded: true,
    };
  }

  return {
    ...parsed,
    _usage: response.usage,
    _model: response.model,
  };
}

/**
 * Extrae y parsea JSON de una respuesta de Claude, tolerando:
 * - Code fences ```json ... ```
 * - Texto antes/después del JSON
 * - Trailing commas
 * - Saltos de línea reales dentro de strings (los normaliza a \n)
 */
function extractAndParseJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('respuesta vacía o no-string');
  }
  // Strip code fences
  let s = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  // Find first '{' and matching '}' por bracket counting (ignora llaves dentro de strings)
  const start = s.indexOf('{');
  if (start < 0) throw new Error('no se encontró { en la respuesta');
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) throw new Error('JSON sin cerrar (sin } final)');
  let candidate = s.slice(start, end + 1);
  // Intento directo
  try { return JSON.parse(candidate); } catch (_) {}
  // Reparaciones livianas: quitar trailing commas y escapar newlines crudos dentro de strings
  const repaired = repairJson(candidate);
  try { return JSON.parse(repaired); }
  catch (e) { throw new Error('JSON inválido tras reparación: ' + e.message); }
}

function repairJson(s) {
  // Quitar trailing commas: , antes de } o ]
  let out = s.replace(/,(\s*[}\]])/g, '$1');
  // Escapar saltos de línea crudos dentro de strings
  let result = '';
  let inStr = false, esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (esc) { result += c; esc = false; continue; }
    if (c === '\\') { result += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; result += c; continue; }
    if (inStr && c === '\n') { result += '\\n'; continue; }
    if (inStr && c === '\r') { result += '\\r'; continue; }
    if (inStr && c === '\t') { result += '\\t'; continue; }
    result += c;
  }
  return result;
}

/**
 * Chat especializado con el auditor.
 * Recibe historial de mensajes + último mensaje del user, devuelve respuesta en Markdown.
 */
async function chat({ messages, ragContext = '' }) {
  const client = getClient();
  const model = await getModel();

  const systemFinal = SYSTEM_CHAT + '\n\n' + NORMS_KNOWLEDGE +
    (ragContext ? `\n\n# CONTEXTO ESPECÍFICO DE DASSA (de tus documentos del SGI)\n${ragContext}` : '');

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: systemFinal,
    messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
  });

  return {
    content: response.content[0].text,
    usage: response.usage,
    model: response.model,
  };
}

/**
 * Generar resumen ejecutivo global del SGI (para admin).
 */
async function generateAdminInsights(globalContext) {
  const client = getClient();
  const model = await getModel();

  const userPrompt = `Generá un resumen ejecutivo para el master admin del SGI.

# MÉTRICAS GLOBALES
- NCs abiertas: ${globalContext.ncs_open}
- NCs estancadas (>30 días): ${globalContext.ncs_stale}
- Capacitaciones pendientes: ${globalContext.trainings_pending}
- Requisitos legales por vencer (30d): ${globalContext.legal_30d}
- Documentos sin revisar (>18 meses): ${globalContext.docs_old}
- Total tareas vencidas: ${globalContext.tasks_overdue}
- Usuarios con más pendientes: ${globalContext.top_overloaded.map(u => `${u.name} (${u.count})`).join(', ')}

# INSTRUCCIONES
Generá un análisis ejecutivo de la situación del SGI en formato Markdown:
- Diagnóstico general (1-2 párrafos)
- Top 3 riesgos críticos
- Top 3 acciones recomendadas con responsable sugerido
- Tendencia comparada con la semana anterior si aplica`;

  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system: SYSTEM_AUDITOR + '\n\n' + NORMS_KNOWLEDGE,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return {
    content: response.content[0].text,
    usage: response.usage,
    model: response.model,
  };
}

/**
 * Costo estimado en USD por uso (Claude Sonnet 4.5)
 */
function estimateCost(usage, model = 'claude-sonnet-4-5') {
  const rates = {
    'claude-sonnet-4-5': { input: 3.0, output: 15.0 },     // por 1M tokens
    'claude-haiku-4-5':  { input: 0.8, output: 4.0 },
    'claude-opus-4-6':   { input: 15.0, output: 75.0 },
  };
  const r = rates[model] || rates['claude-sonnet-4-5'];
  return ((usage.input_tokens * r.input) + (usage.output_tokens * r.output)) / 1_000_000;
}

module.exports = {
  generateUserReport,
  generateAdminInsights,
  chat,
  estimateCost,
};
