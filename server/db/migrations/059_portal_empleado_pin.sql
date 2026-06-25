-- 059 · Portal del Empleado (externo, QR + PIN)
-- Acceso público read-only para operarios SIN cuenta de la app: escanean el QR de planta,
-- ingresan su PIN de 4 dígitos y ven lo suyo (ficha, capacitaciones) + lo institucional
-- (organigrama, mapa de procesos, procedimientos, identidad DASSA). Reusa el patrón de
-- auth del checklist de maquinaria (PIN bcrypt + sesión HMAC efímera).
--
-- El PIN se guarda hasheado con bcrypt (nunca en claro). La unicidad del PIN entre los
-- empleados se garantiza al generarlo (script de alta), para que el login por PIN-solo
-- identifique inequívocamente al empleado.

ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_pin_hash      text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_pin_set_at    timestamptz;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_last_login_at timestamptz;

-- Índice parcial: solo los empleados con PIN seteado participan del login (el iterador
-- bcrypt recorre este subconjunto).
CREATE INDEX IF NOT EXISTS idx_employees_portal_pin
  ON employees (id) WHERE portal_pin_hash IS NOT NULL;
