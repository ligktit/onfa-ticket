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
    
    // Optimized: Use aggregation for stats and fetch tickets efficiently
    // Include paymentImage for thumbnails but exclude qrCodeDataURL (only needed for emails)
    const [tickets, statsResult] = await Promise.all([
      Ticket.find()
        .select('id name email phone dob tier status registeredAt paymentImage') // Include paymentImage for thumbnails
        .lean() // Use lean() for faster queries (returns plain JS objects)
        .sort({ registeredAt: -1 }), // Sort by newest first
      Ticket.aggregate([
        {
          $group: {
            _id: null,
            supervipCount: { $sum: { $cond: [{ $eq: ['$tier', 'supervip'] }, 1, 0] } },
            vvipCount: { $sum: { $cond: [{ $eq: ['$tier', 'vvip'] }, 1, 0] } },
            vipCount: { $sum: { $cond: [{ $eq: ['$tier', 'vip'] }, 1, 0] } },
            checkedInCount: { $sum: { $cond: [{ $eq: ['$status', 'CHECKED_IN'] }, 1, 0] } },
            totalRegistered: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const stats = statsResult[0] || { supervipCount: 0, vvipCount: 0, vipCount: 0, checkedInCount: 0, totalRegistered: 0 };

    res.json({
      tickets: tickets,
      stats: {
        supervipCount: stats.supervipCount,
        vvipCount: stats.vvipCount,
        vipCount: stats.vipCount,
        supervipLimit: TICKET_LIMITS.supervip,
        vvipLimit: TICKET_LIMITS.vvip,
        vipLimit: TICKET_LIMITS.vip,
        supervipRemaining: Math.max(0, TICKET_LIMITS.supervip - stats.supervipCount),
        vvipRemaining: Math.max(0, TICKET_LIMITS.vvip - stats.vvipCount),
        vipRemaining: Math.max(0, TICKET_LIMITS.vip - stats.vipCount),
        totalRegistered: stats.totalRegistered,
        totalCheckedIn: stats.checkedInCount
      }
    });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    res.status(500).json({ message: error.message });
  }
}
