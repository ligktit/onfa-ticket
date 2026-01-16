// Load environment variables từ file .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { TICKET_LIMITS } = require('../ticket-limits.cjs');

const app = express();
const PORT = 5000;

// 1. Cấu hình để Frontend nói chuyện được với Backend
app.use(cors());
// Cấu hình để nhận được ảnh upload (tăng giới hạn dung lượng lên 10MB)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// 2. Kết nối tới MongoDB với database onfa_events
// Database: onfa_events, Collection: tickets
const MONGO_URI = "mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_events?appName=ONFA";

mongoose.connect(MONGO_URI, {
  dbName: 'onfa_events' // Explicitly specify database name
})
  .then(() => console.log("✅ Đã kết nối thành công tới MongoDB Cloud - Database: onfa_events"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// 3. Tạo khuôn mẫu cho vé (Schema)
const TicketSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  email: String,
  phone: String,
  dob: String,         // Ngày sinh
  tier: String,        // Hạng vé
  paymentImage: String,// Ảnh thanh toán (Base64)
  status: { type: String, default: 'PENDING' },
  registeredAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', TicketSchema);

// Cấu hình SMTP Email (có thể thay đổi bằng environment variables)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
};

// Tạo transporter cho nodemailer
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Hàm gửi email vé với QR code
const sendTicketEmail = async (ticket) => {
  try {
    // Tạo QR code từ ticket ID
    const qrCodeDataURL = await QRCode.toDataURL(ticket.id, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    });

    // Tạo HTML email với QR code
    const tierName = ticket.tier === 'vvip' ? 'VIP A' : 'VIP B';
    const qrCodeCid = `qr-${ticket.id}@onfa`;
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              color: #000;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 2px solid #fbbf24;
              border-top: none;
            }
            .ticket-info {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .qr-code {
              text-align: center;
              margin: 30px 0;
            }
            .qr-code img {
              border: 3px solid #fbbf24;
              border-radius: 10px;
              padding: 10px;
              background: white;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #666;
              font-size: 12px;
            }
            .ticket-id {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              color: #f59e0b;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">🎉 ONFA 2026</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Vé ${tierName}</p>
          </div>
          <div class="content">
            <h2>Xin chào ${ticket.name}!</h2>
            <p>Cảm ơn bạn đã đăng ký tham gia sự kiện ONFA 2026. Vé của bạn đã được xác nhận thanh toán thành công!</p>
            
            <div class="ticket-info">
              <h3 style="margin-top: 0;">Thông tin vé:</h3>
              <p><strong>Mã vé:</strong> <span class="ticket-id">${ticket.id}</span></p>
              <p><strong>Họ tên:</strong> ${ticket.name}</p>
              <p><strong>Email:</strong> ${ticket.email}</p>
              <p><strong>Số điện thoại:</strong> ${ticket.phone}</p>
              <p><strong>Ngày sinh:</strong> ${ticket.dob}</p>
              <p><strong>Hạng vé:</strong> ${tierName}</p>
            </div>

            <div class="qr-code">
              <p style="font-weight: bold; margin-bottom: 10px;">Mã QR Code của vé:</p>
              <img src="cid:${qrCodeCid}" alt="QR Code" />
              <p style="margin-top: 10px; font-size: 14px; color: #666;">
                Vui lòng trình mã QR này khi check-in tại sự kiện
              </p>
            </div>

            <p><strong>Lưu ý:</strong></p>
            <ul>
              <li>Vui lòng giữ email này để làm bằng chứng đăng ký</li>
              <li>Mang theo mã QR code khi đến sự kiện để check-in</li>
              <li>Nếu có thắc mắc, vui lòng liên hệ ban tổ chức</li>
            </ul>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Ban tổ chức ONFA 2026</p>
          </div>
        </body>
      </html>
    `;

    // Gửi email
    const mailOptions = {
      from: `"ONFA 2026" <${SMTP_CONFIG.auth.user}>`,
      to: ticket.email,
      subject: '🎫 Vé ONFA 2026 của bạn - Xác nhận thanh toán thành công',
      html: emailHTML,
      attachments: [
        {
          filename: `QR_${ticket.id}.png`,
          content: qrCodeDataURL.split('base64,')[1],
          encoding: 'base64',
          cid: qrCodeCid,
          contentDisposition: 'inline'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Đã gửi email vé tới ${ticket.email} (Ticket ID: ${ticket.id})`);
    return true;
  } catch (error) {
    console.error(`❌ Lỗi gửi email tới ${ticket.email}:`, error);
    return false;
  }
};

// --- CÁC ĐƯỜNG DẪN (API) ĐỂ FRONTEND GỌI ---

// API 1: Lấy thống kê vé
app.get('/api/stats', async (req, res) => {
  try {
    const tickets = await Ticket.find(); // Lấy hết vé trong kho ra đếm
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
    res.status(500).json({ message: error.message });
  }
});

// API 2: Đăng ký vé mới
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, dob, tier, paymentImage } = req.body;

    // Kiểm tra xem còn vé không
    const count = await Ticket.countDocuments({ tier });
    if (count >= TICKET_LIMITS[tier]) {
      return res.status(400).json({ message: 'Loại vé này đã hết!' });
    }

    // Kiểm tra email trùng
    const exist = await Ticket.findOne({ email });
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
    console.error(error); // In lỗi ra terminal server để dễ sửa
    res.status(500).json({ message: "Lỗi Server: " + error.message });
  }
});

// API 3: Check-in
app.post('/api/checkin', async (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findOne({ id: ticketId });

    if (!ticket) return res.status(404).json({ message: 'Vé không tồn tại!' });
    if (ticket.status === 'CHECKED_IN') return res.status(400).json({ message: 'Vé đã check-in rồi!' });

    ticket.status = 'CHECKED_IN';
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API 4: Cập nhật trạng thái (Admin)
app.post('/api/update-status', async (req, res) => {
  try {
    const { ticketId, status } = req.body;
    const ticket = await Ticket.findOne({ id: ticketId });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }

    // Cập nhật status
    ticket.status = status;
    await ticket.save();

    // Nếu status là PAID, gửi email vé tới client
    if (status === 'PAID') {
      try {
        await sendTicketEmail(ticket);
        console.log(`✅ Đã gửi email vé cho ticket ${ticketId}`);
      } catch (emailError) {
        console.error(`❌ Lỗi gửi email cho ticket ${ticketId}:`, emailError);
        // Không throw error để không làm gián đoạn việc cập nhật status
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});