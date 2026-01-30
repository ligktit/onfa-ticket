// n8n Webhook Service
// Sends ticket status changes to n8n webhooks for processing (e.g., writing to Google Sheets)
const axios = require('axios');

class N8nWebhookService {
  constructor() {
    this.statusChangeWebhookUrl = process.env.N8N_STATUS_CHANGE_WEBHOOK_URL || 'https://onfa-ticket-deploy.app.n8n.cloud/webhook/ticket-status';
  }

  async sendWebhook(url, data) {
    if (!url) {
      console.warn('⚠️ n8n webhook URL not configured, skipping webhook call');
      return;
    }

    try {
      console.log(`\n🔗 ===== SENDING WEBHOOK TO N8N =====`);
      console.log(`🔗 URL: ${url}`);
      console.log(`🔗 Method: POST`);
      console.log(`🔗 Headers:`, { 'Content-Type': 'application/json' });
      console.log(`🔗 Data:`, JSON.stringify(data, null, 2));
      console.log(`🔗 Full request URL: ${url}`);
      console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'} (LOCAL SERVER)`);
      console.log(`🔗 Running from: ${process.env.VERCEL ? 'Vercel' : 'Local Development'}`);
      
      // Network connectivity check
      try {
        const urlObj = new URL(url);
        console.log(`🔗 Hostname: ${urlObj.hostname}`);
        console.log(`🔗 Port: ${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}`);
        console.log(`🔗 Protocol: ${urlObj.protocol}`);
        console.log(`🔗 ⚠️ LOCAL TESTING: Make sure your local network allows outbound HTTPS to n8n.cloud`);
        console.log(`🔗 ⚠️ Check: Firewall, VPN, corporate network restrictions`);
      } catch (urlError) {
        console.error(`❌ Invalid URL format:`, urlError);
      }
      
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'onfa-ticket-webhook/1.0'
        },
        timeout: 15000, // Increased timeout to 15 seconds
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept 2xx and 4xx as valid responses
        },
        httpAgent: false,
        httpsAgent: false,
      });

      console.log(`✅ Webhook sent successfully to n8n`);
      console.log(`✅ Response status: ${response.status}`);
      console.log(`✅ Response headers:`, response.headers);
      console.log(`✅ Response data:`, JSON.stringify(response.data, null, 2));
      console.log(`✅ Full response:`, JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      }, null, 2));
      console.log(`🔗 ====================================\n`);
      return true;
    } catch (error) {
      console.error(`\n❌ ===== WEBHOOK ERROR =====`);
      console.error(`❌ URL: ${url}`);
      console.error(`❌ Error message:`, error.message);
      console.error(`❌ Error code:`, error.code);
      console.error(`❌ Error name:`, error.name);
      
      // Network-specific error detection
      if (error.code === 'ENOTFOUND') {
        console.error(`❌ DNS Resolution Failed - Cannot resolve hostname`);
        console.error(`❌ Check: DNS settings, URL correctness, network connectivity`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Connection Refused - Host is not accepting connections`);
        console.error(`❌ Check: Firewall rules, service availability, port accessibility`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error(`❌ Connection Timeout - Request took too long`);
        console.error(`❌ Check: Network speed, firewall blocking, service overload`);
      } else if (error.code === 'ECONNRESET') {
        console.error(`❌ Connection Reset - Server closed the connection`);
        console.error(`❌ Check: Firewall blocking mid-connection, server configuration`);
      } else if (error.code === 'EHOSTUNREACH') {
        console.error(`❌ Host Unreachable - Cannot reach the host`);
        console.error(`❌ Check: Network routing, firewall rules, VPN requirements`);
      }
      
      if (error.response) {
        console.error(`❌ Response status: ${error.response.status}`);
        console.error(`❌ Response data:`, error.response.data);
      } else if (error.request) {
        console.error(`❌ No response received - Network issue or firewall blocking`);
        console.error(`❌ Request config:`, {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        });
      }
      console.error(`❌ Full error:`, error);
      console.error(`❌ ===========================\n`);
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
