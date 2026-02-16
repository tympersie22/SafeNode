# 🚀 SafeNode Production Deployment Guide

**Date:** February 16, 2025
**Status:** Ready for Production Deployment

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### ✅ **Completed:**
- [x] Frontend modernized with new UI components
- [x] Backend tested locally
- [x] All code committed to GitHub
- [x] Vercel configurations exist
- [x] Supabase database credentials available
- [x] Railway configurations exist

### 🔲 **To Complete:**
- [ ] Configure production environment variables
- [ ] Deploy backend to Vercel/Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure production database (Supabase)
- [ ] Update CORS settings
- [ ] Test end-to-end in production
- [ ] Set up custom domain (optional)

---

## 🗄️ **DATABASE SETUP (Supabase)**

### **1. Supabase Connection String**

Your Supabase PostgreSQL URL:
```
postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres
```

### **2. Run Database Migrations**

Connect to Supabase and run Prisma migrations:

```bash
# Set production database URL
export DATABASE_URL="postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres"

# Navigate to backend
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Verify tables created
npx prisma studio
```

---

## 🔐 **ENVIRONMENT VARIABLES**

### **Backend Environment Variables (Production)**

Create these in your deployment platform (Vercel/Railway):

```env
# Node Environment
NODE_ENV=production
PORT=4000

# API Configuration
API_URL=https://your-backend-domain.vercel.app
HIBP_API_URL=https://api.pwnedpasswords.com
HIBP_USER_AGENT=SafeNode/1.0.0

# Security - GENERATE NEW KEYS FOR PRODUCTION!
CORS_ORIGIN=https://your-frontend-domain.vercel.app
JWT_SECRET=<GENERATE_NEW_64_CHAR_SECRET>
ENCRYPTION_KEY=<GENERATE_NEW_64_CHAR_SECRET>

# Database - Supabase PostgreSQL
DB_ADAPTER=prisma
DATABASE_URL=postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres

# Database Seeding - DISABLE IN PRODUCTION
SEED_ON_BOOT=false
FORCE_SEED=false

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **Frontend Environment Variables (Production)**

Create these in Vercel frontend project:

```env
VITE_API_URL=https://your-backend-domain.vercel.app
VITE_APP_NAME=SafeNode
```

---

## 🔑 **GENERATE NEW PRODUCTION SECRETS**

**CRITICAL:** Never use development secrets in production!

Generate new secrets:

```bash
# Generate new JWT_SECRET (64 characters base64)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Generate new ENCRYPTION_KEY (64 characters base64)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 🌐 **DEPLOYMENT OPTIONS**

### **Option 1: Vercel (Recommended for Both)**

#### **Deploy Backend to Vercel:**

```bash
cd backend

# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel --prod

# Set environment variables in Vercel dashboard
# https://vercel.com/your-username/safenode-backend/settings/environment-variables
```

#### **Deploy Frontend to Vercel:**

```bash
cd frontend

# Deploy frontend
vercel --prod

# Set environment variables
# VITE_API_URL = https://your-backend-domain.vercel.app
```

---

### **Option 2: Railway (Backend) + Vercel (Frontend)**

#### **Deploy Backend to Railway:**

```bash
cd backend

# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables
railway variables set DATABASE_URL="postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres"
railway variables set NODE_ENV="production"
railway variables set JWT_SECRET="<YOUR_NEW_SECRET>"
railway variables set ENCRYPTION_KEY="<YOUR_NEW_KEY>"
# ... (set all other variables from list above)
```

---

## 🔧 **CONFIGURATION UPDATES**

### **1. Update CORS Settings**

Once you have your production URLs, update backend CORS:

In `backend/src/index.new.ts` (if hardcoded) or via environment variable:
```typescript
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### **2. Update API URL in Frontend**

Vercel environment variable:
```
VITE_API_URL=https://your-backend-domain.vercel.app
```

### **3. Disable Database Seeding**

**CRITICAL:** Set in production environment:
```
SEED_ON_BOOT=false
FORCE_SEED=false
```

---

## 📝 **STEP-BY-STEP DEPLOYMENT**

### **Phase 1: Database Setup**

1. ✅ Supabase credentials already available
2. Run Prisma migrations to Supabase:
   ```bash
   DATABASE_URL="postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres" npx prisma db push
   ```
3. Verify tables created in Supabase dashboard

### **Phase 2: Backend Deployment**

1. Generate new production secrets (JWT_SECRET, ENCRYPTION_KEY)
2. Choose deployment platform (Vercel or Railway)
3. Deploy backend:
   ```bash
   cd backend
   vercel --prod  # or railway up
   ```
4. Set all environment variables in platform dashboard
5. Test backend health endpoint:
   ```bash
   curl https://your-backend-domain.vercel.app/health
   ```

### **Phase 3: Frontend Deployment**

1. Update `VITE_API_URL` with backend production URL
2. Deploy frontend:
   ```bash
   cd frontend
   vercel --prod
   ```
3. Set environment variable in Vercel dashboard
4. Test frontend loads at production URL

### **Phase 4: End-to-End Testing**

1. Visit production frontend URL
2. Test signup flow
3. Test login flow
4. Test vault creation
5. Test password entry creation
6. Test password copying
7. Test logout
8. Verify Toast notifications work
9. Verify all marketing pages load

---

## 🧪 **TESTING CHECKLIST**

### **Backend API Tests:**
```bash
# Health check
curl https://your-backend.vercel.app/health

