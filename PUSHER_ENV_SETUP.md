# Pusher Environment Setup - Local vs Production

## 🎯 Overview

This guide explains how to set up **separate Pusher apps** for local development and production deployment. This prevents mixing events between environments and ensures you don't accidentally trigger production notifications during local testing.

## 🔑 Why Separate Pusher Apps?

1. **Avoid Confusion**: Local testing won't trigger production notifications
2. **Isolation**: Production events won't appear in local development
3. **Safety**: Prevents accidental data mixing between environments
4. **Debugging**: Easier to debug when environments are clearly separated

## 📋 Step 1: Create Two Pusher Apps

### Create Local Development App

1. Go to [pusher.com](https://pusher.com) and sign up/login
2. Click **"Create app"**
3. Fill in:
   - **App name:** `onfa-ticket-local`
   - **Cluster:** Choose closest to you (e.g., `us2`, `eu`, `ap1`)
   - **Front-end tech:** React
   - **Back-end tech:** Node.js
4. Click **"Create app"**
5. **Save the credentials**:
   - App ID
   - Key
   - Secret
   - Cluster

### Create Production App

1. In Pusher Dashboard, click **"Create app"** again
2. Fill in:
   - **App name:** `onfa-ticket-prod`
   - **Cluster:** Same as local (or different if needed)
   - **Front-end tech:** React
   - **Back-end tech:** Node.js
3. Click **"Create app"**
4. **Save the credentials** (you'll use these in Vercel)

## 🔧 Step 2: Configure Local Development

### Backend (server/.env)

Create or update `server/.env` file:

```env
# Local Pusher Configuration
PUSHER_APP_ID_LOCAL=your-local-app-id
PUSHER_KEY_LOCAL=your-local-key
PUSHER_SECRET_LOCAL=your-local-secret
PUSHER_CLUSTER_LOCAL=us2
```

### Frontend (.env in project root)

Create or update `.env` file in the project root:

```env
# Local Pusher Configuration
VITE_PUSHER_KEY_LOCAL=your-local-key
VITE_PUSHER_CLUSTER_LOCAL=us2
```

**Note**: Frontend only needs the KEY and CLUSTER (not App ID or Secret)

## 🚀 Step 3: Configure Production (Vercel)

### Backend Environment Variables

In **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**, add:

```
PUSHER_APP_ID_PROD=your-prod-app-id
PUSHER_KEY_PROD=your-prod-key
PUSHER_SECRET_PROD=your-prod-secret
PUSHER_CLUSTER_PROD=us2
```

**Important**: Set these for **Production**, **Preview**, and **Development** environments.

### Frontend Environment Variables

In the same Vercel Environment Variables section, add:

```
VITE_PUSHER_KEY_PROD=your-prod-key
VITE_PUSHER_CLUSTER_PROD=us2
```

**Important**: Set these for **Production**, **Preview**, and **Development** environments.

## ✅ Step 4: Verify Setup

### Check Local Environment

1. Start your local server: `npm run dev` (or `cd server && node server.js`)
2. Check console logs - you should see:
   ```
   🔌 Pusher initialized for LOCAL environment
   🔌 Channel: check-ins-local
   🔌 App ID: xxxxxxxx...
   ```

3. Open browser console - you should see:
   ```
   🔌 Initializing Pusher connection for LOCAL environment...
   🔌 Channel: check-ins-local
   ```

### Check Production Environment

1. Deploy to Vercel
2. Check Vercel Function Logs - you should see:
   ```
   🔌 Pusher initialized for PRODUCTION environment
   🔌 Channel: check-ins-prod
   ```

3. Open browser console on production site - you should see:
   ```
   🔌 Initializing Pusher connection for PRODUCTION environment...
   🔌 Channel: check-ins-prod
   ```

## 📊 Channel Names

The code automatically uses different channel names:

- **Local**: `check-ins-local`
- **Production**: `check-ins-prod`

This ensures complete isolation between environments.

## 🔍 Troubleshooting

### "Pusher credentials not configured"

**Local:**
- Check `server/.env` has `PUSHER_APP_ID_LOCAL`, `PUSHER_KEY_LOCAL`, `PUSHER_SECRET_LOCAL`
- Check `.env` (project root) has `VITE_PUSHER_KEY_LOCAL`, `VITE_PUSHER_CLUSTER_LOCAL`
- Restart your dev server after adding env vars

**Production:**
- Check Vercel Environment Variables are set with `_PROD` suffix
- Redeploy after setting environment variables
- Check Vercel Function logs for errors

### Events not appearing

**Check:**
1. Verify you're using the correct Pusher app credentials
2. Check Pusher Dashboard → Debug Console
3. Verify channel names match (`check-ins-local` vs `check-ins-prod`)
4. Check console logs for environment detection

### Wrong environment detected

The code detects environment using:
- **Production**: `process.env.VERCEL` or `process.env.NODE_ENV === 'production'`
- **Local**: Everything else

If detection is wrong, you can force it by setting:
- `NODE_ENV=production` for production
- `NODE_ENV=development` for local

## 🔄 Fallback Behavior

If `_LOCAL` or `_PROD` variants are not set, the code falls back to:
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`

This maintains backward compatibility with existing setups.

## 📝 Summary

✅ **Local Development**:
- Uses `PUSHER_*_LOCAL` env vars
- Channel: `check-ins-local`
- Pusher App: `onfa-ticket-local`

✅ **Production**:
- Uses `PUSHER_*_PROD` env vars (in Vercel)
- Channel: `check-ins-prod`
- Pusher App: `onfa-ticket-prod`

This ensures complete separation and prevents any mixing of events between environments!
