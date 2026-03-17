ALTER TABLE public.users
  ALTER COLUMN vault_version TYPE BIGINT
  USING vault_version::BIGINT;
