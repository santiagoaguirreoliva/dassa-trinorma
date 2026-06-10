-- 048 · Comité Mixto · "Acta viva" por puntos discretos
-- Cada punto tratado en la reunión es un ítem que se guarda solo (no perder progreso).
-- Tipos: pendiente (de comité anterior), nuevo, nc (no conformidad/desvío),
--        capacitacion, medicion (objetivos/indicadores), auditoria, otro.

CREATE TABLE IF NOT EXISTS committee_agenda_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES committee_meetings(id) ON DELETE CASCADE,
  orden       integer NOT NULL DEFAULT 0,
  tipo        text NOT NULL DEFAULT 'nuevo'
              CHECK (tipo IN ('pendiente','nuevo','nc','capacitacion','medicion','auditoria','otro')),
  texto       text NOT NULL DEFAULT '',
  resuelto    boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  tenant_id   uuid
);

CREATE INDEX IF NOT EXISTS idx_committee_agenda_meeting
  ON committee_agenda_items (meeting_id, orden);

-- updated_at automático (si existe la función set_updated_at del schema; si no, no rompe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_committee_agenda_updated ON committee_agenda_items;
    CREATE TRIGGER trg_committee_agenda_updated
      BEFORE UPDATE ON committee_agenda_items
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
