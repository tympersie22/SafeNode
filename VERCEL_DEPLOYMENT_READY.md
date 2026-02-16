# 🚀 Vercel Deployment Guide - SafeNode

## ✅ Testing Complete
- ✅ Backend API tested and working (login, registration)
- ✅ Frontend configured and ready
- ✅ Database schema deployed to PostgreSQL
- ✅ Demo account working

---

## 📋 Deployment Steps

### **Step 1: Deploy Backend to Vercel**

1. **Go to:** https://vercel.com/new
2. **Import Repository:** `tympersie22/SafeNode`
3. **Configure Project:**
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Add Environment Variables:**
   Copy these to Vercel → Settings → Environment Variables:

```bash
NODE_ENV=production
PORT=4000

# Database - Supabase (Note: Direct connection may not work from Vercel)
# Option 1: Use connection pooling for Vercel
DB_ADAPTER=prisma
DATABASE_URL=postgresql://postgres.qsuvgagyfwwlputsnlkk:nyxxeg-zipkuc-Nenzy3@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Security
JWT_SECRET=63BMkA181gwN/06WWQCtveTNGkSoY9LU8D2lX7pnYLg=
ENCRYPTION_KEY=iJAB7FzwwHbAjM/+4bO8NwOiLpcLhjXhkB/OkJrSd74=
CORS_ORIGIN=https://safe-node-frontend.vercel.app,https://safe-node-99hv.vercel.app

# Database Seeding
SEED_ON_BOOT=true

# API Configuration
API_URL=https://safe-node-99hv-backend.vercel.app
HIBP_API_URL=https://api.pwnedpasswords.com
HIBP_USER_AGENT=SafeNode/0.1.0

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. **Deploy!**

---

### **Step 2: Fix Supabase Connection**

⚠️ **Important:** The Supabase database was unreachable during setup. You need to:

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard/project/qsuvgagyfwwlputsnlkk
2. **Check project status** - Ensure it's "Active" (not paused or provisioning)
3. **Verify connection string:**
   - Settings → Database → Connection string
   - Use **Connection pooling** → **Transaction mode**
   - Should be: `postgresql://postgres.qsuvgagyfwwlputsnlkk:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

4. **Run Prisma migration on Supabase:**
   ```bash
   cd ~/SafeNode/backend
   # Update .env with Supabase pooler URL
   DATABASE_URL="postgresql://postgres.qsuvgagyfwwlputsnlkk:nyxxeg-zipkuc-Nenzy3@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   npx prisma db push
   ```

**Alternative:** Use **Neon.tech** or **Railway** for PostgreSQL if Supabase continues to have issues.

---

### **Step 3: Deploy Frontend to Vercel**

1. **Go to:** https://vercel.com/new
2. **Import Same Repository:** `tympersie22/SafeNode`
3. **Configure Project:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Add Environment Variables:**

```bash
VITE_API_URL=https://safe-node-99hv-backend.vercel.app
VITE_APP_NAME=SafeNode
VITE_APP_VERSION=0.1.0
VITE_APP_DESCRIPTION=Your Zero-Knowledge, Beautifully Designed Password Vault
VITE_APP_AUTHOR=SafeNode Team
VITE_APP_REPOSITORY=https://github.com/tympersie22/safenode

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_CRASH_REPORTING=false
VITE_ENABLE_PERFORMANCE_MONITORING=false
```

5. **Deploy!**

---

### **Step 4: Update CORS in Backend**

After deploying frontend, update backend environment variable:

```bash
CORS_ORIGIN=https://your-frontend-url.vercel.app,https://safe-node-frontend-*.vercel.app
```

---

## 🧪 Test Production Deployment

1. **Test backend health:**
   ```bash
   curl https://safe-node-99hv-backend.vercel.app/api/health
   ```

2. **Test demo login:**
   ```bash
   curl -X POST https://safe-node-99hv-backend.vercel.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@safenode.app","password":"demo-password"}'
   ```

3. **Open frontend** and test login/registration

---

## 🔑 Generated Secrets (Save These!)

**JWT_SECRET:** `63BMkA181gwN/06WWQCtveTNGkSoY9LU8D2lX7pnYLg=`
**ENCRYPTION_KEY:** `iJAB7FzwwHbAjM/+4bO8NwOiLpcLhjXhkB/OkJrSd74=`
**Supabase Password:** `nyxxeg-zipkuc-Nenzy3`

**Demo Account:**
- Email: `demo@safenode.app`
- Password: `demo-password`

---

## ⚠️ Known Issues

1. **Supabase Direct Connection Failed** - Use connection pooling URL
2. **Port 5432 unreachable** - May need to enable IPv4/IPv6 in Supabase settings
3. **Consider Alternatives:** Neon.tech or Railway for simpler PostgreSQL setup

---

## 🎉 Local Development Working!

**Backend:** http://localhost:4000 ✅
**Frontend:** http://localhost:5173 ✅
**Database:** PostgreSQL (local) ✅

All login/registration features tested and working!
