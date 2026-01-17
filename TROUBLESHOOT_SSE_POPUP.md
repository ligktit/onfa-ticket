# Troubleshooting: No Popup on Computer After Phone Check-in

## Problem
- ✅ Phone scans QR code successfully
- ✅ Phone shows confirmation message
- ❌ Computer does NOT show popup notification

## 🔍 Diagnosis Steps

### Step 1: Check Backend Console

**When you check in from phone, look at backend console:**

**✅ GOOD - SSE clients connected:**
```
📨 ===== CHECK-IN EVENT =====
📨 Ticket ID: ONFA123456
📨 Connected SSE clients: 2
📨 Sending SSE event to 2 client(s)
  ✅ Sent to client 1
  ✅ Sent to client 2
📨 Successfully sent to 2 out of 2 client(s)
```

**❌ BAD - No SSE clients:**
```
📨 ===== CHECK-IN EVENT =====
📨 Ticket ID: ONFA123456
📨 Connected SSE clients: 0
⚠️ WARNING: No SSE clients connected!
```

**If you see "No SSE clients connected":**
- Computer browser is NOT connected to SSE
- Go to Step 2

### Step 2: Check Computer Browser Console

**Open browser console on computer (F12) and look for:**

**✅ GOOD - Connected:**
```
🔌 ===== SSE CONNECTION =====
🔌 Hostname: localhost
🔌 API_BASE_URL: http://localhost:5000
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE URL: http://localhost:5000/api/events
✅ SSE readyState: 1 (1 = OPEN)
```

**❌ BAD - Not connected:**
```
⚠️ SSE connection error: ...
⚠️ SSE readyState: 2 (2 = CLOSED)
```

**If you see connection errors:**
- SSE endpoint is not accessible
- Check Step 3

### Step 3: Test SSE Endpoint Directly

**On computer browser, go to:**
```
http://localhost:5000/api/events
```

**Expected:**
- Page keeps loading (this is normal - connection is open)
- Backend console shows: `✅ SSE client connected. Total clients: X`
- In browser DevTools → Network → Events tab, you'll see messages

**If this doesn't work:**
- Backend might not be running
- Port 5000 might be blocked
- Check Step 4

### Step 4: Verify Backend is Running

**Check backend console shows:**
```
🚀 Server đang chạy tại: http://localhost:5000
📨 SSE endpoint đã sẵn sàng tại: /api/events
```

**Test backend API:**
```
http://localhost:5000/api/stats
```
Should return JSON data.

## 🔧 Common Fixes

### Fix 1: Computer Browser Not Connected

**Symptoms:**
- Backend shows "Connected SSE clients: 0" or "Connected SSE clients: 1" (only phone)
- Computer browser console shows no SSE connection

**Solution:**
1. **Refresh computer browser** - SSE connection might have dropped
2. **Check browser console** - Look for connection errors
3. **Verify URL** - Should be `http://localhost:5000/api/events` (not network IP)

### Fix 2: SSE Connection Dropped

**Symptoms:**
- Computer was connected but connection closed
- Browser console shows: `⚠️ SSE connection closed`

**Solution:**
1. **Refresh the page** - SSE will reconnect automatically
2. **Check keepalive** - Should see `: keepalive` messages every 30 seconds
3. **Check network tab** - SSE connection should show as "pending" or "open"

### Fix 3: Wrong URL (Network IP vs Localhost)

**Symptoms:**
- Computer trying to connect to network IP but should use localhost
- Or vice versa

**Solution:**
The code auto-detects, but you can manually set in `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Then restart frontend: `npm run dev`

### Fix 4: Multiple Browsers/Tabs

**If you have multiple tabs open:**
- Each tab creates a separate SSE connection
- Backend should show multiple clients
- All tabs should receive the event

**Test:**
- Open 2 tabs on computer
- Backend should show "Connected SSE clients: 2"
- Check in from phone
- Both tabs should show popup

## 🧪 Quick Test

**Run this in computer browser console:**
```javascript
// Check if SSE is connected
console.log('SSE readyState:', sseEventSourceRef.current?.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSED

// Check connection URL
console.log('SSE URL:', sseEventSourceRef.current?.url);

// Test manual event
fetch('http://localhost:5000/api/test-sse', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Test result:', data);
    console.log('Clients connected:', data.clients);
  });
```

**Expected:**
- `readyState: 1` (OPEN)
- `Clients connected: 2` (or more if multiple tabs)

## ✅ Success Checklist

- [ ] Backend shows "Connected SSE clients: 2" (or more)
- [ ] Computer browser console shows "✅ Connected to SSE server"
- [ ] Computer browser console shows "✅ SSE readyState: 1"
- [ ] Backend console shows "✅ Sent to client X" when checking in
- [ ] Computer browser console shows "📨 Received SSE message" when checking in
- [ ] Popup appears on computer

## 🎯 Most Likely Issue

**If phone works but computer doesn't:**

1. **Computer browser SSE connection is not established**
   - Check browser console for connection errors
   - Refresh the page to reconnect

2. **Computer browser is connecting to wrong URL**
   - Should be `http://localhost:5000/api/events` (not network IP)
   - Check browser console log for actual URL

3. **SSE connection dropped**
   - Refresh computer browser
   - Check if keepalive messages are being received

## 📊 Debug Output Example

**When working correctly, you should see:**

**Backend:**
```
✅ SSE client connected. Total clients: 1
✅ SSE client connected. Total clients: 2
📨 ===== CHECK-IN EVENT =====
📨 Connected SSE clients: 2
📨 Sending SSE event to 2 client(s)
  ✅ Sent to client 1
  ✅ Sent to client 2
📨 Successfully sent to 2 out of 2 client(s)
```

**Computer Browser:**
```
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE readyState: 1 (1 = OPEN)
📨 Received SSE message: {"type":"ticket-checked-in","data":{...}}
🎫 Processing ticket-checked-in event: {...}
📢 Received check-in notification: {...}
```

If you see all of these, the popup should appear! 🎉
