# 🔍 Backend Error Debugging Guide

## ✅ Đã Cập Nhật

Tôi đã cải thiện backend với **enhanced logging** để dễ dàng debug lỗi trên Render.

### 📝 Thay Đổi Chính

1. **Detailed Logging** - Mỗi request giờ sẽ log:
   - ✅ Thông tin file upload (tên, kích thước, mimetype)
   - ✅ Thời gian xử lý
   - ✅ API credits remaining
   - ✅ Chi tiết lỗi cụ thể

2. **Better Error Handling** - Phân loại lỗi rõ ràng:
   - `400` - Invalid image format
   - `402` - **API quota exceeded** ⚠️
   - `403` - Invalid API key
   - `429` - Rate limit exceeded
   - `504` - Timeout

3. **Specific Error Messages** - User-friendly messages

---

## 🔍 Cách Debug Trên Render

### Bước 1: Xem Logs Trên Render
1. Vào Render Dashboard: https://dashboard.render.com
2. Click vào service **background-remover-api**
3. Click tab **Logs**
4. Thử upload ảnh và xem logs real-time

### Bước 2: Tìm Lỗi Cụ Thể

Logs sẽ hiển thị:

```
📤 Processing image: { filename: 'test.jpg', size: '234.56 KB', ... }
🔄 Calling remove.bg API...
❌ Error after 1234ms: Request failed with status code 402
📛 API Response Error: { status: 402, ... }
💰 QUOTA EXCEEDED - Need to check remove.bg account
```

---

## 🎯 Nguyên Nhân Có Thể

### 1. **API Quota Exceeded** (Khả năng cao nhất ⚠️)

Remove.bg free tier có giới hạn:
- **50 credits/month** miễn phí
- Mỗi ảnh = 1 credit

**Giải pháp:**
- Kiểm tra quota tại: https://www.remove.bg/users/sign_in
- Nâng cấp lên paid plan
- Hoặc đổi sang API khác (xem phần dưới)

### 2. **Invalid API Key**

API key trong code: `x1qW6tB1HhvQ9J4Z8uiojec1`

**Giải pháp:**
- Tạo API key mới tại: https://www.remove.bg/api
- Update env variable trên Render:
  - Vào service → Environment
  - Update `REMOVEBG_API_KEY`
  - Redeploy

### 3. **Network/Timeout Issues**

**Giải pháp:**
- Logs sẽ hiển thị `⏱️ Request timeout after 30s`
- Thử với ảnh nhỏ hơn

---

## 🚀 Deploy Code Mới Lên Render

### Option 1: Auto Deploy (Nếu đã connect GitHub)
```bash
git add .
git commit -m "Enhanced backend logging for debugging"
git push origin main
```

Render sẽ tự động deploy.

### Option 2: Manual Deploy
1. Vào Render Dashboard
2. Click service **background-remover-api**
3. Click **Manual Deploy** → **Deploy latest commit**

---

## 🔄 Giải Pháp Thay Thế

Nếu remove.bg hết quota, có thể dùng:

### 1. **Clipdrop API** (Recommended)
- 100 requests/month miễn phí
- Chất lượng tốt
- https://clipdrop.co/apis/docs/remove-background

### 2. **PhotoRoom API**
- 25 requests/month miễn phí
- https://www.photoroom.com/api

### 3. **Self-hosted RMBG-2.0**
- Hoàn toàn miễn phí
- Cần GPU để chạy nhanh
- https://github.com/AUTOMATIC1111/rembg

---

## 📊 Kiểm Tra Logs Ngay

Sau khi deploy code mới:

1. Vào Render Logs
2. Upload 1 ảnh test
3. Xem logs để biết chính xác lỗi gì:
   - Nếu thấy `💰 QUOTA EXCEEDED` → Hết quota
   - Nếu thấy `🔑 INVALID API KEY` → API key sai
   - Nếu thấy `⏱️ Request timeout` → Ảnh quá lớn

---

## 💡 Next Steps

1. **Deploy code mới** (đã có enhanced logging)
2. **Xem Render logs** để biết lỗi cụ thể
3. **Báo lại kết quả** để tôi giúp tiếp

Nếu là lỗi quota, tôi sẽ giúp bạn migrate sang API khác! 🚀
