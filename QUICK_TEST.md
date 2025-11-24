# 🚀 Quick Test Guide - All Features

## Step 1: Start Servers

Open 2 terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Backend runs on port 4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for both to show "ready" messages.

---

## Step 2: Open in Safari (for Touch ID)

**Important**: Use Safari on macOS for Touch ID support!

1. Open Safari
2. Go to: `http://localhost:5173`
3. Allow localhost if prompted

---

## Step 3: Test Core Features (5 minutes)

### ✅ Authentication
1. **Sign Up/Login**
   - Click "Sign Up" or "Login"
   - Email: `test@safenode.app`
   - Password: `demo-password`
   - Click "Login"

2. **Unlock Vault**
   - Enter master password: `demo-password`
   - Click "Unlock Vault"
   - ✅ Vault should open with demo entries

### ✅ Biometric Setup (Touch ID)
1. **Setup Biometric**
   - Click "👆 Biometric" button in header
   - Click "Set Up Biometric"
   - Follow Safari's Touch ID prompt
   - ✅ Biometric registered

2. **Test Biometric Unlock**
   - Lock vault (refresh page or logout)
   - Click "👆 Biometric" unlock button
   - Use Touch ID
   - ✅ Should unlock with ML analysis

### ✅ Password Management
1. **Create Entry**
   - Click "+ Add Entry"
   - Fill in:
     - Name: "Test Account"
     - Username: "test@example.com"
     - Password: Click "Generate" → Use generator
     - URL: "https://example.com"
   - Click "Save"
   - ✅ Entry appears in list

2. **Password Generator**
   - In entry form, click "Generate"
   - Adjust length: 20 characters
   - Enable all character types
   - Click "Generate Password"
   - ✅ Strong password generated

3. **Password Strength Meter**
   - Type password in entry form
   - ✅ Watch meter update in real-time

### ✅ Advanced Features
1. **Security Advisor**
   - Click "Security Advisor" in sidebar
   - ✅ View health summary and AI recommendations

2. **File Attachments**
   - Edit an entry
   - Scroll to "Attachments"
   - Drag & drop a file
   - ✅ File uploaded and listed

3. **Secure Notes (Markdown)**
   - Create new entry
   - Category: "Secure Note"
   - Click "Notes" tab
   - Type: `# My Note\n- Item 1\n**Bold**`
   - Click "Preview"
   - ✅ Markdown rendered

### ✅ Sharing
1. **Share Entry**
   - Click on an entry
   - Click "Share"
   - Role: "Viewer"
   - Expiration: "7 days"
   - Click "Generate Share Link"
   - Copy link
   - ✅ Share link created

2. **Import Shared**
   - Click "Import Shared" button
   - Paste share link
   - ✅ Entry preview shown

### ✅ Team Features
1. **Create Organization**
   - Click "👥 Teams" button
   - Click "Create Organization"
   - Name: "Test Org"
   - Plan: "Team"
   - ✅ Organization created

2. **Create Team Vault**
   - Select organization
   - Click "Create Team Vault"
   - Name: "Engineering Team"
   - ✅ Team vault created

### ✅ Audit Logs
1. **View Logs**
   - Click "📋 Audit" button
   - ✅ See all security events
   - Filter by event type
   - ✅ Logs filtered

### ✅ PIN Setup
1. **Set PIN**
   - Click "🔐 PIN" button
   - Enter PIN: `1234`
   - Confirm PIN
   - ✅ PIN enabled

2. **Unlock with PIN**
   - Lock vault
   - Select "Password + PIN" mode
   - Enter password + PIN
   - ✅ Unlocks successfully

---

## Step 4: Test ML Features

### ✅ ML-Enhanced Biometric
1. **Enable ML Analysis**
   - Unlock with biometrics
   - Open browser console (Cmd+Option+I)
   - Look for "ML Analysis" log
   - ✅ Should show:
     - Confidence score
     - Liveness score
     - Spoofing risk
     - Behavioral match

2. **Behavioral Biometrics**
   - Use app normally
   - ML service builds behavioral profile
   - Check localStorage: `safenode_behavioral_profiles`
   - ✅ Profile created

---

## Step 5: Test Sync & Backup

### ✅ Cloud Sync
1. **Auto Sync**
   - Make changes to entry
   - Check header for sync status
   - ✅ Changes sync automatically

2. **Backup**
   - Click "Backup" button
   - Click "Create Backup"
   - ✅ Backup created
   - Click "Download"
   - ✅ Backup file downloaded

---

## Step 6: Test Mobile (Optional)

```bash
cd mobile
npm start
```

1. Scan QR code with Expo Go app
2. Test biometric unlock (Face ID/Touch ID)
3. Test offline mode
4. ✅ Mobile features work

---

## 🎯 Quick Verification Checklist

- [ ] Login works
- [ ] Vault unlocks
- [ ] Touch ID setup works
- [ ] Touch ID unlock works
- [ ] ML analysis runs (check console)
- [ ] Create entry works
- [ ] Password generator works
- [ ] Security Advisor shows recommendations
- [ ] File attachments work
- [ ] Sharing works
- [ ] Team vaults work
- [ ] Audit logs work
- [ ] PIN setup works
- [ ] Sync works
- [ ] Backup works

---

## 🐛 Troubleshooting

**Touch ID not working?**
- Must use Safari on macOS
- Check System Preferences → Touch ID
- Try registering again

**Backend not responding?**
```bash
cd backend
npm run dev
```

**Frontend not loading?**
```bash
cd frontend
npm run dev
```

**ML features not showing?**
- Check browser console for errors
- Ensure biometric auth succeeded
- ML runs after successful biometric auth

---

## 📊 Expected Results

After testing, you should have:
- ✅ Registered Touch ID credential
- ✅ Created test entries
- ✅ Generated strong passwords
- ✅ Shared entries
- ✅ Created team organization
- ✅ ML behavioral profile
- ✅ Audit logs
- ✅ Backups

**All features tested!** 🎉

