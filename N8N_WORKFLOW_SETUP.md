# n8n Workflow Setup Guide - Step by Step

This guide will walk you through setting up your n8n workflow to receive webhooks and update Google Sheets.

## Prerequisites

- n8n account (cloud or self-hosted)
- Google account with access to Google Sheets
- Google Sheet created: "ONFA Paid Ticket Tracker" with Sheet1

---

## Step 1: Create New Workflow

1. Log in to your n8n account
2. Click **"Workflows"** in the left sidebar
3. Click **"+ Add workflow"** button (top right)
4. Name your workflow: `ONFA Ticket Status Tracker`

---

## Step 2: Add Webhook Node

1. Click **"+ Add node"** or drag from the node panel
2. Search for **"Webhook"** and select it
3. The Webhook node will appear on the canvas

### Configure Webhook Node:

1. **Click on the Webhook node** to open its settings

2. **HTTP Method**: Select **"POST"**

3. **Path**: Enter `/ticket-status`
   - This creates the URL: `https://your-instance.app.n8n.cloud/webhook-test/ticket-status`

4. **Authentication**: Select **"None"**

5. **Respond**: Select **"Immediately"**
   - This makes n8n respond quickly to your app

6. **Important**: 
   - For **testing**: Use **"Test URL"** tab
   - For **production**: Use **"Production URL"** tab (after workflow is published)

7. **Click "Execute Node"** button (bottom of webhook settings)
   - This will show you the webhook URL
   - Copy this URL - you'll need it for your app

8. **Click "Listen for test event"** button
   - Keep this window open while testing
   - You'll see incoming webhook data here

---

## Step 3: Add Google Sheets Node

1. Click **"+ Add node"** after the Webhook node
2. Search for **"Google Sheets"** and select **"Append or update row in sheet"**
3. Connect the Webhook node to the Google Sheets node (drag from webhook output to Google Sheets input)

### Configure Google Sheets Node:

1. **Click on the Google Sheets node** to open its settings

2. **Credential to connect with**: 
   - Click **"Create New Credential"** if you haven't connected Google Sheets
   - Follow OAuth flow to connect your Google account
   - Grant n8n access to Google Sheets

3. **Resource**: Select **"Sheet Within Document"**

4. **Operation**: Select **"Append or Update Row"**
   - This will add new rows for PAID tickets
   - Update existing rows for CHECKED_IN tickets

5. **Document**: 
   - Click dropdown → Select **"From list"**
   - Choose your Google Sheet: **"ONFA Paid Ticket Tracker"**

6. **Sheet**: 
   - Click dropdown → Select **"From list"**
   - Choose **"Sheet1"**

7. **Mapping Column Mode**: Select **"Map Each Column Manually"**

8. **Column to match on**: Select **"Ticket ID"**
   - This is the unique identifier used to find/update rows

---

## Step 4: Map Data Fields

In the Google Sheets node, scroll down to **"Values to Send"** section:

Click **"Add Value"** for each field and map them as follows:

### Required Fields:

1. **Ticket ID** (using to match):
   - Click **"fx"** icon to open expression editor
   - Enter: `{{ $json.body.ticket.id }}`
   - Click **"Save"**

2. **Name**:
   - Expression: `{{ $json.body.ticket.name }}`

3. **Email**:
   - Expression: `{{ $json.body.ticket.email }}`

4. **Phone**:
   - Expression: `{{ $json.body.ticket.phone }}`

5. **DOB** (Date of Birth):
   - Expression: `{{ $json.body.ticket.dob }}`

6. **Tier**:
   - Expression: `{{ $json.body.ticket.tier }}`

7. **Status**:
   - Expression: `{{ $json.body.ticket.status }}`

8. **Registered At**:
   - Expression: `{{ $json.body.ticket.registeredAt }}`

9. **Status Changed At**:
   - Expression: `{{ $json.body.ticket.statusChangedAt }}`

### Optional Fields (if your sheet has them):

10. **Event**:
    - Expression: `{{ $json.body.event }}`

11. **Action**:
    - Expression: `{{ $json.body.action }}`

12. **Timestamp**:
    - Expression: `{{ $json.body.timestamp }}`

---

## Step 5: Prepare Your Google Sheet

Before testing, make sure your Google Sheet has these columns in **Sheet1**:

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Ticket ID | Name | Email | Phone | DOB | Tier | Status | Registered At | Status Changed At |

