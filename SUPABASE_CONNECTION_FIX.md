# 🔧 Supabase Connection Fix

**Your Project:** https://qsuvgagyfwwlputsnlkk.supabase.co

---

## 🎯 **Get Correct Connection String**

### **Step 1: Go to Supabase Dashboard**
1. Visit: https://supabase.com/dashboard/project/qsuvgagyfwwlputsnlkk
2. Login if needed

### **Step 2: Get Connection Pooler URL (for Vercel)**

1. In Supabase dashboard, click **"Project Settings"** (gear icon in sidebar)
2. Click **"Database"** in the left menu
3. Scroll to **"Connection string"** section
4. Select **"URI"** tab
5. **IMPORTANT:** Toggle to **"Connection pooler"** mode (not "Direct connection")
6. Copy the connection string

It should look like:
```
postgresql://postgres.qsuvgagyfwwlputsnlkk:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Note the differences:**
- ❌ OLD (Direct): `db.qsuvgagyfwwlputsnlkk.supabase.co:5432`
- ✅ NEW (Pooler): `aws-0-us-east-1.pooler.supabase.com:6543`

### **Step 3: Check if Project is Paused**

1. In Supabase dashboard, look for a "Paused" badge
2. If paused, click **"Restore project"** or **"Resume"**
3. Wait 1-2 minutes for database to start

---

## 🚀 **Update Vercel Environment Variable**

Once you have the correct pooler connection string:

```bash
cd /Users/ibnally/SafeNode/backend

# Remove old DATABASE_URL
vercel env rm DATABASE_URL production

# Add new DATABASE_URL (pooler connection)
vercel env add DATABASE_URL production
# Paste the NEW connection string when prompted

# Redeploy backend
vercel --prod
```

---

## 🗄️ **Run Database Migrations**

After updating Vercel, run migrations locally using the **direct connection** (port 5432):

```bash
cd /Users/ibnally/SafeNode/backend

# Use direct connection for migrations
DATABASE_URL="postgresql://postgres.qsuvgagyfwwlputsnlkk:[YOUR-PASSWORD]@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres?pgbouncer=true" npx prisma db push
```

**If the password doesn't work:**
1. Go to Supabase Dashboard → Database Settings
2. Look for "Reset database password" option
3. Reset password and use new one

---

## 🔍 **Connection String Comparison**

| Purpose | Connection Type | Port | URL Pattern |
|---------|----------------|------|-------------|
| **Local Development** | Direct | 5432 | `db.qsuvgagyfwwlputsnlkk.supabase.co:5432` |
| **Database Migrations** | Direct | 5432 | `db.qsuvgagyfwwlputsnlkk.supabase.co:5432` |
| **Vercel/Serverless** | Pooler | 6543 | `aws-0-us-east-1.pooler.supabase.com:6543` |

---

## ✅ **Quick Commands**

### **Test Direct Connection:**
```bash
psql "postgresql://postgres.qsuvgagyfwwlputsnlkk:[PASSWORD]@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres"
```

### **Test Pooler Connection:**
```bash
psql "postgresql://postgres.qsuvgagyfwwlputsnlkk:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

### **Run Migrations:**
```bash
cd backend
DATABASE_URL="<direct-connection-url>" npx prisma db push
```

### **Update Vercel:**
```bash
cd backend
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# Enter pooler connection URL
vercel --prod
```

---

## 🆘 **If Still Not Working**

### **Option A: Reset Database Password**
1. Supabase Dashboard → Database Settings
2. Click "Reset database password"
3. Copy new password
4. Update connection strings with new password

### **Option B: Check Database Status**
1. Supabase Dashboard → Home
2. Check if project shows "Active" or "Paused"
3. If paused, click "Restore"

### **Option C: Create New Supabase Project**
If all else fails, create a fresh project:
1. Supabase Dashboard → "New project"
2. Choose region close to you
3. Copy new connection strings
4. Update Vercel environment variables
5. Run migrations

---

## 📞 **Need the Password?**

The password is in your original connection string:
```
postgresql://postgres:nyxxeg-zipkuc-Nenzy3@db.qsuvgagyfwwlputsnlkk.supabase.co:5432/postgres
                      ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                      This is your password
```

Password: `nyxxeg-zipkuc-Nenzy3`

---

## 🎯 **What You Need to Do Right Now**

1. ✅ Go to https://supabase.com/dashboard/project/qsuvgagyfwwlputsnlkk
2. ✅ Check if project is paused → Resume if needed
3. ✅ Get pooler connection string (Project Settings → Database → Connection string → URI → Toggle "Connection pooler")
4. ✅ Run this command with the NEW pooler URL:
   ```bash
   cd /Users/ibnally/SafeNode/backend
   vercel env rm DATABASE_URL production
   vercel env add DATABASE_URL production
   # Paste pooler URL
   vercel --prod
   ```
5. ✅ Test backend: `curl https://backend-phi-bay.vercel.app/health`

---

**Once you get the pooler connection string, paste it here and I'll help you update everything!** 🚀
