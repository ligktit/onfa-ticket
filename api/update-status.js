import { connectDB, Ticket } from './db.js';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Hàm tạo QR code từ Ticket ID (không lưu vào database vì có thể tạo lại bất cứ lúc nào)
async function generateQRCode(ticketId) {
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
}

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const sendTicketEmail = async (ticket) => {
  if (!SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    throw new Error('Missing SMTP credentials');
  }

  // Tạo QR code từ Ticket ID (không lưu vào database)
  // QR code được tạo từ ticket.id, khi scan sẽ decode ra chính ticket.id
  const qrCodeDataURL = await generateQRCode(ticket.id);

  const tierName = ticket.tier === 'supervip' ? 'Super VIP' : ticket.tier === 'vvip' ? 'VIP A' : 'VIP B';
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
            <img src="${qrCodeDataURL}" alt="QR Code" />
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

  const transporter = nodemailer.createTransport(SMTP_CONFIG);
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
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

// n8n webhook service (simplified version for Vercel)
async function notifyStatusChange(ticket, action = 'append') {
  const statusChangeWebhookUrl = process.env.N8N_STATUS_CHANGE_WEBHOOK_URL;
  
  if (!statusChangeWebhookUrl) {
    console.warn('⚠️ n8n webhook URL not configured, skipping webhook call');
    return false;
  }

  try {
    const data = {
      event: 'ticket_status_changed',
      action: action, // 'append' or 'update'
      ticket: {
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        dob: ticket.dob,
        tier: ticket.tier === 'vvip' ? 'VIP A' : 'VIP B',
        status: ticket.status, // Only send current status
        registeredAt: ticket.registeredAt ? new Date(ticket.registeredAt).toISOString() : null,
        statusChangedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await axios.post(statusChangeWebhookUrl, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    
    console.log(`✅ Webhook sent successfully to n8n`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending webhook to n8n:`, error.message);
    return false;
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
    
    // Optimized: Find and update in one operation
    const ticket = await Ticket.findOneAndUpdate(
      { id: ticketId },
      { status },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }

    // Nếu status là PAID, tạo QR code và gửi email
    if (status === 'PAID') {
      try {
        // Reload ticket từ database để đảm bảo có dữ liệu mới nhất (bao gồm status đã cập nhật)
        const updatedTicket = await Ticket.findOne({ id: ticketId });
        
        if (!updatedTicket) {
          console.error(`❌ Không tìm thấy ticket ${ticketId} sau khi cập nhật`);
          // Vẫn trả về success vì status đã được cập nhật thành công
          return res.json({ success: true });
        }
        
        // Gửi email (hàm sendTicketEmail sẽ tự check và tạo QR code nếu chưa có)
        await sendTicketEmail(updatedTicket);
        console.log(`✅ Đã gửi email vé cho ticket ${ticketId} (QR code sẽ được tạo tự động nếu chưa có)`);
      } catch (error) {
        console.error(`❌ Lỗi gửi email cho ticket ${ticketId}:`, error);
        // Không throw error để không làm gián đoạn việc cập nhật status
        // Email sẽ được gửi lại khi admin cập nhật lại status
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/update-status:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
