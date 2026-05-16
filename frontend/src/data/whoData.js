/**
 * whoData.js
 * WHO Child Growth Standards — Chuẩn tăng trưởng WHO cho Việt Nam
 * Nguồn: WHO Child Growth Standards (2006) - Áp dụng tại Việt Nam
 *
 * Cấu trúc mỗi entry: { month, p3, p15, p50, p85, p97 }
 * (Tương đương: -2SD, -1SD, Median/0SD, +1SD, +2SD)
 */

/* ── Weight-for-age GIRLS (kg) ─────────────────────────────── */
export const weightGirls = [
  { month: 0,  sd_n2: 2.4, sd_n1: 2.8, median: 3.2, sd_p1: 3.7, sd_p2: 4.2 },
  { month: 1,  sd_n2: 3.0, sd_n1: 3.6, median: 4.2, sd_p1: 4.9, sd_p2: 5.5 },
  { month: 2,  sd_n2: 3.8, sd_n1: 4.5, median: 5.1, sd_p1: 5.8, sd_p2: 6.6 },
  { month: 3,  sd_n2: 4.4, sd_n1: 5.1, median: 5.8, sd_p1: 6.6, sd_p2: 7.4 },
  { month: 4,  sd_n2: 4.9, sd_n1: 5.6, median: 6.4, sd_p1: 7.3, sd_p2: 8.1 },
  { month: 5,  sd_n2: 5.3, sd_n1: 6.1, median: 6.9, sd_p1: 7.8, sd_p2: 8.8 },
  { month: 6,  sd_n2: 5.7, sd_n1: 6.5, median: 7.3, sd_p1: 8.2, sd_p2: 9.3 },
  { month: 7,  sd_n2: 5.9, sd_n1: 6.8, median: 7.6, sd_p1: 8.6, sd_p2: 9.8 },
  { month: 8,  sd_n2: 6.2, sd_n1: 7.0, median: 7.9, sd_p1: 9.0, sd_p2: 10.2 },
  { month: 9,  sd_n2: 6.4, sd_n1: 7.3, median: 8.2, sd_p1: 9.3, sd_p2: 10.5 },
  { month: 10, sd_n2: 6.6, sd_n1: 7.5, median: 8.5, sd_p1: 9.6, sd_p2: 10.9 },
  { month: 11, sd_n2: 6.8, sd_n1: 7.7, median: 8.7, sd_p1: 9.9, sd_p2: 11.2 },
  { month: 12, sd_n2: 6.9, sd_n1: 7.9, median: 8.9, sd_p1: 10.1, sd_p2: 11.5 },
  { month: 15, sd_n2: 7.4, sd_n1: 8.5, median: 9.6, sd_p1: 10.9, sd_p2: 12.4 },
  { month: 18, sd_n2: 7.9, sd_n1: 9.0, median: 10.2, sd_p1: 11.6, sd_p2: 13.2 },
  { month: 21, sd_n2: 8.3, sd_n1: 9.5, median: 10.9, sd_p1: 12.5, sd_p2: 14.1 },
  { month: 24, sd_n2: 8.7, sd_n1: 10.0, median: 11.5, sd_p1: 13.2, sd_p2: 15.0 },
  { month: 27, sd_n2: 9.0, sd_n1: 10.5, median: 12.0, sd_p1: 13.8, sd_p2: 15.8 },
  { month: 30, sd_n2: 9.4, sd_n1: 10.9, median: 12.5, sd_p1: 14.4, sd_p2: 16.5 },
  { month: 33, sd_n2: 9.7, sd_n1: 11.3, median: 12.9, sd_p1: 14.9, sd_p2: 17.2 },
  { month: 36, sd_n2: 10.0, sd_n1: 11.6, median: 13.3, sd_p1: 15.4, sd_p2: 17.9 },
  { month: 42, sd_n2: 10.6, sd_n1: 12.4, median: 14.2, sd_p1: 16.6, sd_p2: 19.2 },
  { month: 48, sd_n2: 11.2, sd_n1: 13.1, median: 15.0, sd_p1: 17.6, sd_p2: 20.5 },
  { month: 54, sd_n2: 11.7, sd_n1: 13.8, median: 15.8, sd_p1: 18.6, sd_p2: 21.7 },
  { month: 60, sd_n2: 12.3, sd_n1: 14.5, median: 16.7, sd_p1: 19.7, sd_p2: 23.0 },
];

