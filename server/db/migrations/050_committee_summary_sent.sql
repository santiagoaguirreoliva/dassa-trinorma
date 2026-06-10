-- 050 · Comité · registro de envío del resumen por mail a Trinorma
ALTER TABLE committee_meetings
  ADD COLUMN IF NOT EXISTS summary_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_sent_count integer;
