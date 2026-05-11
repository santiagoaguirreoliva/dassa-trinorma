-- =============================================================================
-- DASSA SGI · Migration 020 · OLA 6 · Firma digital + Calendar events
-- =============================================================================
CREATE TABLE IF NOT EXISTS validation_signatures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id       UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  signed_by       UUID NOT NULL REFERENCES users(id),
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash    TEXT NOT NULL,        -- SHA-256 del snapshot
  algorithm       TEXT DEFAULT 'sha256',
  snapshot_data   JSONB NOT NULL,       -- copia exacta de la review al momento
  ip_address      INET,
  user_agent      TEXT,
  notes           TEXT,
  UNIQUE (review_id, signed_by)
);
CREATE INDEX IF NOT EXISTS idx_signatures_review ON validation_signatures(review_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON validation_signatures(signed_by);

CREATE TABLE IF NOT EXISTS calendar_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL,        -- review_due, training, audit, deadline, comm
  entity_type     TEXT,
  entity_id       UUID,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,
  all_day         BOOLEAN DEFAULT TRUE,
  assigned_user_id UUID REFERENCES users(id),
  color           TEXT DEFAULT '#5BBDC9',
  is_completed    BOOLEAN DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calendar_start    ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_assigned ON calendar_events(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_type     ON calendar_events(event_type);

SELECT 'OLA 6 · validation_signatures + calendar_events' AS info;
SELECT tablename FROM pg_tables WHERE tablename IN ('validation_signatures','calendar_events') ORDER BY tablename;
