# Testing QR Code Scanning Popup Feature

## Prerequisites

1. **Backend server running** (with Socket.IO)
2. **Frontend running**
3. **At least one ticket with status = PAID** (to have a QR code)

## Step-by-Step Test Instructions

### Step 1: Start the Backend Server

```bash
cd server
npm install  # If you haven't already
npm start
```

You should see:
```
✅ Đã kết nối thành công tới MongoDB Cloud - Database: onfa_test
🚀 Server đang chạy tại: http://localhost:5000
📡 Socket.IO server đã sẵn sàng
```

### Step 2: Start the Frontend

```bash
# In a new terminal, from project root
npm run dev
```

### Step 3: Prepare a Test Ticket

**Option A: Use an existing ticket**
1. Go to Admin Panel: `http://localhost:5173/admin/login`
2. Login with your admin secret key
3. Find a ticket in the dashboard
4. Change its status to "Đã thanh toán" (PAID) - this will generate a QR code

**Option B: Create a new ticket**
1. Go to the registration page: `http://localhost:5173`
2. Register a new ticket
3. Go to Admin Panel and set status to "Đã thanh toán" (PAID)

### Step 4: Open Admin Panel - Phone (Scanner) and Computer (Observer)

1. **Phone - Window 1 (Scanner)**: 
   - URL: `http://[your-computer-ip]:5173/admin/login` (e.g., `http://192.168.1.100:5173/admin/login`)
   - Login and go to "Check-in" tab
   - This is where you'll scan QR codes

2. **Computer - Window 2 (Observer)**: 
   - URL: `http://localhost:5173/admin/login`
   - Login and keep it open (you can be on Dashboard or Check-in tab)
   - This is where you'll see the popup notification

### Step 5: Test the QR Code Scanning

**Method 1: Using Phone Camera (Recommended)**
1. On Phone (Window 1), click "Quét QR" button
2. Allow camera permissions
3. Point camera at a QR code from:
   - A ticket email (if you received one)
   - Or display a ticket QR code on another screen
   - Or use manual entry (see Method 2)

**Method 2: Manual Entry (Quick Test)**
1. On Phone (Window 1), in the check-in input field
2. Type the ticket ID (e.g., `ONFA123456ABC`)
3. Click "Check-in" button

### Step 6: Verify the Popup

**Expected Result:**
- ✅ Phone (scanner): Shows confirmation screen with ticket details
- ✅ Computer (observer): Shows **popup notification** with same ticket details
- ✅ Console logs on computer show: `📢 Received check-in notification: {...}`

**Popup should display:**
- ✅ Green checkmark icon
- ✅ "Check-in Thành công!" header
- ✅ Ticket ID
- ✅ Customer name and email
- ✅ Phone number and DOB
- ✅ Ticket tier (VIP A or VIP B)
- ✅ Payment image (if available)

### Troubleshooting

**Popup not appearing?**
1. Check browser console for Socket.IO connection:
   - Should see: `✅ Connected to Socket.IO server`
2. Check backend console for:
   - `✅ Admin client connected: [socket-id]`
   - `📡 Socket.IO server đã sẵn sàng`
3. Verify both windows are connected:
   - Open browser DevTools → Console
   - Look for Socket.IO connection messages

**QR code not scanning?**
1. Ensure camera permissions are granted
2. Try manual entry method instead
3. Check that ticket status is not already "CHECKED_IN"

**Socket.IO not connecting?**
1. Verify backend is running on port 5000
2. Check CORS settings in `server/server.js`
3. For production/Vercel, set `VITE_SOCKET_URL` environment variable

## Quick Test Script

If you want to test without scanning, you can manually trigger a check-in via API:

```bash
# Replace TICKET_ID with an actual ticket ID
curl -X POST http://localhost:5000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "ONFA123456ABC"}'
```

This will trigger the Socket.IO event and show the popup on all connected admin panels!
