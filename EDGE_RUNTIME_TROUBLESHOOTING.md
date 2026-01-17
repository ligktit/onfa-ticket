# Edge Runtime SSE Troubleshooting

## ❌ Error: "Network connection lost"

This error means the Edge Runtime proxy cannot connect to your backend server.

## 🔍 Common Causes

### 1. **BACKEND_URL Not Set in Vercel**

**Problem:** The `BACKEND_URL` environment variable is not configured in Vercel.

**Solution:**
1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add:
   ```
   Name: BACKEND_URL
   Value: https://your-backend.railway.app
   ```
   (Replace with your actual backend URL - **without** `/api` suffix)
3. **Redeploy** your application

### 2. **Backend URL Uses localhost**

**Problem:** `BACKEND_URL` is set to `http://localhost:5000` which doesn't work in production.

**Solution:**
- Use your production backend URL (Railway, Render, etc.)
- Example: `https://your-backend.railway.app`

### 3. **Backend Not Accessible**

**Problem:** Your backend server is not publicly accessible or is down.

**Solution:**
- Ensure your backend is deployed and running
- Test the backend SSE endpoint directly: `https://your-backend.railway.app/api/events`
- Check backend logs for errors

### 4. **CORS Issues**

**Problem:** Backend might be blocking requests from Vercel Edge Runtime.

**Solution:**
- Ensure your backend allows CORS from `*` or your Vercel domain
- Check backend CORS configuration

## ✅ How to Fix

### Step 1: Check Environment Variables

**In Vercel Dashboard:**
1. Go to **Project Settings** → **Environment Variables**
2. Verify `BACKEND_URL` is set
3. Value should be: `https://your-backend.railway.app` (no `/api` suffix)

### Step 2: Verify Backend URL Format

**Correct format:**
```
BACKEND_URL=https://your-backend.railway.app
```

**Wrong formats:**
```
BACKEND_URL=https://your-backend.railway.app/api  ❌ (has /api suffix)
BACKEND_URL=http://localhost:5000                 ❌ (localhost doesn't work in production)
BACKEND_URL=your-backend.railway.app               ❌ (missing https://)
```

### Step 3: Test Backend Directly

**Test your backend SSE endpoint:**
```bash
curl https://your-backend.railway.app/api/events
```

**Expected response:**
- Should start with `data: {"type":"connected"...}`
- Should keep connection open

### Step 4: Check Edge Runtime Logs

**In Vercel Dashboard:**
1. Go to **Deployments** → Latest deployment → **Functions** tab
2. Click on `/api/events`
3. Check **Runtime Logs** for errors

**Look for:**
- Connection errors
- Network errors
- Backend URL issues

## 🔧 Debugging Steps

### 1. Check Browser Console

**Look for:**
```
❌ SSE Error from server: Cannot connect to backend server at...
❌ Backend URL: https://your-backend.railway.app/api/events
💡 Suggestion: Ensure your backend is deployed and accessible...
```

### 2. Verify Environment Variable

**Add temporary logging in Edge Runtime:**
```javascript
// In api/events.js, add before fetch:
console.log('Backend URL:', backendSSEUrl);
```

**Check Vercel Function Logs** to see what URL is being used.

### 3. Test Backend Accessibility

**From your local machine:**
```bash
# Test if backend is accessible
curl https://your-backend.railway.app/api/events

# Should return SSE stream
```

**If this fails:**
- Backend is not accessible
- Check backend deployment status
- Verify backend URL is correct

## 📋 Checklist

- [ ] `BACKEND_URL` is set in Vercel environment variables
- [ ] `BACKEND_URL` uses `https://` (not `http://`)
- [ ] `BACKEND_URL` does NOT have `/api` suffix
- [ ] Backend is deployed and running
- [ ] Backend SSE endpoint works: `https://your-backend.railway.app/api/events`
- [ ] Backend allows CORS from Vercel
- [ ] Redeployed after setting environment variable

## 🎯 Expected Behavior After Fix

**Browser Console:**
```
✅ Connected to SSE server
✅ SSE URL: /api/events
✅ SSE connection established: SSE connection established (Edge Runtime Proxy)
```

**No errors:**
- No "Network connection lost"
- No "Cannot connect to backend"
- Connection stays open

## 🚀 Quick Fix

1. **Set environment variable:**
   ```
   BACKEND_URL=https://your-backend.railway.app
   ```

2. **Redeploy:**
   - Push to git, or
   - Go to Vercel Dashboard → Deployments → Redeploy

3. **Test:**
   - Open browser console
   - Check for connection success
   - Verify no errors

## 💡 Still Not Working?

1. **Check backend logs** - Is backend receiving requests?
2. **Check Vercel Function logs** - What errors are shown?
3. **Test backend directly** - Does `/api/events` work?
4. **Verify CORS** - Is backend allowing requests?
5. **Check network** - Can Vercel reach your backend?

## 📝 Notes

- Edge Runtime runs at Vercel's edge locations
- Must be able to reach your backend over HTTPS
- Backend must be publicly accessible
- Environment variables are injected at build time
- Must redeploy after changing environment variables
