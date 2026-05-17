-- 038 — Empleados · número de WhatsApp para comunicaciones
-- Separado de phone: el WhatsApp de contacto puede diferir del teléfono.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS whatsapp TEXT;
