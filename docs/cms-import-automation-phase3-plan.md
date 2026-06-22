# Kế hoạch triển khai Phase 3 — CMS Import Automation

Tài liệu này đề xuất phương án và kế hoạch chi tiết cho Phase 3 (CMS Import Automation) tại App Montessori chính, nhằm tối ưu hóa quy trình nhập gói bài viết AI từ Content Studio vào hệ thống.

---

## 🎯 1. Mục tiêu
* **Nâng cao hiệu suất vận hành**: Giảm bớt các thao tác thủ công của Admin khi xử lý nhập gói dữ liệu bài viết (JSON) từ Content Studio.
* **Tăng cường kiểm soát và an toàn**: Tăng khả năng phát hiện lỗi định dạng, bài viết trùng lặp hoặc sai thông tin phòng đăng trước khi ghi dữ liệu vào Firestore.
* **Bảo toàn nguyên tắc cốt lõi**:
  * **Không tự động đăng**: Mọi bài viết bắt buộc phải đi qua hàng chờ duyệt (`aiContentReviewQueue`) và cần hành động duyệt chủ động từ Admin mới được xuất bản.
  * **Kiểm soát quyền**: Chỉ Admin (`users/{uid}.role === 'admin'`) mới có quyền thực hiện import.

---

## 📊 2. Hiện trạng hệ thống
* **Quy trình hiện tại**:
  1. Content Studio xuất file `Montessori Publish Package JSON`.
  2. Admin truy cập trang `AdminImportScreen.jsx` trên App chính, nhấn chọn file hoặc kéo thả file JSON.
  3. App kiểm tra định dạng gói qua `validateImportPackage.js`.
  4. Nếu hợp lệ, Admin nhấn nút "Xác nhận Import" -> Ghi trực tiếp các item vào `aiContentReviewQueue` dưới dạng tài liệu riêng lẻ.
  5. Phát hiện trùng lặp dựa trên ID tài liệu tạo tự động qua hàm băm `generateImportId(sourceDraftId, exportedAt)`.
* **Điểm hạn chế hiện tại**:
  * Giao diện import thủ công rất đơn sơ, không hiển thị chi tiết các lỗi cụ thể trong file JSON (chỉ báo lỗi chung).
  * Không thể so sánh trực quan các bài đăng bị trùng lặp ngay trên giao diện trước khi import.
  * Không lưu trữ lịch sử các lô hàng đã import (Import History).

---

## 🔄 3. Các phương án đề xuất cho Phase 3

### **Phương án A: Nâng cấp Admin Import UX (Khuyên dùng)**
* **Mô tả**: Giữ nguyên cơ chế đọc và ghi file JSON trực tiếp từ client như hiện tại nhưng nâng cấp toàn diện giao diện Import. Admin sẽ kéo thả file và xem được một bảng báo cáo tiền kiểm tra (Pre-import Preview/Report) chi tiết: liệt kê các bài hợp lệ, bài bị trùng lặp, bài bị lỗi cấu trúc (thiếu tiêu đề, sai nhóm, ảnh không bắt đầu bằng HTTPS). Lưu lịch sử import trực tiếp tại LocalStorage của Admin hoặc collection lịch sử nhẹ.
* **Độ phức tạp**: Thấp.
* **Độ an toàn**: Rất cao (Không làm thay đổi Backend, giữ nguyên logic rules Firestore hiện có).

### **Phương án B: Firestore Import Queue (Hàng chờ lô)**
* **Mô tả**: Tạo thêm một collection `aiContentImportBatches` trong Firestore. Khi Admin kéo thả file, toàn bộ gói JSON được tải lên và lưu thành một lô (batch document). Một trigger hoặc giao diện hiển thị sẽ phân tích lô này và đẩy các bài viết hợp lệ vào `aiContentReviewQueue`.
* **Độ phức tạp**: Trung bình.
* **Độ an toàn**: Cao, nhưng yêu cầu cấu hình thêm rules Firestore cho collection mới và quản lý vòng đời của lô import.

### **Phương án C: Cloud Functions Import API**
* **Mô tả**: Phát triển một HTTPS Callable Cloud Function (ví dụ: `importContentPackage`). Admin gửi payload JSON của gói qua API, Cloud Function thực hiện phân tích cú pháp, kiểm tra trùng lặp và ghi vào Firestore trên server.
* **Độ phức tạp**: Cao (Yêu cầu viết mã nguồn Node.js, cấu hình Functions và test môi trường Cloud).
* **Độ an toàn**: Cao (Kiểm tra dữ liệu hoàn toàn trên server), nhưng làm tăng chi phí hạ tầng (Yêu cầu tài khoản trả phí Firebase Blaze Plan để chạy Node.js runtime).

