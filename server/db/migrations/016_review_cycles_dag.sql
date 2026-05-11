-- =============================================================================
-- DASSA SGI · Migration 016 · Sistema de Revisiones Encadenadas (DAG)
-- 3 tablas nuevas + ALTER reviews + función is_blocked
-- =============================================================================

BEGIN;

-- ───────────────────────────────────────────────────────────────────
-- 1. review_cycles · ciclos anuales (2026, 2027, ...)
-- ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_cycle_status') THEN
    CREATE TYPE review_cycle_status AS ENUM ('borrador','en_progreso','cerrado','archivado');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS review_cycles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year        INTEGER NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  status      review_cycle_status NOT NULL DEFAULT 'borrador',
  opened_at   TIMESTAMPTZ,
  closed_at   TIMESTAMPTZ,
  opened_by   UUID REFERENCES users(id),
  closed_by   UUID REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_cycles_year   ON review_cycles(year);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);

-- ───────────────────────────────────────────────────────────────────
-- 2. review_dependencies · DAG entre reviews del mismo ciclo
-- ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dependency_type') THEN
    CREATE TYPE dependency_type AS ENUM ('blocking','soft');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS review_dependencies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  child_review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  dep_type          dependency_type NOT NULL DEFAULT 'blocking',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_review_id <> child_review_id),
  UNIQUE (parent_review_id, child_review_id)
);
CREATE INDEX IF NOT EXISTS idx_revdeps_parent ON review_dependencies(parent_review_id);
CREATE INDEX IF NOT EXISTS idx_revdeps_child  ON review_dependencies(child_review_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. review_templates · patrón maestro de DAG (para generar nuevos ciclos)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_templates (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type              TEXT NOT NULL,
  depends_on_entity_types  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_reviewer_role    TEXT,
  default_validator_role   TEXT,
  description              TEXT,
  sort_order               INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type)
);

-- Seed del template DAG según diseño con Santi:
INSERT INTO review_templates (entity_type, depends_on_entity_types, default_reviewer_role, default_validator_role, description, sort_order)
VALUES
  ('foda',               ARRAY[]::TEXT[],                                                  'master_admin',     'auditor_externo', 'FODA · root del ciclo · sin dependencias',                                  1),
  ('job_profiles',       ARRAY['foda'],                                                   'rrhh',             'auditor_externo', 'Fichas de Puesto · depende de FODA',                                        2),
  ('procedures',         ARRAY['job_profiles'],                                           'sgi_leader',       'auditor_externo', 'Procedimientos · depende de Fichas',                                        3),
  ('risks',              ARRAY['foda','job_profiles','procedures'],                       'sgi_leader',       'auditor_externo', 'AMFE Riesgos · depende de FODA + Fichas + Procedimientos',                  4),
  ('legal_requirements', ARRAY[]::TEXT[],                                                  'sgi_leader',       'auditor_externo', 'Requisitos legales · semestral · sin deps de ciclo',                        5),
  ('environmental_aspects', ARRAY['risks'],                                                'seguridad_higiene','auditor_externo', 'Aspectos ambientales · depende de la matriz de Riesgos',                   6),
  ('objectives',         ARRAY['risks'],                                                  'master_admin',     'auditor_externo', 'Objetivos · apuntan a riesgos significativos',                              7),
  ('change_requests',    ARRAY['objectives'],                                             'sgi_leader',       'auditor_externo', 'Gestión de Cambios · plan para cumplir objetivos',                          8),
  ('audit_internal',     ARRAY['risks','procedures','job_profiles'],                       'sgi_leader',       'auditor_externo', 'Auditoría interna · audita lo ya validado',                                 9),
  ('management_review',  ARRAY['foda','job_profiles','procedures','risks','objectives','change_requests','audit_internal'], 'master_admin', 'auditor_externo', 'Revisión por la Dirección · cierre del ciclo · depende de todo lo anterior', 10)
