# Railway Build Failure Troubleshooting

## 🔍 Step 1: Check Build Logs

In Railway Dashboard:
1. Go to your service → **Deployments** tab
2. Click on the failed deployment
3. Expand **"Build"** section
4. Look for error messages (usually in red)

## 🐛 Common Build Failures & Fixes

### Error 1: "Missing script: start"
**Cause**: Root Directory not set to `backend`

**Fix**:
- Settings → Source → Root Directory = `backend`
- Redeploy

### Error 2: "package-lock.json out of sync"
**Cause**: Dependencies changed but lock file not updated

**Fix**:
```bash
cd backend
npm install
git add package-lock.json
git commit -m "fix: Update package-lock.json"
git push
```

### Error 3: "Prisma generate failed"
**Cause**: Missing DATABASE_URL or Prisma schema issues

**Fix**:
- Ensure DATABASE_URL is set in Railway environment variables
- Check `backend/prisma/schema.prisma` is valid
- Try: `cd backend && npx prisma generate` locally

### Error 4: "TypeScript compilation failed"
**Cause**: Type errors or missing types

**Fix**:
```bash
cd backend
npm run type-check  # Check for errors
npm run build       # Try building locally
```

### Error 5: "Cannot find module"
**Cause**: Missing dependencies or wrong Node version

**Fix**:
- Check `backend/package.json` has all dependencies
- Ensure Node.js version matches (should be 18+)
- Run `npm install` locally to verify

### Error 6: "Build command failed"
**Cause**: Build command syntax error or missing files

**Fix**:
- Check `railway.json` build command is correct
- Verify all files exist in `backend/` directory
- Test build locally: `cd backend && npm run build`

## 🔧 Quick Diagnostic Commands

Run these locally to test:

```bash
# 1. Check if backend builds locally
cd backend
npm ci
npm run build

# 2. Check Prisma generation
npx prisma generate

# 3. Check TypeScript
npm run type-check

# 4. Verify package.json
cat package.json | grep -A 5 '"scripts"'
```

## 📋 Railway Build Configuration Checklist

- [ ] Root Directory set to `backend` in Railway
- [ ] `railway.json` exists in repo root
- [ ] `backend/package.json` has "build" and "start" scripts
- [ ] `backend/package-lock.json` is up to date
- [ ] `DATABASE_URL` is set in Railway environment variables
- [ ] Node.js version is 18+ (check `backend/package.json` engines)

## 🚀 Current Configuration

### Build Command (from railway.json):
```bash
cd backend && npm ci && npm run build
```

### Start Command (from railway.json):
```bash
cd backend && node ./dist/index.new.js
```

## 💡 Next Steps

1. **Check the actual build logs** in Railway dashboard
2. **Copy the error message** from the logs
3. **Match it to one of the errors above**
4. **Apply the fix**
5. **Redeploy**

---

**Please share the actual error message from Railway build logs for specific help!**
