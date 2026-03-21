ALTER TABLE public.team_vaults
ADD COLUMN IF NOT EXISTS vault_salt TEXT;

