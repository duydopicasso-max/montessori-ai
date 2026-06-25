# Implementation Plan: Phase 6A — Montessori Library inside Community Tab

Tài liệu này đề xuất thiết kế và kế hoạch triển khai cho **Phase 6A — Montessori Library inside Community Tab** của App Montessori. Mục tiêu là bổ sung thêm một chuyên mục đọc kiến thức "Thư viện Montessori" ngay trong tab Cộng đồng của ứng dụng, cho phép người dùng đọc các bài viết chất lượng cao đã được Admin chọn lọc và duyệt từ hàng chờ.

---

## 1. Mục tiêu
- **Trải nghiệm Thư viện**: Thêm mục thứ ba "Thư viện Montessori" vào tab Cộng đồng bên cạnh "Phòng cộng đồng" và "Hộp thư".
- **Quản lý phân quyền**: Người dùng thông thường chỉ có quyền đọc các bài viết đã xuất bản. Chỉ Admin mới có quyền duyệt, đăng bài, sửa hoặc xoá bài viết trong Thư viện.
- **Tách biệt luồng dữ liệu**: Đảm bảo các bài đăng không phải "Bài đăng hội nhóm" (như bài kiến thức ngắn, hướng dẫn thực hành, card quote, gợi ý hoạt động, bài truyền cảm hứng) có nơi xuất bản phù hợp, an toàn, không lẫn lộn với luồng tin nhắn nhóm hiện tại.
- **Tối ưu chi phí và bảo mật**: Ngăn chặn rò rỉ dữ liệu nháp của Admin (`aiContentReviewQueue`), chỉ hiển thị các bài viết an toàn (public-safe) đã duyệt sang Thư viện Montessori.

---

## 2. Hiện trạng
- **Hàng chờ duyệt (Review Queue)**: Nhận bài viết từ Content Studio với đa dạng loại nội dung (`contentType`):
  - *Bài đăng hội nhóm* (Đã có luồng xuất bản vào chatRooms).
  - *Bài kiến thức ngắn*, *Bài hướng dẫn thực hành*, *Card quote*, *Gợi ý hoạt động hôm nay*, *Bài truyền cảm hứng* (Hiện tại chưa có nơi xuất bản phù hợp trên App chính).
- **Quy trình xuất bản hiện tại**: Admin bấm xuất bản một bài đăng hội nhóm từ hàng chờ duyệt. Hệ thống gọi hàm `publishApprovedAiContent` chạy một Firestore Transaction để tạo tin nhắn mới tại `chatRooms/{roomId}/messages/{msgId}` và cập nhật trạng thái hàng chờ thành `published`.
- **Cấu trúc tab Cộng đồng (`CommunityScreen.jsx`)**: Đang hiển thị hai segment tab: "Phòng cộng đồng" và "Hộp thư" được điều khiển qua trạng thái `tab` (`rooms` | `inbox`).

---

## 3. Vấn đề Admin đang gặp phải
- Khi Content Studio tạo ra các bài viết thuộc thể loại kiến thức, hướng dẫn thực hành hoặc truyền cảm hứng, App chính vẫn import thành công vào Review Queue với trạng thái `pending_review`.
- Tuy nhiên, khi Admin duyệt các bài này sang trạng thái `approved_for_publish`, họ **không thể xuất bản** chúng vì nút xuất bản hiện tại chỉ hỗ trợ loại bài viết `"Bài đăng hội nhóm"`.
- Nếu cố xuất bản các bài này vào tin nhắn nhóm, cấu trúc nội dung sẽ bị sai lệch và làm loãng các phòng thảo luận của cộng đồng.

---

## 4. Ý tưởng UX: Thêm "Thư viện Montessori" trong tab Cộng đồng
Bổ sung một nút tab thứ 3 vào thanh phân đoạn của màn hình Cộng đồng:
1. **Phòng cộng đồng** (Thảo luận nhóm công khai).
2. **Hộp thư** (Danh sách chat 1-on-1 private).
3. **Thư viện Montessori** (Mới — Đọc kiến thức chọn lọc).

