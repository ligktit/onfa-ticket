import { connectDB, Ticket } from './db.js';
import Pusher from 'pusher';
import axios from 'axios';

// Detect environment (production on Vercel, local otherwise)
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

// Debug: Log environment detection
console.log('🔍 Backend Environment Detection:');
console.log('  - process.env.VERCEL:', process.env.VERCEL);
console.log('  - process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('  - Detected as:', isProduction ? 'PRODUCTION' : 'LOCAL');

// Use different Pusher apps for local vs production to avoid mixing events
const pusherConfig = isProduction ? {
  // Production Pusher app (Vercel deployment)
  appId: process.env.PUSHER_APP_ID_PROD || process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY_PROD || process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET_PROD || process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER_PROD || process.env.PUSHER_CLUSTER || 'us2',
} : {
  // Local development Pusher app
  appId: process.env.PUSHER_APP_ID_LOCAL || process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY_LOCAL || process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET_LOCAL || process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER_LOCAL || process.env.PUSHER_CLUSTER || 'us2',
};

// Warn if using fallback variables in local mode
if (!isProduction) {
  if (!process.env.PUSHER_KEY_LOCAL && process.env.PUSHER_KEY) {
    console.warn('⚠️ WARNING: Using fallback PUSHER_KEY instead of PUSHER_KEY_LOCAL!');
    console.warn('⚠️ This might connect to PRODUCTION Pusher. Set PUSHER_KEY_LOCAL in server/.env');
  }
  if (!process.env.PUSHER_APP_ID_LOCAL && process.env.PUSHER_APP_ID) {
    console.warn('⚠️ WARNING: Using fallback PUSHER_APP_ID instead of PUSHER_APP_ID_LOCAL!');
  }
}

// Channel name - different for local vs production
const PUSHER_CHANNEL = isProduction ? 'check-ins-prod' : 'check-ins-local';

// Initialize Pusher
const pusher = new Pusher({
  ...pusherConfig,
  useTLS: true
});

console.log(`🔌 Pusher initialized for ${isProduction ? 'PRODUCTION' : 'LOCAL'} environment`);
console.log(`🔌 Channel: ${PUSHER_CHANNEL}`);
console.log(`🔌 App ID: ${pusherConfig.appId ? `${pusherConfig.appId.substring(0, 8)}...` : 'Not set'}`);
console.log(`🔌 Key: ${pusherConfig.key ? `${pusherConfig.key.substring(0, 10)}...` : 'Not set'}`);

// n8n webhook service for check-in
async function notifyCheckIn(ticket) {
  const statusChangeWebhookUrl = process.env.N8N_STATUS_CHANGE_WEBHOOK_URL || 'https://onfa-ticket-deploy.app.n8n.cloud/webhook/ticket-status';
  
  if (!statusChangeWebhookUrl) {
    console.warn('⚠️ n8n webhook URL not configured, skipping webhook call');
    return false;
  }

  try {
    const data = {
      event: 'ticket_status_changed',
      action: 'update', // Check-in updates existing row
      shouldUpdateSheets: true, // Update Google Sheets
      ticket: {
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        dob: ticket.dob,
        tier: ticket.tier === 'supervip' ? 'Vé Super VIP' : ticket.tier === 'vvip' ? 'Vé VIP' : 'Vé Superior',
        status: ticket.status, // CHECKED_IN
        registeredAt: ticket.registeredAt ? new Date(ticket.registeredAt).toISOString() : null,
        statusChangedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`\n🔗 ===== SENDING WEBHOOK TO N8N =====`);
    console.log(`🔗 URL: ${statusChangeWebhookUrl}`);
    console.log(`🔗 Method: POST`);
    console.log(`🔗 Headers:`, { 'Content-Type': 'application/json' });
    console.log(`🔗 Data:`, JSON.stringify(data, null, 2));
    console.log(`🔗 Full request URL: ${statusChangeWebhookUrl}`);
    console.log(`🔗 Environment: ${process.env.VERCEL ? 'Vercel/Production' : 'Local'}`);
    
    // Network connectivity check
    try {
      const urlObj = new URL(statusChangeWebhookUrl);
      console.log(`🔗 Hostname: ${urlObj.hostname}`);
      console.log(`🔗 Port: ${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}`);
      console.log(`🔗 Protocol: ${urlObj.protocol}`);
    } catch (urlError) {
      console.error(`❌ Invalid URL format:`, urlError);
    }
    
    const response = await axios.post(statusChangeWebhookUrl, data, {
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
    
    console.log(`✅ Webhook sent successfully to n8n for check-in`);
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
    console.error(`❌ URL: ${statusChangeWebhookUrl}`);
    console.error(`❌ Error message:`, error.message);
    console.error(`❌ Error code:`, error.code);
    console.error(`❌ Error name:`, error.name);
    
    // Network-specific error detection
    if (error.code === 'ENOTFOUND') {
      console.error(`❌ DNS Resolution Failed - Cannot resolve hostname`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Connection Refused - Host is not accepting connections`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`❌ Connection Timeout - Request took too long`);
    } else if (error.code === 'ECONNRESET') {
      console.error(`❌ Connection Reset - Server closed the connection`);
    } else if (error.code === 'EHOSTUNREACH') {
      console.error(`❌ Host Unreachable - Cannot reach the host`);
    }
    
    if (error.response) {
      console.error(`❌ Response status: ${error.response.status}`);
      console.error(`❌ Response data:`, error.response.data);
    } else if (error.request) {
      console.error(`❌ No response received - Network issue or firewall blocking`);
    }
    console.error(`❌ Full error:`, error);
    console.error(`❌ ===========================\n`);
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    // Parse body
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { ticketId } = body;
    const ticket = await Ticket.findOne({ id: ticketId });

    if (!ticket) return res.status(404).json({ message: 'Vé không tồn tại!' });
    if (ticket.status === 'CHECKED_IN') return res.status(400).json({ message: 'Vé đã check-in rồi!' });

    // Immediately update status to CHECKED_IN
    const updatedTicket = await Ticket.findOneAndUpdate(
      { id: ticketId },
      { status: 'CHECKED_IN' },
      { new: true }
    );

    // Send webhook to n8n for Google Sheets update
    try {
      await notifyCheckIn(updatedTicket);
    } catch (webhookError) {
      console.error('❌ Error sending webhook to n8n:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    // Prepare event data for Pusher (with CHECKED_IN status)
    const eventData = {
      ticketId: updatedTicket.id,
      name: updatedTicket.name,
      email: updatedTicket.email,
      phone: updatedTicket.phone,
      dob: updatedTicket.dob,
      tier: updatedTicket.tier,
      paymentImage: updatedTicket.paymentImage,
      status: 'CHECKED_IN', // Status is now CHECKED_IN
      checkedInAt: new Date(),
    };
    
    // Publish Pusher event (only if credentials are configured)
    if (pusherConfig.appId && pusherConfig.key && pusherConfig.secret) {
      try {
        await pusher.trigger(PUSHER_CHANNEL, 'ticket-checked-in', eventData);
        console.log(`✅ Pusher event published to ${PUSHER_CHANNEL}: ticket-checked-in for ${updatedTicket.id}`);
      } catch (pusherError) {
        console.error('❌ Error publishing Pusher event:', pusherError);
        // Don't fail the request if Pusher fails - check-in still succeeded
      }
    } else {
      console.warn('⚠️ Pusher credentials not configured. Real-time notifications disabled.');
    }
    
    res.json(updatedTicket);
  } catch (error) {
    console.error('Error in /api/checkin:', error);
    res.status(500).json({ message: error.message });
  }
}
