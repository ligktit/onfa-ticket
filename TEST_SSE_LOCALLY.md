# Testing Server-Sent Events (SSE) Locally

## 🎯 Quick Test Methods

### Method 1: Test SSE Endpoint Directly (Easiest)

**1. Start your backend server:**
```bash
cd server
npm start
```

**2. Open browser and go to:**
```
http://localhost:5000/api/events
```

**What you should see:**
- Browser shows a loading/spinning indicator (connection is open)
- In browser DevTools → Network tab → Events tab, you'll see SSE messages
- You should see: `data: {"type":"connected","message":"SSE connection established"}`

**3. Check backend console:**
```
✅ SSE client connected. Total clients: 1
```

**4. Test sending an event:**
- Check in a ticket from another browser/device
- You should see new messages appear in the SSE stream

---

### Method 2: Force SSE in Development Mode

**Temporarily modify `src/pages/AdminApp.jsx`:**

Change this line:
```javascript
if (import.meta.env.DEV) {
```

To:
```javascript
if (false) { // Temporarily disable Socket.IO to test SSE
```

**Then:**
1. Restart frontend: `npm run dev`
2. Open browser console
3. Look for: `✅ Connected to SSE server`
4. Check backend console: `✅ SSE client connected`

**Remember to revert the change after testing!**

---

### Method 3: Build for Production and Test Locally

**1. Build the frontend:**
```bash
npm run build
```

**2. Preview production build:**
```bash
npm run preview
```

**3. Open browser:**
```
http://localhost:4173/admin/login
```

**4. Check console:**
- Should see: `✅ Connected to SSE server`
- Backend should show: `✅ SSE client connected`

---

## ✅ What to Look For

### Browser Console (Frontend)

**Success indicators:**
```
ℹ️ Production mode: Using Server-Sent Events (SSE) for real-time notifications
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE connection established: SSE connection established
```

**Error indicators:**
```
⚠️ SSE connection error: [error details]
⚠️ Falling back to polling for updates.
```

### Backend Console (Server)

**Success indicators:**
```
✅ SSE client connected. Total clients: 1
```

**When ticket is checked in:**
```
✅ SSE client connected. Total clients: 1
[No specific message, but event is sent]
```

**When client disconnects:**
```
❌ SSE client disconnected. Total clients: 0
```

### Browser DevTools

**1. Open DevTools (F12)**
**2. Go to Network tab**
**3. Filter by "events" or look for `/api/events`**
**4. Click on the request**
**5. Go to "EventStream" tab (if available) or "Response" tab**

**You should see:**
```
data: {"type":"connected","message":"SSE connection established"}

: keepalive

data: {"type":"ticket-checked-in","data":{...}}
```

---

## 🧪 Test Scenarios

### Test 1: Connection Established

**Steps:**
1. Start backend: `npm start`
2. Open browser to frontend
3. Check console for connection messages

**Expected:**
- ✅ Browser console: `✅ Connected to SSE server`
- ✅ Backend console: `✅ SSE client connected. Total clients: 1`

---

### Test 2: Receive Check-in Event

**Steps:**
1. Open admin panel in Browser 1 (SSE connected)
2. Open admin panel in Browser 2 (or use phone)
3. Check in a ticket from Browser 2
4. Watch Browser 1 for notification popup

**Expected:**
- ✅ Browser 1 console: `📢 Received check-in notification: {...}`
- ✅ Browser 1 shows notification popup
- ✅ Ticket list updates automatically

---

### Test 3: Keepalive Messages

**Steps:**
1. Connect to SSE
2. Wait 30 seconds
3. Check browser DevTools → Network → Events

**Expected:**
- ✅ See `: keepalive` messages every 30 seconds
- ✅ Connection stays open

---

### Test 4: Reconnection

**Steps:**
1. Connect to SSE
2. Stop backend server (Ctrl+C)
3. Restart backend server
4. Watch browser console

**Expected:**
- ⚠️ Browser shows connection error
- ✅ Browser automatically reconnects when server restarts
- ✅ Backend shows: `✅ SSE client connected`

---

## 🔍 Debugging Tips

### Check SSE Endpoint Manually

**Using curl (PowerShell/Command Prompt):**
```bash
curl -N http://localhost:5000/api/events
```

**You should see:**
```
data: {"type":"connected","message":"SSE connection established"}

: keepalive

: keepalive
...
```

**Using browser:**
- Just navigate to `http://localhost:5000/api/events`
- Page will keep loading (this is normal - connection is open)
- Check DevTools → Network → Events tab

---

### Check if SSE Clients Are Connected

**Backend console shows:**
```
✅ SSE client connected. Total clients: 1
✅ SSE client connected. Total clients: 2  (if multiple browsers)
```

**If you see `Total clients: 0`, SSE is not connected.**

---

### Common Issues

**Issue: SSE not connecting**
- ✅ Check backend is running: `http://localhost:5000/api/stats`
- ✅ Check CORS headers in backend
- ✅ Check browser console for errors
- ✅ Try accessing SSE endpoint directly: `http://localhost:5000/api/events`

**Issue: Events not received**
- ✅ Check backend console shows SSE client connected
- ✅ Check browser console for connection messages
- ✅ Verify event is being sent (check backend logs when checking in ticket)
- ✅ Check Network tab → Events tab in DevTools

**Issue: Connection closes immediately**
- ✅ Check keepalive is working (should see `: keepalive` every 30s)
- ✅ Check firewall isn't blocking connection
- ✅ Check backend isn't crashing

---

## 📊 Expected Console Output

### Backend Console (When Working)
```
🚀 Server đang chạy tại: http://localhost:5000
📡 Socket.IO server đã sẵn sàng (development mode)
📨 SSE endpoint đã sẵn sàng tại: /api/events (production/Vercel compatible)
🌐 Network access: http://[your-ip]:5000
✅ SSE client connected. Total clients: 1
```

### Frontend Console (When Working - Production Mode)
```
ℹ️ Production mode: Using Server-Sent Events (SSE) for real-time notifications
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE connection established: SSE connection established
📢 Received check-in notification: {ticketId: "...", name: "...", ...}
```

---

## 🎯 Quick Verification Checklist

- [ ] Backend running: `http://localhost:5000/api/stats` returns JSON
- [ ] SSE endpoint accessible: `http://localhost:5000/api/events` shows loading
- [ ] Backend console shows: `✅ SSE client connected`
- [ ] Browser console shows: `✅ Connected to SSE server`
- [ ] DevTools Network tab shows SSE connection
- [ ] Keepalive messages appear every 30 seconds
- [ ] Check-in event triggers notification popup

---

## 💡 Pro Tip: Test Both Socket.IO and SSE

**To compare Socket.IO vs SSE:**

1. **Test Socket.IO (dev mode):**
   - Run: `npm run dev`
   - Check console: `✅ Connected to Socket.IO server`

2. **Test SSE (production mode):**
   - Run: `npm run build && npm run preview`
   - Check console: `✅ Connected to SSE server`

Both should work identically for notifications!
