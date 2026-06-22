/**
 * publishToRoom.js
 * Phase 2C.2 — Publish approved AI content to community chatRooms.
 *
 * SAFETY CONTRACT:
 * - Only publishes items with reviewStatus === 'approved_for_publish'.
 * - Only publishes contentType === 'Bài đăng hội nhóm'.
 * - Only writes to chatRooms/{roomId}/messages/{msgId}.
 * - Never writes to customRooms, communityPosts, or any other collection.
 * - Uses runTransaction for atomic duplicate protection.
 * - Admin UID is used as senderId (required by Firestore rules).
 */

import {
  collection, doc, runTransaction, serverTimestamp,
} from 'firebase/firestore';

// ── Constants ────────────────────────────────────────────────────────────────

export const ROOM_NAME_TO_ID = {
  'Góc Mẹ Bầu':        'pregnancy',
  'Hành Trình Ăn Dặm': 'weaning',
  'Rèn Ngủ Xuyên Đêm': 'sleep',
  'Sức Khỏe Mẹ & Bé':  'health',
  'Chuyện Gia Đình':    'family',
};

export const AI_ASSISTANT_AUTHOR_NAME = 'Trợ lý Montessori';
export const AI_ASSISTANT_AUTHOR_TYPE = 'ai_assistant';

const MAX_TEXT_LENGTH = 5000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a deterministic, Firestore-safe message document ID from a queue ID.
 * Format: ai_<sanitized-queue-id>
 * Keeps only a-zA-Z0-9_- characters to ensure a valid Firestore doc ID.
 */
export function buildAiMessageId(queueId) {
  if (!queueId || typeof queueId !== 'string' || !queueId.trim()) {
    throw new Error('ID hàng chờ không hợp lệ: không thể tạo message ID.');
  }
  const sanitized = queueId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  if (!sanitized) {
    throw new Error(`ID hàng chờ "${queueId}" không thể dùng để tạo message ID.`);
  }
  return `ai_${sanitized}`;
}

/**
 * Format the public text from communityPostSuggestion.
 * Combines postTitle, postBody, and engagementQuestion.
 */
