# Complete Route & Page Mapping - Bidirectional Verification

## 📋 Route Inventory

### Routes Defined in AppRouter.tsx:
1. `/pricing` → `<PricingPage />`
2. `/security` → `<SecurityPage />` (marketing)
3. `/downloads` → `<DownloadsPage />`
4. `/contact` → `<ContactPage />`
5. `/docs/getting-started` → `<GettingStartedPage />`
6. `/docs/teams` → `<TeamsPage />`
7. `/docs/security` → `<DocsSecurityPage />`
8. `/docs/billing` → `<BillingPage />`
9. `/settings` → `<App />` (handles internally)
10. `/settings/*` → `<App />` (handles internally)
11. `/billing` → `<App />` (handles internally)
12. `/billing/*` → `<App />` (handles internally)
13. `/auth/sso/callback` → `<App />`
14. `/auth/sso/error` → `<App />`
15. `/*` → `<App />` (catch-all: Landing/Auth/Vault)

### Pages That Exist:
1. ✅ `pages/Landing.tsx` - Handled by App.tsx (`/`)
2. ✅ `pages/Auth.tsx` - Handled by App.tsx (internal state)
3. ✅ `pages/marketing/Pricing.tsx` - Route: `/pricing`
4. ✅ `pages/marketing/Security.tsx` - Route: `/security`
5. ✅ `pages/marketing/Downloads.tsx` - Route: `/downloads`
6. ✅ `pages/marketing/Contact.tsx` - Route: `/contact`
7. ✅ `pages/docs/GettingStarted.tsx` - Route: `/docs/getting-started`
8. ✅ `pages/docs/Teams.tsx` - Route: `/docs/teams`
9. ✅ `pages/docs/Security.tsx` - Route: `/docs/security`
10. ✅ `pages/docs/Billing.tsx` - Route: `/docs/billing`
11. ✅ `pages/settings/index.tsx` - Route: `/settings` (via App.tsx)
12. ✅ `pages/billing/Subscribe.tsx` - Route: `/billing` (via App.tsx)

## 🔄 Navigation Flow Analysis

### FROM Landing Page (`/`):
- ✅ To `/pricing` - Link exists
- ✅ To `/security` - Link exists
- ✅ To `/downloads` - Link exists
- ✅ To Auth (internal) - Button exists
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Pricing Page (`/pricing`):
- ✅ To `/` - "Back to Home" link exists
- ✅ To Auth - Button exists (`/#auth?mode=signup`)
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Security Page (`/security`):
- ✅ To `/` - "Back to Home" link exists
- ✅ To Auth - Button exists (`/#auth`)
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Downloads Page (`/downloads`):
- ✅ To `/` - "Back to Home" link exists
- ✅ To Auth - Button exists (`/#auth`)
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Contact Page (`/contact`):
- ✅ To `/` - "Back to Home" link exists
- ✅ To Auth - Button exists (`/#auth`)
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Docs Pages (`/docs/*`):
- ✅ To `/` - "Back to Home" link exists
- ✅ To `/contact` - Link exists (support)
- ✅ To `/docs/security` - Link exists (GettingStarted page)
- ❌ To `/settings` - NOT ACCESSIBLE (requires auth)
- ❌ To `/billing` - NOT ACCESSIBLE (requires auth)

### FROM Settings Page (`/settings`):
- ❌ To `/` - NO BACK LINK FOUND
- ❌ To Vault - NO NAVIGATION FOUND
- ✅ To `/billing` - Link exists (from BillingSettings tab)

### FROM Billing Page (`/billing`):
- ❌ To `/` - NO BACK LINK FOUND
- ❌ To Vault - NO NAVIGATION FOUND
- ❌ To `/settings` - NO LINK FOUND

### FROM Vault Page (internal):
- ❌ To `/settings` - NO LINK FOUND IN VAULT UI
- ❌ To `/billing` - NO LINK FOUND IN VAULT UI
- ✅ To `/` - Logo link exists (but goes to landing if logged out)

## 🚨 ISSUES FOUND:

### 1. Missing Navigation FROM Vault TO Settings/Billing
- **Problem**: Vault page has no way to navigate to settings or billing
- **Impact**: Users can't access settings/billing from vault
- **Fix Needed**: Add settings/billing links to vault header or menu

### 2. Missing Navigation FROM Settings/Billing BACK TO Vault
- **Problem**: Settings and billing pages have no way to go back to vault
- **Impact**: Users get stuck on settings/billing pages
- **Fix Needed**: Add "Back to Vault" or "Close" button

### 3. Settings Page Missing Back Navigation
- **Problem**: Settings page has no back button or home link
- **Impact**: Users can't navigate away from settings
- **Fix Needed**: Add back button or home link

### 4. Billing Page Missing Back Navigation
- **Problem**: Billing page has no back button or home link
- **Impact**: Users can't navigate away from billing
- **Fix Needed**: Add back button or home link

