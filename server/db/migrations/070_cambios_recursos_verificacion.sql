-- Migration 070: F-TRI-14 Gestión de Cambios — columnas Recursos y Verificación
-- Auditoría interna 2026-08: el modelo original F-TRI-14 lleva Plazo · Recursos ·
-- Verificación por cambio; la app solo tenía plazo_target.
BEGIN;

ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS recursos     TEXT;
ALTER TABLE change_requests ADD COLUMN IF NOT EXISTS verificacion TEXT;

COMMENT ON COLUMN change_requests.recursos     IS 'Recursos necesarios (modelo F-TRI-14)';
COMMENT ON COLUMN change_requests.verificacion IS 'Método/evidencia de verificación (modelo F-TRI-14)';

COMMIT;
