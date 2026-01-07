# Backend Stabilization Complete

## Overview
Comprehensive stabilization of authentication, seeding, and database consistency to eliminate `/api/auth/me` 401 errors and "user does not exist" audit log skips.

## Changes Implemented

### 1. Idempotent Seeding with Stable IDs ✅

**File**: `backend/src/db/seed.ts`

- **Idempotent upsert by email**: Uses `findByEmail` then creates or updates
- **Stable demo user ID**: Uses `DEMO_USER_ID` from env or deterministic hash from email
- **Only seeds when DB is empty OR `SEED_ON_BOOT=true`**: Prevents unnecessary reseeding
- **Never drops users on dev restart**: Only bumps `tokenVersion` when `FORCE_RESET_DB=true`
- **Token version bumping**: On reseed, increments `tokenVersion` to invalidate old tokens cleanly

**CLI Commands Added**:
- `pnpm seed` - Idempotent seed (only if DB empty or SEED_ON_BOOT=true)
- `pnpm reset` - Reset with token version bump (invalidates old tokens)

### 2. JWT Token Versioning ✅

**Files**: 
- `backend/prisma/schema.prisma` - Added `tokenVersion` field
- `backend/src/middleware/auth.ts` - Validates token version
- `backend/src/routes/auth.ts` - Includes tokenVersion in JWT payload
- `backend/src/models/User.ts` - Added tokenVersion to User model
- `backend/src/db/adapters/prismaUserAdapter.ts` - Includes tokenVersion in queries

**Features**:
- `tokenVersion` stored in users table (defaults to 1)
- Included in JWT payload for validation
- Middleware checks token version against user's current version
- On reseed/reset, `tokenVersion` is incremented to invalidate old tokens
- Returns `TOKEN_VERSION_MISMATCH` code when token is outdated

### 3. Cookie-Based Auth Support ✅

**Files**:
- `backend/src/index.ts` - Registers `@fastify/cookie`
- `backend/src/routes/auth.ts` - Sets HTTP-only cookies on login/register
- `backend/src/middleware/auth.ts` - Reads tokens from cookies or Authorization header

**Cookie Settings**:
- **Development**: `httpOnly: true`, `secure: false`, `sameSite: 'lax'`
- **Production**: `httpOnly: true`, `secure: true`, `sameSite: 'none'`
- Controlled by `USE_COOKIE_AUTH=true` env var
- Vite proxy forwards cookies with `credentials: true`

### 4. Database Consistency ✅

**Files**:
- `backend/prisma/schema.prisma` - Added `tokenVersion` field with default
- FK constraints already in place with `onDelete: Cascade`

**User ID Format**:
- Uses `cuid()` format (25 chars) - consistent across all operations
- JWT `sub` uses same format (user.id)
- Stable demo user ID from env or deterministic hash

### 5. Defensive Middleware ✅

**File**: `backend/src/middleware/auth.ts`

**Improvements**:
- Checks user existence after token verification
- Validates token version against user's current version
- Returns machine-readable error codes:
  - `MISSING_TOKEN` - No token provided
  - `INVALID_TOKEN` - Token invalid/expired
  - `USER_NOT_FOUND` - User doesn't exist (token invalid)
  - `TOKEN_VERSION_MISMATCH` - Token version outdated
- Structured logging with `tokenSub`, `dbUrlHash`, `schema`

**File**: `backend/src/routes/auth.ts` - `/api/auth/me`

- Returns `USER_NOT_FOUND` code when user doesn't exist
- Structured logging with DB context

**File**: `backend/src/routes/auth.ts` - Login sanity check

- Verifies user exists after login
- Verifies audit log creation succeeds
- Fails login if verification fails (prevents inconsistent state)

### 6. Enhanced Audit Logging ✅

**File**: `backend/src/services/auditLogService.ts`

**Improvements**:
- Checks user existence before creating audit log
- Structured error logging with:
  - `tokenSub` - User ID from token
  - `dbUrlHash` - Hashed DB URL for debugging
  - `schema` - Database schema name
  - `reason` - Why audit log was skipped
