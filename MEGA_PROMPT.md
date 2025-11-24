# 🔥 SafeNode Pre-Production Mega Prompt

**Copy and paste this entire prompt into Cursor to automatically complete all pre-production tasks.**

---

You are the SafeNode full-stack AI engineer. Your job is to prepare SafeNode for production before Dec 25 by completing and fixing ALL items in the TODO list.

## Rules

- Work sequentially from TOP PRIORITY → LOW PRIORITY
- For each feature:
  1. Detect whether implementation exists
  2. Verify correctness
  3. Fix bugs / missing logic
  4. Add missing code
  5. Test automatically
- Never break existing UI or encryption logic
- Use TypeScript, correct file paths, SafeNode architecture
- Fix build errors immediately
- After each task, show summary of changes and affected files

---

## 🔴 CRITICAL — MUST BE COMPLETED FIRST

### Task 1: Fix Production Security Headers

**Location**: `backend/src/middleware/security.ts`

**Requirements**:
- Remove `'unsafe-inline'` from CSP `scriptSrc` and `styleSrc`
- Implement nonce-based CSP for inline scripts/styles
- Generate nonces per request using Fastify hooks
- Update all frontend pages to use nonces for inline scripts
- Ensure Fastify CSP passes production build
- Test on all pages (landing, auth, vault, settings, billing)

**Implementation Steps**:
1. Read current `security.ts` file
2. Add nonce generation middleware
3. Update CSP directives to use nonces
4. Pass nonces to frontend via template/headers
5. Update frontend to use nonces for inline scripts
6. Test CSP headers in production mode

**Success Criteria**:
- No `unsafe-inline` in production CSP
- All pages load correctly
- Inline scripts/styles work with nonces

---

### Task 2: Comprehensive Test Coverage

**Requirements**:

**Backend Unit Tests** (`backend/tests/`):
- `auth.test.ts` - Complete existing, add edge cases
- `vault.test.ts` - Create new: encryption, decryption, sync
- `encryption.test.ts` - Create new: AES-256-GCM, Argon2id
- `pinManager.test.ts` - Create new: PIN validation, encryption
- `auditLog.test.ts` - Create new: log creation, filtering
- `stripeService.test.ts` - Create new: checkout, webhooks
- `subscriptionLimits.test.ts` - Create new: limit enforcement

**Frontend Unit Tests** (`frontend/tests/`):
- `crypto.test.ts` - Create new: encryption utilities
- `vaultStorage.test.ts` - Create new: local storage
- `sync.test.ts` - Create new: sync logic
- Component tests for critical components

**Integration Tests**:
- `auth-flow.test.ts` - Register → Create vault → Unlock → Sync
- `billing-flow.test.ts` - Subscribe → Webhook → Limits
- `team-flow.test.ts` - Create team → Invite → Share vault

**E2E Tests** (using Playwright or Cypress):
- `login.e2e.test.ts` - Full login flow
- `vault-unlock.e2e.test.ts` - Unlock and view entries
- `sync-conflicts.e2e.test.ts` - Conflict resolution
- `stripe-checkout.e2e.test.ts` - Subscription purchase

**Test Coverage**:
- Add coverage reporting (Jest/Vitest)
- Target: 80%+ coverage for critical paths
- Generate coverage reports

**Success Criteria**:
- All tests pass
- Coverage reports generated
- CI/CD runs tests automatically

---

### Task 3: Mobile Conflict Resolution UI

**Location**: `mobile/src/components/ConflictResolutionModal.tsx`

**Requirements**:
- Create React Native modal component
- Display side-by-side comparison of local vs server entries
- Show conflict type (both_modified, deleted_locally, deleted_server)
- Add resolution buttons: "Use Local", "Use Server", "Merge", "Keep Both"
- Integrate with `useConflictResolution` hook
- Add visual indicators for differences
- Handle merge logic for entries

**Implementation Steps**:
1. Create `ConflictResolutionModal.tsx` component
2. Add comparison view with diff highlighting
3. Add resolution action buttons
4. Integrate with existing hook in `VaultScreen.tsx`
5. Test conflict detection and resolution flow

**Success Criteria**:
- Modal displays conflicts correctly
- All resolution options work
- Conflicts are resolved and synced

---

## 🟡 MEDIUM PRIORITY — CORE FEATURES

### Task 4: Mobile Offline-First Sync

**Location**: `mobile/src/hooks/useVault.ts`, `mobile/src/services/syncService.ts`

