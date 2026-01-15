import { connectDB, Ticket } from './db.js';

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

    ticket.status = 'CHECKED_IN';
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    console.error('Error in /api/checkin:', error);
    res.status(500).json({ message: error.message });
  }
}
