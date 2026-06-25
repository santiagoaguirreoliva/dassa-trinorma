-- 052 · Procedimientos nativos en la app + jerarquía de circuitos operativos
-- Soporta: (1) árbol padre→hijo (los 4 circuitos cuelgan de P-TRI-13/14),
-- (2) búsqueda por palabras clave, (3) normalización de los 6 procedimientos
-- legacy que tenían proceso=NULL para que entren en el árbol por sección.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS keywords text[];

COMMENT ON COLUMN documents.parent_document_id IS 'Procedimiento padre (ej. los 4 circuitos operativos cuelgan de P-TRI-13 Exportación / P-TRI-14 Importación)';
COMMENT ON COLUMN documents.keywords IS 'Palabras clave para el buscador del árbol de procedimientos';

CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_document_id);

-- Normalizar los 6 procedimientos legacy (proceso=NULL) a su sección del mapa
UPDATE documents SET proceso='OPERACIÓN'                          WHERE code='P-OP-001'  AND proceso IS NULL;
UPDATE documents SET proceso='OPERACIÓN'                          WHERE code='P-OP-002'  AND proceso IS NULL;
UPDATE documents SET proceso='ANÁLISIS Y EVALUACIÓN DE LA GESTIÓN' WHERE code='P-CAL-003' AND proceso IS NULL;
UPDATE documents SET proceso='GESTIÓN AMBIENTAL'                  WHERE code='P-AMB-003' AND proceso IS NULL;
UPDATE documents SET proceso='EVALUACIÓN RIESGOS Y PELIGROS'      WHERE code='P-SST-003' AND proceso IS NULL;
UPDATE documents SET proceso='EMERGENCIAS'                        WHERE code='P-SST-004' AND proceso IS NULL;
