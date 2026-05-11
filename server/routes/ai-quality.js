// /api/ai-validate · auto-validador antes de guardar
import express from 'express';
import { createRequire } from 'module';
import { authenticate } from '../middleware/auth.js';
const require = createRequire(import.meta.url);
const aiQuality = require('../services/ai-quality.cjs');

const router = express.Router();
router.use(authenticate);

router.post('/validate', async (req, res) => {
  const { entity_type, data } = req.body || {};
  if (!entity_type || !data) return res.status(400).json({ error: 'entity_type y data requeridos' });
  try {
    const result = await aiQuality.validateInput({
      entity_type, data,
      userContext: { full_name: req.user.full_name, role: req.user.role }
    });
    res.json({ ok: true, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/wake-up', async (req, res) => {
  try {
    const stats = await aiQuality.generateWakeUpAlerts();
    res.json({ ok: true, ...stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
