import assert from 'assert';
import { validateImportPackage, normalizeCommunityRoom } from './validateImportPackage.js';
import { getDistinctKnowledgeArticle } from './getDistinctKnowledgeArticle.js';

console.log("=== RUNNING COMMUNITY ROOM IMPORT PARSER TESTS ===");

function makeBaseCommunityPackage(itemOverwrites) {
  return {
    packageSchemaVersion: "1.0",
    packageType: "montessori_publish_package",
    source: "montessori-ai-content-studio",
    itemCount: 1,
    items: [
      {
        sourceDraftId: "draft_1",
        title: "Tại Sao Con Thích Sờ Mọi Thứ? Đây Là Câu Trả Lời!",
        body: "Nội dung bài hội nhóm.",
        tags: ["tự lập"],
        authorType: "ai_assistant",
        authorName: "Trợ lý Montessori",
        transparencyLabel: "AI Content",
        exportedStatus: "pending_import",
        approvedStatus: "approved",
        contentType: "Bài đăng hội nhóm",
        imageUrl: "https://cloudinary.com/image.jpg",
        communityPostSuggestion: {
          postTitle: "Tại Sao Con Thích Sờ Mọi Thứ? Đây Là Câu Trả Lời!",
          postBody: "Nội dung bài hội nhóm.",
          engagementQuestion: "Ở nhà, mẹ thường để con tự làm việc gì nhất?"
        },
        ...itemOverwrites
      }
    ]
  };
}

// 1. Import item có contentType = "Bài đăng hội nhóm" và top-level communityRoom = "Chuyện Gia Đình" => valid.
{
  const pkg = makeBaseCommunityPackage({ communityRoom: "Chuyện Gia Đình" });
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true, "1. Valid community post package should pass");
  
  // 2. roomValueActuallyValidated = "Chuyện Gia Đình".
  // 3. Preview item giữ được communityRoom.
  // 4. Review queue draft item giữ được communityRoom.
  const item = res.items[0].item;
  assert.strictEqual(item.communityRoom, "Chuyện Gia Đình", "2. communityRoom should be Chuyện Gia Đình");
  assert.strictEqual(item.communityPostSuggestion.room, "Chuyện Gia Đình", "3. suggestedRoom inside cps should be Chuyện Gia Đình");
  assert.strictEqual(item.communityPostSuggestion.communityRoom, "Chuyện Gia Đình", "4. communityRoom inside cps should be Chuyện Gia Đình");

  // 5. communityPostSuggestion vẫn giữ postTitle/postBody/engagementQuestion.
  assert.strictEqual(item.communityPostSuggestion.postTitle, "Tại Sao Con Thích Sờ Mọi Thứ? Đây Là Câu Trả Lời!", "5a. postTitle preserved");
  assert.strictEqual(item.communityPostSuggestion.postBody, "Nội dung bài hội nhóm.", "5b. postBody preserved");
  assert.strictEqual(item.communityPostSuggestion.engagementQuestion, "Ở nhà, mẹ thường để con tự làm việc gì nhất?", "5c. engagementQuestion preserved");
}

// 6. Nếu communityRoom thiếu thật => báo lỗi.
{
  const pkg = makeBaseCommunityPackage({});
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false, "6. Missing room should trigger validation error");
  const errors = res.items[0].errors;
  assert.ok(errors.some(e => e.includes('không hợp lệ')), "6. Errors should mention invalid room");
}

// 7. Nếu room sai, ví dụ "Family" => báo lỗi allowed rooms.
{
  const pkg = makeBaseCommunityPackage({ communityRoom: "Family" });
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, false, "7. Invalid room Family should fail validation");
  const errors = res.items[0].errors;
  assert.ok(errors.some(e => e.includes('Phòng đăng "Family" không hợp lệ')), "7. Error message should specify Family is invalid");
}

// 8. Nếu room nằm trong communityPostSuggestion.communityRoom => vẫn đọc được.
{
  const pkg = makeBaseCommunityPackage({});
  pkg.items[0].communityPostSuggestion.communityRoom = "Chuyện Gia Đình";
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true, "8. Room in communityPostSuggestion.communityRoom should be valid");
  assert.strictEqual(res.items[0].item.communityRoom, "Chuyện Gia Đình", "8. Resolved room name check");
}

