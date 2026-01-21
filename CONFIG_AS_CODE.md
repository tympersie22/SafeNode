# Railway Config-as-Code Setup

## ✅ Why Config-as-Code is Better

Instead of manually configuring everything in the Railway dashboard, we're using **config-as-code** with `railway.toml` files. This provides:

- ✅ **Version Control**: All deployment settings are in git
- ✅ **Consistency**: Same settings across all environments
- ✅ **Automatic Root Directory**: Railway auto-detects the root when it finds `railway.toml` in a subdirectory
- ✅ **No Manual Dashboard Changes**: Everything is automated

## 📁 File Structure

```
SafeNode/
├── backend/
│   └── railway.toml    ← Backend service config (Railway auto-uses backend/ as root)
├── frontend/
│   └── railway.toml    ← Frontend service config (if deploying separately)
└── railway.json        ← Root config (optional, for project-level settings)
```

## 🔧 How It Works

1. **Backend Service:**
   - Railway scans your repo
   - Finds `backend/railway.toml`
   - **Automatically sets root directory to `backend/`** ✅
   - Uses settings from `backend/railway.toml`

2. **No Manual Root Directory Setting Needed!**
   - Railway automatically detects the root based on where `railway.toml` is located
   - If `railway.toml` is in `backend/`, Railway uses `backend/` as root

## 📝 Current Configuration

### Backend (`backend/railway.toml`)

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "node ./dist/index.new.js"
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## 🚀 Setup Steps

1. **Push the config file to GitHub** (already done)
2. **In Railway Dashboard:**
   - Go to your backend service
   - Railway should automatically detect `backend/railway.toml`
   - Root Directory should auto-set to `backend`
   - If not, manually set Root Directory to `backend` (one-time)

3. **Verify:**
   - Settings → Source → Root Directory should show `backend`
   - Settings → Build → Builder should show "Nixpacks" (from config)
   - Settings → Deploy → Start Command should show `node ./dist/index.new.js`

## 🎯 Benefits

- ✅ **No more manual root directory setting** - Railway auto-detects it
- ✅ **All settings in version control** - Easy to track changes
- ✅ **Consistent deployments** - Same config every time
- ✅ **Easy rollback** - Just revert the config file commit

## 📚 Railway Documentation

- [Config-as-Code Guide](https://docs.railway.app/deploy/config-as-code)
- [Railway Config Reference](https://docs.railway.app/reference/config-as-code)

---

**Note**: Environment variables still need to be set in Railway dashboard (they're sensitive and shouldn't be in code).
