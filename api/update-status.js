import { connectDB, Ticket } from './db.js';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
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

  // Tên vé theo config: supervip = "Vé Super VIP", vvip = "Vé VIP", vip = "Vé Superior"
  const tierName = ticket.tier === 'supervip' ? 'Vé Super VIP' : ticket.tier === 'vvip' ? 'Vé VIP' : 'Vé Superior';
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
          <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${tierName}</p>
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
  const statusChangeWebhookUrl = process.env.N8N_STATUS_CHANGE_WEBHOOK_URL || 'https://onfa-ticket-deploy.app.n8n.cloud/webhook/ticket-status';
  
  if (!statusChangeWebhookUrl) {
    console.warn('⚠️ n8n webhook URL not configured, skipping webhook call');
    return false;
  }

  try {
    const data = {
      event: 'ticket_status_changed',
      action: action, // 'append' or 'update'
      shouldUpdateSheets: true, // This is an approval/status change - should update Google Sheets
      ticket: {
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        phone: ticket.phone,
        dob: ticket.dob,
        tier: ticket.tier === 'supervip' ? 'Vé Super VIP' : ticket.tier === 'vvip' ? 'Vé VIP' : 'Vé Superior',
        status: ticket.status, // Only send current status
        registeredAt: ticket.registeredAt ? new Date(ticket.registeredAt).toISOString() : null,
        statusChangedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`\n🔗 ===== SENDING WEBHOOK TO N8N =====`);
    console.log(`🔗 URL: ${statusChangeWebhookUrl}`);
    console.log(`🔗 Method: POST`);
    console.log(`🔗 Headers:`, { 'Content-Type': 'application/json' });
    console.log(`🔗 Data:`, JSON.stringify(data, null, 2));
    console.log(`🔗 Full request URL: ${statusChangeWebhookUrl}`);
    console.log(`🔗 Environment: ${process.env.VERCEL ? 'Vercel/Production' : 'Local'}`);
    
    // Network connectivity check - log DNS resolution and connection attempt
    try {
      const urlObj = new URL(statusChangeWebhookUrl);
      console.log(`🔗 Hostname: ${urlObj.hostname}`);
      console.log(`🔗 Port: ${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}`);
      console.log(`🔗 Protocol: ${urlObj.protocol}`);
    } catch (urlError) {
      console.error(`❌ Invalid URL format:`, urlError);
    }
    
    const response = await axios.post(statusChangeWebhookUrl, data, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'onfa-ticket-webhook/1.0'
      },
      timeout: 15000, // Increased timeout to 15 seconds
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept 2xx and 4xx as valid responses
      },
      // Add these to help diagnose network issues
      httpAgent: false, // Use default HTTP agent
      httpsAgent: false, // Use default HTTPS agent
    });
    
    console.log(`✅ Webhook sent successfully to n8n`);
    console.log(`✅ Response status: ${response.status}`);
    console.log(`✅ Response headers:`, response.headers);
    console.log(`✅ Response data:`, JSON.stringify(response.data, null, 2));
    console.log(`✅ Full response:`, JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    }, null, 2));
    console.log(`🔗 ====================================\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ===== WEBHOOK ERROR =====`);
    console.error(`❌ URL: ${statusChangeWebhookUrl}`);
    console.error(`❌ Error message:`, error.message);
    console.error(`❌ Error code:`, error.code);
    console.error(`❌ Error name:`, error.name);
    
    // Network-specific error detection
    if (error.code === 'ENOTFOUND') {
      console.error(`❌ DNS Resolution Failed - Cannot resolve hostname`);
      console.error(`❌ This could indicate: DNS issue, wrong URL, or network problem`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Connection Refused - Host is not accepting connections`);
      console.error(`❌ This could indicate: Firewall blocking, service down, or wrong port`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error(`❌ Connection Timeout - Request took too long`);
      console.error(`❌ This could indicate: Network slow, firewall blocking, or service overloaded`);
    } else if (error.code === 'ECONNRESET') {
      console.error(`❌ Connection Reset - Server closed the connection`);
      console.error(`❌ This could indicate: Firewall blocking mid-connection or server issue`);
    } else if (error.code === 'EHOSTUNREACH') {
      console.error(`❌ Host Unreachable - Cannot reach the host`);
      console.error(`❌ This could indicate: Network routing issue or firewall blocking`);
    }
    
    if (error.response) {
      console.error(`❌ Response received:`);
      console.error(`❌   Status: ${error.response.status}`);
      console.error(`❌   Status Text: ${error.response.statusText}`);
      console.error(`❌   Headers:`, error.response.headers);
      console.error(`❌   Data:`, error.response.data);
    } else if (error.request) {
      console.error(`❌ No response received from server`);
      console.error(`❌ Request was made but no response received`);
      console.error(`❌ This usually indicates: Network issue, firewall blocking, or server not responding`);
      console.error(`❌ Request config:`, {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
        headers: error.config?.headers
      });
    } else {
      console.error(`❌ Error setting up request:`, error.message);
    }
    
    console.error(`❌ Full error object:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    console.error(`❌ ===========================\n`);
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
    
    const { ticketId, status, tier } = body;
    
    // Build update object
    const updateData = {};
    if (status) updateData.status = status;
    if (tier) updateData.tier = tier;
    
    // Optimized: Find and update in one operation
    const ticket = await Ticket.findOneAndUpdate(
      { id: ticketId },
      updateData,
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Vé không tồn tại!' });
    }

    // Send webhook to n8n for status/tier change logging (if status or tier changed)
    // This includes PAID, CHECKED_IN, PENDING, CANCELLED - all status changes
    console.log(`\n🔍 ===== CHECKING IF WEBHOOK SHOULD BE CALLED =====`);
    console.log(`🔍 Status parameter: ${status || 'undefined'}`);
    console.log(`🔍 Tier parameter: ${tier || 'undefined'}`);
    console.log(`🔍 Condition (status || tier): ${!!(status || tier)}`);
    
    if (status || tier) {
      try {
        const action = status === 'CHECKED_IN' ? 'update' : 'append';
        console.log(`\n📤 ===== CALLING WEBHOOK FOR STATUS CHANGE =====`);
        console.log(`📤 Ticket ID: ${ticket.id}`);
        console.log(`📤 Status: ${status || 'N/A'} (changed)`);
        console.log(`📤 Tier: ${tier || 'N/A'} (changed)`);
        console.log(`📤 Action: ${action}`);
        console.log(`📤 Ticket object:`, JSON.stringify(ticket, null, 2));
        await notifyStatusChange(ticket, action);
        console.log(`📤 Webhook call completed`);
        console.log(`📤 ============================================\n`);
      } catch (webhookError) {
        console.error('\n❌ ===== WEBHOOK CALL FAILED =====');
        console.error('❌ Error sending webhook to n8n:', webhookError);
        console.error('❌ Error stack:', webhookError.stack);
        console.error('❌ ====================================\n');
        // Don't fail the request if webhook fails
      }
    } else {
      console.log(`⚠️ Webhook NOT called - no status or tier change detected`);
      console.log(`🔍 ============================================\n`);
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
        
        // Check if SMTP credentials are available before attempting to send email
        if (SMTP_CONFIG.auth.user && SMTP_CONFIG.auth.pass) {
          // Gửi email (hàm sendTicketEmail sẽ tự check và tạo QR code nếu chưa có)
          await sendTicketEmail(updatedTicket);
          console.log(`✅ Đã gửi email vé cho ticket ${ticketId}`);
        } else {
          console.warn(`⚠️ SMTP credentials not configured, skipping email for ticket ${ticketId}`);
        }
      } catch (emailError) {
        console.error(`❌ Lỗi gửi email cho ticket ${ticketId}:`, emailError.message || emailError);
        // Không throw error để không làm gián đoạn việc cập nhật status
        // Email sẽ được gửi lại khi admin cập nhật lại status
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in /api/update-status:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      body: req.body
    });
    res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
