import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, 
  serverTimestamp, query, orderBy, where, setDoc, writeBatch, getDoc, onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { getAgeInMonths } from '../data/whoData.js';
import './BabyProfileScreen.css';
import { getCurrentPregnancyWeek } from '../utils/pregnancyWeek.js';
import AppDatePicker from '../components/AppDatePicker.jsx';

/* ─── SVG Line Icons (No Emoji) ─── */
const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconMedical = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const IconApple = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c4.97 0 9-4.03 9-9 0-3.12-1.56-5.83-4-7.42-.87-.57-1.9-.91-3-1.01V2.83c0-1-.8-1.83-1.8-1.83h-.4c-1 0-1.8.83-1.8 1.83V4.57c-1.1.1-2.13.44-3 1.01C4.56 7.17 3 9.88 3 13c0 4.97 4.03 9 9 9z"/>
  </svg>
);
const IconLeaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);
const IconNote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconMilestone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l4-8 4 5 3-3 4 6"/>
    <circle cx="19" cy="7" r="2"/>
  </svg>
);
const IconPencil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

const safeStr = (v) => (v && v !== 'undefined' && v !== 'null' ? String(v) : '');
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};



/* ── Gợi ý trò chơi Montessori theo nhóm tuổi ── */
const PLAY_DATA = {
  '0-3 tháng': [
    { name: 'Nhìn theo đồ vật', desc: 'Di chuyển đồ vật màu sắc tương phản tươi sáng trước mắt bé để kích thích thị giác sơ sinh.' },
    { name: 'Nghe nhạc nhẹ', desc: 'Mở nhạc nhẹ, nhạc cổ điển hoặc tiếng ồn trắng để ổn định thính giác và cảm xúc.' },
    { name: 'Massage tay chân', desc: 'Massage nhẹ nhàng tay chân bé bằng dầu dừa ấm, tăng xúc giác và thắt chặt tình mẫu tử.' },
    { name: 'Gương thần kỳ', desc: 'Đặt gương an toàn ở bên cạnh nệm để bé nhìn thấy bóng mình, kích thích nhận thức bản thân.' },
  ],
  '3-6 tháng': [
    { name: 'Lắc lục lạc', desc: 'Khuyến khích bé cầm nắm và tự lắc lục lạc để cảm nhận âm thanh và vận động phối hợp tay-mắt.' },
    { name: 'Tummy time (Nằm sấp)', desc: 'Đặt bé nằm sấp từ 3-5 phút mỗi ngày, phát triển sức mạnh cơ cổ, lưng và vai.' },
    { name: 'Bong bóng sắc màu', desc: 'Thổi bong bóng trước mặt bé, giúp bé rèn luyện phản xạ theo dõi bằng mắt và cố gắng với lấy.' },
    { name: 'Bắt chước âm bập bẹ', desc: 'Khi bé phát ra âm thanh, hãy nói chuyện lại bằng đúng âm điệu đó để kích thích bé giao tiếp.' },
  ],
  '6-12 tháng': [
    { name: 'Khám phá hộp rỗng', desc: 'Bỏ các quả bóng vải nhỏ vào chiếc hộp để bé tập thọc tay vào lấy ra và bỏ vào.' },
    { name: 'Ăn dặm tự chỉ huy (BLW)', desc: 'Để các miếng rau củ luộc mềm trên bàn ăn dặm để bé tự bốc, rèn luyện cầm nắm ba ngón tay.' },
    { name: 'Tập đứng vịn xe tập đi', desc: 'Dùng xe tập đi gỗ Montessori hoặc vịn cũi, khuyến khích vận động thô và sự tự tin.' },
    { name: 'Ú òa cùng mẹ', desc: 'Che mặt bằng khăn mỏng rồi mở ra để bé hiểu khái niệm vật thể vẫn tồn tại dù bị che khuất.' },
  ],
  '12-24 tháng': [
    { name: 'Vẽ màu nước bằng tay', desc: 'Cho bé dùng ngón tay chấm màu thực phẩm vẽ lên tờ giấy lớn - kích thích giác quan.' },
    { name: 'Xếp chồng khối gỗ', desc: 'Xếp chồng các hình khối gỗ lên nhau rồi đẩy đổ, phát triển phối hợp tay và tư duy không gian.' },
    { name: 'Rót nước/hạt Montessori', desc: 'Rót nước từ cốc nhỏ sang cốc khác bằng khay gỗ Montessori, rèn kiên nhẫn và chính xác.' },
    { name: 'Đọc sách tranh cùng bé', desc: 'Sách bìa cứng với hình ảnh con vật lớn, chỉ vào tranh và cùng bé phát âm tên loài vật.' },
  ],
  '2-3 tuổi': [
    { name: 'Trò chơi đóng vai đơn giản', desc: 'Nấu ăn giả vờ, bán hoa quả - kích thích kỹ năng ngôn ngữ và phát triển xã hội.' },
    { name: 'Ghép hình gỗ Puzzle', desc: 'Puzzle gỗ 4-8 mảnh đơn giản để bé tư duy logic tìm miếng ghép phù hợp.' },
    { name: 'Tưới cây trong vườn', desc: 'Mẹ đưa bé bình xịt nước nhỏ để bé tự tưới hoa, học cách yêu thương thiên nhiên.' },
    { name: 'Phân loại màu sắc Montessori', desc: 'Phân loại các pompom vải hoặc kẹp giấy vào các khay có màu tương ứng.' },
    { name: 'Tự xúc ăn & dọn dẹp', desc: 'Bé tự dùng muỗng xúc ăn và phụ mẹ xếp đồ chơi sau khi chơi xong vào giỏ gỗ.' },
  ],
  '3-6 tuổi': [
    { name: 'Đếm đồ vật thực tế', desc: 'Đếm số quả táo trên bàn, số đôi dép trước cửa - rèn luyện tư duy toán học cụ thể.' },
    { name: 'Cắt dán thủ công', desc: 'Sử dụng kéo nhựa an toàn đầu tù để cắt giấy màu theo đường vẽ sẵn và dán.' },
    { name: 'Việc nhà Montessori', desc: 'Cho bé lau bàn ăn, xếp quần áo nhỏ của mình, tăng sự tự tin và ý thức tự lập.' },
    { name: 'Tự bịa câu chuyện', desc: 'Nhìn vào một bức tranh và bé tự kể một câu chuyện giả tưởng theo suy nghĩ của riêng mình.' },
  ],
};

function getPlayGroup(ageMonths) {
  if (ageMonths < 3)  return '0-3 tháng';
  if (ageMonths < 6)  return '3-6 tháng';
  if (ageMonths < 12) return '6-12 tháng';
  if (ageMonths < 24) return '12-24 tháng';
  if (ageMonths < 36) return '2-3 tuổi';
  return '3-6 tuổi';
}

/* ── SVG Icons for Quick Pregnancy Summary ── */
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconPulse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

/* ── Gestational Stage Helpers ── */
function parseDateAtMidnight(dateInput) {
  if (!dateInput) return null;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
    const t = new Date(dateInput);
    return isNaN(t.getTime()) ? null : new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
  } catch {
    return null;
  }
}

function getCurrentDateAtMidnight() {
  const e = new Date();
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}

function getDaysLeftToEDD(edd) {
  const t = parseDateAtMidnight(edd);
  if (!t) return null;
  const n = getCurrentDateAtMidnight();
  return Math.round((t - n) / 86400000);
}

function getTwinProfileStage(week, daysLeft) {
  if (week >= 35 || (daysLeft !== null && daysLeft <= 21)) {
    return 'twin_near_birth';
  }
  if (week >= 28) {
    return 'twin_late';
  }
  if (week >= 13) {
    return 'twin_mid';
  }
  return 'twin_early';
}

function getSingletonProfileStage(week, daysLeft) {
  if (week >= 37 || (daysLeft !== null && daysLeft <= 14)) {
    return 'singleton_near_birth';
  }
  if (week >= 28) {
    return 'singleton_late';
  }
  if (week >= 13) {
    return 'singleton_mid';
  }
  return 'singleton_early';
}

function getProfileStage(profile, pregnancyData, rawBabies, isPregnant, weekNum) {
  if (isPregnant) {
    if (!weekNum) return 'fallback';
    const edd = pregnancyData?.edd || profile?.pregnancyInfo?.dueDate || '';
    const daysLeft = getDaysLeftToEDD(edd);
    
    // Robust check for twin pregnancy
    const isTwinPreg = (
      rawBabies.filter(b => b && safeStr(b.childKey)).length >= 2 ||
      profile?.numBabies === 2 ||
      pregnancyData?.isTwin === true ||
      pregnancyData?.babyCount === 2 ||
      (profile?.pregnancyInfo?.babyName && safeStr(profile.pregnancyInfo.babyName).includes('&'))
    );

    if (isTwinPreg) {
      return getTwinProfileStage(weekNum, daysLeft);
    } else {
      return getSingletonProfileStage(weekNum, daysLeft);
    }
  }

  // Postpartum (parent) mode:
  const dob = rawBabies[0]?.dob || '';
  if (!dob) return 'fallback';
  try {
    const diffTime = Date.now() - new Date(dob).getTime();
    const diffDays = Math.floor(diffTime / 86400000);
    if (diffDays < 0) return 'fallback';
    const ageMonths = diffDays / 30.44;
    if (ageMonths < 6 && diffDays <= 42) {
      return 'postpartum_new';
    }
    if (ageMonths < 6) {
      return 'baby_0_6_months';
    }
    if (ageMonths < 12) {
      return 'baby_6_12_months';
    }
    if (ageMonths < 24) {
      return 'baby_12_24_months';
    }
    return 'baby_24_plus_months';
  } catch {
    return 'fallback';
  }
}

const PREGNANCY_STAGES = {
  pregnant_early: {
    badge: "Thai kỳ tuần đầu",
    overviewDesc: "Mẹ có thể theo dõi khám thai, dinh dưỡng và ghi chú hôm nay.",
    emptyCheckup: "Mẹ có thể lưu lại kết quả khám, chỉ số và lời dặn của bác sĩ.",
    emptyNutrition: "Ghi lại lịch uống vitamin, triệu chứng và các món bồi bổ hàng ngày.",
    emptyNote: "Mẹ có thể ghi lại cảm nhận, triệu chứng hoặc điều cần nhớ hôm nay."
  },
  pregnant_mid: {
    badge: "Giữa thai kỳ",
    overviewDesc: "Mẹ có thể theo dõi chỉ số siêu âm, khám thai và cảm nhận thai máy.",
    emptyCheckup: "Lưu kết quả khám, chỉ số siêu âm và lời dặn của bác sĩ.",
    emptyNutrition: "Ghi lại lịch uống vitamin, cân nặng mẹ và món bồi bổ hàng ngày.",
    emptyNote: "Lưu cảm nhận thai máy, khoảnh khắc thai kỳ hoặc điều cần nhớ."
  },
  pregnant_late: {
    badge: "Cuối thai kỳ",
    overviewDesc: "Mẹ có thể ghi lại thai máy, lịch khám và chuẩn bị cho ngày sinh.",
    emptyCheckup: "Lưu kết quả khám và lịch hẹn khám tiếp theo.",
    emptyNutrition: "Ghi lại dinh dưỡng và những điều bác sĩ dặn.",
    emptyNote: "Lưu danh sách chuẩn bị giỏ đồ đi sinh hoặc điều cần nhớ."
  },
  near_birth: {
    badge: "Sắp gặp bé yêu",
    overviewDesc: "Mẹ sắp gặp bé yêu rồi. Chúc mẹ bình an.",
    emptyCheckup: "Lưu lịch khám cuối và lời dặn bác sĩ.",
    emptyNutrition: "Ghi lại dinh dưỡng những ngày cuối thai kỳ.",
    emptyNote: "Lưu danh sách giỏ đồ đi sinh và những điều cần chuẩn bị."
  },
  singleton_early: {
    badge: "Đầu thai kỳ",
    overviewDesc: "Mẹ có thể theo dõi khám thai, dinh dưỡng và ghi chú hôm nay.",
    emptyCheckup: "Mẹ có thể lưu lại kết quả khám đầu thai kỳ và lời dặn của bác sĩ.",
    emptyNutrition: "Ghi lại lịch uống vitamin, nước uống và những gì mẹ ăn hôm nay.",
    emptyNote: "Mẹ có thể ghi lại cảm nhận của cơ thể hoặc điều cần nhớ hôm nay."
  },
  singleton_mid: {
    badge: "Giữa thai kỳ",
    overviewDesc: "Mẹ có thể theo dõi khám thai, siêu âm và cảm nhận thai máy.",
    emptyCheckup: "Lưu kết quả khám và chỉ số siêu âm gần nhất.",
    emptyNutrition: "Ghi lại lịch uống vitamin, cân nặng mẹ và bữa ăn hàng ngày.",
    emptyNote: "Lưu cảm nhận thai máy, dặn dò bác sĩ hoặc khoảnh khắc thai kỳ."
  },
  singleton_late: {
    badge: "Cuối thai kỳ",
    overviewDesc: "Mẹ có thể ghi lại thai máy, lịch khám và chuẩn bị cho ngày sinh.",
    emptyCheckup: "Lưu kết quả khám và lịch hẹn khám tiếp theo.",
    emptyNutrition: "Ghi lại dinh dưỡng và những điều bác sĩ dặn.",
    emptyNote: "Lưu danh sách chuẩn bị giỏ đồ đi sinh hoặc điều cần nhớ."
  },
  singleton_near_birth: {
    badge: "Sắp gặp bé",
    overviewDesc: "Mẹ sắp gặp bé rồi. Chúc mẹ thật bình an.",
    emptyCheckup: "Lưu lịch khám cuối và lời dặn bác sĩ.",
    emptyNutrition: "Ghi lại dinh dưỡng những ngày cuối thai kỳ.",
    emptyNote: "Lưu danh sách giỏ đồ đi sinh và những điều cần chuẩn bị."
  },
  twin_early: {
    badge: "Đầu thai kỳ · Thai đôi",
    overviewDesc: "Mẹ có thể theo dõi khám thai, dinh dưỡng và cảm nhận của hai bé.",
    emptyCheckup: "Mẹ có thể lưu lại kết quả khám đầu thai kỳ và lời dặn của bác sĩ.",
    emptyNutrition: "Ghi lại lịch uống vitamin, nước uống và triệu chứng ăn uống hàng ngày.",
    emptyNote: "Mẹ có thể ghi lại cảm nhận, triệu chứng hoặc dặn dò bác sĩ hôm nay."
  },
  twin_mid: {
    badge: "Giữa thai kỳ · Thai đôi",
    overviewDesc: "Mẹ có thể theo dõi khám thai, dinh dưỡng và cảm nhận thai máy.",
    emptyCheckup: "Lưu kết quả khám và chỉ số siêu âm riêng của Bé A và Bé B.",
    emptyNutrition: "Ghi lại lịch uống vitamin, cân nặng mẹ và món bồi bổ hàng ngày.",
    emptyNote: "Lưu cảm nhận thai máy, khoảnh khắc thai kỳ hoặc dặn dò bác sĩ."
  },
  twin_late: {
    badge: "Cuối thai kỳ · Thai đôi",
    overviewDesc: "Mẹ có thể theo dõi thai máy, lịch khám và chuẩn bị sát hơn.",
    emptyCheckup: "Lưu kết quả khám và lịch hẹn khám tiếp theo.",
    emptyNutrition: "Ghi lại dinh dưỡng và những điều bác sĩ dặn ở cuối thai kỳ.",
    emptyNote: "Lưu danh sách chuẩn bị giỏ đồ đi sinh và những điều cần nhớ."
  },
  twin_near_birth: {
    badge: "Sắp gặp các bé · Thai đôi",
    overviewDesc: "Mẹ sắp gặp hai bé rồi. Montessori AI chúc mẹ bình an.",
    emptyCheckup: "Lưu lịch khám cuối và lời dặn bác sĩ.",
    emptyNutrition: "Ghi lại dinh dưỡng để giữ sức cho ngày sinh.",
    emptyNote: "Lưu giỏ đồ đi sinh, tâm tư hoặc lời nhắn đầu tiên cho hai bé."
  },
  fallback: {
    badge: "Đang theo dõi thai kỳ",
    overviewDesc: "Mẹ có thể theo dõi khám thai, dinh dưỡng và ghi chú hôm nay.",
    emptyCheckup: "Mẹ có thể lưu lại kết quả khám và lời dặn của bác sĩ.",
    emptyNutrition: "Ghi lại dinh dưỡng, triệu chứng của mẹ hàng ngày.",
    emptyNote: "Mẹ có thể ghi lại cảm nhận hoặc điều cần nhớ hôm nay."
  }
};

