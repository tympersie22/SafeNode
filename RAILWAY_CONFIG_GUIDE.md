# Railway Configuration Guide

## Current Setup

We're using **config-as-code** with `railway.json` in the root directory. This file configures:
- Build command (runs in `backend/` directory)
- Start command (runs from `backend/` directory)
- Health check path
- Restart policy

## ⚠️ Important: Root Directory Still Needs Manual Setting

Even with config-as-code, you **still need to set the Root Directory** in Railway dashboard:

1. Go to Railway Dashboard → Your Backend Service
2. Click **Settings** tab
3. Scroll to **"Source"** section
4. Find **"Root Directory"** field
5. Set it to: `backend`
6. Click **Update**

## Why Both?

- **railway.json**: Controls build/start commands, restart policy, etc.
- **Root Directory**: Tells Railway where to find `package.json` and run commands

## What You Should See in Railway

### In Settings → Source:
- **Root Directory**: `backend` (you set this manually)
- **Branch**: `main`

### In Settings → Build:
- **Builder**: `Nixpacks` (from railway.json)
- **Build Command**: `cd backend && npm ci && npm run build` (from railway.json)

### In Settings → Deploy:
- **Start Command**: `cd backend && node ./dist/index.new.js` (from railway.json)
- **Healthcheck Path**: `/api/health` (from railway.json)
- **Restart Policy**: `On Failure` (from railway.json)

## If You Don't See Config-as-Code Option

Railway automatically reads `railway.json` from the root. You don't need to "enable" it - it just works!

If you want to use a different config file path:
1. Settings → Config-as-code
2. Add File Path: `railway.json` (or leave empty for auto-detect)

## Quick Checklist

- [ ] Root Directory set to `backend` in Railway dashboard
- [ ] `railway.json` is in your repo root (✅ already done)
- [ ] Environment variables configured (see `railway-backend-env-ready.txt`)
- [ ] PostgreSQL database added and connected

---

**The config file is already in your repo and pushed to GitHub. Railway will use it automatically!**
