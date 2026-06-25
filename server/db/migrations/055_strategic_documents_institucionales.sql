-- 055 · Amplía doc_type de strategic_documents para los documentos institucionales de marca
-- Suma 'mision', 'valores' y 'politica_integrada' a los tipos permitidos, para exponer
-- Misión / Visión / Valores / Política de Gestión Integrada (PDF oficial DASSA) en Mi Perfil.
-- Cubre ISO 5.2 (política de gestión) y 7.3 (toma de conciencia del personal).

ALTER TABLE strategic_documents DROP CONSTRAINT IF EXISTS strategic_documents_doc_type_check;
ALTER TABLE strategic_documents ADD CONSTRAINT strategic_documents_doc_type_check
  CHECK (doc_type = ANY (ARRAY[
    'manifiesto', 'vision', 'politica', 'principios', 'cultural',
    'mision', 'valores', 'politica_integrada'
  ]));
