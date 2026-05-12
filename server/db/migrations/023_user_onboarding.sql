-- Tabla de aceptacion de pacto de onboarding por user
CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pact_version     TEXT NOT NULL DEFAULT '1.0',
  accepted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address       TEXT,
  user_agent       TEXT,
  landing_seen_count INT NOT NULL DEFAULT 1,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_accepted ON user_onboarding(accepted_at);
COMMENT ON TABLE user_onboarding IS 'Registra cuando cada user vio/acepto la landing de bienvenida (pacto Trinorma). Auditable para ISO.';
