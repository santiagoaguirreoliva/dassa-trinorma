-- 033 — Triny · destinatarios de los informes de dirección
-- El resumen semanal (viernes) y el informe mensual del SGI van al equipo
-- de calidad: María y Santiago. Reemplaza la lista anterior, que incluía
-- un correo placeholder inválido (nixa@nixa.com.ar).

UPDATE triny_policies
   SET direccion_recipients = '["maria@dassa.com.ar","santiago@dassa.com.ar"]'::jsonb;