Giao diện Thư viện sẽ có:
- Segment con để lọc nhanh nội dung: **Mẹ bầu** và **Mẹ sau sinh**.
- Danh sách các bài viết hiển thị dưới dạng Card có hình ảnh, tiêu đề, tóm tắt, tag và nhãn bảo chứng *"Nội dung được Admin duyệt"*.
- Khi người dùng nhấn vào Card sẽ mở Bottom Sheet chi tiết (tái sử dụng component `KnowledgeArticleSheet` chất lượng cao đã có).

---

## 5. Phân quyền: Admin đăng, User đọc
Quy tắc bảo mật Firestore Rules sẽ thực thi phân quyền nghiêm ngặt:
- **Người dùng thông thường** (`isSignedIn()`):
  - Chỉ được đọc (`read`) các tài liệu trong collection Thư viện có trạng thái `status == 'published'`.
  - Không được phép tạo mới (`create`), sửa đổi (`update`), hay xoá (`delete`) bài viết.
  - Tuyệt đối không được phép đọc collection hàng chờ duyệt `aiContentReviewQueue`.
- **Admin** (`isAdmin()`):
  - Được phép xuất bản bài viết từ hàng chờ duyệt sang Thư viện thông qua Client SDK (được xác thực qua rules `isAdmin()`).
  - Được phép cập nhật (`update`) hoặc xoá (`delete`) bài viết trong Thư viện khi cần chỉnh sửa/thu hồi.

---

## 6. Mapping contentType → destination

| contentType từ Content Studio | Nơi xuất bản (Destination Collection) | Cơ chế hiển thị |
| :--- | :--- | :--- |
| **Bài đăng hội nhóm** | `chatRooms/{roomId}/messages/{msgId}` | Hiển thị dạng tin nhắn của Trợ lý Montessori trong các phòng chat công khai. |
| **Bài kiến thức ngắn** | `montessoriLibraryArticles/{articleId}` | Hiển thị trong danh sách Thư viện Montessori. |
| **Bài hướng dẫn thực hành**| `montessoriLibraryArticles/{articleId}` | Hiển thị trong danh sách Thư viện Montessori. |
| **Card quote** | `montessoriLibraryArticles/{articleId}` | Hiển thị trong danh sách Thư viện Montessori. |
| **Gợi ý hoạt động hôm nay** | `montessoriLibraryArticles/{articleId}` | Hiển thị trong danh sách Thư viện Montessori. |
| **Bài truyền cảm hứng** | `montessoriLibraryArticles/{articleId}` | Hiển thị trong danh sách Thư viện Montessori. |

---

## 7. Cấu trúc 2 mục: Mẹ bầu / Mẹ sau sinh
Bài viết trong Thư viện được phân loại vào 2 nhóm chính dựa trên giá trị trường `librarySection`:
- `pregnancy`: Mẹ bầu.
- `postpartum`: Mẹ sau sinh.

### Cơ chế gợi ý mặc định cho Admin:
Khi Admin mở xem chi tiết một bài viết chưa xuất bản thuộc thể loại Thư viện, hệ thống sẽ tự động quét trường đối tượng mục tiêu (`targetAudience`) để gợi ý chuyên mục mặc định:
- Nếu `targetAudience` chứa các từ khóa như *"Mẹ bầu"*, *"Mang thai"*, *"Bầu"*, *"Pregnancy"* -> Gợi ý chọn mặc định **Mẹ bầu** (`pregnancy`).
- Nếu `targetAudience` chứa các từ khóa như *"Mẹ sau sinh"*, *"Trẻ sơ sinh"*, *"Bé"*, *"Postpartum"*, *"Sau sinh"* -> Gợi ý chọn mặc định **Mẹ sau sinh** (`postpartum`).
- Các trường hợp khác: Để trống hoặc mặc định chọn `pregnancy`, Admin có toàn quyền thay đổi lựa chọn trước khi bấm nút Xuất bản.

---

## 8. So sánh các phương án kỹ thuật

Chúng ta so sánh 3 phương án thiết kế Firestore để lưu trữ dữ liệu bài viết Thư viện:

### Phương án A: Tạo collection riêng `montessoriLibraryArticles` (Khuyến nghị)
Mỗi bài viết Thư viện là một document độc lập trong một collection mới có tên `montessoriLibraryArticles`.

