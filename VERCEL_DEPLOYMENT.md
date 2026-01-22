# Vercel Deployment Guide - SafeNode Frontend

This guide covers deploying the SafeNode frontend to Vercel while keeping the backend on Railway.

## 🏗️ Architecture

- **Frontend**: Deployed on Vercel (React/Vite)
- **Backend**: Deployed on Railway (Node.js/Fastify API)
- **Database**: PostgreSQL on Railway

## 🚀 Quick Start

### Step 1: Deploy Frontend to Vercel

1. **Install Vercel CLI** (optional, can use web UI):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository: `tympersie22/SafeNode`
   - **Root Directory**: Set to `frontend`
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)

3. **Or Deploy via CLI**:
   ```bash
   cd frontend
   vercel
   ```

### Step 2: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

#### Required Variables:

```bash
VITE_API_URL=https://your-backend-service.railway.app
```

Replace `your-backend-service.railway.app` with your actual Railway backend URL.

#### Optional Variables:

```bash
# Sentry Error Tracking
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

### Step 3: Update CORS in Railway Backend

Make sure your Railway backend has `CORS_ORIGIN` set to your Vercel frontend URL:

```bash
CORS_ORIGIN=https://your-frontend.vercel.app
```

## 📋 Environment Variables Checklist

### Vercel Frontend:
- [ ] `VITE_API_URL` - Your Railway backend URL
- [ ] `VITE_SENTRY_DSN` (optional)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (optional)

### Railway Backend:
- [ ] `CORS_ORIGIN` - Your Vercel frontend URL (e.g., `https://safenode.vercel.app`)

## 🔧 Vercel Configuration

The `frontend/vercel.json` file is already configured with:
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- SPA routing: All routes rewrite to `index.html`
- Asset caching: Long-term cache for static assets

## 🌐 Custom Domain Setup

1. **In Vercel Dashboard**:
   - Go to your project → Settings → Domains
   - Add your custom domain (e.g., `safenode.app`)
   - Follow DNS configuration instructions

2. **Update Railway Backend CORS**:
   - Update `CORS_ORIGIN` to include your custom domain:
   ```bash
   CORS_ORIGIN=https://safenode.app,https://www.safenode.app
   ```

3. **Update Frontend Environment Variable**:
   - In Vercel, update `VITE_API_URL` if needed (usually stays the same)

## 🔄 Deployment Workflow

### Automatic Deployments:
- **Production**: Pushes to `main` branch → Auto-deploy to production
- **Preview**: Pull requests → Auto-deploy preview URLs

### Manual Deployment:
```bash
cd frontend
vercel --prod
```

## 🐛 Troubleshooting

### Issue: API calls failing
**Cause**: CORS error or wrong API URL

**Fix**:
1. Check `VITE_API_URL` in Vercel environment variables
2. Verify `CORS_ORIGIN` in Railway includes your Vercel URL
3. Check browser console for CORS errors

### Issue: 404 on page refresh
**Cause**: SPA routing not configured

**Fix**: The `vercel.json` already has rewrites configured. If still happening, check the rewrite rules.

### Issue: Build fails
**Cause**: Missing dependencies or build errors

**Fix**:
```bash
cd frontend
npm install
npm run build  # Test locally first
```

### Issue: Environment variables not working
**Cause**: Variables not prefixed with `VITE_` or not set in Vercel

**Fix**:
- All frontend env vars must start with `VITE_`
- Set them in Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding variables

## 📊 Monitoring

### Vercel Analytics (Optional):
- Enable in Vercel Dashboard → Analytics
- Track page views, performance, etc.

### Error Tracking:
- Use Sentry (set `VITE_SENTRY_DSN`)
- Check Vercel Function Logs for serverless function errors

## 🎯 Production Checklist

- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` set to Railway backend URL
- [ ] Railway backend `CORS_ORIGIN` includes Vercel URL
- [ ] Custom domain configured (if using)
- [ ] Environment variables set in Vercel
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Error tracking configured (Sentry)
- [ ] Tested end-to-end: Frontend → Backend → Database

## 🔗 Quick Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite on Vercel](https://vercel.com/guides/deploying-vite)

---

**Note**: The backend remains on Railway. Only the frontend is deployed to Vercel.
