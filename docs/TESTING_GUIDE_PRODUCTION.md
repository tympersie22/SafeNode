# 🧪 SafeNode Production Testing Guide

**Complete guide for testing critical user flows before launch**

## 🚀 Quick Start Testing

### 1. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# ✅ Backend running on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# ✅ Frontend running on http://localhost:5173
```

### 2. Open Application
- Navigate to: http://localhost:5173
- Open browser DevTools (F12) to monitor console and network

---

## ✅ Critical User Flows to Test

### Flow 1: User Registration & First Login

**Steps:**
1. Click "Sign Up" or "Get Started"
2. Enter email and password
3. Submit registration form
4. **Expected**: Success message, redirected to login or dashboard
5. Log in with credentials
6. **Expected**: Successfully logged in, see dashboard

**What to Check:**
- ✅ No console errors
- ✅ API calls succeed (check Network tab)
- ✅ JWT token stored (check localStorage)
- ✅ User redirected correctly
- ✅ Backend logs show successful registration

**API Endpoints Tested:**
- `POST /api/auth/register`
- `POST /api/auth/login`

---

### Flow 2: Vault Operations (CRUD)

**Prerequisites:** User must be logged in

**Steps:**

1. **Create Vault Entry**
   - Click "Add Entry" or "+"
   - Fill in: Title, Username, Password, URL (optional)
   - Save
   - **Expected**: Entry appears in vault list

2. **Read Vault Entry**
   - Click on an entry
   - **Expected**: Entry details displayed correctly

3. **Update Vault Entry**
   - Click edit on an entry
   - Modify fields
   - Save
   - **Expected**: Changes reflected immediately

4. **Delete Vault Entry**
   - Click delete on an entry
   - Confirm deletion
   - **Expected**: Entry removed from list

**What to Check:**
- ✅ All CRUD operations work
- ✅ Data persists (refresh page, entries still there)
- ✅ Encryption working (check network requests - data should be encrypted)
- ✅ No console errors
- ✅ Backend logs show successful operations

**API Endpoints Tested:**
- `GET /api/vault`
- `POST /api/vault`
- `POST /api/vault/entry`
- `PUT /api/vault/entry/:id`
- `DELETE /api/vault/entry/:id`

---

### Flow 3: Authentication & Session Management

**Steps:**

1. **Login**
   - Enter credentials
   - Submit
   - **Expected**: JWT token received and stored

2. **Session Persistence**
   - Refresh page
   - **Expected**: Still logged in (token valid)

3. **Logout**
   - Click logout
   - **Expected**: Token cleared, redirected to login

4. **Protected Routes**
   - Try accessing `/dashboard` while logged out
   - **Expected**: Redirected to login

**What to Check:**
- ✅ JWT token stored in localStorage
- ✅ Token sent with API requests (check Authorization header)
- ✅ Session persists across page refreshes
- ✅ Logout clears token
- ✅ Protected routes require authentication

**API Endpoints Tested:**
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

---

### Flow 4: Billing & Subscription (Test Mode)

**Prerequisites:**
- User logged in
- Stripe test keys configured

**Steps:**

1. **View Pricing Page**
   - Navigate to pricing page
   - **Expected**: Plans displayed correctly

2. **Create Checkout Session**
   - Click "Subscribe" on a plan
   - **Expected**: Redirected to Stripe Checkout (test mode)

3. **Complete Checkout (Test Card)**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Complete checkout
   - **Expected**: Redirected back to success page

4. **Verify Subscription**
   - Check user profile/subscription page
   - **Expected**: Subscription status shows "active"

**What to Check:**
- ✅ Checkout session created successfully
- ✅ Stripe redirects work
- ✅ Webhook received (check backend logs)
- ✅ User subscription updated in database
- ✅ Subscription limits enforced

**API Endpoints Tested:**
- `POST /api/billing/create-checkout-session`
- `POST /api/billing/webhook` (Stripe calls this)
- `GET /api/billing/subscription`

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

### Flow 5: Two-Factor Authentication (2FA)

**Steps:**

1. **Enable 2FA**
   - Go to security settings
   - Click "Enable 2FA"
   - Scan QR code with authenticator app
   - Enter verification code
   - **Expected**: 2FA enabled, backup codes shown

2. **Login with 2FA**
   - Logout
   - Login with email/password
   - **Expected**: Prompted for 2FA code
   - Enter code from authenticator app
   - **Expected**: Successfully logged in

3. **Backup Codes**
   - Try login with backup code
   - **Expected**: Works as alternative to 2FA code

**What to Check:**
- ✅ QR code generated correctly
- ✅ TOTP codes work
- ✅ Backup codes work
- ✅ 2FA required on login

**API Endpoints Tested:**
- `POST /api/auth/2fa/enable`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/login` (with 2FA)

