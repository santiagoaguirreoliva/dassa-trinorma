/**
 * DASSA SGI — Agente IA (Copiloto de Gestión)
 *
 * Chat embebido que usa Ollama (Qwen 2.5 7B) con tool-calling
 * para consultar y operar sobre todos los módulos del SGI.
 */
import { Router } from 'express';
import { query as db } from '../db/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All agent routes require authentication
router.use(authenticate);

const OLLAMA_URL   = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';
const USE_GEMINI   = !!GEMINI_KEY; // Use Gemini if API key is available, Ollama as fallback

// ─── System prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres DASSA IA, el asistente inteligente del Sistema de Gestión Integrado (SGI) TRINORMA de DASSA.

DASSA es un depósito fiscal y empresa de logística internacional en Buenos Aires, Argentina.
El SGI cubre ISO 9001 (Calidad), ISO 14001 (Medio Ambiente) e ISO 45001 (Seguridad y Salud Ocupacional).

Tu rol es ser un copiloto de gestión: ayudar a los usuarios a consultar datos, cargar información, y mantener el SGI activo y al día.

REGLAS:
- Respondé siempre en español argentino, profesional pero amigable.
- Sé conciso: respuestas cortas y directas. No des explicaciones innecesarias.
- Cuando el usuario pida cargar algo (hallazgo, tarea, capacitación), usá la herramienta correspondiente.
- Cuando el usuario pregunte por datos, consultá primero con las herramientas antes de responder.
- Si no tenés una herramienta para algo, decilo honestamente.
- Formato: usá texto plano, sin markdown excesivo. Podés usar emojis moderadamente.
- Firmá como "DASSA IA" solo si te preguntan quién sos.

