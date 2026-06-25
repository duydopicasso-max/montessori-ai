# Documentation: Montessori Library inside Community Tab (Phase 6A)

Tài liệu này mô tả chi tiết thiết kế kỹ thuật và các thay đổi đã triển khai trong **Phase 6A — Montessori Library inside Community Tab** của ứng dụng Montessori.

---

## 1. Data Model Đề Xuất

Chúng ta sử dụng một collection riêng biệt, độc lập có tên là `montessoriLibraryArticles` để lưu trữ các bài viết trong Thư viện đã xuất bản và duyệt bởi Admin.

### Cấu trúc Document tại `montessoriLibraryArticles/{articleId}`:
- **`articleId`**: String deterministic chống trùng lặp theo định dạng `lib_{queueItemId}`.
- **`title`**: String (tối đa 220 ký tự) - Tiêu đề bài viết.
- **`summary`**: String (tối đa 600 ký tự) - Tóm tắt nội dung bài viết.
- **`body`**: String (tối đa 10000 ký tự) - Nội dung chính.
- **`keyPoints`**: Array of String (tối đa 10 phần tử, mỗi phần tử tối đa 600 ký tự) - Điểm mấu chốt.
- **`todayAction`**: String (tối đa 1000 ký tự) - Hành động thực hành gợi ý hôm nay.
- **`tags`**: Array of String (tối đa 12 phần tử, mỗi phần tử tối đa 120 ký tự) - Các tags hashtag liên quan.
- **`imageUrl`**: String (tối đa 1000 ký tự) - Link ảnh HTTPS (hoặc rỗng).
- **`category`**: String (tối đa 80 ký tự) - Danh mục kiến thức.
- **`targetAudience`**: String (tối đa 120 ký tự) - Đối tượng độc giả.
- **`contentType`**: String (tối đa 80 ký tự) - Loại nội dung bài viết.
- **`librarySection`**: String (`pregnancy` | `postpartum`) - Chuyên mục Thư viện: Mẹ bầu hoặc Mẹ sau sinh.
- **`sourceQueueId`**: String - ID của tài liệu gốc trong hàng chờ duyệt `aiContentReviewQueue`.
- **`authorType`**: String (`ai_assistant`) - Định danh tác giả do AI tạo.
- **`transparencyLabel`**: String (tối đa 300 ký tự) - Nhãn minh bạch AI.
- **`publishedAt`**: Timestamp - Thời gian xuất bản bài viết (serverTimestamp).
- **`publishedByUid`**: String - UID của admin đã thực hiện xuất bản.
- **`status`**: String (`published`) - Trạng thái bài viết, mặc định luôn là `published`.

---

## 2. Rules Bảo Mật Firestore (`firestore.rules`)

Các quy tắc phân quyền được cập nhật tại `firestore.rules` đảm bảo:
- **Người dùng thường** chỉ được đọc các bài viết đã xuất bản (`status == 'published'`) và phải đăng nhập. Họ không thể thực hiện các thao tác ghi (create/update/delete).
- **Admin** có toàn quyền ghi, sửa và xoá các tài liệu thư viện. Quy tắc create của Admin thực hiện kiểm soát kiểu dữ liệu và giới hạn độ dài cực kỳ nghiêm ngặt nhằm tránh lỗi crash hiển thị giao diện bên client.

---

## 3. Luồng Quản Trị (Admin Flow)

1. **Quét và đề xuất chuyên mục**: 
   Khi xem chi tiết một bài viết chưa xuất bản không thuộc loại "Bài đăng hội nhóm", Admin Review Queue sẽ tự động phân tích đối tượng độc giả (`targetAudience`):
   - Chứa từ khoá *"Mẹ bầu"*, *"Bầu"*, *"Pregnancy"* -> Mặc định chọn chuyên mục **Mẹ bầu** (`pregnancy`).
   - Chứa từ khoá *"bé"*, *"sau sinh"*, *"mẹ có bé"*, *"1-2 tuổi"*, *"6-12 tháng"*, *"postpartum"* -> Mặc định chọn chuyên mục **Mẹ sau sinh** (`postpartum`).
   - Ngược lại -> Yêu cầu Admin chọn thủ công.
2. **Xuất bản thủ công**: Admin nhấn nút **"Xuất bản vào Thư viện"**. Hệ thống hiển thị hộp thoại xác nhận chuyên mục xuất bản. Sau khi xác nhận, một Transaction nguyên tử sẽ:
   - Ghi dữ liệu public-safe sang `montessoriLibraryArticles/lib_{itemId}`.
   - Cập nhật trạng thái hàng chờ duyệt `aiContentReviewQueue/{itemId}` với `publishStatus = "published"`, `publishedDestination = "montessori_library"`, `publishedLibraryArticleId = "lib_{itemId}"`, `librarySection = "pregnancy" | "postpartum"`, và `publishedPostId = "montessoriLibraryArticles/lib_{itemId}"`.

---

## 4. Luồng Người Dùng (User Flow)

1. **Truy cập**: Người dùng nhấn vào tab phân đoạn thứ 3 **"Thư viện Montessori"** trong màn hình Cộng đồng.
2. **Lọc chuyên mục**: Người dùng chuyển đổi giữa hai chuyên mục phụ: **🤰 Mẹ bầu** và **👶 Mẹ sau sinh**.
3. **Hiển thị danh sách**: Giao diện hiển thị danh sách các card bài viết dạng lưới/dòng trực quan kèm nhãn *"Nội dung được Admin duyệt"*.
4. **Đọc chi tiết**: Khi nhấn vào card bài viết, Bottom Sheet `KnowledgeArticleSheet` sẽ trượt lên mượt mà hiển thị nội dung chi tiết.

---

## 5. Ràng Buộc Triển Khai ( MVP Safety Constraints)

- **Không sửa Content Studio**: Mọi cấu trúc và luồng dữ liệu của `montessori-ai-content-studio` giữ nguyên hoàn toàn.
- **Không tự động xuất bản (No Auto Publish)**: Admin bắt buộc phải thực hiện phê duyệt và xuất bản thủ công.
- **Không tự động import (No Auto Import)**: Việc import package JSON vẫn do admin click thủ công từ file.
- **Không nút chia sẻ (No Share Button)**: Giao diện Thư viện chỉ hỗ trợ đọc tại chỗ, tính năng chia sẻ ra mạng xã hội được hoãn lại ở phase sau.
- **Không làm hỏng luồng publish Cộng đồng hiện tại**: Các bài đăng dạng tin nhắn nhóm vẫn sử dụng luồng `publishApprovedAiContent` vào chatRooms bình thường.

---

## 6. Hạn Chế Đã Biết (Known Limitations)

- Giao diện danh sách bài viết sử dụng truy vấn đơn giản kết hợp sort ở phía client để tránh yêu cầu tạo composite index phức tạp trên Firestore cho Phase 6A, đảm bảo hệ thống không bị lỗi crash index khi chạy thử nghiệm.
- Việc dọn dẹp các bài viết cũ/thu hồi bài viết hiện tại chỉ được thực hiện trực tiếp từ Firestore Console của Admin.

---

## 7. Kế Hoạch Rollback

- Revert mã nguồn frontend về commit trước đó (`470bb492d4e756c406ed753aecdf49666bcbcf9c`).
- Do các bài viết Thư viện được lưu tại collection độc lập `montessoriLibraryArticles`, việc rollback code frontend sẽ ngắt ngay các tương tác liên quan đến thư viện mà không gây ảnh hưởng hay làm hỏng dữ liệu của các phòng chat nhóm hay hàng chờ duyệt hiện tại.
