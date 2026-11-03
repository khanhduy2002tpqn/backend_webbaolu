/**
 * CẤU HÌNH KẾT NỐI BACKEND RENDER CHO VERCEL FRONTEND
 * ---------------------------------------------------
 * Sau khi bạn deploy thư mục `backend/` lên Render và nhận được URL (ví dụ: https://hydro-camip-cloud-api.onrender.com),
 * hãy điền URL đó vào `API_BASE_URL` bên dưới (hoặc nhập trực tiếp trong mục ⚙️ Cài Đặt Cloud trên giao diện Web).
 *
 * Nếu để chuỗi rỗng "", ứng dụng vẫn hoạt động mượt 100% ở chế độ Mô Phỏng Độc Lập trên trình duyệt
 * và tự động kết nối localhost:8000 khi bạn chạy thử ở máy cá nhân!
 */
window.CAMIP_CLOUD_CONFIG = {
  API_BASE_URL: "https://backend-webbaolu.onrender.com/"
};

