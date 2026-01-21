# Railway Setup Instructions

## ⚠️ CRITICAL: Root Directory Configuration

Railway needs to know which directory to use for each service. **You MUST configure this in the Railway dashboard.**

### Backend Service Setup

1. **In Railway Dashboard:**
   - Go to your backend service
   - Click on **Settings** tab (or the **Source** section)
   - Find **"Root Directory"** field
   - **CURRENT VALUE**: `/.github` ❌ (WRONG!)
   - **CHANGE TO**: `backend` ✅
   - Click **Update** to save changes
   
   **IMPORTANT**: The Root Directory must be `backend`, NOT `/.github` or `/` or empty!

2. **Alternative: If Root Directory setting is not available:**
   - Delete the current service
   - Create a new service
   - When adding from GitHub, select the repository
   - **IMPORTANT**: In the service settings, set the root directory to `backend` before deploying

### Why This Matters

The error `npm error Missing script: "start"` occurs because Railway is reading the root `package.json` (which doesn't have a start script) instead of `backend/package.json` (which does).

---

## ✅ Quick Fix Checklist

- [ ] Backend service has Root Directory set to `backend`
- [ ] Frontend service has Root Directory set to `frontend` (if deploying separately)
- [ ] Environment variables are configured (see RAILWAY_DEPLOYMENT.md)
- [ ] PostgreSQL database is added and connected
- [ ] `DATABASE_URL` is automatically set by Railway

---

## 🔧 Manual Configuration (If Root Directory Setting Doesn't Work)

If Railway doesn't have a Root Directory setting, you can work around it by:

1. **Using railway.json** (already created in root)
2. **Or** create a monorepo structure with separate Railway projects

---

## 📝 Verification

After setting the root directory, Railway should:
- ✅ Find `backend/package.json`
- ✅ Run `npm ci` in the backend directory
- ✅ Run `npm run build` (which includes Prisma generation)
- ✅ Run `node ./dist/index.new.js` to start the server

---

**Last Updated**: $(date)
