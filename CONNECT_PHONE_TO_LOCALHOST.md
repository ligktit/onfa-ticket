# Connect Phone to Localhost - Quick Guide

## 🎯 Quick Steps

### 1. Find Your Computer's IP Address

**Windows (PowerShell):**
```powershell
ipconfig
```
Look for **"IPv4 Address"** under your WiFi adapter (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Example:** `192.168.1.100`

---

### 2. Make Sure Both Devices Are on Same WiFi

- ✅ Phone and computer must be on the **same WiFi network**
- ❌ Guest WiFi often blocks device-to-device communication
- ❌ VPN can interfere - disable if needed

---

### 3. Start Your Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Look for the Network URL in Vite output:**
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/  ← Use this on phone!
```

---

### 4. Configure Windows Firewall (If Needed)

**Open PowerShell as Administrator:**
```powershell
# Allow Vite dev server (port 5173)
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173

# Allow Node.js backend (port 5000)
netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow protocol=TCP localport=5000
```

---

### 5. Access from Phone

**On your phone's browser, go to:**
```
http://192.168.1.100:5173
```
(Replace `192.168.1.100` with your actual IP from Step 1)

---

### 6. Configure Socket.IO/SSE (If Needed)

The code **automatically detects** network IP, but if Socket.IO doesn't connect, create `.env` file in project root:

```env
VITE_SOCKET_URL=http://192.168.1.100:5000
VITE_API_URL=http://192.168.1.100:5000/api
```

Then restart frontend: `npm run dev`

---

## ✅ Verify It's Working

1. **Frontend:** Can you see the login page on your phone? ✅
2. **Backend API:** Try `http://192.168.1.100:5000/api/stats` in phone browser - should show JSON ✅
3. **Socket.IO/SSE:** Check browser console on phone - should see connection messages ✅

---

## 🔧 Troubleshooting

### Phone Can't Connect?

**Check:**
- [ ] Both devices on same WiFi?
- [ ] Firewall allows ports 5173 and 5000?
- [ ] IP address is correct?
- [ ] Backend shows: `🌐 Network access: http://[your-ip]:5000`?
- [ ] Vite shows "Network" URL?

**Quick Test:**
```powershell
# Check if ports are listening
netstat -an | findstr "5173"
netstat -an | findstr "5000"
```
Should show `LISTENING` status.

---

### Socket.IO/SSE Not Connecting?

**Check:**
- [ ] `.env` file has correct `VITE_SOCKET_URL`?
- [ ] Backend console shows: `✅ Admin client connected` or `✅ SSE client connected`?
- [ ] Browser console shows connection errors?

**Solution:** The code auto-detects network IP, but you can manually set:
```env
VITE_SOCKET_URL=http://192.168.1.100:5000
```

---

## 🌐 Alternative: Use ngrok (Works from Anywhere)

If local network doesn't work, use ngrok:

1. **Install ngrok:** https://ngrok.com/download

2. **Start ngrok tunnels:**
   ```bash
   # Terminal 3 - Frontend
   ngrok http 5173
   
   # Terminal 4 - Backend  
   ngrok http 5000
   ```

3. **Get URLs from ngrok:**
   - Frontend: `https://abc123.ngrok.io`
   - Backend: `https://xyz789.ngrok.io`

4. **Create `.env` file:**
   ```env
   VITE_API_URL=https://xyz789.ngrok.io/api
   VITE_SOCKET_URL=https://xyz789.ngrok.io
   ```

5. **Access from phone:**
   ```
   https://abc123.ngrok.io/admin/login
   ```

---

## 📱 iOS Safari Notes

- ✅ Works with HTTP on local network
- ⚠️ Camera requires HTTPS (use ngrok for camera features)
- ✅ Socket.IO/SSE works with HTTP

---

## 🎯 Summary

**Quick Checklist:**
1. ✅ Find IP: `ipconfig` → IPv4 Address
2. ✅ Same WiFi network
3. ✅ Start servers: `npm start` + `npm run dev`
4. ✅ Use Network URL on phone: `http://[IP]:5173`
5. ✅ Configure firewall if needed
6. ✅ Set `.env` if Socket.IO doesn't auto-detect

**That's it!** Your phone should now connect to localhost! 🎉
