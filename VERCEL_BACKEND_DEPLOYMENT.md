# Vercel Backend Deployment Guide

This guide covers deploying the SafeNode backend to Vercel as serverless functions.

## 🏗️ Architecture Options

### Option 1: Serverless Functions (Recommended for Vercel)
- Convert Fastify routes to Vercel serverless functions
- Better cold start performance
- Pay per request

### Option 2: Node.js Server (Current Setup)
- Deploy Fastify server as-is
- Requires Vercel Pro plan for long-running processes
- Better for persistent connections

## 🚀 Quick Start - Option 1: Serverless Functions

### Step 1: Create API Routes Structure

Vercel automatically detects functions in the `api/` directory. We've created:
- `backend/api/index.ts` - Main handler

### Step 2: Deploy Backend to Vercel

1. **Via Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository: `tympersie22/SafeNode`
   - **Root Directory**: Set to `backend`
   - Framework Preset: **Other** (or Node.js)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

2. **Or Via CLI**:
   ```bash
   cd backend
   vercel
   ```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Backend Project → Settings → Environment Variables:

Copy from `railway-backend-env-ready.txt` and add:
- `NODE_ENV=production`
- `DB_ADAPTER=prisma`
- `DATABASE_URL` (from your PostgreSQL provider)
- `JWT_SECRET` (your generated secret)
- `ENCRYPTION_KEY` (your generated key)
- `CORS_ORIGIN` (your frontend Vercel URL)
- All other backend variables

### Step 4: Add PostgreSQL Database

Vercel doesn't provide PostgreSQL directly. You'll need:
- **Vercel Postgres** (if available in your plan)
- **External PostgreSQL** (Railway, Supabase, Neon, etc.)
- Set `DATABASE_URL` environment variable

## 🔧 Alternative: Use Vercel's Node.js Runtime

If you prefer to keep the Fastify server as-is:

1. **Update `vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.new.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.new.js"
    }
  ]
}
```

2. **Update start command** to work with Vercel:
   - Vercel will call the exported handler
   - Fastify needs to be wrapped for Vercel's runtime

## ⚠️ Important Considerations

### Database Connection Pooling
- Vercel serverless functions are stateless
- Database connections should use connection pooling
- Consider using Prisma with connection pooling enabled

### Cold Starts
- First request may be slower (cold start)
- Consider Vercel Pro plan for better performance
- Or use external database with connection pooling

### Environment Variables
- All backend env vars must be set in Vercel
- Use Vercel's environment variable management
- Different values for Production/Preview/Development

## 📋 Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Root Directory set to `backend`
- [ ] Build command: `npm run build`
- [ ] All environment variables configured
- [ ] PostgreSQL database connected (external or Vercel Postgres)
- [ ] `DATABASE_URL` set correctly
- [ ] `CORS_ORIGIN` includes frontend Vercel URL
- [ ] Test API endpoints work
- [ ] Health check endpoint accessible

## 🔗 Update Frontend

After backend is on Vercel, update frontend environment variable:

```bash
VITE_API_URL=https://your-backend.vercel.app
```

## 🐛 Troubleshooting

### Issue: Cold starts are slow
**Solution**: Consider Vercel Pro plan or optimize database connections

### Issue: Database connection errors
**Solution**: Ensure connection pooling is enabled in Prisma

### Issue: CORS errors
**Solution**: Update `CORS_ORIGIN` in backend to include frontend Vercel URL

---

**Note**: For production, consider keeping backend on Railway for better database integration, or use Vercel Postgres if available.
