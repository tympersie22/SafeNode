CREATE TABLE IF NOT EXISTS public.account_successors (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  successor_email text NOT NULL,
  successor_name text,
  relationship_label text,
  note text,
  status text NOT NULL DEFAULT 'active',
  waiting_period_days integer NOT NULL DEFAULT 14,
  claim_requested_at timestamptz,
  claim_available_at timestamptz,
  claim_token_hash text,
  claim_token_expires_at timestamptz,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_successors_successor_email ON public.account_successors(successor_email);
CREATE INDEX IF NOT EXISTS idx_account_successors_status ON public.account_successors(status);
CREATE INDEX IF NOT EXISTS idx_account_successors_claim_available_at ON public.account_successors(claim_available_at);
CREATE INDEX IF NOT EXISTS idx_account_successors_claim_token_hash ON public.account_successors(claim_token_hash);

ALTER TABLE public.account_successors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access to account_successors" ON public.account_successors;
DROP POLICY IF EXISTS "Deny authenticated access to account_successors" ON public.account_successors;
DROP POLICY IF EXISTS "Service role full access to account_successors" ON public.account_successors;

CREATE POLICY "Deny anon access to account_successors"
ON public.account_successors FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to account_successors"
ON public.account_successors FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to account_successors"
ON public.account_successors FOR ALL TO service_role USING (true) WITH CHECK (true);
