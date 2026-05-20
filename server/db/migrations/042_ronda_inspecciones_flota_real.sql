-- 042 — Ronda de Inspecciones · flota real DASSA
-- Agrega flag `daily_checklist` (false = on-demand, no entra al cron diario).
-- Reemplaza los 3 placeholders AE-01/02/03 por las 11 máquinas operativas.

BEGIN;

-- ─── Flag de checklist diario por máquina ────────────────────────────
ALTER TABLE insp_machines
  ADD COLUMN IF NOT EXISTS daily_checklist BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN insp_machines.daily_checklist IS
  'Si true, el cron diario genera un checklist F-TRI-19 para la máquina. false = on-demand (ej. Mitsubishi 7TN: solo cuando se la usa).';

-- ─── Desactivar placeholders viejos ──────────────────────────────────
-- Mantenemos los registros para no romper FKs si alguien hizo pruebas,
-- pero los sacamos del scope del cron diario y de la flota visible.
UPDATE insp_machines
   SET active = false, daily_checklist = false
 WHERE code IN ('AE-01', 'AE-02', 'AE-03');

-- ─── Alta de la flota real operativa (2026-05-20) ────────────────────
-- Autoelevadores TCM y TEU (8) — nafta/gas — diarios
-- Kalmars (2) — EuroDiesel — diarios
-- Mitsubishi 7 TN Diesel — on-demand (sin daily_checklist)
INSERT INTO insp_machines (code, name, type, daily_checklist) VALUES
  ('AE-07',  'TCM 2.5 TN #07 — Nafta/Gas',         'autoelevador', true),
  ('AE-08',  'TEU 3.0 TN #08 — Nafta/Gas',         'autoelevador', true),
  ('AE-09',  'TEU 3.0 TN #09 — Nafta/Gas',         'autoelevador', true),
  ('AE-10',  'TEU 3.0 TN #10 — Nafta/Gas',         'autoelevador', true),
  ('AE-11',  'TEU 3.0 TN #11 — Nafta/Gas',         'autoelevador', true),
  ('AE-12',  'TEU 3.0 TN #12 — Nafta/Gas',         'autoelevador', true),
  ('AE-13',  'TEU 3.0 TN #13 — Nafta/Gas',         'autoelevador', true),
  ('AE-14',  'TEU 3.0 TN #14 — Nafta/Gas',         'autoelevador', true),
  ('KAL-01', 'Kalmar DASSA #01 — EuroDiesel',      'kalmar',       true),
  ('KAL-02', 'Kalmar ANTOG #02 — EuroDiesel',      'kalmar',       true),
  ('MIT-01', 'Mitsubishi 7 TN — Diesel (on-demand)', 'mitsubishi', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  daily_checklist = EXCLUDED.daily_checklist,
  active = true;

-- ─── Borrar instancias de hoy creadas para los placeholders ─────────
-- (RON-2026-001..003 son rondines y se mantienen, MAQ-2026-00001..00003
--  eran de las máquinas viejas — las sacamos para que el próximo cron
--  genere las correctas para la flota real)
DELETE FROM insp_responses
 WHERE inspection_id IN (
   SELECT id FROM insp_inspections
    WHERE family = 'maquinaria'
      AND machine_id IN (SELECT id FROM insp_machines WHERE code IN ('AE-01','AE-02','AE-03'))
      AND status = 'pendiente'
 );

DELETE FROM insp_inspections
 WHERE family = 'maquinaria'
   AND machine_id IN (SELECT id FROM insp_machines WHERE code IN ('AE-01','AE-02','AE-03'))
   AND status = 'pendiente';

COMMIT;
