-- Enable Row Level Security on ALL public tables
-- This prevents unauthorized access via the Supabase anon/authenticated API keys
-- The app uses Prisma with a direct PostgreSQL connection (postgres role) which bypasses RLS

-- Enable RLS on each table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- NOTE: Do NOT use FORCE ROW LEVEL SECURITY — Prisma connects via the postgres
-- role (superuser) through the Supabase session pooler. Superusers bypass RLS
-- by default, which is what we want. FORCE would break all Prisma queries.

-- Create restrictive policies: deny all access via anon and authenticated roles
-- (Since our app only uses Prisma with the postgres connection string, these roles should have NO access)

-- Users table
CREATE POLICY "Deny anon access to users" ON public.users FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to users" ON public.users FOR ALL TO authenticated USING (false);

-- Email verification tokens
CREATE POLICY "Deny anon access to email_verification_tokens" ON public.email_verification_tokens FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to email_verification_tokens" ON public.email_verification_tokens FOR ALL TO authenticated USING (false);

-- Password reset tokens
CREATE POLICY "Deny anon access to password_reset_tokens" ON public.password_reset_tokens FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to password_reset_tokens" ON public.password_reset_tokens FOR ALL TO authenticated USING (false);

-- Devices
CREATE POLICY "Deny anon access to devices" ON public.devices FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to devices" ON public.devices FOR ALL TO authenticated USING (false);

-- Teams
CREATE POLICY "Deny anon access to teams" ON public.teams FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to teams" ON public.teams FOR ALL TO authenticated USING (false);

-- Team members
CREATE POLICY "Deny anon access to team_members" ON public.team_members FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to team_members" ON public.team_members FOR ALL TO authenticated USING (false);

-- Team vaults
CREATE POLICY "Deny anon access to team_vaults" ON public.team_vaults FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to team_vaults" ON public.team_vaults FOR ALL TO authenticated USING (false);

-- Subscriptions
CREATE POLICY "Deny anon access to subscriptions" ON public.subscriptions FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (false);

-- Audit logs
CREATE POLICY "Deny anon access to audit_logs" ON public.audit_logs FOR ALL TO anon USING (false);
CREATE POLICY "Deny authenticated access to audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (false);

-- Allow service_role full access (explicit policies)
CREATE POLICY "Service role full access to users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to email_verification_tokens" ON public.email_verification_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to password_reset_tokens" ON public.password_reset_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to devices" ON public.devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to teams" ON public.teams FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to team_members" ON public.team_members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to team_vaults" ON public.team_vaults FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