CONTEXTO DEL USUARIO: El usuario actual es {USER_NAME} ({USER_ROLE}).`;

// ─── Tool definitions for Ollama ────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultar_tareas',
      description: 'Consulta las tareas/mejoras pendientes del SGI. Puede filtrar por usuario, estado, o área.',
      parameters: {
        type: 'object',
        properties: {
          estado:    { type: 'string', enum: ['pendiente', 'en_progreso', 'completada', 'vencida', 'todas'], description: 'Filtrar por estado' },
          usuario_id: { type: 'number', description: 'ID del usuario para filtrar sus tareas' },
          limite:    { type: 'number', description: 'Cantidad máxima de resultados (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_hallazgo',
      description: 'Carga un nuevo hallazgo (No Conformidad, Observación u Oportunidad de Mejora) en el SGI.',
      parameters: {
        type: 'object',
        properties: {
          titulo:      { type: 'string', description: 'Título corto del hallazgo' },
          descripcion: { type: 'string', description: 'Descripción detallada de lo encontrado' },
          tipo:        { type: 'string', enum: ['nc_real', 'nc_potencial', 'mejora', 'desvio_cliente'], description: 'Tipo de hallazgo' },
          area:        { type: 'string', description: 'Área donde se detectó' },
          origen:      { type: 'string', enum: ['auditoria_interna', 'auditoria_externa', 'inspeccion', 'reclamo_cliente', 'desvio_operativo', 'accidente', 'revision_direccion', 'comite'], description: 'Origen del hallazgo' },
        },
        required: ['titulo', 'descripcion', 'tipo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_hallazgos',
      description: 'Consulta los hallazgos/NC existentes en el SGI.',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['abierto', 'analisis', 'plan_accion', 'en_ejecucion', 'verificacion', 'cerrado', 'todos'], description: 'Filtrar por estado' },
          tipo:   { type: 'string', enum: ['nc_real', 'nc_potencial', 'mejora', 'desvio_cliente', 'todos'], description: 'Filtrar por tipo' },
          limite: { type: 'number', description: 'Cantidad máxima (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cargar_capacitacion',
      description: 'Registra una nueva capacitación realizada o programa una futura.',
      parameters: {
        type: 'object',
        properties: {
          titulo:      { type: 'string', description: 'Nombre del curso/capacitación' },
          descripcion: { type: 'string', description: 'Descripción del contenido' },
          tipo:        { type: 'string', enum: ['capacitacion', 'reunion', 'simulacro', 'examen_medico', 'induccion'], description: 'Tipo de capacitación' },
          fecha:       { type: 'string', description: 'Fecha de la capacitación (YYYY-MM-DD)' },
          duracion_horas: { type: 'number', description: 'Duración en horas' },
          instructor:  { type: 'string', description: 'Nombre del instructor' },
        },
        required: ['titulo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_encuestas',
      description: 'Consulta el estado de campañas de encuestas, tasa de respuesta y resultados.',
      parameters: {
        type: 'object',
        properties: {
          campaign_id: { type: 'number', description: 'ID de campaña específica' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_riesgos',
      description: 'Consulta la matriz de riesgos del SGI.',
      parameters: {
        type: 'object',
        properties: {
          nivel: { type: 'string', enum: ['alto', 'medio', 'bajo', 'todos'], description: 'Filtrar por nivel de riesgo' },
          norma: { type: 'string', enum: ['ISO 9001', 'ISO 14001', 'ISO 45001', 'todas'], description: 'Filtrar por norma' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_legal',
      description: 'Consulta requisitos legales, su estado de cumplimiento y vencimientos.',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['vigente', 'por_vencer', 'vencido', 'todos'], description: 'Filtrar por estado' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumen_dashboard',
      description: 'Obtiene un resumen general del estado del SGI: hallazgos abiertos, tareas pendientes, encuestas activas, riesgos altos, etc.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_incidentes',
      description: 'Consulta incidentes de seguridad y salud ocupacional reportados.',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['abierto', 'investigacion', 'cerrado', 'todos'], description: 'Filtrar por estado' },
          limite: { type: 'number', description: 'Cantidad máxima (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_proveedores',
      description: 'Consulta el listado de proveedores evaluados y su estado.',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['aprobado', 'condicional', 'rechazado', 'todos'], description: 'Filtrar por estado' },
        },
        required: [],
      },
    },
  },
];

// ─── Tool implementations ───────────────────────────────────────

async function consultar_tareas({ estado, usuario_id, limite = 10 }) {
  let where = ['1=1'];
  const params = [];
  let idx = 1;

  // task_status enum: pendiente, en_curso, completada, cancelada
  if (estado && estado !== 'todas') {
    if (estado === 'vencida') {
      where.push(`t.status != 'completada' AND t.due_date < NOW()`);
    } else if (estado === 'pendiente') {
      where.push(`t.status = 'pendiente'`);
    } else if (estado === 'en_progreso') {
      where.push(`t.status = 'en_curso'`);
    } else if (estado === 'completada') {
      where.push(`t.status = 'completada'`);
    }
  }
  if (usuario_id) {
    where.push(`t.assigned_to = $${idx++}`);
    params.push(usuario_id);
  }

  params.push(limite);
  const sql = `
    SELECT t.id, t.title, t.status, t.priority, t.due_date, t.category, t.iso_norm,
           u.full_name as assigned_to_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE ${where.join(' AND ')}
    ORDER BY t.due_date ASC NULLS LAST
    LIMIT $${idx}`;

  const { rows } = await db(sql, params);
  return {
    total: rows.length,
    tareas: rows.map(r => ({
      id: r.id,
      titulo: r.title,
      estado: r.status,
      prioridad: r.priority,
      vencimiento: r.due_date ? new Date(r.due_date).toLocaleDateString('es-AR') : 'Sin fecha',
      categoria: r.category,
      norma: r.iso_norm,
      asignado: r.assigned_to_name || 'Sin asignar',
    })),
  };
}

async function crear_hallazgo({ titulo, descripcion, tipo, norma, area, origen }, userId) {
  // Generate next code
  const { rows: codeRows } = await db(`SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM '[0-9]+') AS INT)), 0) + 1 as next FROM findings`);
  const code = `NC-${String(codeRows[0].next).padStart(3, '0')}`;

  const { rows } = await db(
    `INSERT INTO findings (code, title, description, finding_type, area, origin, status, reported_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, NOW())
     RETURNING id, code, title, finding_type, status`,
    [code, titulo, descripcion, tipo || 'mejora', area || null, origen || 'desvio_operativo', userId]
  );
  return { mensaje: `Hallazgo ${rows[0].code} creado exitosamente`, hallazgo: rows[0] };
}

async function consultar_hallazgos({ estado, tipo, limite = 10 }) {
  let where = ['1=1'];
  // finding_status enum: abierto, analisis, plan_accion, en_ejecucion, verificacion, cerrado
  if (estado && estado !== 'todos') where.push(`f.status = '${estado}'`);
  if (tipo && tipo !== 'todos') where.push(`f.finding_type = '${tipo}'`);

  const { rows } = await db(
    `SELECT f.id, f.code, f.title, f.finding_type, f.status, f.area, f.origin, f.created_at,
            u.full_name as reportado_por
     FROM findings f
     LEFT JOIN users u ON u.id = f.reported_by
     WHERE ${where.join(' AND ')}
     ORDER BY f.created_at DESC
     LIMIT $1`, [limite]
  );
  return {
    total: rows.length,
    hallazgos: rows.map(r => ({
      id: r.id, codigo: r.code, titulo: r.title, tipo: r.finding_type, estado: r.status,
      area: r.area, origen: r.origin,
      fecha: new Date(r.created_at).toLocaleDateString('es-AR'),
      reportado_por: r.reportado_por,
    })),
  };
}

async function cargar_capacitacion({ titulo, descripcion, tipo, fecha, duracion_horas, instructor }, userId) {
  const { rows } = await db(
    `INSERT INTO trainings (title, description, training_type, scheduled_date, duration_hours, instructor, status, organized_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'programada', $7, NOW())
     RETURNING id, title, status`,
    [titulo, descripcion || '', tipo || 'capacitacion', fecha || null, duracion_horas || null, instructor || null, userId]
  );
  return { mensaje: `Capacitación #${rows[0].id} registrada exitosamente`, capacitacion: rows[0] };
}

