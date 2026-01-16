# 🎫 ONFA Ticket - Hệ thống đăng ký vé sự kiện

Hệ thống đăng ký và quản lý vé sự kiện ONFA 2026 với các tính năng:
- Đăng ký vé trực tuyến với upload ảnh thanh toán
- Quản lý vé qua Admin Panel
- Check-in vé bằng QR code
- Tự động gửi email vé khi admin xác nhận thanh toán

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 16.x
- MongoDB (hoặc MongoDB Atlas)
- Email SMTP (Gmail, Outlook, hoặc SMTP server khác)

### Cài đặt Frontend

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build
```

### Cài đặt Backend

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Chạy server
npm start
```

## ⚙️ Cấu hình

### 1. Cấu hình MongoDB

Mở file `server/server.js` và cập nhật `MONGO_URI` với connection string của MongoDB:

```javascript
const MONGO_URI = "mongodb+srv://username:password@cluster.mongodb.net/database?appName=ONFA";
```

### 2. Cấu hình SMTP Email

#### Bước 1: Tạo file `.env`

Trong thư mục `server/`, tạo file `.env` từ file mẫu `env.example`:

```bash
cd server
cp env.example .env
```

#### Bước 2: Điền thông tin SMTP

Mở file `.env` và điền thông tin SMTP của bạn:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
```

#### Bước 3: Cấu hình Gmail (nếu dùng Gmail)

1. **Bật 2-Step Verification:**
   - Vào [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → Bật

2. **Tạo App Password:**
   - Vào [App Passwords](https://myaccount.google.com/apppasswords)
   - Chọn "Mail" và "Other (Custom name)"
   - Nhập tên: "ONFA Ticket"
   - Copy mật khẩu được tạo (16 ký tự)
   - Dán vào `SMTP_PASS` trong file `.env`

**Lưu ý:** 
- KHÔNG dùng mật khẩu Gmail thường
- Phải dùng App Password (16 ký tự, không có khoảng trắng)
- Nếu không bật 2-Step Verification, sẽ không thể tạo App Password

#### Cấu hình SMTP khác (Outlook, SendGrid, etc.)

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Custom SMTP:**
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

### 3. Cấu hình số lượng vé

Mở file `server/server.js` và cập nhật `TICKET_LIMITS`:

```javascript
const TICKET_LIMITS = {
  vvip: 5,  // Số lượng vé VIP A
  vip: 10   // Số lượng vé VIP B
};
```

### 4. Cấu hình Admin Secret Key

Mở file `src/utils/config.js` và cập nhật `ADMIN_SECRET_KEY`:

```javascript
export const ADMIN_SECRET_KEY = "YOUR_SECRET_KEY_HERE";
```

## 📋 Flow hoạt động

### 1. Đăng ký vé (Client)
1. Client điền form đăng ký với thông tin:
   - Họ tên
   - Email
   - Số điện thoại
   - Ngày sinh
   - Hạng vé (VIP A hoặc VIP B)
   - Upload ảnh thanh toán
2. Sau khi submit, hệ thống hiển thị thông báo:
   > "Đã đăng ký thành công, vui lòng đợi xác nhận và nhận thông tin vé qua Email đã đăng ký"
3. Vé được lưu vào database với status `PENDING`

### 2. Xác nhận thanh toán (Admin)
1. Admin đăng nhập vào Admin Panel (`/admin/login`)
2. Vào Dashboard để xem danh sách vé
3. Xem ảnh thanh toán của client
4. Chọn status "Đã thanh toán" (PAID) cho vé đã xác nhận
5. **Hệ thống tự động:**
   - Tạo QR code từ mã vé
   - Gửi email vé với QR code tới email client đã đăng ký
   - Email bao gồm:
     - Thông tin vé đầy đủ
     - QR code để check-in
     - Hướng dẫn sử dụng

### 3. Check-in (Admin)
1. Admin vào trang Check-in
2. Quét QR code hoặc nhập mã vé thủ công
3. Hệ thống cập nhật status thành `CHECKED_IN`

## 🔐 Admin Panel

- **URL:** `/admin/login`
- **Secret Key:** Được cấu hình trong `src/utils/config.js`
- **Tính năng:**
  - Xem danh sách tất cả vé
  - Lọc và tìm kiếm vé
  - Xem ảnh thanh toán
  - Cập nhật trạng thái vé (Chờ CK, Đã thanh toán, Đã vào, Hủy)
  - Check-in vé bằng QR code scanner

## 📧 Email Template

Email vé tự động bao gồm:
- Header với logo ONFA 2026
- Thông tin vé đầy đủ (mã vé, họ tên, email, SĐT, ngày sinh, hạng vé)
- QR code để check-in
- File đính kèm QR code (PNG)
- Hướng dẫn sử dụng

## 🛠️ Công nghệ sử dụng

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router DOM
- html2canvas
- qrcode.react
- lucide-react

### Backend
- Node.js
- Express.js
- MongoDB / Mongoose
- Nodemailer (gửi email)
- QRCode (tạo QR code)

## 📁 Cấu trúc thư mục

```
onfa-ticket/
├── src/
│   ├── components/
│   │   ├── RegistrationForm.jsx  # Form đăng ký vé
│   │   ├── TicketView.jsx        # Hiển thị vé (đã lưu về máy)
│   │   └── StatCard.jsx          # Card thống kê
│   ├── pages/
│   │   ├── ClientApp.jsx         # Trang client
│   │   ├── AdminApp.jsx          # Trang admin
│   │   └── LoginPage.jsx          # Trang đăng nhập admin
│   ├── utils/
│   │   ├── api.js                # API client
│   │   └── config.js             # Cấu hình
│   └── assets/                   # Hình ảnh, assets
├── server/
│   ├── server.js                 # Backend server
│   ├── package.json
│   └── env.example               # Mẫu cấu hình SMTP
└── README.md
```

## 🔧 Troubleshooting

### Email không gửi được

1. **Kiểm tra cấu hình SMTP:**
   - Đảm bảo file `.env` tồn tại và có đúng format
   - Kiểm tra `SMTP_USER` và `SMTP_PASS` đã đúng chưa

2. **Với Gmail:**
   - Đảm bảo đã bật 2-Step Verification
   - Đã tạo App Password (không phải mật khẩu thường)
   - Kiểm tra App Password có đúng 16 ký tự không

3. **Kiểm tra logs:**
   - Xem console của server để biết lỗi cụ thể
   - Lỗi thường gặp: "Invalid login", "Authentication failed"

### QR code không hiển thị trong email

- Kiểm tra thư viện `qrcode` đã được cài đặt chưa
- Kiểm tra console server để xem có lỗi khi tạo QR code không

### MongoDB connection error

- Kiểm tra `MONGO_URI` trong `server/server.js`
- Đảm bảo IP đã được whitelist trong MongoDB Atlas (nếu dùng Atlas)
- Kiểm tra username/password trong connection string

## 📝 License

ISC

## 👥 Support

Nếu có vấn đề, vui lòng kiểm tra:
1. Console logs của server
2. Browser console
3. Network tab trong DevTools

---

**Lưu ý:** File `.env` chứa thông tin nhạy cảm, không commit vào git!