/* ── Weight-for-age BOYS (kg) ──────────────────────────────── */
export const weightBoys = [
  { month: 0,  sd_n2: 2.5, sd_n1: 2.9, median: 3.3, sd_p1: 3.9, sd_p2: 4.4 },
  { month: 1,  sd_n2: 3.4, sd_n1: 4.0, median: 4.5, sd_p1: 5.1, sd_p2: 5.8 },
  { month: 2,  sd_n2: 4.3, sd_n1: 5.0, median: 5.6, sd_p1: 6.3, sd_p2: 7.1 },
  { month: 3,  sd_n2: 4.6, sd_n1: 5.3, median: 6.0, sd_p1: 6.8, sd_p2: 7.7 },
  { month: 4,  sd_n2: 5.1, sd_n1: 5.9, median: 6.7, sd_p1: 7.6, sd_p2: 8.6 },
  { month: 5,  sd_n2: 5.5, sd_n1: 6.4, median: 7.3, sd_p1: 8.3, sd_p2: 9.3 },
  { month: 6,  sd_n2: 5.7, sd_n1: 6.7, median: 7.9, sd_p1: 9.0, sd_p2: 10.2 },
  { month: 7,  sd_n2: 6.0, sd_n1: 7.0, median: 8.3, sd_p1: 9.5, sd_p2: 10.8 },
  { month: 8,  sd_n2: 6.3, sd_n1: 7.3, median: 8.6, sd_p1: 9.9, sd_p2: 11.2 },
  { month: 9,  sd_n2: 6.5, sd_n1: 7.6, median: 8.9, sd_p1: 10.2, sd_p2: 11.5 },
  { month: 10, sd_n2: 6.7, sd_n1: 7.8, median: 9.2, sd_p1: 10.5, sd_p2: 11.9 },
  { month: 11, sd_n2: 6.9, sd_n1: 8.1, median: 9.4, sd_p1: 10.8, sd_p2: 12.3 },
  { month: 12, sd_n2: 7.1, sd_n1: 8.3, median: 9.6, sd_p1: 11.1, sd_p2: 12.6 },
  { month: 15, sd_n2: 7.7, sd_n1: 9.0, median: 10.4, sd_p1: 12.0, sd_p2: 13.7 },
  { month: 18, sd_n2: 8.1, sd_n1: 9.5, median: 11.1, sd_p1: 12.9, sd_p2: 14.7 },
  { month: 21, sd_n2: 8.6, sd_n1: 10.1, median: 11.8, sd_p1: 13.7, sd_p2: 15.7 },
  { month: 24, sd_n2: 9.0, sd_n1: 10.6, median: 12.2, sd_p1: 14.2, sd_p2: 16.5 },
  { month: 27, sd_n2: 9.4, sd_n1: 11.1, median: 12.8, sd_p1: 14.9, sd_p2: 17.2 },
  { month: 30, sd_n2: 9.8, sd_n1: 11.5, median: 13.3, sd_p1: 15.5, sd_p2: 17.9 },
  { month: 33, sd_n2: 10.1, sd_n1: 11.9, median: 13.7, sd_p1: 16.0, sd_p2: 18.6 },
  { month: 36, sd_n2: 10.4, sd_n1: 12.3, median: 14.2, sd_p1: 16.6, sd_p2: 19.3 },
  { month: 42, sd_n2: 11.1, sd_n1: 13.1, median: 15.3, sd_p1: 17.9, sd_p2: 21.0 },
  { month: 48, sd_n2: 11.8, sd_n1: 13.9, median: 16.3, sd_p1: 19.3, sd_p2: 22.8 },
  { month: 54, sd_n2: 12.4, sd_n1: 14.7, median: 17.3, sd_p1: 20.6, sd_p2: 24.4 },
  { month: 60, sd_n2: 13.1, sd_n1: 15.5, median: 18.3, sd_p1: 21.9, sd_p2: 26.0 },
];

