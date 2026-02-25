# SafeNode Go-Live Runbook

This runbook is the final production checklist for SafeNode (web, backend API, and mobile dependency health).

## 1) Release Readiness Gate (must pass)

Run the preflight script from the repository root:

```bash
./scripts/go-live-preflight.sh
```

Required green checks:
- `npm audit` is zero for `backend`, `frontend`, and `mobile`.
- `backend` build succeeds.
- `frontend` build succeeds.
- No legacy domain references (`*.vercel.app` or `safenode.app`).
- RLS patch files for `password_reset_tokens` exist.

Current known blockers before hard production launch:
- Backend test suite requires a real `DATABASE_URL` test database.
- Frontend test suite has existing failing tests and should be stabilized before launch.

## 2) Supabase Security Advisor Closure

Apply the one-off SQL patch in Supabase SQL Editor:

- `backend/prisma/fix-password-reset-tokens-rls.sql`

This enables RLS for `public.password_reset_tokens` and blocks `anon` / `authenticated` while allowing `service_role`.

After running it:
- Open Supabase Security Advisor.
- Confirm the `public.password_reset_tokens` RLS findings are closed.

## 3) Production Environment Variables

Backend (Railway):
- `NODE_ENV=production`
- `DATABASE_URL` (from Railway Postgres)
- `JWT_SECRET` (32+ chars)
- `ENCRYPTION_KEY`
- `FRONTEND_URL=https://safe-node.app`
- `SSO_CALLBACK_BASE_URL=https://safe-node.app` (for Google OAuth callback branding)
- Stripe keys (if billing enabled)
- Sentry DSN (recommended)

Backend (Vercel + Supabase Postgres alternative):
- `NODE_ENV=production`
- `DB_ADAPTER=prisma`
- `DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.ohzfyxtxffvnzyhkaihs.supabase.co:6543/postgres?sslmode=require` (dedicated pooler)
- Optional: `POSTGRES_PRISMA_URL` with the same dedicated pooler URL
- Optional: `POSTGRES_URL_NON_POOLING` for direct non-pool connections
- `JWT_SECRET` (32+ chars)
- `ENCRYPTION_KEY` (32-byte base64)
- `FRONTEND_URL=https://safe-node.app`

Frontend (Vercel):
- `VITE_API_URL=https://<your-backend-domain>`
- Optional Sentry/browser telemetry keys
- Note: SafeNode frontend uses Vite env vars (`VITE_*`), not `NEXT_PUBLIC_*`.

Do not use:
- Legacy domains (`*.vercel.app` or `safenode.app`)
- `https://www.safe-node.app` unless DNS + certificate are explicitly configured

Google OAuth branding checklist:
- Set OAuth consent app name to `Safenode` in Google Cloud Console.
- Upload `SafeNodelogo.png` as the OAuth app logo.
- Add `safe-node.app` as an authorized domain.
- Ensure redirect URI is `https://safe-node.app/api/sso/callback/google`.

## 4) Deploy Order

1. Deploy backend (Railway).
2. Run DB migration/deploy step (if pending).
3. Verify backend health endpoint responds.
4. Deploy frontend (Vercel).
5. Verify app can authenticate and hit API.

## 5) Smoke Test (production)

Run this from repo root against production:

```bash
BASE_URL="https://<your-backend-domain>" npm run test:apis
```

Then do manual browser smoke:
- Register/login/logout
- Vault create/unlock/save/edit/delete
- Password reset end-to-end
- Team/invite/sync flows (if enabled)
- Billing checkout and webhook flow (if enabled)

## 6) Observability and Incident Readiness

Before traffic:
- Confirm Sentry backend + frontend ingest events.
- Confirm health check/uptime monitor for API.
- Confirm log access for Railway/Vercel.
- Configure alerts per `docs/MONITORING_ALERTS.md`.

Rollback plan:
- Frontend: rollback to previous Vercel deployment.
- Backend: rollback to previous Railway deployment.
- Database: restore from latest backup or run rollback migration script if available.

## 7) Post-Launch (first 2 hours)

- Watch error rates and auth failures.
- Watch API p95 latency and 5xx.
- Watch password reset and login success rates.
- If severe auth/data issue appears, rollback immediately and investigate offline.

## 8) TLS Certificate Pre-Generation (local/proxy)

To pre-generate TLS certs for local nginx/docker usage:

```bash
npm run ssl:generate
```

This creates:
- `ssl/fullchain.pem`
- `ssl/privkey.pem`
