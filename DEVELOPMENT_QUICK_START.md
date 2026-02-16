# 🚀 SafeNode Development Quick Start

**Last Updated:** February 16, 2026

---

## ✅ Currently Running

Both servers are **LIVE** and ready for development!

### **Local Development URLs:**

```
Frontend (Vite with Hot Reload):
➜ http://localhost:5173

Backend (Fastify API):
➜ http://localhost:4000/api
➜ Health Check: http://localhost:4000/api/health
```

---

## 🎨 What's New (Just Deployed)

### **Indigo Color Scheme Applied Everywhere:**
- ✅ Primary color: `indigo-600` → `indigo-700` on hover
- ✅ Text hierarchy: `gray-900` → `gray-600` → `gray-500`
- ✅ Backgrounds: `white`, `gray-50`
- ✅ Icon containers: `indigo-50` with `indigo-600` icons
- ✅ Cards: `white` with `gray-200` borders
- ✅ Dark mode: Removed (simplified)

### **Files Updated (9 total):**
1. Hero.tsx - Clean indigo branding
2. Features.tsx - Indigo icon containers
3. CTASection.tsx - Full indigo gradient
4. Testimonials.tsx - Indigo accents
5. Platforms.tsx - Indigo accents
6. Auth.tsx - Clean backgrounds
7. LoginForm.tsx - White cards with indigo
8. SignupForm.tsx - White cards with indigo
9. Pricing.tsx - Payment integration fixed

---

## 🛠️ Server Management

### **Start Both Servers:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **Stop Servers:**
```bash
# Kill by PID (if running in background)
kill $(cat /tmp/backend.pid)
kill $(cat /tmp/frontend.pid)

# Or use pkill
pkill -f "npm run dev"
```

### **Check Server Status:**
```bash
# Backend health check
curl http://localhost:4000/api/health | jq '.'

# Frontend check
curl -I http://localhost:5173
```

---

## 🎯 Quick Testing Guide

### **1. Test User Registration:**
```bash
curl http://localhost:4000/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "displayName": "Test User"
  }' | jq '.'
```

### **2. Test User Login:**
```bash
curl http://localhost:4000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }' | jq '.'
```

### **3. Test with Token:**
```bash
# Save token from login
TOKEN="your-token-here"

# Test authenticated endpoint
curl http://localhost:4000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🎨 Design System Reference

### **Colors (Now Live):**

```css
/* PRIMARY */
bg-indigo-600       /* Buttons, CTAs */
hover:bg-indigo-700 /* Hover state */
text-indigo-600     /* Links, icons */
bg-indigo-50        /* Icon containers, accents */

/* TEXT */
text-gray-900       /* Headings */
text-gray-600       /* Body text */
text-gray-500       /* Muted text */

/* BACKGROUNDS */
bg-white            /* Cards, sections */
bg-gray-50          /* Alternate sections */
bg-gradient-to-b from-white to-gray-50  /* Hero sections */

/* BORDERS */
border-gray-200     /* Default borders */
hover:border-indigo-500  /* Hover state */
```

### **Component Patterns:**

```tsx
// Primary Button
<button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">

// Secondary Button  
<button className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-indigo-500 transition-all">

// Card
<div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500 transition-all">

// Icon Container
<div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
  <Icon className="w-6 h-6 text-indigo-600" />
</div>
```

---

## 📁 Project Structure

```
SafeNode/
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── marketing/  # Hero, Features, CTA, etc.
│   │   │   ├── auth/       # Login, Signup forms
│   │   │   └── ui/         # Toast, Spinner, etc.
│   │   ├── pages/
│   │   │   ├── marketing/  # Pricing, Downloads, etc.
│   │   │   └── Auth.tsx
│   │   └── services/       # API clients
│   └── package.json
│
├── backend/                # Fastify + Prisma + PostgreSQL
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── prisma/         # Database schema
│   └── package.json
│
└── Documentation/
    ├── INDIGO_COLOR_SCHEME_UPDATE.md
    ├── COLOR_SCHEME_COMPARISON.md
    ├── PROJECT_COMPLETION_SUMMARY.md
    └── COMPLETE_SYSTEM_CONSISTENCY.md
```

---

## 🔥 Hot Features Ready to Test

### **1. Homepage:**
- Visit http://localhost:5173
- See new indigo branding
- Test "Get Started Free" button
- Test "Sign In" button

### **2. Auth Flow:**
- Click "Get Started Free"
- Create account (registration)
- Login with credentials
- See vault interface

### **3. Pricing Page:**
- Visit http://localhost:5173/pricing
- Toggle Monthly/Annual
- See Stripe integration ready
- Test "Start Free Trial" buttons

### **4. Downloads Page:**
- Visit http://localhost:5173/downloads
- See official OS logos
- Auto-detect your OS
- Clean indigo branding

---

## 🐛 Common Issues & Solutions

### **Port Already in Use:**
```bash
# Kill process on port 4000 (backend)
lsof -ti:4000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### **Database Connection Failed:**
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL (if needed)
brew services restart postgresql@14
```

### **Environment Variables Missing:**
```bash
# Backend - check .env file exists
cd backend && cat .env

# Should contain:
# DATABASE_URL=postgresql://...
# JWT_SECRET=...
# ENCRYPTION_KEY=...
```

### **Build Errors:**
```bash
# Clear node_modules and reinstall
cd frontend && rm -rf node_modules && npm install
cd backend && rm -rf node_modules && npm install
```

---

## 📊 Database Management

### **Run Migrations:**
```bash
cd backend
npx prisma migrate dev
```

### **View Database:**
```bash
cd backend
npx prisma studio
# Opens at http://localhost:5555
```

### **Reset Database:**
```bash
cd backend
npx prisma migrate reset
```

---

## 🚀 Production Deployment

### **Current Production URLs:**
- Frontend: https://frontend-pi-nine-39.vercel.app
- Backend: https://backend-phi-bay.vercel.app

### **Deploy Updates:**
```bash
# Commit changes
git add -A
git commit -m "Your commit message"
git push origin main

# Vercel auto-deploys on push
# Check status at https://vercel.com/dashboard
```

---

## 🎉 Quick Wins to Try

1. **See the new indigo colors live:**
   - Open http://localhost:5173
   - Scroll through homepage
   - Notice consistent indigo-600 throughout

2. **Test auth flow:**
   - Click "Get Started Free"
   - Create an account
   - See the clean white cards with indigo accents

3. **Check payment integration:**
   - Visit /pricing
   - Notice Stripe integration ready
   - Payment bug fixed (sessionUrl → url)

4. **Compare with production:**
   - Local: http://localhost:5173
   - Production: https://frontend-pi-nine-39.vercel.app
   - Should look identical!

---

## 📚 Additional Documentation

- `INDIGO_COLOR_SCHEME_UPDATE.md` - Complete color scheme details
- `COLOR_SCHEME_COMPARISON.md` - Before/after analysis
- `PROJECT_COMPLETION_SUMMARY.md` - Full project overview
- `COMPLETE_SYSTEM_CONSISTENCY.md` - Design system docs

---

**Happy coding! Your SafeNode app is looking 🔥 with the new indigo branding!**
