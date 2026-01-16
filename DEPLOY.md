# Hướng dẫn Deploy lên Vercel

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn deploy ứng dụng ONFA Ticket lên Vercel với:
- Frontend: React + Vite
- Backend: Vercel Serverless Functions
- Database: MongoDB Atlas (đã có sẵn)

## 🔧 Yêu cầu

- Tài khoản Vercel (miễn phí): https://vercel.com
- Tài khoản GitHub/GitLab/Bitbucket
- MongoDB Atlas connection string (đã có)

## 📝 Bước 1: Chuẩn bị dự án

### 1.1. Kiểm tra cấu trúc thư mục

Đảm bảo bạn có các file sau:
```
onfa-ticket/
├── api/                    # Serverless Functions
│   ├── db.js
│   ├── stats.js
│   ├── register.js
│   ├── checkin.js
│   └── update-status.js
├── src/                    # Frontend React
├── vercel.json             # Cấu hình Vercel
├── package.json
└── vite.config.js
```

### 1.2. Commit code lên Git

```bash
# Khởi tạo git repository (nếu chưa có)
git init

# Thêm tất cả files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Tạo repository trên GitHub và push code
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 🚀 Bước 2: Deploy lên Vercel

### Cách 1: Deploy qua Vercel Dashboard (Khuyến nghị)

1. **Đăng nhập Vercel**
   - Truy cập: https://vercel.com
   - Đăng nhập bằng GitHub/GitLab/Bitbucket

2. **Import Project**
   - Click "Add New..." → "Project"
   - Chọn repository `onfa-ticket` từ GitHub
   - Click "Import"

3. **Cấu hình Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   Thêm các biến môi trường sau:
   
   | Key | Value | Mô tả | Môi trường |
   |-----|-------|-------|------------|
   | `MONGO_URI` | `mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_events?appName=ONFA` | MongoDB connection string | Production, Preview, Development |
   | `VVIP_LIMIT` | `5` | Số lượng vé VIP A | Production, Preview, Development |
   | `VIP_LIMIT` | `10` | Số lượng vé VIP B | Production, Preview, Development |
   | `VITE_API_URL` | (để trống) | API URL (tự động dùng `/api` trên Vercel) | Production, Preview, Development |

   **Cách thêm:**
   - Scroll xuống phần "Environment Variables"
   - Click "Add" cho mỗi biến
   - **Key**: Nhập tên biến (ví dụ: `MONGO_URI`)
   - **Value**: Nhập giá trị (ví dụ: connection string)
   - **Environment**: Chọn tất cả (Production, Preview, Development)
   - Click "Save"
   - Lặp lại cho tất cả các biến

5. **Deploy**
   - Click "Deploy"
   - Đợi quá trình build hoàn tất (2-5 phút)

### Cách 2: Deploy qua Vercel CLI

1. **Cài đặt Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Đăng nhập**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # Deploy lần đầu
   vercel

   # Deploy production
   vercel --prod
   ```

4. **Thiết lập Environment Variables**
   ```bash
   vercel env add MONGO_URI
   vercel env add VVIP_LIMIT
   vercel env add VIP_LIMIT
   ```

## ⚙️ Bước 3: Cấu hình MongoDB Atlas

### 3.1. Cho phép IP Vercel truy cập MongoDB

1. Đăng nhập MongoDB Atlas: https://cloud.mongodb.com
2. Vào **Network Access**
3. Click **Add IP Address**
4. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - Hoặc thêm IP cụ thể của Vercel nếu cần bảo mật hơn

### 3.2. Kiểm tra Database Connection

- Database: `onfa_events`
- Collection: `tickets`
- Connection string đã được cấu hình trong `MONGO_URI`

## 🔍 Bước 4: Kiểm tra sau khi Deploy

### 4.1. Kiểm tra Frontend

