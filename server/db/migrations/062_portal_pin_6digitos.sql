-- 062 · Portal del Empleado · login por DNI + PIN de 6 dígitos + lockout por empleado
-- Cierra P0-6: el login pasaba de PIN-solo (adivinar cualquier PIN entraba a la ficha de
-- su dueño) a DNI + PIN, con el PIN validado SOLO contra el empleado cuyo DNI matchea.
-- El PIN pasa de 4 a 6 dígitos y se agrega bloqueo temporal por empleado tras N fallos.
--
--   · El DNI se deriva del CUIL ya cargado (columna `cuil`); no se agrega columna nueva.
--     El login normaliza CUIL sin guiones y extrae el bloque central de 7-8 dígitos.
--   · portal_failed_attempts · contador de intentos fallidos consecutivos de login.
--   · portal_locked_until    · si > NOW(), el empleado está bloqueado para login.
--
-- MIGRACIÓN DE PINs de 4 dígitos existentes: al momento de escribir esto había 1 solo PIN
-- activo (cuenta de prueba/admin). Se invalidan TODOS los PIN de 4 dígitos → los empleados
-- re-activan (crean PIN de 6) con el flujo de primer ingreso que ya existe. Es lo más limpio
-- y sin impacto real de usuario. Se limpia también portal_activated_at para reabrir la
-- activación, dejando intacto el token de invitación y el onboarding ya completado.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_failed_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_locked_until    timestamptz;

-- Invalidar los PIN de 4 dígitos existentes: se re-activan a 6 con el flujo de invitación.
UPDATE employees
   SET portal_pin_hash        = NULL,
       portal_pin_set_at      = NULL,
       portal_activated_at    = NULL,
       portal_failed_attempts = 0,
       portal_locked_until    = NULL
 WHERE portal_pin_hash IS NOT NULL;
