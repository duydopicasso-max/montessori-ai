# Implementation Plan: Phase 5A — Community Post Knowledge Detail Link

Tài liệu này đề xuất thiết kế và kế hoạch triển khai cho **Phase 5A — Community Post Knowledge Detail Link** của App Montessori. Mục tiêu là cho phép người dùng đọc thêm bài viết chi tiết từ Trợ lý AI bằng cách nhấn nút dưới bài đăng tóm tắt trong Cộng đồng.

---

## 1. Mục tiêu
- **Trải nghiệm Cộng đồng**: Giữ bài đăng ở phòng Cộng đồng ngắn gọn, thân mật. Hiển thị nút "Đọc thêm kiến thức Montessori" dưới các bài viết AI có nội dung chi tiết.
- **Trải nghiệm đọc chi tiết**: Khi người dùng nhấn nút, hiển thị toàn bộ nội dung của "bài viết chính" (tiêu đề, tóm tắt, nội dung chính, điểm mấu chốt, hành động hôm nay, tags, hình ảnh) dưới dạng Bottom Sheet hoặc Detail View trong app, kèm nhãn ghi nhận nguồn gốc thông tin rõ ràng.
- **Tính an toàn**: Bảo vệ dữ liệu admin-only, không làm lộ quy trình hay dữ liệu nháp của admin, không cho phép client sửa đổi nội dung.

---

## 2. Hiện trạng
- **Drafts từ Content Studio**: Chứa các field chính như `title`, `summary`, `body`, `keyPoints`, `todayAction`, `tags`, `imagePrompt`, `imageStyle`, `imageUrl`, `communityPostSuggestion`.
- **Publish Flow hiện tại**: Khi admin duyệt và xuất bản (`publishApprovedAiContent`), app tạo một chat message trong `chatRooms/{roomId}/messages/{msgId}` bằng cách kết hợp thông tin từ `communityPostSuggestion` (bài đăng cộng đồng) thành field `text` và `title`.
- **Firestore Security Rules**: Rules hiện tại đang kiểm soát rất chặt chẽ việc tạo tin nhắn AI đăng vào Cộng đồng (`chatRooms/{roomId}/messages/{msgId}`), chỉ cho phép admin ghi và định nghĩa các field chính xác. Rules hiện tại chưa cho phép field mới nào khác ngoài whitelist.

---

## 3. Luồng người dùng (User Flow)
1. Người dùng vào phòng Cộng đồng.
2. Dưới bài đăng của "Trợ lý Montessori" (nếu có nội dung bài viết gốc đi kèm), xuất hiện nút hành động:
   `[📖 Đọc thêm kiến thức Montessori]`
3. Người dùng click vào nút -> Một Bottom Sheet (hoặc Modal màn hình chi tiết) trượt lên mượt mà.
4. Màn hình chi tiết hiển thị đầy đủ thông tin định dạng rõ ràng:
   - **Header**: Tiêu đề bài viết chính, nhãn "Kiến thức Montessori" và nút Đóng (✕).
   - **Ảnh minh họa**: Hiển thị ảnh nổi bật (nếu có).
   - **Tóm tắt (Summary)**: Khối văn bản in nghiêng hoặc nền nhạt để tóm tắt nhanh.
   - **Nội dung chính (Body)**: Hiển thị đầy đủ bài viết gốc với định dạng dòng rõ ràng.
   - **Điểm mấu chốt (Key Points)**: Hiển thị dưới dạng list gạch đầu dòng trực quan.
   - **Hành động hôm nay (Today Action)**: Nền nổi bật (card nhỏ) để khuyến khích hành động thực tế.
   - **Tags**: Danh sách các tag liên quan.
   - **Disclaimer**: *"Nội dung gợi ý từ Trợ lý Montessori, đã được admin duyệt"* ở phần chân trang.
5. Người dùng click "Đóng" hoặc vuốt xuống để quay lại phòng Cộng đồng.

