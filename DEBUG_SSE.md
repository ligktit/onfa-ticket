# Debugging SSE (Server-Sent Events)

## ✅ What I Fixed

1. **Added `res.flushHeaders()`** - Ensures headers are sent immediately
2. **Added response validation** - Checks if response is still writable before sending
3. **Enhanced logging** - More detailed logs on both server and client
4. **Added test endpoint** - `/api/test-sse` to manually trigger events

## 🧪 Testing Steps

### Step 1: Start Backend
```bash
cd server
npm start
```

**Expected output:**
```
🚀 Server đang chạy tại: http://localhost:5000
📨 SSE endpoint đã sẵn sàng tại: /api/events
🌐 Network access: http://[your-ip]:5000
```

### Step 2: Start Frontend
```bash
npm run dev
```

**Open browser console and look for:**
```
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE connection established: SSE connection established
```

**Backend console should show:**
```
✅ SSE client connected. Total clients: 1
```

### Step 3: Test SSE Connection Manually

**Open a new browser tab and go to:**
```
http://localhost:5000/api/events
```

**You should see:**
- Page keeps loading (this is normal - connection is open)
- In DevTools → Network → Events tab, you'll see messages

**Backend console should show:**
```
✅ SSE client connected. Total clients: 2
```

### Step 4: Test Manual SSE Event

**In another terminal or Postman, send POST request:**
```bash
curl -X POST http://localhost:5000/api/test-sse
```

**Or use browser console:**
```javascript
fetch('http://localhost:5000/api/test-sse', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

**Expected:**
- Backend console: `🧪 Test: Sending SSE event to X client(s)`
- Browser console: `📨 Received SSE message: ...`
- Notification popup should appear!

### Step 5: Test Real Check-in

1. **Open admin panel in Browser 1** (SSE connected)
2. **Open admin panel in Browser 2** (or use phone)
3. **Check in a ticket from Browser 2**
4. **Watch Browser 1** - should show notification popup!

**Backend console should show:**
```
📨 Sending SSE event to 2 client(s): ticket-checked-in for ONFA123456
  ✅ Sent to client 1
  ✅ Sent to client 2
✅ SSE event sent. Remaining clients: 2
```

**Browser console should show:**
```
📨 Received SSE message: {"type":"ticket-checked-in","data":{...}}
📨 Parsed message: {type: "ticket-checked-in", data: {...}}
🎫 Processing ticket-checked-in event: {...}
📢 Received check-in notification: {...}
```

## 🔍 Debugging Checklist

### Check SSE Connection

**Browser Console:**
- [ ] `✅ Connected to SSE server`
- [ ] `✅ SSE connection established`
- [ ] No connection errors

**Backend Console:**
- [ ] `✅ SSE client connected. Total clients: X`
- [ ] Number increases when you open more tabs

### Check Event Sending

**When checking in a ticket:**

**Backend Console:**
- [ ] `📨 Sending SSE event to X client(s)`
- [ ] `✅ Sent to client 1`, `✅ Sent to client 2`, etc.
- [ ] `✅ SSE event sent. Remaining clients: X`

**Browser Console:**
- [ ] `📨 Received SSE message: ...`
- [ ] `📨 Parsed message: ...`
- [ ] `🎫 Processing ticket-checked-in event: ...`
- [ ] `📢 Received check-in notification: ...`

**UI:**
- [ ] Notification popup appears
- [ ] Ticket list updates automatically

## 🐛 Common Issues

### Issue: SSE Not Connecting

**Symptoms:**
- Browser console shows connection errors
- Backend doesn't show "SSE client connected"

**Solutions:**
1. Check backend is running: `http://localhost:5000/api/stats`
2. Check CORS headers in backend
3. Try accessing SSE endpoint directly: `http://localhost:5000/api/events`
4. Check browser console for errors
5. Verify URL is correct (check browser console log)

### Issue: Events Not Received

**Symptoms:**
- SSE connects successfully
- But no events received when checking in

**Solutions:**
1. Check backend console shows "Sending SSE event"
2. Check backend console shows "Sent to client X"
3. Check browser console for received messages
4. Verify event format matches (check logs)
5. Try test endpoint: `POST /api/test-sse`

### Issue: Connection Closes Immediately

**Symptoms:**
- SSE connects but disconnects right away
- Backend shows "SSE client disconnected"

**Solutions:**
1. Check keepalive is working (should see `: keepalive` every 30s)
2. Check firewall isn't blocking connection
3. Check backend isn't crashing
4. Check response isn't being closed prematurely

## 📊 Expected Console Output

### Backend (When Working)
```
🚀 Server đang chạy tại: http://localhost:5000
📨 SSE endpoint đã sẵn sàng tại: /api/events
🌐 Network access: http://[your-ip]:5000
✅ SSE client connected. Total clients: 1
📨 Sending SSE event to 1 client(s): ticket-checked-in for ONFA123456
  ✅ Sent to client 1
✅ SSE event sent. Remaining clients: 1
```

### Browser (When Working)
```
🔌 Connecting to SSE endpoint: http://localhost:5000/api/events
✅ Connected to SSE server
✅ SSE connection established: SSE connection established
📨 Received SSE message: {"type":"ticket-checked-in","data":{...}}
📨 Parsed message: {type: "ticket-checked-in", data: {...}}
🎫 Processing ticket-checked-in event: {...}
📢 Received check-in notification: {...}
```

## 🎯 Quick Test

**Run this in browser console after connecting:**
```javascript
// Check SSE connection
console.log('SSE readyState:', sseEventSourceRef.current?.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSED

// Test manual event
fetch('http://localhost:5000/api/test-sse', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Test result:', data);
    console.log('Clients connected:', data.clients);
  });
```

## ✅ Success Indicators

- ✅ Backend shows clients connected
- ✅ Browser shows SSE connected
- ✅ Test endpoint triggers notification
- ✅ Real check-in triggers notification
- ✅ Multiple browsers receive events simultaneously

If all these work, SSE is functioning correctly! 🎉
