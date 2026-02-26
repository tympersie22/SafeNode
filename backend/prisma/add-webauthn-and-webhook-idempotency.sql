-- SafeNode schema patch
-- Adds WebAuthn credential/challenge tables and webhook idempotency table

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  device_type TEXT,
  backed_up BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_credential ON webauthn_credentials(user_id, credential_id);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_type ON webauthn_challenges(user_id, type);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_provider_created_at
  ON billing_webhook_events(provider, created_at);
