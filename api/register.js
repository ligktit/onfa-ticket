import { connectDB, Ticket, TICKET_LIMITS } from './db.js';

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
    
    // Parse body (Vercel tự động parse JSON, nhưng đảm bảo có body)
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { name, email, phone, dob, tier, paymentImage } = body;

    // Optimized: Check both conditions in parallel
    const [count, exist] = await Promise.all([
      Ticket.countDocuments({ tier }),
      Ticket.findOne({ email }).select('_id') // Only select _id for existence check
    ]);
    
    if (count >= TICKET_LIMITS[tier]) {
      return res.status(400).json({ message: 'Loại vé này đã hết!' });
    }

    if (exist) {
      return res.status(400).json({ message: 'Email này đã được đăng ký!' });
    }

    // Tạo mã vé ngẫu nhiên
    const id = 'ONFA' + Date.now().toString().substr(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
    
    const newTicket = new Ticket({
      id, name, email, phone, dob, tier, paymentImage
    });

    await newTicket.save();
    res.json(newTicket);
  } catch (error) {
    console.error('Error in /api/register:', error);
    res.status(500).json({ message: "Lỗi Server: " + error.message });
  }
}