### **Phương án D: Đẩy trực tiếp từ Content Studio (Direct Push)**
* **Mô tả**: Content Studio được tích hợp Firebase SDK của App chính. Từ Content Studio, Admin có thể đăng nhập bằng tài khoản admin và nhấn nút "Đẩy trực tiếp lên App chính" mà không cần xuất file JSON.
* **Độ phức tạp**: Rất cao.
* **Độ an toàn**: Thấp (Rủi ro rò rỉ cấu hình Firebase, lộ Token hoặc khóa API trong một công cụ chạy local ngoại tuyến; khó tích hợp App Check nếu App chính bật bảo vệ).

---

## 📋 4. Bảng so sánh chi tiết các phương án

| Tiêu chí | Phương án A (UX Upgrade) | Phương án B (Firestore Queue) | Phương án C (Cloud Functions) | Phương án D (Direct Push) |
|---|---|---|---|---|
| **Độ an toàn** | 🟢 Rất cao | 🟡 Cao | 🟢 Rất cao | 🔴 Thấp |
| **Độ phức tạp** | 🟢 Thấp (chỉ sửa React) | 🟡 Trung bình | 🔴 Cao (Functions) | 🔴 Rất cao |
| **Cloud Functions?** | ❌ Không | ❌ Không |  Có | ❌ Không |
| **Firebase Storage?**| ❌ Không | ❌ Không | ❌ Không | ❌ Không |
| **Yêu cầu Billing (Blaze)?**| ❌ Không | ❌ Không |  Có | ❌ Không |
| **Ảnh hưởng Firestore rules?**| ❌ Không |  Có | ❌ Không | ❌ Không |
| **Ảnh hưởng App Check?**| ❌ Không | ❌ Không |  Có (Cần cấu hình) |  Có (Rất phức tạp) |
| **Nguy cơ phá luồng hiện tại**| 🟢 Cực thấp | 🟡 Trung bình | 🟡 Thấp | 🔴 Cao |
| **Tính phù hợp giai đoạn này**| 🟢 **Phù hợp nhất** | 🟡 Khả thi sau này | ❌ Chưa cần thiết | ❌ Không khuyến nghị |

---

## 🏆 5. Khuyến nghị: Thực hiện **Phase 3A — Admin Import UX Upgrade**

Lựa chọn phương án **Phase 3A** làm bước đi đầu tiên vì:
1. **Rủi ro tối thiểu**: Hoạt động hoàn toàn trên Client-side. Nếu có bất kỳ lỗi nào xảy ra trong giao diện mới, Admin vẫn có thể dễ dàng rollback hoặc dùng nút import cũ mà không ảnh hưởng tới bất kỳ bản ghi nào trong database.
2. **Tiết kiệm chi phí**: Không yêu cầu nâng cấp gói Blaze, không phát sinh chi phí Cloud Functions hay Storage.
3. **Hiệu quả tức thì**: Mang lại giao diện trực quan giúp Admin biết chính xác tệp JSON có hợp lệ không, có bao nhiêu bài bị trùng lặp, bài viết nào thiếu thông tin mà không cần phải kiểm tra chay.

---

## 📐 6. Phạm vi triển khai của Phase 3A

### A. Giao diện xem trước trước khi nhập (Pre-import Preview)
* Hỗ trợ vùng kéo thả (Drag and Drop) mượt mà với hiệu ứng CSS bắt mắt.
* Hiển thị bảng tóm tắt thông tin gói ngay sau khi phân tích tệp:
  * Phiên bản Schema (phải là `1.0`).
  * Nguồn tạo gói (`montessori-ai-content-studio`).
  * Tổng số bài viết trong gói (`itemCount`).
  * Thời gian xuất gói.
* Hiển thị danh sách các bài viết bên trong kèm trạng thái phân loại:
  * **Hợp lệ (Ready)**: Sẵn sàng nhập.
  * **Trùng lặp (Duplicate)**: Bài viết đã tồn tại trên Firestore (kiểm tra trước bằng cách truy vấn nhanh ID dựa trên hàm `generateImportId`).
  * **Lỗi (Invalid)**: Bị sai định dạng dữ liệu (ví dụ: Thiếu tiêu đề, ảnh không có HTTPS).

### B. Báo cáo xác thực (Validation Report)
* Cung cấp các thông điệp cảnh báo rõ ràng bằng Tiếng Việt:
  * *Lỗi nghiêm trọng (Chặn import)*: Gói sai phiên bản, tệp không phải JSON, cấu trúc tệp bị hỏng.
  * *Lỗi dòng dữ liệu (Chặn từng dòng)*: Bài viết thiếu tiêu đề, tóm tắt hoặc nội dung chính; link ảnh không bắt đầu bằng `https://`.
  * *Cảnh báo (Không chặn)*: Room đăng khác với đề xuất của AI.

