ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vault_access_mode TEXT NOT NULL DEFAULT 'passphrase',
  ADD COLUMN IF NOT EXISTS wrapped_vault_key TEXT,
  ADD COLUMN IF NOT EXISTS wrapped_vault_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS recovery_wrapped_vault_key TEXT,
  ADD COLUMN IF NOT EXISTS recovery_wrapped_vault_key_iv TEXT,
  ADD COLUMN IF NOT EXISTS recovery_salt TEXT,
  ADD COLUMN IF NOT EXISTS recovery_kit_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS users_vault_access_mode_idx
  ON public.users (vault_access_mode);
