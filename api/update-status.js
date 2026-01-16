import { connectDB, Ticket } from './db.js';
import QRCode from 'qrcode';

// Hàm tạo và lưu QR code vào database
async function generateAndSaveQRCode(ticket) {
  try {
    // Tạo QR code từ ticket ID
    const qrCodeDataURL = await QRCode.toDataURL(ticket.id, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    });
    
    // Lưu QR code vào database
    ticket.qrCodeDataURL = qrCodeDataURL;
    await ticket.save();
    
    console.log(`✅ Đã tạo và lưu QR code cho ticket ${ticket.id}`);
    return qrCodeDataURL;
  } catch (error) {
    console.error(`❌ Lỗi tạo QR code cho ticket ${ticket.id}:`, error);
    throw error;
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
    
    const { ticketId, status } = body;
    
    // Tìm ticket và cập nhật status
    const ticket = await Ticket.findOne({ id: ticketId });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }

    // Cập nhật status
    ticket.status = status;
    await ticket.save();

    // Nếu status là PAID, tạo QR code và lưu vào database
    if (status === 'PAID') {
      try {
        // Đảm bảo QR code đã được tạo và lưu vào database
        if (!ticket.qrCodeDataURL) {
          await generateAndSaveQRCode(ticket);
        }
        console.log(`✅ Đã tạo và lưu QR code cho ticket ${ticketId}`);
      } catch (qrError) {
        console.error(`❌ Lỗi tạo QR code cho ticket ${ticketId}:`, qrError);
        // Không throw error để không làm gián đoạn việc cập nhật status
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/update-status:', error);
    res.status(500).json({ message: error.message });
  }
}
