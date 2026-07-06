-- 064 · triny_policies.dry_run → false (reflejar la realidad + volverlo kill-switch REAL)
-- `triny_policies.dry_run` estaba en TRUE pero NADIE lo leía: el mailer (triny-mailer.cjs)
-- sólo miraba `triny_scheduled_jobs.dry_run` (los 4 jobs en false) → TRINY manda LIVE de facto.
-- Era un "freno global" fantasma.
--
-- Se cablea el chequeo en triny-mailer.cjs (sendWithSignature): dryRun efectivo =
-- jobDryRun OR policiesDryRun. Para que ese cableado NO apague TRINY (que hoy manda
-- intencionalmente), esta migración PRIMERO baja la columna a false reflejando el estado real.
-- A partir de acá la columna es un kill-switch global funcional: ponerla en true frena TODO.
--
-- Estado previo verificado: SELECT dry_run FROM triny_policies  ->  t (true)

UPDATE triny_policies SET dry_run = false WHERE dry_run IS DISTINCT FROM false;
