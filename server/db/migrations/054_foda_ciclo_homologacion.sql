-- 054 · Ciclo y cierre homologado del FODA
-- El FODA se gestiona por ciclo (ej. 2025-2026). El ADMIN edita/agrega/elimina
-- ítems mientras el ciclo está en 'borrador'. Tras revisar y validar, se
-- HOMOLOGA el ciclo (fecha + responsable), que congela el FODA. Reabrible.

ALTER TABLE context_analysis ADD COLUMN IF NOT EXISTS ciclo text;
UPDATE context_analysis SET ciclo = '2025-2026' WHERE ciclo IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_context_analysis_ciclo ON context_analysis(ciclo);

CREATE TABLE IF NOT EXISTS foda_homologacion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo         text UNIQUE NOT NULL,
  estado        text NOT NULL DEFAULT 'borrador',   -- borrador | homologado
  homologado_at timestamptz,
  homologado_by uuid REFERENCES users(id),
  nota          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE foda_homologacion IS 'Estado y cierre homologado del FODA por ciclo (4.1 análisis de contexto)';

INSERT INTO foda_homologacion (ciclo, estado) VALUES ('2025-2026', 'borrador')
  ON CONFLICT (ciclo) DO NOTHING;
