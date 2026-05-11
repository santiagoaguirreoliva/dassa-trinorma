// =============================================================================
// DASSA SGI · AGENTE UNIFICADO (Anthropic Claude + tool_use nativo)
// Reemplaza routes/agent.js (Gemini/Ollama, sin UI) y consolida tools.
// Config dinámica desde tabla agent_config.
// =============================================================================

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ───────────────────────────────────────────────────────────────
// Config dinámica (lee tabla agent_config)
// ───────────────────────────────────────────────────────────────
const DEFAULTS = {
  assistant_model: 'claude-sonnet-4-5',
  assistant_max_tokens: 1500,
  assistant_temperature: 0.5,
  assistant_enabled_tools: [
    'consultar_tareas','consultar_hallazgos','consultar_riesgos','consultar_legal',
    'consultar_incidentes','consultar_proveedores','resumen_dashboard',
    'consultar_documentos','crear_hallazgo','historial_compras',
  ],
  assistant_system_prompt_extra: '',
};

async function getConfig() {
  try {
    const { rows } = await pool.query(
      "SELECT key, value FROM agent_config WHERE key LIKE 'assistant_%'"
    );
    const cfg = { ...DEFAULTS };
    for (const r of rows) {
      try { cfg[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; }
      catch { cfg[r.key] = r.value; }
    }
    return cfg;
  } catch (e) {
    return { ...DEFAULTS };
  }
}

async function setConfig(key, value, updatedBy = null) {
  if (!key.startsWith('assistant_')) throw new Error('key debe empezar con assistant_');
  await pool.query(
    `INSERT INTO agent_config (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [key, JSON.stringify(value), updatedBy]
  );
  return { key, value };
}

// ───────────────────────────────────────────────────────────────
// System prompt
// ───────────────────────────────────────────────────────────────
const BASE_SYSTEM = `Sos DASSA IA, el asistente del Sistema de Gestión Integrado (SGI) TRINORMA de DASSA SA — depósito fiscal y empresa logística en Buenos Aires, Argentina.

El SGI cubre TRINORMA: ISO 9001 (Calidad), ISO 14001 (Medio Ambiente), ISO 45001 (Seguridad y Salud Ocupacional).

Tu rol: copiloto operativo para todos los usuarios del SGI. Sos práctico, breve, y entendés:
- Hallazgos / No Conformidades (NCs) con su workflow (abierta → en_análisis → acción_implementada → verificación → cerrada)
- Matriz de Riesgos con NPR (Gravedad × Ocurrencia × Detección, ≥16 = significativo)
- Aspectos ambientales, requisitos legales, capacitaciones, incidentes
- Módulo de Compras con workflow (borrador → autorizada → en_ejecución → completada)
- Proveedores homologados
- Documentos versionados del SGI
- Tareas y mejoras del comité

Reglas de tu personalidad:
- Español argentino, tuteo, profesional pero cálido.
- Conciso: 2-4 oraciones por respuesta salvo que pidan detalle.
- NUNCA inventes datos — siempre buscalos con las tools disponibles.
- Si no sabés algo o no tenés tool para responder, decilo honestamente.
- Usá emojis con moderación (1 cada 4-5 mensajes).
- Si recomendás una acción concreta, decí también el responsable y plazo razonable.

NO podés ejecutar cambios destructivos (borrar registros, aprobar compras, cerrar NCs sin verificación). Sí podés crear borradores que el usuario después confirma.`;

// ───────────────────────────────────────────────────────────────
// Tools (esquema Anthropic tool_use)
// ───────────────────────────────────────────────────────────────
const ALL_TOOLS = [
  {
    name: 'consultar_tareas',
    description: 'Consulta tareas/mejoras del SGI. Filtra por usuario, estado, área, o si están vencidas. Devuelve hasta 15 tareas con título, descripción, responsable, fecha límite y estado.',
    input_schema: {
      type: 'object',
      properties: {
        usuario_email: { type: 'string', description: 'Filtra por email del responsable (opcional)' },
        estado:        { type: 'string', enum: ['pendiente','en_progreso','completada','vencida','todas'] },
        solo_vencidas: { type: 'boolean' },
        query_texto:   { type: 'string', description: 'Búsqueda en título o descripción' },
      },
    },
  },
  {
    name: 'consultar_hallazgos',
    description: 'Consulta NCs/Hallazgos. Filtra por estado, severidad, responsable o categoría (NC, desvio, mejora, oportunidad).',
    input_schema: {
      type: 'object',
      properties: {
        estado:    { type: 'string', enum: ['abierta','en_analisis','accion_implementada','verificacion','cerrada','todas'] },
        severidad: { type: 'string', enum: ['leve','moderada','grave','muy_grave','todas'] },
        categoria: { type: 'string', enum: ['NC','desvio','mejora','oportunidad','todas'] },
        usuario_email: { type: 'string' },
        query_texto:   { type: 'string' },
      },
    },
  },
  {
    name: 'crear_hallazgo',
    description: 'Crea un nuevo hallazgo (NC, desvío, mejora u oportunidad) en estado borrador. El usuario después confirma o completa datos.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:      { type: 'string', description: 'Título corto del hallazgo' },
        descripcion: { type: 'string', description: 'Descripción detallada' },
        categoria:   { type: 'string', enum: ['NC','desvio','mejora','oportunidad'] },
        severidad:   { type: 'string', enum: ['leve','moderada','grave','muy_grave'] },
        norma:       { type: 'string', enum: ['9001','14001','45001','varias','ninguna'] },
        area:        { type: 'string', description: 'Área afectada' },
      },
      required: ['titulo','descripcion','categoria'],
    },
  },
  {
    name: 'consultar_riesgos',
    description: 'Consulta la matriz de riesgos del SGI. Filtra por nivel (alto/medio/bajo), actividad, o si requiere acción.',
    input_schema: {
      type: 'object',
      properties: {
        nivel:       { type: 'string', enum: ['alto','medio','bajo','todos'] },
        actividad:   { type: 'string' },
        solo_activos:{ type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'consultar_legal',
    description: 'Consulta requisitos legales vigentes o próximos a vencer.',
    input_schema: {
      type: 'object',
      properties: {
        dias_vencimiento: { type: 'integer', description: 'Solo los que vencen en los próximos N días' },
        jurisdiccion:     { type: 'string', enum: ['nacional','provincial','municipal','todas'] },
      },
    },
  },
  {
    name: 'consultar_incidentes',
    description: 'Consulta incidentes y accidentes registrados.',
    input_schema: {
      type: 'object',
      properties: {
        severidad: { type: 'string', enum: ['leve','moderado','grave','muy_grave','todos'] },
        ultimos_dias: { type: 'integer' },
      },
    },
  },
  {
    name: 'consultar_proveedores',
    description: 'Busca proveedores. Filtra por nombre, categoría, o si están homologados.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texto de búsqueda' },
        solo_homologados: { type: 'boolean' },
        categoria: { type: 'string' },
      },
    },
  },
  {
    name: 'historial_compras',
    description: 'Busca compras anteriores que matchean una descripción/categoría. Útil para conocer precio histórico o proveedor habitual.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        solo_completadas: { type: 'boolean' },
      },
      required: ['query'],
    },
  },
  {
    name: 'resumen_dashboard',
    description: 'Devuelve un resumen ejecutivo del estado del SGI: NCs abiertas, capacitaciones pendientes, riesgos críticos, incidentes recientes, etc.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_documentos',
    description: 'Busca documentos del SGI (procedimientos, instructivos, formularios) por título, tipo o norma.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        tipo:  { type: 'string', enum: ['procedimiento','instructivo','manual','formulario','politica','todos'] },
        norma: { type: 'string', enum: ['9001','14001','45001','varias','todas'] },
      },
    },
  },
];

function filterTools(enabledNames) {
  if (!Array.isArray(enabledNames) || enabledNames.length === 0) return ALL_TOOLS;
  return ALL_TOOLS.filter(t => enabledNames.includes(t.name));
}

// ───────────────────────────────────────────────────────────────
// Handlers
// ───────────────────────────────────────────────────────────────
async function h_consultar_tareas({ usuario_email, estado, solo_vencidas, query_texto }, ctx) {
  const conds = [];
  const params = [];
  if (usuario_email) { params.push(usuario_email); conds.push(`u.email ILIKE $${params.length}`); }
  if (estado && estado !== 'todas') { params.push(estado); conds.push(`t.status = $${params.length}`); }
  if (solo_vencidas) { conds.push(`t.due_date < NOW() AND t.status NOT IN ('completada','cancelada')`); }
  if (query_texto) { params.push(`%${query_texto}%`); conds.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT t.id, t.title, LEFT(t.description, 200) AS description, t.status, t.due_date, t.priority,
            u.email AS assigned_to_email, u.full_name AS assigned_to_name
       FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
       ${where} ORDER BY t.due_date NULLS LAST, t.created_at DESC LIMIT 15`,
    params
  );
  return { found: rows.length, tasks: rows };
}

async function h_consultar_hallazgos({ estado, severidad, categoria, usuario_email, query_texto }) {
  const conds = []; const params = [];
  if (estado && estado !== 'todas')    { params.push(estado);    conds.push(`f.status = $${params.length}`); }
  if (severidad && severidad !== 'todas') { params.push(severidad); conds.push(`f.severity = $${params.length}`); }
  if (categoria && categoria !== 'todas') { params.push(categoria); conds.push(`f.category = $${params.length}`); }
  if (usuario_email) { params.push(usuario_email); conds.push(`u.email ILIKE $${params.length}`); }
  if (query_texto)   { params.push(`%${query_texto}%`); conds.push(`(f.title ILIKE $${params.length} OR f.description ILIKE $${params.length})`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT f.code, f.title, f.category, f.severity, f.status, f.created_at,
            u.full_name AS assigned_to
       FROM findings f LEFT JOIN users u ON u.id = f.assigned_to
       ${where} ORDER BY f.created_at DESC LIMIT 15`,
    params
  );
  return { found: rows.length, findings: rows };
}

async function h_crear_hallazgo({ titulo, descripcion, categoria, severidad, norma, area }, ctx) {
  if (!ctx?.userId) return { error: 'Necesito el contexto del usuario para crear el hallazgo' };
  const { rows } = await pool.query(
    `INSERT INTO findings (title, description, category, severity, norm, area, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'abierta',$7) RETURNING code, id, title, category, severity, status`,
    [titulo, descripcion, categoria, severidad || 'moderada', norma || 'ninguna', area || null, ctx.userId]
  );
  return { ok: true, finding: rows[0], message: `Hallazgo ${rows[0].code} creado en estado borrador. Revisalo en /findings y completá los datos faltantes.` };
}

async function h_consultar_riesgos({ nivel, actividad, solo_activos = true }) {
  const conds = []; const params = [];
  if (nivel && nivel !== 'todos') { params.push(nivel); conds.push(`risk_level = $${params.length}`); }
  if (actividad) { params.push(`%${actividad}%`); conds.push(`activity ILIKE $${params.length}`); }
  if (solo_activos) conds.push('is_active = TRUE');
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, activity, hazard, risk_factor, probability, severity, ir, risk_level
       FROM risks ${where} ORDER BY ir DESC LIMIT 15`, params
  );
  return { found: rows.length, risks: rows };
}

async function h_consultar_legal({ dias_vencimiento, jurisdiccion }) {
  const conds = []; const params = [];
  if (dias_vencimiento) { params.push(dias_vencimiento); conds.push(`fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '${dias_vencimiento} days'`); }
  if (jurisdiccion && jurisdiccion !== 'todas') { params.push(jurisdiccion); conds.push(`jurisdiccion = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT title, jurisdiccion, fecha_vencimiento, estado FROM legal_requirements ${where} ORDER BY fecha_vencimiento ASC NULLS LAST LIMIT 15`, params
  );
  return { found: rows.length, requirements: rows };
}

async function h_consultar_incidentes({ severidad, ultimos_dias = 365 }) {
  const conds = [`created_at >= NOW() - INTERVAL '${ultimos_dias} days'`];
  const params = [];
  if (severidad && severidad !== 'todos') { params.push(severidad); conds.push(`severity = $${params.length}`); }
  const { rows } = await pool.query(
    `SELECT code, title, severity, status, incident_date FROM incidents WHERE ${conds.join(' AND ')} ORDER BY incident_date DESC LIMIT 15`, params
  );
  return { found: rows.length, incidents: rows };
}

async function h_consultar_proveedores({ query, solo_homologados, categoria }) {
  const conds = ['is_active = TRUE']; const params = [];
  if (query) { params.push(`%${query}%`); conds.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length} OR cuit ILIKE $${params.length})`); }
  if (solo_homologados) conds.push('is_homologated = TRUE');
  if (categoria) { params.push(`%${categoria}%`); conds.push(`category ILIKE $${params.length}`); }
  const { rows } = await pool.query(
    `SELECT name, cuit, category, is_homologated, contact_name, contact_email, score
       FROM suppliers WHERE ${conds.join(' AND ')} ORDER BY is_homologated DESC, score DESC NULLS LAST LIMIT 10`, params
  );
  return { found: rows.length, suppliers: rows };
}

async function h_historial_compras({ query, solo_completadas }) {
  const conds = []; const params = [`%${query}%`];
  conds.push(`(description ILIKE $1 OR category ILIKE $1 OR purpose ILIKE $1)`);
  if (solo_completadas) conds.push(`status = 'completada'`);
  else conds.push(`status NOT IN ('cancelada','rechazada')`);
  const { rows } = await pool.query(
    `SELECT code, description, category, amount, estimated_budget, supplier_name, status, purchase_date
       FROM purchases WHERE ${conds.join(' AND ')} ORDER BY created_at DESC LIMIT 10`, params
  );
  return { found: rows.length, purchases: rows };
}

async function h_resumen_dashboard() {
  const [nc, riesgos, leg, tareas, inc, cap] = await Promise.all([
    pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'abierta') AS abiertas,
                       COUNT(*) FILTER (WHERE status NOT IN ('cerrada','cancelada')) AS pendientes,
                       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS ultimos_30
                  FROM findings`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE risk_level = 'alto' AND is_active) AS criticos,
                       COUNT(*) FILTER (WHERE is_active) AS activos FROM risks`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS por_vencer FROM legal_requirements`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status NOT IN ('completada','cancelada')) AS pendientes,
                       COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completada','cancelada')) AS vencidas FROM tasks`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS ultimos_30 FROM incidents`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pendientes FROM trainings`),
  ]);
  return {
    nc: nc.rows[0],
    riesgos: riesgos.rows[0],
    legal: leg.rows[0],
    tareas: tareas.rows[0],
    incidentes: inc.rows[0],
    capacitaciones: cap.rows[0],
  };
}

