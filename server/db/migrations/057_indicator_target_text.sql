-- 057 · Target textual por indicador (los KPIs traen metas como "≥97%", "3.800/año",
-- "55%" que no son numéricas). target_value (numeric) se mantiene para cálculos futuros.
ALTER TABLE objective_indicators ADD COLUMN IF NOT EXISTS target_text text;
