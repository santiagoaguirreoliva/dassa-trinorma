-- 047 — Contactos externos (proveedores estratégicos / consultores que no
-- son empleados pero forman parte del organigrama y del ecosistema DASSA).
-- Ej.: Nixa Méndez (consultora SGI), Toti (mantenimiento externo).

BEGIN;

CREATE TABLE IF NOT EXISTS external_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  role            TEXT,                   -- "Consultora SGI", "Mantenimiento", etc.
  organization    TEXT,                   -- "Méndez Consultora", "TotiServ", "—"
  email           TEXT,
  phone           TEXT,
  whatsapp        TEXT,
  address         TEXT,
  org_node_id     UUID REFERENCES org_chart_nodes(id) ON DELETE SET NULL,
  supervisor_in_dassa_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE RESTRICT
                  DEFAULT '00000000-0000-0000-0000-000000000001'
);

CREATE TRIGGER external_contacts_updated_at BEFORE UPDATE ON external_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_external_contacts_active ON external_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_external_contacts_node   ON external_contacts(org_node_id);

-- Seed inicial con Nixa y Toti
INSERT INTO external_contacts (full_name, role, organization, email, org_node_id, supervisor_in_dassa_id, notes)
SELECT
  'Nixa Méndez',
  'Directora SGI · Consultora externa',
  'Méndez Consultoría',
  'nixa.8908@gmail.com',
  'a2222222-2222-2222-2222-000000000002'::uuid,
  (SELECT id FROM employees WHERE full_name='Santiago Aguirre Oliva'),
  'Responsable de conformidad ISO del SGI. Email solo para mails importantes; resto por inbox de la app.'
WHERE NOT EXISTS (SELECT 1 FROM external_contacts WHERE full_name='Nixa Méndez');

INSERT INTO external_contacts (full_name, role, organization, org_node_id, supervisor_in_dassa_id, notes)
SELECT
  'Toti',
  'Mantenimiento',
  NULL,
  'a3333333-3333-3333-3333-000000000011'::uuid,
  (SELECT id FROM employees WHERE full_name='María del Carmen Delgado'),
  'Proveedor externo. Supervisión compartida: Marcelo (Depósito) según tarea operativa, María (Admin) en pagos.'
WHERE NOT EXISTS (SELECT 1 FROM external_contacts WHERE full_name='Toti');

COMMIT;