1. Truy cập URL được Vercel cung cấp (ví dụ: `https://onfa-ticket.vercel.app`)
2. Kiểm tra:
   - ✅ Trang chủ load được
   - ✅ Form đăng ký hiển thị
   - ✅ Có thể đăng ký vé

### 4.2. Kiểm tra API

Test các endpoints:
```bash
# Stats API
curl https://your-app.vercel.app/api/stats

# Register API (test với Postman hoặc curl)
curl -X POST https://your-app.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0123456789","dob":"01-01-2000","tier":"vip","paymentImage":"data:image/png;base64,..."}'
```

### 4.3. Kiểm tra Admin Panel

1. Truy cập: `https://your-app.vercel.app/admin/login`
2. Nhập secret key: `ONFA123`
3. Kiểm tra:
   - ✅ Đăng nhập thành công
   - ✅ Dashboard load được dữ liệu
   - ✅ Check-in hoạt động

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Cannot find module"
- **Nguyên nhân**: Thiếu dependencies
- **Giải pháp**: Đảm bảo `package.json` có đầy đủ dependencies, chạy `npm install` trước khi deploy

### Lỗi: "MongoDB connection failed"
- **Nguyên nhân**: 
  - IP không được whitelist trong MongoDB Atlas
  - Connection string sai
- **Giải pháp**: 
  - Kiểm tra Network Access trong MongoDB Atlas
  - Kiểm tra lại `MONGO_URI` trong Environment Variables

### Lỗi: "Function timeout"
- **Nguyên nhân**: Function chạy quá lâu (>30s)
- **Giải pháp**: Đã cấu hình `maxDuration: 30` trong `vercel.json`

### Lỗi: "CORS error"
- **Nguyên nhân**: CORS chưa được cấu hình
- **Giải pháp**: Đã thêm CORS headers trong các API functions

## 📊 Monitoring và Logs

### Xem Logs trên Vercel

1. Vào Dashboard → Chọn project
2. Click tab **Functions**
3. Click vào function để xem logs chi tiết

### Xem Logs trong Code

Tất cả logs sẽ hiển thị trong Vercel Dashboard:
- Console.log() → Function logs
- Console.error() → Error logs

## 🔄 Cập nhật sau khi Deploy

### Cập nhật Code

```bash
# Commit changes
git add .
git commit -m "Update feature"
git push

# Vercel sẽ tự động deploy lại
```

### Cập nhật Environment Variables

1. Vào Vercel Dashboard → Project → Settings → Environment Variables
2. Sửa giá trị và Save
3. Redeploy project

## 📱 Cấu hình Custom Domain (Tùy chọn)

1. Vào Vercel Dashboard → Project → Settings → Domains
2. Thêm domain của bạn
3. Cấu hình DNS theo hướng dẫn của Vercel

## 🔐 Bảo mật

### Khuyến nghị:

1. **MongoDB Atlas**:
   - Sử dụng Database User riêng (không dùng admin)
   - Giới hạn IP whitelist nếu có thể
   - Bật MongoDB Atlas Encryption

2. **Environment Variables**:
   - Không commit `.env` files
   - Sử dụng Vercel Environment Variables
   - Rotate secrets định kỳ

3. **API Security**:
   - Cân nhắc thêm rate limiting
   - Validate input data
   - Sanitize user inputs

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trong Vercel Dashboard
2. Kiểm tra MongoDB Atlas logs
3. Xem Vercel Documentation: https://vercel.com/docs

## ✅ Checklist trước khi Deploy

- [ ] Code đã được commit và push lên Git
- [ ] `vercel.json` đã được tạo
- [ ] `api/` folder có đầy đủ functions
- [ ] Environment Variables đã được cấu hình
- [ ] MongoDB Atlas IP whitelist đã được cấu hình
- [ ] Đã test local với `npm run build`
- [ ] Đã kiểm tra tất cả API endpoints

---

**Chúc bạn deploy thành công! 🎉**
