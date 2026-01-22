# Google OAuth Setup for SafeNode

## Fix Redirect URI Mismatch Error

If you're seeing `Error 400: redirect_uri_mismatch`, you need to add the correct redirect URI to your Google OAuth app.

---

## Step 1: Add Redirect URI in Google Cloud Console

### Quick Steps:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project** (the one with your OAuth credentials)
3. **Navigate to**: **APIs & Services** → **Credentials**
4. **Click** on your OAuth 2.0 Client ID (the one you're using for SafeNode)
5. **Scroll down** to **Authorized redirect URIs**
6. **Click "Add URI"**
7. **Add this exact URL** (copy and paste):

```
https://safe-node-99hv-backend.vercel.app/api/sso/callback/google
```

8. **Click "Save"**
9. **Wait 1-2 minutes** for Google to update

### ⚠️ Critical Requirements:

- ✅ Use your **backend** URL (`safe-node-99hv-backend.vercel.app`), NOT the frontend URL
- ✅ The path must be exactly: `/api/sso/callback/google`
- ✅ Use `https://` (not `http://`)
- ✅ No trailing slash at the end
- ✅ Match the URL character-by-character (case-sensitive)

### How to Verify Your Backend URL:

Your backend URL is: **`https://safe-node-99hv-backend.vercel.app`**

You can verify this by:
1. Going to your Vercel dashboard
2. Opening your backend project (`safe-node-99hv-backend`)
3. Checking the **Domains** section
4. The main domain is your backend URL

---

## Step 2: Optional - Set BACKEND_URL Environment Variable

For more reliable URL detection, you can set a `BACKEND_URL` environment variable in Vercel:

1. Go to Vercel Dashboard → Your Backend Project → **Settings** → **Environment Variables**
2. Add:
   - **Key**: `BACKEND_URL`
   - **Value**: `https://safe-node-99hv-backend.vercel.app`
   - **Environment**: Production (and Preview if needed)
3. **Redeploy** your backend after adding

This ensures the redirect URI is always correct, even if request headers are inconsistent.

### Your Backend URLs:

- **Production**: `https://safe-node-99hv-backend.vercel.app`
- **Preview deployments**: `https://safe-node-99hv-backend-*-mbwana-allys-projects.vercel.app`

For production OAuth, use the main backend URL. If you want preview deployments to work, add those URLs too.

---

## Step 3: Environment Variables

Make sure these are set in Vercel:

- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
- `FRONTEND_URL` - Your frontend URL (e.g., `https://safe-node.vercel.app`)

---

## Step 4: Test

After adding the redirect URI:

1. **Wait 1-2 minutes** for Google to update (can take up to 5 minutes)
2. **Try logging in with Google** on your app
3. You should be redirected to **Google's consent screen**
4. After approval, you'll be redirected back to your app

### If It Still Doesn't Work:

1. **Check Vercel Logs**: 
   - Go to Vercel Dashboard → Your Backend → **Logs**
   - Look for "SSO login initiated" log entry
   - It will show the exact `backendCallbackUrl` being sent to Google
   - Compare this with what you added in Google Console

2. **Verify in Google Console**:
   - Go back to Google Cloud Console → Credentials
   - Check that the redirect URI is **exactly** what's in the logs
   - Make sure there are no extra spaces or characters

3. **Common Mistakes**:
   - ❌ Using frontend URL instead of backend URL
   - ❌ Wrong path (`/callback` instead of `/api/sso/callback/google`)
   - ❌ Using `http://` instead of `https://`
   - ❌ Trailing slash at the end
   - ❌ Typo in the domain name

---

## Troubleshooting

### Still getting redirect_uri_mismatch?

1. **Check the exact URL**: Copy the redirect URI from the error message and compare it character-by-character with what you added in Google Console
2. **Check for typos**: Common mistakes:
   - Missing `https://`
   - Wrong domain (frontend instead of backend)
   - Wrong path (`/callback` instead of `/api/sso/callback/google`)
   - Trailing slash
3. **Wait a few minutes**: Google can take 1-5 minutes to update redirect URIs
4. **Check multiple environments**: If you have preview deployments, you may need to add those URLs too

### For Local Development

If testing locally, add:
```
http://localhost:4000/api/sso/callback/google
```

Make sure to use `http://` (not `https://`) for localhost.

---

## How It Works

1. User clicks "Sign in with Google" on frontend
2. Frontend redirects to: `https://safe-node-99hv-backend.vercel.app/api/sso/login/google?redirect_uri=https://safe-node.vercel.app/auth/sso/callback`
3. Backend constructs OAuth URL with callback: `https://safe-node-99hv-backend.vercel.app/api/sso/callback/google`
4. User authorizes on Google
5. Google redirects to: `https://safe-node-99hv-backend.vercel.app/api/sso/callback/google?code=...&state=...`
6. Backend exchanges code for token, then redirects to frontend: `https://safe-node.vercel.app/auth/sso/callback?token=...`

The key is that **Google needs the backend callback URL**, not the frontend URL.