### C. Báo cáo kết quả Import (Result Summary)
Sau khi nhấn xác nhận nhập, giao diện hiển thị bảng thống kê:
* Số lượng bài đã nhập thành công vào `aiContentReviewQueue`.
* Số lượng bài bị bỏ qua do trùng lặp.
* Số lượng bài bị lỗi không thể lưu.
* Cung cấp nút chuyển nhanh sang màn hình **Hàng chờ duyệt (Review Queue)** để Admin xử lý tiếp.

### D. Lịch sử nhập gói (Import History)
* Lưu trữ thông tin các đợt import gần nhất trực tiếp vào `LocalStorage` của trình duyệt admin hoặc trong một collection Firestore nhỏ `aiContentImportLogs` (nếu cần quản lý tập trung giữa các admin).
* Các thông tin lưu gồm: `batchId`, `importedAt`, `adminEmail`, `itemCount`, `successCount`, `skippedCount`.

---

## 🚫 7. Những gì KHÔNG được làm trong Phase 3A
* Không thay đổi cấu trúc dữ liệu xuất ra của `MontessoriPublishPackage` từ Content Studio.
* Không tự động chuyển đổi bài đăng sang trạng thái `approved` hoặc tự động xuất bản ra Cộng đồng mà không có sự kiểm duyệt của Admin.
* Không viết thêm Cloud Functions hoặc trigger Firestore.

---

## 🛡️ 8. Kế hoạch kiểm thử (Test Plan)
Chúng ta sẽ chuẩn bị các bộ dữ liệu thử nghiệm (Mock JSON Packages) để kiểm tra các kịch bản sau:

1. **Package hoàn hảo (Happy Path)**: Gói chứa 2-3 bài viết hợp lệ, đầy đủ thông tin, có cả bài kèm ảnh Cloudinary HTTPS và bài không kèm ảnh -> Giao diện hiện trạng thái hợp lệ 100%.
2. **Package sai header**: Sửa `packageSchemaVersion` thành `2.0` hoặc `source` thành tên lạ -> Giao diện báo lỗi chặn import lập tức.
3. **Package chứa bài trùng lặp**: Import một gói đã từng import trước đó -> Giao diện nhận diện đúng và hiển thị nhãn "Trùng lặp (Bỏ qua)".
4. **Package chứa lỗi dữ liệu dòng**: Một bài viết trong gói bị xóa trường `title` hoặc có `imageUrl` bắt đầu bằng `http://` -> Bài viết đó bị đánh dấu lỗi và nút Import chỉ cho phép nhập các bài viết hợp lệ còn lại.
5. **Kiểm tra quyền hạn**: Đăng nhập bằng tài khoản không có quyền Admin -> Màn hình Import phải bị khóa bởi Guard kiểm tra quyền.

---

## 🔄 9. Kế hoạch khôi phục (Rollback Plan)
* **Tag khôi phục**: `safety-app-before-cms-import-automation-v1` (HEAD target: `53dbbfad8a0e3ccb76e605748ca78f9d8d045930`).
* **Các bước rollback**:
  1. Nếu xảy ra lỗi nghiêm trọng sau khi sửa React code, chạy lệnh reset Git để quay về mốc tag:
     ```bash
     git reset --hard safety-app-before-cms-import-automation-v1
     ```
  2. Không cần rollback Firestore Rules hay Functions vì Phase 3A hoàn toàn không can thiệp vào các thành phần này.

---

## ❓ 10. Các câu hỏi cần Admin xác nhận trước khi thực hiện Phase 3A
Vui lòng xem xét và phản hồi các câu hỏi sau để chúng tôi tiến hành code ở bước tiếp theo:
1. Bạn có muốn lưu **Lịch sử nhập gói (Import History)** tập trung vào Firestore (cần tạo collection mới, ví dụ `aiContentImportLogs`) hay chỉ cần lưu cục bộ ở `LocalStorage` của Admin để đơn giản và an toàn nhất?
2. Trong bảng xem trước (Pre-import Preview), khi phát hiện bài trùng lặp, bạn có muốn cung cấp tùy chọn **"Ghi đè bài cũ"** không, hay chỉ cần bỏ qua (Skip) như luồng hiện tại để đảm bảo an toàn tuyệt đối?
3. Giao diện kéo thả file có cần hỗ trợ hiển thị danh sách chi tiết các bài viết dạng thu gọn (Accordion) để xem trước toàn bộ nội dung body không, hay chỉ cần hiện thông tin rút gọn (Tiêu đề, loại bài, danh mục, trạng thái ảnh)?
