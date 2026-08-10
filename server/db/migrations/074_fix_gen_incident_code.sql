-- 074 · El registro de incidentes nunca pudo grabar una fila
--
-- gen_incident_code() calculaba el prefijo del código con `CASE incident_type`
-- en lugar de `CASE NEW.incident_type`. En PL/pgSQL eso no resuelve la columna
-- de la fila entrante, así que todo INSERT sobre incidents moría con
-- "column incident_type does not exist" — desde la app y desde SQL.
--
-- Por eso la tabla estaba vacía y los accidentes se venían cargando como no
-- conformidades. Ver F-TRI-43 (Registro y seguimiento de incidentes y
-- accidentes, ISO 45001 10.2).

CREATE OR REPLACE FUNCTION gen_incident_code() RETURNS TRIGGER AS $$
DECLARE prefix TEXT; yr TEXT; seq INT;
BEGIN
  yr := to_char(NOW(), 'YYYY');
  prefix := CASE NEW.incident_type WHEN 'accidente' THEN 'ACC' ELSE 'INC' END;
  SELECT COALESCE(MAX(CAST(split_part(code, '-', 3) AS INT)), 0) + 1
    INTO seq FROM incidents WHERE code LIKE prefix || '-' || yr || '-%';
  NEW.code := prefix || '-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