// 9. Nếu room nằm trong communityPostSuggestion.room => vẫn đọc được.
{
  const pkg = makeBaseCommunityPackage({});
  pkg.items[0].communityPostSuggestion.room = "Chuyện Gia Đình";
  const res = validateImportPackage(pkg);
  assert.strictEqual(res.valid, true, "9. Room in communityPostSuggestion.room should be valid");
  assert.strictEqual(res.items[0].item.communityRoom, "Chuyện Gia Đình", "9. Resolved room name check");
}

// 10. Không có undefined/null/NaN/[object Object] trong preview.
{
  const pkg = makeBaseCommunityPackage({ communityRoom: "Chuyện Gia Đình" });
  const res = validateImportPackage(pkg);
  const item = res.items[0].item;
  
  // Verify string fields contain none of the leak substrings
  const keysToCheck = ['title', 'summary', 'body', 'communityRoom'];
  keysToCheck.forEach(key => {
    const val = item[key];
    if (typeof val === 'string') {
      assert.ok(!val.includes('undefined'), `Field ${key} should not contain 'undefined'`);
      assert.ok(!val.includes('null'), `Field ${key} should not contain 'null'`);
      assert.ok(!val.includes('[object Object]'), `Field ${key} should not contain object notation`);
    }
  });
}

// === TESTS FOR getDistinctKnowledgeArticle ===

// 11. Community post không có knowledge fields => returns null
{
  const msg = {
    title: "Bài đăng cộng đồng",
    text: "Nội dung bài viết.",
    isAI: true
  };
  const art = getDistinctKnowledgeArticle(msg);
  assert.strictEqual(art, null, "11. Post with no knowledge fields should return null");
}

// 12. Community post có knowledgeArticleSuggestion nhưng trùng lặp body => returns null
{
  const msg = {
    title: "Bài đăng cộng đồng",
    text: "Nội dung kiến thức trùng lặp.",
    isAI: true,
    knowledgeArticleSuggestion: {
      title: "Bài đăng cộng đồng",
      body: "Nội dung kiến thức trùng lặp.",
      summary: "Tóm tắt"
    }
  };
  const art = getDistinctKnowledgeArticle(msg);
  assert.strictEqual(art, null, "12. Identical/duplicated article body should be filtered out");
}

// 13. Community post có knowledgeArticleSuggestion hợp lệ và khác biệt => trả về article
{
  const msg = {
    title: "Ngừng Ép Con Nhắm Mắt Đi Ngủ",
    text: "Mẹo nhỏ giúp con tự ngủ ngon lành.",
    isAI: true,
    knowledgeArticleSuggestion: {
      title: "Kiến thức về giấc ngủ của trẻ",
      body: "Chu kỳ giấc ngủ của bé khác biệt hoàn toàn với người lớn...",
      summary: "Chi tiết khoa học giấc ngủ trẻ em.",
      todayAction: "Nghe nhạc nhẹ",
      tags: ["giấc ngủ", "montessori"]
    }
  };
  const art = getDistinctKnowledgeArticle(msg);
  assert.ok(art !== null, "13. Mapped article should not be null");
  assert.strictEqual(art.title, "Kiến thức về giấc ngủ của trẻ", "13a. Title mapped");
  assert.strictEqual(art.body, "Chu kỳ giấc ngủ của bé khác biệt hoàn toàn với người lớn...", "13b. Body mapped");
  assert.strictEqual(art.todayAction, "Nghe nhạc nhẹ", "13c. todayAction mapped");
}

// 14. Nếu knowledgeArticleSuggestion thiếu body => returns null
{
  const msg = {
    title: "Bài đăng",
    text: "Nội dung",
    knowledgeArticleSuggestion: {
      title: "Chỉ có tiêu đề không có body"
    }
  };
  const art = getDistinctKnowledgeArticle(msg);
  assert.strictEqual(art, null, "14. Article without body should return null");
}

console.log("✅ ALL COMMUNITY ROOM IMPORT PARSER TESTS PASSED!");
