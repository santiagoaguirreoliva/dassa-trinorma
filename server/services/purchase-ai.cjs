// =============================================================================
// DASSA SGI · Compras 2.0 · CAPA 3 · Asistente IA con tool-calling
// Chat conversacional sobre el módulo de compras. Usa Anthropic SDK con
// tool_use nativo. Tools: buscar_proveedor, historial_compras, parsear_link.
// =============================================================================

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const { parseProductInfo } = require('./url-importer.cjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada');
  _client = require('./llm-meter.cjs').meterClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), require('path').basename(__filename, '.cjs'));
  return _client;
}

// ───────────────────────────────────────────────────────────────
// System prompt
// ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Sos el "Asistente de Compras" del SGI TRINORMA de DASSA — depósito fiscal en Buenos Aires, Argentina.

Tu rol: ayudar a la persona que está cargando una solicitud de compra. Sos práctico, breve, y conocés:
- El módulo de Compras tiene workflow: borrador → autorizada → en_ejecucion → completada
- Las categorías internas son: servicios, materiales, equipamiento, general, otros
- Los proveedores homologados están en la base — podés buscarlos con tu tool
- Las compras anteriores podés consultarlas para ver historial de precios y proveedores habituales

Estilo:
- Respondé en español argentino, tuteo, profesional pero cálido.
- Sé conciso: 2-4 oraciones máximo por respuesta salvo que pidan detalle.
- Usá las tools cuando el usuario pregunta por proveedores, historial, o pega un link/info de un producto.
- NUNCA inventes datos de proveedores o precios — siempre buscalos con la tool.
- Si el usuario pega un link de producto, usá la tool parsear_producto y devolvele los datos clave.
- Si recomendás un proveedor, decí por qué (¿está homologado? ¿usó alguien de DASSA antes?).