### Phương án B: Tạo collection dùng chung `publicContent` cho mọi nội dung
Gộp chung cả tin nhắn phòng chat, bài viết thư viện, bình luận... vào một collection duy nhất và phân biệt bằng trường `type`.

### Phương án C: Nhúng danh sách bài viết vào một document config/list lớn
Tất cả các bài viết Thư viện sẽ được nhúng làm phần tử của một mảng nằm trong một document config duy nhất (ví dụ: `systemConfig/montessoriLibrary`).

---

### Bảng so sánh chi tiết:

| Tiêu chí | Phương án A (Collection riêng - Chọn) | Phương án B (Gộp Collection) | Phương án C (Nhúng 1 Doc config) |
| :--- | :--- | :--- | :--- |
| **Bảo mật** | **Rất cao**: Viết rules độc lập cho collection, không ảnh hưởng hay bị nhầm lẫn với các collection khác. | **Trung bình**: Dễ xảy ra sai sót khi viết rules do một collection chứa nhiều loại dữ liệu có quyền hạn khác nhau. | **Thấp**: Không thể phân quyền chi tiết cho từng bài viết. Người dùng phải tải toàn bộ danh sách để đọc một bài. |
| **Firestore Rules** | **Đơn giản**: Chỉ cần kiểm tra quyền Admin để ghi, quyền User để đọc các bài có trạng thái `published`. | **Phức tạp**: Cần viết nhiều điều kiện nhánh (`if resource.data.type == '...'`) dễ gây lỗi bảo mật. | **Đơn giản** nhưng thiếu khả năng kiểm soát chi tiết cấu trúc mảng. |
| **Khả năng mở rộng**| **Không giới hạn**: Thêm hàng ngàn bài viết mà không gặp vấn đề về bộ nhớ hay giới hạn kích thước document. | **Tốt** nhưng việc phân chỉ mục (indexing) và truy vấn phức tạp hơn do bị nhiễu bởi các loại dữ liệu khác. | **Cực kém**: Giới hạn kích thước document của Firestore là 1MB, chỉ chứa được tối đa khoảng 50-100 bài viết chi tiết. |
| **Query & Filter** | **Tối ưu**: Hỗ trợ đầy đủ phân trang, lọc theo `librarySection`, sắp xếp theo ngày đăng `publishedAt` nguyên bản. | **Khá**: Cần tạo thêm composite indexes kết hợp trường `type` với các bộ lọc khác. | **Tệ**: Phải tải toàn bộ mảng bài viết về client rồi lọc/sắp xếp bằng JavaScript. Tốn băng thông. |
| **Tương thích ngược**| **Hoàn hảo**: Không tác động đến bất kỳ cấu trúc dữ liệu hiện tại nào trong hệ thống. | **Trung bình**: Có nguy cơ ảnh hưởng nếu vô tình trùng lặp hoặc sửa đổi các logic truy vấn chung. | **Hoàn hảo**. |
| **Kế hoạch Rollback**| **Rất dễ**: Chỉ cần xoá collection mới hoặc dừng truy cập client, không có tác dụng phụ. | **Phức tạp**: Phải lọc và xoá các bản ghi rác thuộc loại Thư viện trong collection dùng chung. | **Dễ** nhưng có nguy cơ mất mát nếu các thao tác ghi đè mảng config bị xung đột. |
| **Độ phức tạp code** | **Thấp**: Sử dụng các pattern truy vấn và ghi document chuẩn của Firestore. | **Trung bình**: Cần quản lý chặt chẽ trường phân loại dữ liệu trên cả Admin và Client. | **Cao**: Phải xử lý transaction cập nhật mảng, tránh ghi đè mất mát dữ liệu khi admin cập nhật đồng thời. |

---

## 9. Phương án khuyến nghị
Lựa chọn **Phương án A: Tạo collection riêng `montessoriLibraryArticles`**.
Đây là phương án an toàn nhất, đảm bảo tính cô lập dữ liệu cao, dễ viết rules bảo mật, hỗ trợ phân trang/truy vấn hiệu năng cao và có đường rollback sạch sẽ nhất.

---

## 10. Data model đề xuất (Phương án A)

