-- SafeNode Supabase Security Advisor hardening
-- Enables RLS on all app-owned public tables and denies PostgREST anon/authenticated
-- access. The backend uses a direct PostgreSQL connection, so app traffic does not
-- depend on Supabase PostgREST access to these tables.

-- NOTE:
-- - This patch is idempotent and safe to rerun.
-- - We intentionally do NOT use FORCE ROW LEVEL SECURITY because the backend uses a
--   direct database connection and must not be broken by RLS enforcement.

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access to users" ON public.users;
DROP POLICY IF EXISTS "Deny authenticated access to users" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

DROP POLICY IF EXISTS "Deny anon access to email_verification_tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Deny authenticated access to email_verification_tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Service role full access to email_verification_tokens" ON public.email_verification_tokens;

DROP POLICY IF EXISTS "Deny anon access to password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Deny authenticated access to password_reset_tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role full access to password_reset_tokens" ON public.password_reset_tokens;

DROP POLICY IF EXISTS "Deny anon access to devices" ON public.devices;
DROP POLICY IF EXISTS "Deny authenticated access to devices" ON public.devices;
DROP POLICY IF EXISTS "Service role full access to devices" ON public.devices;

DROP POLICY IF EXISTS "Deny anon access to teams" ON public.teams;
DROP POLICY IF EXISTS "Deny authenticated access to teams" ON public.teams;
DROP POLICY IF EXISTS "Service role full access to teams" ON public.teams;

DROP POLICY IF EXISTS "Deny anon access to team_members" ON public.team_members;
DROP POLICY IF EXISTS "Deny authenticated access to team_members" ON public.team_members;
DROP POLICY IF EXISTS "Service role full access to team_members" ON public.team_members;

DROP POLICY IF EXISTS "Deny anon access to team_vaults" ON public.team_vaults;
DROP POLICY IF EXISTS "Deny authenticated access to team_vaults" ON public.team_vaults;
DROP POLICY IF EXISTS "Service role full access to team_vaults" ON public.team_vaults;

DROP POLICY IF EXISTS "Deny anon access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Deny authenticated access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "Deny anon access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny authenticated access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON public.audit_logs;

DROP POLICY IF EXISTS "Deny anon access to webauthn_credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Deny authenticated access to webauthn_credentials" ON public.webauthn_credentials;
DROP POLICY IF EXISTS "Service role full access to webauthn_credentials" ON public.webauthn_credentials;

DROP POLICY IF EXISTS "Deny anon access to webauthn_challenges" ON public.webauthn_challenges;
DROP POLICY IF EXISTS "Deny authenticated access to webauthn_challenges" ON public.webauthn_challenges;
DROP POLICY IF EXISTS "Service role full access to webauthn_challenges" ON public.webauthn_challenges;

DROP POLICY IF EXISTS "Deny anon access to billing_webhook_events" ON public.billing_webhook_events;
DROP POLICY IF EXISTS "Deny authenticated access to billing_webhook_events" ON public.billing_webhook_events;
DROP POLICY IF EXISTS "Service role full access to billing_webhook_events" ON public.billing_webhook_events;

CREATE POLICY "Deny anon access to users"
ON public.users FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to users"
ON public.users FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to users"
ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to email_verification_tokens"
ON public.email_verification_tokens FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to email_verification_tokens"
ON public.email_verification_tokens FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to email_verification_tokens"
ON public.email_verification_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to password_reset_tokens"
ON public.password_reset_tokens FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to password_reset_tokens"
ON public.password_reset_tokens FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to password_reset_tokens"
ON public.password_reset_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to devices"
ON public.devices FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to devices"
ON public.devices FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to devices"
ON public.devices FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to teams"
ON public.teams FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to teams"
ON public.teams FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to teams"
ON public.teams FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to team_members"
ON public.team_members FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to team_members"
ON public.team_members FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to team_members"
ON public.team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to team_vaults"
ON public.team_vaults FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to team_vaults"
ON public.team_vaults FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to team_vaults"
ON public.team_vaults FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to subscriptions"
ON public.subscriptions FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to subscriptions"
ON public.subscriptions FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to subscriptions"
ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to audit_logs"
ON public.audit_logs FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to audit_logs"
ON public.audit_logs FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to audit_logs"
ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to webauthn_credentials"
ON public.webauthn_credentials FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to webauthn_credentials"
ON public.webauthn_credentials FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to webauthn_credentials"
ON public.webauthn_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to webauthn_challenges"
ON public.webauthn_challenges FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to webauthn_challenges"
ON public.webauthn_challenges FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to webauthn_challenges"
ON public.webauthn_challenges FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Deny anon access to billing_webhook_events"
ON public.billing_webhook_events FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to billing_webhook_events"
ON public.billing_webhook_events FOR ALL TO authenticated USING (false);
CREATE POLICY "Service role full access to billing_webhook_events"
ON public.billing_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
