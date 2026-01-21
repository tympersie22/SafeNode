# Railway Deployment Guide - SafeNode

This guide covers all environment variables needed for deploying SafeNode on Railway.

## 🚀 Quick Start

1. **Create Railway Project**
   - Go to [Railway](https://railway.app)
   - Create a new project
   - Connect your GitHub repository: `tympersie22/SafeNode`

2. **Add PostgreSQL Database**
   - In Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Railway will automatically provide `DATABASE_URL` as an environment variable

3. **Deploy Backend Service**
   - Add a new service from GitHub
   - Select the `backend` directory as the root
   - Railway will auto-detect Node.js

4. **Deploy Frontend Service**
   - Add another service from GitHub
   - Select the `frontend` directory as the root
   - Railway will auto-detect Vite/React

---

## 📋 Required Environment Variables

### Backend Service Environment Variables

#### 🔴 CRITICAL (Required for Production)

```bash
# Server Configuration
NODE_ENV=production
PORT=4000

# Database (Railway provides this automatically when you add PostgreSQL)
DATABASE_URL=postgresql://postgres:password@hostname:5432/railway
# ⚠️ Railway automatically sets this - don't override unless needed

# Database Adapter
DB_ADAPTER=prisma

# Security - MUST be set in production
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-32-byte-base64-secret-here-minimum-32-characters

# Encryption Key (Recommended)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_KEY=your-32-byte-base64-encryption-key-here

# CORS - Set to your production frontend URL
CORS_ORIGIN=https://your-frontend-domain.railway.app
# Or if using custom domain:
# CORS_ORIGIN=https://safenode.app,https://www.safenode.app
```

#### 🟡 IMPORTANT (Required for Full Functionality)

```bash
# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MINUTES=15

# Stripe (for billing/subscriptions)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (if using custom pricing)
STRIPE_PRICE_INDIVIDUAL=price_individual_monthly
STRIPE_PRICE_FAMILY=price_family_monthly
STRIPE_PRICE_TEAMS=price_teams_monthly
STRIPE_PRICE_BUSINESS=price_business_monthly
```

#### 🟢 OPTIONAL (Recommended for Production)

```bash
# Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENABLED_IN_DEV=false

# Email Configuration (for verification emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@safenode.app

# SSO (Google OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SSO (GitHub OAuth)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Seeding (set to false in production)
SEED_ON_BOOT=false
```

---

### Frontend Service Environment Variables

#### 🔴 CRITICAL (Required)

```bash
# API URL - Point to your backend service URL
# Railway provides this automatically, but you can override
VITE_API_URL=https://your-backend-service.railway.app
# Or if using custom domain:
# VITE_API_URL=https://api.safenode.app
```

#### 🟢 OPTIONAL

```bash
# Sentry (Frontend Error Tracking)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Stripe Publishable Key (for checkout)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

---

## 🔧 Railway-Specific Configuration

### Backend Service Settings

1. **Root Directory**: `backend`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`
4. **Health Check Path**: `/api/health` (optional)

### Frontend Service Settings

1. **Root Directory**: `frontend`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm run preview` (or use Railway's static file serving)
4. **Output Directory**: `dist`

### Custom Domain Setup

1. In Railway, go to your service settings
2. Click "Generate Domain" or add a custom domain
3. Update `CORS_ORIGIN` in backend to include your frontend domain
4. Update `VITE_API_URL` in frontend to point to your backend domain

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Generate strong `JWT_SECRET` (32+ characters, base64)
- [ ] Generate strong `ENCRYPTION_KEY` (32-byte base64)
- [ ] Set `NODE_ENV=production`
- [ ] Set `SEED_ON_BOOT=false` (disable demo user seeding)
- [ ] Configure `CORS_ORIGIN` to your production domain only
- [ ] Set up Stripe keys (if using billing)
- [ ] Configure Sentry for error tracking
- [ ] Set up custom domains with HTTPS
- [ ] Review and set rate limiting values
- [ ] Disable any debug logging

---

## 🧪 Testing the Deployment

### 1. Health Check
```bash
curl https://your-backend.railway.app/api/health
```

### 2. Test Authentication
```bash
# Register a user
curl -X POST https://your-backend.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!@#$"}'
```

### 3. Test Frontend
- Visit your frontend URL
- Try registering a new account
- Test vault unlock

---

## 📝 Environment Variable Generation

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔄 Database Migrations

Railway will automatically run migrations if you have a `postdeploy` script, or you can run manually:

```bash
# In Railway, use the CLI or run in a one-off container
railway run --service backend npm run db:migrate:deploy
```

Or add to your backend `package.json`:
```json
{
  "scripts": {
    "postdeploy": "npm run db:migrate:deploy"
  }
}
```

---

## 🐛 Troubleshooting

### Backend Issues

**Error: JWT_SECRET is required**
- Make sure `JWT_SECRET` is set in Railway environment variables
- Must be at least 32 characters

**Error: Database connection failed**
- Check that PostgreSQL service is running
- Verify `DATABASE_URL` is set correctly
- Check database migrations: `npm run db:migrate:deploy`

**CORS errors**
- Verify `CORS_ORIGIN` includes your frontend URL
- Check that frontend `VITE_API_URL` matches backend URL

### Frontend Issues

**API calls failing**
- Check `VITE_API_URL` is set correctly
- Verify backend is running and accessible
- Check browser console for CORS errors

**Build fails**
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)

---

## 🎯 Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Custom domains configured
- [ ] SSL/HTTPS enabled (automatic on Railway)
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Security headers verified
- [ ] Tested end-to-end user flows

---

**Last Updated**: $(date)
**Repository**: https://github.com/tympersie22/SafeNode
