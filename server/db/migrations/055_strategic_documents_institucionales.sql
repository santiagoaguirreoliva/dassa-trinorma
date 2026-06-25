-- 055 · Amplía doc_type de strategic_documents para los documentos institucionales de marca
-- Suma 'mision', 'valores' y 'politica_integrada' a los tipos permitidos, para exponer
-- Misión / Visión / Valores / Política de Gestión Integrada (PDF oficial DASSA) en Mi Perfil.
-- Cubre ISO 5.2 (política de gestión) y 7.3 (toma de conciencia del personal).

-- Reproducibilidad: la tabla existe en producción desde una migración previa que no
-- quedó versionada. Se reasegura su creación (idempotente) para que `db:migrate` desde
-- cero no falle en el ALTER de abajo.
CREATE TABLE IF NOT EXISTS strategic_documents (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           text UNIQUE,
  doc_type       text NOT NULL,
  title          text NOT NULL,
  body_md        text,
  version        text,
  effective_from date,
  approved_by    uuid REFERENCES users(id),
  is_active      boolean NOT NULL DEFAULT true,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE strategic_documents DROP CONSTRAINT IF EXISTS strategic_documents_doc_type_check;
ALTER TABLE strategic_documents ADD CONSTRAINT strategic_documents_doc_type_check
  CHECK (doc_type = ANY (ARRAY[
    'manifiesto', 'vision', 'politica', 'principios', 'cultural',
    'mision', 'valores', 'politica_integrada'
  ]));
