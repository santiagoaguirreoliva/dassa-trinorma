-- 049 · FODA · estado de validación por punto (cierre con NIXA antes de derivar acciones)
ALTER TABLE context_analysis
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pendiente'
    CHECK (validation_status IN ('pendiente','validado','rechazado')),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_note text;
