# Vercel Environment Variables Setup

## 📋 Quick Setup

### Option 1: Import via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**:
   - Your Project → Settings → Environment Variables
   - Click **"Add"** or **"Import"** button

2. **Copy these variables** (replace with your actual values):

```bash
VITE_API_URL=https://your-backend-service.railway.app
```

3. **For each environment** (Production, Preview, Development):
   - Click **"Add"**
   - Key: `VITE_API_URL`
   - Value: Your Railway backend URL
   - Select environment(s)
   - Click **"Save"**

### Option 2: Use Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variable for production
vercel env add VITE_API_URL production
# When prompted, enter: https://your-backend-service.railway.app

# Add for preview
vercel env add VITE_API_URL preview
# When prompted, enter: https://your-backend-service.railway.app

# Add for development
vercel env add VITE_API_URL development
# When prompted, enter: http://localhost:4000
```

## 🔧 Environment-Specific Values

### Production:
```bash
VITE_API_URL=https://your-backend-service.railway.app
```

### Preview (Pull Requests):
```bash
VITE_API_URL=https://your-backend-service.railway.app
```

### Development (Local):
```bash
VITE_API_URL=http://localhost:4000
```

## ✅ Checklist

- [ ] `VITE_API_URL` set for Production
- [ ] `VITE_API_URL` set for Preview
- [ ] `VITE_API_URL` set for Development (optional, for local dev)
- [ ] Optional: `VITE_SENTRY_DSN` (if using Sentry)
- [ ] Optional: `VITE_STRIPE_PUBLISHABLE_KEY` (if using Stripe)
- [ ] Railway backend `CORS_ORIGIN` includes your Vercel URL
- [ ] Redeployed after adding variables

## 🚨 Important Notes

1. **All Vite env vars must start with `VITE_`**
2. **Variables are embedded at build time** - redeploy after changes
3. **Different values per environment** - set Production, Preview, and Development separately
4. **No quotes needed** - Vercel handles values automatically

## 📝 File Formats

- `vercel-env-all.txt` - Complete template with instructions
- `vercel-env-production.txt` - Production values only
- `vercel-env-preview.txt` - Preview values only
- `vercel-env-development.txt` - Development values only

## 🔗 Next Steps

After setting environment variables:
1. **Redeploy** your Vercel project
2. **Test** the frontend → backend connection
3. **Verify** CORS is working (check browser console)

---

**Remember**: Replace `your-backend-service.railway.app` with your actual Railway backend URL!