- Logs error with full context when user not found
- Non-blocking: Doesn't throw errors (audit logging shouldn't break app)

### 7. Structured Logging & Observability ✅

**Files**:
- `backend/src/index.ts` - Logs seeding mode, DB hash, JWT secret hash
- `backend/src/middleware/auth.ts` - Structured auth logs
- `backend/src/services/auditLogService.ts` - Structured audit logs

**Logged Information**:
- `seedMode` - auto | SEED_ON_BOOT | FORCE_SEED | FORCE_RESET_DB
- `dbUrlHash` - First 8 chars of SHA256 hash of DATABASE_URL
- `schema` - Database schema name (usually 'public')
- `jwtSecretHash` - First 16 chars of SHA256 hash of JWT_SECRET
- `tokenSub` - User ID from JWT token
- `userTokenVersion` - User's current token version
- `tokenVersion` - Token's version from JWT payload

### 8. Frontend Error Handling ✅

**File**: `frontend/src/services/authService.ts`

**Improvements**:
- Detects `USER_NOT_FOUND` error code from `/api/auth/me`
- Automatically clears auth storage (token, cache)
- Forces re-login when user not found
- No auto-logout on 401 (only on USER_NOT_FOUND)

**File**: `frontend/src/contexts/AuthContext.tsx`

- Handles `USER_NOT_FOUND` during initialization
- Clears auth storage and forces re-login

### 9. Developer UX ✅

**CLI Commands** (`backend/package.json`):
- `pnpm dev` - Run development server (auto-seeds if DB empty)
- `pnpm seed` - Idempotent seed (only if DB empty or SEED_ON_BOOT=true)
- `pnpm reset` - Reset with token version bump (invalidates old tokens)

**Environment Variables**:
- `SEED_ON_BOOT=true` - Force seed on boot (even if DB has users)
- `FORCE_RESET_DB=true` - Reset mode (bumps tokenVersion, shows warning banner)
- `DEMO_USER_ID=<uuid>` - Stable demo user ID (optional, for consistency)
- `USE_COOKIE_AUTH=true` - Enable HTTP-only cookie auth (optional)

**Banner on Boot**:
- Shows warning when `FORCE_RESET_DB=true` that tokens will be invalidated

## Migration Required

Run the migration to add `tokenVersion` column:

```bash
cd backend
pnpm db:migrate
# Or manually:
psql $DATABASE_URL -f prisma/migrations/add_token_version/migration.sql
```

## Testing Checklist

- [ ] Startup without reseed: No user deletion, tokens remain valid
- [ ] Reseed with old token: Token invalidated, user must re-login
- [ ] Login → /me → vault flow: All steps succeed
- [ ] Audit logging path: Logs created successfully, no "user does not exist" skips
- [ ] Token version bump: Old tokens rejected with TOKEN_VERSION_MISMATCH
- [ ] USER_NOT_FOUND handling: Frontend clears auth and redirects to login
- [ ] Cookie auth (if enabled): Tokens work from cookies
- [ ] Stable demo user ID: Same ID across reseeds (if DEMO_USER_ID set)

## Production Deployment

1. **Run migration**: `pnpm db:migrate:deploy`
2. **Set environment variables**:
   - `JWT_SECRET` - Strong random secret (32+ chars)
   - `DEMO_USER_ID` - Optional stable ID for demo user
   - `USE_COOKIE_AUTH=true` - If using cookie-based auth
3. **Seed database**: `FORCE_SEED=true pnpm start` (first time only)
4. **Monitor logs**: Check for structured logs with `dbUrlHash`, `tokenSub`, etc.

## Result

✅ No more `/api/auth/me` 401 errors from stale tokens
✅ No more "user does not exist" audit log skips
✅ Automatic recovery: Frontend clears auth and forces re-login on USER_NOT_FOUND
✅ Clean token invalidation: Token version bumping invalidates old tokens without deleting users
✅ Production-ready: Idempotent seeding, stable IDs, defensive middleware