---

## 4. Luồng admin publish (Admin Publish Flow)
1. Admin chọn bài viết từ hàng chờ duyệt (`AdminReviewQueueScreen`), chỉnh sửa nội dung/ảnh nếu cần và nhấn "Duyệt" -> "Xuất bản".
2. Hệ thống gọi hàm `publishApprovedAiContent` trong một Firestore Transaction.
3. Transaction sẽ tạo tin nhắn mới trong phòng chat, đồng thời nhúng bản copy của toàn bộ thông tin chi tiết vào field `knowledgeArticle` của document tin nhắn đó.
4. Trạng thái của hàng chờ được cập nhật thành `published`.

---

## 5. Các phương án kỹ thuật

Chúng ta so sánh 3 phương án để lưu trữ và hiển thị nội dung chi tiết:

### Phương án A: Embed `knowledgeArticle` vào `chatRooms/{roomId}/messages/{messageId}`
Khi xuất bản, copy toàn bộ nội dung chi tiết của bài viết gốc vào một sub-map `knowledgeArticle` trực tiếp trong tài liệu tin nhắn phòng chat.

### Phương án B: Tạo collection public `knowledgeArticles` và link `articleId`
Khi xuất bản, tạo một document mới trong collection `knowledgeArticles` (public-read, admin-write). Đồng thời, lưu `knowledgeArticleId` trong tin nhắn phòng chat. Client sẽ truy vấn tài liệu này khi người dùng click xem chi tiết.

### Phương án C: Khi bấm nút thì đọc từ `aiContentReviewQueue/sourceQueueId`
Khi người dùng click nút đọc thêm, client sẽ gọi trực tiếp truy vấn đọc tài liệu gốc trong hàng chờ duyệt bằng `sourceQueueId`.

---

## 6. Bảng so sánh các phương án

| Tiêu chí | Phương án A (Embed Map) | Phương án B (Tách Collection) | Phương án C (Đọc trực tiếp Queue) |
| :--- | :--- | :--- | :--- |
| **Bảo mật** | **Rất cao**: Dữ liệu nằm trong tin nhắn đã được phân quyền công khai. Không lộ collection admin. | **Cao**: Cần mở thêm một collection public-read mới. | **Rất kém**: Vi phạm nguyên tắc bảo mật. Client không được phép đọc collection admin-only `aiContentReviewQueue`. |
| **Độ phức tạp code** | **Thấp**: Chỉ cần bổ sung field map vào transaction hiện có. Không cần tạo truy vấn con khi bấm nút. | **Trung bình**: Cần thực hiện 2 lần ghi đồng thời (2 document) và 1 lần đọc phụ bên client khi xem chi tiết. | **Trung bình**: Cần viết hàm bypass rules hoặc client tự query tài liệu admin. |
| **Firestore Rules** | Cần cập nhật rules tin nhắn để chấp nhận field `knowledgeArticle` (kiểu map). | Cần viết thêm rules mới cho collection `knowledgeArticles`. | Cực kỳ phức tạp và rủi ro nếu cố mở quyền đọc lẻ trên collection admin. |
| **Migration & Rollback**| **Rất dễ**: Chỉ cần cập nhật code client & rules, rollback bằng cách revert code. | **Trung bình**: Cần dọn dẹp các tài liệu mồ côi nếu rollback. | **Khó**: Liên quan đến bảo mật và rules nhạy cảm. |
| **Backward compatibility**| **Hoàn hảo**: Các tin nhắn cũ không có field `knowledgeArticle` sẽ đơn giản không hiển thị nút "Đọc thêm". | **Hoàn hảo**: Các tin nhắn cũ không có link ID sẽ không hiện nút. | **Hoàn hảo**. |
| **Chi phí / Số lượt đọc** | **0 phí phát sinh**: Khi lấy tin nhắn chat đã lấy kèm dữ liệu bài viết chi tiết, không tốn thêm lượt đọc Firestore nào khi mở chi tiết. | **Tốn thêm lượt đọc**: Mỗi lần người dùng click "Đọc thêm" sẽ tốn thêm 1 lượt đọc Firestore. | **Tốn thêm lượt đọc**. |

