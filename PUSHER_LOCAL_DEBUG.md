# Debugging Pusher Local vs Production Issue

## 🔍 Problem

When testing locally, the popup shows on the deployed app but not locally. This means your local environment is connecting to the **production** Pusher app instead of the local one.

## ✅ Solution

### Step 1: Check Your .env Files

#### Frontend (.env in project root)

Make sure you have **LOCAL** variables set:

```env
# ✅ CORRECT - Use LOCAL variables for local development
VITE_PUSHER_KEY_LOCAL=your-local-pusher-key
VITE_PUSHER_CLUSTER_LOCAL=us2

# ❌ WRONG - Don't use these for local (they're for production)
# VITE_PUSHER_KEY=your-prod-key  <-- This will connect to production!
# VITE_PUSHER_CLUSTER=us2
```

#### Backend (server/.env)

Make sure you have **LOCAL** variables set:

```env
# ✅ CORRECT - Use LOCAL variables for local development
PUSHER_APP_ID_LOCAL=your-local-app-id
PUSHER_KEY_LOCAL=your-local-key
PUSHER_SECRET_LOCAL=your-local-secret
PUSHER_CLUSTER_LOCAL=us2

# ❌ WRONG - Don't use these for local (they're for production)
# PUSHER_APP_ID=your-prod-app-id  <-- This will connect to production!
# PUSHER_KEY=your-prod-key
# PUSHER_SECRET=your-prod-secret
```

### Step 2: Check Console Logs

#### Frontend Console (Browser)

When you open the app locally, check the browser console. You should see:

```
🔍 Environment Detection:
  - import.meta.env.DEV: true
  - Detected as: LOCAL
🔍 Pusher Configuration:
  - Looking for: VITE_PUSHER_KEY_LOCAL
  - VITE_PUSHER_KEY_LOCAL: ✅ Set
🔌 Initializing Pusher connection for LOCAL environment...
🔌 Channel: check-ins-local
```

**If you see:**
- `Detected as: PRODUCTION` → Your `import.meta.env.DEV` is not working (check Vite config)
- `VITE_PUSHER_KEY_LOCAL: ❌ Not set` → Add it to your `.env` file
- `Channel: check-ins-prod` → You're connecting to production!

#### Backend Console (Terminal)

When you start the server, check the terminal. You should see:

```
🔍 Backend Environment Detection:
  - process.env.VERCEL: undefined
  - process.env.NODE_ENV: development
  - Detected as: LOCAL
🔌 Pusher initialized for LOCAL environment
🔌 Channel: check-ins-local
```

**If you see:**
- `Detected as: PRODUCTION` → Check your `NODE_ENV` variable
- `⚠️ WARNING: Using fallback PUSHER_KEY` → You need to set `PUSHER_KEY_LOCAL`
- `Channel: check-ins-prod` → You're using production Pusher!

### Step 3: Verify Pusher Apps

1. Go to [Pusher Dashboard](https://dashboard.pusher.com)
2. You should have **TWO** apps:
   - `onfa-ticket-local` (for local development)
   - `onfa-ticket-prod` (for production)

3. Make sure you're using the **LOCAL** app credentials in your `.env` files

### Step 4: Restart Everything

After updating `.env` files:

1. **Stop** your dev server (Ctrl+C)
2. **Restart** your dev server: `npm run dev` or `cd server && node server.js`
3. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check console logs again

## 🐛 Common Issues

### Issue 1: "Using fallback PUSHER_KEY"

**Problem**: You have `PUSHER_KEY` set but not `PUSHER_KEY_LOCAL`

**Solution**: 
- Remove `PUSHER_KEY` from local `.env` files (or rename it to `PUSHER_KEY_LOCAL`)
- Set `PUSHER_KEY_LOCAL` with your local Pusher app key

### Issue 2: "Detected as PRODUCTION" when running locally

**Problem**: `NODE_ENV` is set to `production` or `import.meta.env.DEV` is false

**Solution**:
- Check your `.env` file - make sure `NODE_ENV` is NOT set to `production`
- For Vite: `import.meta.env.DEV` should be `true` in dev mode
- Restart your dev server

### Issue 3: Frontend and Backend using different channels

**Problem**: One is using LOCAL, the other is using PRODUCTION

**Solution**:
- Check both frontend and backend console logs
- Make sure both show the same environment (LOCAL or PRODUCTION)
- Make sure both show the same channel name (`check-ins-local` or `check-ins-prod`)

## ✅ Quick Checklist

- [ ] Created separate Pusher apps: `onfa-ticket-local` and `onfa-ticket-prod`
- [ ] `.env` (project root) has `VITE_PUSHER_KEY_LOCAL` set
- [ ] `server/.env` has `PUSHER_KEY_LOCAL`, `PUSHER_APP_ID_LOCAL`, `PUSHER_SECRET_LOCAL` set
- [ ] Removed or commented out `VITE_PUSHER_KEY` and `PUSHER_KEY` from local `.env` files
- [ ] Console shows "Detected as: LOCAL"
- [ ] Console shows "Channel: check-ins-local"
- [ ] Restarted dev server after changing `.env` files
- [ ] Hard refreshed browser

## 🎯 Expected Behavior

### Local Development:
- Frontend connects to `check-ins-local` channel
- Backend publishes to `check-ins-local` channel
- Popup appears **only** in local browser
- Production app is **not** affected

### Production:
- Frontend connects to `check-ins-prod` channel
- Backend publishes to `check-ins-prod` channel
- Popup appears **only** in production browser
- Local app is **not** affected

## 📞 Still Having Issues?

1. Check all console logs (frontend + backend)
2. Verify Pusher Dashboard → Debug Console shows events on correct channel
3. Make sure you're using the correct Pusher app credentials
4. Double-check `.env` file names and locations:
   - Frontend: `.env` in project root
   - Backend: `server/.env`
