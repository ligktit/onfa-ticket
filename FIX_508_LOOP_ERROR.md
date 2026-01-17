# Fix 508 Loop Detected Error

## ❌ Error: "Backend SSE endpoint returned 508"

**HTTP 508 = Loop Detected**

This means the Edge Runtime proxy is trying to connect to **itself** (Vercel) instead of your backend server.

## 🔍 Root Cause

The `BACKEND_URL` environment variable is either:
1. **Not set** in Vercel
2. **Set incorrectly** to point to Vercel (`https://onfa-ticket.vercel.app`) instead of your backend

## ✅ Solution

### Step 1: Set Correct BACKEND_URL

**In Vercel Dashboard:**
1. Go to **Project Settings** → **Environment Variables**
2. **Remove** any incorrect `BACKEND_URL` that points to Vercel
3. **Add** the correct backend URL:
   ```
   Name: BACKEND_URL
   Value: https://your-backend.railway.app
   ```
   (Replace with your **actual backend server URL** - Railway, Render, DigitalOcean, etc.)

### Step 2: Verify Backend URL Format

**✅ Correct:**
```
BACKEND_URL=https://your-backend.railway.app
BACKEND_URL=https://your-backend.up.railway.app
BACKEND_URL=https://your-backend.onrender.com
```

**❌ Wrong (causes loop):**
```
BACKEND_URL=https://onfa-ticket.vercel.app          ❌ (Vercel frontend)
BACKEND_URL=https://onfa-ticket.vercel.app/api      ❌ (Vercel frontend)
BACKEND_URL=http://localhost:5000                   ❌ (localhost doesn't work)
```

### Step 3: Redeploy

**After setting the environment variable:**
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger redeploy

## 🔍 How to Find Your Backend URL

### If Backend is on Railway:
1. Go to Railway Dashboard
2. Select your backend project
3. Click **Settings** → **Networking**
4. Copy the **Public Domain** (e.g., `your-app.up.railway.app`)
5. Use: `https://your-app.up.railway.app`

### If Backend is on Render:
1. Go to Render Dashboard
2. Select your backend service
3. Copy the **URL** (e.g., `your-app.onrender.com`)
4. Use: `https://your-app.onrender.com`

### If Backend is on DigitalOcean:
1. Go to DigitalOcean Dashboard
2. Select your App Platform app
3. Copy the **Live URL**
4. Use that URL

## ✅ Verify It's Fixed

**After redeploying, check browser console:**

**✅ Success:**
```
✅ Connected to SSE server
✅ SSE connection established: SSE connection established (Edge Runtime Proxy)
```

**❌ Still broken:**
```
❌ Backend SSE endpoint returned 508
❌ Loop detected: Backend is connecting to Vercel...
```

## 🎯 Quick Checklist

- [ ] `BACKEND_URL` is set in Vercel environment variables
- [ ] `BACKEND_URL` points to your **backend server** (Railway/Render/etc.)
- [ ] `BACKEND_URL` does **NOT** point to Vercel (`vercel.app`)
- [ ] `BACKEND_URL` uses `https://` (not `http://`)
- [ ] `BACKEND_URL` does **NOT** have `/api` suffix
- [ ] Redeployed after setting environment variable

## 💡 Example Configuration

**Vercel Environment Variables:**
```
BACKEND_URL=https://onfa-ticket-backend.up.railway.app
```

**Frontend connects to:** `/api/events` (Edge Runtime proxy)

**Edge Runtime connects to:** `https://onfa-ticket-backend.up.railway.app/api/events` (Your backend)

**Result:** ✅ No loop, SSE works!

## 🐛 Still Getting 508?

1. **Check Vercel Function Logs:**
   - Go to **Deployments** → Latest → **Functions** tab
   - Click `/api/events`
   - Check **Runtime Logs** for the actual backend URL being used

2. **Verify Backend is Running:**
   ```bash
   curl https://your-backend.railway.app/api/events
   ```
   Should return SSE stream, not 404 or 500

3. **Check Environment Variable:**
   - Make sure `BACKEND_URL` is set for **Production** environment
   - Not just Preview/Development

4. **Clear Cache:**
   - Hard refresh browser (Ctrl+Shift+R)
   - Or clear browser cache

## 📝 Important Notes

- **Edge Runtime** runs at Vercel's edge locations
- Must connect to a **separate backend server** (Railway, Render, etc.)
- **Cannot** connect to Vercel itself (creates loop)
- Environment variables are injected at **build time**
- Must **redeploy** after changing environment variables
