const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// 1. Cấu hình để Frontend nói chuyện được với Backend
app.use(cors());
// Cấu hình để nhận được ảnh upload (tăng giới hạn dung lượng lên 10MB)
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// 2. Kết nối tới "Tủ lạnh" MongoDB của bạn
// Mình đã thêm /onfa_data vào sau .net để tạo một ngăn chứa riêng tên là onfa_data
const MONGO_URI = "mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/?appName=ONFA";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối thành công tới MongoDB Cloud!"))
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

// Cấu hình số lượng vé
const TICKET_LIMITS = {
  vvip: 50,
  vip: 200
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
    await Ticket.findOneAndUpdate({ id: ticketId }, { status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});