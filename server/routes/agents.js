// server/routes/agents.js · RR.AI · F4
//
// Proxy de la nómina de agentes IA. La fuente de verdad es la app Madre
// (smart-dassa-apps · tabla rrai_agente); el SGI la consume server-to-server
// y la muestra junto a la dotación humana en la página de Empleados.
//
// Robustez: cachea la última respuesta buena y, si la Madre no responde,
// devuelve la copia cacheada (stale) en vez de fallar. El frontend además
// tiene su propia lista de respaldo.
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const MADRE_URL = process.env.DASSA_APPS_SSO_URL || 'http://127.0.0.1:3040';
const TTL_MS = 120_000;
let cache = { at: 0, agentes: null };

// GET /api/agents — nómina RR.AI (directores)
router.get('/', async (req, res) => {
  if (cache.agentes && Date.now() - cache.at < TTL_MS) {
    return res.json({ agentes: cache.agentes, cached: true });
  }
  try {
    const r = await fetch(`${MADRE_URL}/api/rrai/nomina-publica`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    cache = { at: Date.now(), agentes: Array.isArray(data.agentes) ? data.agentes : [] };
    return res.json({ agentes: cache.agentes });
  } catch (err) {
    console.error('agents proxy error:', err.message);
    if (cache.agentes) return res.json({ agentes: cache.agentes, stale: true });
    return res.status(502).json({ error: 'No se pudo obtener la nómina de agentes' });
  }
});

export default router;
