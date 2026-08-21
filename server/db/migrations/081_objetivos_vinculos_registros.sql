-- 081 · Objetivos — vínculos con el resto del sistema y bitácora de registros
--
-- Hasta ahora cada módulo se ataba a los objetivos a su manera y sin integridad:
-- trainings.objective era texto libre, strategic_projects.objective_codes un
-- texto con códigos sueltos y change_requests.related_objective_ids un array de
-- uuid que nadie llenaba. Esta tabla unifica el vínculo con clave real.
CREATE TABLE IF NOT EXISTS objective_links (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id  uuid NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  entity_type   text NOT NULL CHECK (entity_type IN ('capacitacion','proyecto','cambio','hallazgo','riesgo')),
  entity_id     uuid NOT NULL,
  note          text,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (objective_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_objective_links_obj ON objective_links(objective_id);

-- Registros que escribe cualquier persona sobre el objetivo: avances, notas,
-- evidencia. `edicion` la genera el sistema cuando alguien cambia la ficha: con
-- la edición abierta a todos, esta bitácora es la evidencia de control de
-- cambios que pide ISO 9001 7.5.3 sobre la información documentada.
CREATE TABLE IF NOT EXISTS objective_entries (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id  uuid NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  entry_type    text NOT NULL DEFAULT 'nota' CHECK (entry_type IN ('avance','nota','evidencia','edicion')),
  content       text NOT NULL,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_objective_entries_obj ON objective_entries(objective_id, created_at DESC);
