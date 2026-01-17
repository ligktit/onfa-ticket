# Edge Runtime SSE Setup

## ✅ What Was Implemented

Created an **Edge Runtime SSE proxy endpoint** (`api/events.js`) that:
- Uses Vercel Edge Runtime for better streaming support
- Proxies SSE connections to your backend server
- Works on Vercel deployment

## 🔧 How It Works

### Architecture

```
Frontend (Vercel) 
  → Edge Runtime Proxy (/api/events)
    → Backend Server (Railway/Render/etc.)
      → SSE Stream
```

**Flow:**
1. Frontend connects to `/api/events` (Edge Runtime)
2. Edge Runtime connects to backend SSE endpoint
3. Edge Runtime streams data from backend to frontend
4. Real-time notifications work!

## 📋 Setup Instructions

### Step 1: Set Backend URL Environment Variable

**In Vercel Dashboard:**
1. Go to **Project Settings** → **Environment Variables**
2. Add:
   ```
   Name: BACKEND_URL
   Value: https://your-backend.railway.app
   ```
   (Or your backend URL - without `/api` suffix)

3. **Redeploy** your application

### Step 2: Verify Configuration

**vercel.json** is configured:
```json
{
  "functions": {
    "api/events.js": {
      "runtime": "edge"
    }
  }
}
```

This ensures `api/events.js` uses Edge Runtime.

### Step 3: Deploy

```bash
git add .
git commit -m "Add Edge Runtime SSE proxy"
git push
```

Vercel will automatically deploy and use Edge Runtime.

## 🎯 How It Works

### On Vercel (Production):
- Frontend connects to `/api/events` (relative URL)
- Edge Runtime proxy connects to backend
- SSE streams through Edge Runtime
- Real-time notifications work! ✅

### On Local Development:
- Frontend connects directly to backend (`http://localhost:5000/api/events`)
- No proxy needed
- SSE works directly ✅

## 🔍 Testing

### Check Browser Console:

**On Vercel:**
```
🔌 Is Vercel: true
🔌 Connecting to SSE endpoint: /api/events
✅ Connected to SSE server
✅ SSE connection established: SSE connection established (Edge Runtime Proxy)
```

**On Local:**
```
🔌 Is Vercel: false
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
```

## ⚠️ Important Notes

### Edge Runtime Limitations:
- **Execution time limits** - May timeout after 30-60 seconds
- **No Node.js APIs** - Can't use Express, MongoDB directly
- **Streaming support** - Better than Node.js runtime, but still limited

### Backend Requirements:
- Backend must be deployed separately (Railway/Render/etc.)
- Backend must support SSE (`/api/events` endpoint)
- Backend must be accessible from Edge Runtime (public URL)

## 🚀 Environment Variables

**Required in Vercel:**
```env
BACKEND_URL=https://your-backend.railway.app
```

**Optional (if BACKEND_URL not set):**
```env
VITE_API_URL=https://your-backend.railway.app/api
```

Edge Runtime will use `BACKEND_URL` first, then fall back to `VITE_API_URL`.

## ✅ Benefits of Edge Runtime

1. **Better streaming** - Edge Runtime handles streams better than Node.js runtime
2. **Lower latency** - Runs closer to users (edge locations)
3. **No cold starts** - Faster than serverless functions
4. **Streaming support** - Can proxy SSE connections

## 🐛 Troubleshooting

### Edge Runtime not working?

1. **Check vercel.json:**
   - Ensure `api/events.js` is configured for Edge Runtime
   - Redeploy after changes

2. **Check environment variables:**
   - `BACKEND_URL` must be set in Vercel
   - Backend URL must be accessible (public)

3. **Check backend:**
   - Backend `/api/events` endpoint must be working
   - Test backend SSE endpoint directly

4. **Check browser console:**
   - Look for connection errors
   - Verify Edge Runtime proxy is being used

## 📊 Expected Behavior

**If Edge Runtime works:**
- ✅ Connection stays open
- ✅ Keepalive messages received
- ✅ Events received in real-time
- ✅ No timeouts (or very long timeouts)

**If Edge Runtime times out:**
- ⚠️ Connection closes after 30-60 seconds
- ⚠️ Automatic reconnection attempts
- ⚠️ Falls back to polling
- ✅ Graceful degradation

## 🎉 Summary

Edge Runtime proxy allows SSE to work on Vercel by:
- Proxying connections to your backend
- Streaming data through Edge Runtime
- Providing better performance than Node.js runtime

**Try it and see if Edge Runtime works better!** 🚀