function buildPostText({ postTitle, postBody, engagementQuestion }) {
  const parts = [
    postTitle.trim(),
    postBody.trim(),
    `Câu hỏi gợi mở:\n${engagementQuestion.trim()}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}

// ── Publish Result Types ─────────────────────────────────────────────────────

export const PUBLISH_RESULT = {
  SUCCESS:          'success',
  ALREADY_PUBLISHED: 'already_published',
  ERROR:            'error',
};

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Publish an approved AI content item to its target community chatRoom.
 *
 * @param {{ db: Firestore, item: object, adminUid: string, overrideRoom?: string }} params
 *   overrideRoom: optional room name from ROOM_NAME_TO_ID keys.
 *                 If provided, overrides item.communityPostSuggestion.room.
 *                 Useful when admin wants to correct AI room suggestion.
 * @returns {Promise<{ result: string, publishedPostId?: string, error?: string }>}
 */
export async function publishApprovedAiContent({ db, item, adminUid, overrideRoom }) {
  // ── Step 1: Pre-flight validation ─────────────────────────────────────────
  const validationError = validateItem(item, adminUid, overrideRoom);
  if (validationError) {
    return { result: PUBLISH_RESULT.ERROR, error: validationError };
  }

  const sugg = item.communityPostSuggestion;

  // Resolve room: admin override takes priority over AI suggestion
  const resolvedRoomName = overrideRoom || sugg.room;
  const roomId = ROOM_NAME_TO_ID[resolvedRoomName];
  if (!roomId) {
    return {
      result: PUBLISH_RESULT.ERROR,
      error:  `Tên nhóm "${resolvedRoomName}" không hợp lệ. Các nhóm hợp lệ: ${Object.keys(ROOM_NAME_TO_ID).join(', ')}.`,
    };
  }

  const msgText = buildPostText({
    postTitle:         sugg.postTitle,
    postBody:          sugg.postBody,
    engagementQuestion: sugg.engagementQuestion,
  });

  if (msgText.length > MAX_TEXT_LENGTH) {
    return {
      result: PUBLISH_RESULT.ERROR,
      error:  `Nội dung bài quá dài (${msgText.length} ký tự, tối đa ${MAX_TEXT_LENGTH}). Vui lòng chỉnh sửa trước khi xuất bản.`,
    };
  }

  // ── Step 2: Build deterministic message ID ─────────────────────────────────
  let messageId;
  try {
    messageId = buildAiMessageId(item.id);
  } catch (e) {
    return { result: PUBLISH_RESULT.ERROR, error: e.message };
  }

  const publishedPostPath = `chatRooms/${roomId}/messages/${messageId}`;
  const queueRef   = doc(db, 'aiContentReviewQueue', item.id);
  const messageRef = doc(db, 'chatRooms', roomId, 'messages', messageId);

  // ── Step 3: Atomic transaction ────────────────────────────────────────────
  try {
    const txResult = await runTransaction(db, async (tx) => {

      // 3a. Re-read queue doc to guard against race conditions
      const queueSnap = await tx.get(queueRef);
      if (!queueSnap.exists()) {
        throw new Error('Không tìm thấy bài trong hàng chờ. Vui lòng tải lại trang.');
      }
      const latestData = queueSnap.data();
      if (latestData.publishStatus === 'published') {
        return { alreadyPublished: true, publishedPostId: latestData.publishedPostId };
      }

      // 3b. Check if message already exists (edge case: partial previous write)
      const msgSnap = await tx.get(messageRef);
      if (msgSnap.exists()) {
        // Message exists but queue not marked — fix queue and return
        tx.update(queueRef, {
          publishStatus:   'published',
          publishedAt:     serverTimestamp(),
          publishedByUid:  adminUid,
          publishedPostId: publishedPostPath,
          updatedAt:       serverTimestamp(),
        });
        return { alreadyPublished: true, publishedPostId: publishedPostPath };
      }

      // Resolve images array from latest queue data
      const normImageUrl = normalizeImageUrl(latestData.imageUrl || item.imageUrl);
      if (normImageUrl !== '') {
        if (!isValidHttpsImageUrl(normImageUrl)) {
          throw new Error('Link ảnh không hợp lệ. Vui lòng dùng URL HTTPS hợp lệ hoặc xoá ảnh để đăng bài không kèm ảnh.');
        }
      }
      const images = normImageUrl !== '' ? [normImageUrl] : [];

      // 3c. Create public message
      tx.set(messageRef, {
        title:            sugg.postTitle.trim(),
        text:             msgText,
        images:           images,
        label:            null,
        createdAt:        serverTimestamp(),
        senderId:         adminUid,
        isAnon:           false,
        senderName:       AI_ASSISTANT_AUTHOR_NAME,
        senderPhoto:      null,
        senderBaby:       null,
        likes:            0,
        replies:          0,
        authorType:       AI_ASSISTANT_AUTHOR_TYPE,
        transparencyLabel: item.transparencyLabel || '',
        sourceQueueId:    item.id,
      });

      // 3d. Update queue document
      tx.update(queueRef, {
        publishStatus:   'published',
        publishedAt:     serverTimestamp(),
        publishedByUid:  adminUid,
        publishedPostId: publishedPostPath,
        updatedAt:       serverTimestamp(),
      });

      return { alreadyPublished: false, publishedPostId: publishedPostPath };
    });

    if (txResult.alreadyPublished) {
      return {
        result:          PUBLISH_RESULT.ALREADY_PUBLISHED,
        publishedPostId: txResult.publishedPostId,
      };
    }

    return {
      result:          PUBLISH_RESULT.SUCCESS,
      publishedPostId: publishedPostPath,
    };

  } catch (err) {
    const msg = err?.code === 'permission-denied'
      ? 'Không có quyền xuất bản. Vui lòng kiểm tra lại quyền admin và Firestore Rules.'
      : `Lỗi khi xuất bản: ${err?.message || 'Lỗi không xác định'}`;
    return { result: PUBLISH_RESULT.ERROR, error: msg };
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

export function normalizeImageUrl(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function isValidHttpsImageUrl(value) {
  const norm = normalizeImageUrl(value);
  if (norm === '') return true; // allowed empty

  if (norm.length > 2048) return false;
  if (!norm.startsWith('https://')) return false;

  // Block dangerous schemes
  const lower = norm.toLowerCase();
  if (
    lower.includes('http://') ||
    lower.includes('javascript:') ||
    lower.includes('data:') ||
    lower.includes('blob:') ||
    lower.includes('file:')
  ) {
    return false;
  }

  // Future improvement: whitelist Cloudinary/CDN domains here
  return true;
}

function validateItem(item, adminUid, overrideRoom = null) {
  if (!item || typeof item !== 'object') {
    return 'Dữ liệu bài không hợp lệ.';
  }
  if (!item.id || typeof item.id !== 'string') {
    return 'Bài không có ID hợp lệ.';
  }
  if (!adminUid || typeof adminUid !== 'string') {
    return 'Không xác định được tài khoản admin.';
  }
  if (item.reviewStatus !== 'approved_for_publish') {
    return `Chỉ xuất bản bài có trạng thái "Đã duyệt". Trạng thái hiện tại: "${item.reviewStatus || '(trống)'}".`;
  }
  if (item.publishStatus === 'published') {
    return 'Bài này đã được xuất bản rồi.';
  }
  if (item.contentType !== 'Bài đăng hội nhóm') {
    return `Chỉ xuất bản loại "Bài đăng hội nhóm". Loại hiện tại: "${item.contentType || '(trống)'}".`;
  }
  const sugg = item.communityPostSuggestion;
  if (!sugg || typeof sugg !== 'object') {
    return 'Bài không có thông tin đề xuất hội nhóm (communityPostSuggestion).';
  }
  if (!ROOM_NAME_TO_ID[sugg.room] && !overrideRoom) {
    return `Tên nhóm "${sugg.room}" không hợp lệ. Các nhóm hợp lệ: ${Object.keys(ROOM_NAME_TO_ID).join(', ')}.`;
  }
  if (overrideRoom && !ROOM_NAME_TO_ID[overrideRoom]) {
    return `Nhóm được chọn "${overrideRoom}" không hợp lệ. Các nhóm hợp lệ: ${Object.keys(ROOM_NAME_TO_ID).join(', ')}.`;
  }
  if (!sugg.postTitle?.trim()) {
    return 'Thiếu tiêu đề bài (postTitle).';
  }
  if (!sugg.postBody?.trim()) {
    return 'Thiếu nội dung bài (postBody).';
  }
  if (!sugg.engagementQuestion?.trim()) {
    return 'Thiếu câu hỏi gợi mở (engagementQuestion).';
  }
  // Validate imageUrl if present in item
  if (item.imageUrl !== undefined && item.imageUrl !== null) {
    const norm = normalizeImageUrl(item.imageUrl);
    if (norm !== '') {
      if (!isValidHttpsImageUrl(norm)) {
        return 'Link ảnh không hợp lệ. Vui lòng dùng URL HTTPS hợp lệ hoặc xoá ảnh để đăng bài không kèm ảnh.';
      }
    }
  }
  return null; // valid
}
