# CORS Fix for SafeNode

## Problem
Frontend POST requests to `http://localhost:4000/api/auth/login` were timing out after OPTIONS preflight returned 204. The actual POST request was never sent.

## Root Cause
The CORS configuration was missing some required headers and the origin matching wasn't explicit enough for development.

## Solution Applied (Fastify)

### Fixed in `backend/src/index.ts` (lines 1153-1185)

The CORS configuration now:
- ✅ Explicitly allows `http://localhost:5173` and `http://127.0.0.1:5173` in development
- ✅ Includes all required headers: `Authorization`, `Content-Type`, `X-Requested-With`, `Accept`, `Origin`, and preflight headers
- ✅ Sets `credentials: true` for cookie/auth token support
- ✅ Handles preflight requests with `preflight: true`
- ✅ Uses environment variables for production origins

### Key Changes:
```typescript
allowedHeaders: [
  'Authorization',
  'Content-Type',
  'X-Requested-With',
  'Accept',
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers'
],
credentials: true,
preflight: true,
```

## Alternative Solution: Vite Proxy

If you prefer to bypass CORS entirely, use the Vite proxy (already configured in `frontend/vite.config.ts`):

1. **Update frontend API calls** to use relative URLs:
   ```typescript
   const API_BASE = '' // Instead of 'http://localhost:4000'
   ```

2. **The proxy forwards** `/api/*` requests to `http://localhost:4000/api/*` automatically
3. **No CORS needed** because requests appear to come from the same origin

## Express Alternative (if migrating)

If you switch to Express, use the `cors` package:

```bash
npm install cors && npm i -D @types/cors
```

```typescript
import cors from 'cors'
import express from 'express'

const app = express()

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN?.split(',') || ['https://safenode.app']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24 hours
}

app.use(cors(corsOptions))

// Explicit OPTIONS handler (optional, cors handles it)
app.options('*', cors(corsOptions))
```

## Why This Fixes the Timeout

1. **Preflight requests** (OPTIONS) now return proper CORS headers
2. **Browser validates** the response and allows the actual POST
3. **Missing headers** in `allowedHeaders` were causing the browser to block the request
4. **Origin matching** is now explicit for development URLs

## Testing

1. Restart the backend server
2. Try logging in from the frontend
3. Check browser DevTools → Network tab:
   - OPTIONS request should return 204 with CORS headers
   - POST request should follow immediately
   - Both should succeed

## Production Notes

Set `CORS_ORIGIN` environment variable:
```bash
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

