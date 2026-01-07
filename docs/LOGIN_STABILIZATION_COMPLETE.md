# Login Stabilization Complete

## Summary
Fixed login 401 errors by implementing:
1. **Idempotent seeding** with stable password hashing
2. **Password pepper** for consistent hashing between seed and verify
3. **Detailed error codes** for better diagnostics
4. **Frontend API config** improvements

## Changes Implemented

### 1. Password Utility with Pepper (`backend/src/utils/password.ts`)

**New file** - Centralized password hashing with pepper support:

```typescript
// Uses PASSWORD_PEPPER from env (prepended to password before hashing)
// Same function used in both seed and userService
export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(hash: string, password: string): Promise<boolean>
export function getPasswordConfig() // For diagnostics
```

**Key features**:
- Pepper from `PASSWORD_PEPPER` env var (optional but recommended)
- Same hashing params in dev/prod as before
- Version tracking: `HASHING_PARAMS_VERSION = '1.0'`

### 2. Updated Seeding (`backend/src/db/seed.ts`)

**Changes**:
- Uses `hashPassword()` from password utility (same as runtime)
- **Upsert by email** (idempotent - no duplicates)
- Always updates password hash (in case pepper changed)
- Normalizes email to lowercase
- Logs: `"✅ Seed user upserted: demo@safenode.app"` with user ID

**Key snippet**:
```typescript
const normalizedEmail = DEMO_EMAIL.toLowerCase().trim()
const passwordHash = await hashPassword(DEMO_PASSWORD) // Uses pepper

const demoUser = await prisma.user.upsert({
  where: { email: normalizedEmail },
  update: { passwordHash, ... }, // Always update hash
  create: { id: stableDemoId, email: normalizedEmail, passwordHash, ... }
})
```

### 3. Updated User Service (`backend/src/services/userService.ts`)

**Changes**:
- Uses `hashPassword()` and `verifyPassword()` from password utility
- Returns detailed auth result: `{ user: User | null; reason: 'USER_NOT_FOUND' | 'BAD_PASSWORD' | 'SUCCESS' }`
- Normalizes email to lowercase

**Key snippet**:
```typescript
export async function authenticateUser(
  email: string, 
  password: string
): Promise<{ user: User | null; reason: 'USER_NOT_FOUND' | 'BAD_PASSWORD' | 'SUCCESS' }> {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await db.users.findByEmail(normalizedEmail)
  
  if (!user) return { user: null, reason: 'USER_NOT_FOUND' }
  
  const valid = await verifyPassword(user.passwordHash, password) // Uses pepper
  if (!valid) return { user: null, reason: 'BAD_PASSWORD' }
  
  return { user: { ...user, lastLoginAt: Date.now() }, reason: 'SUCCESS' }
}
```

### 4. Enhanced Auth Route (`backend/src/routes/auth.ts`)

**Changes**:
- Detailed error codes in 401 responses:
  - `USER_NOT_FOUND` - User doesn't exist
  - `BAD_PASSWORD` - Password mismatch
  - `AUTH_ERROR` - Other auth errors
- Structured logging (never logs raw passwords):
  - `{ email, normalizedEmail, reason, hashingParamsVersion }`
- Post-login sanity check: Verifies user exists after login

**Key snippet**:
```typescript
const authResult = await authenticateUser(normalizedEmail, password)

if (authResult.reason === 'USER_NOT_FOUND') {
  return reply.code(401).send({
    error: 'invalid_credentials',
    code: 'USER_NOT_FOUND',
    message: 'Invalid email or password'
  })
}

if (authResult.reason === 'BAD_PASSWORD') {
  return reply.code(401).send({
    error: 'invalid_credentials',
    code: 'BAD_PASSWORD',
    message: 'Invalid email or password'
  })
}
```

### 5. Health Check Endpoint (`backend/src/routes/health.ts`)

**Changes**:
- Added auth config summary in dev mode:
  ```json
  {
    "status": "ok",
    "auth": {
      "seedOnBoot": true,
      "pepperConfigured": true,
      "hashingParamsVersion": "1.0"
    }
  }
  ```

### 6. Frontend API Config (`frontend/src/config/api.ts`)

**Changes**:
- Enhanced logging: Shows `withCredentials: true` when using proxy
- No trailing slash issues

### 7. Vite Proxy Config (`frontend/vite.config.ts`)

**Changes**:
- Added `cookieDomainRewrite: ''` for proper cookie forwarding
- Already had `credentials: true` support

### 8. Environment Variables (`backend/env.example`)

**Added**:
```bash
# Password Pepper - Optional but recommended for stable password hashing
PASSWORD_PEPPER=dev-pepper

# Seeding Configuration
SEED_ON_BOOT=true
```

## Testing Checklist

✅ **Idempotent seeding**:
```bash
# First run
SEED_ON_BOOT=true pnpm dev
# Logs: "✅ Seed user upserted: demo@safenode.app"

# Second run (no duplicate)
SEED_ON_BOOT=true pnpm dev
# Logs: "✅ Seed user upserted: demo@safenode.app" (updated, not created)
```

✅ **Login with curl**:
```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@safenode.app","password":"demo-password"}'
# Returns 200 with token
```

✅ **Error codes**:
- Wrong email → `401 { "code": "USER_NOT_FOUND" }`
- Wrong password → `401 { "code": "BAD_PASSWORD" }`

✅ **Pepper change**:
```bash
# Change PASSWORD_PEPPER in .env
PASSWORD_PEPPER=new-pepper

# Restart server
pnpm dev

# Login fails with BAD_PASSWORD until reseed
# After reseed, login works again
```

✅ **Health check**:
```bash
curl http://localhost:4000/api/health
# Returns auth config in dev mode
```

## Migration Steps

1. **Update .env**:
   ```bash
   PASSWORD_PEPPER=dev-pepper
   SEED_ON_BOOT=true
   ```

2. **Reseed database** (to update password hashes with pepper):
   ```bash
   cd backend
   pnpm seed
   # Or restart with SEED_ON_BOOT=true
   ```

3. **Test login**:
   ```bash
   # Backend
   pnpm dev

   # Frontend
   cd frontend
   pnpm dev

   # Login with: demo@safenode.app / demo-password
   ```

## Key Files Changed

- ✅ `backend/src/utils/password.ts` (NEW)
- ✅ `backend/src/services/userService.ts`
- ✅ `backend/src/db/seed.ts`
- ✅ `backend/src/routes/auth.ts`
- ✅ `backend/src/routes/health.ts`
- ✅ `backend/env.example`
- ✅ `frontend/src/config/api.ts`
- ✅ `frontend/vite.config.ts`

## Result

✅ **Deterministic login**: Demo user always exists with known credentials
✅ **Stable hashing**: Same pepper used in seed and verify
✅ **Better diagnostics**: Clear error codes distinguish user not found vs bad password
✅ **Idempotent seeding**: No duplicates, always updates password hash
✅ **Email normalization**: Always lowercase in seed and login

The login flow is now stable and deterministic!

