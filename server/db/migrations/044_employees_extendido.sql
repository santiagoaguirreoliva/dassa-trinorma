-- 044 — Empleados con datos completos (contacto + laboral + emergencia)
-- Acompaña a employee_certifications (ya existente) y job_profile_employees
-- (asignaciones a puestos, polivalencia futura).

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS cuil                     TEXT,
  ADD COLUMN IF NOT EXISTS birth_date               DATE,
  ADD COLUMN IF NOT EXISTS address                  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name   TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  ADD COLUMN IF NOT EXISTS hire_date                DATE,
  ADD COLUMN IF NOT EXISTS contract_type            TEXT,   -- relación_dependencia | monotributo | autonomo | eventual
  ADD COLUMN IF NOT EXISTS work_schedule            TEXT,   -- full_time | part_time | turnos | guardias
  ADD COLUMN IF NOT EXISTS supervisor_id            UUID REFERENCES employees(id),  -- supervisor jerárquico (puede no ser evaluator)
  ADD COLUMN IF NOT EXISTS notes                    TEXT;

-- Restricciones suaves: chequeos sobre formatos comunes.
-- (No los pongo NOT NULL para no romper los 29 registros existentes.)
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_cuil_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_cuil_check
    CHECK (cuil IS NULL OR cuil ~ '^\d{2}-?\d{7,8}-?\d$');

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_contract_type_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_contract_type_check
    CHECK (contract_type IS NULL OR contract_type IN ('relacion_dependencia','monotributo','autonomo','eventual','plazo_fijo','pasantia'));

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_work_schedule_check;
ALTER TABLE employees
  ADD CONSTRAINT employees_work_schedule_check
    CHECK (work_schedule IS NULL OR work_schedule IN ('full_time','part_time','turnos','guardias','remoto'));

CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id ON employees(supervisor_id);

COMMIT;