Khi bài viết được xuất bản, một tài liệu mới sẽ được tạo tại `montessoriLibraryArticles/{articleId}`.
*Lưu ý: Document ID `{articleId}` sẽ được tạo deterministically từ ID hàng chờ dưới định dạng `lib_{queueItemId}` để chống trùng lặp dữ liệu.*

### Cấu trúc Document:
```typescript
interface LibraryArticle {
  title: string;              // Tiêu đề bài viết (tối đa 220 ký tự)
  summary: string;            // Tóm tắt bài viết (tối đa 500 ký tự)
  body: string;               // Nội dung chi tiết bài viết (tối đa 8000 ký tự)
  keyPoints: string[];        // Điểm mấu chốt (tối đa 8 phần tử, mỗi phần tử tối đa 500 ký tự)
  todayAction: string;        // Hành động hôm nay (tối đa 800 ký tự)
  tags: string[];             // Danh sách từ khóa (tối đa 12 phần tử, mỗi phần tử tối đa 120 ký tự)
  imageUrl: string;           // URL ảnh nổi bật (phải bắt đầu bằng https:// hoặc rỗng, tối đa 1000 ký tự)
  category: string;           // Danh mục kiến thức (ví dụ: "Dinh dưỡng", "Vận động")
  targetAudience: string;     // Đối tượng mục tiêu hướng tới (ví dụ: "Mẹ bầu 3 tháng đầu")
  contentType: string;        // Loại nội dung (ví dụ: "Bài hướng dẫn thực hành")
  librarySection: string;     // Phân mục Thư viện: "pregnancy" (Mẹ bầu) | "postpartum" (Mẹ sau sinh)
  sourceQueueId: string;      // ID tham chiếu đến tài liệu gốc trong hàng chờ duyệt
  authorType: "ai_assistant"; // Mặc định ghi nhận AI tạo
  transparencyLabel: string;  // Nhãn minh bạch AI (ví dụ: "Nội dung gợi ý từ Trợ lý Montessori, đã được admin duyệt.")
  publishedAt: Timestamp;     // Thời gian xuất bản (serverTimestamp)
  publishedByUid: string;     // UID của admin thực hiện xuất bản
  status: "published";        // Trạng thái xuất bản (mặc định: "published")
}
```

---

## 11. Firestore Rules cần thay đổi

Chúng ta sẽ bổ sung quy tắc kiểm soát cho collection `montessoriLibraryArticles` vào file `firestore.rules`:

```javascript
    // ════════════════════════════════════════════════════════
    // MONTESSORI LIBRARY ARTICLES (Phase 6A)
    // ════════════════════════════════════════════════════════
    match /montessoriLibraryArticles/{articleId} {
      // Người dùng đã đăng nhập được phép đọc các bài viết đã xuất bản
      allow read: if isSignedIn() && resource.data.status == 'published';
      
      // Chỉ Admin được phép tạo bài viết mới và phải tuân thủ nghiêm ngặt schema
      allow create: if isAdmin()
                    && request.resource.data.status == 'published'
                    && request.resource.data.librarySection in ['pregnancy', 'postpartum']
                    && request.resource.data.authorType == 'ai_assistant'
                    && request.resource.data.title is string
                    && request.resource.data.title.size() <= 220
                    && request.resource.data.summary is string
                    && request.resource.data.summary.size() <= 500
                    && request.resource.data.body is string
                    && request.resource.data.body.size() <= 8000
                    && request.resource.data.keyPoints is list
                    && request.resource.data.keyPoints.size() <= 8
                    && validateKeyPoints(request.resource.data.keyPoints)
                    && request.resource.data.todayAction is string
                    && request.resource.data.todayAction.size() <= 800
                    && request.resource.data.tags is list
                    && request.resource.data.tags.size() <= 12
                    && validateTags(request.resource.data.tags)
                    && request.resource.data.imageUrl is string
                    && request.resource.data.imageUrl.size() <= 1000
                    && (
                      request.resource.data.imageUrl == ""
                      || request.resource.data.imageUrl.matches('^https://.*')
                    )
                    && request.resource.data.transparencyLabel is string
                    && request.resource.data.transparencyLabel.size() <= 300
                    && request.resource.data.sourceQueueId is string
                    && request.resource.data.publishedByUid == request.auth.uid;

      // Chỉ Admin được phép cập nhật hoặc xoá bài viết
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
```