ON CONFLICT (entity_type) DO UPDATE SET
  depends_on_entity_types = EXCLUDED.depends_on_entity_types,
  default_reviewer_role = EXCLUDED.default_reviewer_role,
  default_validator_role = EXCLUDED.default_validator_role,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ───────────────────────────────────────────────────────────────────
-- 4. ALTER reviews · agregar cycle_id + columna virtual is_blocked
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES review_cycles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_cycle ON reviews(cycle_id);

-- Ampliar enum review_status para 'bloqueada'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bloqueada' AND enumtypid = 'review_status'::regtype) THEN
    ALTER TYPE review_status ADD VALUE 'bloqueada';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 5. FUNCIONES helper · can_start_review · is_blocked
-- ───────────────────────────────────────────────────────────────────

-- ¿Esta review está bloqueada por alguna parent NO validada?
CREATE OR REPLACE FUNCTION review_is_blocked(p_review_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending INT;
BEGIN
  SELECT COUNT(*) INTO v_pending
  FROM review_dependencies rd
  JOIN reviews r ON r.id = rd.parent_review_id
  WHERE rd.child_review_id = p_review_id
    AND rd.dep_type = 'blocking'
    AND r.status <> 'validada';
  RETURN v_pending > 0;
END $$ LANGUAGE plpgsql;

-- ¿Puede iniciarse esta review?
CREATE OR REPLACE FUNCTION can_start_review(p_review_id UUID)
RETURNS TABLE(can_start BOOLEAN, blockers JSONB) AS $$
DECLARE
  v_blockers JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'parent_id', r.id,
    'parent_entity_type', r.entity_type,
    'parent_status', r.status
  )), '[]'::jsonb) INTO v_blockers
  FROM review_dependencies rd
  JOIN reviews r ON r.id = rd.parent_review_id
  WHERE rd.child_review_id = p_review_id
    AND rd.dep_type = 'blocking'
    AND r.status <> 'validada';

  RETURN QUERY SELECT (jsonb_array_length(v_blockers) = 0), v_blockers;
END $$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────
-- 6. TRIGGER · cuando se valida una review, recalcular status de las child
--    + crear notificaciones a los reviewers destrabados
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_propagate_review_validation()
RETURNS TRIGGER AS $$
DECLARE
  v_child RECORD;
BEGIN
  IF NEW.status = 'validada' AND (OLD.status IS NULL OR OLD.status <> 'validada') THEN
    -- Para cada child bloqueada por esta, ver si ahora se destraba
    FOR v_child IN
      SELECT r.id, r.entity_type, r.reviewer_id, r.status
      FROM review_dependencies rd
      JOIN reviews r ON r.id = rd.child_review_id
      WHERE rd.parent_review_id = NEW.id AND rd.dep_type = 'blocking'
    LOOP
      IF v_child.status = 'bloqueada' THEN
        IF NOT review_is_blocked(v_child.id) THEN
          UPDATE reviews SET status = 'programada', updated_at = NOW() WHERE id = v_child.id;

          -- Notificación al reviewer si existe la tabla notifications
          IF v_child.reviewer_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, title, message, type, source_module)
            VALUES (
              v_child.reviewer_id,
              '✅ Revisión destrabada: ' || v_child.entity_type,
              'La revisión de ' || v_child.entity_type || ' está lista para iniciarse. Su dependencia (' || NEW.entity_type || ') acaba de validarse.',
              'info',
              'reviews'
            );
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_review_validation ON reviews;
CREATE TRIGGER trg_propagate_review_validation
  AFTER UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_propagate_review_validation();

COMMIT;

-- ───────────────────────────────────────────────────────────────────
-- Verificación
-- ───────────────────────────────────────────────────────────────────
SELECT '────── Tablas nuevas ──────' AS info;
SELECT tablename FROM pg_tables WHERE tablename IN ('review_cycles','review_dependencies','review_templates') ORDER BY tablename;

SELECT '────── Templates seed ──────' AS info;
SELECT entity_type, depends_on_entity_types, sort_order FROM review_templates ORDER BY sort_order;
