-- 060 · Portal del Empleado · invitación de primer acceso + onboarding
-- El admin genera, desde la vista de Empleados, un link de primer ingreso por persona.
-- Con ese link el empleado entra una vez, ELIGE su PIN (único) y completa su legajo
-- (datos personales, contacto y contacto de emergencia) antes de poder navegar.
--
--   portal_invite_token      · token de un solo uso para el primer ingreso (link).
--   portal_invite_created_at · cuándo se generó/regeneró el link.
--   portal_activated_at      · cuándo el empleado creó su PIN (link ya consumido).
--   portal_onboarded_at      · cuándo terminó el onboarding obligatorio de datos.
--   marital_status           · estado civil (resto de datos personales ya existen).

ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_invite_token      text UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_invite_created_at timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_activated_at      timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_onboarded_at      timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status           text;
