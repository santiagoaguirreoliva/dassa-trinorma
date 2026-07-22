-- 069 · Compras públicas + segregación NC/hallazgos + documentos de proveedores
-- (pedido Santi 2026-07-22)

-- ── Compras: solicitudes desde el link público (sin usuario) ────────────
ALTER TABLE purchases ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS requester_name  text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS requester_email text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS quantity        integer;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS channel         text NOT NULL DEFAULT 'app';
ALTER TABLE purchases ADD CONSTRAINT purchases_channel_check
  CHECK (channel IN ('app', 'publica'));

-- ── Findings: segregar NC Trinorma vs avisos/hallazgos generales ────────
ALTER TABLE findings ADD COLUMN IF NOT EXISTS report_kind text NOT NULL DEFAULT 'nc';
ALTER TABLE findings ADD CONSTRAINT findings_report_kind_check
  CHECK (report_kind IN ('nc', 'hallazgo'));

-- ── Proveedores: múltiples documentos adjuntos por proveedor ────────────
CREATE TABLE IF NOT EXISTS supplier_documents (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  url         text NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier
  ON supplier_documents(supplier_id);
