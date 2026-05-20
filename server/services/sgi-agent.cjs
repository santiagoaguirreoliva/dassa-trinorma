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
    'consultar_estado_ciclo','iniciar_revision','validar_revision',
    'consultar_objetivos','consultar_cambios','consultar_procedimientos','consultar_organigrama',
    'consultar_rondas',
    'consultar_empleado','consultar_puesto','consultar_organigrama_detalle',
    'buscar_contacto_externo',
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
  {
    name: 'consultar_estado_ciclo',
    description: 'Devuelve el estado completo de un ciclo anual de revisiones del SGI (FODA, Fichas, Procedimientos, AMFE Riesgos, Objetivos, etc.). Muestra qué está validado, qué está bloqueado, qué destraba qué, y qué le falta a NIXA.',
    input_schema: {
      type: 'object',
      properties: {
        year: { type: 'integer', description: 'Año del ciclo, ej. 2026' },
      },
      required: ['year'],
    },
  },
  {
    name: 'iniciar_revision',
    description: 'Marca una revisión como en_revision (de programada). Falla si tiene dependencias sin validar.',
    input_schema: {
      type: 'object',
      properties: { review_id: { type: 'string' } },
      required: ['review_id'],
    },
  },
  {
    name: 'validar_revision',
    description: 'Valida (o rechaza) una revisión. Solo el validator asignado puede. Al validarse, se destraban las child reviews automáticamente.',
    input_schema: {
      type: 'object',
      properties: {
        review_id: { type: 'string' },
        approve:   { type: 'boolean', description: 'true=validada, false=rechazada' },
        notes:     { type: 'string' },
      },
      required: ['review_id','approve'],
    },
  },
  {
    name: 'consultar_objetivos',
    description: 'Lista objetivos corporativos del SGI por año. Filtra por estado (activo/cumplido/no_cumplido/postpuesto).',
    input_schema: { type: 'object', properties: {
      year: { type: 'integer' },
      status: { type: 'string', enum: ['activo','cumplido','no_cumplido','postpuesto','todos'] }
    }},
  },
  {
    name: 'consultar_cambios',
    description: 'Lista gestión de cambios (proyectos/mejoras) del SGI por año y estado.',
    input_schema: { type: 'object', properties: {
      year: { type: 'integer' },
      status: { type: 'string', enum: ['propuesto','aprobado','en_curso','completado','cancelado','postpuesto','todos'] }
    }},
  },
  {
    name: 'consultar_procedimientos',
    description: 'Lista los procedimientos del sistema (instructivos de cómo completar cada módulo). Filtra por módulo o búsqueda.',
    input_schema: { type: 'object', properties: {
      module: { type: 'string', description: 'findings|risks|purchases|trainings|incidents|etc.' },
      query: { type: 'string' }
    }},
  },
  {
    name: 'consultar_organigrama',
    description: 'Devuelve el organigrama de DASSA: nodos, áreas y puestos con empleados asignados.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_rondas',
    description: 'Consulta el módulo Ronda de Inspecciones del SGI: estado de rondines (limpieza, mantenimiento, SSHH) y checklists diarios de maquinaria (autoelevadores). Devuelve resumen del período, % de cumplimiento, vencidas, máquinas con alerta, ítems críticos en falla y hallazgos generados.',
    input_schema: { type: 'object', properties: {
      familia: { type: 'string', enum: ['rondin', 'maquinaria', 'todas'], description: 'rondin = supervisión humana; maquinaria = checklist diario de autoelevadores' },
      ultimos_dias: { type: 'integer', description: 'Ventana en días (default 7)' },
      template_code: { type: 'string', description: 'Filtrar por código de plantilla (F-TRI-19/20/23/SSHH)' },
    }},
  },
  {
    name: 'consultar_empleado',
    description: 'PRIORITARIA para consultas SOBRE UNA PERSONA específica de DASSA por nombre o email. Devuelve la ficha personal completa: contacto (email, teléfono, WhatsApp, dirección), datos laborales (CUIL, ingreso, modalidad, jornada), supervisor jerárquico, puestos asignados (titular y cobertura) y habilitaciones/certificaciones con vencimientos. USAR SIEMPRE que la pregunta sea "quién es X", "qué teléfono tiene Y", "cuándo entró Z", "quién supervisa a W", "qué puesto tiene X", "habilitaciones de Y". NO usar consultar_organigrama para esto.',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Nombre, apellido o email (matching parcial, case-insensitive)' },
    }, required: ['query'] },
  },
  {
    name: 'consultar_puesto',
    description: 'Busca una ficha de puesto por nombre o área. Devuelve misión, responsabilidades principales y secundarias, competencias, capacitaciones requeridas, empleados asignados (titular + cobertura) y nodo del organigrama. Útil para "¿qué hace un Apuntador?", "¿quién cubre el puesto de Maquinista?".',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Nombre del puesto o área' },
    }, required: ['query'] },
  },
  {
    name: 'consultar_organigrama_detalle',
    description: 'Devuelve el organigrama completo de DASSA: triunvirato + áreas + sectores + puestos + empleados + contactos externos. Útil para preguntas estructurales tipo "¿cómo está organizado el depósito?", "¿cuántas personas reportan a Manuel?", "¿qué incluye Coordinación?".',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_contacto_externo',
    description: 'Busca un proveedor estratégico o consultor externo (no empleado) que figura en el organigrama. Ej.: Nixa Méndez (Consultora SGI), Toti (Mantenimiento). Devuelve rol, organización, contactos y supervisor en DASSA.',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Nombre, rol u organización (matching parcial)' },
    }, required: ['query'] },
  }
];

