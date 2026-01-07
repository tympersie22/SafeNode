# 🔧 SafeNode Troubleshooting Guide

Common issues and solutions for SafeNode users.

---

## 🔐 Authentication Issues

### Can't Log In

**Symptoms:**
- "Invalid credentials" error
- Login page doesn't respond
- Password field clears after submission

**Solutions:**

1. **Check Email & Password**
   - Verify email is correct
   - Check for typos
   - Try password reset

2. **Clear Browser Cache**
   - Clear cookies for safenode.app
   - Try incognito/private mode
   - Clear browser cache

3. **Check Account Status**
   - Verify email is verified
   - Check if account is locked
   - Contact support if account is locked

4. **Try Different Browser**
   - Test in Chrome, Firefox, Safari
   - Check browser extensions (disable ad blockers)

---

### Master Password Not Working

**Symptoms:**
- "Incorrect master password" error
- Vault won't unlock
- Password field seems to reset

**Solutions:**

1. **Verify Password**
   - Check CAPS LOCK
   - Verify password on another device
   - Try typing password in notepad first, then copy

2. **Check Keyboard Layout**
   - Verify keyboard language
   - Check for special character issues
   - Try different keyboard

3. **If Password Forgotten**
   - ⚠️ **Cannot recover** - Zero-knowledge encryption means we cannot reset it
   - Export vault backup (if you have it)
   - Create new account and start fresh
   - Use password recovery flow if available

---

## 🔄 Sync Issues

### Vault Not Syncing

**Symptoms:**
- Changes not appearing on other devices
- "Sync error" message
- Stuck on "Syncing..." status

**Solutions:**

1. **Check Internet Connection**
   - Verify WiFi/mobile data is working
   - Try different network
   - Check firewall/VPN settings

2. **Manual Sync**
   - Click **Sync** button
   - Or pull down to refresh (mobile)
   - Wait for sync to complete

3. **Check Sync Settings**
   - Settings → Sync → Verify auto-sync is enabled
   - Check sync frequency settings
   - Verify account is logged in

4. **Clear Sync Cache**
   - Settings → Advanced → Clear Cache
   - Restart app
   - Re-login if needed

---

### Sync Conflicts

**Symptoms:**
- "Conflict detected" warning
- Duplicate entries appearing
- Changes lost

**Solutions:**

1. **Resolve Conflicts**
   - Tap conflict warning
   - Review changes side-by-side
   - Choose: Keep Local / Keep Server / Merge / Keep Both

2. **Prevent Conflicts**
   - Sync before editing on multiple devices
   - Use one device for active editing
   - Enable real-time sync

3. **If Data Lost**
   - Check trash/recently deleted
   - Restore from backup
   - Check audit logs for deletion history

---

## 📱 Mobile App Issues

### App Crashes

**Symptoms:**
- App closes unexpectedly
- White screen on launch
- Freezes during use

**Solutions:**

1. **Update App**
   - Check App Store / Play Store for updates
   - Update to latest version
   - Restart device

2. **Clear App Data**
   - iOS: Settings → SafeNode → Reset
   - Android: Settings → Apps → SafeNode → Clear Data
   - Re-login after clearing

3. **Reinstall App**
   - Uninstall app
   - Restart device
   - Reinstall from store
   - Log in and restore vault

---

### Biometric Unlock Not Working

**Symptoms:**
- Face ID / Touch ID fails
- Biometric option missing
- "Biometrics unavailable" error

**Solutions:**

1. **Check Device Settings**
   - Verify biometrics enabled in device settings
   - Re-enroll biometrics if needed
   - Check for OS updates

2. **Re-enable in SafeNode**
   - Settings → Security → Disable Biometrics
   - Unlock with master password
   - Re-enable biometrics
   - Authenticate to verify

3. **Fallback to Password**
   - Use master password temporarily
   - Contact support if issue persists

---

## 💻 Desktop App Issues

### App Won't Start

**Symptoms:**
- App crashes on launch
- White screen
- Error message on startup

**Solutions:**

1. **Check System Requirements**
   - macOS 10.15+ / Windows 10+ / Linux (Ubuntu 20.04+)
   - Sufficient disk space
   - System updates installed

