# Checkpoint: App Montessori chính trước Phase 3 — CMS Import Automation

Tài liệu này ghi nhận trạng thái hoạt động của App Montessori chính sau khi hoàn thành kết nối End-to-End với Content Studio v1 và trước khi bước vào Phase 3 (CMS Import Automation).

---

## 🎯 1. Mục tiêu Checkpoint
* **Tạo điểm tựa an toàn**: Ghi nhận toàn bộ cấu hình, trạng thái hoạt động và các điều kiện E2E ổn định của App Montessori chính.
* **Xác định các ràng buộc (Invariants)**: Liệt kê các quy tắc nghiệp vụ và kỹ thuật không được phép phá vỡ trong quá trình tự động hóa import ở Phase 3.
* **Rollback plan**: Đảm bảo có thể nhanh chóng quay về mốc an toàn này nếu quá trình nghiên cứu/phát triển Phase 3 xảy ra lỗi.

---

## 📊 2. Trạng thái App Montessori chính trước Phase 3
* **Cấu hình Firebase**: Sử dụng dự án `montessori-d01e0` (Live URL: `https://montessori-d01e0.web.app`).
* **Phiên bản build**: Vite + React chạy ổn định.
* **Firestore Security Rules**: Đã được kiểm thử và xác thực thông qua 53/53 test tĩnh và 22/22 test tích hợp trên emulator.
* **Dữ liệu sản phẩm (Production)**: Đã được cập nhật thành công với 1 bài AI thật đăng vào phòng cộng đồng để xác minh luồng ảnh Cloudinary E2E.

---

## 🔄 3. Luồng hoạt động hiện tại (Hiện trạng)

```mermaid
graph TD
    A[Content Studio v1] -->|Export JSON packageSchemaVersion 1.0| B[Montessori Publish Package JSON]
    B -->|Admin Import thủ công| C[App Montessori chính]
    C -->|Ghi dữ liệu vào Firestore| D[(aiContentReviewQueue)]
    D -->|Hiển thị trong danh sách duyệt| E[Admin Review Queue]
    E -->|Verify link ảnh & nhấn Duyệt/Publish| F[Duyệt & Xuất bản]
    F -->|Ghi dữ liệu chatRooms/{roomId}/messages| G[(chatRooms)]
    G -->|Hiển thị kèm badge AI & ảnh 16:9| H[Cộng đồng]
```

### Chi tiết các bước:
1. **Import Package JSON**: Admin thực hiện tải tệp JSON xuất từ Content Studio lên giao diện import của App chính.
2. **Review Queue (`aiContentReviewQueue`)**: Dữ liệu import được lưu tạm thời dưới trạng thái `pending_review`.
3. **Duyệt và Sửa Ảnh**: Admin có thể xem trước nội dung, sửa đổi thông tin hoặc đường dẫn ảnh Cloudinary (`imageUrl`), đảm bảo link ảnh bắt đầu bằng `https://`.
4. **Publish**: Khi admin bấm duyệt xuất bản:
   * Bản ghi trong queue chuyển sang trạng thái `approved_for_publish` và `publishStatus: "published"`.
   * Bài viết mới được ghi vào phòng trò chuyện cộng đồng tương ứng tại `chatRooms/{roomId}/messages/{messageId}`.
   * `imageUrl` trong queue được ghi nhận thành mảng ảnh chứa 1 phần tử `images: [imageUrl]` trong văn bản tin nhắn.
   * Bài viết hiển thị trong tab Cộng đồng với badge *"AI đã duyệt"* và ảnh tỉ lệ 16:9.

---

## 🚫 4. Các điều kiện KHÔNG được phá vỡ trong Phase 3
Trong quá trình phát triển tự động hóa Import ở Phase 3, các ràng buộc kỹ thuật sau đây phải được bảo toàn tuyệt đối:
1. **Firestore Security Rules**:
   * Chỉ cho phép admin ghi và cập nhật `aiContentReviewQueue`.
   * Bắt buộc `imageUrl` nếu cập nhật phải tuân thủ định dạng HTTPS an toàn và không chứa các scheme nguy hiểm (`javascript:`, `http://`, `data:`, `blob:`, `file:`).
   * Bắt buộc giữ nguyên kiểm soát role admin trên client và server (`role: "admin"`).
2. **Tương thích ngược Schema**:
   * Không thay đổi cấu trúc `packageSchemaVersion: "1.0"`.
   * Giữ nguyên cấu trúc lưu ảnh dạng mảng `images: string[]` (tối đa 1 phần tử) trong tin nhắn cộng đồng.
3. **Tách biệt hạ tầng**:
   * Không dùng Firebase Storage hoặc Functions cho luồng ảnh của AI.
   * Không làm thay đổi cơ chế hiển thị tin nhắn cộng đồng của người dùng thường.

---

## 🔄 5. Kế hoạch khôi phục (Rollback Notes)
Nếu Phase 3 phát sinh lỗi logic nghiêm trọng làm treo ứng dụng chính hoặc lỗi bảo mật rules:
1. **Khôi phục Code & Rules**:
   * Reset local code về tag an toàn: `safety-app-before-cms-import-automation-v1`.
   * Deploy lại hosting nếu cần thiết.
2. **Firestore Rules Rollback**:
   * Nội dung rules nằm tại `firestore.rules` có thể phục hồi trực tiếp về mốc của commit `4c7ab86`.
