-- 065 · Acuse digital de requisitos para proveedores/contratistas/transportistas
-- Digitaliza la ACEPTACIÓN firmada que cierran F-TRI-18 (requisitos ambientales y SST)
-- y F-TRI-52 (transportistas tercerizados), bajo el marco de P-TRI-11 (compras).
-- Se completa desde la landing pública trinorma.dassa.com.ar/proveedores/
-- (POST /api/public/proveedores/acuse) y se lista autenticado en /api/proveedores/acuses.
-- Si el CUIT matchea un proveedor cargado en `suppliers`, se vincula (supplier_id).

BEGIN;

CREATE TABLE IF NOT EXISTS supplier_acknowledgements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name  TEXT NOT NULL,
  cuit          TEXT NOT NULL,
  person_name   TEXT NOT NULL,          -- quien acepta en nombre de la empresa
  email         TEXT NOT NULL,
  phone         TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN
                  ('proveedor_insumos','contratista_obra','transportista','otro')),
  comments      TEXT,
  doc_version   TEXT NOT NULL DEFAULT 'P-TRI-11 REV1 · F-TRI-18 REV00 · F-TRI-52 REV00',
  accepted      BOOLEAN NOT NULL DEFAULT true,
  ip            TEXT,                   -- evidencia del acuse (x-forwarded-for)
  user_agent    TEXT,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_ack_created ON supplier_acknowledgements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_ack_cuit    ON supplier_acknowledgements (cuit);

COMMIT;
