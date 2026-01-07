# 🧪 SafeNode Comprehensive Testing Guide

This guide covers testing all features of SafeNode across web, desktop, and mobile platforms.

## 🚀 Quick Start

### 1. Start All Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Mobile (optional)
cd mobile
npm start
```

### 2. Access Points

- **Web App**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Mobile**: Expo Dev Tools (when running `npm start`)

---

## ✅ Feature Testing Checklist

### 🔐 Authentication & Security

#### 1. **User Registration & Login**
- [ ] Sign up with new account
- [ ] Login with credentials
- [ ] Logout functionality
- [ ] Session persistence

**Test Steps:**
1. Navigate to http://localhost:5173
2. Click "Sign Up"
3. Enter email and password
4. Submit and verify login
5. Refresh page - should stay logged in
6. Click logout - should return to landing page

#### 2. **Master Password & Vault Unlock**
- [ ] Unlock vault with master password
- [ ] Password visibility toggle
- [ ] Error handling for wrong password
- [ ] Offline unlock capability

**Test Steps:**
1. After login, enter master password (default: `demo-password`)
2. Click "Unlock Vault"
3. Verify vault opens with entries
4. Try wrong password - should show error
5. Toggle password visibility

#### 3. **PIN Setup & Multi-Factor Unlock**
- [ ] Set up PIN
- [ ] Unlock with PIN only
- [ ] Unlock with Password + PIN
- [ ] PIN lockout after failed attempts

**Test Steps:**
1. Click "🔐 PIN" button in header
2. Set a 4-8 digit PIN
3. Confirm PIN
4. Lock vault (or refresh)
5. Try unlocking with PIN only
6. Try unlocking with Password + PIN
7. Try wrong PIN 5 times - should lockout

#### 4. **Biometric Authentication (Touch ID / Face ID)**
- [ ] Check biometric availability
- [ ] Register biometric credential
- [ ] Unlock with biometrics
- [ ] ML-based security analysis

**Test Steps:**
1. Click "👆 Biometric" button in header
2. Click "Set Up Biometric"
3. Follow browser/system prompts (Touch ID on macOS Safari)
4. After setup, lock vault
5. Click biometric unlock button
6. Use Touch ID/Face ID to authenticate
7. Check browser console for ML analysis results

**Platform-Specific:**
- **macOS Safari**: Touch ID should work natively
- **Chrome/Edge**: Windows Hello or Touch ID (if available)
- **Desktop (Tauri)**: Platform-specific biometrics

---

### 📝 Vault Management

#### 5. **Create Password Entry**
- [ ] Add new entry
- [ ] Fill all fields (name, username, password, URL, notes)
- [ ] Save entry
- [ ] Entry appears in vault

**Test Steps:**
1. Click "+ Add Entry" button
2. Fill in:
   - Name: "Test Account"
   - Username: "test@example.com"
   - Password: "TestPassword123!"
   - URL: "https://example.com"
   - Notes: "Test entry"
3. Click "Save"
4. Verify entry appears in list

#### 6. **Edit Entry**
- [ ] Edit existing entry
- [ ] Update fields
- [ ] Save changes
- [ ] Changes persist

**Test Steps:**
1. Click on an entry
2. Click "Edit"
3. Change password or other fields
4. Save
5. Verify changes are saved

#### 7. **Delete Entry**
- [ ] Delete entry
- [ ] Confirm deletion
- [ ] Entry removed from vault

**Test Steps:**
1. Click on an entry
2. Click "Delete"
3. Confirm deletion
4. Verify entry is removed

#### 8. **Search & Filter**
- [ ] Search by name
- [ ] Search by username
- [ ] Filter by category
- [ ] Filter by tags

**Test Steps:**
1. Use search bar to find entries
2. Try searching by name
3. Try searching by username
4. Click category filter
5. Click tag filter

---

### 🔑 Advanced Password Features

#### 9. **Advanced Password Generator**
- [ ] Open password generator
- [ ] Adjust length slider
- [ ] Toggle character types (uppercase, lowercase, numbers, symbols)
- [ ] Set exclusion rules
- [ ] Generate password
- [ ] Copy to clipboard

**Test Steps:**
1. Click password field in entry form
2. Click "Generate" button
3. Adjust settings:
   - Length: 16-32 characters
   - Character types: All enabled
   - Exclusions: Similar/ambiguous characters
4. Click "Generate Password"
5. Verify password meets criteria
6. Click copy icon

#### 10. **Password Strength Meter**
- [ ] Real-time strength feedback
- [ ] Visual meter animation
- [ ] Strength recommendations

**Test Steps:**
1. Type password in entry form
2. Watch strength meter update in real-time
3. Try weak password (e.g., "12345")
4. Try strong password (e.g., "MyStr0ng!P@ssw0rd")
5. Verify meter reflects strength

#### 11. **TOTP / 2FA Codes**
- [ ] Add TOTP secret
- [ ] Generate TOTP code
- [ ] Copy code
- [ ] Auto-refresh every 30 seconds

**Test Steps:**
1. Edit an entry
2. Add TOTP secret (e.g., "JBSWY3DPEHPK3PXP")
3. Save entry
4. View entry - should show TOTP code
5. Wait 30 seconds - code should refresh
6. Click copy icon

---

### 🛡️ Security Features

#### 12. **Password Health Dashboard**
- [ ] View health summary
- [ ] See weak passwords
- [ ] See breached passwords
- [ ] See reused passwords
- [ ] Overall security score

**Test Steps:**
1. Click "Security Advisor" in sidebar
2. View health summary:
   - Total entries
   - Weak passwords count
   - Breached passwords count
   - Reused passwords count
   - Overall score
3. Review recommendations

#### 13. **Breach Monitoring (HIBP)**
- [ ] Scan for breaches
- [ ] View breach count per entry
- [ ] Breach alerts
- [ ] Watchtower dashboard

**Test Steps:**
1. Click "Watchtower" button (if available)
2. Click "Scan for Breaches"
3. Wait for scan to complete
4. View entries with breach counts
5. Check Watchtower alerts

#### 14. **AI Security Advisor**
- [ ] View AI recommendations
- [ ] Priority-based suggestions
- [ ] Actionable advice
- [ ] ML-powered insights

**Test Steps:**
1. Open Security Advisor
2. Scroll to "Intelligent Recommendations"
3. Review AI-generated suggestions
4. Check priority levels (high/medium/low)
5. Verify recommendations are relevant

#### 15. **AI Vault Organizer**
- [ ] Auto-categorize entries
- [ ] Auto-tag suggestions
- [ ] Confidence scores

**Test Steps:**
1. Create new entry with name "GitHub Account"
2. Add URL: "https://github.com"
3. Save entry
4. Verify auto-categorization (should suggest "Development")
5. Check auto-tags

---

### 📎 File & Notes

#### 16. **File Attachments**
- [ ] Upload file attachment
- [ ] View attachment list
- [ ] Download attachment
- [ ] Delete attachment
- [ ] Drag & drop upload

**Test Steps:**
1. Edit an entry
2. Scroll to "Attachments" section
3. Drag & drop a file OR click "Choose File"
4. Select a file (PDF, image, document)
5. Verify file appears in list
6. Click download icon
7. Click delete icon

#### 17. **Secure Notes (Markdown)**
- [ ] Create note entry
- [ ] Edit in Markdown
- [ ] Preview rendered Markdown
- [ ] Toggle edit/preview mode
- [ ] Rich text formatting

**Test Steps:**
1. Create new entry
2. Select category: "Secure Note"
3. Click "Notes" tab
4. Type Markdown:
   ```markdown
   # My Secure Note
   - Item 1
   - Item 2
   **Bold text**
   ```
5. Click "Preview" to see rendered
6. Click "Edit" to modify
7. Save entry

---

### 🔄 Sync & Backup

#### 18. **Auto Cloud Sync**
- [ ] Sync on unlock
- [ ] Sync status indicator
- [ ] Offline mode
- [ ] Conflict resolution

**Test Steps:**
1. Unlock vault - should show "Syncing..."
2. Check sync status in header
3. Make changes to entry
4. Changes should sync automatically
5. Disconnect internet
6. Make changes - should work offline
7. Reconnect - should sync when online

#### 19. **Backup & Restore**
- [ ] Create backup
- [ ] List backups
- [ ] Download backup
- [ ] Restore from backup
- [ ] Delete backup

**Test Steps:**
1. Click "Backup" button in header
2. Click "Create Backup"
3. Verify backup appears in list
4. Click "Download" to save backup file
5. Make changes to vault
6. Click "Restore" on backup
7. Verify vault restored to previous state

---

### 👥 Sharing & Collaboration

#### 20. **Share Entry**
- [ ] Generate sharing key
- [ ] Share entry with role (Viewer/Editor)
- [ ] Set expiration (24h, 7d, 30d, never)
- [ ] Copy share link

**Test Steps:**
1. Click on an entry
2. Click "Share" button
3. Select role: "Viewer" or "Editor"
4. Set expiration: "7 days"
5. Click "Generate Share Link"
6. Copy link
7. Test link in incognito/another browser

#### 21. **Import Shared Entry**
- [ ] Paste share link
- [ ] View shared entry details
- [ ] Import to vault
- [ ] Verify role permissions

**Test Steps:**
1. Click "Import Shared" button
2. Paste share link from step 20
3. View entry preview
4. Check role and expiration
5. Click "Import to Vault"
6. Verify entry appears in vault

#### 22. **Team Vaults & Organizations**
- [ ] Create organization
- [ ] Create team vault
- [ ] Invite members
- [ ] Assign roles (Owner/Admin/Member/Viewer)
- [ ] Manage members

**Test Steps:**
1. Click "👥 Teams" button
2. Click "Create Organization"
3. Fill in:
   - Name: "Test Org"
   - Domain: "test.com"
   - Plan: "Team"
4. Create team vault
5. Click "Invite Member"
6. Enter email and select role
7. Verify member appears in list
8. Change member role
9. Remove member

---

### 🔍 Audit & Monitoring

#### 23. **Audit Logs**
- [ ] View audit logs
- [ ] Filter by event type
- [ ] Filter by date range
- [ ] Export logs
- [ ] View log details

**Test Steps:**
1. Click "📋 Audit" button
2. View list of security events:
   - Vault unlocks
   - Entry modifications
   - Failed login attempts
   - Biometric authentications
3. Filter by event type
4. Filter by date
5. Click on log entry to view details
6. Click "Export" to download logs

#### 24. **Multi-Account Support**
- [ ] Create multiple accounts
- [ ] Switch between accounts
- [ ] Separate vaults per account

**Test Steps:**
1. Click account switcher in header
2. Click "Create Account"
3. Enter account name: "Work Account"
4. Select account type
5. Switch between accounts
6. Verify vaults are separate

---

### 🎨 UI & Experience

#### 25. **Dark Mode**
- [ ] Toggle dark mode
- [ ] Theme persists
- [ ] System preference detection

**Test Steps:**
1. Click dark mode toggle (if available)
2. Verify theme changes
3. Refresh page - theme should persist
4. Check system preference detection

#### 26. **Travel Mode**
- [ ] Enable travel mode
- [ ] Vault entries hidden
- [ ] Disable travel mode
- [ ] Entries restored

**Test Steps:**
1. Enable travel mode (if available)
2. Verify vault entries are hidden
3. Disable travel mode
4. Verify entries are visible again

---

### 📱 Mobile App (React Native)

#### 27. **Mobile Onboarding**
- [ ] First-time setup
- [ ] Create master password
- [ ] Enable biometrics

**Test Steps:**
1. Open mobile app
2. Complete onboarding flow
3. Set master password
4. Enable Face ID/Touch ID

#### 28. **Mobile Vault**
- [ ] View entries
- [ ] Create entry
- [ ] Edit entry
- [ ] Search entries

**Test Steps:**
1. Unlock vault with biometrics
2. View entry list
3. Create new entry
4. Edit existing entry
5. Use search functionality

#### 29. **Mobile Sync**
- [ ] Offline mode
- [ ] Sync queue
- [ ] Online sync

**Test Steps:**
1. Disable internet
2. Make changes - should queue
3. Enable internet
4. Verify changes sync

---

### 🌐 Browser Extension

#### 30. **Extension Installation**
- [ ] Load extension
- [ ] Extension icon appears
- [ ] Popup opens

**Test Steps:**
1. Open Chrome/Edge
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `extension` folder
6. Verify extension icon appears

#### 31. **Autofill**
- [ ] Detect login forms
- [ ] Show autofill suggestions
- [ ] Fill credentials
- [ ] Save new credentials

**Test Steps:**
1. Navigate to a login page
2. Click on password field
3. Extension should detect form
4. Click "Fill" button
5. Verify credentials filled
6. Submit form with new credentials
7. Verify "Save to SafeNode" prompt appears

---

## 🐛 Common Issues & Solutions

### Issue: Biometric not working
**Solution:**
- Ensure you're using Safari on macOS (for Touch ID)
- Check system settings - biometrics must be enabled
- Try registering biometric credential again

### Issue: Sync not working
**Solution:**
- Check backend is running on port 3000
- Check browser console for errors
- Verify network connectivity

### Issue: ML features not showing
**Solution:**
- Check browser console for ML service errors
- Ensure biometric authentication succeeded
- ML features require successful biometric auth

### Issue: Mobile app not connecting
**Solution:**
- Ensure backend is accessible from mobile device
- Check network configuration
- Verify API endpoints are correct

---

## 📊 Test Results Template

```
Date: ___________
Tester: ___________
Platform: [ ] Web [ ] Desktop [ ] Mobile
Browser: ___________

Feature Tested: ___________
Status: [ ] Pass [ ] Fail [ ] Partial
Notes: ___________

Issues Found:
1. ___________
2. ___________
```

---

## 🎯 Priority Testing Order

1. **Critical Path**: Login → Unlock → Create Entry → Save
2. **Security**: Biometric → PIN → Audit Logs
3. **Advanced**: ML Features → Sharing → Team Vaults
4. **Polish**: Dark Mode → Travel Mode → Mobile

---

## 📝 Notes

- Default master password: `demo-password`
- Backend runs on: `http://localhost:3000`
- Frontend runs on: `http://localhost:5173`
- All test data is stored locally (IndexedDB)
- Backend uses in-memory storage (resets on restart)

Happy Testing! 🚀

