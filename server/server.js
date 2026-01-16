// Load environment variables từ file .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const n8nWebhookService = require('./n8nWebhookService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins in development, restrict in production
    methods: ["GET", "POST"]
  }
});
const PORT = 5000;

// 1. Cấu hình để Frontend nói chuyện được với Backend
app.use(compression()); // Compress responses to reduce size
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
  id: { type: String, unique: true, index: true }, // Index for faster lookups
  name: String,
  email: { type: String, index: true }, // Index for faster email lookups
  phone: String,
  dob: String,         // Ngày sinh
  tier: { type: String, index: true }, // Index for faster tier filtering
  paymentImage: String,// Ảnh thanh toán (Base64)
  qrCodeDataURL: String, // QR code image (Base64 Data URL)
  status: { type: String, default: 'PENDING', index: true }, // Index for faster status filtering
  registeredAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', TicketSchema);

// Cấu hình số lượng vé
const TICKET_LIMITS = {
  supervip: 10,
  vvip: 5,
  vip: 10
};

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

// Hàm tạo QR code từ Ticket ID (không lưu vào database vì có thể tạo lại bất cứ lúc nào)
const generateQRCode = async (ticketId) => {
  try {
    // Tạo QR code từ ticket ID - khi scan sẽ decode ra chính Ticket ID
    const qrCodeDataURL = await QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1
    });
    
    console.log(`✅ Đã tạo QR code cho ticket ${ticketId}`);
    return qrCodeDataURL;
  } catch (error) {
    console.error(`❌ Lỗi tạo QR code cho ticket ${ticketId}:`, error);
    throw error;
  }
};

