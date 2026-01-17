# Troubleshooting Pusher Configuration

## ⚠️ Error: "Pusher key not configured"

This means `VITE_PUSHER_KEY` is not accessible to your frontend code.

## 🔍 Common Causes

### 1. Environment Variable Not Set in Vercel

**Check:**
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Look for `VITE_PUSHER_KEY`
3. If it's missing, add it

**Fix:**
- Add `VITE_PUSHER_KEY` with your Pusher Key value
- **Important:** Make sure it's set for the correct environment (Production/Preview/Development)

### 2. App Not Redeployed After Setting Variable

**Problem:** Vercel only injects environment variables at build time. If you set the variable after deployment, you need to redeploy.

**Fix:**
1. Set the environment variable in Vercel
2. Go to **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger redeploy

### 3. Wrong Environment Selected

**Problem:** Variable is set for one environment but you're viewing another.

**Fix:**
- In Vercel Environment Variables, make sure to set for:
  - ✅ **Production**
  - ✅ **Preview** 
  - ✅ **Development**

### 4. Local Development - Missing .env File

**For local development:**

Create `.env` file in project root:
```env
VITE_PUSHER_KEY=your-pusher-key-here
VITE_PUSHER_CLUSTER=us2
```

**Important:** 
- File must be named `.env` (not `.env.local` or `.env.development`)
- Must be in project root (same level as `package.json`)
- Restart dev server after creating/updating `.env`

### 5. Variable Name Typo

**Check for typos:**
- ✅ Correct: `VITE_PUSHER_KEY`
- ❌ Wrong: `PUSHER_KEY` (missing `VITE_` prefix)
- ❌ Wrong: `VITE_PUSHER_KEYS` (typo)

**Vite requires `VITE_` prefix** for frontend environment variables!

## ✅ Quick Fix Checklist

1. **Verify variable exists in Vercel:**
   - Go to Settings → Environment Variables
   - Look for `VITE_PUSHER_KEY`
   - Check value is correct

2. **Check environment:**
   - Make sure variable is set for Production/Preview/Development
   - Click the environment dropdown to verify

3. **Redeploy:**
   - After setting/changing variable, **redeploy**
   - Go to Deployments → Redeploy
   - Or push a commit

4. **Verify in build logs:**
   - Check deployment logs
   - Look for environment variables being injected
   - Should see `VITE_PUSHER_KEY` in build

5. **Test locally:**
   - Create `.env` file with `VITE_PUSHER_KEY=your-key`
   - Restart dev server: `npm run dev`
   - Check browser console

## 🔍 Debug Steps

### Check if Variable is Accessible

Add this temporarily to `AdminApp.jsx`:
```javascript
console.log('🔍 Environment check:', {
  VITE_PUSHER_KEY: import.meta.env.VITE_PUSHER_KEY,
  VITE_PUSHER_CLUSTER: import.meta.env.VITE_PUSHER_CLUSTER,
  allEnv: import.meta.env
});
```

**Expected output:**
```
🔍 Environment check: {
  VITE_PUSHER_KEY: "your-key-here",
  VITE_PUSHER_CLUSTER: "us2",
  ...
}
```

**If `VITE_PUSHER_KEY` is `undefined`:**
- Variable not set or not redeployed

### Check Vercel Build Logs

1. Go to **Deployments** → Latest deployment
2. Click **Build Logs**
3. Look for environment variables section
4. Verify `VITE_PUSHER_KEY` is listed

## 📝 Correct Setup

### In Vercel Dashboard:

**Environment Variables:**
```
VITE_PUSHER_KEY=your-pusher-key-here
VITE_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-pusher-key-here
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=us2
```

**Set for:** Production ✅ Preview ✅ Development ✅

### For Local Development:

**Create `.env` in project root:**
```env
VITE_PUSHER_KEY=your-pusher-key-here
VITE_PUSHER_CLUSTER=us2
```

**Restart dev server:**
```bash
npm run dev
```

## 🎯 Most Common Issue

**90% of the time:** Variable was set but app wasn't redeployed.

**Solution:** Always redeploy after setting/changing environment variables!

## ✅ After Fixing

You should see in browser console:
```
🔌 Initializing Pusher connection...
🔌 Pusher Key: abc123def4...
🔌 Pusher Cluster: us2
✅ Pusher connected
✅ Successfully subscribed to check-ins channel
```

No more warnings! 🎉
