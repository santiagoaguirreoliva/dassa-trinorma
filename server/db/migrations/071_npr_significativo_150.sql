-- 070: Auditoría interna 05/08/2026 — umbral de significancia NPR pasa de ≥16 a ≥150
-- npr_level es columna generada: hay que recrearla con el nuevo corte.

ALTER TABLE risks DROP COLUMN npr_level;

ALTER TABLE risks ADD COLUMN npr_level npr_significance GENERATED ALWAYS AS (
  CASE
    WHEN detection IS NULL THEN 'sin_evaluar'::npr_significance
    WHEN (severity * probability * detection) >= 150 THEN 'significativo'::npr_significance
    ELSE 'no_significativo'::npr_significance
  END
) STORED;