/* ── Length/Height-for-age GIRLS (cm) ─────────────────────── */
export const heightGirls = [
  { month: 0,  sd_n2: 44.8, sd_n1: 47.0, median: 49.1, sd_p1: 51.3, sd_p2: 53.4 },
  { month: 1,  sd_n2: 49.8, sd_n1: 52.1, median: 54.3, sd_p1: 56.4, sd_p2: 58.6 },
  { month: 2,  sd_n2: 53.0, sd_n1: 55.4, median: 57.6, sd_p1: 59.9, sd_p2: 62.1 },
  { month: 3,  sd_n2: 55.6, sd_n1: 58.1, median: 60.4, sd_p1: 62.7, sd_p2: 64.9 },
  { month: 4,  sd_n2: 57.8, sd_n1: 60.3, median: 62.7, sd_p1: 65.0, sd_p2: 67.3 },
  { month: 5,  sd_n2: 59.6, sd_n1: 62.2, median: 64.7, sd_p1: 67.1, sd_p2: 69.5 },
  { month: 6,  sd_n2: 61.2, sd_n1: 63.8, median: 66.3, sd_p1: 68.9, sd_p2: 71.4 },
  { month: 7,  sd_n2: 62.7, sd_n1: 65.3, median: 67.9, sd_p1: 70.4, sd_p2: 73.0 },
  { month: 8,  sd_n2: 64.0, sd_n1: 66.7, median: 69.3, sd_p1: 72.0, sd_p2: 74.7 },
  { month: 9,  sd_n2: 65.3, sd_n1: 68.0, median: 70.7, sd_p1: 73.5, sd_p2: 76.2 },
  { month: 10, sd_n2: 66.5, sd_n1: 69.3, median: 72.1, sd_p1: 74.8, sd_p2: 77.5 },
  { month: 11, sd_n2: 67.7, sd_n1: 70.5, median: 73.2, sd_p1: 76.0, sd_p2: 78.9 },
  { month: 12, sd_n2: 68.9, sd_n1: 71.7, median: 74.5, sd_p1: 77.4, sd_p2: 80.2 },
  { month: 15, sd_n2: 71.7, sd_n1: 74.7, median: 77.5, sd_p1: 80.5, sd_p2: 83.5 },
  { month: 18, sd_n2: 74.2, sd_n1: 77.4, median: 80.4, sd_p1: 83.7, sd_p2: 86.8 },
  { month: 21, sd_n2: 76.5, sd_n1: 79.8, median: 83.0, sd_p1: 86.4, sd_p2: 89.7 },
  { month: 24, sd_n2: 80.0, sd_n1: 83.2, median: 86.4, sd_p1: 89.8, sd_p2: 93.1 },
  { month: 27, sd_n2: 82.2, sd_n1: 85.5, median: 88.9, sd_p1: 92.4, sd_p2: 95.8 },
  { month: 30, sd_n2: 84.5, sd_n1: 87.8, median: 91.2, sd_p1: 94.8, sd_p2: 98.2 },
  { month: 33, sd_n2: 86.5, sd_n1: 90.0, median: 93.5, sd_p1: 97.1, sd_p2: 100.6 },
  { month: 36, sd_n2: 88.6, sd_n1: 92.1, median: 95.6, sd_p1: 99.4, sd_p2: 103.0 },
  { month: 42, sd_n2: 92.4, sd_n1: 96.1, median: 99.9, sd_p1: 103.8, sd_p2: 107.6 },
  { month: 48, sd_n2: 95.8, sd_n1: 99.7, median: 103.7, sd_p1: 107.8, sd_p2: 111.7 },
  { month: 54, sd_n2: 99.0, sd_n1: 103.1, median: 107.2, sd_p1: 111.4, sd_p2: 115.5 },
  { month: 60, sd_n2: 102.0, sd_n1: 106.3, median: 110.5, sd_p1: 114.9, sd_p2: 119.2 },
];

