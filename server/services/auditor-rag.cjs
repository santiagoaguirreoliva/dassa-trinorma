// =============================================================================
// DASSA SGI — Auditor IA — RAG (Retrieval-Augmented Generation)
// Búsqueda semántica simple en agent_knowledge usando TF-IDF / similitud de texto
// =============================================================================
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Búsqueda full-text en agent_knowledge usando PostgreSQL ts_vector.
 * No usa embeddings — más simple, suficiente para empezar.
 * Si después querés precisión semántica más alta, migramos a pgvector + embeddings.
 */
async function search(query, { limit = 5, category = null } = {}) {
  if (!query || !query.trim()) return [];

  // Limpiar query: quitar caracteres especiales para tsquery
  const cleanQuery = query
    .replace(/[^\wáéíóúñÁÉÍÓÚÑ\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w + ':*')
    .join(' & ');

  if (!cleanQuery) return [];

  const params = [cleanQuery, limit];
  let categoryClause = '';
  if (category) {
    params.push(category);
    categoryClause = `AND category = $${params.length}`;
  }

  try {
    const sql = `
      SELECT id, title, category, summary,
             SUBSTRING(content FROM 1 FOR 800) AS content_excerpt,
             ts_rank(to_tsvector('spanish', title || ' ' || COALESCE(summary, '') || ' ' || content), to_tsquery('spanish', $1)) AS rank
      FROM agent_knowledge
      WHERE is_active = TRUE
        AND to_tsvector('spanish', title || ' ' || COALESCE(summary, '') || ' ' || content) @@ to_tsquery('spanish', $1)
        ${categoryClause}
      ORDER BY rank DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  } catch (e) {
    console.error('[rag] search error:', e.message);
    return [];
  }
}

/**
 * Construye el contexto de RAG concatenando los chunks más relevantes.
 * Devuelve un string para meter en el system prompt del LLM.
 */
async function buildContext(query, { maxChunks = 5, maxChars = 4000 } = {}) {
  const chunks = await search(query, { limit: maxChunks });
  if (chunks.length === 0) return '';

  let context = '';
  let chars = 0;
  for (const c of chunks) {
    const chunk = `### ${c.title} (${c.category})\n${c.summary || c.content_excerpt}\n\n`;
    if (chars + chunk.length > maxChars) break;
    context += chunk;
    chars += chunk.length;
  }
  return context;
}

/**
 * Ingesta un documento al knowledge base.
 * Recibe título, categoría, contenido. Genera summary automático con primer párrafo.
 */
async function ingestDocument({ title, category = 'trinorma', content, summary, source_url, uploaded_by }) {
  if (!title || !content) throw new Error('title y content son obligatorios');

  // Auto-summary: primer párrafo o primeros 300 chars
  const autoSummary = summary || content.split(/\n\n/)[0].substring(0, 300);

  const { rows } = await pool.query(
    `INSERT INTO agent_knowledge (title, category, content, summary, source_url, uploaded_by, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, title`,
    [title, category, content, autoSummary, source_url || null, uploaded_by || null]
  );
  return rows[0];
}

/**
 * Lista todos los documentos del knowledge base (para admin).
 */
async function listDocuments({ category = null, limit = 100 } = {}) {
  const params = [limit];
  let where = 'WHERE is_active = TRUE';
  if (category) {
    where += ' AND category = $2';
    params.push(category);
  }
  const { rows } = await pool.query(
    `SELECT id, title, category, summary, source_url, created_at, updated_at,
            LENGTH(content) AS content_length
     FROM agent_knowledge ${where}
     ORDER BY created_at DESC
     LIMIT $1`,
    params
  );
  return rows;
}

/**
 * Eliminar un documento (soft delete: is_active = FALSE)
 */
async function softDeleteDocument(id) {
  await pool.query('UPDATE agent_knowledge SET is_active = FALSE WHERE id = $1', [id]);
}

module.exports = {
  search,
  buildContext,
  ingestDocument,
  listDocuments,
  softDeleteDocument,
};
