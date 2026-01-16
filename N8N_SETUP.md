# n8n Integration Setup

This guide will help you set up n8n workflows to automatically log purchased and checked-in tickets to Google Sheets.

## What is n8n?

n8n is a workflow automation tool that can:
- Receive webhooks from your application
- Process the data
- Write to Google Sheets (or other services)
- Trigger other automations

## Step 1: Install n8n

### Option A: Local Installation (Recommended for Development)

```bash
npm install -g n8n
```

Then start n8n:
```bash
n8n start
```

n8n will be available at: `http://localhost:5678`

### Option B: Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Option C: Cloud (n8n.cloud)

Sign up at https://n8n.cloud for a hosted solution.

## Step 2: Create Webhook Workflow in n8n

### Single Workflow for All Status Changes

1. **Create a new workflow** in n8n
2. **Add a Webhook node**:
   - Method: `POST`
   - Path: `/ticket-status-change` (or any path you prefer)
   - Response Mode: "Respond to Webhook"
   - Click "Execute Node" to get your webhook URL
   - Copy the webhook URL (e.g., `http://localhost:5678/webhook/ticket-status-change`)

3. **Add an IF node** (to check action type):
   - Condition: `{{ $json.action }}` equals `"append"`
   - This will route to different Google Sheets operations

4. **Add Google Sheets node for APPEND** (when action = "append"):
   - Operation: "Append"
   - Spreadsheet: Select or create your Google Sheet
   - Sheet: "Tickets" (or any sheet name you prefer)
   - Columns: Map the fields:
     - `Ticket ID` → `{{ $json.ticket.id }}`
     - `Name` → `{{ $json.ticket.name }}`
     - `Email` → `{{ $json.ticket.email }}`
     - `Phone` → `{{ $json.ticket.phone }}`
     - `Date of Birth` → `{{ $json.ticket.dob }}`
     - `Tier` → `{{ $json.ticket.tier }}`
     - `Status` → `{{ $json.ticket.status }}`
     - `Registered At` → `{{ $json.ticket.registeredAt }}`
     - `Status Changed At` → `{{ $json.ticket.statusChangedAt }}`

5. **Add Google Sheets node for UPDATE** (when action = "update"):
   - Operation: "Update"
   - Spreadsheet: Same Google Sheet as above
   - Sheet: "Tickets"
   - Lookup Column: `Ticket ID`
   - Lookup Value: `{{ $json.ticket.id }}`
   - Columns: Map the fields (only update Status and Status Changed At):
     - `Status` → `{{ $json.ticket.status }}`
     - `Status Changed At` → `{{ $json.ticket.statusChangedAt }}`

6. **Connect the nodes**: 
   - Webhook → IF node
   - IF node (true/append) → Google Sheets Append
   - IF node (false/update) → Google Sheets Update

7. **Activate the workflow** (toggle switch in top right)

## Step 3: Configure Google Sheets in n8n

1. In n8n, go to **Credentials** (gear icon)
2. Click **Add Credential** → **Google Sheets OAuth2 API**
3. Follow the OAuth flow to connect your Google account
4. Grant n8n access to your Google Sheets

## Step 4: Configure Environment Variables

Add this to your `server/.env` file:

```env
# n8n Webhook URL for status changes
N8N_STATUS_CHANGE_WEBHOOK_URL=http://localhost:5678/webhook/ticket-status-change
```

**For production**, use your n8n cloud URL or public n8n instance:
```env
N8N_STATUS_CHANGE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ticket-status-change
```

## Step 5: Restart Your Server

After adding the environment variables:

```bash
cd server
npm start
```

## How It Works

### When Ticket Status Changes

1. **Status change occurs** (e.g., PENDING → PAID, PAID → CHECKED_IN, etc.)
2. Server sends a POST request to `N8N_STATUS_CHANGE_WEBHOOK_URL` with ticket data, current status, and action type
3. n8n receives the webhook
4. n8n checks the `action` field:
   - If `action = "append"` → **Appends** a new row to Google Sheets (for PAID status)
   - If `action = "update"` → **Updates** existing row by Ticket ID (for CHECKED_IN status)
5. Google Sheet reflects the current status

**Examples:**
- When ticket status changes to `PAID` → **New row appended** with status = "PAID"
- When ticket is checked in (`CHECKED_IN`) → **Existing row updated** with status = "CHECKED_IN"
- Other status changes → New row appended with the current status

## Webhook Data Format

### Status Change Webhook (PAID - Append):
```json
{
  "event": "ticket_status_changed",
  "action": "append",
  "ticket": {
    "id": "ONFA123456",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0123456789",
    "dob": "01/01/1990",
    "tier": "VIP A",
    "status": "PAID",
    "registeredAt": "2026-01-15T10:30:00.000Z",
    "statusChangedAt": "2026-01-15T11:00:00.000Z"
  },
  "timestamp": "2026-01-15T11:00:00.000Z"
}
```

**Example for Check-in (Update):**
```json
{
  "event": "ticket_status_changed",
  "action": "update",
  "ticket": {
    "id": "ONFA123456",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0123456789",
    "dob": "01/01/1990",
    "tier": "VIP A",
    "status": "CHECKED_IN",
    "registeredAt": "2026-01-15T10:30:00.000Z",
    "statusChangedAt": "2026-01-15T14:30:00.000Z"
  },
  "timestamp": "2026-01-15T14:30:00.000Z"
}
```

## Testing

1. **Test PAID Status (Append)**:
   - Update a ticket status to `PAID` in the admin panel
   - Check n8n workflow execution logs
   - Verify a **new row** appears in Google Sheets with status = "PAID"

2. **Test Check-In Status (Update)**:
   - Scan a QR code and check in a ticket (that was previously PAID)
   - Check n8n workflow execution logs
   - Verify the **existing row** is updated with status = "CHECKED_IN" (not a new row)

3. **Verify Behavior**:
   - Each ticket should have only **one row** in Google Sheets
   - When status changes to PAID → New row created
   - When status changes to CHECKED_IN → Same row updated

## Troubleshooting

**Webhook not being called:**
- Check that `N8N_STATUS_CHANGE_WEBHOOK_URL` environment variable is set correctly
- Verify n8n workflow is activated
- Check server logs for webhook errors

**n8n not receiving webhooks:**
- Make sure n8n is running
- Verify webhook URLs are correct
- Check n8n workflow execution history

**Google Sheets not updating:**
- Verify Google Sheets credentials in n8n
- Check n8n workflow execution logs for errors
- Ensure sheet names match in n8n configuration

**"Webhook URL not configured" warning:**
- Environment variables are optional - webhooks will be skipped if not set
- This won't break the main application flow

## Advantages of Using n8n

✅ **No Google API credentials** needed in your code  
✅ **Flexible** - Easy to add more integrations (Slack, Email, etc.)  
✅ **Visual workflow builder** - No coding required  
✅ **Error handling** - n8n can retry failed operations  
✅ **Extensible** - Add filters, transformations, and more  
✅ **Separation of concerns** - Business logic stays in your app, integrations in n8n

## Example: Adding More Integrations

With n8n, you can easily add:
- **Slack notifications** when tickets are purchased
- **Email alerts** for VIP ticket purchases
- **Database backups** to another system
- **Analytics** tracking
- **SMS notifications**

Just add more nodes to your n8n workflows!
