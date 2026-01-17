// n8n Webhook Service
// Sends ticket status changes to n8n webhooks for processing (e.g., writing to Google Sheets)
const axios = require('axios');

class N8nWebhookService {
  constructor() {
    this.statusChangeWebhookUrl = process.env.N8N_STATUS_CHANGE_WEBHOOK_URL;
  }

  async sendWebhook(url, data) {
    if (!url) {
      console.warn('⚠️ n8n webhook URL not configured, skipping webhook call');
      return;
    }

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });

      console.log(`✅ Webhook sent successfully to n8n`);
      return true;
    } catch (error) {
      console.error(`❌ Error sending webhook to n8n:`, error.message);
      // Don't throw - webhook failures shouldn't break the main flow
      return false;
    }
  }

  /**
   * Notify n8n when ticket status changes
   * @param {Object} ticket - The ticket object (with updated status)
   * @param {String} action - 'append' for PAID (new row), 'update' for CHECKED_IN (update existing row)
   */
  async notifyStatusChange(ticket, action = 'append') {
    const data = {
      event: 'ticket_status_changed',
      action: action, // 'append' or 'update'
      shouldUpdateSheets: true, // This is an approval/status change - should update Google Sheets
      ticket: {
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        dob: ticket.dob,
        tier: ticket.tier === 'supervip' ? 'Vé Super VIP' : ticket.tier === 'vvip' ? 'Vé VIP' : 'Vé Superior',
        status: ticket.status,
        registeredAt: ticket.registeredAt ? new Date(ticket.registeredAt).toISOString() : null,
        statusChangedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    return await this.sendWebhook(this.statusChangeWebhookUrl, data);
  }
}

module.exports = new N8nWebhookService();
