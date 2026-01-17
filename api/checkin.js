import { connectDB, Ticket } from './db.js';
import Pusher from 'pusher';

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

    // Don't automatically update status - wait for approve button
    // Status will be updated when admin clicks "Phê Duyệt" button
    
    // Prepare event data for Pusher (use current status, not CHECKED_IN)
    // IMPORTANT: This is just a scan notification, NOT an approval
    // n8n workflows should NOT update Google Sheets based on this event
    // Only webhooks from /api/update-status should trigger Google Sheets updates
    const eventData = {
      ticketId: ticket.id,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      dob: ticket.dob,
      tier: ticket.tier,
      paymentImage: ticket.paymentImage,
      status: ticket.status, // Keep current status, don't change to CHECKED_IN yet
      checkedInAt: new Date(),
      isScanOnly: true, // Flag to indicate this is just a scan, not an approval
      shouldUpdateSheets: false // Explicit flag for n8n workflows
    };
    
    // Publish Pusher event (only if credentials are configured)
    if (pusherConfig.appId && pusherConfig.key && pusherConfig.secret) {
      try {
        await pusher.trigger(PUSHER_CHANNEL, 'ticket-checked-in', eventData);
        console.log(`✅ Pusher event published to ${PUSHER_CHANNEL}: ticket-checked-in for ${ticket.id}`);
      } catch (pusherError) {
        console.error('❌ Error publishing Pusher event:', pusherError);
        // Don't fail the request if Pusher fails - check-in still succeeded
      }
    } else {
      console.warn('⚠️ Pusher credentials not configured. Real-time notifications disabled.');
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error in /api/checkin:', error);
    res.status(500).json({ message: error.message });
  }
}
