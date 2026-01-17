# Pusher Real-Time Setup Guide (Vercel Only)

## 🎯 Overview

Pusher provides real-time notifications without needing a separate backend server. Everything runs on Vercel using serverless functions - no separate backend deployment needed!

## 📋 Prerequisites

1. **Pusher Account** - Sign up at [pusher.com](https://pusher.com) (free tier available)
2. **Vercel Deployment** - Your app deployed on Vercel (frontend + API routes)

## 🚀 Step 1: Create Pusher App

1. Go to [pusher.com](https://pusher.com) and sign up/login
2. Click **"Create app"** or go to Dashboard
3. Fill in:
   - **App name:** `onfa-ticket` (or any name)
   - **Cluster:** Choose closest to you (e.g., `us2`, `eu`, `ap1`)
   - **Front-end tech:** React
   - **Back-end tech:** Node.js
4. Click **"Create app"**

## 🔑 Step 2: Get Pusher Credentials

After creating the app, you'll see:

- **App ID**
- **Key** (public)
- **Secret** (private - keep secure!)
- **Cluster** (e.g., `us2`)

**Save these credentials** - you'll need them in the next steps.

## ⚙️ Step 3: Install Dependencies

### Frontend (already done)
```bash
npm install pusher-js
```

### Backend (already done)
```bash
cd server
npm install pusher
```

## 🔧 Step 4: Configure Frontend

### Set Environment Variables

**In Vercel Dashboard:**
1. Go to **Project Settings** → **Environment Variables**
2. Add:
   ```
   Name: VITE_PUSHER_KEY
   Value: your-pusher-key-here
   ```
   ```
   Name: VITE_PUSHER_CLUSTER
   Value: us2
   ```
   (Replace `us2` with your cluster if different)

**For Local Development:**
Create `.env` file in project root:
```env
VITE_PUSHER_KEY=your-pusher-key-here
VITE_PUSHER_CLUSTER=us2
```

## 🔧 Step 5: Configure Vercel Serverless Functions

### Set Environment Variables in Vercel

**All configuration is in Vercel - no separate backend needed!**

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add these variables (same as frontend, plus secret):
   ```
   Name: PUSHER_APP_ID
   Value: your-app-id
   ```
   ```
   Name: PUSHER_KEY
   Value: your-pusher-key
   ```
   ```
   Name: PUSHER_SECRET
   Value: your-pusher-secret
   ```
   ```
   Name: PUSHER_CLUSTER
   Value: us2
   ```

**Important:** Set these for **Production**, **Preview**, and **Development** environments.

**For Local Development:**
Create `.env.local` file in project root:
```env
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
PUSHER_CLUSTER=us2
```

## ✅ Step 6: Verify Setup

### Test Frontend Connection

1. Open browser console
2. You should see:
   ```
   🔌 Initializing Pusher connection...
   ✅ Pusher connected
   ✅ Successfully subscribed to check-ins channel
   ```

### Test Vercel Function Publishing

1. Check-in a ticket
2. Check Vercel Function Logs:
   - Go to **Deployments** → Latest → **Functions** tab
   - Click `/api/checkin`
   - Check **Runtime Logs** for:
     ```
     ✅ Pusher event published: ticket-checked-in for TICKET_ID
     ```
3. Frontend should show notification popup immediately

## 🎯 How It Works

### Flow:

1. **Vercel Serverless Function publishes event:**
   ```javascript
   // In /api/checkin.js
   await pusher.trigger('check-ins', 'ticket-checked-in', eventData);
   ```

2. **Frontend subscribes:**
   ```javascript
   // In AdminApp.jsx
   const channel = pusher.subscribe('check-ins');
   channel.bind('ticket-checked-in', (data) => {
     // Show notification
   });
   ```

3. **Pusher handles delivery:**
   - WebSocket connection
   - Automatic reconnection
   - Message delivery guarantee

## 🔍 Troubleshooting

### Frontend: "Pusher key not configured"

**Solution:**
- Check `VITE_PUSHER_KEY` is set in Vercel
- Redeploy after setting environment variable
- For local dev, check `.env` file exists

### Vercel Function: "Pusher credentials not configured"

**Solution:**
- Check all 4 Pusher env vars are set in Vercel:
  - `PUSHER_APP_ID`
  - `PUSHER_KEY`
  - `PUSHER_SECRET`
  - `PUSHER_CLUSTER`
- **Redeploy** after setting environment variables
- Check Vercel Function logs for Pusher errors

### No notifications appearing

**Check:**
1. Browser console for Pusher connection status
2. Backend console for event publishing
3. Pusher Dashboard → Debug Console (see events)

### Connection errors

**Common issues:**
- Wrong cluster (check `VITE_PUSHER_CLUSTER` matches backend)
- Wrong credentials (double-check all values)
- Network/firewall blocking Pusher

## 📊 Pusher Dashboard

**Monitor your app:**
1. Go to Pusher Dashboard
2. Click your app
3. See:
   - **Channels** - Active channels
   - **Events** - Events being sent
   - **Debug Console** - Real-time event log
   - **Metrics** - Connection stats

## 💰 Pricing

**Free Tier:**
- 200,000 messages/day
- 100 concurrent connections
- Unlimited channels
- Perfect for development/small apps

**Paid Plans:**
- Start at $49/month
- More messages, connections
- Priority support

## 🔒 Security

### Frontend (Public Key)
- `VITE_PUSHER_KEY` is **public** - safe to expose
- Used for connecting to Pusher

### Backend (Secret)
- `PUSHER_SECRET` is **private** - never expose!
- Used for authenticating event publishing
- Only backend should have this

## ✅ Benefits Over SSE/Polling

1. **True real-time** - Instant notifications (0 delay)
2. **Works on Vercel** - No separate backend needed for connections
3. **Reliable** - Automatic reconnection, message delivery
4. **Scalable** - Handles thousands of connections
5. **Easy debugging** - Pusher Dashboard shows everything

## 📝 Code Changes Summary

### Frontend (`AdminApp.jsx`):
- ✅ Removed polling
- ✅ Added Pusher client connection
- ✅ Subscribes to `check-ins` channel
- ✅ Listens for `ticket-checked-in` events

### Vercel Serverless Function (`api/checkin.js`):
- ✅ Added Pusher server initialization
- ✅ Publishes events on check-in
- ✅ Uses `pusher.trigger()` in serverless function
- ✅ No separate backend needed!

## 🎉 You're Done!

After setting environment variables and redeploying:
- ✅ Real-time notifications work instantly
- ✅ No polling needed
- ✅ Works perfectly on Vercel
- ✅ No separate backend for connections

## 🆘 Need Help?

1. Check Pusher Dashboard → Debug Console
2. Check browser console for errors
3. Check backend console for errors
4. Verify all environment variables are set
5. Ensure cluster matches in frontend and backend
