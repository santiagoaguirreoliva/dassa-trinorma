-- 041_ronda_inspecciones_recurrencia.sql
-- Soporte del motor de recurrencia (F2): idempotencia de la generación
-- automática de instancias y ajuste del vencimiento del checklist diario.

BEGIN;

-- Una sola instancia viva por (plantilla, período, máquina).
-- machine_id NULL en rondines → se normaliza con COALESCE para que el
-- índice también los deduplique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_insp_periodo
  ON insp_inspections (
    template_id,
    period_label,
    COALESCE(machine_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE deleted_at IS NULL;

-- El checklist diario de maquinaria vence el mismo día (sin gracia).
UPDATE insp_templates SET due_offset_days = 0 WHERE code = 'F-TRI-19';

COMMIT;