---

## 12. Review Queue cần thay đổi (`AdminReviewQueueScreen.jsx`)

### Thay đổi giao diện Chi tiết Hàng chờ Duyệt (Modal):
- Đọc trường `contentType` của bài viết hiện tại.
- **Nếu `contentType === 'Bài đăng hội nhóm'`**: Giữ nguyên luồng chọn nhóm chat Rooms hiện tại.
- **Nếu `contentType !== 'Bài đăng hội nhóm'`**:
  - Ẩn phần chọn nhóm chat cũ.
  - Hiển thị khối chọn chuyên mục Thư viện:
    - Nhãn: **Chuyên mục Thư viện**
    - Dropdown/Select chứa 2 option: **Mẹ bầu** (`pregnancy`) và **Mẹ sau sinh** (`postpartum`).
    - Logic xác định giá trị mặc định:
      ```javascript
      const targetStr = (item.targetAudience || '').toLowerCase();
      let defaultSection = 'pregnancy';
      if (targetStr.includes('sau sinh') || targetStr.includes('bé') || targetStr.includes('sơ sinh') || targetStr.includes('postpartum')) {
        defaultSection = 'postpartum';
      }
      ```
    - Lưu chuyên mục được chọn vào state `selectedLibrarySection`.

### Thay đổi logic Nút hành động ở chân Modal:
- Khi bài viết chưa xuất bản và trạng thái duyệt là `approved_for_publish`:
  - Hiển thị nút **"Xuất bản vào Thư viện"** thay vì "Xuất bản" chung chung.
  - Khi Admin click nút, hiển thị hộp thoại xác nhận:
    `"Bài này sẽ được đăng vào Thư viện Montessori chuyên mục [Mẹ bầu / Mẹ sau sinh]. Bạn có chắc muốn tiếp tục không?"`
  - Khi Admin đồng ý, thực hiện gọi hàm helper mới `publishApprovedLibraryArticle` (trong `frontend/src/utils/publishToRoom.js`) để bắt đầu quá trình ghi Firestore Transaction.
  - Sau khi Transaction hoàn thành thành công:
    - Cập nhật state cục bộ: `publishStatus = 'published'`, `publishedPostId = 'montessoriLibraryArticles/lib_{id}'`.
    - Hiển thị thông báo thành công: `"Đã xuất bản bài vào Thư viện."`.
    - Gọi hàm callback `onUpdate(item.id, { publishStatus: 'published', publishedPostId: ... })` để cập nhật trạng thái ở danh sách chính bên ngoài.

---

## 13. Giao diện CommunityScreen UI cần thay đổi (`CommunityScreen.jsx`)

### 13.1 Thêm tab thứ 3 "Thư viện Montessori"
Cập nhật thanh điều hướng phân đoạn `.community-tabs`:
```jsx
      <div className="community-tabs">
        <button
          className={`comm-tab ${tab === 'rooms' ? 'active' : ''}`}
          onClick={() => setTab('rooms')}
        >
          Phòng cộng đồng
        </button>
        <button
          className={`comm-tab ${tab === 'inbox' ? 'active' : ''}`}
          onClick={() => setTab('inbox')}
        >
          Hộp thư
          {inboxBadgeLabel && (
            <span className="tab-badge">{inboxBadgeLabel}</span>
          )}
        </button>
        <button
          className={`comm-tab ${tab === 'library' ? 'active' : ''}`}
          onClick={() => setTab('library')}
        >
          Thư viện Montessori
        </button>
      </div>
```

---

## 14. Library list UI (Giao diện Danh sách Thư viện)

Khi `tab === 'library'`, render phần giao diện Danh sách Thư viện Montessori:
- **Thanh lọc chuyên mục phụ (Sub-tabs)**:
  - Có hai nút dẹt hoặc bo góc nằm cạnh nhau: **Mẹ bầu** và **Mẹ sau sinh**.
  - Trạng thái lưu trữ chuyên mục đang chọn: `const [librarySection, setLibrarySection] = useState('pregnancy');` (pregnancy | postpartum).
