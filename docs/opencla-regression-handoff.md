# OpenCLA Regression Handoff

## Scope completed
- Locked vault legacy routes behind auth.
- Implemented server-verified WebAuthn with DB-backed credentials/challenges.
- Added webhook idempotency persistence for Stripe/Paddle.
- Retired legacy backend entrypoints (`src/index.ts`, `src/index.legacy.backup.ts`).
- Added frontend email verification route/page and new-user auth retry hardening.
- Unified Security/Blog/Careers/Contact pages with shared feature ribbon.

## Required environment checks
- `FRONTEND_URL=https://safe-node.app`
- `WEBAUTHN_RP_ID=safe-node.app` (recommended)
- `BILLING_PROVIDER=paddle`
- `PADDLE_WEBHOOK_SECRET` set and active
- All `PADDLE_PRICE_*` vars set in backend + frontend

## DB patch required
Run one of:
1. `prisma db push` using updated `schema.prisma`
2. SQL patch: `backend/prisma/add-webauthn-and-webhook-idempotency.sql`

## Regression checklist for OpenCLA
1. New user signup -> immediate entry create (no transient USER_NOT_FOUND failure).
2. Email verification link from inbox opens `/auth/verify?token=...` and verifies.
3. Passkey/biometric register on supported browser succeeds.
4. Biometric authenticate succeeds on same user/session.
5. Vault endpoints `/api/vault/latest`, `/api/vault`, `/api/vault/save` reject missing auth.
6. Stripe webhook duplicate delivery returns `received:true` without duplicate side effects.
7. Paddle webhook duplicate delivery returns `received:true` without duplicate side effects.
8. Pricing checkout still works for Free/Personal/Family/Teams.
9. Marketing pages (Security/Blog/Careers/Contact) render shared feature ribbon.