---

## 7. Phương án khuyến nghị
**Lựa chọn: Phương án A (Embed Map vào tin nhắn)**.
- **Lý do**: Đảm bảo an toàn bảo mật tuyệt đối, độ phức tạp lập trình cực thấp, hiệu năng tối ưu (không phát sinh thêm lượt đọc Firestore khi người dùng bấm mở xem chi tiết) và tương thích ngược hoàn toàn với dữ liệu cũ.

---

## 8. Data model đề xuất (Phương án A)

Khi xuất bản, tài liệu tin nhắn tại `chatRooms/{roomId}/messages/{messageId}` sẽ được bổ sung field `knowledgeArticle` (kiểu Map) với cấu trúc sau:

```typescript
knowledgeArticle: {
  title: string;              // Tiêu đề bài viết gốc (body title)
  summary: string;            // Tóm tắt bài viết chính
  body: string;               // Nội dung bài viết chính
  keyPoints: string[];        // Danh sách các điểm mấu chốt
  todayAction: string;        // Hành động hôm nay
  tags: string[];             // Mảng các tags liên quan
  imageUrl: string;           // URL hình ảnh được lưu trong queue bài viết gốc
  source: string;             // Nguồn gốc bài viết (mặc định: "montessori-ai-content-studio")
  transparencyLabel: string;  // Nhãn minh bạch AI (ví dụ: "Nội dung do AI tạo")
}
```

---

## 9. Firestore rules cần thay đổi

Vì rules hiện tại của `chatRooms/{roomId}/messages/{msgId}` kiểm tra cấu trúc rất chặt chẽ, chúng ta cần cho phép trường `knowledgeArticle` tùy chọn khi tạo bài viết AI.

**Cập nhật quy tắc `allow create` cho admin AI post:**

```javascript
// Cho phép trường knowledgeArticle (nếu có) phải là một map hợp lệ
&& (!('knowledgeArticle' in request.resource.data)
    || (
      request.resource.data.knowledgeArticle is map
      && request.resource.data.knowledgeArticle.title is string
      && request.resource.data.knowledgeArticle.summary is string
      && request.resource.data.knowledgeArticle.body is string
      && request.resource.data.knowledgeArticle.keyPoints is list
      && request.resource.data.knowledgeArticle.todayAction is string
      && request.resource.data.knowledgeArticle.tags is list
      && request.resource.data.knowledgeArticle.imageUrl is string
      && request.resource.data.knowledgeArticle.source is string
      && request.resource.data.knowledgeArticle.transparencyLabel is string
    ))
```

*Lưu ý: Không tự ý deploy rules trong bước lập kế hoạch này.*

---

## 10. Giao diện đề xuất (UI/UX)

### Nút đọc thêm trong tin nhắn Chat
Trong component hiển thị tin nhắn Cộng đồng (`MessageItem` hoặc tương đương):
- Kiểm tra điều kiện: `message.authorType === 'ai_assistant' && message.knowledgeArticle`.
- Nếu thỏa mãn, hiển thị một nút hành động dạng dẹt ở cuối bong bóng chat (phù hợp với bảng màu forest green hiện tại):
  ```jsx
  <button className="msg-knowledge-btn">
    <span className="icon">📖</span> Đọc thêm kiến thức Montessori
  </button>
  ```