function QuickPregnancySummary({ userId, week, profileStage, isTwin, fetuses, babyName, pregnancyData, onSwitchTab }) {
  const [latestCheckup, setLatestCheckup] = useState(null);
  const [latestNutrition, setLatestNutrition] = useState(null);
  const [latestNote, setLatestNote] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const babyAName = fetuses[0]?.name || "Bé A";
  const babyBName = fetuses[1]?.name || "Bé B";
  const resolvedBabyName = babyName || fetuses[0]?.name || "bé";
  const eddStr = pregnancyData?.edd ? formatDate(pregnancyData.edd) : null;

  const loadData = useCallback(() => {
    if (!userId) return;
    
    // Get latest checkup visit
    const visitsQuery = query(collection(db, 'users', userId, 'pregnancyVisits'), orderBy('date', 'desc'));
    getDocs(visitsQuery).then((snap) => {
      if (!snap.empty) {
        setLatestCheckup({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    }).catch(() => {});

    // Get latest nutrition entry
    const nutritionQuery = query(collection(db, 'users', userId, 'pregnancyNutrition'), orderBy('date', 'desc'));
    getDocs(nutritionQuery).then((snap) => {
      if (!snap.empty) {
        setLatestNutrition({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    }).catch(() => {});

    // Get latest note
    const notesQuery = query(collection(db, 'users', userId, 'pregnancyNotes'), orderBy('date', 'desc'));
    getDocs(notesQuery).then((snap) => {
      if (!snap.empty) {
        setLatestNote({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    loadData();
    window.addEventListener('profile-data-changed', loadData);
    return () => window.removeEventListener('profile-data-changed', loadData);
  }, [loadData]);

  const V = (val) => (val !== null && val !== undefined && !isNaN(val)) ? val : null;

  const getB = () => {
    const ee = latestCheckup?.babyA;
    return ee ? (V(ee.efw) ? `EFW: ${ee.efw}g` : V(ee.bpd) ? `BPD: ${ee.bpd}mm${V(ee.fl) ? ` · FL: ${ee.fl}mm` : ""}` : V(ee.hc) ? `HC: ${ee.hc}mm` : null) : null;
  };

  const getH = () => {
    const ee = latestCheckup?.babyA;
    const ne = latestCheckup?.babyB;
    if (!ee && !ne) return null;
    const Te = V(ee?.efw);
    const We = V(ne?.efw);
    if (Te !== null || We !== null) {
      const valA = Te !== null ? `${Te}g` : "Chưa có dữ liệu";
      const valB = We !== null ? `${We}g` : "Chưa có dữ liệu";
      const me = Te !== null && We !== null ? ` · Chênh ${Math.abs(Te - We)}g` : "";
      return `${babyAName}: ${valA} · ${babyBName}: ${valB}${me}`;
    }
    return null;
  };

  // Card definitions
  const cardCheckup = {
    id: "checkup",
    icon: <IconCalendar />,
    label: "Khám thai gần nhất",
    onClick: () => onSwitchTab('checkup'),
    children: latestCheckup ? (
      <>
        {getB() && !isTwin && <p className="pqs-val">{getB()}</p>}
        {getH() && isTwin && <p className="pqs-val" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>{getH()}</p>}
        {latestCheckup.notes && (
          <p className="pqs-sub" style={{ fontStyle: 'italic' }}>
            "{latestCheckup.notes.slice(0, 50)}{latestCheckup.notes.length > 50 ? '...' : ''}"
          </p>
        )}
        <p className="pqs-date">{formatDate(latestCheckup.date)}</p>
        <span className="pqs-cta">Xem chi tiết</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Chưa có lần khám nào.</p>
        <span className="pqs-cta">+ Ghi nhận khám thai</span>
      </>
    )
  };

  const cardUltrasound = {
    id: "ultrasound",
    icon: <IconSearch />,
    label: "Chỉ số siêu âm",
    onClick: () => onSwitchTab('checkup'),
    children: getB() ? (
      <>
        <p className="pqs-val">{getB()}</p>
        {latestCheckup?.date && <p className="pqs-date">{formatDate(latestCheckup.date)}</p>}
        <span className="pqs-cta">Xem chỉ số</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Chưa có chỉ số siêu âm.</p>
        <span className="pqs-cta">+ Thêm lần khám</span>
      </>
    )
  };

  const cardTwinMetrics = {
    id: "twin_metrics",
    icon: <IconSearch />,
    label: "Chỉ số hai bé",
    onClick: () => onSwitchTab('checkup'),
    children: getH() ? (
      <>
        <p className="pqs-val" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>{getH()}</p>
        {latestCheckup?.date && <p className="pqs-date">{formatDate(latestCheckup.date)}</p>}
        <span className="pqs-cta">Xem chỉ số</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Chưa có chỉ số hai bé.</p>
        <span className="pqs-cta">+ Thêm lần khám</span>
      </>
    )
  };

  const cardEdd = {
    id: "edd",
    icon: <IconHeart />,
    label: "Ngày dự sinh",
    onClick: () => onSwitchTab('overview'),
    children: eddStr ? (
      <>
        <p className="pqs-val">{eddStr}</p>
        <span className="pqs-cta">Xem hồ sơ</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Thêm ngày dự sinh để cá nhân hoá app.</p>
        <span className="pqs-cta">+ Thêm ngày</span>
      </>
    )
  };

  const cardNutrition = {
    id: "nutrition",
    icon: <IconApple />,
    label: "Dinh dưỡng mẹ",
    onClick: () => onSwitchTab('nutrition'),
    children: latestNutrition ? (
      <>
        {latestNutrition.water > 0 && <p className="pqs-val">Nước: {latestNutrition.water} ml</p>}
        {latestNutrition.vitamin && <p className="pqs-sub">Vi chất: {latestNutrition.vitamin}</p>}
        {!latestNutrition.water && !latestNutrition.vitamin && <p className="pqs-sub">Ngày {formatDate(latestNutrition.date)}</p>}
        <span className="pqs-cta">Xem thêm</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Ghi lại nước, vitamin hàng ngày.</p>
        <span className="pqs-cta">+ Ghi nhận</span>
      </>
    )
  };

  const cardEducation = {
    id: "education",
    icon: <IconLeaf />,
    label: "Thai giáo hôm nay",
    onClick: () => onSwitchTab('education'),
    children: (() => {
      const nameA = fetuses[0]?.name || "Bé A";
      const nameB = fetuses[1]?.name || "Bé B";
      const twinNames = `${nameA} và ${nameB}`;
      const targetBabyName = isTwin ? twinNames : resolvedBabyName;

      let eduText = `Trò chuyện với ${targetBabyName} 5 phút`;
      if (week <= 12) eduText = "Nghe nhạc nhẹ vài phút";
      else if (week <= 27) eduText = `Trò chuyện với ${targetBabyName} 5 phút`;
      else eduText = `Đọc truyện cho ${targetBabyName} nghe`;
      return (
        <>
          <p className="pqs-val">{eduText}</p>
          <span className="pqs-cta">Xem gợi ý</span>
        </>
      );
    })()
  };

  const cardNote = {
    id: "note",
    icon: <IconNote />,
    label: "Ghi chú gần nhất",
    onClick: () => onSwitchTab('note'),
    children: latestNote ? (
      <>
        <p className="pqs-val">{(latestNote.title || "Ghi chú thai kỳ").slice(0, 40)}</p>
        <p className="pqs-date">{formatDate(latestNote.date)}</p>
        <span className="pqs-cta">Xem thêm</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Lưu dặn dò bác sĩ hoặc cảm nhận hôm nay.</p>
        <span className="pqs-cta">+ Thêm ghi chú</span>
      </>
    )
  };

  const cardFetalMovement = {
    id: "fetal_movement",
    icon: <IconHeart />,
    label: "Thai máy",
    onClick: () => onSwitchTab('note'),
    children: week >= 20 ? (
      <>
        <p className="pqs-val">Từ tuần {week}, mẹ để ý thai máy của {resolvedBabyName}.</p>
        <span className="pqs-cta">Ghi nhận cảm nhận</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Tìm hiểu trước về thai máy.</p>
        <span className="pqs-cta">Tìm hiểu thêm</span>
      </>
    )
  };

  const cardContractions = {
    id: "contractions",
    icon: <IconPulse />,
    label: "Cơn gò",
    onClick: () => onSwitchTab('note'),
    children: (
      <>
        <p className="pqs-sub">Ghi lại cơn gò để dễ theo dõi.</p>
        <span className="pqs-cta">Ghi nhận</span>
      </>
    )
  };

  const cardBirthPrep = {
    id: "birth_prep",
    icon: <IconTruck />,
    label: "Chuẩn bị sinh",
    onClick: () => onSwitchTab('note'),
    children: (
      <>
        <p className="pqs-sub">Lưu danh sách giỏ đồ và điều cần chuẩn bị.</p>
        <span className="pqs-cta">Thêm ghi chú</span>
      </>
    )
  };

  const cardNextAppt = {
    id: "next_appt",
    icon: <IconCalendar />,
    label: "Lịch khám tiếp theo",
    onClick: () => onSwitchTab('checkup'),
    children: latestCheckup?.nextAppointment ? (
      <>
        <p className="pqs-val">{formatDate(latestCheckup.nextAppointment)}</p>
        <span className="pqs-cta">Xem lịch</span>
      </>
    ) : (
      <>
        <p className="pqs-sub">Chưa có lịch hẹn tiếp theo.</p>
        <span className="pqs-cta">+ Thêm lịch hẹn</span>
      </>
    )
  };

  const metricCard = isTwin ? cardTwinMetrics : cardUltrasound;

  const cardList = (() => {
    if (profileStage === "singleton_near_birth" || profileStage === "twin_near_birth") {
      return [cardNextAppt, cardFetalMovement, cardContractions, cardBirthPrep, metricCard, cardNutrition, cardNote];
    }
    if (profileStage === "singleton_late" || profileStage === "twin_late") {
      return [cardNextAppt, cardFetalMovement, metricCard, cardNutrition, cardContractions, cardNote, cardEducation, cardBirthPrep];
    }
    if ((profileStage === "singleton_mid" || profileStage === "twin_mid") && week >= 20) {
      return [cardCheckup, metricCard, cardFetalMovement, cardNutrition, cardEducation, cardNote, cardNextAppt];
    }
    if (profileStage === "singleton_mid" || profileStage === "twin_mid") {
      return [cardCheckup, metricCard, cardNutrition, cardEducation, cardNote, cardEdd, cardNextAppt];
    }
    return [cardCheckup, cardEdd, cardNutrition, cardNote, cardEducation];
  })();

  const visibleCards = cardList.slice(0, 4);
  const extraCards = cardList.slice(4);
  const hasExtra = extraCards.length > 0;

  const renderCard = (card) => {
    return (
      <div 
        key={card.id} 
        className="pqs-card" 
        onClick={card.onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(ev) => ev.key === 'Enter' && card.onClick()}
      >
        <div className="pqs-card-top">
          <div className="pqs-icon-wrap">{card.icon}</div>
          <span className="pqs-card-label">{card.label}</span>
        </div>
        {card.children}
      </div>
    );
  };

  return (
    <div className="pqs-section">
      <h3 className="pqs-section-title">Hồ sơ nhanh thai kỳ</h3>
      <div className="pqs-grid">
        {visibleCards.map(renderCard)}
      </div>
      {hasExtra && expanded && (
        <div className="pqs-grid pqs-grid--extra fade-in">
          {extraCards.map(renderCard)}
        </div>
      )}
      {hasExtra && (
        <button className="pqs-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? (
            <>
              <span className="pqs-expand-icon pqs-expand-icon--up">›</span>
              Thu gọn
            </>
          ) : (
            <>
              <span className="pqs-expand-icon">›</span>
              Xem thêm ({extraCards.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function BabyProfileScreen({ profile }) {
  const userId       = profile?.user?.uid;
  const statusContext = profile?.status || 'pregnant'; // 'pregnant' | 'parent'
  const isPregnant   = statusContext === 'pregnant';

  /* ── States ── */
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [activeTab, setActiveTab]             = useState(isPregnant ? 'overview' : 'health');
  
  // Modals & Toast states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showConfirmBirthModal, setShowConfirmBirthModal] = useState(false);
  const [toast, setToast]                                 = useState('');
  const [deleteConfirmInfo, setDeleteConfirmInfo]         = useState(null); // { type: 'checkup'|'nutrition'|'note'|'health'|'food', id }
  const [deleting, setDeleting]                           = useState(false);

  // Profile data locally synced
  const [pregnancyData, setPregnancyData] = useState(null);

  /* ── Resolve babies / fetuses ── */
  const rawBabies   = useMemo(() => [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0)), [profile?.babies]);
  const pregnancyId = safeStr(profile?.pregnancyId || profile?.currentPregnancyId || profile?.pregnancyInfo?.id || 'pregnancy');
  const currentWeek = isPregnant ? getCurrentPregnancyWeek(profile, pregnancyData) : null;

  // Thai nhi (chỉ lọc những bé thuộc thai kỳ hiện tại - có childKey)
  const fetuses = useMemo(() => isPregnant
    ? rawBabies
        .filter(b => b && safeStr(b.childKey))
        .map(b => ({ key: safeStr(b.childKey), name: safeStr(b.name), id: b.id }))
    : [], [isPregnant, rawBabies]);

  // Bé đã sinh (chỉ lọc những bé không phải fetus ảo)
  const babies = useMemo(() => isPregnant ? [] : rawBabies, [isPregnant, rawBabies]);

  const needsSubjectSelector = isPregnant
    ? fetuses.length > 1
    : babies.length > 1;

  // Header texts
  const headerTitle = isPregnant
    ? 'Hồ sơ Thai kỳ'
    : babies.length > 1
      ? 'Hồ sơ các bé'
      : `Hồ sơ của ${safeStr(babies[0]?.name) || 'bé yêu'}`;

  const buildSubtitle = () => {
    if (isPregnant) {
      if (fetuses.length >= 2) {
        return `Mẹ và các bé · Tuần thai ${currentWeek}`;
      }
      return 'Khám thai · Dinh dưỡng mẹ · Thai giáo';
    }
    return 'Sức khỏe · Món ăn · Gợi ý chơi';
  };
  const headerSubtitle = buildSubtitle();

  // Subject options
  const allLabel = isPregnant
    ? (fetuses.length === 2 ? 'Cả hai bé' : fetuses.length > 2 ? 'Tất cả các bé' : 'Tất cả')
    : (babies.length > 1 ? 'Tất cả' : 'Tất cả');

  const subjectOptions = isPregnant
    ? [
        { id: 'all', label: allLabel },
        ...fetuses.map(f => ({ id: f.key, label: f.name || f.key })),
      ]
    : [
        { id: 'all', label: allLabel },
        ...babies.map((b, i) => ({ id: b.id || `baby-${i}`, label: b.name || `Bé ${String.fromCharCode(65 + i)}` })),
      ];



  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId, 'tracking', 'pregnancy'), (snap) => {
      if (snap.exists()) setPregnancyData(snap.data());
    });
    return () => unsub();
  }, [userId]);

  const isTwinPregnancy = useMemo(() => {
    if (!isPregnant) return false;
    const numBabies = profile?.numBabies || profile?.numberOfBabies || pregnancyData?.numberOfBabies || pregnancyData?.numBabies || fetuses.length;
    const pregType = profile?.pregnancyType || pregnancyData?.pregnancyType || (pregnancyData?.isTwin ? 'twins' : '');
    return numBabies === 2 || pregType === 'twins';
  }, [isPregnant, profile, pregnancyData, fetuses]);

  const babyAName = useMemo(() => fetuses[0]?.name || "Bé A", [fetuses]);
  const babyBName = useMemo(() => fetuses[1]?.name || "Bé B", [fetuses]);

  const activeFetusNames = useMemo(() => {
    if (isTwinPregnancy) {
      return `${babyAName} và ${babyBName}`;
    }
    return fetuses[0]?.name || 'bé';
  }, [isTwinPregnancy, babyAName, babyBName, fetuses]);

  const weekNum = parseInt(currentWeek, 10) || 0;
  const profileStage = useMemo(() => {
    return getProfileStage(profile, pregnancyData, rawBabies, isPregnant, weekNum);
  }, [profile, pregnancyData, rawBabies, isPregnant, weekNum]);

  const isSingletonPregnancy = useMemo(() => {
    if (!isPregnant) return false;
    return !isTwinPregnancy;
  }, [isPregnant, isTwinPregnancy]);

  // Recalculate EDD days near birth to show Birth Confirmation button
  const showBirthBanner = useMemo(() => {
    if (!isPregnant) return false;
    if (isTwinPregnancy && weekNum >= 35) return true;
    if (!isTwinPregnancy && weekNum >= 37) return true;
    const edd = pregnancyData?.edd;
    if (!edd) return false;
    const daysLeft = getDaysLeftToEDD(edd);
    if (daysLeft === null) return false;
    return isTwinPregnancy ? daysLeft <= 21 : daysLeft <= 14;
  }, [isPregnant, pregnancyData, weekNum, isTwinPregnancy]);

  // Global Toast trigger helper
  const triggerToast = (msg) => {
    setToast(msg);
  };

  return (
    <div className="profile-screen">
      {/* ── Header ── */}
      <header className="profile-header">
        <div className="profile-header-text">
          <h1 className="profile-title">
            <span className="profile-title-icon"><IconClipboard /></span>
            {headerTitle}
          </h1>
          <p className="profile-subtitle">{headerSubtitle}</p>
        </div>
      </header>

      {/* Selector bé/thai nhi removed per user request */}

      {/* ── Nav Tabs ── */}
      <div className="profile-tabs-wrap">
        <div className="profile-tabs">
          {isPregnant ? (
            [
              { id: 'overview',  icon: IconClipboard, label: 'Tổng quan' },
              { id: 'checkup',   icon: IconCalendar,  label: 'Khám thai' },
              { id: 'nutrition', icon: IconApple,     label: 'Dinh dưỡng mẹ' },
              { id: 'education', icon: IconLeaf,      label: 'Thai giáo' },
              { id: 'note',      icon: IconNote,      label: 'Ghi chú' },
            ].map(t => (
              <button
                key={t.id}
                className={`profile-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="profile-tab-icon"><t.icon /></span>
                <span className="profile-tab-label">
                  {t.id === 'nutrition' ? (
                    <>
                      <span className="desktop-only-inline">Dinh dưỡng mẹ</span>
                      <span className="mobile-only-inline">Dinh dưỡng</span>
                    </>
                  ) : (
                    t.label
                  )}
                </span>
              </button>
            ))
          ) : (
            [
              { id: 'health',    icon: IconMedical,   label: 'Sức khỏe' },
              { id: 'food',      icon: IconApple,     label: 'Món ăn' },
              { id: 'play',      icon: IconLeaf,      label: 'Trò chơi' },
              { id: 'note',      icon: IconNote,      label: 'Ghi chú' },
            ].map(t => (
              <button
                key={t.id}
                className={`profile-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="profile-tab-icon"><t.icon /></span>
                <span className="profile-tab-label">{t.label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="profile-content">
        {isPregnant ? (
          <>
            {activeTab === 'overview' && (
              <OverviewTab 
                userId={userId}
                pregnancyData={pregnancyData}
                fetuses={fetuses}
                currentWeek={currentWeek}
                showBirthBanner={showBirthBanner}
                activeFetusNames={activeFetusNames}
                onEditProfile={() => setShowEditProfileModal(true)}
                onOpenBirthModal={() => setShowConfirmBirthModal(true)}
                profileStage={profileStage}
                onSwitchTab={setActiveTab}
                isTwinPregnancy={isTwinPregnancy}
                isSingletonPregnancy={isSingletonPregnancy}
              />
            )}
            {activeTab === 'checkup' && (
              <PregnancyCheckupTab 
                userId={userId}
                pregnancyId={pregnancyId}
                selectedSubject={selectedSubject}
                fetuses={fetuses}
                isTwinPregnancy={isTwinPregnancy}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'checkup', id })}
                triggerToast={triggerToast}
                currentWeek={currentWeek}
              />
            )}
            {activeTab === 'nutrition' && (
              <PregnancyNutritionTab 
                userId={userId}
                selectedSubject={selectedSubject}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'nutrition', id })}
                triggerToast={triggerToast}
              />
            )}
            {activeTab === 'education' && (
              <PregnancyEducationTab 
                userId={userId}
                currentWeek={currentWeek}
                activeFetusNames={activeFetusNames}
                triggerToast={triggerToast}
                selectedSubject={selectedSubject}
                fetuses={fetuses}
                isTwinPregnancy={isTwinPregnancy}
              />
            )}
            {activeTab === 'note' && (
              <PregnancyNotesTab 
                userId={userId}
                selectedSubject={selectedSubject}
                subjectOptions={subjectOptions}
                needsSubjectSelector={needsSubjectSelector}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'note', id })}
                triggerToast={triggerToast}
              />
            )}
          </>
        ) : (
          <>
            {activeTab === 'health' && (
              <ParentHealthTab 
                userId={userId}
                selectedBabyIndex={selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject)}
                babies={babies}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'health', id })}
                triggerToast={triggerToast}
                onSwitchTab={setActiveTab}
              />
            )}
            {activeTab === 'food' && (
              <ParentFoodTab 
                userId={userId}
                selectedBabyIndex={selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject)}
                babies={babies}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'food', id })}
                triggerToast={triggerToast}
              />
            )}
            {activeTab === 'play' && (
              <ParentPlayTab 
                selectedBabyIndex={selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject)}
                babies={babies}
              />
            )}
            {activeTab === 'note' && (
              <ParentNotesTab 
                userId={userId}
                selectedSubject={selectedSubject}
                subjectOptions={subjectOptions}
                needsSubjectSelector={needsSubjectSelector}
                babies={babies}
                onDeleteClick={(id) => setDeleteConfirmInfo({ type: 'note', id })}
                triggerToast={triggerToast}
              />
            )}
          </>
        )}
      </div>

      {/* ── Modal: Chỉnh sửa hồ sơ thai kỳ ── */}
      {showEditProfileModal && (
        <EditPregnancyProfileModal 
          userId={userId}
          pregnancyData={pregnancyData}
          fetuses={fetuses}
          onClose={() => setShowEditProfileModal(false)}
          onSaved={(updated) => {
            setPregnancyData(updated);
            setShowEditProfileModal(false);
            triggerToast('Đã cập nhật thông tin thai kỳ');
          }}
        />
      )}

      {/* ── Modal: Xác nhận chào đời (Confirm Birth) ── */}
      {showConfirmBirthModal && (
        <ConfirmBirthModal 
          userId={userId}
          fetuses={fetuses}
          pregnancyData={pregnancyData}
          onClose={() => setShowConfirmBirthModal(false)}
          onSaved={() => {
            setShowConfirmBirthModal(false);
            const babyA = fetuses[0]?.name || "Bé A";
            const babyB = fetuses[1]?.name || "Bé B";
            const msg = isTwinPregnancy 
              ? `Chúc mừng mẹ và gia đình đã đón ${babyA} và ${babyB}. Chúc mẹ hồi phục thật tốt và hai bé lớn lên bình an.`
              : `Chào mừng bé yêu chào đời! 🎉`;
            triggerToast(msg);
          }}
        />
      )}

      {/* ── iOS Confirm Modal ── */}
      {deleteConfirmInfo && (
        <IOSConfirmModal
          title="Xóa mục ghi chép này?"
          description="Dữ liệu đã lưu sẽ không còn xuất hiện trên hồ sơ của mẹ."
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          processing={deleting}
          onCancel={() => setDeleteConfirmInfo(null)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              const { type, id } = deleteConfirmInfo;
              let path = '';
              
              if (type === 'checkup') {
                path = `users/${userId}/pregnancyVisits/${id}`;
              } else if (type === 'nutrition') {
                path = `users/${userId}/pregnancyNutrition/${id}`;
              } else if (type === 'note' && isPregnant) {
                path = `users/${userId}/pregnancyNotes/${id}`;
              } else if (type === 'health') {
                const bIdx = selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject);
                const bId = babies[bIdx]?.id || 'baby';
                path = `users/${userId}/babies/${bId}/medicalRecords/${id}`;
              } else if (type === 'food') {
                const bIdx = selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject);
                const bId = babies[bIdx]?.id || 'baby';
                path = `users/${userId}/babies/${bId}/foods/${id}`;
              } else if (type === 'note' && !isPregnant) {
                const bIdx = selectedSubject === 'all' ? 0 : rawBabies.findIndex(b => b.id === selectedSubject);
                const bId = babies[bIdx]?.id || 'baby';
                path = `users/${userId}/babies/${bId}/notes/${id}`;
              }

              if (path) {
                await deleteDoc(doc(db, path));
                triggerToast('Đã xóa dữ liệu ghi chép');
                // Trigger event local reload
                window.dispatchEvent(new CustomEvent('profile-data-changed'));
              }
            } catch (err) {
              triggerToast('Chưa thể xóa, mẹ thử lại sau nhé.');
            } finally {
              setDeleting(false);
              setDeleteConfirmInfo(null);
            }
          }}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <ToastNotification 
          message={toast} 
          onClose={() => setToast('')} 
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 1: TỔNG QUAN (PREGNANT)
   ════════════════════════════════════════ */
