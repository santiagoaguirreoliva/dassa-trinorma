-- 037 — Capacitaciones · marca de recordatorio enviado
-- Evita que el cron diario repita el aviso de una misma capacitación.

ALTER TABLE trainings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