async function consultar_encuestas({ campaign_id }) {
  if (campaign_id) {
    const { rows } = await db(
      `SELECT sc.id, sc.title, sc.status, s.title as survey_title,
              COUNT(sr.id) as total_recipients,
              COUNT(sr.id) FILTER (WHERE sr.completed_at IS NOT NULL) as completed
       FROM survey_campaigns sc
       JOIN surveys s ON s.id = sc.survey_id
       LEFT JOIN survey_recipients sr ON sr.campaign_id = sc.id
       WHERE sc.id = $1::uuid
       GROUP BY sc.id, sc.title, sc.status, s.title`, [campaign_id]
    );
    return rows[0] || { error: 'Campaña no encontrada' };
  }

  const { rows } = await db(
    `SELECT sc.id, sc.title, sc.status, s.title as survey_title,
            COUNT(sr.id) as total_recipients,
            COUNT(sr.id) FILTER (WHERE sr.completed_at IS NOT NULL) as completed
     FROM survey_campaigns sc
     JOIN surveys s ON s.id = sc.survey_id
     LEFT JOIN survey_recipients sr ON sr.campaign_id = sc.id
     GROUP BY sc.id, sc.title, sc.status, s.title
     ORDER BY sc.created_at DESC
     LIMIT 10`
  );
  return { total: rows.length, campañas: rows };
}

async function consultar_riesgos({ nivel, norma }) {
  let where = ['r.is_active = true'];
  if (nivel && nivel !== 'todos') {
    where.push(`r.risk_level = '${nivel}'`);
  }

  const { rows } = await db(
    `SELECT r.id, r.code, r.activity, r.hazard, r.risk_factor, r.risk_level,
            r.probability, r.severity, r.ir, r.current_controls, r.control_status,
            u.full_name as responsable
     FROM risks r
     LEFT JOIN users u ON u.id = r.responsible_id
     WHERE ${where.join(' AND ')}
     ORDER BY r.ir DESC NULLS LAST
     LIMIT 15`
  );
  return {
    total: rows.length,
    riesgos: rows.map(r => ({
      id: r.id, codigo: r.code, actividad: r.activity,
      peligro: r.hazard, factor_riesgo: r.risk_factor,
      nivel: r.risk_level, probabilidad: r.probability,
      severidad: r.severity, indice_riesgo: r.ir,
      controles: r.current_controls, estado_control: r.control_status,
      responsable: r.responsable,
    })),
  };
}

async function consultar_legal({ estado }) {
  let where = ['lr.is_active = true'];
  if (estado === 'por_vencer') where.push(`lr.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`);
  else if (estado === 'vencido') where.push(`lr.expiration_date < NOW()`);
  else if (estado === 'vigente') where.push(`(lr.expiration_date IS NULL OR lr.expiration_date > NOW())`);

  const { rows } = await db(
    `SELECT lr.id, lr.code, lr.title, lr.category, lr.issuing_authority,
            lr.applicable_area, lr.expiration_date, lr.last_verification_date,
            u.full_name as responsable
     FROM legal_requirements lr
     LEFT JOIN users u ON u.id = lr.responsible_id
     WHERE ${where.join(' AND ')}
     ORDER BY lr.expiration_date ASC NULLS LAST
     LIMIT 15`
  );
  return {
    total: rows.length,
    requisitos: rows.map(r => ({
      id: r.id, codigo: r.code, titulo: r.title, categoria: r.category,
      autoridad: r.issuing_authority, area: r.applicable_area,
      vencimiento: r.expiration_date ? new Date(r.expiration_date).toLocaleDateString('es-AR') : 'Sin vencimiento',
      ultima_verificacion: r.last_verification_date ? new Date(r.last_verification_date).toLocaleDateString('es-AR') : '-',
      responsable: r.responsable,
    })),
  };
}