# Register user
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Login
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

### **Frontend Tests:**
- [ ] Homepage loads
- [ ] Pricing page loads
- [ ] Downloads page loads
- [ ] Security page loads
- [ ] Contact page loads
- [ ] Signup works
- [ ] Login works
- [ ] Vault creation works
- [ ] Password entries work
- [ ] Toast notifications appear
- [ ] Dark mode works
- [ ] Mobile responsive

---

## 🔒 **SECURITY CHECKLIST**

- [ ] New JWT_SECRET generated for production
- [ ] New ENCRYPTION_KEY generated for production
- [ ] CORS_ORIGIN set to production frontend URL only
- [ ] NODE_ENV=production
- [ ] SEED_ON_BOOT=false
- [ ] Database uses SSL connection
- [ ] No .env files committed to GitHub
- [ ] API rate limiting enabled
- [ ] HTTPS enforced on all endpoints

---

## 🌍 **CUSTOM DOMAIN SETUP (Optional)**

### **Vercel Custom Domain:**

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain (e.g., `app.safenode.com`)
5. Update DNS records as instructed
6. Update CORS_ORIGIN to match custom domain

### **Update Environment Variables:**

```env
# Backend
CORS_ORIGIN=https://app.safenode.com

# Frontend
VITE_API_URL=https://api.safenode.com
```

---

## 📊 **MONITORING & LOGS**

### **Vercel:**
- View logs: `vercel logs <deployment-url>`
- Dashboard: https://vercel.com/dashboard

### **Railway:**
- View logs: `railway logs`
- Dashboard: https://railway.app/dashboard

### **Supabase:**
- Database logs: Supabase dashboard → Database → Logs
- Monitor queries: Supabase dashboard → Database → Query Performance

---

## 🚨 **TROUBLESHOOTING**

### **CORS Errors:**
- Verify CORS_ORIGIN matches frontend URL exactly
- Include protocol (https://)
- No trailing slash

### **Database Connection Errors:**
- Verify DATABASE_URL is correct
- Check Supabase database is active
- Verify network allows connections

### **Build Errors:**
- Check all dependencies are in package.json
- Verify Node version compatibility
- Check for TypeScript errors

### **Environment Variable Issues:**
- Verify all required variables are set
- Check for typos in variable names
- Restart deployment after changing variables

---

## 📱 **POST-DEPLOYMENT**

### **1. Create First Admin User**

Since SEED_ON_BOOT is disabled in production:

```bash
# Option A: Use Prisma Studio
npx prisma studio --schema=./backend/prisma/schema.prisma

# Option B: Create via API
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@safenode.app","password":"SecurePassword123!","displayName":"Admin"}'
```

### **2. Monitor First 24 Hours**

- Check error logs frequently
- Monitor database query performance
- Watch for unusual API usage
- Verify rate limiting works

### **3. Set Up Backups**

Supabase includes automatic backups, but verify:
- Daily backups enabled
- Retention period set
- Test restore process

---

## ✅ **PRODUCTION READINESS CHECKLIST**

- [ ] Database migrated to Supabase
- [ ] Backend deployed with production environment variables
- [ ] Frontend deployed with backend API URL
- [ ] New JWT_SECRET and ENCRYPTION_KEY generated
- [ ] CORS configured correctly
- [ ] Database seeding disabled
- [ ] HTTPS enforced
- [ ] API rate limiting enabled
- [ ] All marketing pages tested
- [ ] Authentication flow tested
- [ ] Vault operations tested
- [ ] Error monitoring set up
- [ ] Backups configured
- [ ] Custom domain configured (optional)

---

## 🎯 **QUICK DEPLOY COMMANDS**

### **If you want to deploy RIGHT NOW:**

```bash
# 1. Generate new secrets
echo "JWT_SECRET=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')"
echo "ENCRYPTION_KEY=$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))')"

# 2. Deploy backend
cd backend
vercel --prod
# Set environment variables in Vercel dashboard

# 3. Deploy frontend
cd ../frontend
vercel --prod
# Set VITE_API_URL in Vercel dashboard

# 4. Test
curl https://your-backend-domain.vercel.app/health
open https://your-frontend-domain.vercel.app
```

---

**🚀 Your SafeNode app is ready for production deployment!**
