-- 030 — Findings · marcas de recordatorio de verificación de eficacia
-- Evitan que el cron diario repita el mismo recordatorio V30 / V60.

ALTER TABLE findings ADD COLUMN IF NOT EXISTS v30_reminded_at TIMESTAMPTZ;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS v60_reminded_at TIMESTAMPTZ;
