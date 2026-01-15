import { connectDB, Ticket, TICKET_LIMITS } from './db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const tickets = await Ticket.find();
    const vvipCount = tickets.filter(t => t.tier === 'vvip').length;
    const vipCount = tickets.filter(t => t.tier === 'vip').length;
    const checkedInCount = tickets.filter(t => t.status === 'CHECKED_IN').length;

    res.json({
      tickets: tickets,
      stats: {
        vvipCount,
        vipCount,
        vvipLimit: TICKET_LIMITS.vvip,
        vipLimit: TICKET_LIMITS.vip,
        vvipRemaining: Math.max(0, TICKET_LIMITS.vvip - vvipCount),
        vipRemaining: Math.max(0, TICKET_LIMITS.vip - vipCount),
        totalRegistered: tickets.length,
        totalCheckedIn: checkedInCount
      }
    });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ message: error.message });
  }
}
