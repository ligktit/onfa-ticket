# Fix Phone Connection to Server

## Quick Fix Steps

### Step 1: Restart Backend Server

The server is now configured to listen on all network interfaces. **Restart your backend:**

```bash
cd server
# Stop current server (Ctrl+C if running)
npm start
```

You should see:
```
🚀 Server đang chạy tại: http://localhost:5000
📡 Socket.IO server đã sẵn sàng
🌐 Network access: http://[your-ip]:5000
```

### Step 2: Restart Frontend Server

```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

You should see:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

**Note the Network URL!**

### Step 3: Find Your Computer's IP Address

**Windows PowerShell:**
```powershell
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.100`)

### Step 4: Configure Windows Firewall

**Open PowerShell as Administrator** and run:

```powershell
# Allow Vite dev server
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173

# Allow Node.js backend server
netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow protocol=TCP localport=5000
```

### Step 5: Test Connection from Phone

**On iPhone Safari, try these URLs:**

1. **Test Frontend:**
   ```
   http://192.168.1.100:5173
   ```
   (Replace `192.168.1.100` with your actual IP)

2. **Test Backend API:**
   ```
   http://192.168.1.100:5000/api/stats
   ```
   Should return JSON data if working.

### Step 6: Verify Network Setup

**Check these:**
- ✅ Phone and computer on **same WiFi network**
- ✅ Not using Guest WiFi (blocks device-to-device)
- ✅ No VPN active on either device
- ✅ WiFi allows device communication

### Step 7: Update Socket.IO Connection

The frontend automatically detects network IP, but if it doesn't work, create `.env` file in project root:

```env
VITE_SOCKET_URL=http://192.168.1.100:5000
```
(Replace with your actual IP)

Then restart frontend: `npm run dev`

## Still Not Working? Use ngrok (Most Reliable)

If local network still fails, ngrok is the most reliable solution:

### Setup ngrok:

1. **Download ngrok:** https://ngrok.com/download
   - Extract `ngrok.exe` to a folder
   - Or use: `choco install ngrok` (if you have Chocolatey)

2. **Start your servers:**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm start
   
   # Terminal 2 - Frontend  
   npm run dev
   ```

3. **Start ngrok tunnels:**
   ```bash
   # Terminal 3 - Frontend tunnel
   ngrok http 5173
   
   # Terminal 4 - Backend tunnel (new terminal)
   ngrok http 5000
   ```

4. **Get URLs from ngrok:**
   - Frontend: `https://abc123.ngrok.io` (from Terminal 3)
   - Backend: `https://xyz789.ngrok.io` (from Terminal 4)

5. **Create `.env` file:**
   ```env
   VITE_API_URL=https://xyz789.ngrok.io/api
   VITE_SOCKET_URL=https://xyz789.ngrok.io
   ```

6. **Restart frontend:**
   ```bash
   npm run dev
   ```

7. **On iPhone Safari:**
   - Use frontend ngrok URL: `https://abc123.ngrok.io/admin/login`

## Diagnostic Checklist

Run through these:

- [ ] Backend server restarted after config change?
- [ ] Frontend server restarted?
- [ ] Firewall rules added for ports 5173 and 5000?
- [ ] Both devices on same WiFi?
- [ ] Can access `http://[your-ip]:5173` from phone?
- [ ] Can access `http://[your-ip]:5000/api/stats` from phone?
- [ ] Vite shows "Network" URL in terminal?
- [ ] Backend console shows "🌐 Network access" message?

## Common Issues

**"Safari cannot connect to server"**
- Check firewall settings
- Verify IP address is correct
- Try Chrome on iOS instead
- Use ngrok (most reliable)

**"Socket.IO connection failed"**
- Check `.env` file has correct `VITE_SOCKET_URL`
- Verify backend is running
- Check browser console for errors
- Try ngrok if local network doesn't work

**"Connection timeout"**
- Firewall blocking ports
- Wrong IP address
- Devices on different networks
- Router blocking device-to-device communication

## Quick Test Commands

**Test if ports are accessible:**
```powershell
# From phone, try these URLs in Safari:
http://[your-ip]:5173          # Frontend
http://[your-ip]:5000/api/stats # Backend API
```

**Check if server is listening:**
```powershell
netstat -an | findstr "5173"
netstat -an | findstr "5000"
```

Should show `LISTENING` status.