/* ── Length/Height-for-age BOYS (cm) ──────────────────────── */
export const heightBoys = [
  { month: 0,  sd_n2: 46.1, sd_n1: 48.0, median: 49.9, sd_p1: 51.8, sd_p2: 53.7 },
  { month: 1,  sd_n2: 50.8, sd_n1: 53.0, median: 54.7, sd_p1: 56.9, sd_p2: 58.9 },
  { month: 2,  sd_n2: 54.4, sd_n1: 56.5, median: 58.4, sd_p1: 60.4, sd_p2: 62.4 },
  { month: 3,  sd_n2: 57.3, sd_n1: 59.4, median: 61.4, sd_p1: 63.5, sd_p2: 65.5 },
  { month: 4,  sd_n2: 59.7, sd_n1: 61.8, median: 63.9, sd_p1: 66.0, sd_p2: 68.0 },
  { month: 5,  sd_n2: 61.7, sd_n1: 63.9, median: 65.9, sd_p1: 68.0, sd_p2: 70.1 },
  { month: 6,  sd_n2: 63.3, sd_n1: 65.6, median: 67.6, sd_p1: 69.8, sd_p2: 72.0 },
  { month: 7,  sd_n2: 64.8, sd_n1: 67.2, median: 69.2, sd_p1: 71.5, sd_p2: 73.8 },
  { month: 8,  sd_n2: 66.2, sd_n1: 68.7, median: 70.7, sd_p1: 73.1, sd_p2: 75.5 },
  { month: 9,  sd_n2: 67.5, sd_n1: 69.9, median: 72.0, sd_p1: 74.4, sd_p2: 76.8 },
  { month: 10, sd_n2: 68.7, sd_n1: 71.2, median: 73.3, sd_p1: 75.7, sd_p2: 78.2 },
  { month: 11, sd_n2: 69.9, sd_n1: 72.5, median: 74.5, sd_p1: 76.9, sd_p2: 79.4 },
  { month: 12, sd_n2: 71.0, sd_n1: 73.7, median: 75.7, sd_p1: 78.2, sd_p2: 80.7 },
  { month: 15, sd_n2: 73.9, sd_n1: 76.6, median: 79.1, sd_p1: 81.7, sd_p2: 84.3 },
  { month: 18, sd_n2: 76.5, sd_n1: 79.6, median: 82.3, sd_p1: 85.1, sd_p2: 87.8 },
  { month: 21, sd_n2: 79.0, sd_n1: 82.1, median: 85.1, sd_p1: 88.2, sd_p2: 91.2 },
  { month: 24, sd_n2: 81.7, sd_n1: 85.1, median: 87.8, sd_p1: 90.9, sd_p2: 94.0 },
  { month: 27, sd_n2: 84.3, sd_n1: 87.4, median: 90.3, sd_p1: 93.3, sd_p2: 96.4 },
  { month: 30, sd_n2: 86.5, sd_n1: 89.7, median: 92.7, sd_p1: 95.8, sd_p2: 99.0 },
  { month: 33, sd_n2: 88.7, sd_n1: 92.0, median: 95.0, sd_p1: 98.2, sd_p2: 101.4 },
  { month: 36, sd_n2: 90.7, sd_n1: 94.0, median: 96.1, sd_p1: 100.4, sd_p2: 103.7 },
  { month: 42, sd_n2: 94.7, sd_n1: 98.1, median: 101.6, sd_p1: 105.3, sd_p2: 108.9 },
  { month: 48, sd_n2: 98.2, sd_n1: 101.8, median: 105.3, sd_p1: 109.0, sd_p2: 112.8 },
  { month: 54, sd_n2: 101.5, sd_n1: 105.3, median: 108.9, sd_p1: 112.7, sd_p2: 116.5 },
  { month: 60, sd_n2: 104.6, sd_n1: 108.4, median: 112.2, sd_p1: 116.2, sd_p2: 120.1 },
];

/* ── Head circumference-for-age GIRLS (cm) ─────────────────── */
export const headGirls = [
  { month: 0,  sd_n2: 31.7, median: 33.9, sd_p2: 36.2 },
  { month: 1,  sd_n2: 33.9, median: 36.5, sd_p2: 39.1 },
  { month: 2,  sd_n2: 35.5, median: 38.3, sd_p2: 41.0 },
  { month: 3,  sd_n2: 36.7, median: 39.5, sd_p2: 42.3 },
  { month: 4,  sd_n2: 37.7, median: 40.6, sd_p2: 43.4 },
  { month: 5,  sd_n2: 38.4, median: 41.3, sd_p2: 44.3 },
  { month: 6,  sd_n2: 39.0, median: 42.0, sd_p2: 45.0 },
  { month: 7,  sd_n2: 39.5, median: 42.6, sd_p2: 45.6 },
  { month: 8,  sd_n2: 39.9, median: 43.0, sd_p2: 46.1 },
  { month: 9,  sd_n2: 40.3, median: 43.5, sd_p2: 46.7 },
  { month: 10, sd_n2: 40.6, median: 43.8, sd_p2: 47.0 },
  { month: 11, sd_n2: 40.9, median: 44.2, sd_p2: 47.5 },
  { month: 12, sd_n2: 41.2, median: 44.5, sd_p2: 47.8 },
];