async function h_consultar_documentos({ query, tipo, norma }) {
  const conds = []; const params = [];
  if (query) { params.push(`%${query}%`); conds.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
  if (tipo && tipo !== 'todos') { params.push(tipo); conds.push(`document_type = $${params.length}`); }
  if (norma && norma !== 'todas'){ params.push(norma); conds.push(`norm = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, title, document_type, norm, version, updated_at FROM documents ${where} ORDER BY updated_at DESC LIMIT 10`, params
  );
  return { found: rows.length, documents: rows };
}

const HANDLERS = {
  consultar_tareas: h_consultar_tareas,
  consultar_hallazgos: h_consultar_hallazgos,
  crear_hallazgo: h_crear_hallazgo,
  consultar_riesgos: h_consultar_riesgos,
  consultar_legal: h_consultar_legal,
  consultar_incidentes: h_consultar_incidentes,
  consultar_proveedores: h_consultar_proveedores,
  historial_compras: h_historial_compras,
  resumen_dashboard: h_resumen_dashboard,
  consultar_documentos: h_consultar_documentos,
};

// ───────────────────────────────────────────────────────────────
// Chat loop con tool_use
// ───────────────────────────────────────────────────────────────
async function chat({ messages, userContext = {} }) {
  const client = getClient();
  const cfg = await getConfig();
  const tools = filterTools(cfg.assistant_enabled_tools);

  let userNote = '';
  if (userContext.full_name) {
    userNote = `\n\n# USUARIO ACTUAL\nNombre: ${userContext.full_name}\nRol: ${userContext.role || 'usuario'}\nÁrea: ${userContext.department || 'N/A'}`;
  }

  const system = BASE_SYSTEM + userNote + (cfg.assistant_system_prompt_extra ? `\n\n# INSTRUCCIONES EXTRA\n${cfg.assistant_system_prompt_extra}` : '');

  let conv = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  const toolsExecuted = [];
  let totalUsage = { input_tokens: 0, output_tokens: 0 };
  let lastResp = null;

  for (let iter = 0; iter < 6; iter++) {
    lastResp = await client.messages.create({
      model: cfg.assistant_model,
      max_tokens: cfg.assistant_max_tokens,
      temperature: cfg.assistant_temperature,
      system,
      tools,
      messages: conv,
    });
    totalUsage.input_tokens += lastResp.usage.input_tokens;
    totalUsage.output_tokens += lastResp.usage.output_tokens;

    if (lastResp.stop_reason === 'tool_use') {
      conv.push({ role: 'assistant', content: lastResp.content });
      const results = [];
      for (const block of lastResp.content) {
        if (block.type === 'tool_use') {
          const handler = HANDLERS[block.name];
          let result;
          try {
            result = handler ? await handler(block.input, userContext) : { error: `tool ${block.name} no implementada` };
          } catch (e) { result = { error: e.message }; }
          toolsExecuted.push({ name: block.name, input: block.input, result });
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
        }
      }
      conv.push({ role: 'user', content: results });
    } else {
      break;
    }
  }

  const text = (lastResp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return {
    content: text || '(respuesta vacía)',
    tools_used: toolsExecuted,
    usage: totalUsage,
    model: lastResp.model,
    config_used: { model: cfg.assistant_model, tools_enabled: cfg.assistant_enabled_tools.length },
  };
}

// ───────────────────────────────────────────────────────────────
// Stats
// ───────────────────────────────────────────────────────────────
async function getStats() {
  const [conv, alerts, repts] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS ultima_semana,
                       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS hoy
                  FROM agent_conversations`).catch(() => ({ rows: [{ total:0, ultima_semana:0, hoy:0 }]})),
    pool.query(`SELECT COUNT(*) AS total_alertas FROM auditor_alerts WHERE created_at >= NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ total_alertas: 0 }]})),
    pool.query(`SELECT COUNT(*) AS reportes_semana FROM auditor_reports WHERE created_at >= NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ reportes_semana: 0 }]})),
  ]);
  return {
    conversaciones: conv.rows[0],
    alertas_auditor: alerts.rows[0],
    reportes_auditor: repts.rows[0],
  };
}

function estimateCostUSD(usage, model) {
  const rates = {
    'claude-haiku-4-5-20251001':  { input: 0.8,  output: 4.0  },
    'claude-haiku-4-5':           { input: 0.8,  output: 4.0  },
    'claude-sonnet-4-5':          { input: 3.0,  output: 15.0 },
    'claude-sonnet-4-6':          { input: 3.0,  output: 15.0 },
    'claude-opus-4-6':            { input: 15.0, output: 75.0 },
  };
  const r = rates[model] || rates['claude-sonnet-4-5'];
  return ((usage.input_tokens * r.input) + (usage.output_tokens * r.output)) / 1_000_000;
}

module.exports = {
  chat,
  getConfig,
  setConfig,
  getStats,
  estimateCostUSD,
  ALL_TOOLS,
  DEFAULTS,
};
