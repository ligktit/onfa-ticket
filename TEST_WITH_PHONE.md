# Testing QR Popup Feature with Phone

## Setup Instructions

### Step 1: Find Your Computer's Local IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (usually something like `192.168.1.xxx` or `192.168.0.xxx`)

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
or
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

**Example IP:** `192.168.1.100`

### Step 2: Make Sure Backend Allows Network Connections

The backend server needs to listen on `0.0.0.0` (all network interfaces) instead of just `localhost`.

Check `server/server.js` - it should already be configured correctly, but verify:
```javascript
server.listen(PORT, '0.0.0.0', () => {
  // This allows connections from network
});
```

If it's just `server.listen(PORT, ...)`, that's fine - it defaults to all interfaces.

### Step 3: Start the Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Vite should show something like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

**Note the Network URL!** Use this on your phone.

### Step 4: Configure Socket.IO for Network Access

The frontend needs to connect to your computer's IP address, not localhost, when accessed from phone.

**Option A: Use Environment Variable (Recommended)**

Create a `.env` file in the project root:
```env
VITE_SOCKET_URL=http://192.168.1.100:5000
```
(Replace `192.168.1.100` with your actual IP)

**Option B: Update AdminApp.jsx temporarily**

The code already checks for `VITE_SOCKET_URL`, so Option A is better.

### Step 5: Setup Phone (Scanner - Window 1)

1. **Make sure phone and computer are on the same WiFi network**

2. **On your phone's browser**, go to:
   ```
   http://192.168.1.100:5173/admin/login
   ```
   (Replace `192.168.1.100` with your actual IP from Step 1)

3. **Login to admin panel**

4. **Go to "Check-in" tab** - this is your scanner

### Step 6: Setup Computer (Observer - Window 2)

1. **On your computer**, open:
   ```
   http://localhost:5173/admin/login
   ```

2. **Login to admin panel**

3. **Keep this tab open** - you can be on Dashboard or Check-in tab
   - This is your observer window

### Step 7: Test!

1. **On phone (Scanner)**: 
   - Click "Quét QR" button to open camera
   - OR manually enter a ticket ID in the input field
   - Click "Check-in" button

2. **On computer (Observer)**:
   - Should see **popup notification** appear with customer info! 🎉
   - Phone will also show confirmation screen

## Troubleshooting

**Phone can't connect to frontend?**
- Check firewall: Windows Firewall might block port 5173
- Verify both devices are on same WiFi
- Try disabling firewall temporarily for testing
- Check Vite shows "Network" URL in terminal

**Socket.IO not connecting from phone?**
- Verify `VITE_SOCKET_URL` is set correctly in `.env`
- Check backend console shows: `✅ Admin client connected`
- Make sure backend is listening on `0.0.0.0` (all interfaces)
- Check Windows Firewall allows port 5000

**CORS errors?**
- Backend already has `cors()` enabled, should work
- If issues, check `server/server.js` CORS settings

**Quick Firewall Fix (Windows):**
```powershell
# Allow Node.js through firewall (run as Administrator)
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
```

## Alternative: Use ngrok (For Testing Across Networks)

If you want to test from anywhere (not just same WiFi):

1. Install ngrok: https://ngrok.com/
2. Start backend: `npm start` (port 5000)
3. Start frontend: `npm run dev` (port 5173)
4. In new terminal:
   ```bash
   ngrok http 5173
   ```
5. Use the ngrok URL on your phone (e.g., `https://abc123.ngrok.io/admin/login`)
6. Set `VITE_SOCKET_URL` to your ngrok backend URL
