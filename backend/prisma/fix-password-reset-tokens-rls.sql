-- One-off production patch for Supabase Security Advisor findings.
-- Applies RLS and restrictive policies to public.password_reset_tokens.

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access to password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny authenticated access to password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role full access to password_reset_tokens" ON public.password_reset_tokens;

CREATE POLICY "Deny anon access to password_reset_tokens"
ON public.password_reset_tokens
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny authenticated access to password_reset_tokens"
ON public.password_reset_tokens
FOR ALL
TO authenticated
USING (false);

CREATE POLICY "Service role full access to password_reset_tokens"
ON public.password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
