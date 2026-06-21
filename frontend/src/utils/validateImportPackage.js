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
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateImportPackage(pkg) {
  const errors = [];

  // ── Top-level header checks ───────────────────────────────────────────────
  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, errors: ['File không hợp lệ: không thể đọc nội dung JSON.'] };
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
    return { valid: false, errors };
  }
  const expectedCount = Number(pkg.itemCount);
  if (!Number.isFinite(expectedCount) || expectedCount !== pkg.items.length) {
    errors.push(
      `itemCount (${pkg.itemCount}) không khớp với số lượng item thực tế (${pkg.items.length}).`,
    );
  }

  // Early exit if header already invalid to avoid misleading item errors
  if (errors.length > 0) return { valid: false, errors };

  // ── Per-item validation ───────────────────────────────────────────────────
  pkg.items.forEach((item, idx) => {
    const prefix = `Item ${idx + 1}${item.title ? ` ("${item.title}")` : ''}`;

    if (!item.title || !String(item.title).trim()) {
      errors.push(`${prefix}: thiếu trường "title".`);
    }
    if (!item.summary || !String(item.summary).trim()) {
      errors.push(`${prefix}: thiếu trường "summary".`);
    }
    if (!item.body || !String(item.body).trim()) {
      errors.push(`${prefix}: thiếu trường "body".`);
    }
    if (!Array.isArray(item.tags)) {
      errors.push(`${prefix}: "tags" phải là một mảng.`);
    }
    if (item.authorType !== 'ai_assistant') {
      errors.push(`${prefix}: "authorType" phải là "ai_assistant".`);
    }
    if (!item.authorName || !String(item.authorName).trim()) {
      errors.push(`${prefix}: thiếu trường "authorName".`);
    }
    if (!item.transparencyLabel || !String(item.transparencyLabel).trim()) {
      errors.push(`${prefix}: thiếu trường "transparencyLabel".`);
    }
    if (item.exportedStatus !== 'pending_import') {
      errors.push(`${prefix}: "exportedStatus" phải là "pending_import".`);
    }
    if (!['approved', 'ready_to_publish'].includes(item.approvedStatus)) {
      errors.push(
        `${prefix}: "approvedStatus" phải là "approved" hoặc "ready_to_publish", nhận được: "${item.approvedStatus}".`,
      );
    }

    // communityPostSuggestion required for "Bài đăng hội nhóm"
    if (item.contentType === 'Bài đăng hội nhóm') {
      const cps = item.communityPostSuggestion;
      if (!cps || typeof cps !== 'object') {
        errors.push(`${prefix}: contentType là "Bài đăng hội nhóm" nhưng thiếu "communityPostSuggestion".`);
      } else {
        if (!VALID_ROOMS.includes(cps.room)) {
          errors.push(
            `${prefix}: communityPostSuggestion.room "${cps.room}" không hợp lệ. ` +
            `Phải là một trong: ${VALID_ROOMS.join(', ')}.`,
          );
        }
        if (!cps.postTitle || !String(cps.postTitle).trim()) {
          errors.push(`${prefix}: communityPostSuggestion thiếu "postTitle".`);
        }
        if (!cps.postBody || !String(cps.postBody).trim()) {
          errors.push(`${prefix}: communityPostSuggestion thiếu "postBody".`);
        }
        if (!cps.engagementQuestion || !String(cps.engagementQuestion).trim()) {
          errors.push(`${prefix}: communityPostSuggestion thiếu "engagementQuestion".`);
        }
      }
    }
  });

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
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
