# 🌊 CamIP & Thủy Văn Vũ Gia – Thu Bồn (Cloud Edition: Render + Vercel)

Bộ mã nguồn độc lập để triển khai **Trung Tâm Điều Hành Bão Lũ & Mô Phỏng Camera AI An Toàn Sông Nước** lên Internet:
- **`backend/` (Render)**: FastAPI siêu nhẹ (`< 45MB` RAM, chạy mượt trên **Render Free Tier 512MB**), đồng bộ thời gian thực số liệu 4 hồ thủy điện (`A Vương`, `Đăk Mi 4`, `Sông Bung 4`, `Sông Tranh 2`) từ PCTT Đà Nẵng, 9 trạm sông BĐ1–BĐ3, báo cáo cộng đồng và WebSocket cảnh báo + mô phỏng lưu sự cố 20 giây (`10s trước & 10s sau`). Không yêu cầu Camera IP RTSP nội bộ hay PyTorch/OpenCV nặng.
- **`frontend/` (Vercel)**: Dashboard Web GIS Google Maps (Vệ tinh / Giao thông), Dự báo ngập Điện Bàn Tây 2–3h, Biểu đồ diễn biến lũ 12h và **Trình mô phỏng Camera AI Sông Nước 60 FPS** ngay trên trình duyệt (kèm chế độ tự hoạt động mượt mà ngay cả khi Render Free Tier đang khởi động lại sau khi ngủ).

---

## Cấu trúc thư mục

```text
cloud-deploy/
├── render.yaml               # Blueprint tự động cấu hình Render từ thư mục gốc
├── backend/                  # Deploy lên Render (Python FastAPI)
│   ├── app.py                # REST API + WebSocket (/ws/alerts) + Mô phỏng sự cố
│   ├── hydrology_service.py  # Đồng bộ thủy điện PCTT Đà Nẵng + 9 trạm sông + Cộng đồng
│   ├── requirements.txt      # Chỉ 4 gói nhẹ (fastapi, uvicorn, pydantic, websockets)
│   ├── .python-version       # Python 3.11.9
│   └── render.yaml           # Blueprint nếu đẩy riêng thư mục backend/
└── frontend/                 # Deploy lên Vercel (Static Web GIS + Simulator)
    ├── index.html            # Giao diện Command Center + Modal Mô phỏng Camera AI
    ├── config.js             # Cấu hình URL Backend Render (API_BASE_URL)
    ├── app.js                # Logic Thủy văn, Google Maps, Dự báo & Canvas Simulator 60 FPS
    ├── styles.css            # Giao diện Dark Command Center
    ├── vercel.json           # Cấu hình định tuyến SPA trên Vercel
    └── package.json          # Metadata dự án tĩnh (Zero-build)
```

---

## Bước 1: Đẩy thư mục `cloud-deploy` lên GitHub

Mở PowerShell tại thư mục `cloud-deploy` và đẩy lên 1 repository GitHub mới:

```powershell
cd c:\Users\KHANHDUY-PC\AndroidStudioProjects\CamIp\cloud-deploy
git init
git add .
git commit -m "Initial Cloud Deployment (Render Backend + Vercel Frontend)"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<TEN_REPO>.git
git push -u origin main
```

---

## Bước 2: Deploy Backend lên Render.com

1. Đăng nhập [https://dashboard.render.com](https://dashboard.render.com) → bấm **New +** → chọn **Web Service**.
2. Kết nối tới repository GitHub vừa tạo ở Bước 1.
3. Điền cấu hình:
   - **Name**: `camip-hydrology-api` (hoặc tên tùy ý)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Bấm **Deploy Web Service**. Sau khoảng 1–2 phút, Render sẽ cấp cho bạn đường dẫn HTTPS dạng:
   - `https://camip-hydrology-api.onrender.com`
   - Kiểm tra nhanh bằng cách mở `https://camip-hydrology-api.onrender.com/health`.

---

## Bước 3: Kết nối URL Render vào Frontend & Deploy lên Vercel

### 3.1. Điền URL Render vào `frontend/config.js`
Mở file `frontend/config.js` và điền URL Render vừa nhận được ở Bước 2:

```js
window.CAMIP_CLOUD_CONFIG = {
    API_BASE_URL: "https://camip-hydrology-api.onrender.com",
};
```

Commit và push thay đổi lên GitHub:
```powershell
git add frontend/config.js
git commit -m "Configure Render API URL"
git push
```
*(Mẹo: Bạn cũng có thể đổi trực tiếp URL Backend ngay trên giao diện Web tại mục **Mở Mô Phỏng Camera AI → Tab ⚙️ Kết Nối Cloud** mà không cần sửa code).*

### 3.2. Deploy Frontend lên Vercel.com
1. Đăng nhập [https://vercel.com/new](https://vercel.com/new) → **Import** cùng repository GitHub đó.
2. Cấu hình Project:
   - **Framework Preset**: `Other`
   - **Root Directory**: bấm **Edit** → chọn `frontend`
   - **Build Command**: *(để trống)*
   - **Output Directory**: `.` *(hoặc để mặc định)*
3. Bấm **Deploy**. Vercel sẽ xuất bản trang web tại `https://<ten-du-an>.vercel.app`.

---

## Kiểm thử nhanh trên máy Local (Tùy chọn)

- **Chạy thử Backend**:
  ```powershell
  cd backend
  pip install -r requirements.txt
  uvicorn app:app --host 0.0.0.0 --port 8090
  ```
- **Chạy thử Frontend**:
  Mở `http://localhost:8090` (hoặc dùng `npx serve frontend` và nhập `http://localhost:8090` vào tab **⚙️ Kết Nối Cloud**).