---

### Flow 6: Device Management

**Steps:**

1. **View Devices**
   - Go to devices/settings page
   - **Expected**: Current device listed

2. **Register New Device**
   - Login from different browser/device
   - **Expected**: New device registered

3. **Remove Device**
   - Click remove on a device
   - **Expected**: Device removed from list

**What to Check:**
- ✅ Devices tracked correctly
- ✅ Device limits enforced (if subscription has limits)
- ✅ Device removal works

**API Endpoints Tested:**
- `GET /api/devices`
- `POST /api/devices/register`
- `DELETE /api/devices/:id`

---

### Flow 7: Team Features (If Applicable)

**Steps:**

1. **Create Team**
   - Go to teams page
   - Click "Create Team"
   - Fill in team details
   - **Expected**: Team created

2. **Invite Members**
   - Invite user by email
   - **Expected**: Invitation sent

3. **Team Vault**
   - Create shared vault entry
   - **Expected**: Entry visible to all team members

**What to Check:**
- ✅ Team creation works
- ✅ Invitations work
- ✅ Team vaults work
- ✅ Permissions enforced

**API Endpoints Tested:**
- `POST /api/teams`
- `GET /api/teams`
- `POST /api/teams/:id/members`
- `POST /api/team-vaults`

---

## 🔍 Testing Checklist

### Pre-Launch Testing

- [ ] User registration works
- [ ] Login/logout works
- [ ] Vault CRUD operations work
- [ ] Data persists after refresh
- [ ] Encryption working (data encrypted in transit/storage)
- [ ] 2FA works (if enabled)
- [ ] Billing flow works (test mode)
- [ ] Device management works
- [ ] Team features work (if applicable)
- [ ] No console errors
- [ ] No network errors
- [ ] Mobile responsive (test on different screen sizes)
- [ ] Dark mode works (if applicable)

### Production Testing (After Deployment)

- [ ] Health check endpoints respond
- [ ] API endpoints accessible
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Vault operations work
- [ ] Billing flow works (use test cards first)
- [ ] Stripe webhooks received
- [ ] Database migrations applied
- [ ] Environment variables set correctly
- [ ] CORS configured correctly
- [ ] Security headers present
- [ ] Rate limiting working

---

## 🐛 Common Issues & Fixes

### Issue: API calls fail with CORS error
**Fix**: Check `CORS_ORIGIN` in backend `.env` includes frontend URL

### Issue: Authentication doesn't persist
**Fix**: Check JWT token stored in localStorage, verify token sent in requests

### Issue: Vault data not saving
**Fix**: Check encryption keys, verify database connection

### Issue: Stripe checkout doesn't redirect
**Fix**: Verify `successUrl` and `cancelUrl` are correct, check Stripe keys

### Issue: 2FA codes not working
**Fix**: Check time sync on device, verify TOTP secret stored correctly

---

## 📊 Test Results Template

```
Date: __________
Tester: __________
Environment: [ ] Local [ ] Staging [ ] Production

Flow 1: Registration & Login
- [ ] Pass [ ] Fail - Notes: __________

Flow 2: Vault Operations
- [ ] Pass [ ] Fail - Notes: __________

Flow 3: Authentication
- [ ] Pass [ ] Fail - Notes: __________

Flow 4: Billing
- [ ] Pass [ ] Fail - Notes: __________

Flow 5: 2FA
- [ ] Pass [ ] Fail - Notes: __________

Flow 6: Device Management
- [ ] Pass [ ] Fail - Notes: __________

Flow 7: Teams
- [ ] Pass [ ] Fail - Notes: __________

Overall: [ ] Ready for Launch [ ] Needs Fixes
```

---

## 🎯 Success Criteria

Before launching, all critical flows should:
- ✅ Complete without errors
- ✅ Persist data correctly
- ✅ Handle errors gracefully
- ✅ Show appropriate user feedback
- ✅ Work on mobile and desktop
- ✅ Perform within acceptable time (< 2s for API calls)

---

**Ready to test?** Start with Flow 1 and work through each flow systematically.

