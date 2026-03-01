ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS requires_reapproval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.device_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id text,
  status text NOT NULL DEFAULT 'active',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason text,
  replaced_by_session_id text
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id
  ON public.device_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_status
  ON public.device_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_device_sessions_user_device_status
  ON public.device_sessions(user_id, device_id, status);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device_status
  ON public.device_sessions(device_id, status);

CREATE INDEX IF NOT EXISTS idx_device_sessions_last_seen_at
  ON public.device_sessions(last_seen_at);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_anon_device_sessions" ON public.device_sessions;
CREATE POLICY "deny_anon_device_sessions"
ON public.device_sessions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_device_sessions" ON public.device_sessions;
CREATE POLICY "deny_authenticated_device_sessions"
ON public.device_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_device_sessions" ON public.device_sessions;
CREATE POLICY "service_role_device_sessions"
ON public.device_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