- **Cơ chế tải dữ liệu**:
  - Sử dụng hook `useEffect` lắng nghe sự thay đổi của `librarySection`.
  - Thực hiện truy vấn Firestore lấy danh sách bài viết từ collection `montessoriLibraryArticles`:
    - Điều kiện lọc: `where('librarySection', '==', librarySection)` và `where('status', '==', 'published')`.
    - Sắp xếp: `orderBy('publishedAt', 'desc')`.
  - Hiển thị Spinner khi đang tải, thông báo lỗi nếu tải thất bại và thông báo trống nếu chưa có bài viết nào được xuất bản trong mục này.
- **Thiết kế Card bài viết (`LibraryArticleCard`)**:
  - Giao diện thiết kế theo phong cách **Sharp Editorial & Premium Glassmorphism** (sử dụng tông nền kem ấm nhạt, viền xanh lá rừng rất mờ, không màu tím).
  - Cấu trúc Card gồm:
    - **Ảnh đại diện** (chỉ hiển thị nếu bài viết có `imageUrl` hợp lệ. Đặt tỷ lệ khung hình cố định e.g., 16:9 kèm `object-fit: cover` để chống dịch chuyển bố cục CLS).
    - **Loại bài viết** (Nhãn nhỏ ở góc, ví dụ: *"Bài hướng dẫn thực hành"* hoặc *"Card quote"* để tăng tính phân loại).
    - **Tiêu đề** (Chữ đậm, màu xanh lá rừng đậm `#2F6B4F`).
    - **Tóm tắt ngắn** (Chữ nhỏ màu xám nhạt tự nhiên).
    - **Thẻ từ khóa (Tags)**: Hiển thị danh sách tag dạng hashtag nhỏ e.g., `#dinhduong`, `#thaiky`.
    - **Nhãn bảo chứng**: Một biểu tượng tích xanh lá nhỏ kèm dòng chữ *"Nội dung được Admin duyệt"* để người dùng an tâm tin tưởng.

---

## 15. Library detail UI (Màn hình chi tiết bài viết)

- Khi người dùng click vào một Card bài viết trong danh sách Thư viện:
  - Gọi hàm `setSelectedKnowledge(article)`.
- Component `KnowledgeArticleSheet` (trong `frontend/src/components/community/KnowledgeArticleSheet.jsx`) sẽ tự động được hiển thị dưới dạng Bottom Sheet trượt lên mượt mà từ đáy màn hình.
- Component này hiển thị đầy đủ chi tiết: Tiêu đề, ảnh, tóm tắt, nội dung chính, điểm mấu chốt, hành động hôm nay, tags, nhãn minh bạch thông tin AI và cảnh báo tham khảo y tế ở chân trang.
- Do đây là component dùng chung cho toàn bộ app và đã được phân quyền read-only, người dùng thông thường sẽ không thể chỉnh sửa hay tương tác ghi đè gì, hoàn toàn đảm bảo an toàn.

---

## 16. Khả năng tương thích ngược (Backward Compatibility)
- **Bài đăng hội nhóm cũ**: Hoàn toàn không bị ảnh hưởng vì luồng tin nhắn nhóm và cấu trúc `chatRooms` giữ nguyên 100%.
- **Review Queue hiện tại**: Không làm hỏng các bài đang chờ duyệt. Các bài viết đã import trước đây nhưng chưa publish vẫn có thể được duyệt và xuất bản bình thường (nếu là bài hội nhóm thì xuất bản vào phòng chat, nếu là loại khác thì xuất bản vào Thư viện).
- **Hỗ trợ trường tuỳ chọn**:
  - Nếu bài viết thư viện không có `imageUrl` -> UI ẩn phần hiển thị hình ảnh và card vẫn dàn trang đều đặn, không bị lỗi.
  - Nếu bài viết thiếu `keyPoints` hoặc `todayAction` -> UI của `KnowledgeArticleSheet` sẽ tự động ẩn các khối tiêu đề tương ứng và không bị trống hay hiển thị lỗi.

---

## 17. Kế hoạch kiểm thử (Test Plan)

