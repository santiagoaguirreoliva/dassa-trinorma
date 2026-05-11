// =============================================================================
// DASSA SGI · Middleware tenant · Fase 7B
// Inyecta req.tenant_id desde el JWT del user logueado
// Para activar multi-tenant: incluir este middleware DESPUÉS de authenticate
// =============================================================================
import { query } from '../db/db.js';

export async function injectTenant(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth requerida' });
  try {
    const { rows } = await query('SELECT tenant_id FROM users WHERE id = $1', [req.user.id]);
    req.tenant_id = rows[0]?.tenant_id || '00000000-0000-0000-0000-000000000001'; // DASSA default
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// Helper para agregar condición tenant a queries
export function tenantCondition(req, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return { sql: `${prefix}tenant_id = $TENANT_PLACEHOLDER`, value: req.tenant_id };
}
