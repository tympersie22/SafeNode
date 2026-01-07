# 💻 Using SafeNode Desktop

Complete guide to using SafeNode on macOS, Windows, and Linux.

---

## 🚀 Installation

### macOS

1. **Download** from [SafeNode Downloads](https://safenode.app/downloads)
2. **Open** the `.dmg` file
3. **Drag** SafeNode to Applications folder
4. **Open** from Applications
5. **Allow** in System Preferences → Security & Privacy if prompted

### Windows

1. **Download** from [SafeNode Downloads](https://safenode.app/downloads)
2. **Run** the `.exe` installer
3. **Follow** the installation wizard
4. **Launch** from Start Menu or desktop shortcut

### Linux

1. **Download** `.AppImage` from [SafeNode Downloads](https://safenode.app/downloads)
2. **Make executable**:
   ```bash
   chmod +x SafeNode-linux-x86_64.AppImage
   ```
3. **Run**:
   ```bash
   ./SafeNode-linux-x86_64.AppImage
   ```

---

## 🔓 First Launch

### Setup Wizard

1. **Welcome Screen** → Click "Get Started"
2. **Login** with your SafeNode account or create new account
3. **Master Password** → Enter your master password
4. **Biometric Setup** (optional) → Enable Face ID / Touch ID / Windows Hello
5. **Done!** → Your vault unlocks

---

## 🎯 Main Features

### Vault View

**Left Sidebar:**
- **All Items** - View all entries
- **Favorites** - Starred entries
- **Categories** - Filter by type
- **Tags** - Filter by tags
- **Trash** - Deleted items (30 day retention)

**Main Panel:**
- **Search Bar** - Find entries quickly
- **Entry List** - All your passwords
- **Entry Details** - View/edit selected entry

### Adding Entries

**Method 1: Quick Add**
1. Click **➕ Add** button (top right)
2. Fill in entry details
3. Click **Save**

**Method 2: Keyboard Shortcut**
- Press `Cmd+N` (macOS) or `Ctrl+N` (Windows/Linux)
- Fill in and save

**Method 3: Right-Click Menu**
1. Right-click in entry list
2. Select **New Entry**
3. Fill in and save

---

## ⌨️ Keyboard Shortcuts

### Navigation
- `Cmd/Ctrl + K` - Quick search
- `Cmd/Ctrl + N` - New entry
- `Cmd/Ctrl + E` - Edit entry
- `Cmd/Ctrl + D` - Delete entry
- `Cmd/Ctrl + F` - Search
- `Esc` - Close dialog/cancel

### Entry Actions
- `Enter` - Open entry
- `Cmd/Ctrl + C` - Copy password
- `Cmd/Ctrl + B` - Copy username
- `Cmd/Ctrl + U` - Copy URL
- `Space` - Toggle password visibility

### Vault
- `Cmd/Ctrl + L` - Lock vault
- `Cmd/Ctrl + ,` - Open Settings
- `Cmd/Ctrl + W` - Close window
- `Cmd/Ctrl + Q` - Quit app

---

## 🔐 Security Features

### Biometric Unlock

**macOS:**
- **Touch ID**: Enable in Settings → Security
- **Face ID**: Works automatically on Macs with Face ID
- **Unlock**: Click lock icon → Authenticate with biometrics

**Windows:**
- **Windows Hello**: Enable in Settings → Security
- **Unlock**: Click lock icon → Authenticate with Windows Hello

**Linux:**
- **Fingerprint**: Requires fprintd setup
- **Unlock**: Click lock icon → Scan fingerprint

### Auto-Lock

**Settings:**
1. Go to **Settings → Security**
2. Set **Auto-Lock Timer**:
   - Immediately (on minimize/close)
   - 1 minute of inactivity
   - 5 minutes of inactivity
   - 15 minutes of inactivity
   - Never (not recommended)

**Manual Lock:**
- Click **🔒 Lock** button (top right)
- Or press `Cmd/Ctrl + L`
- Or minimize window (if set)

---

## 🔄 Syncing

### Automatic Sync

SafeNode syncs automatically:
- ✅ New entries
- ✅ Edits
- ✅ Deletions
- ✅ Changes from other devices

### Sync Status

**Indicator in Status Bar:**
- **🟢 Synced** - Up to date
- **🟡 Syncing...** - Changes uploading
- **🔴 Offline** - Working offline
- **⚠️ Conflict** - Tap to resolve

### Manual Sync

1. Click **Sync** button (top right)
2. Or press `Cmd/Ctrl + R`
3. Wait for sync to complete

### Conflict Resolution

If conflicts detected:
1. **Click conflict warning** in status bar
2. **Review changes** side-by-side
3. **Choose resolution**:
   - Keep Local
   - Keep Server
   - Merge Both
   - Keep Both
4. **Click Resolve**

---

## 📋 Password Generator

### Access Generator

1. Click **🔑 Generate Password** button
2. Or press `Cmd/Ctrl + G`
3. Or when adding/editing entry, click generate icon

### Generator Options

- **Length**: 8-128 characters (slider)
- **Uppercase** (A-Z)
- **Lowercase** (a-z)
- **Numbers** (0-9)
- **Symbols** (!@#$%^&*)
- **Exclude Ambiguous** (0, O, I, l, 1)

### Usage

1. Set preferences
2. Click **Generate**
3. Click **Copy** or **Use** button
4. Password auto-fills in entry

---

## 🔍 Search & Filter

### Quick Search

**Method 1: Search Bar**
1. Click search bar (top)
2. Type search term
3. Results filter instantly

**Method 2: Keyboard**
- Press `Cmd/Ctrl + K`
- Type search term
- Press `Enter` to open first result

### Advanced Filters

**Filter by Category:**
1. Click **Categories** in sidebar
2. Select category
3. View filtered results

**Filter by Tags:**
1. Click entry → View tags
2. Click tag to filter
3. View all entries with tag

**Filter by Custom Fields:**
1. Click **Filters** button
2. Set criteria:
   - Has password
   - Has username
   - Has URL
   - Is favorite
   - Is shared
3. Apply filter

---

## 🌐 Browser Integration

### Auto-Fill

**Setup:**
1. Install browser extension (Chrome, Firefox, Safari, Edge)
2. Log in to extension
3. Enable auto-fill in extension settings

**Usage:**
1. Visit website login page
2. Extension detects login fields
3. Click SafeNode icon → Select entry
4. Auto-fills username/password

### Manual Fill

1. Click SafeNode extension icon
2. Search for entry
3. Click entry
4. Click **Fill** button

---

## 📊 Password Health

### View Health Dashboard

1. Click **Dashboard** in sidebar
2. View:
   - **Weak Passwords** - Need strengthening
   - **Reused Passwords** - Used in multiple places
   - **Breached Passwords** - Found in data breaches
   - **Old Passwords** - Not changed in 1+ years

### Fix Issues

**Weak Password:**
1. Click entry
2. Click **Generate New Password**
3. Save entry

**Reused Password:**
1. View reused password warning
2. Generate unique password for each account
3. Update all entries

**Breached Password:**
1. View breach alert
2. Click **Generate New Password**
3. Update password on website
4. Save updated entry

---

## ⚙️ Settings

### Account Settings

- **Email** - Change email address
- **Password** - Change account password
- **Subscription** - Manage plan
- **Devices** - View/manage registered devices

### Security Settings

- **Biometrics** - Enable/disable
- **Auto-Lock** - Set timer
- **Master Password** - Change master password
- **2FA** - Enable two-factor authentication

### Appearance

- **Theme** - Light / Dark / System
- **Font Size** - Adjust text size
- **Compact Mode** - Dense list view
- **Animations** - Enable/disable

### Sync Settings

- **Auto-Sync** - Toggle automatic sync
- **Sync Frequency** - Real-time / Every 5 min / Manual
- **Conflict Resolution** - Default strategy

### Advanced

- **Export Vault** - Download encrypted backup
- **Import Vault** - Restore from backup
- **Clear Cache** - Clear local cache
- **Reset App** - Reset all settings

---

## 🛠️ System Integration

### macOS Keychain (Future)

- Store master password hash in Keychain
- Auto-unlock with Touch ID/Face ID
- Secure credential storage

### Windows Credential Manager (Future)

- Store credentials securely
- Windows Hello integration
- Enterprise SSO support

### Linux Secret Service (Future)

- Integration with libsecret
- GNOME Keyring support
- KWallet support

---

## 🆘 Troubleshooting

### App Won't Start

**Try:**
1. Check system requirements
2. Update to latest version
3. Check system logs for errors
4. Reinstall app

### Sync Not Working

**Check:**
1. Internet connection
2. Sync enabled in Settings
3. Check for conflicts
4. Try manual sync (Cmd/Ctrl + R)

### Biometric Unlock Not Working

**Try:**
1. Check system biometric settings
2. Re-enable in SafeNode Settings
3. Use master password as fallback
4. Update system OS

### Performance Issues

**Try:**
1. Close other apps
2. Clear cache (Settings → Advanced)
3. Restart app
4. Check system resources

---

## 📞 Support

- **Email**: desktop-support@safenode.app
- **Documentation**: https://docs.safenode.app
- **Community**: Discord server

---

**Secure password management on desktop!** 🔐💻

