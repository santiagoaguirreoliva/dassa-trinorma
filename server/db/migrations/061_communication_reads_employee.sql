-- 061 · Acuse de lectura de comunicaciones por EMPLEADO (Portal del Empleado · ISO 7.3)
-- communication_reads sólo tenía user_id (usuarios de la app). Los empleados del portal
-- se identifican por employee_id (no tienen cuenta), así que sumamos esa columna y un
-- índice único parcial para registrar "leí y entendí" una sola vez por empleado.

ALTER TABLE communication_reads ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_reads_comm_emp
  ON communication_reads (communication_id, employee_id)
  WHERE employee_id IS NOT NULL;