// Hàm gửi email vé với QR code
const sendTicketEmail = async (ticket) => {
  try {
    // Tạo QR code từ Ticket ID (không lưu vào database)
    // QR code được tạo từ ticket.id, khi scan sẽ decode ra chính ticket.id
    const qrCodeDataURL = await generateQRCode(ticket.id);

    // Tạo HTML email với QR code
    const tierName = ticket.tier === 'supervip' ? 'Super VIP' : ticket.tier === 'vvip' ? 'VIP A' : 'VIP B';
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
            <p style="font-weight: bold; margin-bottom: 10px;">Mã QR Code của vé nằm trong tệp đính kèm"</p>
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
  const startTime = Date.now();
  try {
    console.log('📊 /api/stats called');
    console.log(`📊 MongoDB Connection State: ${mongoose.connection.readyState}`);
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Optimized: Use aggregation for stats and fetch tickets efficiently
    // Fetch paymentImage but exclude qrCodeDataURL (only needed for emails, not dashboard)
    const queryStartTime = Date.now();
    
    const [tickets, statsResult] = await Promise.all([
      Ticket.find()
        .select('id name email phone dob tier status registeredAt paymentImage') // Include paymentImage for dashboard thumbnails
        .lean() // Use lean() for faster queries (returns plain JS objects, not Mongoose documents)
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
    
    const queryTime = Date.now() - queryStartTime;
    const stats = statsResult[0] || { supervipCount: 0, vvipCount: 0, vipCount: 0, checkedInCount: 0, totalRegistered: 0 };
    console.log(`📊 Found ${stats.totalRegistered} tickets in ${queryTime}ms (DB query time)`);

    const response = {
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
    };
    
    // Calculate response size for debugging
    const responseSize = JSON.stringify(response).length;
    const responseSizeKB = (responseSize / 1024).toFixed(2);
    const responseSizeMB = (responseSize / (1024 * 1024)).toFixed(2);
    
    const duration = Date.now() - startTime;
    console.log(`📊 Response sent in ${duration}ms`);
    console.log(`📊 Response size: ${responseSizeKB} KB (${responseSizeMB} MB)`);
    
    // Warn if response is too large
    if (responseSize > 5 * 1024 * 1024) { // > 5MB
      console.warn(`⚠️ Large response size detected! Consider pagination or excluding large fields.`);
    }
    
    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error in /api/stats after ${duration}ms:`, error);
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
    
    // Send webhook to n8n to UPDATE existing row (not append)
    await n8nWebhookService.notifyStatusChange(ticket, 'update');
    
    // Emit Socket.IO event to notify all connected admin clients
    io.emit('ticket-checked-in', {
      ticketId: ticket.id,
      name: ticket.name,
      email: ticket.email,
      phone: ticket.phone,
      dob: ticket.dob,
      tier: ticket.tier,
      paymentImage: ticket.paymentImage,
      status: ticket.status,
      checkedInAt: new Date()
    });
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API 4.5: Get payment image for a specific ticket (on-demand loading)
app.get('/api/ticket/:ticketId/image', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findOne({ id: ticketId }).select('paymentImage');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }
    
    res.json({ paymentImage: ticket.paymentImage || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API 4: Cập nhật trạng thái (Admin)
app.post('/api/update-status', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`🔄 /api/update-status called for ticket: ${req.body.ticketId}`);
    const { ticketId, status, tier } = req.body;
    
    // Find and update ticket
    const findStartTime = Date.now();
    const ticket = await Ticket.findOne({ id: ticketId });
    const findTime = Date.now() - findStartTime;
    console.log(`⏱️ Ticket lookup took ${findTime}ms`);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }
    
    // Cập nhật status và/hoặc tier
    if (status) {
      ticket.status = status;
      console.log(`📝 Updating status to: ${status}`);
    }
    if (tier) {
      ticket.tier = tier;
      console.log(`📝 Updating tier to: ${tier}`);
    }
    
    const saveStartTime = Date.now();
    await ticket.save();
    const saveTime = Date.now() - saveStartTime;
    console.log(`⏱️ Ticket save took ${saveTime}ms`);

    // Send webhook to n8n for status change logging (non-blocking, don't wait if slow)
    // If PAID: append new row, if CHECKED_IN: update existing row
    if (status) {
      const action = status === 'CHECKED_IN' ? 'update' : 'append';
      const webhookStartTime = Date.now();
      try {
        await Promise.race([
          n8nWebhookService.notifyStatusChange(ticket, action),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Webhook timeout')), 10000)
          )
        ]);
        const webhookTime = Date.now() - webhookStartTime;
        console.log(`⏱️ Webhook sent in ${webhookTime}ms`);
      } catch (webhookError) {
        console.warn(`⚠️ Webhook failed or timed out (non-critical):`, webhookError.message);
        // Don't fail the request if webhook fails
      }
    }

    // Nếu status là PAID, tạo QR code và gửi email vé tới client
    if (status === 'PAID') {
      try {
        console.log(`📧 Starting email send for ticket ${ticketId}...`);
        const emailStartTime = Date.now();
        
        // Gửi email với QR code (tự động tạo từ Ticket ID khi gửi email)
        // Set timeout cho email sending (30 seconds max)
        await Promise.race([
          sendTicketEmail(ticket),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email send timeout')), 30000)
          )
        ]);
        
        const emailTime = Date.now() - emailStartTime;
        console.log(`✅ Đã gửi email vé cho ticket ${ticketId} trong ${emailTime}ms`);
      } catch (emailError) {
        console.error(`❌ Lỗi gửi email cho ticket ${ticketId}:`, emailError.message || emailError);
        // Không throw error để không làm gián đoạn việc cập nhật status
        // Email sẽ được gửi lại khi admin cập nhật lại status
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ /api/update-status completed in ${totalTime}ms`);
    res.json({ success: true });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error in /api/update-status after ${totalTime}ms:`, error);
    res.status(500).json({ message: error.message });
  }
});


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ Admin client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Admin client disconnected: ${socket.id}`);
  });
});

// Khởi động server - Listen on all network interfaces (0.0.0.0) to allow phone access
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server đã sẵn sàng`);
  console.log(`🌐 Network access: http://[your-ip]:${PORT}`);
});