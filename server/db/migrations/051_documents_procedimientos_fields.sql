-- 051 · Campos para procedimientos reales importados desde el Drive de Trinorma
-- Permite guardar el texto completo del procedimiento (legible in-app), el
-- "proceso responsable" del registro maestro, la procedencia (Drive) y un
-- flag para los procedimientos que aún no tienen documento fuente cargado.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_md    text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS proceso       text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_file_id text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS needs_source  boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN documents.content_md    IS 'Texto completo del procedimiento (extraído del .docx del Drive)';
COMMENT ON COLUMN documents.proceso       IS 'Proceso responsable según el Listado Maestro F-TRI-09';
COMMENT ON COLUMN documents.drive_file_id IS 'ID del archivo fuente en Google Drive (Trinorma)';
COMMENT ON COLUMN documents.needs_source  IS 'true = procedimiento sin documento fuente en el Drive (pendiente de formalizar)';
