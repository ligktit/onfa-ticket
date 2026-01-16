import { connectDB, Ticket } from './db.js';

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
    
    // Get ticketId from query parameter
    const { ticketId } = req.query;
    
    if (!ticketId) {
      return res.status(400).json({ message: 'Ticket ID is required' });
    }
    
    // Only fetch paymentImage field for performance
    const ticket = await Ticket.findOne({ id: ticketId }).select('paymentImage').lean();
    
    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }
    
    res.json({ paymentImage: ticket.paymentImage || null });
  } catch (error) {
    console.error('Error in /api/ticket-image:', error);
    res.status(500).json({ message: error.message });
  }
}
