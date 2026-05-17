-- 034 — Capacitaciones · regularización del schema (cierra el drift)
-- Estas columnas/tablas ya existen en producción (fueron alteradas a mano
-- fuera de las migraciones). Esta migración las versiona para que la base
-- sea reproducible desde cero. Es idempotente.

ALTER TABLE trainings
  ADD COLUMN IF NOT EXISTS reminder_days   INT,
  ADD COLUMN IF NOT EXISTS recurrence_days INT,
  ADD COLUMN IF NOT EXISTS audience        TEXT,
  ADD COLUMN IF NOT EXISTS date_confirmed  BOOLEAN DEFAULT false;

ALTER TABLE training_participants
  ADD COLUMN IF NOT EXISTS external_name     TEXT,
  ADD COLUMN IF NOT EXISTS external_position TEXT,
  ADD COLUMN IF NOT EXISTS external_sector   TEXT;

-- Participante externo: no tiene user_id
ALTER TABLE training_participants ALTER COLUMN user_id DROP NOT NULL;

-- Tabla de emails de notificación (antes se creaba en runtime vía IIFE)
CREATE TABLE IF NOT EXISTS training_notification_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255),
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice faltante: el detalle filtra participantes por training_id
CREATE INDEX IF NOT EXISTS idx_training_participants_training
  ON training_participants(training_id);

-- idx_trainings_date duplica idx_trainings_status_date
DROP INDEX IF EXISTS idx_trainings_date;
