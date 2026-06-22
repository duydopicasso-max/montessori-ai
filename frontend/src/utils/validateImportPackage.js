/**
 * validateImportPackage.js
 * Validates a Montessori Publish Package JSON against the expected schema.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */

const VALID_ROOMS = [
  'Góc Mẹ Bầu',
  'Hành Trình Ăn Dặm',
  'Rèn Ngủ Xuyên Đêm',
  'Sức Khỏe Mẹ & Bé',
  'Chuyện Gia Đình',
];

/**
 * @param {any} pkg - Parsed JSON object
 * @returns {{ valid: boolean, errors: string[], warnings: string[], items: Array<{ item: any, errors: string[], warnings: string[], status: string }> }}
 */
export function validateImportPackage(pkg) {
  const errors = [];
  const warnings = [];
  const items = [];

  // ── Top-level header checks ───────────────────────────────────────────────
  if (!pkg || typeof pkg !== 'object') {
    return {
      valid: false,
      errors: ['File không hợp lệ: không thể đọc nội dung JSON.'],
      warnings: [],
      items: [],
    };
  }
  if (pkg.packageSchemaVersion !== '1.0') {
    errors.push(`packageSchemaVersion phải là "1.0", nhận được: "${pkg.packageSchemaVersion ?? 'không có'}".`);
  }
  if (pkg.packageType !== 'montessori_publish_package') {
    errors.push(`packageType phải là "montessori_publish_package", nhận được: "${pkg.packageType ?? 'không có'}".`);
  }
  if (pkg.source !== 'montessori-ai-content-studio') {
    errors.push(`source phải là "montessori-ai-content-studio", nhận được: "${pkg.source ?? 'không có'}".`);
  }
  if (!Array.isArray(pkg.items)) {
    errors.push('items phải là một mảng (array).');
    return { valid: false, errors, warnings, items: [] };
  }
  const expectedCount = Number(pkg.itemCount);
  if (!Number.isFinite(expectedCount) || expectedCount !== pkg.items.length) {
    warnings.push(
      `itemCount (${pkg.itemCount}) không khớp với số lượng item thực tế (${pkg.items.length}).`,
    );
  }

  // ── Per-item validation ───────────────────────────────────────────────────
  pkg.items.forEach((item, idx) => {
    const itemErrors = [];
    const itemWarnings = [];

    // Title checks
    if (!item.title || typeof item.title !== 'string' || !item.title.trim()) {
      itemErrors.push('Thiếu trường "title" hoặc tiêu đề không hợp lệ.');
    } else {
      if (item.title.length > 150) {
        itemErrors.push('Tiêu đề không được dài quá 150 ký tự.');
      } else if (item.title.length > 100) {
        itemWarnings.push('Tiêu đề khá dài (hơn 100 ký tự).');
      }
    }

    // Summary checks
    if (!item.summary || typeof item.summary !== 'string' || !item.summary.trim()) {
      itemWarnings.push('Tóm tắt (summary) đang để trống.');
    } else if (item.summary.length > 300) {
      itemWarnings.push('Tóm tắt khá dài (hơn 300 ký tự).');
    }

    // Body checks
    if (!item.body || typeof item.body !== 'string' || !item.body.trim()) {
      itemErrors.push('Thiếu trường "body" hoặc nội dung chính không hợp lệ.');
    } else {
      if (item.body.length < 50) {
        itemWarnings.push('Nội dung chính (body) quá ngắn (dưới 50 ký tự).');
      }
    }

    // TodayAction check
    if (!item.todayAction || typeof item.todayAction !== 'string' || !item.todayAction.trim()) {
      itemWarnings.push('Hành động hôm nay (todayAction) đang để trống.');
    }

    // Tags check
    if (!Array.isArray(item.tags)) {
      itemErrors.push('Trường "tags" phải là một mảng.');
    } else if (item.tags.length === 0) {
      itemWarnings.push('Bài viết không có thẻ từ khóa (tags trống).');
    } else {
      item.tags.forEach((t, i) => {
        if (typeof t !== 'string') {
          itemErrors.push(`Thẻ ở vị trí ${i + 1} không phải là chuỗi (string).`);
        }
      });
    }

    // Author checks
    if (item.authorType !== 'ai_assistant') {
      itemErrors.push('authorType phải là "ai_assistant".');
    }
    if (!item.authorName || typeof item.authorName !== 'string' || !item.authorName.trim()) {
      itemErrors.push('Thiếu trường "authorName".');
    }
    if (!item.transparencyLabel || typeof item.transparencyLabel !== 'string' || !item.transparencyLabel.trim()) {
      itemErrors.push('Thiếu trường "transparencyLabel".');
    }

    // Export status check
    if (item.exportedStatus !== 'pending_import') {
      itemErrors.push('exportedStatus phải là "pending_import".');
    }
    if (!['approved', 'ready_to_publish'].includes(item.approvedStatus)) {
      itemErrors.push(`approvedStatus phải là "approved" hoặc "ready_to_publish", nhận được: "${item.approvedStatus}".`);
    }

    // Image URL checks
    if (item.imageUrl !== undefined && item.imageUrl !== null && String(item.imageUrl).trim() !== '') {
      const imgUrlStr = String(item.imageUrl).trim();
      if (!imgUrlStr.startsWith('https://')) {
        itemErrors.push('imageUrl có giá trị nhưng không bắt đầu bằng https://');
      } else {
        const lower = imgUrlStr.toLowerCase();
        if (
          lower.includes('http://') ||
          lower.includes('javascript:') ||
          lower.includes('data:') ||
          lower.includes('blob:') ||
          lower.includes('file:')
        ) {
          itemErrors.push('imageUrl chứa scheme hoặc tiền tố không an toàn.');
        } else if (!lower.includes('cloudinary.com')) {
          itemWarnings.push('imageUrl là HTTPS nhưng không phải link ảnh từ Cloudinary CDN.');
        }
      }
    } else {
      itemWarnings.push('Bài viết không kèm ảnh (imageUrl trống).');
    }

    // Room and post suggestion checks
    if (item.contentType === 'Bài đăng hội nhóm') {
      const cps = item.communityPostSuggestion;
      if (!cps || typeof cps !== 'object') {
        itemErrors.push('contentType là "Bài đăng hội nhóm" nhưng thiếu thông tin gợi ý đăng hội nhóm (communityPostSuggestion).');
      } else {
        if (!VALID_ROOMS.includes(cps.room)) {
          itemErrors.push(`Phòng đăng "${cps.room}" không hợp lệ. Phải là một trong: ${VALID_ROOMS.join(', ')}.`);
        }
        if (!cps.postTitle || typeof cps.postTitle !== 'string' || !cps.postTitle.trim()) {
          itemErrors.push('Thiếu tiêu đề bài đăng hội nhóm (postTitle).');
        }
        if (!cps.postBody || typeof cps.postBody !== 'string' || !cps.postBody.trim()) {
          itemErrors.push('Thiếu nội dung bài đăng hội nhóm (postBody).');
        }
        if (!cps.engagementQuestion || typeof cps.engagementQuestion !== 'string' || !cps.engagementQuestion.trim()) {
          itemErrors.push('Thiếu câu hỏi gợi mở (engagementQuestion).');
        }
      }
    }

    // Safe render guard to prevent [object Object], null, NaN issues
    Object.keys(item).forEach((key) => {
      const val = item[key];
      // Fields we expect to be strings or basic types, not objects/arrays
      const textFields = [
        'title', 'summary', 'body', 'todayAction', 'imageUrl',
        'imagePrompt', 'imageStyle', 'authorName', 'transparencyLabel',
        'sourceModel', 'safetyNotes',
      ];
      if (textFields.includes(key) && val !== null && val !== undefined && typeof val === 'object') {
        itemErrors.push(`Trường "${key}" không thể là kiểu đối tượng (object/array) để tránh lỗi hiển thị.`);
      }
    });

    let status = 'valid';
    if (itemErrors.length > 0) {
      status = 'error';
    } else if (itemWarnings.length > 0) {
      status = 'warning';
    }

    items.push({
      item,
      errors: itemErrors,
      warnings: itemWarnings,
      status,
    });
  });

  // Top level errors or any hard item errors block overall package validity
  const valid = errors.length === 0 && items.every((it) => it.status !== 'error');

  return {
    valid,
    errors,
    warnings,
    items,
  };
}

/**
 * Generate a deterministic document ID from sourceDraftId + exportedAt
 * to prevent duplicate imports.
 * Uses a simple hash (no crypto needed in browser).
 */
export function generateImportId(sourceDraftId, exportedAt) {
  const str = `${sourceDraftId}__${exportedAt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `imp_${hex}_${(sourceDraftId || 'unknown').slice(0, 16).replace(/[^a-zA-Z0-9]/g, '_')}`;
}