**Requirements**:
- Implement operation queue for offline actions
- Store pending operations in AsyncStorage
- Background sync when connection restored
- Network state detection
- Sync status indicators in UI
- Conflict detection on sync
- Retry failed operations

**Implementation Steps**:
1. Create `syncQueue.ts` service for operation queuing
2. Update `useVault` to queue operations when offline
3. Add network state listener
4. Implement background sync on reconnect
5. Add sync status UI indicators
6. Integrate conflict detection

**Success Criteria**:
- Operations queue when offline
- Auto-sync on reconnect
- UI shows sync status
- Conflicts detected and resolved

---

### Task 5: Desktop Biometric Authentication

**Location**: `src-tauri/src/main.rs`

**Requirements**:

**macOS**:
- Use `localauthentication` crate or call LocalAuthentication framework
- Support Face ID and Touch ID
- Fallback to master password

**Windows**:
- Use Windows Hello APIs via `windows` crate
- Support Windows Hello (face, fingerprint, PIN)
- Fallback to master password

**Linux**:
- Use `fprintd` via DBus or `libfprint`
- Support fingerprint authentication
- Fallback to master password

**Implementation Steps**:
1. Add platform-specific dependencies to `Cargo.toml`
2. Implement macOS LocalAuthentication
3. Implement Windows Hello
4. Implement Linux fprintd
5. Add error handling and fallbacks
6. Update frontend to call biometric commands

**Success Criteria**:
- Biometric auth works on all platforms
- Graceful fallback to password
- Error handling for unsupported devices

---

### Task 6: SSO Integration

**Files**: `backend/src/routes/sso.ts`, `backend/src/services/ssoService.ts`

**Requirements**:
- OAuth2 for Google and Microsoft
- SAML placeholder structure for Enterprise
- Login URL generation
- Callback verification and user creation
- Team invitation flow integration
- Admin UI for SSO settings (frontend)

**Implementation Steps**:
1. Install OAuth libraries (`passport-google-oauth20`, `passport-microsoft`)
2. Implement `initializeSSOProvider` with real OAuth setup
3. Implement `getSSOLoginUrl` to generate OAuth URLs
4. Implement `handleSSOCallback` to verify and create users
5. Update routes to handle SSO flows
6. Create admin UI for SSO configuration
7. Add SSO settings to team management

**Success Criteria**:
- Google OAuth works
- Microsoft OAuth works
- Users can login via SSO
- Team SSO configuration works

---

### Task 7: Downloads Page Finalization

**Location**: `frontend/src/pages/marketing/Downloads.tsx`

**Requirements**:
- Replace placeholder `#` links with actual download URLs
- Add download links for:
  - macOS: `.dmg` file or App Store link
  - Windows: `.exe` installer or Microsoft Store
  - Linux: `.AppImage` or package manager links
  - iOS: TestFlight or App Store link
  - Android: Play Store link
  - Browser extensions: Chrome Web Store, Firefox Add-ons, Edge Add-ons

**Implementation Steps**:
1. Build desktop installers (Tauri)
2. Upload to hosting/CDN or app stores
3. Update `Downloads.tsx` with real URLs
4. Add download tracking/analytics
5. Test all download links

**Success Criteria**:
- All download links work
- Installers are signed (if possible)
- Links point to correct files/stores

---

### Task 8: API Documentation

**Requirements**:
- Generate OpenAPI 3.0 specification
- Create Swagger UI endpoint at `/api/docs`
- Generate Markdown API docs
- Include request/response examples
- Document all endpoints with auth requirements

**Implementation Steps**:
1. Install `@fastify/swagger` and `@fastify/swagger-ui`
2. Add OpenAPI annotations to all routes
3. Generate OpenAPI spec
4. Set up Swagger UI endpoint
5. Generate Markdown docs from spec
6. Add to documentation folder

**Success Criteria**:
- Swagger UI accessible at `/api/docs`
- All endpoints documented
- Examples provided

---

### Task 9: Database Query Optimization

**Requirements**:
- Add missing indexes on frequently queried fields
- Prevent N+1 queries in team/vault queries
- Optimize vault + audit log queries
- Add pagination to list endpoints
- Load testing for bottlenecks

**Implementation Steps**:
1. Analyze slow queries (add logging)
2. Add indexes to Prisma schema:
   - `User.email` (unique)
   - `User.stripeCustomerId`
   - `Vault.userId`, `Vault.teamId`
   - `VaultEntry.vaultId`
   - `AuditLog.userId`, `AuditLog.timestamp`
3. Fix N+1 queries with `include` statements
4. Add pagination to list endpoints
5. Run load tests
6. Optimize based on results