NO podés crear o aprobar compras directamente. Tu rol es asistir; la carga final la hace el usuario en el formulario.`;

// ───────────────────────────────────────────────────────────────
// Tools (esquema Anthropic)
// ───────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'buscar_proveedor',
    description: 'Busca proveedores en la base de datos del SGI. Filtra por nombre, categoría, o si está homologado. Devuelve hasta 10 resultados con nombre, CUIT, categoría, estado de homologación, contacto, y score.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Texto a buscar (nombre, categoría, o palabra clave)' },
        solo_homologados: { type: 'boolean', description: 'Si true, devuelve solo proveedores homologados' },
      },
      required: ['query'],
    },
  },
  {
    name: 'historial_compras',
    description: 'Busca compras anteriores que matchean una descripción o categoría. Útil para saber a quién se le compró algo similar antes y a qué precio. Devuelve hasta 10 compras con descripción, monto, proveedor, fecha y estado.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Texto a buscar en descripción o categoría' },
        solo_completadas: { type: 'boolean', description: 'Si true, solo compras ya recibidas (no borradores ni canceladas)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'parsear_producto',
    description: 'Recibe un link de un producto (Mercado Libre u otro) y/o texto pegado, y devuelve los datos estructurados: título, precio, descripción, vendedor, fotos, categoría sugerida. Si el sitio bloquea el scraping, sugerí al usuario que pegue el texto en vez del link.',
    input_schema: {
      type: 'object',
      properties: {
        url:  { type: 'string', description: 'URL del producto (opcional)' },
        text: { type: 'string', description: 'Texto pegado con info del producto (opcional)' },
      },
    },
  },
];

// ───────────────────────────────────────────────────────────────
// Implementación de las tools
// ───────────────────────────────────────────────────────────────

async function tool_buscar_proveedor({ query, solo_homologados = false }) {
  const q = `%${query}%`;
  const where = solo_homologados
    ? `WHERE is_active = TRUE AND is_homologated = TRUE AND (name ILIKE $1 OR category ILIKE $1 OR cuit ILIKE $1)`
    : `WHERE is_active = TRUE AND (name ILIKE $1 OR category ILIKE $1 OR cuit ILIKE $1)`;
  const { rows } = await pool.query(
    `SELECT id, name, cuit, category, is_homologated, contact_name, contact_email, score
       FROM suppliers ${where}
       ORDER BY is_homologated DESC, score DESC NULLS LAST, name
       LIMIT 10`,
    [q]
  );
  return { found: rows.length, suppliers: rows };
}

async function tool_historial_compras({ query, solo_completadas = false }) {
  const q = `%${query}%`;
  const where = solo_completadas
    ? `WHERE status = 'completada' AND (description ILIKE $1 OR category ILIKE $1 OR purpose ILIKE $1)`
    : `WHERE status NOT IN ('cancelada','rechazada') AND (description ILIKE $1 OR category ILIKE $1 OR purpose ILIKE $1)`;
  const { rows } = await pool.query(
    `SELECT p.code, p.description, p.category, p.amount, p.estimated_budget,
            p.supplier_name, p.status, p.purchase_date, p.created_at
       FROM purchases p ${where}
       ORDER BY p.created_at DESC
       LIMIT 10`,
    [q]
  );
  return { found: rows.length, purchases: rows };
}

async function tool_parsear_producto({ url, text }) {
  try {
    const data = await parseProductInfo({ url, text });
    // Devolver versión compacta (sin _meta interno gigante)
    return {
      titulo: data.titulo,
      descripcion: data.descripcion,
      precio: data.precio,
      moneda: data.moneda,
      vendedor: data.vendedor,
      fotos: (data.fotos || []).slice(0, 3),
      categoria_sgi: data.categoria_sgi,
      condicion: data.condicion,
      garantia: data.garantia,
      strategy: data._meta?.strategy,
    };
  } catch (e) {
    return { error: e.message };
  }
}

const TOOL_HANDLERS = {
  buscar_proveedor: tool_buscar_proveedor,
  historial_compras: tool_historial_compras,
  parsear_producto: tool_parsear_producto,
};

// ───────────────────────────────────────────────────────────────
// Función principal: chat con tool-calling
// ───────────────────────────────────────────────────────────────

async function chatWithTools({ messages, userContext = {} }) {
  const client = getClient();
  const model = 'claude-haiku-4-5-20251001';

  let contextNote = '';
  if (userContext.full_name) {
    contextNote = `\n\n# CONTEXTO DEL USUARIO ACTUAL\nNombre: ${userContext.full_name}\nRol: ${userContext.role || 'usuario'}\nÁrea: ${userContext.department || 'N/A'}`;
  }

  // Loop hasta que Claude termine (max 5 iteraciones por seguridad)
  let conv = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const toolsExecuted = [];
  let lastResponse = null;
  let totalUsage = { input_tokens: 0, output_tokens: 0 };

  for (let iter = 0; iter < 5; iter++) {
    const resp = await client.messages.create({
      model,
      max_tokens: 1500,
      system: SYSTEM_PROMPT + contextNote,
      tools: TOOLS,
      messages: conv,
    });
    totalUsage.input_tokens += resp.usage.input_tokens;
    totalUsage.output_tokens += resp.usage.output_tokens;
    lastResponse = resp;

    if (resp.stop_reason === 'end_turn' || resp.stop_reason === 'max_tokens') {
      break;
    }

    if (resp.stop_reason === 'tool_use') {
      // Agregar el assistant message con tool_use
      conv.push({ role: 'assistant', content: resp.content });

      // Ejecutar cada tool y agregar tool_result
      const toolResults = [];
      for (const block of resp.content) {
        if (block.type === 'tool_use') {
          const handler = TOOL_HANDLERS[block.name];
          let result;
          try {
            result = handler ? await handler(block.input) : { error: `tool ${block.name} no implementada` };
          } catch (e) {
            result = { error: e.message };
          }
          toolsExecuted.push({ name: block.name, input: block.input, result });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      conv.push({ role: 'user', content: toolResults });
    } else {
      // Stop reason desconocido, salimos
      break;
    }
  }

  // Extraer texto final de la última respuesta
  const finalText = (lastResponse.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  return {
    content: finalText || '(respuesta vacía)',
    tools_used: toolsExecuted,
    usage: totalUsage,
    model: lastResponse.model,
  };
}

module.exports = { chatWithTools };
