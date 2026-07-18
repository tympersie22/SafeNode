# Safenode Go-Live Runbook

Safenode production uses Cloudflare Pages for the Vite frontend and Railway for
the Fastify API. `safe-node.app` remains the WebAuthn relying-party ID; changing
hosting must not change that security boundary.

## 1. Release gate

From the repository root:

```bash
./scripts/go-live-preflight.sh
cd frontend && npx vitest run && npm run type-check && npm run build
cd ../backend && npm run type-check
```

Backend integration tests must run against a disposable PostgreSQL database
whose name contains `test`. Never point the test suite at production.

## 2. Deploy the Railway API

Create a Railway service from `tympersie22/SafeNode` with:

- Branch: `main` after merge; use `security/p0-hardening` only for migration validation.
- Root directory: `/backend`.
- Config file: `/backend/railway.json`.
- Builder: Dockerfile, as declared in config-as-code.

Set these required service variables:

```text
NODE_ENV=production
DB_ADAPTER=prisma
DATABASE_URL=<production PostgreSQL URL>
JWT_SECRET=<new random secret, at least 32 bytes>
ENCRYPTION_KEY=<32-byte base64 key; see rotation rules below>
FRONTEND_URL=https://safe-node.app
CORS_ORIGIN=https://safe-node.app,https://www.safe-node.app,capacitor://safe-node.app
BACKEND_URL=https://api.safe-node.app
SSO_CALLBACK_BASE_URL=https://api.safe-node.app
WEBAUTHN_RP_ID=safe-node.app
WEBAUTHN_ORIGIN=https://safe-node.app
USE_COOKIE_AUTH=true
SEED_ON_BOOT=false
```

Preserve the existing `PASSWORD_PEPPER` when carrying existing users. Changing
it invalidates existing password hashes. Configure email, billing, OAuth, and
Sentry variables only for integrations that are enabled.

Before the first production deploy, back up the database and synchronize the
Prisma schema. This repository currently uses `prisma db push`, not a migration
directory:

```bash
cd backend
railway link
railway run npx prisma db push --skip-generate
```

Review Prisma's proposed changes before confirming. Do not use `--accept-data-loss`.

Generate a Railway service domain first and verify:

```bash
curl -fsS https://YOUR-SERVICE.up.railway.app/api/health
curl -fsS https://YOUR-SERVICE.up.railway.app/api/health/ready
```

Then add `api.safe-node.app` as a Railway custom domain. Add both the CNAME and
TXT records Railway provides to Cloudflare DNS; the TXT ownership record is
required for routing and TLS issuance.

## 3. Deploy Cloudflare Pages

Create a Pages project from the same GitHub repository with:

- Project name: `safenode`.
- Production branch: `main` after merge.
- Root directory: `/frontend`.
- Build command: `npm ci && npm run build`.
- Build output directory: `dist`.
- Node.js version: `20`.
- Build variable: `VITE_API_URL=https://api.safe-node.app`.
- Build variable: `VITE_MOBILE_API_URL=https://api.safe-node.app`.

The repository's `wrangler.jsonc`, `_headers`, AASA, and Digital Asset Links
files are copied into the deployment by Vite. Add `safe-node.app` and
`www.safe-node.app` under Pages > Custom domains. Configure `www` to redirect to
the apex domain using a Cloudflare Bulk Redirect.

For GitHub Actions deployment, configure repository secrets:

```text
CLOUDFLARE_API_TOKEN=<token with Account:Cloudflare Pages:Edit>
CLOUDFLARE_ACCOUNT_ID=<GitHub repository variable containing the Cloudflare account ID>
```

## 4. Secret rotation

Generate secrets locally and enter them directly in Railway. Never paste them
into source files, shell history, issue comments, or deployment logs.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))" # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # ENCRYPTION_KEY
```

- `JWT_SECRET`: rotate now. Existing sessions will be invalidated, which is expected.
- `ENCRYPTION_KEY`, existing database: retain the current key until all server-encrypted
  records have been inventoried and re-encrypted through an explicit rotation job.
- `ENCRYPTION_KEY`, new empty database: use a newly generated key.
- `PASSWORD_PEPPER`, existing users: retain it until a password-hash migration exists.

The vault remains zero-knowledge: Railway must never receive a plaintext vault
key, master password, recovery secret, or WebAuthn PRF output.

## 5. Domain and passkey verification

All of these must succeed before publishing mobile downloads:

```bash
curl -i https://api.safe-node.app/api/health
curl -i https://api.safe-node.app/api/health/ready
curl -i https://safe-node.app/.well-known/apple-app-site-association
curl -i https://safe-node.app/.well-known/assetlinks.json
curl -i https://app-site-association.cdn-apple.com/a/v1/safe-node.app
```

The two `/.well-known/` resources must return `200`, JSON content, and no
redirect. Apple may take up to 24 hours to refresh its association cache after
the origin becomes healthy.

## 6. Smoke test and rollback

Test passkey registration/sign-in, PRF vault unlock, recovery fallback, device
registration/reclaim, vault CRUD/sync, teams, password reset, and enabled billing
webhooks. Confirm browser storage contains no master password or raw vault key.

- Frontend rollback: Cloudflare Pages > Deployments > Roll back.
- Backend rollback: Railway service > Deployments > redeploy the last known-good image.
- Database rollback: restore the pre-deploy backup; do not improvise destructive SQL.

Configure uptime monitoring against
`https://api.safe-node.app/api/health/ready` and keep Railway, Cloudflare, Sentry,
and database alerts visible during the first production hours.
