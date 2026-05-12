CREATE TABLE IF NOT EXISTS system_announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body_md       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'novedad' CHECK (category IN ('novedad','update','aviso','urgente')),
  audience      TEXT NOT NULL DEFAULT 'all',   -- 'all' | role específico | csv emails
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON system_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_audience  ON system_announcements(audience);
COMMENT ON TABLE system_announcements IS 'Novedades visibles en la landing /bienvenida. audience: all|role|csv emails. expires_at: NULL = sin expiración.';

-- Seed 3 anuncios iniciales para inaugurar el sistema
INSERT INTO system_announcements (title, body_md, category, audience, pinned, published_at) VALUES
  ('🚀 TRINORMA está vivo',
   'Hoy lanzamos oficialmente el sistema. Si encontrás cualquier problema, avisame.',
   'novedad', 'all', TRUE, NOW()),
  ('🔐 Cambiá tu contraseña inicial',
   'Tu contraseña inicial es **Dassa2026!**. Cambiala apenas ingreses desde **Perfil → Cambiar contraseña**.',
   'aviso', 'all', TRUE, NOW()),
  ('📋 Lo más importante: Mis Pendientes',
   'Todas tus tareas asignadas se concentran en una sola pantalla: **Mis Pendientes**. Revisala todos los días al entrar.',
   'novedad', 'all', FALSE, NOW())
ON CONFLICT DO NOTHING;
