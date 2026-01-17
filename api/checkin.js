import { connectDB, Ticket } from './db.js';
import Pusher from 'pusher';

// Initialize Pusher (using environment variables from Vercel)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'us2',
  useTLS: true
});

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
    if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
      try {
        await pusher.trigger('check-ins', 'ticket-checked-in', eventData);
        console.log(`✅ Pusher event published: ticket-checked-in for ${ticket.id}`);
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
