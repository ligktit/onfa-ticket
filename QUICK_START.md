# 🚀 Quick Start - Deploy lên Vercel

## Bước nhanh (5 phút)

### 1. Push code lên GitHub
```bash
git add .
git commit -m "Ready for Vercel"
git push
```

### 2. Deploy trên Vercel

1. Truy cập: https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Import repository từ GitHub
4. Cấu hình:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 3. Thêm Environment Variables

Trong Vercel Dashboard → Settings → Environment Variables, thêm:

```
MONGO_URI = mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_test?appName=ONFA
VVIP_LIMIT = 5
VIP_LIMIT = 10
```

### 4. Deploy!

Click **"Deploy"** và đợi 2-5 phút.

### 5. Cấu hình MongoDB Atlas

1. Vào https://cloud.mongodb.com
2. Network Access → Add IP Address
3. Chọn **"Allow Access from Anywhere"** (0.0.0.0/0)

## ✅ Xong!

Truy cập URL Vercel cung cấp và test ứng dụng.

Xem file `DEPLOY.md` để biết chi tiết đầy đủ.
