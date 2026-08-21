-- 076 · Revisión por la Dirección — vigilancia de la salud
-- Último bloque resaltado por Nixa en el F-TRI-05 que quedaba sin campo propio:
-- los exámenes médicos periódicos y la disponibilidad del médico laboral. No entra
-- en peligros y riesgos (eso es identificación) ni en consulta y participación:
-- ISO 45001 lo trata como vigilancia de la salud de los trabajadores.
ALTER TABLE management_reviews
  ADD COLUMN IF NOT EXISTS health_surveillance text;