async function resumen_dashboard() {
  const [hallazgos, tareas, campañas, riesgos, legal, incidentes] = await Promise.all([
    db(`SELECT COUNT(*) FILTER (WHERE status = 'abierto') as abiertos,
        COUNT(*) FILTER (WHERE status NOT IN ('abierto','cerrado')) as en_tratamiento
        FROM findings`),
    db(`SELECT COUNT(*) FILTER (WHERE status != 'completada' AND status != 'cancelada') as pendientes,
        COUNT(*) FILTER (WHERE status != 'completada' AND status != 'cancelada' AND due_date < NOW()) as vencidas
        FROM tasks`),
    db(`SELECT COUNT(*) FILTER (WHERE status = 'active') as activas FROM survey_campaigns`),
    db(`SELECT COUNT(*) FILTER (WHERE risk_level = 'alto' AND is_active = true) as altos FROM risks`),
    db(`SELECT COUNT(*) FILTER (WHERE expiration_date < NOW() AND is_active = true) as vencidos FROM legal_requirements`),
    db(`SELECT COUNT(*) FILTER (WHERE status != 'closed') as abiertos FROM incidents`),
  ]);

  return {
    hallazgos_abiertos: parseInt(hallazgos.rows[0].abiertos),
    hallazgos_en_tratamiento: parseInt(hallazgos.rows[0].en_tratamiento),
    tareas_pendientes: parseInt(tareas.rows[0].pendientes),
    tareas_vencidas: parseInt(tareas.rows[0].vencidas),
    campañas_activas: parseInt(campañas.rows[0].activas),
    riesgos_altos: parseInt(riesgos.rows[0].altos),
    requisitos_legales_vencidos: parseInt(legal.rows[0].vencidos),
    incidentes_abiertos: parseInt(incidentes.rows[0].abiertos),
  };
}

async function consultar_incidentes({ estado, limite = 10 }) {
  let where = ['1=1'];
  if (estado && estado !== 'todos') {
    where.push(`i.status = '${estado}'`);
  }

  const { rows } = await db(
    `SELECT i.id, i.code, i.incident_type, i.description, i.status, i.severity,
            i.date, i.area, u.full_name as reportado_por
     FROM incidents i
     LEFT JOIN users u ON u.id = i.reported_by
     WHERE ${where.join(' AND ')}
     ORDER BY i.date DESC
     LIMIT $1`, [limite]
  );
  return {
    total: rows.length,
    incidentes: rows.map(r => ({
      id: r.id, codigo: r.code, tipo: r.incident_type,
      descripcion: r.description?.substring(0, 100),
      estado: r.status, severidad: r.severity,
      fecha: r.date ? new Date(r.date).toLocaleDateString('es-AR') : '-',
      area: r.area, reportado_por: r.reportado_por,
    })),
  };
}

async function consultar_proveedores({ estado }) {
  let where = ['1=1'];
  if (estado && estado !== 'todos') {
    if (estado === 'aprobado') where.push(`s.is_homologated = true`);
    else if (estado === 'rechazado') where.push(`s.is_homologated = false`);
  }

  const { rows } = await db(
    `SELECT s.id, s.name, s.category, s.is_homologated, s.score,
            s.homologation_date, s.homologation_expiry, s.contact_name, s.is_active
     FROM suppliers s
     WHERE ${where.join(' AND ')} AND s.is_active = true
     ORDER BY s.name
     LIMIT 20`
  );
  return {
    total: rows.length,
    proveedores: rows.map(r => ({
      id: r.id, nombre: r.name, categoria: r.category,
      homologado: r.is_homologated ? 'Sí' : 'No',
      puntaje: r.score,
      vencimiento_homologacion: r.homologation_expiry ? new Date(r.homologation_expiry).toLocaleDateString('es-AR') : '-',
      contacto: r.contact_name,
    })),
  };
}

