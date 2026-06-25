-- 053 · Vínculo estratégico del FODA
-- Cada ítem del FODA 2025-2026 se conecta con un objetivo 2026 / pilar de la
-- Visión 2030 / proyecto. Se guarda en columna propia (no en validation_note,
-- que es de NIXA al validar) y se muestra en la vista de FODA.

ALTER TABLE context_analysis ADD COLUMN IF NOT EXISTS vinculo text;
COMMENT ON COLUMN context_analysis.vinculo IS 'Vínculo del ítem FODA con objetivo 2026 / pilar de la Visión 2030 / proyecto';

-- Mover el vínculo cargado temporalmente en validation_note a su columna y limpiar la nota
UPDATE context_analysis
   SET vinculo = regexp_replace(validation_note, '^Vínculo:\s*', ''),
       validation_note = NULL
 WHERE is_active = TRUE AND validation_note LIKE 'Vínculo:%';
