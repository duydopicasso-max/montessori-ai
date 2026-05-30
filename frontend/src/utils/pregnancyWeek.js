/**
 * pregnancyWeek.js — Single source of truth for pregnancy week calculation
 *
 * Thứ tự ưu tiên:
 *  1. pregnancyStartDate / lastPeriodDate / conceptionStartDate → tính từ ngày bắt đầu
 *  2. edd / dueDate                       → tính ngược từ ngày dự sinh (40 tuần)
 *  3. storedWeek (profile.pregnancyWeek)  → fallback cuối, dùng nếu không có EDD
 *  4. null                                → không đủ dữ liệu
 *
 * Timezone: chuẩn hoá về local midnight để tránh lệch UTC.
 * Clamp: 1–42 tuần.
 */

/** Parse ISO date string → local midnight Date (tránh UTC offset) */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  } catch {
    return null;
  }
}

/** Today at local midnight */
export function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/** Calculate current pregnancy week from EDD (due date). */
export function weekFromEdd(eddStr) {
  const edd = parseLocalDate(eddStr);
  if (!edd) return null;
  const today = todayLocal();
  const daysLeft = Math.round((edd - today) / 86400000);
  const week = Math.floor((280 - daysLeft) / 7);
  if (week < 1 || week > 42) return null;
  return week;
}

/** Calculate current pregnancy week from start date (LMP / conception). */
export function weekFromStartDate(startDateStr) {
  const start = parseLocalDate(startDateStr);
  if (!start) return null;
  const today = todayLocal();
  const diffDays = Math.round((today - start) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1 || week > 42) return null;
  return week;
}

/**
 * Main helper: single source of truth for pregnancy week.
 * pregnancyProfile and pregnancyData are Firestore docs.
 */
export function getCurrentPregnancyWeek(profile, pregnancyData) {
  // 1. pregnancyStartDate / lastPeriodDate / conceptionStartDate
  const startStr = pregnancyData?.pregnancyStartDate || pregnancyData?.lastPeriodDate || pregnancyData?.conceptionStartDate
    || profile?.pregnancyInfo?.pregnancyStartDate || profile?.pregnancyInfo?.lastPeriodDate || profile?.pregnancyInfo?.conceptionStartDate;
  if (startStr) {
    const w = weekFromStartDate(startStr);
    if (w !== null) return w;
  }

  // 2. edd / dueDate
  const eddStr = pregnancyData?.edd || profile?.pregnancyInfo?.dueDate || pregnancyData?.dueDate;
  if (eddStr) {
    const w = weekFromEdd(eddStr);
    if (w !== null) return w;
  }

  // 3. Stored pregnancyWeek / currentWeek fallback
  const storedWeek = pregnancyData?.currentWeek || profile?.pregnancyWeek || profile?.currentWeek
    || profile?.pregnancyInfo?.weeks;
  if (storedWeek) {
    const w = parseInt(storedWeek, 10);
    if (!isNaN(w) && w >= 1 && w <= 42) return w;
  }

  return null;
}