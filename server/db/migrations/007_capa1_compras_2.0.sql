-- =============================================================================
-- CAPA 1 · Compras 2.0 · Detalle visible
-- Migration idempotente (safe to re-run)
-- =============================================================================

-- 1. Columnas nuevas en purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS source_url       TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS item_specs       JSONB;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS photo_urls       TEXT[];

-- 2. Comentario para documentar
COMMENT ON COLUMN purchases.source_url       IS 'Link de origen (Mercado Libre, sitio del proveedor). Se lee 1 vez al crear, no hay seguimiento.';
COMMENT ON COLUMN purchases.long_description IS 'Descripción larga, especificaciones técnicas, justificación detallada.';
COMMENT ON COLUMN purchases.item_specs       IS 'Datos parseados del link de origen: {titulo_origen, precio_origen, vendedor, garantia, envio, categoria_origen, condicion}.';
COMMENT ON COLUMN purchases.photo_urls       IS 'Array de URLs de fotos del item (de ML o subidas).';

-- 3. Verificación
SELECT 'Columnas nuevas:' AS check_,
       string_agg(column_name, ', ') AS columns
FROM information_schema.columns
WHERE table_name = 'purchases'
  AND column_name IN ('source_url', 'long_description', 'item_specs', 'photo_urls');