// Map tool names to functions
const TOOL_HANDLERS = {
  consultar_tareas,
  crear_hallazgo,
  consultar_hallazgos,
  cargar_capacitacion,
  consultar_encuestas,
  consultar_riesgos,
  consultar_legal,
  resumen_dashboard,
  consultar_incidentes,
  consultar_proveedores,
};

// ─── Gemini API helper ──────────────────────────────────────────

function convertToolsToGemini(tools) {
  return [{
    functionDeclarations: tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];
}

function convertMessagesToGemini(messages) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      if (m.tool_calls) {
        for (const tc of m.tool_calls) {
          parts.push({ functionCall: { name: tc.function.name, args: tc.function.arguments || {} } });
        }
      }
      if (parts.length > 0) contents.push({ role: 'model', parts });
    } else if (m.role === 'tool') {
      let parsed;
      try { parsed = JSON.parse(m.content); } catch { parsed = { result: m.content }; }
      contents.push({
        role: 'function',
        parts: [{ functionResponse: { name: '_tool', response: parsed } }],
      });
    }
  }
  return contents;
}

async function geminiChat(messages, toolsToUse = []) {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const contents = convertMessagesToGemini(messages);

  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemMsg }] },
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  if (toolsToUse.length > 0) {
    body.tools = convertToolsToGemini(toolsToUse);
    body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('No response from Gemini');

  const parts = candidate.content?.parts || [];
  const textParts = parts.filter(p => p.text).map(p => p.text).join('');
  const funcCalls = parts.filter(p => p.functionCall).map(p => ({
    function: { name: p.functionCall.name, arguments: p.functionCall.args || {} },
  }));

  return {
    message: {
      role: 'assistant',
      content: textParts,
      tool_calls: funcCalls.length > 0 ? funcCalls : undefined,
    },
    eval_count: data.usageMetadata?.candidatesTokenCount || 0,
    model_used: 'gemini-2.0-flash',
  };
}

// ─── Ollama API helper (fallback) ───────────────────────────────

async function ollamaChat(messages, toolsToUse = TOOLS) {
  const body = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.3, num_predict: 1024 },
  };
  if (toolsToUse.length > 0) body.tools = toolsToUse;

  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  data.model_used = OLLAMA_MODEL;
  return data;
}

// ─── Unified chat function ──────────────────────────────────────

async function aiChat(messages, useTools = true, toolsToUse = TOOLS) {
  const tools = useTools ? toolsToUse : [];
  if (USE_GEMINI) {
    try {
      return await geminiChat(messages, tools);
    } catch (err) {
      console.error('[Agent] Gemini failed, falling back to Ollama:', err.message);
    }
  }
  return ollamaChat(messages, tools);
}

// ─── Governance helpers ─────────────────────────────────────────

// Cache config for 60s to avoid DB hits on every message
let configCache = null;
let configCacheTime = 0;

async function getConfig() {
  if (configCache && Date.now() - configCacheTime < 60_000) return configCache;
  const { rows } = await db(`SELECT key, value FROM agent_config`);
  configCache = {};
  for (const r of rows) configCache[r.key] = r.value;
  configCacheTime = Date.now();
  return configCache;
}

async function getKnowledgeBase() {
  const { rows } = await db(
    `SELECT title, category, content, summary FROM agent_knowledge WHERE is_active = true ORDER BY category, title`
  );
  return rows;
}

async function checkRateLimit(userId) {
  const config = await getConfig();
  const maxPerHour = parseInt(config.max_messages_per_hour) || 50;
  const { rows } = await db(
    `SELECT COUNT(*) as n FROM agent_conversations
     WHERE user_id = $1 AND role = 'user' AND created_at > NOW() - INTERVAL '1 hour'`, [userId]
  );
  return parseInt(rows[0].n) < maxPerHour;
}

async function checkRestrictions(message, userId) {
  const config = await getConfig();
  const restricted = config.restricted_topics || [];
  const lowerMsg = message.toLowerCase();
  for (const topic of restricted) {
    // Simple keyword check — could be upgraded to semantic similarity later
    const keywords = topic.toLowerCase().split(' ');
    const matches = keywords.filter(k => k.length > 3 && lowerMsg.includes(k));
    if (matches.length >= 2) {
      // Log the restriction
      await db(
        `INSERT INTO agent_restrictions_log (user_id, user_message, restriction) VALUES ($1, $2, $3)`,
        [userId, message.substring(0, 500), topic]
      ).catch(() => {});
      return topic;
    }
  }
  return null;
}