**Success Criteria**:
- All queries use indexes
- No N+1 queries
- Pagination on all list endpoints
- Load test passes

---

### Task 10: Per-User Rate Limiting

**Location**: `backend/src/middleware/rateLimit.ts`

**Requirements**:
- Replace IP-based with userID-based rate limiting
- Add subscription-tier limits (higher limits for paid users)
- Store rate limits in Redis or database
- Different limits for different endpoints

**Implementation Steps**:
1. Update rate limit middleware to use user ID
2. Add rate limit storage (Redis or DB)
3. Implement tier-based limits
4. Update rate limit configs per endpoint
5. Test rate limiting

**Success Criteria**:
- Rate limits work per user
- Tier-based limits enforced
- IP fallback for unauthenticated

---

### Task 11: Logging System Upgrade

**Requirements**:
- Implement structured logging (pino or winston)
- Log rotation
- Filter security-sensitive data
- Backend audit trail logs stored encrypted

**Implementation Steps**:
1. Install `pino` or `winston`
2. Replace console.log with structured logger
3. Add log rotation
4. Filter sensitive data (passwords, tokens)
5. Encrypt audit logs
6. Set up log aggregation (optional)

**Success Criteria**:
- Structured logs in JSON format
- No sensitive data in logs
- Log rotation working
- Audit logs encrypted

---

### Task 12: Monitoring & Alerts

**Requirements**:
- Configure Sentry alert rules:
  - High error rates
  - Slow API responses
  - Failed authentication attempts
- Set up UptimeRobot or similar
- Database slow query logs
- Stripe webhook alert rules

**Implementation Steps**:
1. Configure Sentry alerts in dashboard
2. Set up uptime monitoring service
3. Add slow query logging to database
4. Configure Stripe webhook monitoring
5. Test alert notifications

**Success Criteria**:
- Alerts configured and tested
- Monitoring dashboards set up
- Notifications working

---

## 🟢 LOW PRIORITY — IF TIME ALLOWS

### Task 13: Desktop Keychain Integration

**Requirements**:
- macOS: Keychain Services API
- Windows: Credential Manager API
- Linux: Secret Service API (libsecret)

**Implementation Steps**:
1. Add platform-specific keychain crates
2. Implement keychain storage for master password hash
3. Update unlock flow to use keychain
4. Test on all platforms

---

### Task 14: Auto-Lock Feature (Desktop)

**Requirements**:
- Idle detection
- Configurable timeout (settings)
- Trigger vault lock event

**Implementation Steps**:
1. Add idle detection (system events)
2. Add timeout setting to UI
3. Implement auto-lock trigger
4. Test idle detection

---

### Task 15: System Tray Enhancements

**Requirements**:
- Tray icon
- Quick unlock button
- Lock vault button

**Implementation Steps**:
1. Add system tray to Tauri config
2. Create tray menu
3. Add unlock/lock actions
4. Test tray functionality

---

### Task 16: Contact Form Backend

**Requirements**:
- Add `/api/contact` endpoint
- Email handler (Resend/SendGrid)
- Rate limiting
- Validation

**Implementation Steps**:
1. Create contact route
2. Add email service integration
3. Add validation
4. Test form submission

---

### Task 17: Documentation

**Requirements**:
- User guide
- Troubleshooting guide
- "How SafeNode Encryption Works" page
- "How Sync Works" page

**Implementation Steps**:
1. Create user guide markdown
2. Create troubleshooting guide
3. Create technical explanation pages
4. Add to documentation folder

---

### Task 18: Redis Caching Layer (Optional)

**Requirements**:
- Redis connection
- Cache device list, subscriptions
- Session caching

**Implementation Steps**:
1. Install Redis client
2. Add caching layer
3. Cache frequently accessed data
4. Test cache performance

---

### Task 19: Biometric ML Enhancements (Optional)

**Requirements**:
- Integrate TensorFlow.js
- Anti-spoofing detection
- Behavioral biometrics
- Risk score

**Implementation Steps**:
1. Install TensorFlow.js
2. Implement anti-spoofing
3. Add behavioral analysis
4. Calculate risk scores

---

## Output Format

After each task:
- Show summary of what was updated
- List affected files
- Confirm status (✅ Complete / ⚠️ Partial / ❌ Failed)

At the end:
- Print "✅ SafeNode is production-ready" if all critical and medium tasks are done
- List any remaining low-priority items

---

## BEGIN NOW

Start with Task 1: Fix Production Security Headers.

Work through each task sequentially. After completing each task, move to the next one automatically.