function OverviewTab({ 
  userId, pregnancyData, fetuses, currentWeek, showBirthBanner, 
  activeFetusNames, onEditProfile, onOpenBirthModal, profileStage, onSwitchTab,
  isTwinPregnancy, isSingletonPregnancy
}) {
  const [dismissedBirthBanner, setDismissedBirthBanner] = useState(false);
  const eddStr = pregnancyData?.edd ? formatDate(pregnancyData.edd) : 'Chưa cập nhật';
  
  const isTwins = isTwinPregnancy;
  const isSingleton = isSingletonPregnancy;
  const babyAName = fetuses[0]?.name || "Bé A";
  const babyBName = fetuses[1]?.name || "Bé B";
  const displayBabyNames = isTwins ? `${babyAName} · ${babyBName}` : (fetuses[0]?.name || 'Chưa đặt tên');

  const weekNum = parseInt(currentWeek, 10) || 0;
  
  const stageMeta = PREGNANCY_STAGES[profileStage] || PREGNANCY_STAGES.fallback;
  const firstFetusName = fetuses[0]?.name || 'bé';

  const formattedDesc = useMemo(() => {
    if (!stageMeta.overviewDesc) return '';
    return stageMeta.overviewDesc
      .replace(/\{babyAName\}/g, babyAName)
      .replace(/\{babyBName\}/g, babyBName)
      .replace(/Bé A và Bé B/g, `${babyAName} và ${babyBName}`)
      .replace(/Bắp và Bon/g, `${babyAName} và ${babyBName}`);
  }, [stageMeta.overviewDesc, babyAName, babyBName]);

  return (
    <div className="tab-content fade-in">
      {/* Near birth banners */}
      {isSingleton && profileStage === "singleton_near_birth" && (
        <div className="singleton-near-birth-banner fade-in">
          <span className="tnb-text">
            Mẹ sắp gặp {firstFetusName !== "bé" ? firstFetusName : "bé"} rồi. Montessori AI chúc mẹ thật bình an trong những ngày cuối thai kỳ.
          </span>
        </div>
      )}
      {isTwins && profileStage === "twin_near_birth" && (
        <div className="twin-near-birth-banner fade-in">
          <span className="tnb-text">
            Mẹ sắp gặp {activeFetusNames} rồi. Montessori AI chúc mẹ thật bình an trong những ngày cuối thai kỳ.
          </span>
        </div>
      )}

      {/* Overview main card */}
      <div className="overview-card overview-card--compact">
        <div className="ovc-top-row">
          <div className={`overview-status-badge${(profileStage === 'singleton_near_birth' || profileStage === 'twin_near_birth') ? ' near-birth-badge' : ''}`}>
            {stageMeta.badge || "Đang theo dõi thai kỳ"}
          </div>
          <button className="ovc-edit-btn" onClick={onEditProfile} aria-label="Chỉnh sửa hồ sơ">
            <IconPencil /> Chỉnh sửa
          </button>
        </div>

        <div className="ovc-name-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="ovc-baby-names" style={{ margin: 0 }}>{displayBabyNames}</h3>
          {currentWeek ? (
            <span className="ovc-week-pill">{isTwins ? `Tuần thai ${currentWeek}` : `Tuần ${currentWeek}`}</span>
          ) : (
            <button 
              type="button"
              className="ovc-week-pill ovc-week-pill--missing-cta" 
              onClick={onEditProfile}
              style={{
                background: 'rgba(255, 107, 107, 0.1)',
                color: '#ff6b6b',
                border: '1px dashed #ff6b6b',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              Chưa đủ thông tin tuần thai · Cập nhật hồ sơ thai kỳ
            </button>
          )}
        </div>

        <div className="ovc-meta-row">
          <span className="ovc-meta-item">
            <span className="ovc-meta-lbl">Dự sinh</span>
            <span className="ovc-meta-val">{eddStr}</span>
          </span>
          <span className="ovc-meta-dot">·</span>
          <span className="ovc-meta-item">
            <span className="ovc-meta-val">
              {isTwins ? 'Thai đôi' : fetuses.length > 2 ? 'Thai ba' : 'Thai đơn'}
            </span>
          </span>
        </div>

        {formattedDesc && <p className="ovc-desc">{formattedDesc}</p>}
      </div>

      {/* Quick summary grids */}
      {(isSingleton || isTwins) && (
        <QuickPregnancySummary 
          userId={userId}
          profileStage={profileStage}
          week={weekNum}
          isTwin={isTwins}
          fetuses={fetuses}
          babyName={firstFetusName}
          pregnancyData={pregnancyData}
          onSwitchTab={onSwitchTab}
        />
      )}

      {/* Birth confirmation card */}
      {showBirthBanner && !dismissedBirthBanner && (
        <div className="birth-confirm-card scale-in">
          <h4 className="birth-confirm-title">Gần đến ngày gặp {isTwins ? 'các bé' : 'bé'} rồi mẹ</h4>
          <p className="birth-confirm-desc">
            Chúc mẹ và {isTwins ? 'các bé' : 'bé'} luôn bình an. Khi {activeFetusNames} đã chào đời, mẹ có thể cập nhật để app chuyển sang hồ sơ sau sinh.
          </p>
          <div className="birth-confirm-actions" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="primary-btn" onClick={onOpenBirthModal} style={{ flex: 1 }}>
              Cập nhật {isTwins ? 'các bé' : 'bé'} đã chào đời
            </button>
            <button 
              className="outline-btn secondary-dismiss-btn" 
              onClick={() => setDismissedBirthBanner(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color, #e5e5ea)',
                color: 'var(--text-color, #1c1c1e)',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Để sau
            </button>
          </div>
        </div>
      )}

      {/* Manual birth confirm entry */}
      {(!showBirthBanner || dismissedBirthBanner) && (
        <div className="profile-options-section scale-in">
          <h4 className="profile-options-title">Tùy chọn hồ sơ</h4>
          <button 
            type="button" 
            className="profile-options-link-btn" 
            onClick={onOpenBirthModal}
          >
            <span>🍼 Xác nhận {isTwins ? 'các bé' : 'bé'} đã chào đời</span>
            <span className="arrow-icon"><IconChevronRight /></span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 2: LỊCH SỬ KHÁM THAI (PREGNANT)
   ════════════════════════════════════════ */
function PregnancyCheckupTab({ 
  userId, pregnancyId, selectedSubject, fetuses, isTwinPregnancy, onDeleteClick, triggerToast, currentWeek 
}) {
  const [records, setRecords]               = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNextDatePicker, setShowNextDatePicker] = useState(false);
  const [activeFetusFormTab, setActiveFetusFormTab] = useState('baby-a'); // 'baby-a' | 'baby-b'
  
  // Form input states
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                   = useState('');
  const [nextAppointment, setNextAppointment] = useState('');
  const [timThaiA, setTimThaiA]             = useState('');
  const [timThaiB, setTimThaiB]             = useState('');

  // Baby metrics
  const [babyA, setBabyA] = useState({ bpd: '', fl: '', ac: '', hc: '', crl: '', efw: '' });
  const [babyB, setBabyB] = useState({ bpd: '', fl: '', ac: '', hc: '', crl: '', efw: '' });

  const loadCheckups = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'users', userId, 'pregnancyVisits'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    loadCheckups();
    window.addEventListener('profile-data-changed', loadCheckups);
    return () => window.removeEventListener('profile-data-changed', loadCheckups);
  }, [loadCheckups]);

  const handleSave = async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      const entry = {
        date,
        notes: notes.trim(),
        nextAppointment: nextAppointment || null,
        isTwin: isTwinPregnancy,
        gestationalWeek: currentWeek ? parseInt(currentWeek, 10) : null,
        gestationalAgeDays: currentWeek ? parseInt(currentWeek, 10) * 7 : null,
        babyA: {
          bpd: babyA.bpd ? parseFloat(babyA.bpd) : null,
          fl: babyA.fl ? parseFloat(babyA.fl) : null,
          ac: babyA.ac ? parseFloat(babyA.ac) : null,
          hc: babyA.hc ? parseFloat(babyA.hc) : null,
          crl: babyA.crl ? parseFloat(babyA.crl) : null,
          efw: babyA.efw ? parseFloat(babyA.efw) : null,
          fetalHeartRate: timThaiA ? parseFloat(timThaiA) : null,
        },
        babyB: {
          bpd: babyB.bpd ? parseFloat(babyB.bpd) : null,
          fl: babyB.fl ? parseFloat(babyB.fl) : null,
          ac: babyB.ac ? parseFloat(babyB.ac) : null,
          hc: babyB.hc ? parseFloat(babyB.hc) : null,
          crl: babyB.crl ? parseFloat(babyB.crl) : null,
          efw: babyB.efw ? parseFloat(babyB.efw) : null,
          fetalHeartRate: timThaiB ? parseFloat(timThaiB) : null,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'users', userId, 'pregnancyVisits'), entry);
      triggerToast('Đã lưu lịch sử khám thai');
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setNextAppointment('');
      setTimThaiA('');
      setTimThaiB('');
      setBabyA({ bpd: '', fl: '', ac: '', hc: '', crl: '', efw: '' });
      setBabyB({ bpd: '', fl: '', ac: '', hc: '', crl: '', efw: '' });
      setShowForm(false);
      loadCheckups();
    } catch (err) {
      triggerToast('Chưa thể lưu khám thai, mẹ thử lại sau nhé.');
    } finally {
      setSaving(false);
    }
  };

  const isFetusInputted = (babyObj, timThai) => {
    return Object.values(babyObj).some(v => v !== '') || timThai !== '';
  };

  const babyAName = fetuses[0]?.name || 'Bé A';
  const babyBName = fetuses[1]?.name || 'Bé B';

  // Filter local based on selector
  const filteredRecords = records.filter(r => {
    if (selectedSubject === 'all') return true;
    if (selectedSubject === 'baby-a') {
      return r.babyA && Object.values(r.babyA).some(v => v !== null);
    }
    if (selectedSubject === 'baby-b') {
      return r.babyB && Object.values(r.babyB).some(v => v !== null);
    }
    return true;
  });

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconMedical /></span>
          Lịch sử khám thai
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Thêm lần khám'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-group">
            <label className="form-label">Ngày khám</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{formatDate(date)}</span>
            </button>
          </div>

          {/* Section: Chỉ số siêu âm Thai Đôi Tab phụ */}
          <div className="ultrasound-section">
            <h3 className="section-subtitle">Chỉ số siêu âm</h3>
            <div className="ultrasound-tabs">
              <button 
                type="button" 
                className={`ultrasound-tab${activeFetusFormTab === 'baby-a' ? ' active' : ''}`}
                onClick={() => setActiveFetusFormTab('baby-a')}
              >
                {babyAName}
                {isFetusInputted(babyA, timThaiA) && <span className="tab-check-badge"><IconCheck /></span>}
              </button>
              <button 
                type="button" 
                className={`ultrasound-tab${activeFetusFormTab === 'baby-b' ? ' active' : ''}`}
                onClick={() => setActiveFetusFormTab('baby-b')}
              >
                {babyBName}
                {isFetusInputted(babyB, timThaiB) && <span className="tab-check-badge"><IconCheck /></span>}
              </button>
            </div>

            <div className="ultrasound-inputs-body">
              {activeFetusFormTab === 'baby-a' ? (
                <FetusMetricsForm 
                  metrics={babyA} 
                  setMetrics={setBabyA} 
                  timThai={timThaiA} 
                  setTimThai={setTimThaiA} 
                  babyName={babyAName}
                />
              ) : (
                <FetusMetricsForm 
                  metrics={babyB} 
                  setMetrics={setBabyB} 
                  timThai={timThaiB} 
                  setTimThai={setTimThaiB} 
                  babyName={babyBName}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú kết quả khám / Lời dặn</label>
            <textarea 
              rows={3} 
              className="ms-textarea" 
              placeholder="Lời dặn bác sĩ, cân nặng của mẹ..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ngày hẹn khám tiếp theo</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowNextDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{nextAppointment ? formatDate(nextAppointment) : 'Chọn ngày hẹn'}</span>
            </button>
          </div>

          <button className="primary-btn save" disabled={saving || !date} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu kết quả'}
          </button>

          {/* Portal DatePickers */}
          {showDatePicker && createPortal(
            <AppDatePicker
              value={date}
              onConfirm={(str) => { setDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}

          {showNextDatePicker && createPortal(
            <AppDatePicker
              value={nextAppointment || new Date().toISOString().split('T')[0]}
              onConfirm={(str) => { setNextAppointment(str); setShowNextDatePicker(false); }}
              onCancel={() => setShowNextDatePicker(false)}
              dateType="nextAppointmentDate"
            />,
            document.body
          )}
        </div>
      )}

      {/* Checkups List */}
      {filteredRecords.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><IconCalendar /></div>
          <h3 className="empty-title">Chưa có lịch sử khám thai</h3>
          <p className="empty-desc">Mẹ có thể lưu lại kết quả khám, chỉ số siêu âm và lời dặn của bác sĩ.</p>
        </div>
      ) : (
        <div className="records-list">
          {filteredRecords.map(r => (
            <PregnancyCheckupCard 
              key={r.id}
              record={r}
              babyAName={babyAName}
              babyBName={babyBName}
              selectedSubject={selectedSubject}
              isTwin={isTwinPregnancy}
              onDelete={() => onDeleteClick(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FetusMetricsForm({ metrics, setMetrics, timThai, setTimThai, babyName }) {
  const updateMetric = (key, val) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="fetus-metrics-form">
      <div className="metrics-form-grid">
        <div className="form-group">
          <label className="form-label-small">BPD (Đường kính lưỡng đỉnh - mm)</label>
          <input type="number" step="0.1" className="ms-input" placeholder="--" value={metrics.bpd} onChange={e => updateMetric('bpd', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">FL (Chiều dài xương đùi - mm)</label>
          <input type="number" step="0.1" className="ms-input" placeholder="--" value={metrics.fl} onChange={e => updateMetric('fl', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">AC (Chu vi bụng - mm)</label>
          <input type="number" step="0.1" className="ms-input" placeholder="--" value={metrics.ac} onChange={e => updateMetric('ac', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">HC (Chu vi đầu - mm)</label>
          <input type="number" step="0.1" className="ms-input" placeholder="--" value={metrics.hc} onChange={e => updateMetric('hc', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">CRL (Chiều dài đầu mông - mm)</label>
          <input type="number" step="0.1" className="ms-input" placeholder="--" value={metrics.crl} onChange={e => updateMetric('crl', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">EFW (Cân nặng ước tính - g)</label>
          <input type="number" step="1" className="ms-input" placeholder="--" value={metrics.efw} onChange={e => updateMetric('efw', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label-small">Tim thai (Lần/phút)</label>
          <input type="number" step="1" className="ms-input" placeholder="--" value={timThai} onChange={e => setTimThai(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function PregnancyCheckupCard({ record: r, babyAName, babyBName, selectedSubject, isTwin, onDelete }) {
  const diffEfw = useMemo(() => {
    if (r.babyA?.efw && r.babyB?.efw) {
      return Math.abs(r.babyA.efw - r.babyB.efw);
    }
    return null;
  }, [r]);

  const hasBabyAData = useMemo(() => {
    return r.babyA && Object.values(r.babyA).some(v => v !== null && v !== undefined && v !== '');
  }, [r.babyA]);

  const hasBabyBData = useMemo(() => {
    return r.babyB && Object.values(r.babyB).some(v => v !== null && v !== undefined && v !== '');
  }, [r.babyB]);

  const METRIC_LIST = [
    { key: 'efw', label: 'EFW (Cân nặng - g)' },
    { key: 'bpd', label: 'BPD (Lưỡng đỉnh - mm)' },
    { key: 'fl', label: 'FL (Xương đùi - mm)' },
    { key: 'ac', label: 'AC (Chu vi bụng - mm)' },
    { key: 'hc', label: 'HC (Chu vi đầu - mm)' },
    { key: 'crl', label: 'CRL (Chiều dài - mm)' },
    { key: 'fetalHeartRate', label: 'Tim thai (lần/phút)' }
  ];

  return (
    <div className="record-card">
      <div className="record-header">
        <div className="record-header-left">
          <div className="record-disease">
            Khám thai định kỳ{r.gestationalWeek ? ` · Tuần ${r.gestationalWeek}` : ''}
          </div>
          <div className="record-date">{formatDate(r.date)}</div>
        </div>
        <button type="button" className="delete-btn" onClick={onDelete} aria-label="Xóa">
          <IconTrash />
        </button>
      </div>

      {r.notes && <p className="record-card-notes">{r.notes}</p>}

      {/* So sánh hai bé phong cách Apple premium */}
      {isTwin && selectedSubject === 'all' && (
        hasBabyAData && hasBabyBData ? (
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Chỉ số</th>
                  <th>{babyAName}</th>
                  <th>{babyBName}</th>
                  <th>Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_LIST.map(m => {
                  const valA = r.babyA[m.key];
                  const valB = r.babyB[m.key];
                  if (valA === null && valB === null) return null;
                  const diff = (valA !== null && valB !== null) 
                    ? Math.abs(valA - valB).toFixed(m.key === 'efw' || m.key === 'fetalHeartRate' ? 0 : 1) 
                    : '-';
                  return (
                    <tr key={m.key}>
                      <td className="metric-lbl">{m.label}</td>
                      <td>{valA !== null && valA !== undefined ? valA : '—'}</td>
                      <td>{valB !== null && valB !== undefined ? valB : '—'}</td>
                      <td className="metric-diff">{diff !== '-' ? `${diff}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {diffEfw !== null && diffEfw > 0 && (
              <p className="comparison-hint">
                Cân nặng {babyAName} và {babyBName} chênh lệch khoảng {diffEfw}g. Mẹ duy trì dinh dưỡng đều đặn nhé 🌿
              </p>
            )}
          </div>
        ) : (
          <div className="record-tag-badge" style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(0,0,0,0.03)', color: '#666', borderRadius: '8px', display: 'inline-block' }}>
            Dữ liệu cũ · Chưa phân bé
          </div>
        )
      )}

      {isTwin && selectedSubject === 'baby-a' && (
        hasBabyAData ? (
          <div className="comparison-table-wrapper">
            <table className="singleton-metrics-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Chỉ số</th>
                  <th style={{ textAlign: 'right' }}>{babyAName}</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_LIST.map(m => {
                  const val = r.babyA[m.key];
                  if (val === null || val === undefined || val === '') return null;
                  return (
                    <tr key={m.key}>
                      <td className="sm-label" style={{ textAlign: 'left' }}>{m.label}</td>
                      <td className="sm-val" style={{ textAlign: 'right', fontWeight: 'bold' }}>{val}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="record-tag-badge" style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(0,0,0,0.03)', color: '#666', borderRadius: '8px', display: 'inline-block' }}>
            Dữ liệu cũ · Chưa phân bé
          </div>
        )
      )}

      {isTwin && selectedSubject === 'baby-b' && (
        hasBabyBData ? (
          <div className="comparison-table-wrapper">
            <table className="singleton-metrics-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Chỉ số</th>
                  <th style={{ textAlign: 'right' }}>{babyBName}</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_LIST.map(m => {
                  const val = r.babyB[m.key];
                  if (val === null || val === undefined || val === '') return null;
                  return (
                    <tr key={m.key}>
                      <td className="sm-label" style={{ textAlign: 'left' }}>{m.label}</td>
                      <td className="sm-val" style={{ textAlign: 'right', fontWeight: 'bold' }}>{val}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="record-tag-badge" style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(0,0,0,0.03)', color: '#666', borderRadius: '8px', display: 'inline-block' }}>
            Dữ liệu cũ · Chưa phân bé
          </div>
        )
      )}

      {r.nextAppointment && (
        <div className="record-row next-visit">
          <span>📅 Hẹn khám tiếp theo:</span>
          <strong>{formatDate(r.nextAppointment)}</strong>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 3: DINH DƯỠNG MẸ (PREGNANT)
   ════════════════════════════════════════ */
function PregnancyNutritionTab({ userId, selectedSubject, onDeleteClick, triggerToast }) {
  const [foods, setFoods]                   = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form states
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [water, setWater]                   = useState('');
  const [vitamin, setVitamin]               = useState('');
  const [meals, setMeals]                   = useState('');

  const loadNutrition = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'users', userId, 'pregnancyNutrition'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setFoods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  }, [userId]);

  useEffect(() => {
    loadNutrition();
    window.addEventListener('profile-data-changed', loadNutrition);
    return () => window.removeEventListener('profile-data-changed', loadNutrition);
  }, [loadNutrition]);

  const handleSave = async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      const entry = {
        date,
        water: water ? parseInt(water) : 0,
        vitamin: vitamin.trim(),
        meals: meals.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'pregnancyNutrition'), entry);
      triggerToast('Đã lưu nhật ký dinh dưỡng');
      setDate(new Date().toISOString().split('T')[0]);
      setWater('');
      setVitamin('');
      setMeals('');
      setShowForm(false);
      loadNutrition();
    } catch {
      triggerToast('Chưa lưu được, mẹ thử lại sau nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconApple /></span>
          Dinh dưỡng mẹ bầu
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Ghi nhận dinh dưỡng'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-group">
            <label className="form-label">Ngày ghi nhận</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{formatDate(date)}</span>
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Nước uống trong ngày (ml)</label>
            <input type="number" className="ms-input" placeholder="Ví dụ: 2000" value={water} onChange={e => setWater(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Lịch uống vi chất / Vitamin</label>
            <input className="ms-input" placeholder="Ví dụ: Sắt lúc 8h, Canxi lúc 12h..." value={vitamin} onChange={e => setVitamin(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Ghi nhận thức ăn</label>
            <textarea rows={3} className="ms-textarea" placeholder="Mẹ hôm nay ăn những món gì..." value={meals} onChange={e => setMeals(e.target.value)} />
          </div>

          <p className="medical-note-hint">
            Mẹ dùng thuốc/vitamin theo hướng dẫn của bác sĩ nhé 🌿
          </p>

          <button className="primary-btn save" disabled={saving || !date} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu ghi chép'}
          </button>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={date}
              onConfirm={(str) => { setDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}
        </div>
      )}

      {foods.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><IconApple /></div>
          <h3 className="empty-title">Chưa có ghi chép dinh dưỡng</h3>
          <p className="empty-desc">Ghi lại lịch uống vitamin, lượng nước và các món mẹ bầu bồi bổ hàng ngày.</p>
        </div>
      ) : (
        <div className="foods-grid">
          {foods.map(f => (
            <div key={f.id} className="food-card">
              <div className="food-header">
                <span className="food-name">🍴 Ngày {formatDate(f.date)}</span>
                <button type="button" className="delete-btn" onClick={() => onDeleteClick(f.id)}>
                  <IconTrash />
                </button>
              </div>
              {f.water > 0 && <div className="food-recipe">💧 Nước uống: {f.water} ml</div>}
              {f.vitamin && <div className="food-recipe">💊 Vi chất: {f.vitamin}</div>}
              {f.meals && <div className="food-note">💡 Ăn uống: {f.meals}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 4: THAI GIÁO MONTESSORI (PREGNANT)
   ════════════════════════════════════════ */
function getPregnancySuggestions(week, isTwin, babyAName, babyBName, selectedSubject) {
  const isSelectedA = selectedSubject === 'baby-a';
  const isSelectedB = selectedSubject === 'baby-b';
  
  const nameA = babyAName;
  const nameB = babyBName;
  
  let targetNames = isTwin ? `${nameA} và ${nameB}` : nameA;
  if (isSelectedA) targetNames = nameA;
  if (isSelectedB) targetNames = nameB;

  if (week <= 12) {
    return [
      { id: 'music', title: 'Nghe nhạc nhẹ 5–10 phút', desc: 'Chọn bản nhạc cổ điển hoặc không lời êm dịu, giúp mẹ bầu thư giãn tinh thần.' },
      { id: 'letter_1', title: `Viết lời nhắn đầu tiên cho ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames}`, desc: `Ghi lại những cảm xúc bỡ ngỡ và niềm hạnh phúc đầu tiên khi biết tin đón chào ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames}.` },
      { id: 'rest', title: 'Nghỉ ngơi và hít thở sâu', desc: 'Mẹ dành 10 phút tĩnh lặng hít thở sâu để giảm căng thẳng và làm dịu các cơn ốm nghén đầu thai kỳ.' },
      { id: 'diet', title: 'Dinh dưỡng nhẹ nhàng', desc: 'Bổ sung axit folic và vitamin bầu đầy đủ theo chỉ định bác sĩ.' }
    ];
  }
  if (week <= 27) {
    return [
      { id: 'talk', title: `Trò chuyện với ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} 5 phút`, desc: `Đặt tay lên bụng, nói lời yêu thương hoặc kể những chuyện vui hàng ngày để ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} làm quen với giọng nói trầm ấm của ba mẹ.` },
      { id: 'touch', title: 'Chạm nhẹ và thở chậm', desc: `Chạm tay vuốt nhẹ nhàng trên bụng theo nhịp thở sâu, chậm rãi giúp mẹ thư giãn và ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} cảm nhận nhịp yêu thương.` },
      { id: 'movement', title: `Ghi lại cảm nhận thai máy`, desc: `Dành 10 phút yên tĩnh nằm nghiêng trái để tập trung cảm nhận những cú máy, đạp nhẹ đầu tiên của ${isTwin && !isSelectedA && !isSelectedB ? 'các bé' : targetNames}.` },
      { id: 'music_mid', title: 'Nghe nhạc thai giáo', desc: 'Lựa chọn âm thanh thiên nhiên hoặc nhạc không lời êm dịu để kích thích thính giác phát triển.' }
    ];
  }
  if (week <= 34) {
    return [
      { id: 'story', title: `Đọc truyện ngắn cho ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} nghe`, desc: `Đọc những câu chuyện cổ tích hoặc ngụ ngôn có giọng điệu tươi vui, ấm áp cho ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} nghe trước khi đi ngủ.` },
      { id: 'count_kick', title: `Đếm cử động thai của ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames}`, desc: 'Mẹ chọn thời điểm bé hoạt động nhiều nhất trong ngày để đếm và theo dõi thai máy định kỳ.' },
      { id: 'letter_late', title: `Lời nhắn ngày gặp ${isTwin && !isSelectedA && !isSelectedB ? 'các bé' : targetNames}`, desc: `Viết những dòng nhật ký gửi ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames}, chia sẻ sự chuẩn bị và mong chờ ngày được ôm bé vào lòng.` },
      { id: 'stretch', title: 'Vận động nhẹ nhàng', desc: 'Thực hiện các động tác yoga bầu nhẹ nhàng giúp lưu thông khí huyết và giảm đau mỏi lưng.' }
    ];
  }
  // week >= 35
  return [
    { id: 'relax', title: 'Nghỉ ngơi tĩnh tâm', desc: 'Mẹ giữ tinh thần thoải mái, ngâm chân nước ấm hoặc mát-xa nhẹ nhàng chuẩn bị cho hành trình vượt cạn.' },
    { id: 'blessing', title: `Lời chúc bình an gửi ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames}`, desc: `Thầm thì những lời chúc tốt lành, mong ${isTwin && !isSelectedA && !isSelectedB ? 'hai bé' : targetNames} phát triển khoẻ mạnh và chào đời bình an.` },
    { id: 'prep', title: 'Chuẩn bị giỏ đồ đi sinh', desc: 'Rà soát lại lần cuối danh sách quần áo, tã giấy và giấy tờ cần thiết để sẵn sàng đón bé.' },
    { id: 'breath', title: 'Tập thở chuẩn bị sinh', desc: 'Thực hành các bài tập thở giúp mẹ bầu kiểm soát cơn gò và giữ sức tốt trong phòng sinh.' }
  ];
}

function PregnancyEducationTab({ userId, currentWeek, activeFetusNames, triggerToast, selectedSubject, fetuses, isTwinPregnancy }) {
  const [completedList, setCompletedList] = useState([]);
  const [loading, setLoading]             = useState(false);

  const babyAName = useMemo(() => fetuses[0]?.name || "Bé A", [fetuses]);
  const babyBName = useMemo(() => fetuses[1]?.name || "Bé B", [fetuses]);
  const isTwins = isTwinPregnancy;

  const suggestions = useMemo(() => {
    return getPregnancySuggestions(parseInt(currentWeek, 10) || 0, isTwins, babyAName, babyBName, selectedSubject);
  }, [currentWeek, isTwins, babyAName, babyBName, selectedSubject]);

  const loadCompleted = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, 'users', userId, 'pregnancyEducation'),
        where('week', '==', String(currentWeek))
      );
      const snap = await getDocs(q);
      setCompletedList(snap.docs.map(d => d.data().activityId));
    } catch {}
  }, [userId, currentWeek]);

  useEffect(() => { loadCompleted(); }, [loadCompleted]);

  const handleToggleComplete = async (activityId, title) => {
    if (!userId || loading) return;
    setLoading(true);
    try {
      const isDone = completedList.includes(activityId);
      if (isDone) {
        // Undo complete
        const q = query(
          collection(db, 'users', userId, 'pregnancyEducation'),
          where('activityId', '==', activityId),
          where('week', '==', String(currentWeek))
        );
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, 'users', userId, 'pregnancyEducation', docItem.id));
        }
        setCompletedList(prev => prev.filter(id => id !== activityId));
        triggerToast(`Đã bỏ tích hoàn thành`);
      } else {
        // Complete
        await addDoc(collection(db, 'users', userId, 'pregnancyEducation'), {
          activityId,
          title,
          week: String(currentWeek),
          completedAt: serverTimestamp(),
        });
        setCompletedList(prev => [...prev, activityId]);
        triggerToast(`Chúc mừng mẹ đã hoàn thành thai giáo! 🎉`);
      }
    } catch {
      triggerToast('Chưa cập nhật được thai giáo, mẹ thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  const resolvedFetusNames = useMemo(() => {
    if (isTwins) {
      if (selectedSubject === 'baby-a') return babyAName;
      if (selectedSubject === 'baby-b') return babyBName;
      return `${babyAName} và ${babyBName}`;
    }
    return activeFetusNames;
  }, [isTwins, selectedSubject, babyAName, babyBName, activeFetusNames]);

  return (
    <div className="tab-content fade-in">
      <div className="tab-header-col">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconLeaf /></span>
          Thai giáo Montessori
        </h2>
        <p className="tab-sub">
          {currentWeek ? `Gợi ý hoạt động kết nối với ${resolvedFetusNames} tuần thai ${currentWeek}` : `Gợi ý hoạt động kết nối với ${resolvedFetusNames}`}
        </p>
      </div>

      <div className="play-grid">
        {suggestions.map(s => {
          const isCompleted = completedList.includes(s.id);
          return (
            <div key={s.id} className={`play-card${isCompleted ? ' completed' : ''}`}>
              <button 
                type="button" 
                className={`play-complete-checkbox${isCompleted ? ' checked' : ''}`}
                onClick={() => handleToggleComplete(s.id, s.title)}
              >
                {isCompleted && <IconCheck />}
              </button>
              <div className="play-info">
                <div className="play-name">{s.title}</div>
                <div className="play-desc">{s.desc}</div>
                {isCompleted && (
                  <span className="thai-giao-completed-tag">
                    <span className="check-icon"><IconCheck /></span>
                    Đã hoàn thành hôm nay
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 5: GHI CHÚ THAI KỲ (PREGNANT)
   ════════════════════════════════════════ */
function PregnancyNotesTab({ 
  userId, selectedSubject, subjectOptions, needsSubjectSelector, onDeleteClick, triggerToast 
}) {
  const [notes, setNotes]                   = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form states
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [subjectId, setSubjectId]           = useState('all');
  const [content, setContent]               = useState('');
  const [title, setTitle]                   = useState('');

  const loadNotes = useCallback(async () => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'users', userId, 'pregnancyNotes'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [userId]);

  useEffect(() => {
    loadNotes();
    window.addEventListener('profile-data-changed', loadNotes);
    return () => window.removeEventListener('profile-data-changed', loadNotes);
  }, [loadNotes]);

  const handleSave = async () => {
    if (!date || !content.trim() || saving) return;
    setSaving(true);
    try {
      const entry = {
        date,
        subjectId,
        title: title.trim() || 'Ghi chép thai kỳ',
        content: content.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'pregnancyNotes'), entry);
      triggerToast('Đã lưu ghi chép');
      setDate(new Date().toISOString().split('T')[0]);
      setSubjectId('all');
      setTitle('');
      setContent('');
      setShowForm(false);
      loadNotes();
    } catch {
      triggerToast('Chưa lưu được, mẹ thử lại sau nhé.');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    if (selectedSubject === 'all') return true;
    return n.subjectId === 'all' || n.subjectId === selectedSubject;
  });

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconNote /></span>
          Ghi chú thai kỳ
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Thêm ghi chú'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-group">
            <label className="form-label">Ngày ghi nhận</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{formatDate(date)}</span>
            </button>
          </div>

          {needsSubjectSelector && (
            <div className="form-group">
              <label className="form-label">Ghi chép này dành cho ai?</label>
              <div className="ms-chip-group">
                {subjectOptions.map(opt => (
                  <button 
                    key={opt.id} 
                    type="button" 
                    className={`ms-chip${subjectId === opt.id ? ' active' : ''}`}
                    onClick={() => setSubjectId(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tiêu đề ghi chú</label>
            <input className="ms-input" placeholder="Ví dụ: Bác sĩ dặn dò ăn uống, Chuẩn bị giỏ đồ đi sinh..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Nội dung ghi chép</label>
            <textarea rows={4} className="ms-textarea" placeholder="Nhập ghi chép chi tiết của mẹ..." value={content} onChange={e => setContent(e.target.value)} />
          </div>

          <button className="primary-btn save" disabled={saving || !date || !content.trim()} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu ghi chú'}
          </button>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={date}
              onConfirm={(str) => { setDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}
        </div>
      )}

      {filteredNotes.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><IconNote /></div>
          <h3 className="empty-title">Chưa có ghi chú thai kỳ</h3>
          <p className="empty-desc">Mẹ có thể lưu trữ lời dặn bác sĩ, cảm xúc cá nhân hoặc công tác chuẩn bị giỏ đồ đi sinh.</p>
        </div>
      ) : (
        <div className="records-list">
          {filteredNotes.map(n => {
            const subLabel = subjectOptions.find(o => o.id === n.subjectId)?.label;
            return (
              <div key={n.id} className="record-card">
                <div className="record-header">
                  <div className="record-header-left">
                    <div className="record-disease">{n.title}</div>
                    <div className="record-date">
                      {formatDate(n.date)}
                      {subLabel && <span className="record-tag-badge">{subLabel}</span>}
                    </div>
                  </div>
                  <button type="button" className="delete-btn" onClick={() => onDeleteClick(n.id)} aria-label="Xóa">
                    <IconTrash />
                  </button>
                </div>
                <p className="record-card-notes plain">{n.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 6: SỨC KHỎE BÉ (PARENT)
   ════════════════════════════════════════ */
/* ════════════════════════════════════════
   TAB 6: SỨC KHỎE BÉ (PARENT)
   ════════════════════════════════════════ */
function ParentHealthTab({ userId, selectedBabyIndex, babies, onDeleteClick, triggerToast, onSwitchTab }) {
  const [records, setRecords]               = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form states
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [disease, setDisease]               = useState('');
  const [medicine, setMedicine]             = useState('');
  const [dosage, setDosage]                 = useState('');
  const [duration, setDuration]             = useState('');
  const [symptoms, setSymptoms]             = useState('');
  const [recovery, setRecovery]             = useState('');

  const activeBaby = babies[selectedBabyIndex] || {};
  const activeBabyId = activeBaby.id || 'baby';
  const babyName = activeBaby.name || 'bé';
  const ageMonths = activeBaby.dob ? getAgeInMonths(activeBaby.dob) : 99;

  const loadHealthRecords = useCallback(async () => {
    if (!userId || !activeBabyId) return;
    try {
      const q = query(
        collection(db, 'users', userId, 'babies', activeBabyId, 'medicalRecords'),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [userId, activeBabyId]);

  useEffect(() => {
    loadHealthRecords();
    window.addEventListener('profile-data-changed', loadHealthRecords);
    return () => window.removeEventListener('profile-data-changed', loadHealthRecords);
  }, [loadHealthRecords]);

  const handleSave = async () => {
    if (!date || !disease.trim() || saving) return;
    setSaving(true);
    try {
      const entry = {
        date,
        disease: disease.trim(),
        medicine: medicine.trim(),
        dosage: dosage.trim(),
        duration: duration.trim(),
        symptoms: symptoms.trim(),
        recovery,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'babies', activeBabyId, 'medicalRecords'), entry);
      triggerToast('Đã lưu lịch sử sức khỏe');
      setDate(new Date().toISOString().split('T')[0]);
      setDisease('');
      setMedicine('');
      setDosage('');
      setDuration('');
      setSymptoms('');
      setRecovery('');
      setShowForm(false);
      loadHealthRecords();
    } catch {
      triggerToast('Chưa lưu được sức khỏe, mẹ thử lại nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconHealth /></span>
          Sức khỏe của {babyName}
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Ghi nhận sức khỏe'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">📅 Ngày khám</label>
              <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
                <span className="cs-date-icon"><IconCalendar /></span>
                <span className="cs-date-text">{formatDate(date)}</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">🦠 Vấn đề sức khỏe / Tên bệnh</label>
              <input className="ms-input" placeholder="Sốt, ho, mẩn ngứa..." value={disease} onChange={e => setDisease(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">💊 Tên thuốc</label>
              <input className="ms-input" placeholder="Paracetamol, siro ho..." value={medicine} onChange={e => setMedicine(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">📏 Liều dùng</label>
              <input className="ms-input" placeholder="2.5ml x 2 lần/ngày..." value={dosage} onChange={e => setDosage(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">⏱️ Thời gian điều trị</label>
              <input className="ms-input" placeholder="3 ngày, 1 tuần..." value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">🌡️ Mức độ phục hồi</label>
              <select className="ms-select" value={recovery} onChange={e => setRecovery(e.target.value)}>
                <option value="">Chọn...</option>
                <option value="Đã khỏi hoàn toàn">Đã khỏi hoàn toàn</option>
                <option value="Đang theo dõi">Đang theo dõi</option>
                <option value="Chưa khỏi">Chưa khỏi</option>
              </select>
            </div>
          </div>
          <div className="form-group full-width">
            <label className="form-label">📝 Triệu chứng chi tiết</label>
            <textarea rows={2} className="ms-textarea" placeholder="Mô tả triệu chứng..." value={symptoms} onChange={e => setSymptoms(e.target.value)} />
          </div>

          <p className="medical-note-hint">
            Mẹ lưu ý dùng thuốc cho bé theo đúng hướng dẫn của bác sĩ chuyên khoa nhé 🌿
          </p>

          <button className="primary-btn save" disabled={saving || !date || !disease.trim()} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu sức khỏe'}
          </button>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={date}
              onConfirm={(str) => { setDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}
        </div>
      )}

      {!showForm && (
        <QuickProfileSummary
          userId={userId}
          activeBabyId={activeBabyId}
          babyName={babyName}
          ageMonths={ageMonths}
          latestRecord={records[0] || null}
          onAddHealth={() => setShowForm(true)}
          triggerToast={triggerToast}
          onSwitchTab={onSwitchTab}
        />
      )}

      <HealthRecordsHistory
        records={records}
        onDeleteClick={onDeleteClick}
        onAddHealth={() => setShowForm(true)}
      />
    </div>
  );
}

/* ─── Hồ sơ nhanh SVG Icons ─── */
const IconHealth = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l1.5-3 2 6 1.5-3H21" />
  </svg>
);
const IconNotesSummary = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" />
    <path d="M2 6h4" />
    <path d="M2 10h4" />
    <path d="M2 14h4" />
    <path d="M2 18h4" />
    <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
  </svg>
);
const IconHeartOutline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconToilet = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="6" r="2" />
    <path d="M9 12h6l-1 7H10Z" />
    <path d="M7 12c0-2 2-4 5-4s5 2 5 4" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
);
const IconPlayBranch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
    <path d="M14.1 6a7 7 0 0 1 1.4 4.3c0 .87-.11 1.72-.33 2.53C14 12 13 11.5 11.7 10.7" />
  </svg>
);
const IconClockHistory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function QuickProfileSummary({ userId, activeBabyId, babyName, ageMonths, latestRecord, onAddHealth, triggerToast, onSwitchTab }) {
  const [latestNote, setLatestNote] = useState(null);
  const [likedFoods, setLikedFoods] = useState([]);
  const [dislikedFoods, setDislikedFoods] = useState([]);
  const [latestToilet, setLatestToilet] = useState(null);
  const [latestFeed, setLatestFeed] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Toilet form states
  const [showToiletForm, setShowToiletForm] = useState(false);
  const [savingToilet, setSavingToilet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toiletDate, setToiletDate] = useState(new Date().toISOString().split('T')[0]);
  const [toiletType, setToiletType] = useState('both'); // 'pee' | 'poo' | 'both'
  const [toiletSuccess, setToiletSuccess] = useState(true);
  const [toiletNotes, setToiletNotes] = useState('');

  useEffect(() => {
    if (!userId || !activeBabyId) return;
    setIsLoaded(false);
  }, [userId, activeBabyId]);

  useEffect(() => {
    if (!userId || !activeBabyId || isLoaded) return;
    (async () => {
      try {
        const [notesSnap, foodsSnap, toiletSnap, feedingSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', userId, 'babies', activeBabyId, 'notes'), orderBy('date', 'desc'))),
          getDocs(query(collection(db, 'users', userId, 'babies', activeBabyId, 'foods'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users', userId, 'babies', activeBabyId, 'toiletLogs'), orderBy('date', 'desc'))),
          ageMonths < 6 ? getDocs(query(collection(db, 'users', userId, 'babies', activeBabyId, 'feedingLogs'), orderBy('date', 'desc'))) : Promise.resolve({ docs: [] })
        ]);

        const notesList = notesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLatestNote(notesList[0] || null);

        const foodsList = foodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLikedFoods(foodsList.filter(f => !f.disliked).slice(0, 3));
        setDislikedFoods(foodsList.filter(f => f.disliked).slice(0, 3));

        const toiletList = toiletSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLatestToilet(toiletList[0] || null);

        const feedingList = feedingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLatestFeed(feedingList[0] || null);
      } catch (err) {
        console.error("Error loading QuickProfileSummary data:", err);
      }
      setIsLoaded(true);
    })();
  }, [userId, activeBabyId, isLoaded, ageMonths]);

  const handleSaveToilet = async () => {
    if (!toiletDate || savingToilet) return;
    setSavingToilet(true);
    try {
      const entry = {
        date: toiletDate,
        type: toiletType,
        success: toiletSuccess,
        notes: toiletNotes.trim(),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'users', userId, 'babies', activeBabyId, 'toiletLogs'), entry);
      triggerToast('Đã lưu ghi nhận vệ sinh');
      setLatestToilet({ date: toiletDate, type: toiletType, success: toiletSuccess, notes: toiletNotes.trim() });
      setShowToiletForm(false);
      setToiletNotes('');
    } catch {
      triggerToast('Chưa lưu được, mẹ thử lại nhé.');
    } finally {
      setSavingToilet(false);
    }
  };

  const toiletTypeMap = { pee: 'Tiểu', poo: 'Đại tiện', both: 'Cả hai' };

  const getMontessoriSuggestions = (months) => {
    if (months < 12) {
      return [
        { label: "Khám phá hộp cảm giác", desc: "Bé khám phá qua xúc giác" },
        { label: "Nghe nhạc và vỗ tay", desc: "Phát triển thính giác & nhịp điệu" }
      ];
    } else if (months < 18) {
      return [
        { label: "Cầm thìa tự xúc ăn", desc: "Luyện vận động tinh & tự lập" },
        { label: "Bỏ vật vào hộp", desc: "Phối hợp mắt tay" }
      ];
    } else if (months < 24) {
      return [
        { label: "Rót hạt khô", desc: "Tập trung và kiểm soát tay" },
        { label: "Phân loại màu sắc", desc: "Nhận thức hình-màu" }
      ];
    } else if (months < 36) {
      return [
        { label: "Tháo lắp núm vặn", desc: "Vận động tinh và tư duy không gian" },
        { label: "Xếp hình đơn giản", desc: "Logic và kiên nhẫn" }
      ];
    } else {
      return [
        { label: "Cắt dán an toàn", desc: "Sáng tạo và vận động tinh" },
        { label: "Đong đo với nước", desc: "Toán học cụ thể" }
      ];
    }
  };

  const activities = getMontessoriSuggestions(ageMonths);

  return (
    <div className="qps-container">
      <div className="qps-section-title">Hồ sơ nhanh</div>
      <div className="qps-grid">
        {/* Card 1: Sức khỏe */}
        <div className="qps-card" onClick={onAddHealth} style={{ cursor: 'pointer' }}>
          <div className="qps-card-top">
            <div className="qps-icon-wrap qps-icon-health"><IconHealth /></div>
            <span className="qps-card-label">Sức khỏe</span>
          </div>
          <div className="qps-card-body">
            {latestRecord ? (
              <>
                <div className="qps-card-main">{latestRecord.disease}</div>
                <div className="qps-card-sub">
                  {formatDate(latestRecord.date)}
                  {latestRecord.recovery ? ` · ${latestRecord.recovery}` : ''}
                </div>
              </>
            ) : (
              <div className="qps-card-empty">Chưa có ghi nhận nào</div>
            )}
          </div>
          <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onAddHealth(); }}>
            {latestRecord ? 'Xem thêm' : '+ Ghi nhận'}
          </button>
        </div>

        {/* Card 2: Ghi chú */}
        <div className="qps-card" onClick={() => onSwitchTab?.('note')} style={{ cursor: 'pointer' }}>
          <div className="qps-card-top">
            <div className="qps-icon-wrap qps-icon-note"><IconNotesSummary /></div>
            <span className="qps-card-label">Ghi chú</span>
          </div>
          <div className="qps-card-body">
            {latestNote ? (
              <>
                {latestNote.title && <div className="qps-card-main">{latestNote.title}</div>}
                <div className="qps-card-sub qps-clamp">{latestNote.content || latestNote.note || ''}</div>
              </>
            ) : (
              <div className="qps-card-empty">Những điều nhỏ cần nhớ khi chăm bé</div>
            )}
          </div>
          <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('note'); }}>
            {latestNote ? 'Xem thêm' : '+ Thêm ghi chú'}
          </button>
        </div>

        {/* Card 3: Ăn uống (<6m) or Món yêu thích (>=6m) */}
        {ageMonths < 6 ? (
          <div className="qps-card" onClick={() => onSwitchTab?.('food')} style={{ cursor: 'pointer' }}>
            <div className="qps-card-top">
              <div className="qps-icon-wrap qps-icon-food"><IconHeartOutline /></div>
              <span className="qps-card-label">Ăn uống</span>
            </div>
            <div className="qps-card-body">
              {latestFeed ? (
                <>
                  <div className="qps-card-main">
                    {latestFeed.feedType === 'breast' ? 'Bú mẹ' : latestFeed.feedType === 'bottle' ? 'Bú bình' : 'Ăn uống'}
                  </div>
                  <div className="qps-card-sub">
                    {latestFeed.durationMin ? `${latestFeed.durationMin} phút` : ''}
                    {latestFeed.amountMl ? ` · ${latestFeed.amountMl}ml` : ''}
                  </div>
                </>
              ) : (
                <div className="qps-card-empty">Chưa có ghi nhận cữ bú</div>
              )}
            </div>
            <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('food'); }}>
              {latestFeed ? 'Xem thêm' : '+ Ghi nhận'}
            </button>
          </div>
        ) : (
          <div className="qps-card" onClick={() => onSwitchTab?.('food')} style={{ cursor: 'pointer' }}>
            <div className="qps-card-top">
              <div className="qps-icon-wrap qps-icon-food"><IconHeartOutline /></div>
              <span className="qps-card-label">Món yêu thích</span>
            </div>
            <div className="qps-card-body">
              {likedFoods.length > 0 ? (
                <div className="qps-chip-row">
                  {likedFoods.map(f => <span key={f.id} className="qps-food-chip">{f.name}</span>)}
                </div>
              ) : (
                <div className="qps-card-empty">Món bé ăn ngon, hợp tác tốt</div>
              )}
            </div>
            <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('food'); }}>
              {likedFoods.length > 0 ? 'Xem thêm' : '+ Thêm món'}
            </button>
          </div>
        )}

        {/* Card 4: Lịch sử cữ sữa (<6m) or Món cần theo dõi (>=6m) */}
        {ageMonths < 6 ? (
          <div className="qps-card" onClick={() => onSwitchTab?.('food')} style={{ cursor: 'pointer' }}>
            <div className="qps-card-top">
              <div className="qps-icon-wrap qps-icon-alert"><IconEye /></div>
              <span className="qps-card-label">Cữ sữa gần nhất</span>
            </div>
            <div className="qps-card-body">
              {latestFeed ? (
                <>
                  <div className="qps-card-main">{formatDate(latestFeed.date)}</div>
                  <div className="qps-card-sub qps-clamp">{latestFeed.notes || 'Bé bú bình thường'}</div>
                </>
              ) : (
                <div className="qps-card-empty">Chăm sóc dinh dưỡng cho bé sơ sinh</div>
              )}
            </div>
            <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('food'); }}>
              {latestFeed ? 'Xem thêm' : '+ Ghi nhận'}
            </button>
          </div>
        ) : (
          <div className="qps-card" onClick={() => onSwitchTab?.('food')} style={{ cursor: 'pointer' }}>
            <div className="qps-card-top">
              <div className="qps-icon-wrap qps-icon-alert"><IconEye /></div>
              <span className="qps-card-label">Món cần theo dõi</span>
            </div>
            <div className="qps-card-body">
              {dislikedFoods.length > 0 ? (
                <div className="qps-chip-row">
                  {dislikedFoods.map(f => <span key={f.id} className="qps-food-chip qps-chip-watch">{f.name}</span>)}
                </div>
              ) : (
                <div className="qps-card-empty">Chưa có món cần theo dõi</div>
              )}
            </div>
            <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('food'); }}>
              {dislikedFoods.length > 0 ? 'Xem thêm' : '+ Ghi chú'}
            </button>
          </div>
        )}
      </div>

      {/* Wide Card 1: Toilet Training (18-36m) */}
      {ageMonths >= 18 && ageMonths < 36 && (
        <div 
          className="qps-card qps-card-wide"
          onClick={() => {
            if (!showToiletForm) {
              setShowToiletForm(true);
            }
          }}
          style={{ cursor: showToiletForm ? 'default' : 'pointer' }}
        >
          <div className="qps-wide-header">
            <div className="qps-wide-left">
              <div className="qps-icon-wrap qps-icon-toilet"><IconToilet /></div>
              <div>
                <div className="qps-card-label">Vệ sinh / Tập bô</div>
                {latestToilet ? (
                  <div className="qps-card-sub">
                    {toiletTypeMap[latestToilet.type] || 'Ngồi bô'} · {formatDate(latestToilet.date)}
                    {latestToilet.success === false ? ' · Chưa thành công' : ' · Thành công'}
                  </div>
                ) : (
                  <div className="qps-card-empty">Chưa có ghi nhận</div>
                )}
              </div>
            </div>
            <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); setShowToiletForm(f => !f); }}>
              {showToiletForm ? '✕ Đóng' : '+ Ghi nhận'}
            </button>
          </div>

          {showToiletForm && (
            <div className="qps-toilet-form scale-in">
              <div className="form-group">
                <label className="form-label">Ngày</label>
                <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
                  <span className="cs-date-icon"><IconCalendar /></span>
                  <span className="cs-date-text">{formatDate(toiletDate)}</span>
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Loại</label>
                <div className="ms-chip-group">
                  {[
                    { id: 'pee', label: 'Tiểu' },
                    { id: 'poo', label: 'Đại tiện' },
                    { id: 'both', label: 'Cả hai' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`ms-chip${toiletType === t.id ? ' active' : ''}`}
                      onClick={() => setToiletType(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Kết quả</label>
                <div className="ms-chip-group">
                  <button
                    type="button"
                    className={`ms-chip${toiletSuccess ? ' active' : ''}`}
                    onClick={() => setToiletSuccess(true)}
                  >
                    Thành công
                  </button>
                  <button
                    type="button"
                    className={`ms-chip${!toiletSuccess ? ' active' : ''}`}
                    onClick={() => setToiletSuccess(false)}
                  >
                    Chưa thành công
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <input
                  className="ms-input"
                  placeholder="Bé ngồi bô tự giác, mẹ nhắc..."
                  value={toiletNotes}
                  onChange={e => setToiletNotes(e.target.value)}
                />
              </div>

              <button className="primary-btn save" disabled={savingToilet} onClick={handleSaveToilet}>
                {savingToilet ? 'Đang lưu...' : 'Lưu ghi nhận'}
              </button>

              {showDatePicker && createPortal(
                <AppDatePicker
                  value={toiletDate}
                  onConfirm={str => { setToiletDate(str); setShowDatePicker(false); }}
                  onCancel={() => setShowDatePicker(false)}
                  dateType="visitDate"
                  disableFuture={true}
                />,
                document.body
              )}
            </div>
          )}
        </div>
      )}

      {/* Wide Card 2: Montessori Activities */}
      <div 
        className="qps-card qps-card-wide qps-montessori-card"
        onClick={() => onSwitchTab?.('play')}
        style={{ cursor: 'pointer' }}
      >
        <div className="qps-wide-header">
          <div className="qps-wide-left">
            <div className="qps-icon-wrap qps-icon-play"><IconPlayBranch /></div>
            <div>
              <div className="qps-card-label">Hoạt động Montessori</div>
              <div className="qps-montessori-age">Gợi ý cho bé {ageMonths} tháng tuổi</div>
            </div>
          </div>
          <button className="qps-pill-btn" onClick={(e) => { e.stopPropagation(); onSwitchTab?.('play'); }}>
            Xem thêm
          </button>
        </div>

        <div className="qps-activity-grid">
          {activities.map((act, index) => (
            <div key={index} className="qps-activity-chip">
              <div className="qps-activity-dot" />
              <div>
                <div className="qps-activity-name">{act.label}</div>
                <div className="qps-activity-desc">{act.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthRecordsHistory({ records, onDeleteClick, onAddHealth }) {
  const [showAll, setShowAll] = useState(false);
  const displayedRecords = showAll ? records : records.slice(0, 3);

  return (
    <div className="hhs-container">
      <div className="hhs-heading">
        <span>Lịch sử sức khỏe</span>
        {records.length > 3 && !showAll && (
          <button className="qps-pill-btn" onClick={() => setShowAll(true)}>
            Xem tất cả ({records.length})
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="hhs-empty-card">
          <div className="hhs-empty-icon"><IconClockHistory /></div>
          <div className="hhs-empty-title">Chưa có lịch sử sức khỏe</div>
          <div className="hhs-empty-desc">
            Mẹ có thể lưu lại các lần khám bệnh, triệu chứng hoặc thuốc của bé.
          </div>
          <button className="primary-btn save" style={{ marginTop: '8px' }} onClick={onAddHealth}>
            + Ghi nhận sức khỏe
          </button>
        </div>
      ) : (
        <div className="records-list">
          {displayedRecords.map(r => (
            <div key={r.id} className="record-card">
              <div className="record-header">
                <div className="record-header-left">
                  <div className="record-disease">{r.disease}</div>
                  <div className="record-date">{formatDate(r.date)}</div>
                </div>
                <div className="record-right">
                  {r.recovery && (
                    <span className={`recovery-badge ${r.recovery === 'Đã khỏi hoàn toàn' ? 'ok' : r.recovery === 'Đang theo dõi' ? 'watch' : 'warn'}`}>
                      {r.recovery}
                    </span>
                  )}
                  <button type="button" className="delete-btn" onClick={() => onDeleteClick(r.id)} aria-label="Xóa">
                    <IconTrash />
                  </button>
                </div>
              </div>
              {r.medicine && (
                <div className="record-row">
                  <span>💊 Thuốc:</span>
                  <span>{r.medicine} {r.dosage ? `— ${r.dosage}` : ''}</span>
                </div>
              )}
              {r.duration && (
                <div className="record-row">
                  <span>⏱️ Thời gian:</span>
                  <span>{r.duration}</span>
                </div>
              )}
              {r.symptoms && (
                <div className="record-row">
                  <span>📝 Triệu chứng:</span>
                  <span>{r.symptoms}</span>
                </div>
              )}
            </div>
          ))}

          {showAll && (
            <button className="outline-btn small" style={{ width: '100%', marginTop: '8px' }} onClick={() => setShowAll(false)}>
              Thu gọn
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 7: MÓN ĂN CHO BÉ (PARENT)
   ════════════════════════════════════════ */
function ParentFoodTab({ userId, selectedBabyIndex, babies, onDeleteClick, triggerToast }) {
  const [foods, setFoods]                   = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);

  // Form states
  const [name, setName]                     = useState('');
  const [recipe, setRecipe]                 = useState('');
  const [note, setNote]                     = useState('');

  const activeBaby = babies[selectedBabyIndex] || {};
  const activeBabyId = activeBaby.id || 'baby';
  const ageMonths = getAgeInMonths(activeBaby.dob || '');

  const loadFoods = useCallback(async () => {
    if (!userId || !activeBabyId) return;
    try {
      const q = query(
        collection(db, 'users', userId, 'babies', activeBabyId, 'foods'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setFoods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [userId, activeBabyId]);

  useEffect(() => {
    loadFoods();
    window.addEventListener('profile-data-changed', loadFoods);
    return () => window.removeEventListener('profile-data-changed', loadFoods);
  }, [loadFoods]);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const entry = {
        name: name.trim(),
        recipe: recipe.trim(),
        note: note.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'babies', activeBabyId, 'foods'), entry);
      triggerToast('Đã lưu món ăn yêu thích');
      setName('');
      setRecipe('');
      setNote('');
      setShowForm(false);
      loadFoods();
    } catch {
      triggerToast('Chưa lưu được món ăn, mẹ thử lại nhé.');
    } finally {
      setSaving(false);
    }
  };

  // Ẩn/hiện gợi ý dựa trên tuổi ăn dặm của bé (dưới 6 tháng tuổi)
  if (ageMonths < 6) {
    return (
      <div className="tab-content fade-in">
        <div className="tab-header-col text-center">
          <div className="empty-icon"><IconApple /></div>
          <h2 className="tab-title mt-12">Món ăn của bé</h2>
          <p className="tab-sub text-center max-w-320">
            Mẹ ơi, giai đoạn này bé đang bú sữa mẹ hoàn toàn. Danh sách món ăn yêu thích sẽ vô cùng hữu ích khi bé bắt đầu ăn dặm (từ 6 tháng tuổi trở đi) nhé 🍼
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconApple /></span>
          Món ăn của bé
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Thêm món ăn'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-group">
            <label className="form-label">Tên món ăn</label>
            <input className="ms-input" placeholder="Cháo hạt sen, súp gà bí đỏ..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Công thức / Cách chế biến</label>
            <textarea rows={3} className="ms-textarea" placeholder="Mẹ chuẩn bị và nấu như thế nào..." value={recipe} onChange={e => setRecipe(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Lưu ý dị ứng / Cách ăn của bé</label>
            <input className="ms-input" placeholder="Bé thích ăn hơi đặc, không thêm muối gia vị..." value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <button className="primary-btn save" disabled={saving || !name.trim()} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu món ăn'}
          </button>
        </div>
      )}

      {foods.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><IconApple /></div>
          <h3 className="empty-title">Chưa có danh sách món ăn</h3>
          <p className="empty-desc">Ghi lại công thức nấu các món cháo ăn dặm ngon, ghi chú dị ứng của bé yêu.</p>
        </div>
      ) : (
        <div className="foods-grid">
          {foods.map(f => (
            <div key={f.id} className="food-card">
              <div className="food-header">
                <span className="food-name">🍴 {f.name}</span>
                <button type="button" className="delete-btn" onClick={() => onDeleteClick(f.id)}>
                  <IconTrash />
                </button>
              </div>
              {f.recipe && <div className="food-recipe">{f.recipe}</div>}
              {f.note && <div className="food-note">💡 Lưu ý: {f.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 8: TRÒ CHƠI MONTESSORI (PARENT)
   ════════════════════════════════════════ */
function ParentPlayTab({ selectedBabyIndex, babies }) {
  const activeBaby = babies[selectedBabyIndex] || {};
  const ageMonths = getAgeInMonths(activeBaby.dob || '');
  const playGroup = getPlayGroup(ageMonths);
  const groups = Object.keys(PLAY_DATA);
  const [activeGroup, setActiveGroup] = useState(playGroup);
  const activities = PLAY_DATA[activeGroup] || [];

  // Đồng bộ tab hoạt động khuyến nghị khi chuyển đổi bé
  useEffect(() => {
    setActiveGroup(playGroup);
  }, [playGroup]);

  return (
    <div className="tab-content fade-in">
      <div className="tab-header-col">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconLeaf /></span>
          Gợi ý trò chơi Montessori theo độ tuổi
        </h2>
        <p className="tab-sub">Thiết kế chuẩn phương pháp giáo dục Montessori cho {activeBaby.name || 'bé'}</p>
      </div>

      <div className="age-group-tabs">
        {groups.map(g => (
          <button 
            key={g} 
            type="button"
            className={`age-tab${activeGroup === g ? ' active' : ''}${g === playGroup ? ' recommended' : ''}`} 
            onClick={() => setActiveGroup(g)}
          >
            {g}
            {g === playGroup && <span className="rec-badge">Khuyên dùng</span>}
          </button>
        ))}
      </div>

      <div className="play-grid">
        {activities.map((a, i) => (
          <div key={i} className="play-card">
            <div className="play-info">
              <div className="play-name">{a.name}</div>
              <div className="play-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   TAB 9: GHI CHÚ BÉ YÊU (PARENT)
   ════════════════════════════════════════ */
function ParentNotesTab({ 
  userId, selectedSubject, subjectOptions, needsSubjectSelector, babies, onDeleteClick, triggerToast 
}) {
  const [notes, setNotes]                   = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form states
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent]               = useState('');
  const [title, setTitle]                   = useState('');

  const activeBaby = babies[subjectOptions.findIndex(o => o.id === selectedSubject) - 1] || babies[0] || {};
  const activeBabyId = activeBaby.id || 'baby';

  const loadNotes = useCallback(async () => {
    if (!userId || !activeBabyId) return;
    try {
      const q = query(
        collection(db, 'users', userId, 'babies', activeBabyId, 'notes'),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
  }, [userId, activeBabyId]);

  useEffect(() => {
    loadNotes();
    window.addEventListener('profile-data-changed', loadNotes);
    return () => window.removeEventListener('profile-data-changed', loadNotes);
  }, [loadNotes]);

  const handleSave = async () => {
    if (!date || !content.trim() || saving) return;
    setSaving(true);
    try {
      const entry = {
        date,
        title: title.trim() || 'Ghi chép hàng ngày',
        content: content.trim(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'babies', activeBabyId, 'notes'), entry);
      triggerToast('Đã lưu ghi chú bé yêu');
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setContent('');
      setShowForm(false);
      loadNotes();
    } catch {
      triggerToast('Chưa lưu được, mẹ thử lại sau nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <h2 className="tab-title">
          <span className="tab-title-icon"><IconNote /></span>
          Ghi chú phát triển
        </h2>
        <button className="outline-btn small" onClick={() => setShowForm(f => !f)}>
          {showForm ? '✕ Đóng' : '+ Thêm ghi chú'}
        </button>
      </div>

      {showForm && (
        <div className="form-card scale-in">
          <div className="form-group">
            <label className="form-label">Ngày ghi nhận</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{formatDate(date)}</span>
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input className="ms-input" placeholder="Ví dụ: Lần đầu tiên biết lẫy, Cảm nhận của mẹ..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung chi tiết</label>
            <textarea rows={4} className="ms-textarea" placeholder="Mẹ muốn viết điều gì..." value={content} onChange={e => setContent(e.target.value)} />
          </div>

          <button className="primary-btn save" disabled={saving || !date || !content.trim()} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu ghi chép'}
          </button>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={date}
              onConfirm={(str) => { setDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-icon"><IconNote /></div>
          <h3 className="empty-title">Chưa có ghi chép phát triển</h3>
          <p className="empty-desc">Lưu lại những kỷ niệm nhỏ đáng yêu, cột mốc lớn lên từng ngày của bé.</p>
        </div>
      ) : (
        <div className="records-list">
          {notes.map(n => (
            <div key={n.id} className="record-card">
              <div className="record-header">
                <div className="record-header-left">
                  <div className="record-disease">{n.title}</div>
                  <div className="record-date">{formatDate(n.date)}</div>
                </div>
                <button type="button" className="delete-btn" onClick={() => onDeleteClick(n.id)} aria-label="Xóa">
                  <IconTrash />
                </button>
              </div>
              <p className="record-card-notes plain">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   MODAL: CHỈNH SỬA HỒ SƠ THAI KỲ
   ════════════════════════════════════════ */
function EditPregnancyProfileModal({ userId, pregnancyData, fetuses, onClose, onSaved }) {
  const [tempEdd, setTempEdd]       = useState(pregnancyData?.edd || '');
  const [tempBabyNameA, setTempBabyNameA] = useState(fetuses[0]?.name || '');
  const [tempBabyNameB, setTempBabyNameB] = useState(fetuses[1]?.name || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleSave = async () => {
    if (!tempEdd || saving) return;
    setSaving(true);
    try {
      const nameA = tempBabyNameA.trim();
      const nameB = tempBabyNameB.trim();
      const joinedName = `${nameA || 'Bé A'} & ${nameB || 'Bé B'}`;

      const pregRef = doc(db, 'users', userId, 'tracking', 'pregnancy');
      const userRef = doc(db, 'users', userId);

      const idA = fetuses[0]?.id || doc(collection(db, 'users', userId, 'babies')).id;
      const idB = fetuses[1]?.id || doc(collection(db, 'users', userId, 'babies')).id;

      const updatedBabies = [
        {
          id: idA,
          childKey: 'baby-a',
          childOrder: 0,
          label: 'Bé A',
          name: nameA || 'Bé A',
          gender: 'girl',
          dob: '',
          pregnancyInfo: { dueDate: tempEdd, babyName: nameA || 'Bé A' }
        },
        {
          id: idB,
          childKey: 'baby-b',
          childOrder: 1,
          label: 'Bé B',
          name: nameB || 'Bé B',
          gender: 'girl',
          dob: '',
          pregnancyInfo: { dueDate: tempEdd, babyName: nameB || 'Bé B' }
        }
      ];

      const batch = writeBatch(db);
      batch.set(pregRef, {
        babyName: joinedName,
        edd: tempEdd,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

      batch.set(userRef, {
        numBabies: 2,
        babies: updatedBabies,
        pregnancyInfo: { dueDate: tempEdd, babyName: joinedName }
      }, { merge: true });

      // Đồng bộ subcollection babies
      batch.set(doc(db, 'users', userId, 'babies', idA), {
        id: idA,
        childKey: 'baby-a',
        childOrder: 0,
        name: nameA || 'Bé A',
        pregnancyInfo: { dueDate: tempEdd, babyName: nameA || 'Bé A' }
      }, { merge: true });

      batch.set(doc(db, 'users', userId, 'babies', idB), {
        id: idB,
        childKey: 'baby-b',
        childOrder: 1,
        name: nameB || 'Bé B',
        pregnancyInfo: { dueDate: tempEdd, babyName: nameB || 'Bé B' }
      }, { merge: true });

      await batch.commit();
      onSaved({ ...pregnancyData, babyName: joinedName, edd: tempEdd });
    } catch {
      alert('Không thể lưu hồ sơ, mẹ kiểm tra mạng nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ms-sheet-overlay" onClick={onClose}>
      <div className="ms-sheet ms-edit-profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-sheet-drag-handle" />
        <div className="ms-detail-header">
          <h2 className="ms-detail-title">Chỉnh sửa hồ sơ thai kỳ</h2>
          <button className="ms-detail-close" onClick={onClose} aria-label="Đóng"><IconClose /></button>
        </div>

        <div className="ms-detail-body">
          <div className="form-group">
            <label className="form-label">Tên ở nhà Bé A</label>
            <input className="ms-input" placeholder="Ví dụ: Bé A" value={tempBabyNameA} onChange={e => setTempBabyNameA(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tên ở nhà Bé B</label>
            <input className="ms-input" placeholder="Ví dụ: Bé B" value={tempBabyNameB} onChange={e => setTempBabyNameB(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Ngày dự sinh (EDD)</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{tempEdd ? formatDate(tempEdd) : 'Chọn ngày dự sinh'}</span>
            </button>
          </div>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={tempEdd || new Date().toISOString().split('T')[0]}
              onConfirm={(str) => { setTempEdd(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="dueDate"
            />,
            document.body
          )}
        </div>

        <div className="ms-detail-footer">
          <button className="primary-btn save" disabled={saving || !tempEdd} onClick={handleSave}>
            {saving ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   MODAL: XÁC NHẬN CHÀO ĐỜI (CONFIRM BIRTH)
   ════════════════════════════════════════ */
function ConfirmBirthModal({ userId, fetuses, pregnancyData, onClose, onSaved }) {
  const [birthDate, setBirthDate]           = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving]                 = useState(false);

  // Twin birth info states
  const [genderA, setGenderA] = useState('girl');
  const [genderB, setGenderB] = useState('girl');
  const [weightA, setWeightA] = useState('');
  const [weightB, setWeightB] = useState('');
  const [heightA, setHeightA] = useState('');
  const [heightB, setHeightB] = useState('');
  const [headA, setHeadA]     = useState('');
  const [headB, setHeadB]     = useState('');

  const babyAName = fetuses[0]?.name || 'Bé A';
  const babyBName = fetuses[1]?.name || 'Bé B';

  const handleSave = async () => {
    if (!birthDate || saving) return;
    setSaving(true);

    try {
      const batch = writeBatch(db);
      const updatedBabies = [];

      const idA = fetuses[0]?.id || doc(collection(db, 'users', userId, 'babies')).id;
      const idB = fetuses[1]?.id || doc(collection(db, 'users', userId, 'babies')).id;

      const items = [
        { id: idA, name: babyAName, gender: genderA, weight: weightA, height: heightA, head: headA, childKey: 'baby-a', order: 0 },
        { id: idB, name: babyBName, gender: genderB, weight: weightB, height: heightB, head: headB, childKey: 'baby-b', order: 1 }
      ];

      for (const item of items) {
        const babyDocRef = doc(db, 'users', userId, 'babies', item.id);
        const wVal = item.weight ? parseFloat(item.weight) : null;
        const hVal = item.height ? parseFloat(item.height) : null;
        const headVal = item.head ? parseFloat(item.head) : null;

        // 1. Create child document under users/{userId}/babies/{id}
        batch.set(babyDocRef, {
          id: item.id,
          childKey: item.childKey,
          childOrder: item.order,
          name: item.name,
          dob: birthDate,
          gender: item.gender,
          birthWeight: wVal,
          birthHeight: hVal,
          birthHeadCircumference: headVal,
          linkedPregnancyId: 'pregnancy',
          linkedFetusId: item.id,
          createdAt: serverTimestamp()
        }, { merge: true });

        // 2. Growth log lút sinh
        if (wVal !== null || hVal !== null || headVal !== null) {
          const logRef = doc(collection(db, 'users', userId, 'babies', item.id, 'growthLogs'));
          batch.set(logRef, {
            date: birthDate,
            weight: wVal,
            height: hVal,
            head: headVal,
            note: 'Chỉ số lúc sinh',
            createdAt: serverTimestamp()
          });
        }

        updatedBabies.push({
          id: item.id,
          childKey: item.childKey,
          childOrder: item.order,
          label: item.order === 0 ? 'Bé A' : 'Bé B',
          name: item.name,
          gender: item.gender,
          dob: birthDate
        });
      }

      // 3. Update pregnancy status
      const pregDocRef = doc(db, 'users', userId, 'tracking', 'pregnancy');
      batch.set(pregDocRef, {
        status: 'completed',
        deliveredAt: birthDate,
        completedAt: serverTimestamp()
      }, { merge: true });

      // 4. Update user status to parent
      const userDocRef = doc(db, 'users', userId);
      batch.set(userDocRef, {
        status: 'parent',
        numBabies: 2,
        babies: updatedBabies
      }, { merge: true });

      await batch.commit();
      onSaved();
    } catch {
      alert('Chưa lưu được, mẹ kiểm tra mạng nhé.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ms-sheet-overlay" onClick={onClose}>
      <div className="ms-sheet ms-birth-confirm-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-sheet-drag-handle" />
        <div className="ms-detail-header">
          <h2 className="ms-detail-title">Chào đón các bé yêu chào đời</h2>
          <button className="ms-detail-close" onClick={onClose} aria-label="Đóng"><IconClose /></button>
        </div>

        <div className="ms-detail-body">
          <div className="form-group">
            <label className="form-label">📅 Ngày sinh của các bé</label>
            <button type="button" className="cs-date-trigger-btn" onClick={() => setShowDatePicker(true)}>
              <span className="cs-date-icon"><IconCalendar /></span>
              <span className="cs-date-text">{formatDate(birthDate)}</span>
            </button>
          </div>

          {/* Bé A (Bắp) */}
          <div className="birth-baby-section">
            <h3 className="birth-baby-section-title">Chỉ số của {babyAName}</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label-small">Giới tính</label>
                <select className="ms-select" value={genderA} onChange={e => setGenderA(e.target.value)}>
                  <option value="girl">👧 Bé gái</option>
                  <option value="boy">👦 Bé trai</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label-small">Cân nặng lúc sinh (kg)</label>
                <input type="number" step="0.01" className="ms-input" placeholder="Ví dụ: 2.8" value={weightA} onChange={e => setWeightA(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label-small">Chiều dài lúc sinh (cm)</label>
                <input type="number" step="0.1" className="ms-input" placeholder="Ví dụ: 48" value={heightA} onChange={e => setHeightA(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label-small">Chu vi đầu (cm)</label>
                <input type="number" step="0.1" className="ms-input" placeholder="Ví dụ: 32" value={headA} onChange={e => setHeadA(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bé B (Bon) */}
          <div className="birth-baby-section">
            <h3 className="birth-baby-section-title">Chỉ số của {babyBName}</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label-small">Giới tính</label>
                <select className="ms-select" value={genderB} onChange={e => setGenderB(e.target.value)}>
                  <option value="girl">👧 Bé gái</option>
                  <option value="boy">👦 Bé trai</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label-small">Cân nặng lúc sinh (kg)</label>
                <input type="number" step="0.01" className="ms-input" placeholder="Ví dụ: 2.7" value={weightB} onChange={e => setWeightB(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label-small">Chiều dài lúc sinh (cm)</label>
                <input type="number" step="0.1" className="ms-input" placeholder="Ví dụ: 47.5" value={heightB} onChange={e => setHeightB(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label-small">Chu vi đầu (cm)</label>
                <input type="number" step="0.1" className="ms-input" placeholder="Ví dụ: 31.8" value={headB} onChange={e => setHeadB(e.target.value)} />
              </div>
            </div>
          </div>

          {showDatePicker && createPortal(
            <AppDatePicker
              value={birthDate}
              onConfirm={(str) => { setBirthDate(str); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
              dateType="visitDate"
              disableFuture={true}
            />,
            document.body
          )}
        </div>

        <div className="ms-detail-footer">
          <button className="primary-btn save" disabled={saving || !birthDate} onClick={handleSave}>
            {saving ? 'Đang lưu...' : '🎉 Xác nhận các bé chào đời!'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   iOS STYLE CONFIRM MODAL
   ════════════════════════════════════════ */
function IOSConfirmModal({ title, description, confirmLabel, cancelLabel, onConfirm, onCancel, processing }) {
  return (
    <div className="ms-ios-confirm-overlay" onClick={processing ? null : onCancel}>
      <div className="ms-ios-confirm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="ms-ios-confirm-title">{title}</h3>
        {description && <p className="ms-ios-confirm-desc">{description}</p>}
        <div className="ms-ios-confirm-actions">
          <button className="ms-ios-confirm-btn cancel" onClick={onCancel} disabled={processing}>
            {cancelLabel || 'Hủy'}
          </button>
          <button className="ms-ios-confirm-btn confirm" onClick={onConfirm} disabled={processing}>
            {processing ? 'Đang xóa...' : (confirmLabel || 'Xóa')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   TOAST NOTIFICATION
   ════════════════════════════════════════ */
function ToastNotification({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="bp-toast">
      <span className="bp-toast-text">{message}</span>
    </div>
  );
}
