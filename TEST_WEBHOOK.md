# Testing n8n Webhook

## Quick Test Steps

1. **Make sure n8n webhook is listening:**
   - Open your n8n workflow
   - Click on the Webhook node
   - Click "Listen for test event" button
   - Keep this window open

2. **Trigger a status change:**
   - Go to your admin panel
   - Change a ticket status (e.g., to PAID)
   - Click "Áp Dụng" (Apply) button

3. **Check server logs:**
   - Look for logs starting with `🔗 ===== SENDING WEBHOOK TO N8N =====`
   - Check the URL being called
   - Check the response status and data

4. **Check n8n:**
   - In the webhook node, you should see the data appear
   - Check the "Executions" tab in n8n
   - Look for any errors (red indicators)

## ⚠️ LOCAL TESTING ISSUES

If you're testing **locally** (running `server/server.js` on localhost:5000), there are additional considerations:

### Local Network Restrictions

1. **Firewall blocking outbound HTTPS**
   - Windows Firewall might block Node.js outbound connections
   - Check Windows Firewall settings
   - Allow Node.js through firewall

2. **Corporate Network/VPN**
   - Corporate networks often block external webhooks
   - VPN might block n8n.cloud domain
   - Try disconnecting VPN or using mobile hotspot

3. **No Internet Access**
   - Local server might not have internet access
   - Check: `ping onfa-ticket-deploy.app.n8n.cloud`
   - Test: `curl https://onfa-ticket-deploy.app.n8n.cloud/webhook-test/ticket-status`

4. **Proxy Settings**
   - If behind corporate proxy, axios might need proxy configuration
   - Check if `HTTP_PROXY` or `HTTPS_PROXY` env vars are needed

### Quick Local Test

Test if your local server can reach n8n:

```bash
# From your local machine, test connectivity:
curl -X POST https://onfa-ticket-deploy.app.n8n.cloud/webhook-test/ticket-status \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'
```

If this fails, it's a network/firewall issue, not your code.

## Common Issues

### Issue 1: Webhook not being called
**Symptoms:** No logs showing webhook being sent
**Solution:** 
- Check if status actually changed
- Verify the webhook URL is set correctly
- Check server console for errors

### Issue 2: Webhook sent but n8n not receiving
**Symptoms:** Logs show webhook sent with 200 response, but n8n shows nothing
**Possible causes:**
- Wrong URL (check exact match)
- Workflow not activated/published
- n8n not actively listening
- Network/firewall blocking

#### Network/Firewall Blocking Detection

Check your server logs for these error codes:

- **ENOTFOUND**: DNS resolution failed
  - Check: URL correctness, DNS settings, network connectivity
  - Solution: Verify the URL is correct, check DNS resolution

- **ECONNREFUSED**: Connection refused
  - Check: Firewall rules, service availability, port accessibility
  - Solution: Check if n8n service is running, verify firewall allows outbound HTTPS

- **ETIMEDOUT / ECONNABORTED**: Connection timeout
  - Check: Network speed, firewall blocking, service overload
  - Solution: Increase timeout, check network connectivity, verify firewall rules

- **ECONNRESET**: Connection reset
  - Check: Firewall blocking mid-connection, server configuration
  - Solution: Check firewall logs, verify n8n webhook configuration

- **EHOSTUNREACH**: Host unreachable
  - Check: Network routing, firewall rules, VPN requirements
  - Solution: Check network routing, verify firewall allows outbound to n8n.cloud

#### Vercel-Specific Issues

If deploying on Vercel:
- Vercel allows outbound HTTPS requests by default
- Check Vercel function logs for network errors
- Verify environment variables are set correctly
- Check Vercel function timeout limits (default 10s, max 60s for Pro)

### Issue 3: Webhook received but workflow fails
**Symptoms:** n8n shows execution but it fails
**Solution:**
- Check the "Executions" tab in n8n
- Look for error messages
- Check Google Sheets node configuration
- Verify Google Sheets credentials

## Manual Test

You can manually test the webhook using curl:

```bash
curl -X POST https://onfa-ticket-deploy.app.n8n.cloud/webhook-test/ticket-status \
  -H "Content-Type: application/json" \
  -d '{
    "event": "ticket_status_changed",
    "action": "append",
    "shouldUpdateSheets": true,
    "ticket": {
      "id": "TEST123",
      "name": "Test User",
      "email": "test@example.com",
      "phone": "1234567890",
      "dob": "01/01/1990",
      "tier": "Vé Super VIP",
      "status": "PAID",
      "registeredAt": "2026-01-15T10:30:00.000Z",
      "statusChangedAt": "2026-01-15T11:00:00.000Z"
    },
    "timestamp": "2026-01-15T11:00:00.000Z"
  }'
```

If this works, the issue is in your application code. If it doesn't, the issue is with n8n configuration.
