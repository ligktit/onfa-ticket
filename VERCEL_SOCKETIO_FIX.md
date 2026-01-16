# Socket.IO Configuration

## Current Setup

**Socket.IO is now disabled in production** and only enabled in development mode.

- ✅ **Development:** Socket.IO enabled for real-time notifications
- ✅ **Production:** Socket.IO disabled, uses polling fallback (every 60 seconds)

## Why?

**Vercel serverless functions don't support WebSocket connections**, which Socket.IO requires for real-time communication. Instead of trying to connect and failing, Socket.IO is now completely disabled in production.

## Solutions

### Option 1: Use Separate WebSocket Server (Recommended for Production)

Deploy your backend to a platform that supports WebSockets:

**Railway (Recommended):**
1. Sign up at https://railway.app
2. Create new project → Deploy from GitHub
3. Select your `server` directory
4. Set environment variables
5. Railway provides persistent WebSocket support
6. Update `VITE_SOCKET_URL` to your Railway URL

**Render:**
1. Sign up at https://render.com
2. Create new Web Service
3. Deploy your backend
4. Render supports WebSockets

**Other Options:**
- DigitalOcean App Platform
- Heroku
- AWS EC2
- Google Cloud Run (with WebSocket support)

### Option 2: Use Polling Fallback (Current Behavior - Default)

**This is now the default behavior in production:**
- Socket.IO is automatically disabled in production
- Real-time popups won't work in production
- Dashboard will refresh every 60 seconds automatically
- All features still work, just not real-time

**No configuration needed** - this is already implemented!

## Current Behavior

The app is configured to:
1. ✅ **Development:** Socket.IO enabled for real-time notifications
2. ✅ **Production:** Socket.IO disabled, uses polling (every 60 seconds)
3. ✅ No connection errors in production (Socket.IO never attempts to connect)
4. ✅ All features work normally in both modes

## Recommended Setup for Production

**Frontend:** Deploy to Vercel (works great!)
**Backend:** Deploy to Railway/Render (for WebSocket support)

**Environment Variables:**

**Vercel (Frontend):**
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
```

**Railway (Backend):**
- Same environment variables as local development
- MongoDB connection string
- n8n webhook URLs (if using)

## Testing

1. **Local Development (`npm run dev`):** Socket.IO enabled ✅
2. **Production Build (`npm run build`):** Socket.IO disabled ✅
3. **Vercel Deployment:** Socket.IO disabled (no connection attempts) ✅

## Summary

- ✅ **Development:** Socket.IO enabled for real-time notifications
- ✅ **Production:** Socket.IO disabled, uses polling fallback
- ✅ **No errors:** Socket.IO never attempts to connect in production
- ✅ **All features work:** Polling ensures data stays up-to-date

**No WebSocket errors in production** - Socket.IO is completely disabled!
