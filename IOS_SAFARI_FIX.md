# Fixing iOS Safari Connection Issues

## Common Issues with iOS Safari

iOS Safari has stricter security requirements than desktop browsers. Here are solutions:

## Solution 1: Update Vite Config (Already Done)

The `vite.config.js` has been updated to allow network access. Restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Solution 2: Check Windows Firewall

**Allow Node.js through Windows Firewall:**

1. Open PowerShell as Administrator
2. Run these commands:

```powershell
# Allow Vite dev server (port 5173)
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173

# Allow Backend server (port 5000)
netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=5000
```

**Or use Windows GUI:**
1. Windows Security → Firewall & network protection
2. Advanced settings → Inbound Rules → New Rule
3. Port → TCP → Specific local ports: `5173, 5000`
4. Allow the connection → Apply to all profiles → Name it "Vite & Node"

## Solution 3: Verify Network Connection

**On Windows, check your IP:**
```powershell
ipconfig
```

Look for your WiFi adapter's IPv4 address (e.g., `192.168.1.100`)

**Make sure:**
- ✅ Phone and computer are on the **same WiFi network**
- ✅ WiFi is not a "Guest" network (some block device-to-device communication)
- ✅ No VPN is active on either device

## Solution 4: Test Connection from Phone

**In Safari on iPhone:**

1. Try accessing: `http://192.168.1.100:5173` (replace with your IP)
2. If it doesn't load, try:
   - `http://192.168.1.100:5173/` (with trailing slash)
   - Check if Vite shows "Network" URL in terminal

**Check Vite Terminal Output:**
When you run `npm run dev`, you should see:
```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

Use the **Network** URL on your phone!

## Solution 5: iOS Safari Specific Fixes

**Clear Safari Cache:**
1. Settings → Safari → Clear History and Website Data

**Disable Private Relay (if enabled):**
1. Settings → [Your Name] → iCloud → Private Relay → Turn Off
   (This can interfere with local network access)

**Check Safari Settings:**
1. Settings → Safari → Advanced → Experimental Features
2. Make sure nothing is blocking local network access

## Solution 6: Alternative - Use Chrome on iOS

If Safari still doesn't work:
1. Install Chrome from App Store
2. Use Chrome instead of Safari
3. Chrome on iOS handles local network connections better

## Solution 7: Test Backend Connection First

**On iPhone Safari, try:**
```
http://192.168.1.100:5000/api/stats
```

If this works, backend is accessible. If not, firewall is blocking port 5000.

## Solution 8: Use ngrok (Most Reliable)

If local network still doesn't work, use ngrok:

1. **Install ngrok:** https://ngrok.com/download

2. **Start your servers:**
   ```bash
   # Terminal 1
   cd server
   npm start
   
   # Terminal 2
   npm run dev
   ```

3. **Start ngrok for frontend:**
   ```bash
   # Terminal 3
   ngrok http 5173
   ```

4. **Start ngrok for backend:**
   ```bash
   # Terminal 4 (new terminal)
   ngrok http 5000
   ```

5. **Update `.env` file:**
   ```env
   VITE_API_URL=https://[backend-ngrok-url]/api
   VITE_SOCKET_URL=https://[backend-ngrok-url]
   ```

6. **On iPhone Safari:**
   - Use the frontend ngrok URL (e.g., `https://abc123.ngrok.io/admin/login`)

**Note:** Free ngrok URLs change each time you restart. For testing, this is fine.

## Quick Diagnostic Steps

1. ✅ Vite config updated? → Restart `npm run dev`
2. ✅ Firewall allows ports 5173 and 5000?
3. ✅ Both devices on same WiFi?
4. ✅ Can you ping computer IP from phone? (Use network tools app)
5. ✅ Vite shows "Network" URL in terminal?

## Still Not Working?

Try this test:
1. On computer, open: `http://localhost:5173`
2. On phone, try: `http://[your-ip]:5173`
3. If phone can't connect, it's a network/firewall issue
4. If phone connects but Socket.IO doesn't work, it's a Socket.IO config issue

Let me know which step fails and I'll help debug further!