/* ── Head circumference-for-age BOYS (cm) ──────────────────── */
export const headBoys = [
  { month: 0,  sd_n2: 31.9, median: 34.5, sd_p2: 37.1 },
  { month: 1,  sd_n2: 34.9, median: 37.3, sd_p2: 39.7 },
  { month: 2,  sd_n2: 36.4, median: 39.1, sd_p2: 41.8 },
  { month: 3,  sd_n2: 37.5, median: 40.5, sd_p2: 43.2 },
  { month: 4,  sd_n2: 38.4, median: 41.6, sd_p2: 44.2 },
  { month: 5,  sd_n2: 39.1, median: 42.6, sd_p2: 45.0 },
  { month: 6,  sd_n2: 39.7, median: 43.3, sd_p2: 45.8 },
  { month: 7,  sd_n2: 40.2, median: 43.8, sd_p2: 46.4 },
  { month: 8,  sd_n2: 40.6, median: 44.3, sd_p2: 46.9 },
  { month: 9,  sd_n2: 41.0, median: 44.6, sd_p2: 47.4 },
  { month: 10, sd_n2: 41.3, median: 45.0, sd_p2: 47.8 },
  { month: 11, sd_n2: 41.6, median: 45.3, sd_p2: 48.1 },
  { month: 12, sd_n2: 41.9, median: 45.6, sd_p2: 48.5 },
];

/** Lấy dữ liệu WHO theo giới tính và chỉ số */
export function getWHOData(gender, type) {
  if (type === 'weight') return gender === 'boy' ? weightBoys : weightGirls;
  if (type === 'height') return gender === 'boy' ? heightBoys : heightGirls;
  if (type === 'head')   return gender === 'boy' ? headBoys   : headGirls;
  return [];
}

/** Lấy giá trị WHO tham chiếu gần nhất tại tháng tuổi */
export function getWHORefAtMonth(gender, type, ageMonths) {
  const data = getWHOData(gender, type);
  if (!data.length) return null;
  let closest = data[0];
  for (const d of data) {
    if (d.month <= ageMonths) closest = d;
    else break;
  }
  return closest;
}

/** Tính tuổi bé theo tháng từ ngày sinh */
export function getAgeInMonths(dob) {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  return Math.max(0, Math.min(60, months));
}

/** Tính BMI */
export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const hm = heightCm / 100;
  return Math.round((weightKg / (hm * hm)) * 10) / 10;
}

/** Tính % so với trung vị WHO */
export function getPctOfMedian(actual, gender, type, ageMonths) {
  const ref = getWHORefAtMonth(gender, type, ageMonths);
  if (!ref || !actual || !ref.median) return 0;
  return Math.round((actual / ref.median) * 100);
}

/** Đánh giá tình trạng dinh dưỡng */
export function assessNutrition(weightKg, month, gender) {
  const data = getWHOData(gender, 'weight');
  const ref = data.find(d => d.month <= month) || data[0];
  if (!ref || !weightKg) return null;
  if (weightKg < ref.sd_n2) return { label: 'Thiếu cân (< -2SD)', color: '#e74c3c' };
  if (weightKg < (ref.sd_n1 ?? ref.median)) return { label: 'Nguy cơ thiếu cân', color: '#f39c12' };
  if (weightKg <= (ref.sd_p1 ?? ref.median)) return { label: 'Bình thường ✓', color: '#27ae60' };
  if (weightKg <= ref.sd_p2) return { label: 'Thừa cân nhẹ', color: '#f39c12' };
  return { label: 'Thừa cân (> +2SD)', color: '#e74c3c' };
}
