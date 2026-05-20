-- 043 — Ronda de Inspecciones · rollup semanal
-- Snapshot semanal de KPIs del módulo. Lo llena un cron lunes 06:30 con los
-- resultados de la semana ISO previa. Sirve para el informe mensual de Triny
-- y para análisis de tendencia trimestral/anual.

BEGIN;

CREATE TABLE IF NOT EXISTS insp_weekly_rollup (
  iso_year        INT  NOT NULL,
  iso_week        INT  NOT NULL,           -- 1..53
  week_start      DATE NOT NULL,           -- lunes
  week_end        DATE NOT NULL,           -- domingo

  -- Totales del módulo
  total           INT  NOT NULL DEFAULT 0, -- instancias programadas en la semana
  completadas     INT  NOT NULL DEFAULT 0,
  vencidas        INT  NOT NULL DEFAULT 0, -- pendientes que pasaron de due_date
  cumplimiento    INT,                     -- % entero (NULL si total=0)

  -- Familia rondín (limpieza/mantenimiento/SSHH)
  rondines_total       INT NOT NULL DEFAULT 0,
  rondines_completados INT NOT NULL DEFAULT 0,
  rondines_cosign      INT NOT NULL DEFAULT 0,  -- esperando co-firma al cierre

  -- Familia maquinaria (autoelevadores + kalmars + on-demand)
  maquinaria_total       INT NOT NULL DEFAULT 0,
  maquinaria_completados INT NOT NULL DEFAULT 0,
  maquinaria_dias_faltantes INT NOT NULL DEFAULT 0, -- máquinas-día sin check

  -- Calidad
  hallazgos        INT NOT NULL DEFAULT 0,   -- NCs generadas desde rondas
  items_no_cumple  INT NOT NULL DEFAULT 0,   -- respuestas 'no'/'no_cumple'
  items_criticos   INT NOT NULL DEFAULT 0,   -- subset que son críticos

  -- Detalle JSON (auditoría)
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (iso_year, iso_week)
);

CREATE INDEX IF NOT EXISTS idx_insp_weekly_rollup_week_start ON insp_weekly_rollup (week_start);

COMMENT ON TABLE  insp_weekly_rollup IS 'Snapshot semanal del módulo Ronda de Inspecciones (cron lunes 06:30)';
COMMENT ON COLUMN insp_weekly_rollup.maquinaria_dias_faltantes IS 'Máquinas activas con daily_checklist que NO completaron su check ese día (por día de la semana, sumado)';

COMMIT;