2. **Check Logs**
   - macOS: `~/Library/Logs/SafeNode/`
   - Windows: `%APPDATA%\SafeNode\logs\`
   - Linux: `~/.config/SafeNode/logs/`

3. **Reinstall**
   - Uninstall completely
   - Clear app data
   - Download fresh installer
   - Reinstall

---

### Sync Not Working (Desktop)

**Solutions:**

1. **Check Internet Connection**
   - Verify network connectivity
   - Check firewall settings
   - Try different network

2. **Check Sync Status**
   - View sync status in status bar
   - Click sync button manually
   - Check for error messages

3. **Re-login**
   - Log out completely
   - Clear local cache
   - Log back in
   - Unlock vault

---

## 🌐 Browser Extension Issues

### Auto-Fill Not Working

**Symptoms:**
- Passwords don't auto-fill
- Extension icon doesn't respond
- Login fields not detected

**Solutions:**

1. **Check Extension Status**
   - Verify extension is enabled
   - Check browser permissions
   - Re-enable if needed

2. **Check Site Compatibility**
   - Some sites block auto-fill
   - Try manual fill option
   - Check browser console for errors

3. **Reconnect Extension**
   - Log out of extension
   - Log back in
   - Unlock vault in extension
   - Try auto-fill again

---

### Extension Icon Missing

**Solutions:**

1. **Re-enable Extension**
   - Browser settings → Extensions
   - Enable SafeNode extension
   - Pin to toolbar if option available

2. **Check Browser Compatibility**
   - Verify browser version
   - Update browser if outdated
   - Try different browser

---

## 💳 Billing & Subscription Issues

### Payment Failed

**Symptoms:**
- "Payment failed" email
- Subscription cancelled unexpectedly
- Can't upgrade plan

**Solutions:**

1. **Check Payment Method**
   - Update credit card in Stripe portal
   - Verify card is not expired
   - Check card has sufficient funds

2. **Retry Payment**
   - Go to Settings → Billing
   - Click "Update Payment Method"
   - Enter new card details
   - Save and retry

3. **Contact Support**
   - Email billing@safenode.app
   - Include subscription ID
   - Describe issue

---

### Subscription Not Upgrading

**Solutions:**

1. **Wait for Sync**
   - Changes may take 1-2 minutes
   - Refresh page
   - Check subscription status

2. **Verify Webhook**
   - Check Stripe dashboard for webhook delivery
   - Retry webhook if needed
   - Contact support if persists

---

## 🔒 Security Issues

### Suspicious Activity

**Symptoms:**
- Unfamiliar login locations
- Unexpected password changes
- Unknown devices registered

**Solutions:**

1. **Immediate Actions**
   - Change master password immediately
   - Change account password
   - Enable 2FA if not enabled
   - Review audit logs

2. **Secure Account**
   - Log out all devices
   - Remove unknown devices
   - Review team memberships
   - Check shared vault access

3. **Report Issue**
   - Email security@safenode.app
   - Include details of suspicious activity
   - Provide audit log timestamps

---

### 2FA Not Working

**Solutions:**

1. **Check Authenticator App**
   - Verify app is synced
   - Check device time is correct
   - Try backup codes if available

2. **Re-enable 2FA**
   - Disable 2FA in settings
   - Re-enable with new QR code
   - Save new backup codes
   - Test login

---

## 🗄️ Data Issues

### Entries Missing

**Symptoms:**
- Entry disappeared
- Can't find saved password
- Search returns no results

**Solutions:**

1. **Check Filters**
   - Clear all filters
   - Check category/tag filters
   - Verify search terms

2. **Check Trash**
   - Go to Trash folder
   - Look for deleted entry
   - Restore if found

3. **Check Other Devices**
   - Sync all devices
   - Check if entry on another device
   - Export backup before changes

---

### Import/Export Issues

**Export Not Working:**

1. **Check Permissions**
   - Verify browser allows downloads
   - Check disk space
   - Try different browser

2. **Try Manual Export**
   - Go to Settings → Export
   - Enter master password
   - Save file manually

**Import Not Working:**

1. **Verify File Format**
   - Must be encrypted SafeNode backup
   - Check file is not corrupted
   - Verify file size is reasonable

2. **Check Master Password**
   - Must match original master password
   - Try on another device first
   - Contact support if file is corrupted

---

## 🌍 Network Issues

### Can't Connect to Server

**Symptoms:**
- "Connection failed" error
- API errors
- Timeout errors

**Solutions:**

1. **Check Internet**
   - Verify internet connection
   - Test other websites
   - Restart router

2. **Check Firewall/VPN**
   - Disable VPN temporarily
   - Check firewall settings
   - Whitelist safenode.app domains

3. **Check DNS**
   - Try different DNS (8.8.8.8, 1.1.1.1)
   - Flush DNS cache
   - Restart network adapter

---

## 📞 Getting Help

### When to Contact Support

**Contact support if:**
- Account is locked
- Data loss occurred
- Security breach suspected
- Payment/billing issues
- Technical issues persist after troubleshooting

### Contact Information

- **Email**: support@safenode.app
- **Security**: security@safenode.app
- **Billing**: billing@safenode.app
- **Enterprise**: enterprise@safenode.app

### Information to Include

When contacting support, include:
- **Description** of issue
- **Steps to reproduce**
- **Error messages** (screenshots)
- **Device/platform** information
- **Browser/OS version**
- **Account email** (if account-related)

---

## 🔍 Diagnostic Tools

### Health Check

**Check API Status:**
```bash
curl https://api.safenode.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Check Sync Status

1. Go to **Settings → Sync**
2. View sync status
3. Check last sync time
4. View pending operations

### View Logs

**Browser Console:**
- Press `F12` to open DevTools
- Check Console tab for errors
- Check Network tab for failed requests

**Desktop Logs:**
- Check log files in app data directory
- Enable verbose logging in settings
- Share logs with support if needed

---

## ✅ Common Fixes Checklist

Before contacting support, try:
- [ ] Restart app/device
- [ ] Clear cache/cookies
- [ ] Update to latest version
- [ ] Check internet connection
- [ ] Verify account credentials
- [ ] Check sync settings
- [ ] Review audit logs
- [ ] Try different browser/device

---

**Most issues can be resolved with these steps!** 🔧✅

