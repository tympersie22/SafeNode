# SafeNode Deployment Guide

## Production Deployment Checklist

### 1. Environment Setup

#### Backend Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (PostgreSQL connection string)
- [ ] `JWT_SECRET` (strong random 32+ character string)
- [ ] `STRIPE_SECRET_KEY` (production key)
- [ ] `STRIPE_WEBHOOK_SECRET` (production webhook secret)
- [ ] `CORS_ORIGIN` (your frontend domain)
- [ ] `SENTRY_DSN` (backend Sentry project DSN)
- [ ] `EMAIL_PROVIDER` and API keys (Resend/SendGrid)

#### Frontend Environment Variables
- [ ] `VITE_API_URL` (your backend API URL)
- [ ] `VITE_SENTRY_DSN` (frontend Sentry project DSN)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (production publishable key)

### 2. Database Setup

1. Create production database:
```bash
createdb safenode_prod
```

2. Run migrations:
```bash
cd backend
DATABASE_URL=postgresql://... npm run db:migrate:deploy
```

3. Verify schema:
```bash
npm run db:studio
```

### 3. Build & Deploy

#### Backend (Railway/Render/Fly.io)

**Railway**:
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push to main

**Render**:
1. Create new Web Service
2. Connect repository
3. Build command: `cd backend && npm install && npm run build`
4. Start command: `cd backend && npm start`
5. Set environment variables

**Manual Deploy**:
```bash
cd backend
npm install
npm run build
npm start
```

#### Frontend (Vercel)

1. Connect GitHub repository
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set environment variables
6. Deploy

**Manual Deploy**:
```bash
cd frontend
npm install
npm run build
# Upload dist/ to your hosting provider
```

### 4. Stripe Setup

1. Create products in Stripe Dashboard:
   - Individual ($0.99/month)
   - Family ($1.99/month)
   - Teams ($11.99/month)
   - Business ($5.99/month)

2. Get price IDs and add to environment variables

3. Configure webhook:
   - Endpoint: `https://api.yourdomain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. Domain & SSL

1. Configure domain DNS
2. Enable SSL/HTTPS (automatic with Vercel/Railway/Render)
3. Update CORS_ORIGIN to production domain

### 6. Monitoring

1. Set up Sentry projects (backend + frontend)
2. Configure alerts for errors
3. Set up uptime monitoring (e.g., UptimeRobot)

### 7. Security Checklist

- [ ] JWT_SECRET is strong and unique
- [ ] All environment variables are set
- [ ] Database is backed up regularly
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] CORS is restricted to production domain
- [ ] SSL/HTTPS is enabled everywhere
- [ ] Sentry is capturing errors
- [ ] Audit logs are enabled
- [ ] Regular security updates

## Deployment Platforms

### Backend Options

#### Railway
- **Pros**: Easy setup, automatic deployments, built-in PostgreSQL
- **Cost**: ~$5-20/month
- **Recommended for**: Quick production deployments

#### Render
- **Pros**: Free tier available, easy setup
- **Cost**: Free tier or ~$7-25/month
- **Recommended for**: Budget-conscious deployments

#### Fly.io
- **Pros**: Global edge deployment, fast
- **Cost**: ~$2-10/month
- **Recommended for**: Low-latency requirements

### Frontend Options

#### Vercel
- **Pros**: Excellent Next.js/React support, automatic deployments, edge network
- **Cost**: Free tier, $20/month for Pro
- **Recommended for**: Best overall experience

#### Netlify
- **Pros**: Great DX, form handling, edge functions
- **Cost**: Free tier, $19/month for Pro
- **Recommended for**: Alternative to Vercel

#### Cloudflare Pages
- **Pros**: Fast global CDN, generous free tier
- **Cost**: Free tier
- **Recommended for**: Budget deployments

## Post-Deployment

1. Test all critical flows:
   - User registration
   - Login
   - Vault unlock
   - Entry CRUD operations
   - Billing flow
   - Team invitations

2. Monitor:
   - Error rates in Sentry
   - API response times
   - Database performance
   - Stripe webhook deliveries

3. Set up backups:
   - Database backups (daily)
   - Vault exports (user-initiated)

4. Configure alerts:
   - High error rates
   - Slow response times
   - Failed payments
   - Database connection issues