### 17.1 Kiểm thử tự động (Automated Security Rules Test)
Bổ sung các ca kiểm thử tích hợp trong file `rules-tests/firestore.rules.test.mjs` để xác nhận:
1. **Quyền truy cập của người dùng thường**:
   - Cho phép người dùng đã đăng nhập đọc bài viết trong `montessoriLibraryArticles` có `status == 'published'`.
   - Chặn người dùng thường đọc bài viết có `status != 'published'`.
   - Chặn hoàn toàn người dùng thường thực hiện `create`, `update`, `delete` trên collection này.
2. **Quyền truy cập của Admin**:
   - Cho phép Admin tạo tài liệu mới tuân thủ đúng định dạng dữ liệu (ví dụ: `imageUrl` hợp lệ, các mảng `keyPoints` và `tags` hợp lệ).
   - Chặn Admin tạo tài liệu nếu vi phạm định dạng schema (ví dụ: `title` quá dài, `imageUrl` không phải HTTPS, `librarySection` sai giá trị).
   - Cho phép Admin update hoặc delete tài liệu trong collection này.

### 17.2 Kiểm thử thủ công (Manual Verification Flow)
1. **Kiểm tra luồng Admin duyệt**:
   - Tiến hành import một Publish Package chứa bài viết có loại nội dung là "Bài hướng dẫn thực hành" (không phải bài Hội nhóm).
   - Truy cập trang Admin Review Queue, kiểm tra xem bài viết có hiển thị đúng nhãn loại nội dung hay không.
   - Nhấn "Duyệt" -> Chọn Chuyên mục Thư viện là "Mẹ sau sinh" (kiểm tra xem gợi ý mặc định có đúng theo đối tượng của bài viết không).
   - Nhấn "Xuất bản vào Thư viện" -> Xác nhận qua modal thoại -> Đảm bảo quá trình xuất bản diễn ra thành công và bài viết chuyển sang trạng thái "Đã xuất bản".
2. **Kiểm tra phía người dùng**:
   - Đăng nhập dưới tài khoản người dùng bình thường trên app.
   - Truy cập tab Cộng đồng -> Chọn mục "Thư viện Montessori".
   - Kiểm tra xem danh sách bài viết hiển thị có đúng chuyên mục "Mẹ bầu" / "Mẹ sau sinh" hay không.
   - Bấm vào một bài viết -> Bottom Sheet mở lên mượt mà hiển thị đúng và đủ toàn bộ nội dung chi tiết.
   - Đóng Bottom Sheet và đảm bảo không có lỗi dịch chuyển giao diện hay lỗi logic nào phát sinh.

---

## 18. Kế hoạch Rollback
- Revert code frontend về commit an toàn gần nhất (`a38062bb869da3ac2b7127e484168448e7bd30b7`).
- Do các bài viết Thư viện được lưu tại collection độc lập `montessoriLibraryArticles`, việc rollback code frontend sẽ ngắt ngay các tương tác liên quan đến thư viện mà không gây ảnh hưởng hay làm hỏng dữ liệu của các phòng chat nhóm hay hàng chờ duyệt hiện tại.
- Để làm sạch cơ sở dữ liệu nếu cần, Admin chỉ cần xoá các document trong collection `montessoriLibraryArticles`.

---

## 19. Các quyết định cần bạn xác nhận trước khi code

> [!IMPORTANT]
> Vui lòng xác nhận các điểm sau trước khi chuyển sang bước triển khai mã nguồn:
> 1. Bạn có muốn đổi tên hoặc bổ sung thêm chuyên mục nào khác ngoài hai mục **Mẹ bầu** (`pregnancy`) và **Mẹ sau sinh** (`postpartum`) hay không?
> 2. Quy tắc auto-detect chuyên mục dựa trên `targetAudience` như mô tả ở Mục 7 đã tối ưu chưa, hay bạn muốn bổ sung thêm các điều kiện lọc từ khoá cụ thể khác?
> 3. Bạn có muốn cho phép người dùng chia sẻ link bài viết Thư viện ra bên ngoài không, hay chỉ cần họ xem trực tiếp bên trong ứng dụng thông qua Detail Sheet?