function filterTools(enabledNames) {
  if (!Array.isArray(enabledNames) || enabledNames.length === 0) return ALL_TOOLS;
  return ALL_TOOLS.filter(t => enabledNames.includes(t.name));
}

// ───────────────────────────────────────────────────────────────
// Handlers
// ───────────────────────────────────────────────────────────────
async function h_consultar_tareas({ usuario_email, estado, solo_vencidas, query_texto }, _ctx) {
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

async function h_consultar_hallazgos({ estado, severidad: _sev, categoria, usuario_email, query_texto }) {
  const conds = []; const params = [];
  if (estado && estado !== 'todas') { params.push(estado); conds.push(`f.status = $${params.length}`); }
  // 'categoria' del prompt mapea a 'finding_type' real (NC/desvio/mejora/oportunidad)
  if (categoria && categoria !== 'todas') { params.push(categoria); conds.push(`f.finding_type = $${params.length}`); }
  if (usuario_email) { params.push(usuario_email); conds.push(`u.email ILIKE $${params.length}`); }
  if (query_texto)   { params.push(`%${query_texto}%`); conds.push(`(f.title ILIKE $${params.length} OR f.description ILIKE $${params.length})`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT f.code, f.title, f.finding_type, f.status, f.area, f.due_date, f.created_at,
            u.full_name AS assigned_to_name
       FROM findings f LEFT JOIN users u ON u.id = f.assigned_to
       ${where} ORDER BY f.created_at DESC LIMIT 15`,
    params
  );
  return { found: rows.length, findings: rows };
}

async function h_crear_hallazgo({ titulo, descripcion, categoria, severidad: _sev, norma: _norma, area }, ctx) {
  if (!ctx?.userId) return { error: 'Necesito el contexto del usuario para crear el hallazgo' };
  const { rows } = await pool.query(
    `INSERT INTO findings (title, description, finding_type, area, status, reported_by)
     VALUES ($1,$2,$3,$4,'abierta',$5) RETURNING code, id, title, finding_type, status`,
    [titulo, descripcion, categoria, area || null, ctx.userId]
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
  const conds = ['is_active = TRUE']; const params = [];
  if (dias_vencimiento) {
    conds.push(`expiration_date BETWEEN NOW() AND NOW() + INTERVAL '${parseInt(dias_vencimiento)} days'`);
  }
  if (jurisdiccion && jurisdiccion !== 'todas') {
    params.push(`%${jurisdiccion}%`);
    conds.push(`issuing_authority ILIKE $${params.length}`);
  }
  const where = 'WHERE ' + conds.join(' AND ');
  const { rows } = await pool.query(
    `SELECT code, title, issuing_authority, applicable_area, expiration_date, category
       FROM legal_requirements ${where} ORDER BY expiration_date ASC NULLS LAST LIMIT 15`, params
  );
  return { found: rows.length, requirements: rows };
}

async function h_consultar_incidentes({ severidad, ultimos_dias = 365 }) {
  const days = parseInt(ultimos_dias) || 365;
  const conds = [`date >= NOW() - INTERVAL '${days} days'`];
  const params = [];
  if (severidad && severidad !== 'todos') { params.push(severidad); conds.push(`severity = $${params.length}`); }
  const { rows } = await pool.query(
    `SELECT code, LEFT(description, 150) AS description, severity, status, date AS incident_date, area
       FROM incidents WHERE ${conds.join(' AND ')} ORDER BY date DESC LIMIT 15`, params
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
    pool.query(`SELECT COUNT(*) FILTER (WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS por_vencer FROM legal_requirements WHERE is_active = TRUE`),
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
  if (tipo && tipo !== 'todos') { params.push(tipo); conds.push(`doc_type = $${params.length}`); }
  if (norma && norma !== 'todas'){ params.push(norma); conds.push(`norma = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, title, doc_type, norma, version, status, updated_at FROM documents ${where} ORDER BY updated_at DESC LIMIT 10`, params
  );
  return { found: rows.length, documents: rows };
}



// ───────────────────────────────────────────────────────────────
// Handlers · Sistema de Revisiones Encadenadas
// ───────────────────────────────────────────────────────────────
async function h_consultar_estado_ciclo({ year }) {
  const { rows: cycle } = await pool.query(
    'SELECT id, year, name, status, opened_at FROM review_cycles WHERE year = $1', [year]
  );
  if (!cycle[0]) return { error: `Ciclo ${year} no encontrado` };
  const { rows: reviews } = await pool.query(`
    SELECT r.id, r.entity_type, r.status, r.scheduled_for::date AS scheduled_for,
           u_rev.full_name AS reviewer, u_val.full_name AS validator,
           rt.sort_order, review_is_blocked(r.id) AS is_blocked,
           rt.depends_on_entity_types AS deps
      FROM reviews r LEFT JOIN review_templates rt ON rt.entity_type = r.entity_type
      LEFT JOIN users u_rev ON u_rev.id = r.reviewer_id
      LEFT JOIN users u_val ON u_val.id = r.validator_id
     WHERE r.cycle_id = $1 ORDER BY rt.sort_order NULLS LAST
  `, [cycle[0].id]);
  return {
    cycle: cycle[0],
    total_revisiones: reviews.length,
    validadas: reviews.filter(r => r.status === 'validada').length,
    bloqueadas: reviews.filter(r => r.status === 'bloqueada').length,
    listas_para_iniciar: reviews.filter(r => r.status === 'programada' && !r.is_blocked).length,
    reviews,
  };
}

async function h_iniciar_revision({ review_id }, _ctx) {
  const { rows: check } = await pool.query('SELECT can_start, blockers FROM can_start_review($1)', [review_id]);
  if (!check[0].can_start) {
    return { error: 'Tiene dependencias sin validar', blockers: check[0].blockers };
  }
  const { rows } = await pool.query(`
    UPDATE reviews SET status='en_revision', started_at=NOW(), updated_at=NOW()
     WHERE id=$1 AND status IN ('programada','bloqueada') RETURNING entity_type, status
  `, [review_id]);
  if (!rows[0]) return { error: 'Review no encontrada o estado no permite iniciar' };
  return { ok: true, ...rows[0] };
}

async function h_validar_revision({ review_id, approve, notes }, ctx) {
  if (!ctx?.userId) return { error: 'Necesito userId' };
  const { rows: r } = await pool.query('SELECT validator_id, status, entity_type FROM reviews WHERE id=$1', [review_id]);
  if (!r[0]) return { error: 'Review no encontrada' };
  if (r[0].validator_id !== ctx.userId) return { error: 'Solo el validator asignado puede validar' };
  if (r[0].status !== 'en_revision') return { error: `Estado actual no permite validar: ${r[0].status}` };
  const status = approve ? 'validada' : 'rechazada';
  await pool.query(`
    UPDATE reviews SET status=$2, validated_at=NOW(), validated_by=$3,
                       notes = COALESCE(notes,'') || $4, updated_at=NOW()
     WHERE id=$1
  `, [review_id, status, ctx.userId, notes ? '\n[validate] ' + notes : '']);
  return { ok: true, status, entity_type: r[0].entity_type, message: approve ? 'Validada. Las child reviews bloqueadas se destrabarán automáticamente.' : 'Rechazada' };
}



async function h_consultar_objetivos({ year, status }) {
  const params = [];
  let conds = [];
  if (year) { params.push(year); conds.push(`year = $${params.length}`); }
  if (status && status !== 'todos') { params.push(status); conds.push(`status = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, name, area, target_value, status FROM objectives ${where} ORDER BY code LIMIT 30`, params
  );
  return { found: rows.length, objectives: rows };
}

async function h_consultar_cambios({ year, status }) {
  const params = [];
  let conds = [];
  if (year) { params.push(year); conds.push(`year = $${params.length}`); }
  if (status && status !== 'todos') { params.push(status); conds.push(`status = $${params.length}`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, title, status, plazo_target FROM change_requests ${where} ORDER BY code DESC LIMIT 30`, params
  );
  return { found: rows.length, changes: rows };
}

async function h_consultar_procedimientos({ module, query }) {
  const params = [];
  let conds = [];
  if (module) { params.push(module); conds.push(`module = $${params.length}`); }
  if (query) { params.push(`%${query}%`); conds.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT code, title, module, description, norma, status FROM procedures ${where} ORDER BY code LIMIT 20`, params
  );
  return { found: rows.length, procedures: rows };
}

async function h_consultar_organigrama() {
  const { rows: nodes } = await pool.query(`SELECT id, name, parent_id, type, level, area FROM org_chart_nodes WHERE is_active = TRUE ORDER BY level, sort_order`);
  const { rows: profiles } = await pool.query(`
    SELECT jp.role_label, jp.area,
           string_agg(e.full_name, ', ') AS empleados
    FROM job_profiles jp
    LEFT JOIN job_profile_employees jpe ON jpe.profile_id = jp.id AND jpe.until IS NULL
    LEFT JOIN employees e ON e.id = jpe.employee_id
    WHERE jp.is_active = TRUE
    GROUP BY jp.role_label, jp.area
    ORDER BY jp.area, jp.role_label`);
  return { nodes_count: nodes.length, puestos: profiles };
}


async function h_consultar_rondas({ familia, ultimos_dias = 7, template_code } = {}) {
  const days = Math.max(1, Math.min(parseInt(ultimos_dias) || 7, 90));
  const famFilter = familia && familia !== 'todas' ? `AND i.family=$2` : '';
  const tmplFilter = template_code ? `AND t.code=$${famFilter ? 3 : 2}` : '';
  const params = [days];
  if (famFilter) params.push(familia);
  if (template_code) params.push(template_code);

  const summary = (await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE i.scheduled_date >= CURRENT_DATE - $1::int)::int AS total,
        COUNT(*) FILTER (WHERE i.scheduled_date >= CURRENT_DATE - $1::int AND i.status='completada')::int AS completadas,
        COUNT(*) FILTER (WHERE i.scheduled_date >= CURRENT_DATE - $1::int AND i.status='pendiente')::int AS pendientes,
        COUNT(*) FILTER (WHERE i.scheduled_date >= CURRENT_DATE - $1::int AND i.status='en_cofirma')::int AS en_cofirma,
        COUNT(*) FILTER (WHERE (i.due_date < CURRENT_DATE AND i.status NOT IN ('completada','anulada'))
                          OR i.status='vencida')::int AS vencidas,
        COALESCE(SUM(i.findings_count) FILTER (WHERE i.scheduled_date >= CURRENT_DATE - $1::int), 0)::int AS hallazgos
       FROM insp_inspections i
       JOIN insp_templates t ON t.id=i.template_id
      WHERE i.deleted_at IS NULL ${famFilter} ${tmplFilter}`, params)).rows[0];

  const cumplimiento = summary.total
    ? Math.round((summary.completadas / summary.total) * 100)
    : null;

  const machinesAlert = (await pool.query(
    `SELECT m.code, m.name,
            MAX(i.scheduled_date) FILTER (WHERE i.status='completada')::text AS ultimo_checklist,
            BOOL_OR(i.findings_count > 0 AND i.scheduled_date >= CURRENT_DATE - $1::int) AS con_hallazgos
       FROM insp_machines m
       LEFT JOIN insp_inspections i ON i.machine_id=m.id AND i.deleted_at IS NULL
      WHERE m.active=true
      GROUP BY m.id, m.code, m.name
      HAVING BOOL_OR(i.findings_count > 0 AND i.scheduled_date >= CURRENT_DATE - $1::int)
          OR MAX(i.scheduled_date) FILTER (WHERE i.status='completada') < CURRENT_DATE - 1
          OR MAX(i.scheduled_date) FILTER (WHERE i.status='completada') IS NULL
      ORDER BY con_hallazgos DESC, m.code`, [days])).rows;

  const criticalFails = (await pool.query(
    `SELECT i.code AS inspeccion, t.code AS plantilla, m.code AS maquina,
            it.label AS item, r.observations, i.scheduled_date::text,
            r.finding_id IS NOT NULL AS tiene_nc
       FROM insp_responses r
       JOIN insp_template_items it ON it.id=r.item_id
       JOIN insp_inspections i ON i.id=r.inspection_id
       JOIN insp_templates t ON t.id=i.template_id
       LEFT JOIN insp_machines m ON m.id=i.machine_id
      WHERE r.answer IN ('no','no_cumple')
        AND it.is_critical=true
        AND i.scheduled_date >= CURRENT_DATE - $1::int
        AND i.deleted_at IS NULL
      ORDER BY i.scheduled_date DESC LIMIT 10`, [days])).rows;

  const upcomingOverdue = (await pool.query(
    `SELECT i.code, t.code AS plantilla, t.name AS plantilla_nombre,
            i.due_date::text, i.status, i.period_label
       FROM insp_inspections i
       JOIN insp_templates t ON t.id=i.template_id
      WHERE i.deleted_at IS NULL
        AND ((i.due_date < CURRENT_DATE AND i.status NOT IN ('completada','anulada'))
             OR i.status='vencida')
      ORDER BY i.due_date ASC LIMIT 10`)).rows;

  return {
    ventana_dias: days,
    resumen: { ...summary, cumplimiento_pct: cumplimiento },
    maquinas_con_alerta: machinesAlert,
    items_criticos_en_falla: criticalFails,
    rondines_vencidos: upcomingOverdue,
  };
}

async function h_consultar_empleado({ query }) {
  if (!query) return { error: 'Indicá nombre o email' };
  const pattern = `%${query}%`;
  const { rows } = await pool.query(`
    SELECT e.id, e.full_name, e.email, e.phone, e.whatsapp, e.address,
           e.cuil, e.birth_date, e.hire_date, e.contract_type, e.work_schedule,
           e.position, e.sector, e.is_active,
           sup.full_name AS supervisor_name, sup.email AS supervisor_email,
           sup.phone AS supervisor_phone,
           COALESCE((SELECT json_agg(json_build_object(
             'role_label', jp.role_label,
             'area', jp.area,
             'seniority', jp.seniority,
             'is_primary', jpe.is_primary,
             'since', jpe.since
           ) ORDER BY jpe.is_primary DESC)
             FROM job_profile_employees jpe
             JOIN job_profiles jp ON jp.id = jpe.profile_id
             WHERE jpe.employee_id = e.id AND jpe.until IS NULL AND jp.is_active = TRUE), '[]'::json) AS puestos,
           COALESCE((SELECT json_agg(json_build_object(
             'cert_name', cert_name,
             'issued_by', issued_by,
             'expiry_date', expiry_date,
             'status', status,
             'dias_para_vencer',
               CASE WHEN expiry_date IS NULL THEN NULL
                    ELSE (expiry_date - CURRENT_DATE)::int END
           ))
             FROM employee_certifications WHERE employee_id = e.id), '[]'::json) AS habilitaciones
      FROM employees e
      LEFT JOIN employees sup ON sup.id = e.supervisor_id
     WHERE e.full_name ILIKE $1 OR e.email ILIKE $1
     ORDER BY (e.is_active = false), e.full_name
     LIMIT 5`, [pattern]);
  return { found: rows.length, empleados: rows };
}

async function h_consultar_puesto({ query }) {
  if (!query) return { error: 'Indicá nombre del puesto o área' };
  const pattern = `%${query}%`;
  const { rows } = await pool.query(`
    SELECT jp.id, jp.role_label, jp.area, jp.seniority, jp.mission,
           jp.responsibilities, jp.key_results, jp.competencies, jp.training_required,
           n.name AS nodo_organigrama,
           COALESCE((SELECT json_agg(json_build_object(
             'full_name', e.full_name,
             'is_primary', jpe.is_primary,
             'phone', e.phone,
             'email', e.email,
             'since', jpe.since
           ) ORDER BY jpe.is_primary DESC)
             FROM job_profile_employees jpe
             JOIN employees e ON e.id = jpe.employee_id
             WHERE jpe.profile_id = jp.id AND jpe.until IS NULL AND e.is_active = TRUE), '[]'::json) AS empleados
      FROM job_profiles jp
      LEFT JOIN org_chart_nodes n ON n.id = jp.org_node_id
     WHERE jp.is_active = TRUE
       AND (jp.role_label ILIKE $1 OR jp.area ILIKE $1 OR jp.mission ILIKE $1)
     ORDER BY jp.role_label
     LIMIT 8`, [pattern]);
  return { found: rows.length, puestos: rows };
}

async function h_consultar_organigrama_detalle() {
  const nodes = (await pool.query(`
    SELECT n.id, n.name, n.parent_id, n.type, n.level, n.area, n.description, n.sort_order,
           (SELECT COUNT(*) FROM job_profiles WHERE org_node_id=n.id AND is_active=TRUE) AS puestos_count,
           (SELECT COUNT(DISTINCT jpe.employee_id)
              FROM job_profiles jp
              JOIN job_profile_employees jpe ON jpe.profile_id = jp.id
             WHERE jp.org_node_id = n.id AND jp.is_active = TRUE AND jpe.until IS NULL) AS empleados_count
      FROM org_chart_nodes n
     WHERE n.is_active = TRUE
     ORDER BY n.level, n.sort_order`)).rows;
  const summary = (await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM employees WHERE is_active) AS empleados_total,
      (SELECT COUNT(*) FROM job_profiles WHERE is_active) AS puestos_total,
      (SELECT COUNT(*) FROM external_contacts WHERE is_active) AS externos_total,
      (SELECT COUNT(*) FROM job_profiles WHERE is_active AND id NOT IN
         (SELECT profile_id FROM job_profile_employees WHERE until IS NULL)) AS puestos_vacantes
  `)).rows[0];
  return { nodos: nodes, resumen: summary };
}

async function h_buscar_contacto_externo({ query }) {
  if (!query) return { error: 'Indicá nombre, rol u organización' };
  const pattern = `%${query}%`;
  const { rows } = await pool.query(`
    SELECT ec.full_name, ec.role, ec.organization, ec.email, ec.phone, ec.whatsapp,
           ec.address, ec.notes,
           sup.full_name AS supervisor_dassa,
           n.name AS org_node_name
      FROM external_contacts ec
      LEFT JOIN employees sup ON sup.id = ec.supervisor_in_dassa_id
      LEFT JOIN org_chart_nodes n ON n.id = ec.org_node_id
     WHERE ec.is_active = TRUE
       AND (ec.full_name ILIKE $1 OR ec.role ILIKE $1 OR ec.organization ILIKE $1)
     ORDER BY ec.full_name LIMIT 5`, [pattern]);
  return { found: rows.length, externos: rows };
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
  consultar_estado_ciclo: h_consultar_estado_ciclo,
  iniciar_revision: h_iniciar_revision,
  validar_revision: h_validar_revision,
  consultar_objetivos: h_consultar_objetivos,
  consultar_cambios: h_consultar_cambios,
  consultar_procedimientos: h_consultar_procedimientos,
  consultar_organigrama: h_consultar_organigrama,
  consultar_rondas: h_consultar_rondas,
  consultar_empleado: h_consultar_empleado,
  consultar_puesto: h_consultar_puesto,
  consultar_organigrama_detalle: h_consultar_organigrama_detalle,
  buscar_contacto_externo: h_buscar_contacto_externo,
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
