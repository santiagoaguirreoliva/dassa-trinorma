-- 066 · Evaluación anual de proveedores (F-TRI-17) + proveedores críticos
-- Digitaliza la planilla F-TRI-17 (P-TRI-11): 4 criterios con escala
-- N/A 0 · Muy malo 1 · Malo 2 · Regular 3 · Bueno 4 · Muy bueno 5.
-- Resultado por puntaje total: APTO PARA COMPRA > 12 · SUSPENDIDO 10-12 · NO APTO < 10.
-- La condición APTO dura 1 año (se refleja en suppliers.is_homologated/homologation_expiry).
-- total y result son columnas generadas (PG >= 12): una fila nunca puede quedar inconsistente.

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id            uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  year                   integer NOT NULL,
  quality_score          integer NOT NULL CHECK (quality_score          BETWEEN 0 AND 5),
  payment_terms_score    integer NOT NULL CHECK (payment_terms_score    BETWEEN 0 AND 5),
  price_quality_score    integer NOT NULL CHECK (price_quality_score    BETWEEN 0 AND 5),
  legal_compliance_score integer NOT NULL CHECK (legal_compliance_score BETWEEN 0 AND 5),
  total integer GENERATED ALWAYS AS
    (quality_score + payment_terms_score + price_quality_score + legal_compliance_score) STORED,
  -- una columna generada no puede referenciar otra generada → se repite la suma
  result text GENERATED ALWAYS AS (
    CASE
      WHEN (quality_score + payment_terms_score + price_quality_score + legal_compliance_score) > 12 THEN 'apto'
      WHEN (quality_score + payment_terms_score + price_quality_score + legal_compliance_score) >= 10 THEN 'suspendido'
      ELSE 'no_apto'
    END) STORED,
  observations text,
  evaluated_by uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, year)
);

CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier
  ON supplier_evaluations (supplier_id, year DESC);
