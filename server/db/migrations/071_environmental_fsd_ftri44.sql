-- Migration 071: Aspectos Ambientales — 3ra variable + regla oficial F-TRI-44 Rev.01
-- Auditoría interna 2026-08: la matriz evaluaba con 2 variables (F×S); el modelo
-- F-TRI-44 usa F × G × P (IPR) con Significativo si IPR>32 ó G≥4 ó P≥4.
-- El form ya capturaba "detection" (=Pérdida de control [P]) pero la BD la descartaba.
BEGIN;

ALTER TABLE environmental_aspects ADD COLUMN IF NOT EXISTS detection        INTEGER NOT NULL DEFAULT 2 CHECK (detection BETWEEN 1 AND 5);
ALTER TABLE environmental_aspects ADD COLUMN IF NOT EXISTS effect           TEXT DEFAULT 'negativo';
ALTER TABLE environmental_aspects ADD COLUMN IF NOT EXISTS legal_desc       TEXT;
ALTER TABLE environmental_aspects ADD COLUMN IF NOT EXISTS responsible_text TEXT;

COMMENT ON COLUMN environmental_aspects.detection IS 'Pérdida de control [P] del F-TRI-44 (1-5)';
COMMENT ON COLUMN environmental_aspects.legal_desc IS 'Descripción del requisito legal asociado (F-TRI-44)';

ALTER TABLE environmental_aspects DROP COLUMN IF EXISTS is_significant;
ALTER TABLE environmental_aspects DROP COLUMN IF EXISTS significance;
ALTER TABLE environmental_aspects ADD COLUMN significance INTEGER
  GENERATED ALWAYS AS (frequency * severity * detection) STORED;
ALTER TABLE environmental_aspects ADD COLUMN is_significant BOOLEAN
  GENERATED ALWAYS AS (frequency * severity * detection > 32 OR severity >= 4 OR detection >= 4) STORED;

COMMIT;