### Bottom Sheet xem chi tiết
Tạo một component bottom sheet custom (`KnowledgeDetailSheet.jsx`):
- Trượt lên từ phía dưới (hoặc fade-in modal trên desktop).
- Phong cách thiết kế: **Sharp Editorial** (Sử dụng bảng màu xanh lá rừng `#1a3a28`, kem ấm `#f6f7f3`, viền mảnh sắc nét `#d8e8de`, không dùng màu tím).
- **Cơ chế đóng**: Người dùng có thể bấm nút "✕" ở góc trên bên phải hoặc click ra vùng overlay bên ngoài để đóng sheet.

---

## 11. Tương thích ngược (Backward compatibility)
- Các bài viết cũ xuất bản trước Phase 5A sẽ không có trường `knowledgeArticle`.
- Giao diện client sẽ kiểm tra và chỉ hiển thị nút "Đọc thêm" khi tồn tại trường này. Các bài cũ vẫn hiển thị bình thường mà không bị ảnh hưởng hay gây crash ứng dụng.

---

## 12. Kế hoạch kiểm thử (Test Plan)

### Kiểm thử tự động (Automated Tests)
1. **Firestore Security Rules**:
   - Thêm ca kiểm thử tích hợp trong `firestore.rules.test.mjs` để xác nhận:
     - Admin có thể tạo tin nhắn kèm theo map `knowledgeArticle` hợp lệ.
     - Admin *không* thể tạo tin nhắn nếu map `knowledgeArticle` chứa sai kiểu dữ liệu (ví dụ: `keyPoints` là string thay vì list).
     - Regular user *không* thể sửa đổi trường `knowledgeArticle` trong tin nhắn.

### Kiểm thử thủ công (Manual Verification)
1. **Quy trình xuất bản**:
   - Import một package hợp lệ vào hàng chờ duyệt.
   - Duyệt và nhấn xuất bản bài viết sang Cộng đồng.
   - Truy cập Firestore Console để kiểm tra document tin nhắn được tạo xem có chứa sub-map `knowledgeArticle` chính xác hay không.
2. **Quy trình đọc chi tiết**:
   - Mở giao diện Cộng đồng dưới tài khoản test người dùng.
   - Kiểm tra xem nút "Đọc thêm kiến thức Montessori" có hiển thị đúng dưới bài đăng AI mới hay không.
   - Đảm bảo các bài đăng AI cũ (hoặc bài đăng của người dùng) không hiển thị nút này.
   - Click nút và kiểm tra xem Bottom Sheet có trượt lên mượt mà, hiển thị đầy đủ, đúng định dạng và đóng lại bình thường hay không.

---

## 13. Rủi ro & Cách khắc phục
- **Kích thước tài liệu tin nhắn vượt quá giới hạn**: Firestore giới hạn 1MB cho mỗi document. Việc nhúng thêm bài viết gốc (~5000 ký tự) sẽ làm tăng kích thước tin nhắn lên khoảng 5-10KB, vẫn nằm sâu trong giới hạn an toàn 1MB.
- **Rò rỉ ảnh hưởng CLS**: Ảnh hiển thị trong Bottom Sheet cần có tỷ lệ khung hình định sẵn hoặc background placeholder để tránh dịch chuyển bố cục khi tải ảnh.

---

## 14. Kế hoạch Rollback
- Nếu phát sinh lỗi nghiêm trọng sau khi code, tiến hành revert code frontend về commit trước đó (`b127519`).
- Không cần sửa đổi cơ sở dữ liệu vì cấu trúc của các tin nhắn cũ và mới độc lập nhau.

---

## 15. Câu hỏi thảo luận và xác nhận

> [!IMPORTANT]
> Vui lòng xác nhận các điểm sau trước khi tiến hành code ở phase tiếp theo:
> 1. Bạn muốn hiển thị màn hình đọc thêm dưới dạng **Bottom Sheet** (trượt lên từ đáy màn hình, phù hợp mobile) hay **Modal chính giữa màn hình** (phù hợp cả desktop)?
> 2. Có cần bổ sung thêm nút "Chia sẻ bài viết kiến thức" hay chỉ cần đọc và đóng lại?