**Important**: 
- Column names must match exactly what you mapped in n8n
- "Ticket ID" must be the first column (used for matching)

---

## Step 6: Test the Workflow

### Test Mode (Before Publishing):

1. **In n8n**:
   - Make sure Webhook node shows **"Listen for test event"** button
   - Click **"Listen for test event"** and keep window open

2. **In your app**:
   - Change a ticket status (e.g., to PAID)
   - Click "Áp Dụng" (Apply) button

3. **Back in n8n**:
   - You should see data appear in the Webhook node
   - Check the Google Sheets node - it should show execution

4. **Check Google Sheet**:
   - Open your Google Sheet
   - A new row should appear with the ticket data

### Manual Test (Using curl):

If webhook doesn't trigger, test manually:

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

---

## Step 7: Activate/Publish the Workflow

Once testing works:

1. **Click the toggle switch** in the top right (next to "Published")
   - It should turn **green** and show "Published"

2. **Switch to Production URL**:
   - Click on Webhook node
   - Click **"Production URL"** tab
   - Copy the Production URL
   - Update your app's webhook URL to use Production URL (remove `-test`)

3. **Verify**:
   - Production URL should be: `https://onfa-ticket-deploy.app.n8n.cloud/webhook/ticket-status`
   - (No `-test` in the path)

---

## Step 8: Verify Data Flow

### For PAID Status (Append):
- When ticket status changes to **PAID**
- Action: `append`
- Result: **New row** added to Google Sheet

### For CHECKED_IN Status (Update):
- When ticket is checked in
- Action: `update`
- Result: **Existing row** updated (found by Ticket ID)
- Status column changes to "CHECKED_IN"

---

## Troubleshooting

### Issue: Webhook not receiving data

**Check:**
1. Is workflow **Published**? (Green toggle ON)
2. Are you using correct URL? (Test vs Production)
3. Is webhook node listening? (For test mode)
4. Check n8n **Executions** tab for errors

### Issue: Google Sheets not updating

**Check:**
1. Google Sheets credentials connected?
2. Sheet name matches? ("ONFA Paid Ticket Tracker")
3. Sheet name matches? ("Sheet1")
4. Column names match exactly?
5. "Ticket ID" column exists and is first column?

### Issue: Wrong data in Google Sheets

**Check:**
1. Data mapping expressions correct?
2. Using `{{ $json.body.ticket.id }}` (with `.body`)?
3. Column order matches mapping order?

### Issue: "Column to match on" not working

**Check:**
1. "Ticket ID" column exists in sheet?
2. Column name matches exactly (case-sensitive)?
3. Using "Append or Update Row" operation?

---

## Workflow Structure Summary

```
[Webhook] → [Google Sheets: Append or Update Row]
    ↓              ↓
Receives      Updates Sheet
POST data     based on Ticket ID
```

---

## Data Flow Example

### When Status Changes to PAID:

1. **App sends webhook**:
   ```json
   {
     "event": "ticket_status_changed",
     "action": "append",
     "ticket": {
       "id": "ONFA123456",
       "name": "John Doe",
       "status": "PAID",
       ...
     }
   }
   ```

2. **n8n receives** → Webhook node captures data

3. **n8n processes** → Google Sheets node:
   - Looks for row with Ticket ID = "ONFA123456"
   - If not found → **Appends** new row
   - If found → **Updates** existing row

4. **Google Sheet** → New/updated row appears

---

## Quick Reference

### Webhook URL Format:
- **Test**: `https://onfa-ticket-deploy.app.n8n.cloud/webhook-test/ticket-status`
- **Production**: `https://onfa-ticket-deploy.app.n8n.cloud/webhook/ticket-status`

### Data Path in n8n:
- All ticket data is under: `{{ $json.body.ticket.* }}`
- Example: `{{ $json.body.ticket.id }}`

### Google Sheets Operation:
- **Append or Update Row**: Automatically appends if Ticket ID not found, updates if found
- **Column to match on**: "Ticket ID" (must be first column)

---

## Next Steps

1. ✅ Set up workflow (Steps 1-5)
2. ✅ Test locally (Step 6)
3. ✅ Publish workflow (Step 7)
4. ✅ Update app to use Production URL
5. ✅ Monitor Executions tab in n8n for any errors

Good luck! 🚀