function getToolsForRole(role, config) {
  const perms = config.allowed_tools_by_role || {};
  const allowed = perms[role] || ['resumen_dashboard', 'consultar_tareas'];
  if (allowed.includes('*')) return TOOLS;
  return TOOLS.filter(t => allowed.includes(t.function.name));
}

async function logConversation(userId, sessionId, role, content, toolCalls = [], tokens = 0, responseMs = 0) {
  await db(
    `INSERT INTO agent_conversations (user_id, session_id, role, content, tool_calls, tokens_used, response_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, sessionId, role, content.substring(0, 10000), JSON.stringify(toolCalls), tokens, responseMs]
  ).catch(err => console.error('[Agent] Log error:', err.message));
}

// ─── Chat endpoint (with governance) ────────────────────────────

router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const userId   = req.user?.id;
    const userName = req.user?.full_name || 'Usuario';
    const userRole = req.user?.role || 'viewer';
    const { message, history = [], sessionId = `s_${Date.now()}` } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    // 1. Rate limiting
    const withinLimit = await checkRateLimit(userId);
    if (!withinLimit) {
      return res.status(429).json({
        reply: 'Alcanzaste el límite de mensajes por hora. Intentá de nuevo más tarde.',
      });
    }

    // 2. Check restricted topics
    const restriction = await checkRestrictions(message, userId);
    if (restriction) {
      const restrictedReply = `No puedo responder sobre "${restriction}" por política de seguridad de la empresa. Si necesitás esta información, consultá directamente con tu supervisor o con la dirección.`;
      await logConversation(userId, sessionId, 'user', message);
      await logConversation(userId, sessionId, 'assistant', restrictedReply);
      return res.json({ reply: restrictedReply, tool_calls_made: 0, restricted: true });
    }

    // 3. Load config, knowledge base, and role-based tools
    const config = await getConfig();
    const knowledge = await getKnowledgeBase();
    const roleTools = getToolsForRole(userRole, config);

    // 4. Build system prompt with knowledge base
    let systemMsg = SYSTEM_PROMPT
      .replace('{USER_NAME}', userName)
      .replace('{USER_ROLE}', userRole);

    // Inject extra system prompt from config
    const extraPrompt = config.system_prompt_extra;
    if (extraPrompt) systemMsg += '\n\n' + extraPrompt;

    // Inject restriction rules
    const restricted = config.restricted_topics || [];
    if (restricted.length > 0) {
      systemMsg += `\n\nTEMAS PROHIBIDOS (nunca respondas sobre estos temas, decí que es información restringida):\n- ${restricted.join('\n- ')}`;
    }

    // Inject knowledge base
    if (knowledge.length > 0) {
      systemMsg += '\n\nBASE DE CONOCIMIENTO (usá esta información para responder cuando sea relevante):';
      for (const k of knowledge) {
        systemMsg += `\n\n[${k.category}] ${k.title}:\n${k.summary || k.content.substring(0, 500)}`;
      }
    }

    const messages = [
      { role: 'system', content: systemMsg },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // 5. Log user message
    await logConversation(userId, sessionId, 'user', message);

    // 6. Call Ollama with role-filtered tools
    let response = await aiChat(messages, roleTools.length > 0, roleTools);
    let assistantMsg = response.message;

    // 7. Handle tool calls (loop for multi-step)
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    const allToolCalls = [];

    while (assistantMsg.tool_calls?.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      messages.push(assistantMsg);

      for (const tc of assistantMsg.tool_calls) {
        const fn = TOOL_HANDLERS[tc.function.name];
        let result;
        if (fn) {
          try {
            const args = tc.function.arguments || {};
            if (['crear_hallazgo', 'cargar_capacitacion'].includes(tc.function.name)) {
              result = await fn(args, userId);
            } else {
              result = await fn(args);
            }
            allToolCalls.push({ name: tc.function.name, args, result: 'ok' });
          } catch (err) {
            result = { error: `Error ejecutando ${tc.function.name}: ${err.message}` };
            allToolCalls.push({ name: tc.function.name, args: tc.function.arguments, error: err.message });
          }
        } else {
          result = { error: `Herramienta "${tc.function.name}" no disponible para tu rol` };
          allToolCalls.push({ name: tc.function.name, denied: true });
        }

        messages.push({ role: 'tool', content: JSON.stringify(result) });
      }

      response = await aiChat(messages, roleTools.length > 0, roleTools);
      assistantMsg = response.message;
    }

    const reply = assistantMsg.content || 'No pude generar una respuesta.';
    const responseMs = Date.now() - startTime;

    // 8. Log assistant response
    await logConversation(userId, sessionId, 'assistant', reply, allToolCalls,
      response.eval_count || 0, responseMs);

    res.json({
      reply,
      tool_calls_made: iterations,
    });

  } catch (err) {
    console.error('[Agent] Error:', err.message);
    res.status(500).json({
      reply: 'Disculpá, tuve un problema procesando tu consulta. Intentá de nuevo en unos segundos.',
      error: err.message,
    });
  }
});

// ─── Alerts endpoint (called by frontend on load) ───────────────

router.get('/alerts', async (req, res) => {
  try {
    const userId = req.user?.id;

    const [overdueTasks, openFindings, upcomingLegal, activeSurveys] = await Promise.all([
      db(`SELECT COUNT(*) as n FROM tasks
          WHERE status NOT IN ('completada','cancelada') AND due_date < NOW()
          ${userId ? `AND assigned_to = '${userId}'` : ''}`),
      db(`SELECT COUNT(*) as n FROM findings WHERE status = 'abierto'`),
      db(`SELECT COUNT(*) as n FROM legal_requirements
          WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND is_active = true`),
      db(`SELECT sc.title, COUNT(sr.id) FILTER (WHERE sr.completed_at IS NULL) as pending
          FROM survey_campaigns sc
          JOIN survey_recipients sr ON sr.campaign_id = sc.id
          WHERE sc.status = 'active'
          GROUP BY sc.id, sc.title
          HAVING COUNT(sr.id) FILTER (WHERE sr.completed_at IS NULL) > 0
          LIMIT 3`),
    ]);

    const alerts = [];

    const overdueN = parseInt(overdueTasks.rows[0].n);
    if (overdueN > 0) {
      alerts.push({
        type: 'warning',
        icon: '⚠️',
        message: `Tenés ${overdueN} tarea${overdueN > 1 ? 's' : ''} vencida${overdueN > 1 ? 's' : ''}`,
        action: '/tasks',
      });
    }

    const openN = parseInt(openFindings.rows[0].n);
    if (openN > 0) {
      alerts.push({
        type: 'info',
        icon: '🔍',
        message: `Hay ${openN} hallazgo${openN > 1 ? 's' : ''} abierto${openN > 1 ? 's' : ''} sin tratar`,
        action: '/findings',
      });
    }

    const legalN = parseInt(upcomingLegal.rows[0].n);
    if (legalN > 0) {
      alerts.push({
        type: 'warning',
        icon: '📋',
        message: `${legalN} requisito${legalN > 1 ? 's' : ''} legal${legalN > 1 ? 'es' : ''} vence${legalN > 1 ? 'n' : ''} en los próximos 30 días`,
        action: '/legal',
      });
    }

    for (const s of activeSurveys.rows) {
      alerts.push({
        type: 'info',
        icon: '📊',
        message: `Encuesta "${s.name}": ${s.pending} respuestas pendientes`,
        action: '/surveys',
      });
    }

    res.json({ alerts });
  } catch (err) {
    console.error('[Agent] Alerts error:', err.message);
    res.json({ alerts: [] });
  }
});

// ─── Chat history (DB-backed) ───────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rows } = await db(
      `SELECT role, content FROM agent_conversations
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`, [userId]
    );
    res.json({ history: rows.reverse() });
  } catch {
    res.json({ history: [] });
  }
});

router.post('/history', (req, res) => {
  // No-op — history is now auto-saved in DB via logConversation
  res.json({ ok: true });
});

// ─── Admin endpoints (master_admin / director only) ─────────────

function requireAdmin(req, res, next) {
  if (!['master_admin', 'director'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
  }
  next();
}

// GET /api/agent/admin/conversations — all conversations with filters
router.get('/admin/conversations', requireAdmin, async (req, res) => {
  try {
    const { user_id, flagged, search, limit = 100, offset = 0 } = req.query;
    let where = ['1=1'];
    const params = [];
    let idx = 1;

    if (user_id) { where.push(`ac.user_id = $${idx++}::uuid`); params.push(user_id); }
    if (flagged === 'true') where.push(`ac.flagged = true`);
    if (search) { where.push(`ac.content ILIKE $${idx++}`); params.push(`%${search}%`); }

    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await db(
      `SELECT ac.id, ac.user_id, ac.session_id, ac.role, ac.content, ac.tool_calls,
              ac.tokens_used, ac.response_ms, ac.flagged, ac.flag_reason, ac.model,
              ac.created_at, u.full_name as user_name, u.role as user_role
       FROM agent_conversations ac
       LEFT JOIN users u ON u.id = ac.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ac.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`, params
    );

    const { rows: countRows } = await db(
      `SELECT COUNT(*) as total FROM agent_conversations ac WHERE ${where.join(' AND ')}`,
      params.slice(0, -2)
    );

    res.json({ conversations: rows, total: parseInt(countRows[0].total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/admin/stats — usage metrics
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [total, today, byUser, avgResponse, topTools, restrictions] = await Promise.all([
      db(`SELECT COUNT(*) as n FROM agent_conversations WHERE role = 'user'`),
      db(`SELECT COUNT(*) as n FROM agent_conversations WHERE role = 'user' AND created_at > CURRENT_DATE`),
      db(`SELECT u.full_name, COUNT(*) as messages
          FROM agent_conversations ac JOIN users u ON u.id = ac.user_id
          WHERE ac.role = 'user'
          GROUP BY u.full_name ORDER BY messages DESC LIMIT 10`),
      db(`SELECT AVG(response_ms) as avg_ms FROM agent_conversations WHERE role = 'assistant' AND response_ms > 0`),
      db(`SELECT tc->>'name' as tool, COUNT(*) as n
          FROM agent_conversations, jsonb_array_elements(tool_calls) tc
          WHERE role = 'assistant' AND jsonb_array_length(tool_calls) > 0
          GROUP BY tc->>'name' ORDER BY n DESC LIMIT 10`),
      db(`SELECT COUNT(*) as n FROM agent_restrictions_log`),
    ]);

    res.json({
      total_messages: parseInt(total.rows[0].n),
      today_messages: parseInt(today.rows[0].n),
      messages_by_user: byUser.rows,
      avg_response_ms: Math.round(parseFloat(avgResponse.rows[0].avg_ms) || 0),
      top_tools: topTools.rows,
      total_restrictions: parseInt(restrictions.rows[0].n),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agent/admin/flag/:id — flag/unflag a conversation
router.patch('/admin/flag/:id', requireAdmin, async (req, res) => {
  try {
    const { flagged, flag_reason } = req.body;
    await db(
      `UPDATE agent_conversations SET flagged = $1, flag_reason = $2 WHERE id = $3`,
      [flagged, flag_reason || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Knowledge Base CRUD ────────────────────────────────────────

router.get('/admin/knowledge', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT ak.*, u1.full_name as uploaded_by_name, u2.full_name as approved_by_name
       FROM agent_knowledge ak
       LEFT JOIN users u1 ON u1.id = ak.uploaded_by
       LEFT JOIN users u2 ON u2.id = ak.approved_by
       ORDER BY ak.category, ak.title`
    );
    res.json({ knowledge: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/knowledge', requireAdmin, async (req, res) => {
  try {
    const { title, category, content, summary, source_url } = req.body;
    const { rows } = await db(
      `INSERT INTO agent_knowledge (title, category, content, summary, source_url, uploaded_by, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
       RETURNING *`,
      [title, category || 'general', content, summary || null, source_url || null, req.user.id]
    );
    configCacheTime = 0; // invalidate cache
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/knowledge/:id', requireAdmin, async (req, res) => {
  try {
    const { title, category, content, summary, source_url, is_active } = req.body;
    await db(
      `UPDATE agent_knowledge SET title=$1, category=$2, content=$3, summary=$4,
              source_url=$5, is_active=$6, updated_at=NOW() WHERE id=$7`,
      [title, category, content, summary, source_url, is_active, req.params.id]
    );
    configCacheTime = 0;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/knowledge/:id', requireAdmin, async (req, res) => {
  try {
    await db(`DELETE FROM agent_knowledge WHERE id = $1`, [req.params.id]);
    configCacheTime = 0;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Config CRUD ────────────────────────────────────────────────

router.get('/admin/config', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db(`SELECT * FROM agent_config ORDER BY key`);
    res.json({ config: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/config/:key', requireAdmin, async (req, res) => {
  try {
    const { value } = req.body;
    await db(
      `UPDATE agent_config SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3`,
      [JSON.stringify(value), req.user.id, req.params.key]
    );
    configCacheTime = 0; // invalidate cache
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Restrictions log ───────────────────────────────────────────

router.get('/admin/restrictions', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db(
      `SELECT arl.*, u.full_name FROM agent_restrictions_log arl
       LEFT JOIN users u ON u.id = arl.user_id
       ORDER BY arl.created_at DESC LIMIT 100`
    );
    res.json({ restrictions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
