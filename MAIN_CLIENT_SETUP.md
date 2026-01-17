# Main Client (Approve Button) Setup for Production

## 🎯 Overview

The approve button in the check-in notification popup only appears on the "main client" (admin computer), not on mobile devices. This document explains how to configure it for production deployment.

## 🔧 How It Works

The system detects the main client using three methods (in order of priority):

1. **Environment Variable** (Recommended for Production)
   - Set `VITE_MAIN_CLIENT_DOMAIN` to your production domain
   - Most reliable method

2. **Localhost Detection** (Development)
   - Automatically detects `localhost` or `127.0.0.1`
   - Works automatically in development

3. **Mobile Device Detection** (Fallback)
   - Detects if device is mobile/tablet
   - Less reliable but works as fallback

## 📋 Setup Instructions

### Option 1: Environment Variable (Recommended)

**For Vercel Deployment:**

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add new variable:
   ```
   Name: VITE_MAIN_CLIENT_DOMAIN
   Value: your-app.vercel.app
   ```
   (Replace with your actual Vercel domain)

4. **Redeploy** your application

**For Other Platforms:**

Set the environment variable in your hosting platform's settings:
```env
VITE_MAIN_CLIENT_DOMAIN=yourdomain.com
```

**Local Development (.env file):**
```env
VITE_MAIN_CLIENT_DOMAIN=localhost
```

### Option 2: Use Mobile Detection (Automatic Fallback)

If you don't set `VITE_MAIN_CLIENT_DOMAIN`, the system will:
- Show approve button on desktop/laptop browsers
- Hide approve button on mobile devices (phone/tablet)

This works automatically but is less precise.

## ✅ Testing

### Development
- **Computer (localhost):** ✅ Approve button visible
- **Phone (network IP):** ❌ Approve button hidden

### Production
- **Computer (yourdomain.com):** ✅ Approve button visible (if `VITE_MAIN_CLIENT_DOMAIN` is set)
- **Phone (yourdomain.com):** ❌ Approve button hidden (mobile detection)

## 🎯 Recommended Setup

**Best Practice:**
1. Set `VITE_MAIN_CLIENT_DOMAIN` in production
2. This ensures only the specified domain shows approve button
3. More secure and reliable than mobile detection

**Example:**
```env
# Production (Vercel)
VITE_MAIN_CLIENT_DOMAIN=onfa-ticket.vercel.app

# Or custom domain
VITE_MAIN_CLIENT_DOMAIN=admin.onfa.com
```

## 🔍 How to Verify

**Check browser console:**
```javascript
// Check if main client is detected
console.log('Hostname:', window.location.hostname);
console.log('Is Main Client:', /* check the isMainClient prop */);
```

**Visual Check:**
- Main client: Should see "Phê Duyệt" (Approve) button
- Mobile device: Should only see "Đóng" (Close) button

## 🚀 Deployment Checklist

- [ ] Set `VITE_MAIN_CLIENT_DOMAIN` environment variable in production
- [ ] Verify approve button appears on computer
- [ ] Verify approve button is hidden on phone
- [ ] Test approve functionality works correctly

## 📝 Notes

- The approve button updates ticket status to `CHECKED_IN`
- After approval, data refreshes automatically
- Popup closes after successful approval
- If approval fails, error message is shown
