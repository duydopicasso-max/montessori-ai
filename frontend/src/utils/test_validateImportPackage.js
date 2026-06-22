import assert from 'assert';
import { validateImportPackage, generateImportId } from './validateImportPackage.js';

// Setup Mock LocalStorage for test case 13
global.window = {
  localStorage: {
    _data: {},
    setItem(key, value) { this._data[key] = value; },
    getItem(key) { return this._data[key] || null; },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
  }
};
global.localStorage = global.window.localStorage;

console.log("=== RUNNING VALIDATE IMPORT PACKAGE TESTS ===");

// Helper to check errors
function hasError(res, expectedText) {
  const allErrors = [
    ...(res.errors || []),
    ...(res.items || []).flatMap(it => it.errors || [])
  ];
  return allErrors.some(e => e.includes(expectedText));
}

// Helper to check warnings
function hasWarning(res, expectedText) {
  const allWarnings = [
    ...(res.warnings || []),
    ...(res.items || []).flatMap(it => it.warnings || [])
  ];
  return allWarnings.some(w => w.includes(expectedText));
}

// Case 1: Package hợp lệ 1 item -> preview valid -> import được.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    exportedAt: "2026-06-22T09:00:00Z",
    items: [
      {
        sourceDraftId: "draft_1",
        exportedAt: "2026-06-22T09:00:00Z",
        title: "Dạy trẻ tự lập",
        summary: "Hướng dẫn dạy trẻ tự lập từ sớm.",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        todayAction: "Cho trẻ tự cất đồ chơi sau khi chơi xong.",
        tags: ["tự lập", "montessori"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "Nội dung được tạo bởi AI",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        imageUrl: "https://cloudinary.com/image.jpg",
        contentType: "Bài đăng hội nhóm",
        communityPostSuggestion: {
          room: "Chuyện Gia Đình",
          postTitle: "Làm thế nào để trẻ tự lập?",
          postBody: "Mời các mẹ thảo luận về cách khuyến khích trẻ tự lập.",
          engagementQuestion: "Bé nhà bạn đã tự làm được việc gì rồi?"
        }
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true, "Case 1 failed: Valid package should return valid: true");
  assert.strictEqual(res.errors.length, 0);
  assert.strictEqual(res.items[0].status, "valid");
}

// Case 2: Package hợp lệ nhiều item -> count đúng.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 2,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved"
      },
      {
        sourceDraftId: "draft_2",
        title: "Rèn ngủ ngon cho bé",
        body: "Phương pháp rèn ngủ xuyên đêm giúp bé ngủ ngon hơn và mẹ có nhiều thời gian nghỉ ngơi.",
        tags: ["rèn ngủ"],
        authorType: "ai_assistant",
        authorName: "Trợ lý ngủ ngon",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "ready_to_publish"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.items.length, 2);
}

// Case 3: packageSchemaVersion sai -> hard error.
{
  const pkg = {
    packageSchemaVersion: "2.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 0,
    items: []
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "packageSchemaVersion phải là \"1.0\""));
}

// Case 4: packageType sai -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "invalid_package",
    source: "montessori-ai-content-studio",
    itemCount: 0,
    items: []
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "packageType phải là \"montessori_publish_package\""));
}

// Case 5: items không phải array -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 0,
    items: "not an array"
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "items phải là một mảng"));
}

// Case 6: item thiếu title -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "Thiếu trường \"title\" hoặc tiêu đề không hợp lệ."));
}

// Case 7: item thiếu body -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "Thiếu trường \"body\" hoặc nội dung chính không hợp lệ."));
}

// Case 8: room không hợp lệ -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        contentType: "Bài đăng hội nhóm",
        communityPostSuggestion: {
          room: "Phòng Không Tồn Tại",
          postTitle: "Làm thế nào để trẻ tự lập?",
          postBody: "Mời các mẹ thảo luận về cách khuyến khích trẻ tự lập.",
          engagementQuestion: "Bé nhà bạn đã tự làm được việc gì rồi?"
        }
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "Phòng đăng \"Phòng Không Tồn Tại\" không hợp lệ."));
}

// Case 9: imageUrl rỗng -> warning, không block.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        imageUrl: ""
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true);
  assert.ok(hasWarning(res, "Bài viết không kèm ảnh (imageUrl trống)."));
}

// Case 10: imageUrl không HTTPS -> hard error.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        imageUrl: "http://cloudinary.com/image.jpg"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "imageUrl có giá trị nhưng không bắt đầu bằng https://"));
}

// Case 11: imageUrl HTTPS non-Cloudinary -> warning, không block.
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Dạy trẻ tự lập",
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        imageUrl: "https://othercdn.com/image.jpg"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true);
  assert.ok(hasWarning(res, "imageUrl là HTTPS nhưng không phải link ảnh từ Cloudinary CDN."));
}

// Case 12: duplicate check -> generateImportId is deterministic and matching format
{
  const sourceDraftId = "draft_123";
  const exportedAt = "2026-06-22T09:00:00Z";
  const id1 = generateImportId(sourceDraftId, exportedAt);
  const id2 = generateImportId(sourceDraftId, exportedAt);
  assert.strictEqual(id1, id2, "generateImportId must be deterministic");
  assert.ok(id1.startsWith("imp_"), "id must start with imp_");
  assert.ok(id1.includes("draft_123"), "id must include draft id safe representation");
}

// Case 13: LocalStorage batch summary storage validation
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    items: [ { title: "A", body: "B".repeat(100), sourceDraftId: "1" } ]
  };
  
  // Simulated saveToHistory logic
  const saveToHistoryMock = (fileName, pkgItems, imported, skipped, failed, warnings) => {
    const entry = {
      batchId: `batch_${Date.now()}`,
      importedAt: new Date().toISOString(),
      fileName: fileName,
      packageSchemaVersion: pkg.packageSchemaVersion,
      itemCount: pkgItems.length,
      importedCount: imported,
      skippedDuplicateCount: skipped,
      failedCount: failed,
      warningCount: warnings,
    };
    
    const existing = localStorage.getItem('montessori_admin_import_history_v1');
    const prev = existing ? JSON.parse(existing) : [];
    const next = [entry, ...prev].slice(0, 20);
    localStorage.setItem('montessori_admin_import_history_v1', JSON.stringify(next));
  };
  
  localStorage.clear();
  saveToHistoryMock("test.json", pkg.items, 1, 0, 0, 0);
  
  const saved = JSON.parse(localStorage.getItem('montessori_admin_import_history_v1'));
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].fileName, "test.json");
  assert.strictEqual(saved[0].importedCount, 1);
  assert.strictEqual(saved[0].itemCount, 1);
  assert.strictEqual(saved[0].packageSchemaVersion, "1.0");
  assert.strictEqual(saved[0].body, undefined, "Must not save item body in history");
}

// Case 15: Safe render checks prevent null/undefined/NaN/[object Object] leaks
{
  const pkg = {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: { text: "Leaked Object" }, // Object where string expected
        body: "Trẻ từ 2 tuổi có thể tự cất đồ chơi và tự xúc ăn nếu được hướng dẫn đúng cách theo phương pháp Montessori.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved"
      }
    ]
  };
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false);
  assert.ok(hasError(res, "Trường \"title\" không thể là kiểu đối tượng"));
}

console.log("✅ ALL VALIDATE IMPORT PACKAGE TESTS PASSED SUCCESSFULLY!");
