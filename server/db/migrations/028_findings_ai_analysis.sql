-- 028 — Findings · análisis asistido por IA (Triny / Nixa)
-- Guarda la sugerencia de causa raíz y acciones correctivas generada por el
-- agente IA. Es una SUGERENCIA: el responsable de calidad la revisa y decide
-- aplicarla — no reemplaza el análisis humano que exige ISO 10.2.

ALTER TABLE findings ADD COLUMN IF NOT EXISTS ai_analysis    JSONB;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
