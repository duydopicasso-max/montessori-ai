/**
 * ChatScreen.jsx — Montessori AI Premium Dashboard
 * 🌿 Dashboard-centric hub with slide-up sheets
 * 💬 Chat AI integrated in slide-up modal (no FAB overlay)
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { calculateDetailedAge, getHandbookForAge } from '../data/handbookData.js';
import { LeafIcon, SparkleIcon } from '../icons.jsx';
import AppDatePicker from '../components/AppDatePicker.jsx';
import './ChatScreen.css';
import { getCurrentPregnancyWeek, parseLocalDate, todayLocal } from '../utils/pregnancyWeek.js';

import { BABY_0_8_DAILY_MISSIONS } from '../data/dailyMissions/baby0To8Missions.js';
import { BABY_9_18_DAILY_MISSIONS } from '../data/dailyMissions/baby9To18Missions.js';
import { BABY_18_36_DAILY_MISSIONS } from '../data/dailyMissions/baby18To36Missions.js';
import { PREGNANCY_DAILY_MISSIONS } from '../data/dailyMissions/pregnancyDailyMissions.js';
import { PREGNANCY_TODAY_ACTIVITIES } from '../data/pregnancyTodayActivities.js';
import { BORN_TODAY_ACTIVITIES } from '../data/bornTodayActivities.js';

const ClockIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BookmarkIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const parseProfileDate = (rawDate) => {
  if (!rawDate) return null;
  try {
    if (rawDate && typeof rawDate.toDate === 'function') {
      const d = rawDate.toDate();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    if (rawDate instanceof Date) {
      return new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate());
    }
    if (typeof rawDate === 'string') {
      const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (yyyymmddRegex.test(rawDate)) {
        const [year, month, day] = rawDate.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }
    return null;
  } catch (e) {
    console.error("Error parsing profile date:", e);
    return null;
  }
};

const todayLocalMidnight = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

const getPregnancyQuoteImage = (imagePath) => {
  if (!imagePath) return `${import.meta.env.BASE_URL}quote-images/pregnancy/pregnancy-quote-01-belly-touch.png`;
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

const PREGNANCY_MONTESSORI_QUOTES = [
  {
    text: "Mỗi ngày mẹ bình an hơn một chút, bé cũng cảm nhận được sự dịu dàng ấy.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-01-belly-touch.png"
  },
  {
    text: "Thai kỳ không cần vội. Mỗi nhịp thở của mẹ cũng là một cách kết nối với bé.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-01-belly-touch.png"
  },
  {
    text: "Trước khi con nhìn thấy thế giới, con đã cảm nhận thế giới qua sự bình yên của mẹ.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-01-belly-touch.png"
  },
  {
    text: "Một dòng mẹ viết hôm nay có thể trở thành ký ức dịu dàng của con mai sau.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-02-journal-flower.png"
  },
  {
    text: "Mẹ không cần chuẩn bị mọi thứ hoàn hảo, chỉ cần chuẩn bị bằng tình yêu và sự lắng nghe.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-02-journal-flower.png"
  },
  {
    text: "Hành trình làm mẹ bắt đầu từ những điều rất nhỏ: một suy nghĩ dịu dàng, một mong mỏi an yên.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-02-journal-flower.png"
  },
  {
    text: "Những món đồ nhỏ xinh của bé gợi nhắc mẹ về một sự sống mới đang chuẩn bị bước vào cuộc đời.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-03-baby-clothes.png"
  },
  {
    text: "Chuẩn bị môi trường cho con bắt đầu từ sự ngăn nắp, tinh tế và đầy tình yêu thương.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-03-baby-clothes.png"
  },
  {
    text: "Mỗi chiếc áo nhỏ mẹ xếp hôm nay mang theo niềm hạnh phúc đón chào con yêu.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-03-baby-clothes.png"
  },
  {
    text: "Đọc sách cùng con từ trong bụng mẹ là nuôi dưỡng tình yêu ngôn ngữ từ những ngày đầu.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-04-reading-book.png"
  },
  {
    text: "Giọng nói của mẹ là âm thanh dịu dàng nhất, định hình cảm nhận đầu tiên của con về thế giới.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-04-reading-book.png"
  },
  {
    text: "Lắng nghe những trang sách hay giúp mẹ và bé cùng nuôi dưỡng sự thông thái.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-04-reading-book.png"
  },
  {
    text: "Yêu thương con là chăm sóc bản thân mình thật tốt, uống đủ nước và ăn lành mạnh mỗi ngày.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-05-water-vitamins.png"
  },
  {
    text: "Mẹ khỏe mạnh, bé vững vàng. Nuôi dưỡng thân tâm mẹ là xây dựng nền móng cho con.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-05-water-vitamins.png"
  },
  {
    text: "Từng ngụm nước lọc trong lành giúp thanh lọc cơ thể mẹ và nuôi dưỡng nguồn sống cho bé.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-05-water-vitamins.png"
  },
  {
    text: "Âm nhạc nhẹ nhàng giúp xoa dịu tâm hồn mẹ và khơi gợi những cảm xúc bình yên nơi bé.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-06-soft-music.png"
  },
  {
    text: "Tần số của tình yêu thương truyền qua những giai điệu êm ái, vỗ về bé yêu thức giấc.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-06-soft-music.png"
  },
  {
    text: "Hãy cùng con tận hưởng những phút giây thư giãn trong không gian tràn ngập âm nhạc.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-06-soft-music.png"
  },
  {
    text: "Tách trà thảo mộc ấm áp giúp mẹ tĩnh tâm, cảm nhận rõ rệt sự hiện diện thiêng liêng của con.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-07-herbal-tea.png"
  },
  {
    text: "Sống chậm lại một chút để lắng nghe nhịp đập bé nhỏ đang lớn dần trong mẹ.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-07-herbal-tea.png"
  },
  {
    text: "Sự thư thái của mẹ bầu là món quà vô giá nhất dành cho sự phát triển của em bé.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-07-herbal-tea.png"
  },
  {
    text: "Viết nhật ký giúp mẹ giải tỏa những âu lo và lưu giữ những cột mốc xúc cảm kỳ diệu.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-08-emotion-journal.png"
  },
  {
    text: "Mỗi cảm xúc của mẹ đều xứng đáng được lắng nghe, đón nhận và ôm ấp vỗ về.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-08-emotion-journal.png"
  },
  {
    text: "Nhật ký thai kỳ là nhịp cầu nối dài yêu thương giữa hai thế giới của mẹ và con.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-08-emotion-journal.png"
  },
  {
    text: "Góc nhỏ của bé không cần quá nhiều đồ chơi, chỉ cần sự an toàn, ngăn nắp và tự do.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-09-nursery-corner.png"
  },
  {
    text: "Môi trường Montessori trong lành và gọn gàng giúp bé phát triển tối đa tiềm năng tự nhiên.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-09-nursery-corner.png"
  },
  {
    text: "Chuẩn bị phòng cho con là chuẩn bị một không gian của sự tôn trọng và khám phá tự lập.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-09-nursery-corner.png"
  },
  {
    text: "Sự kết nối giữa mẹ và con là mối liên kết thiêng liêng nhất, không có gì thay thế được.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-10-mother-connection.png"
  },
  {
    text: "Khi mẹ đặt tay lên bụng, mẹ đang nói với con rằng: Mẹ luôn ở đây, yêu thương con vô điều kiện.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-10-mother-connection.png"
  },
  {
    text: "Con đã chọn mẹ để đồng hành. Hãy tin vào bản năng làm mẹ và đi cùng con bằng sự an yên.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/pregnancy/pregnancy-quote-10-mother-connection.png"
  }
];

const getBornQuoteImage = (imagePath) => {
  if (!imagePath) return `${import.meta.env.BASE_URL}quote-images/quote-01-practical-life.webp`;
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

const BORN_MONTESSORI_QUOTES = [
  {
    id: 'born-quote-01',
    text: "Mỗi lần con tự thử một điều nhỏ bé, con đang lớn lên bằng chính đôi tay của mình.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-01-self-try.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-02',
    text: "Điều quý giá mẹ có thể dành cho con không chỉ là giúp đỡ, mà là cơ hội để con tự làm.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-02-give-chance.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-03',
    text: "Sự tập trung của trẻ là một mầm non mong manh; khi được tôn trọng, nó sẽ lớn thành nội lực.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-03-child-focus.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-04',
    text: "Bàn tay bận rộn là dấu hiệu của một tâm trí đang được nuôi dưỡng.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-04-busy-hands.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-05',
    text: "Con không cần bị thúc ép để lớn lên; con cần một môi trường đủ yên bình để tự phát triển.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-05-peaceful-environment.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-06',
    text: "Mỗi ngày con lặp lại một hành động, là mỗi ngày con đang xây dựng trật tự bên trong mình.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-06-inner-order.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-07',
    text: "Quan sát con thật kỹ, mẹ sẽ thấy: phía sau mỗi hành động nhỏ đều là một nhu cầu phát triển lớn.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-07-observe-child.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-08',
    text: "Trẻ học bằng trải nghiệm thật, bằng chạm, bằng nghe, bằng nhìn, bằng chính cuộc sống quanh mình.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-08-real-experience.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-09',
    text: "Khi mẹ chậm lại để lắng nghe con, con cũng học được cách bình an với thế giới.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-09-slow-listening.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-10',
    text: "Không phải làm thay con thật nhiều, mà là chuẩn bị cho con một môi trường vừa tầm để con tự tin bước vào.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-10-prepared-environment.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-11',
    text: "Sự tự lập không đến trong một ngày; nó lớn dần từ những việc nhỏ con được phép tự thử mỗi hôm.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-11-growing-independence.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-12',
    text: "Một đứa trẻ được tôn trọng sẽ học cách tôn trọng bản thân, người khác và môi trường xung quanh.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-12-respect-child.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-13',
    text: "Mẹ không cần hoàn hảo; chỉ cần đủ dịu dàng để đồng hành và đủ tin tưởng để con được là chính mình.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-13-gentle-mother.png",
    objectPosition: "center center"
  },
  {
    id: 'born-quote-14',
    text: "Trưởng thành của con bắt đầu từ những điều rất nhỏ: một lần tự cầm thìa, một lần tự chọn, một lần được mẹ kiên nhẫn chờ.",
    author: "Cảm hứng Montessori",
    image: "/quote-images/born/born-quote-14-patient-waiting.png",
    objectPosition: "center center"
  }
];


const API_BASE      = import.meta.env.VITE_API_URL || '/api';
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* ══════════════════════════════════════
   SVG OUTLINE ICONS — pixel-perfect mockup match
   ══════════════════════════════════════ */

/* --- Ăn uống: Baby bottle (nipple → collar → body) --- */
const BottleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4h4"/>
    <path d="M9 6h6l1 3H8l1-3z"/>
    <path d="M8 9v10a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V9"/>
    <path d="M10 14h4"/>
  </svg>
);

/* --- Ngủ: Classic Feather/Lucide crescent moon + star --- */
const MoonStarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* Proven crescent moon path from Feather Icons */}
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    {/* Small star sparkle top-right */}
    <path d="M19.5 6l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>
  </svg>
);

/* --- Thay tã: Nappy/diaper front view --- */
const DiaperIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {/* Waistband/top */}
    <path d="M6 5h12l2 4H4L6 5z"/>
    {/* Body */}
    <path d="M4 9v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9"/>
    {/* Center gather/pinch line showing it's a diaper */}
    <path d="M4 13c2.5-1.5 5-2 8-2s5.5.5 8 2"/>
  </svg>
);

const TrashIcon = ({ size = 20, strokeWidth = 1.6, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

/* --- Phát triển: Bar chart in rounded box — clearly reads as growth data --- */
const ScaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Outer rounded frame */}
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    {/* 3 bars rising left → right, clearly visible */}
    <line x1="7"  y1="17" x2="7"  y2="12"/>
    <line x1="12" y1="17" x2="12" y2="9"/>
    <line x1="17" y1="17" x2="17" y2="6"/>
  </svg>
);

/* --- Cân nặng thai kỳ: Rounded digital/bathroom scale --- */
const PregWeightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 8a4 4 0 0 1 8 0" />
    <line x1="12" y1="10" x2="12" y2="8" />
  </svg>
);

/* --- Cảm xúc hôm nay: Smiley face --- */
const PregEmotionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14c1.5 2 4.5 2 6 0"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

/* --- Lịch khám thai: Calendar with medical plus sign --- */
const PregClinicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <line x1="10" y1="15" x2="14" y2="15" />
  </svg>
);

/* --- Vitamin & Nước: Pill capsule + water drop --- */
const PregRemindersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <g transform="rotate(-45 8.5 12)">
      <rect x="6" y="7" width="5" height="10" rx="2.5" />
      <line x1="6" y1="12" x2="11" y2="12" />
    </g>
    <path d="M16 19a3.5 3.5 0 0 0 3.5-3.5c0-2.15-3.5-5.5-3.5-5.5s-3.5 3.35-3.5 5.5A3.5 3.5 0 0 0 16 19z"/>
  </svg>
);

/* --- Đếm thai máy: Concentric motion waves --- */
const PregKickIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" />
    <path d="M8 8 A 5.7 5.7 0 0 1 16 8" />
    <path d="M5 5 A 9.9 9.9 0 0 1 19 5" />
    <path d="M16 16 A 5.7 5.7 0 0 1 8 16" />
    <path d="M19 19 A 9.9 9.9 0 0 1 5 19" />
  </svg>
);

/* --- Đếm cơn gò: Clock/Timer line --- */
const PregContraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);


/* ── Timeline node icons (compact 24x24) ── */
const TimelineBottleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4h4M9 6h6l1 3H8l1-3zM8 9v9a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V9"/>
    <path d="M10 13h4"/>
  </svg>
);
const TimelineMoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const TimelineDiaperIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 5h12l2 4H4L6 5z"/>
    <path d="M4 9v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9"/>
    <path d="M4 13c2.5-1.5 5-2 8-2s5.5.5 8 2"/>
  </svg>
);
const TimelineCameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const TimelineSunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);
const TimelineGrowthIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="4"/>
    <path d="M7 17v-4M12 17V9M17 17V7"/>
  </svg>
);
const TimelineClinicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);
const TimelineEmotionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9" y2="9"/>
    <line x1="15" y1="9" x2="15" y2="9"/>
  </svg>
);
const TimelineVitaminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="3" width="10" height="18" rx="5" transform="rotate(45 12 12)" />
    <line x1="8.46" y1="8.46" x2="15.54" y2="15.54" />
  </svg>
);
const TimelineWeightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 8a4 4 0 0 1 8 0" />
    <line x1="12" y1="10" x2="12" y2="8" />
  </svg>
);
const EmotionSmileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="emotion-icon-svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const EmotionTiredIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="emotion-icon-svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M10 15h4"/>
    <path d="M9 10a1.5 1.5 0 0 0-3 0"/>
    <path d="M18 10a1.5 1.5 0 0 0-3 0"/>
  </svg>
);
const EmotionSoftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="emotion-icon-svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 15.5s1.5-1.5 4-1.5 4 1.5 4 1.5"/>
    <circle cx="9" cy="9.5" r="1"/>
    <circle cx="15" cy="9.5" r="1"/>
    <path d="M9.5 11.5c0 .6-.4 1-.9 1s-.9-.4-.9-1c0-.6.9-1.5.9-1.5s.9.9.9 1.5z"/>
  </svg>
);
const EmotionWorriedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="emotion-icon-svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 16c2-1.5 4-1.5 6 0"/>
    <path d="M8 9.5c.3-.5.9-.5 1.2 0"/>
    <path d="M14.8 9.5c.3-.5.9-.5 1.2 0"/>
    <circle cx="9" cy="11.5" r="1"/>
    <circle cx="15" cy="11.5" r="1"/>
  </svg>
);
const EmotionHeartSmileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="emotion-icon-svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <path d="M7.3 8.3a1 1 0 0 1 1.4-1.4l.3.3.3-.3a1 1 0 0 1 1.4 1.4L8.7 10.3 6.7 8.3z" fill="currentColor"/>
    <path d="M13.3 8.3a1 1 0 0 1 1.4-1.4l.3.3.3-.3a1 1 0 0 1 1.4 1.4l-2 2-2-2z" fill="currentColor"/>
  </svg>
);
const LeafSparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }} className="leaf-sparkle-icon">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-13.9.2" />
    <path d="M9 22v-4h4" />
  </svg>
);
const emotionIconMap = {
  'Vui vẻ': EmotionSmileIcon,
  'Mệt mỏi': EmotionTiredIcon,
  'Nhạy cảm': EmotionSoftIcon,
  'Lo lắng': EmotionWorriedIcon,
  'Hạnh phúc': EmotionHeartSmileIcon
};
const emotionEmojiMap = {
  'Vui vẻ': '😊',
  'Mệt mỏi': '🥱',
  'Nhạy cảm': '🥺',
  'Lo lắng': '😰',
  'Hạnh phúc': '🥰'
};


/* Unified Assistant Personalization Context Helper */
function getAssistantContext(profile) {
  const status = profile?.status || 'born';
  const momName = profile?.momName || 'mẹ';
  const babies = [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0));
  
  // Retrieve active baby ID persisted in localStorage
  const activeBabyId = typeof window !== 'undefined' ? localStorage.getItem('montessori_active_baby_id') : null;
  const activeBaby = activeBabyId ? babies.find(b => b.id === activeBabyId) : (babies.length === 1 ? babies[0] : null);

  const isPregnant = status === 'pregnant';
  const pregnancyInfo = profile?.pregnancyInfo || activeBaby?.pregnancyInfo;
  const edd = profile?.dueDate || pregnancyInfo?.dueDate;
  
  // Validation checks to avoid undefined or incomplete profile states
  const hasPregnancyInfo = isPregnant && (!!edd || !!pregnancyInfo?.weeks);
  const hasBabyInfo = !isPregnant && babies.length > 0 && !!babies[0]?.dob;

  if (!hasPregnancyInfo && !hasBabyInfo) {
    return {
      group: 'incomplete',
      title: `Xin chào mẹ ${momName}! 👋`,
      subtitle: 'Mẹ có thể cập nhật thông tin thai kỳ hoặc ngày sinh của bé trong phần Hồ sơ để nhận được các gợi ý chăm sóc phù hợp nhất từ Montessori AI.',
      suggestions: [
        'Cập nhật hồ sơ thai kỳ ở đâu?',
        'Làm sao để thêm ngày sinh của bé?',
        'Phương pháp Montessori có lợi ích gì?',
        'Trợ lý Montessori AI có thể làm gì?'
      ],
      placeholder: 'Hỏi Montessori AI hoặc cập nhật hồ sơ để được gợi ý chính xác hơn...'
    };
  }

  if (isPregnant) {
    const babyCount = profile?.numBabies || 1;
    const isMulti = babyCount >= 2;
    
    let weeks = 30; // default fallback
    if (edd) {
      const dueDate = new Date(edd);
      const today = new Date();
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = 280 - Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      weeks = Math.max(1, Math.min(42, Math.floor(diffDays / 7)));
    } else if (pregnancyInfo?.weeks) {
      weeks = parseInt(pregnancyInfo.weeks, 10);
    }

    if (isMulti) {
      const isTriplet = babyCount >= 3;
      const babyLabel = isTriplet ? 'các bé' : 'hai bé';
      const pregnancyLabel = isTriplet ? 'thai ba' : 'thai đôi';
      const namesList = babies.map(b => b.name).filter(Boolean);
      const babiesText = namesList.length >= 2 ? namesList.slice(0, -1).join(', ') + ' và ' + namesList[namesList.length - 1] : babyLabel;
      
      let subtitleText = '';
      if (weeks <= 12) {
        subtitleText = `Mẹ đang theo dõi thai kỳ của ${babiesText}. Hôm nay mẹ muốn hỏi về khám thai, dinh dưỡng hay ghi chú dặn dò bác sĩ?`;
      } else if (weeks <= 27) {
        subtitleText = `${babiesText} đang lớn lên từng ngày. Montessori AI có thể giúp mẹ theo dõi chỉ số ${babyLabel}, dinh dưỡng và thai giáo.`;
      } else if (weeks <= 34) {
        subtitleText = `Mẹ đang ở giai đoạn cuối thai kỳ ${pregnancyLabel}. Mẹ có thể hỏi về thai máy, lịch khám, nghỉ ngơi hoặc chuẩn bị sinh.`;
      } else {
        subtitleText = "Mẹ sắp gặp các bé rồi. Montessori AI có thể giúp mẹ chuẩn bị những việc quan trọng trước ngày sinh.";
      }
      
      const suggestionsList = [
        `Theo dõi chỉ số ${babyLabel} như thế nào?`,
        `Mẹ bầu ${pregnancyLabel} nên nghỉ ngơi ra sao?`,
        `Thai máy của ${babyLabel} nên ghi nhận thế nào?`,
        `Chuẩn bị sinh ${isTriplet ? 'ba' : 'đôi'} cần lưu ý gì?`,
        `Dinh dưỡng cho mẹ mang thai ${isTriplet ? 'ba' : 'đôi'} cần chú ý gì?`
      ];
      
      return {
        group: 'pregnant_multi',
        title: `Xin chào mẹ ${momName}! 🌿`,
        subtitle: subtitleText,
        suggestions: suggestionsList,
        placeholder: `Hỏi về ${pregnancyLabel}, chỉ số ${babyLabel}, lịch khám...`
      };
    } else {
      const name = activeBaby?.name || profile?.childName || 'bé';
      const cleanBabyName = name === 'bé yêu' ? 'bé' : name;
      
      let subtitleText = '';
      let suggestionsList = [];
      
      if (weeks <= 12) {
        subtitleText = `Mẹ đang ở đầu thai kỳ. Hôm nay Montessori AI có thể giúp mẹ theo dõi khám thai, dinh dưỡng và những cảm nhận đầu tiên về ${cleanBabyName}.`;
        suggestionsList = [
          'Lần khám thai đầu tiên cần lưu ý gì?',
          'Mẹo bổ sung vitamin cho mẹ bầu?',
          'Đầu thai kỳ nên nghỉ ngơi ra sao?',
          'Có nên bắt đầu thai giáo từ sớm không?'
        ];
      } else if (weeks <= 27) {
        subtitleText = `${cleanBabyName} đang lớn lên từng ngày. Mẹ muốn hỏi về khám thai, dinh dưỡng hay thai giáo hôm nay?`;
        suggestionsList = [
          'Tuần này bé phát triển như thế nào?',
          'Mẹ nên theo dõi chỉ số siêu âm nào?',
          'Gợi ý thai giáo nhẹ nhàng hôm nay',
          'Khi nào mẹ bắt đầu cảm nhận thai máy?'
        ];
      } else if (weeks <= 36) {
        subtitleText = 'Mẹ đang bước vào giai đoạn cuối thai kỳ. Montessori AI có thể hỗ trợ mẹ theo dõi thai máy, lịch khám và chuẩn bị sinh.';
        suggestionsList = [
          'Mẹ nên theo dõi thai máy như thế nào?',
          'Chuẩn bị đồ đi sinh cần những gì?',
          'Cơn gò sinh lý khác gì cơn gò chuyển dạ?',
          'Lịch khám cuối thai kỳ cần lưu ý gì?'
        ];
      } else {
        subtitleText = `Mẹ sắp gặp ${cleanBabyName} rồi. Montessori AI có thể giúp mẹ chuẩn bị những việc cuối cùng trước ngày sinh.`;
        suggestionsList = [
          'Dấu hiệu sắp sinh thường gặp là gì?',
          'Mẹ cần chuẩn bị gì trước ngày sinh?',
          'Khi nào nên đi viện?',
          'Sau sinh mẹ cần lưu ý điều gì đầu tiên?'
        ];
      }
      
      return {
        group: 'pregnant_single',
        title: `Xin chào mẹ ${momName}! 🌿`,
        subtitle: subtitleText,
        suggestions: suggestionsList,
        placeholder: 'Hỏi về thai kỳ, khám thai, dinh dưỡng mẹ...'
      };
    }
  } else {
    // Born Context
    if (babies.length > 1 && !activeBaby) {
      return {
        group: 'born_multi_general',
        title: `Xin chào mẹ ${momName}! 👋`,
        subtitle: 'Mẹ đang chăm sóc nhiều bé. Montessori AI có thể hỗ trợ mẹ theo từng bé, từng độ tuổi và từng nhu cầu trong ngày.',
        suggestions: [
          'So sánh lịch sinh hoạt của các bé thế nào?',
          'Cách cân bằng thời gian chăm sóc từng bé?',
          'Ghi chú sức khỏe riêng cho từng bé ở đâu?',
          'Gợi ý hoạt động Montessori phù hợp cho từng độ tuổi?'
        ],
        placeholder: 'Hỏi về các bé, chăm sóc nhiều bé, Montessori...'
      };
    }

    const baby = activeBaby || babies[0];
    const name = baby?.name || 'bé';
    const dob = baby?.dob || '';
    
    let ageMonths = 0;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let diff = (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth();
      if (today.getDate() < birthDate.getDate()) {
        diff--;
      }
      ageMonths = Math.max(0, diff);
    }
    
    let subtitleText = '';
    let suggestionsList = [];
    let placeholderText = '';
    
    if (ageMonths < 6) {
      subtitleText = `Hôm nay của ${name} thế nào? Montessori AI có thể giúp mẹ với giấc ngủ, bú sữa, lịch sinh hoạt và chăm sóc bé nhỏ.`;
      suggestionsList = [
        'Thiết lập lịch sinh hoạt EASY cho bé thế nào?',
        'Mẹo giúp bé phân biệt ngày đêm?',
        'Chăm sóc da bé sơ sinh đúng cách?',
        'Đồ chơi Montessori đầu đời là gì?',
        'Bé khóc nhiều thì mẹ nên làm gì?',
        'Làm sao nhận biết bé bú đủ?'
      ];
      if (ageMonths >= 4) {
        suggestionsList.push('Khi nào bé sẵn sàng ăn dặm?');
      }
      placeholderText = 'Hỏi về bú sữa, giấc ngủ, chăm sóc bé...';
    } else if (ageMonths < 12) {
      subtitleText = `${name} đang ở giai đoạn khám phá và ăn dặm. Mẹ muốn hỏi về món ăn, giấc ngủ, vận động hay trò chơi Montessori hôm nay?`;
      suggestionsList = [
        'Bé mấy tháng thì bắt đầu ăn dặm?',
        'Món đầu tiên nên thử là gì?',
        'Bé không hợp tác khi ăn thì làm sao?',
        'Gợi ý trò chơi Montessori cho bé tập bò',
        'Làm sao theo dõi dị ứng thực phẩm?'
      ];
      placeholderText = 'Hỏi về ăn dặm, giấc ngủ, trò chơi cho bé...';
    } else if (ageMonths < 24) {
      subtitleText = `${name} đang lớn rất nhanh. Montessori AI có thể gợi ý hoạt động, món ăn, giấc ngủ và cách đồng hành với cảm xúc của bé.`;
      suggestionsList = [
        'Gợi ý hoạt động Montessori cho bé 1–2 tuổi',
        'Bé kén ăn thì mẹ nên làm gì?',
        'Làm sao giúp bé tập nói nhiều hơn?',
        'Bé hay ăn vạ thì xử lý thế nào?',
        'Trò chơi phát triển vận động tinh cho bé'
      ];
      placeholderText = 'Hỏi về ăn uống, tập nói, cảm xúc, Montessori...';
    } else if (ageMonths < 36) {
      subtitleText = `${name} đang ở tuổi tò mò và muốn tự làm nhiều thứ. Mẹ có thể hỏi về ngôn ngữ, cảm xúc, kỷ luật tích cực hoặc hoạt động Montessori.`;
      suggestionsList = [
        'Khủng hoảng tuổi lên 2 nên xử lý thế nào?',
        'Khi nào nên tập bỏ bỉm?',
        'Gợi ý hoạt động tự lập cho bé',
        'Làm sao dạy bé chờ đến lượt?',
        'Bé nói chậm có cần lo không?'
      ];
      placeholderText = 'Hỏi về tự lập, cảm xúc, trò chơi, nề nếp...';
    } else {
      subtitleText = `${name} đang bước vào giai đoạn học hỏi mạnh mẽ. Montessori AI có thể gợi ý hoạt động, giao tiếp, tự lập và nề nếp mỗi ngày.`;
      suggestionsList = [
        'Gợi ý hoạt động Montessori tại nhà',
        'Làm sao giúp bé tự lập hơn?',
        'Cách nói chuyện khi bé không nghe lời',
        'Chuẩn bị cho bé đi học như thế nào?',
        'Hoạt động phát triển ngôn ngữ cho bé'
      ];
      placeholderText = 'Hỏi về tự lập, cảm xúc, trò chơi, nề nếp...';
    }

    if (babies.length > 1 && activeBaby) {
      subtitleText = `Hôm nay mẹ đang xem hồ sơ của ${name}. Montessori AI có thể gợi ý chăm sóc phù hợp với độ tuổi của bé.`;
    }

    return {
      group: babies.length > 1 ? 'born_multi_active' : 'born_single',
      title: `Xin chào mẹ ${momName}! 👋`,
      subtitle: subtitleText,
      suggestions: suggestionsList,
      placeholder: placeholderText
    };
  }
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'montessori/chat');
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  return data.secure_url;
}

const PREGNANCY_FRUIT_MAP = {
  1: { fruit: "🌱", fruitName: "hạt mầm", desc: "Phôi thai đang bắt đầu làm tổ trong tử cung ấm áp của mẹ.", sizeText: "siêu nhỏ" },
  2: { fruit: "🌱", fruitName: "hạt mầm", desc: "Phôi thai đang bắt đầu làm tổ trong tử cung ấm áp của mẹ.", sizeText: "siêu nhỏ" },
  3: { fruit: "🌱", fruitName: "hạt mầm", desc: "Phôi thai đang bắt đầu làm tổ trong tử cung ấm áp của mẹ.", sizeText: "siêu nhỏ" },
  4: { fruit: "🍓", fruitName: "hạt vừng", desc: "Phôi thai nhỏ đã làm tổ chắc chắn trong tử cung. Các tế bào đang phân chia thần tốc.", sizeText: "khoảng 1mm" },
  5: { fruit: "🍓", fruitName: "hạt táo", desc: "Hệ thần kinh, tuần hoàn và tim thai sơ khai đang dần hình thành.", sizeText: "khoảng 2-3mm" },
  6: { fruit: "🫛", fruitName: "hạt đậu ngọt", desc: "Tim thai của bé bắt đầu đập nhịp nhàng, các chồi tay chân nhỏ xíu xuất hiện.", sizeText: "khoảng 5-6mm" },
  7: { fruit: "🫐", fruitName: "quả việt quất", desc: "Não bộ phát triển nhanh chóng, các nét trên khuôn mặt bé dần rõ nét.", sizeText: "khoảng 1cm" },
  8: { fruit: "🍇", fruitName: "quả mâm xôi", desc: "Các cơ quan quan trọng như tim, brain, phổi đang hình thành và tim thai đã đập nhịp nhàng.", sizeText: "khoảng 1.6cm" },
  9: { fruit: "🍇", fruitName: "quả nho", desc: "Bé bắt đầu có những cử động nhỏ đầu tiên mà mẹ chưa cảm nhận được.", sizeText: "khoảng 2.3cm" },
  10: { fruit: "🍊", fruitName: "quả quất", desc: "Các khớp nối chính như vai, khuỷu tay, đầu gối đã bắt đầu hoạt động.", sizeText: "khoảng 3cm" },
  11: { fruit: "🍋", fruitName: "quả sung", desc: "Hệ xương của bé bắt đầu cứng cáp hơn, bé bắt đầu tập nuốt nước ối.", sizeText: "khoảng 4cm" },
  12: { fruit: "🍋", fruitName: "quả chanh ta", desc: "Bé đã có đầy đủ ngón tay, ngón chân và có thể cử động nhẹ trong bọc ối.", sizeText: "khoảng 5.4cm, 14g" },
  13: { fruit: "🍑", fruitName: "quả mận", desc: "Vân tay duy nhất của bé đã hình thành. Bé bắt đầu biết mút ngón tay cái.", sizeText: "khoảng 7.4cm, 23g" },
  14: { fruit: "🍋", fruitName: "quả chanh vàng", desc: "Cổ bé đã dài ra giúp đầu đứng thẳng hơn. Bé bắt đầu biểu cảm khuôn mặt.", sizeText: "khoảng 8.7cm, 43g" },
  15: { fruit: "🍎", fruitName: "quả táo tây", desc: "Bé rất nhạy cảm với ánh sáng đi qua da bụng của mẹ dù mắt vẫn nhắm.", sizeText: "khoảng 10.1cm, 70g" },
  16: { fruit: "🥑", fruitName: "quả bơ", desc: "Bé đã bắt đầu nghe được âm thanh từ nhịp tim, mạch máu và giọng nói dịu dàng của mẹ.", sizeText: "khoảng 11.6cm, 100g" },
  17: { fruit: "🍅", fruitName: "quả lựu", desc: "Lớp mỡ dưới da bắt đầu tích lũy để giúp bé giữ ấm sau khi chào đời.", sizeText: "khoảng 13cm, 140g" },
  18: { fruit: "🫑", fruitName: "quả ớt chuông", desc: "Bé có thể ngáp, duỗi cơ và mẹ bắt đầu cảm nhận những cú cựa quậy nhẹ đầu tiên.", sizeText: "khoảng 14.2cm, 190g" },
  19: { fruit: "🥭", fruitName: "quả xoài", desc: "Các giác quan như thính giác, khứu giác, vị giác đang phát triển vượt bậc.", sizeText: "khoảng 15.3cm, 240g" },
  20: { fruit: "🍌", fruitName: "quả chuối", desc: "Da bé được bao phủ bởi lớp chất gây (vernix) bảo vệ. Bé nhào lộn rất tích cực.", sizeText: "khoảng 25.6cm, 300g" },
  21: { fruit: "🥕", fruitName: "quả cà rốt", desc: "Hệ tiêu hóa của bé phát triển hơn, bé bắt đầu hấp thu lượng nhỏ đường từ nước ối.", sizeText: "khoảng 26.7cm, 360g" },
  22: { fruit: "🥭", fruitName: "quả đu đủ", desc: "Vị giác hoàn thiện, bé có thể cảm nhận hương vị đồ ăn mẹ ăn qua nước ối.", sizeText: "khoảng 27.8cm, 430g" },
  23: { fruit: "🍊", fruitName: "quả bưởi chùm", desc: "Hệ hô hấp phát triển nhanh, bé tập hít thở nước ối để chuẩn bị cho cuộc sống bên ngoài.", sizeText: "khoảng 28.9cm, 500g" },
  24: { fruit: "🍈", fruitName: "quả dưa lưới", desc: "Da bé bớt nhăn nheo nhờ tích tụ thêm mỡ. Bé có thể phân biệt được giọng nói của bố và mẹ.", sizeText: "khoảng 30cm, 600g" },
  25: { fruit: "🥦", fruitName: "quả súp lơ", desc: "Các mạch máu trong phổi đang phát triển. Bé bắt đầu có chu kỳ ngủ và thức rõ ràng.", sizeText: "khoảng 34.6cm, 660g" },
  26: { fruit: "🥬", fruitName: "bắp cải đỏ", desc: "Mắt bé bắt đầu mở ra. Bé phản ứng rõ rệt hơn với âm thanh đột ngột từ bên ngoài.", sizeText: "khoảng 35.6cm, 760g" },
  27: { fruit: "🥬", fruitName: "cây xà lách", desc: "Bé đã có thể cảm nhận được nhịp tim mẹ đập nhanh hay chậm để điều chỉnh cảm xúc.", sizeText: "khoảng 36.6cm, 875g" },
  28: { fruit: "🥦", fruitName: "cây súp lơ lớn", desc: "Não bộ phát triển thần tốc với hàng tỷ tế bào thần kinh mới hình thành.", sizeText: "khoảng 37.6cm, 1kg" },
  29: { fruit: "🎃", fruitName: "quả bí ngô nhỏ", desc: "Hệ xương của bé tiếp tục cứng cáp hơn. Bé cần nhiều Canxi từ mẹ.", sizeText: "khoảng 38.6cm, 1.2kg" },
  30: { fruit: "🥥", fruitName: "quả dừa", desc: "Lượng nước ối đạt mức cao nhất. Bé bắt đầu nhấp nháy mắt thường xuyên hơn.", sizeText: "khoảng 39.9cm, 1.3kg" },
  31: { fruit: "🍍", fruitName: "quả dứa", desc: "Bé có thể tự quay đầu từ bên này sang bên kia. Lớp mỡ dưới da tiếp tục dày lên.", sizeText: "khoảng 41.1cm, 1.5kg" },
  32: { fruit: "🍉", fruitName: "quả dưa lê", desc: "Đa số các bé đã tự quay đầu xuống (ngôi thuận) để chuẩn bị chào đời.", sizeText: "khoảng 42.4cm, 1.7kg" },
  33: { fruit: "🥬", fruitName: "củ cải đường", desc: "Hệ miễn dịch của bé đang nhận các kháng thể từ mẹ để tự bảo vệ sau sinh.", sizeText: "khoảng 43.7cm, 1.9kg" },
  34: { fruit: "🍈", fruitName: "quả dưa hoàng kim", desc: "Lớp màng bảo vệ myelin quanh dây thần kinh đang hoàn thiện giúp bé phản xạ nhanh hơn.", sizeText: "khoảng 45cm, 2.1kg" },
  35: { fruit: "🍉", fruitName: "quả dưa hấu nhỏ", desc: "Không gian trong tử cung đã khá chật chội. Bé không nhào lộn nhiều nữa nhưng đạp mạnh hơn.", sizeText: "khoảng 46.2cm, 2.4kg" },
  36: { fruit: "🥬", fruitName: "cây xà lách lớn", desc: "Phổi đã gần như hoàn thiện hoàn toàn và sẵn sàng tự thở khi chào đời.", sizeText: "khoảng 47.4cm, 2.6kg" },
  37: { fruit: "🥬", fruitName: "cây cải cầu vồng", desc: "Bé được coi là đủ tháng ở tuần tiếp theo. Bé tiếp tục tăng cân khoảng 200g mỗi tuần.", sizeText: "khoảng 48.6cm, 2.9kg" },
  38: { fruit: "🧅", fruitName: "cây tỏi tây lớn", desc: "Các cơ quan đã hoàn thiện chức năng và sẵn sàng hoạt động độc lập bên ngoài tử cung.", sizeText: "khoảng 49.8cm, 3.1kg" },
  39: { fruit: "🎃", fruitName: "quả bí ngô tròn", desc: "Lớp mỡ dưới da dày giúp cơ thể bé tròn trịa. Bé nhận được rất nhiều kháng thể từ mẹ.", sizeText: "khoảng 50.7cm, 3.3kg" },
  40: { fruit: "🍉", fruitName: "quả dưa hấu lớn", desc: "Bé đã sẵn sàng chào đời! Con đang chờ đợi tín hiệu chuyển dạ từ cơ thể mẹ.", sizeText: "khoảng 51.2cm, 3.5kg" }
};

export function getPregnancyFruitAndDesc(weeks) {
  const w = Math.max(1, Math.min(40, Math.floor(weeks || 30)));
  return PREGNANCY_FRUIT_MAP[w] || PREGNANCY_FRUIT_MAP[40];
}

export function getPregnancyMontessoriSuggestion(weeks) {
  if (weeks <= 13) {
    return "Mẹ tập thở chánh niệm, nghe nhạc Kalimba nhẹ nhàng kết hợp thiền để giữ tâm trạng an yên, giảm bớt lo lắng thai kỳ.";
  } else if (weeks <= 27) {
    return "Thai giáo qua giọng nói: Bố mẹ cùng đọc truyện, trò chuyện dịu dàng hoặc hát cho bé nghe mỗi tối để gắn kết thính giác ban đầu.";
  } else {
    return "Sắp xếp và thiết kế góc phòng của bé sơ sinh theo tinh thần Montessori tối giản, an toàn, ngập tràn ánh sáng tự nhiên và học cụ kích thích thị giác.";
  }
}

export default function ChatScreen({ profile, setActiveTab, setGrowthPendingAction }) {
  const overrideStatus = typeof window !== 'undefined' ? localStorage.getItem('test_user_status') : null;
  const status = (overrideStatus === 'pregnant' || overrideStatus === 'pregnancy')
    ? 'pregnant'
    : (overrideStatus === 'born' || overrideStatus === 'postpartum')
      ? 'born'
      : (profile?.status || 'born');
  const userId = profile?.user?.uid;
  const babies = useMemo(() => [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0)), [profile?.babies]);
  const baby = babies[0] || {};
  const babyId = baby.id || (baby.name || 'baby-0').toLowerCase().replace(/\s+/g, '-');
  const dob = baby?.dob || '';
  const pregnancyInfo = profile?.pregnancyInfo || baby?.pregnancyInfo;
  const babyCount = profile?.numBabies || 1;
  const isTwin = babyCount >= 2;
  const twinWording = babyCount === 2 ? 'hai bé' : babyCount === 3 ? 'ba bé' : 'các bé';
  const twinBadgeText = babyCount === 2 ? 'Thai đôi' : babyCount === 3 ? 'Thai ba' : 'Đa thai';

  // Twin view tab state (only relevant when isTwin)
  const [twinViewTab, setTwinViewTab] = useState('Tổng quan');

  // Real-time local baby/mom logs
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [memories, setMemories] = useState([]);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);

  // Screen loading state simulation (Skeleton Loader Shimmer)
  const [isScreenLoading, setIsScreenLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScreenLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // ── DAILY CHECKLIST STATE & CALCULATION HELPERS ──
  const [completedMissions, setCompletedMissions] = useState(() => {
    try {
      const saved = localStorage.getItem('montessori_completed_missions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleMission = useCallback((missionId) => {
    setCompletedMissions(prev => {
      const next = { ...prev, [missionId]: !prev[missionId] };
      try {
        localStorage.setItem('montessori_completed_missions', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // ── BORN JOURNEY — expand/collapse state per mission item ──
  const [expandedBornMissionIds, setExpandedBornMissionIds] = useState({});
  const toggleBornMissionExpand = useCallback((key) => {
    setExpandedBornMissionIds(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const pregnancyDayIndex = useMemo(() => {
    const override = typeof window !== 'undefined' ? localStorage.getItem('test_pregnancy_day_index') : null;
    if (override !== null && override !== undefined && override !== '') {
      const parsed = parseInt(override, 10);
      return isNaN(parsed) ? null : parsed;
    }
    
    const dueDateStr = profile?.dueDate || pregnancyInfo?.dueDate;
    const dueDate = parseProfileDate(dueDateStr);
    if (!dueDate) return null;
    
    const today = todayLocalMidnight();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return 280 - diffDays;
  }, [profile, pregnancyInfo]);

  const babyAgeDays = useMemo(() => {
    const override = typeof window !== 'undefined' ? localStorage.getItem('test_baby_age_days') : null;
    if (override !== null && override !== undefined && override !== '') {
      const parsed = parseInt(override, 10);
      return isNaN(parsed) ? null : parsed;
    }
    
    const childDobStr = baby?.dob || dob;
    const childDob = parseProfileDate(childDobStr);
    if (!childDob) return null;
    
    const today = todayLocalMidnight();
    const diffTime = today.getTime() - childDob.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }, [baby, dob]);

  const getDailyMissionsData = useCallback(() => {
    const isPregnant = status === 'pregnant';
    
    if (isPregnant) {
      const dayIndex = pregnancyDayIndex;
      if (dayIndex === null) {
        return { error: 'missing_due_date' };
      }
      if (dayIndex < 56) {
        return { hidden: true };
      }
      const missionDay = dayIndex - 55;
      const dayData = PREGNANCY_DAILY_MISSIONS?.days?.[missionDay];
      if (!dayData || dayData.length === 0) {
        return { hidden: true };
      }
      return {
        title: `Nhiệm vụ Ngày ${missionDay} thai kỳ`,
        missions: dayData,
        stage: 'pregnancy'
      };
    } else {
      const ageDays = babyAgeDays;
      if (ageDays === null) {
        return { error: 'missing_birth_date' };
      }
      
      let missionDay = 0;
      let dataset = null;
      let titleLabel = '';
      
      if (ageDays >= 0 && ageDays <= 273) {
        dataset = BABY_0_8_DAILY_MISSIONS;
        missionDay = ageDays + 1;
        titleLabel = `Nhiệm vụ Ngày ${missionDay}`;
      } else if (ageDays >= 274 && ageDays <= 547) {
        dataset = BABY_9_18_DAILY_MISSIONS;
        missionDay = ageDays - 274 + 1;
        titleLabel = `Nhiệm vụ Ngày ${missionDay}`;
      } else if (ageDays >= 548 && ageDays <= 1094) {
        dataset = BABY_18_36_DAILY_MISSIONS;
        missionDay = ageDays - 548 + 1;
        titleLabel = `Nhiệm vụ Ngày ${missionDay}`;
      } else {
        return { hidden: true };
      }
      
      const dayData = dataset?.days?.[missionDay];
      if (!dayData || dayData.length === 0) {
        return { hidden: true };
      }
      
      return {
        title: titleLabel,
        missions: dayData,
        stage: 'postpartum'
      };
    }
  }, [status, pregnancyDayIndex, babyAgeDays]);

  const renderDailyMissionsSection = () => {
    const data = getDailyMissionsData();
    if (data.hidden) return null;
    
    if (data.error === 'missing_due_date') {
      return (
        <div className="journey-section">
          <div className="journey-section-header">
            <h3 className="journey-section-title">Hành trình hôm nay</h3>
          </div>
          <div className="journey-fallback-card">
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#55685B',
              fontWeight: '500'
            }}>
              Cập nhật ngày dự sinh để nhận nhiệm vụ thai kỳ phù hợp mỗi ngày.
            </p>
            <button
              className="journey-fallback-btn"
              onClick={() => {
                if (setGrowthPendingAction) setGrowthPendingAction('openEditProfile');
                setActiveTab('growth');
              }}
            >
              Cập nhật hồ sơ
            </button>
          </div>
        </div>
      );
    }
    
    if (data.error === 'missing_birth_date') {
      return (
        <div className="journey-section">
          <div className="journey-section-header">
            <h3 className="journey-section-title">Hành trình hôm nay</h3>
          </div>
          <div className="journey-fallback-card">
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#55685B',
              fontWeight: '500'
            }}>
              Cập nhật ngày sinh của bé để nhận hoạt động phù hợp mỗi ngày.
            </p>
            <button
              className="journey-fallback-btn"
              onClick={() => {
                if (setGrowthPendingAction) setGrowthPendingAction('openEditProfile');
                setActiveTab('growth');
              }}
            >
              Cập nhật hồ sơ
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="journey-section">
        <div className="journey-section-header">
          <h3 className="journey-section-title">Hành trình hôm nay</h3>
          <span className="journey-section-link" onClick={handleSuggestionAction}>Gợi ý hoạt động</span>
        </div>
        <div className="journey-card">
          {data.missions.map((item, index) => {
            const isCompleted = !!completedMissions[item.id];
            
            let iconWrapClass = `idx-${index % 3}`;
            if (item.type) {
              iconWrapClass = `type-${item.type}`;
            }
            
            let taskIcon = '🌱';
            if (item.icon === 'hand' || item.type === 'fine_motor' || item.type === 'gross_motor') taskIcon = '👐';
            else if (item.icon === 'home' || item.type === 'environment') taskIcon = '🏠';
            else if (item.icon === 'sparkle' || item.type === 'sensory') taskIcon = '✨';
            else if (item.icon === 'book' || item.type === 'fixed' || item.type === 'mindfulness') taskIcon = '🧘';
            else if (item.type === 'connection') taskIcon = '🤝';
            else if (item.type === 'care' || item.type === 'hygiene') taskIcon = '🍼';
            
            return (
              <div key={item.id || index} className="journey-item" style={{
                opacity: isCompleted ? 0.75 : 1,
                transition: 'opacity 0.2s ease'
              }}>
                <div className={`journey-icon-wrap ${iconWrapClass}`}>
                  <span style={{ fontSize: '18px' }}>{taskIcon}</span>
                </div>
                <div className="journey-content" style={{ textAlign: 'left' }}>
                  <span className="journey-category">{item.category}</span>
                  <h4 className="journey-item-title" style={{
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? '#7B8A82' : '#1F2D26'
                  }}>{item.title}</h4>
                  <p className="journey-item-desc">{item.description}</p>
                  {item.duration && (
                    <span className="journey-item-duration">
                      <ClockIcon size={10} className="journey-duration-clock" />
                      {item.duration}
                    </span>
                  )}
                </div>
                <button
                  className={`journey-btn ${isCompleted ? 'completed' : ''}`}
                  onClick={() => toggleMission(item.id)}
                >
                  {isCompleted ? 'Hoàn thành ✓' : 'Làm ngay'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── BORN-ONLY version of the daily missions section with SVG icons, 'Cùng làm', and expand/collapse ──
  const renderBornDailyMissionsSection = () => {
    const data = getDailyMissionsData();
    if (data.hidden) return null;

    if (data.error === 'missing_birth_date') {
      return (
        <div className="journey-section">
          <div className="journey-section-header">
            <h3 className="journey-section-title">Hành trình hôm nay</h3>
          </div>
          <div className="journey-fallback-card">
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: '#55685B', fontWeight: '500' }}>
              Cập nhật ngày sinh của bé để nhận hoạt động phù hợp mỗi ngày.
            </p>
            <button
              className="journey-fallback-btn"
              onClick={() => {
                if (setGrowthPendingAction) setGrowthPendingAction('openEditProfile');
                setActiveTab('growth');
              }}
            >
              Cập nhật hồ sơ
            </button>
          </div>
        </div>
      );
    }

    // SVG icon renderer — line-art, no emoji
    const renderBornMissionIcon = (type, icon) => {
      const t = (type || '').toLowerCase();
      const ic = (icon || '').toLowerCase();

      // Hand / Fine motor / Gross motor
      if (ic === 'hand' || t === 'fine_motor' || t === 'gross_motor' || t === 'vận động tay') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-4 0v5"/>
            <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
            <path d="M6 14a4 4 0 0 0 4 4h4a6 6 0 0 0 6-6v-1a2 2 0 0 0-2-2h-1"/>
          </svg>
        );
      }
      // Home / Environment / Order
      if (ic === 'home' || t === 'environment' || t === 'môi trường' || t === 'trật tự') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
            <path d="M9 21V12h6v9"/>
          </svg>
        );
      }
      // Sparkle / Sensory
      if (ic === 'sparkle' || t === 'sensory' || t === 'giác quan') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        );
      }
      // Eye / Observation
      if (ic === 'eye' || t === 'observation' || t === 'quan sát') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        );
      }
      // Book / Language / Cognitive / Mindfulness
      if (ic === 'book' || t === 'language' || t === 'cognitive' || t === 'ngôn ngữ' || t === 'nhận thức' || t === 'fixed' || t === 'mindfulness') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        );
      }
      // Heart / Connection
      if (ic === 'heart' || t === 'connection' || t === 'kết nối' || t === 'gắn kết') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        );
      }
      // Droplet / Self care / Hygiene / Care
      if (ic === 'droplet' || t === 'self_care' || t === 'hygiene' || t === 'care' || t === 'tự lập' || t === 'vệ sinh') {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
        );
      }
      // Leaf / Nature — default fallback
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/>
        </svg>
      );
    };

    // Icon wrapper color class by type
    const getBornIconColor = (type) => {
      const t = (type || '').toLowerCase();
      if (t === 'fine_motor' || t === 'gross_motor' || t === 'vận động tay') return { color: '#2F6B4F', bg: '#E8F4EE' };
      if (t === 'environment' || t === 'môi trường' || t === 'trật tự') return { color: '#7B6A3E', bg: '#F5F0E4' };
      if (t === 'sensory' || t === 'giác quan') return { color: '#4A6FA5', bg: '#EBF0F8' };
      if (t === 'language' || t === 'ngôn ngữ') return { color: '#5A4A7B', bg: '#EEE8F5' };
      if (t === 'connection' || t === 'kết nối') return { color: '#B85472', bg: '#F8EBF0' };
      if (t === 'care' || t === 'hygiene' || t === 'self_care') return { color: '#3A7DB5', bg: '#E5F0F8' };
      if (t === 'cognitive' || t === 'nhận thức') return { color: '#5A6B3A', bg: '#EBF0E2' };
      if (t === 'observation') return { color: '#6B4F2F', bg: '#F0EAE2' };
      return { color: '#2F6B4F', bg: '#E8F4EE' }; // default sage
    };

    return (
      <div className="journey-section">
        <div className="journey-section-header">
          <h3 className="journey-section-title">Hành trình hôm nay</h3>
          <span className="journey-section-link" onClick={handleSuggestionAction}>Gợi ý hoạt động</span>
        </div>
        <div className="journey-card baby-journey-card">
          {data.missions.map((item, index) => {
            const isCompleted = !!completedMissions[item.id];
            const expandKey = item.id || `${index}-${item.title}`;
            const isExpanded = !!expandedBornMissionIds[expandKey];
            const iconColors = getBornIconColor(item.type);

            return (
              <div key={expandKey} className="journey-item" style={{
                opacity: isCompleted ? 0.75 : 1,
                transition: 'opacity 0.2s ease'
              }}>
                {/* SVG Icon wrapper — scoped .baby-journey-icon-wrap */}
                <div
                  className="baby-journey-icon-wrap"
                  style={{ background: iconColors.bg, color: iconColors.color }}
                >
                  {renderBornMissionIcon(item.type, item.icon)}
                </div>

                <div className="journey-content baby-journey-content" style={{ textAlign: 'left' }}>
                  <span className="journey-category">{item.category}</span>
                  <h4 className="journey-item-title baby-journey-item-title" style={{
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    color: isCompleted ? '#7B8A82' : '#1F2D26'
                  }}>{item.title}</h4>

                  {/* Description with 2-line clamp + expand toggle */}
                  <p className={`baby-journey-item-desc${isExpanded ? '' : ' is-clamped'}`}>
                    {item.description}
                  </p>
                  {item.description && item.description.length > 80 && (
                    <button
                      type="button"
                      className="baby-journey-more-btn"
                      onClick={() => toggleBornMissionExpand(expandKey)}
                    >
                      {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}

                  {item.duration && (
                    <span className="journey-item-duration">
                      <ClockIcon size={10} className="journey-duration-clock" />
                      {item.duration}
                    </span>
                  )}
                </div>

                {/* Action button — 'Cùng làm' instead of 'Làm ngay' */}
                <button
                  className={`baby-journey-btn${isCompleted ? ' completed' : ''}`}
                  onClick={() => toggleMission(item.id)}
                >
                  {isCompleted ? 'Hoàn thành ✓' : 'Cùng làm'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPostpartumCarouselSection = () => {
    if (babyAgeDays === null) return null;
    
    const isInfant0To8 = babyAgeDays >= 0 && babyAgeDays <= 273;
    const isToddler9To18 = babyAgeDays >= 274 && babyAgeDays <= 547;
    const isChild18To36 = babyAgeDays >= 548 && babyAgeDays <= 1094;
    let carouselMissions = [];
    
    if (isInfant0To8) {
      const groupIndex = babyAgeDays % 5;
      const startIndex = groupIndex * 3;
      carouselMissions = BORN_TODAY_ACTIVITIES.infant_0_8.slice(startIndex, startIndex + 3);
    } else if (isToddler9To18) {
      const daysInStage = babyAgeDays - 274;
      const groupIndex = ((daysInStage % 7) + 7) % 7;
      const startIndex = groupIndex * 3;
      carouselMissions = BORN_TODAY_ACTIVITIES.toddler_9_18.slice(startIndex, startIndex + 3);
    } else if (isChild18To36) {
      const daysInStage = babyAgeDays - 548;
      const groupIndex = ((daysInStage % 7) + 7) % 7;
      const startIndex = groupIndex * 3;
      carouselMissions = BORN_TODAY_ACTIVITIES.child_18_36.slice(startIndex, startIndex + 3);
    } else {
      // Bé lớn hơn 3 tuổi (>= 1095 ngày): Ẩn sạch section
      return null;
    }
    
    if (!carouselMissions || carouselMissions.length === 0) return null;
    
    return (
      <div className="preg-grow-together-section">
        <div className="preg-section-header">
          <h3 className="preg-section-title">Hôm nay, mình cùng con</h3>
          <span className="preg-section-link" onClick={handleSuggestionAction}>Xem chi tiết</span>
        </div>
        <div className="preg-horizontal-scroll-container">
          {(() => {
            const babyImages = [
              'quote-images/quote-01-practical-life.webp',
              'quote-images/quote-02-pompom.webp',
              'quote-images/quote-03-montessori-corner.webp',
              'quote-images/quote-04-wiping-table.webp',
              'quote-images/quote-05-mom-observing.webp',
              'quote-images/quote-06-wooden-blocks.webp',
              'quote-images/quote-07-window-tray.webp',
              'quote-images/quote-08-reading-book.webp',
              'quote-images/quote-09-self-feeding.webp',
              'quote-images/quote-10-plant-wooden-toys.webp'
            ];
            
            return carouselMissions.map((act, i) => {
              const imgPath = act.image
                ? `${import.meta.env.BASE_URL}${act.image.startsWith('/') ? act.image.slice(1) : act.image}`
                : `${import.meta.env.BASE_URL}${babyImages[((babyAgeDays || 0) + i) % 10]}`;
              
              let tagClass = 'tag-connect';
              const tagVal = act.tag || act.category || '';
              const typeVal = act.type || '';
              
              const selfCareTags = ['Tự lập', 'Tự chăm sóc', 'Vệ sinh', 'Chăm sóc', 'Nhịp ngủ'];
              const montessoriTags = [
                'Môi trường', 'Trật tự', 'An toàn', 'Thiên nhiên', 'Khám phá', 
                'Quan sát', 'Tập trung', 'Ngôn ngữ', 'Vận động tay', 'Việc nhà', 'Nhận thức'
              ];
              
              if (selfCareTags.includes(tagVal) || typeVal === 'care' || typeVal === 'hygiene') {
                tagClass = 'tag-selfcare';
              } else if (montessoriTags.includes(tagVal) || tagVal === 'Môi trường' || tagVal === 'Trật tự' || typeVal === 'environment') {
                tagClass = 'tag-montessori';
              }
              
              return (
                <div key={act.id || i} className="preg-scroll-card" onClick={handleSuggestionAction} style={{ cursor: 'pointer' }}>
                  <div className="preg-card-image-wrap">
                    <img
                      src={imgPath}
                      alt={act.title}
                      className="preg-card-img"
                    />
                  </div>
                  <div className="preg-card-body">
                    <span className={`preg-card-tag-inline ${tagClass}`}>{tagVal}</span>
                    <h4 className="preg-card-title">{act.title}</h4>
                    <p className="preg-card-subtitle">{act.subtitle || act.description}</p>
                    <div className="preg-card-footer">
                      <span className="preg-card-duration">
                        <ClockIcon size={12} className="preg-card-clock-icon" />
                        {act.duration}
                      </span>
                      <BookmarkIcon size={14} className="preg-card-bookmark" />
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  // Active bottom sheets
  const [activeBottomSheet, setActiveBottomSheet] = useState(null); // 'nutrition' | 'sleep' | 'diaper' | 'growth' | 'kick' | 'contractions' | 'preg_weight' | 'preg_reminders' | 'preg_clinic' | 'preg_emotion'
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status transition, Clinic and Emotion states
  const [isTransitionCardDismissed, setIsTransitionCardDismissed] = useState(false);
  const getTodayLocalyyyymmdd = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [clinicNote, setClinicNote] = useState('');
  const [nextApptDate, setNextApptDate] = useState('');
  const [visitDate, setVisitDate] = useState(getTodayLocalyyyymmdd());
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showVisitDateCalendar, setShowVisitDateCalendar] = useState(false);
  const [showNextApptDateCalendar, setShowNextApptDateCalendar] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isClinicLoading, setIsClinicLoading] = useState(false);
  const [isSavingClinic, setIsSavingClinic] = useState(false);
  const [saveClinicError, setSaveClinicError] = useState(false);
  const [loadClinicInfoError, setLoadClinicInfoError] = useState(false);
  const [loadQuickSuggestionsError, setLoadQuickSuggestionsError] = useState(false);
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  useEffect(() => {
    if (activeBottomSheet === 'preg_clinic') {
      setVisitDate(getTodayLocalyyyymmdd());
      setClinicNote('');
      setNextApptDate('');
      setReminderEnabled(true);
      setShowInfoModal(false);
      setSaveClinicError(false);
      setLoadClinicInfoError(false);
      setLoadQuickSuggestionsError(false);
      setShowValidationWarning(false);

      setIsClinicLoading(true);
      const timer = setTimeout(() => {
        setIsClinicLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    } else if (activeBottomSheet === 'preg_emotion') {
      setSelectedEmotions([]);
      setEmotionIntensity('Vừa');
      setEmotionNote('');
      setSaveEmotionError(false);
      setLoadEmotionError(false);
      setShowEmotionValidationWarning(false);
      setShowMaxEmotionsWarning(false);

      setIsEmotionLoading(true);
      const timer = setTimeout(() => {
        setIsEmotionLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeBottomSheet]);

  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [emotionIntensity, setEmotionIntensity] = useState('Vừa');
  const [emotionNote, setEmotionNote] = useState('');
  const [isEmotionLoading, setIsEmotionLoading] = useState(false);
  const [isSavingEmotion, setIsSavingEmotion] = useState(false);
  const [saveEmotionError, setSaveEmotionError] = useState(false);
  const [loadEmotionError, setLoadEmotionError] = useState(false);
  const [showEmotionValidationWarning, setShowEmotionValidationWarning] = useState(false);
  const [showMaxEmotionsWarning, setShowMaxEmotionsWarning] = useState(false);

  // Dynamic age calculation & update time helpers
  const getDaysRemaining = () => {
    const dueDateStr = profile?.dueDate || pregnancyInfo?.dueDate;
    if (!dueDateStr) return null;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPregnancyWeekInfo = () => {
    const w = getCurrentPregnancyWeek(profile, null);
    const eddStr = profile?.dueDate || pregnancyInfo?.dueDate;
    let d = 0;
    if (eddStr) {
      const edd = parseLocalDate(eddStr);
      if (edd) {
        const today = todayLocal();
        const daysLeft = Math.round((edd - today) / 86400000);
        const currentPregnancyDays = 280 - daysLeft;
        d = Math.max(0, Math.min(6, currentPregnancyDays % 7));
      }
    }
    return { weeks: w || parseInt(pregnancyInfo?.weeks || 30, 10), days: d };
  };

  const getDetailedAgeLabel = () => {
    if (!dob) {
      return 'Chưa cập nhật ngày sinh';
    }
    const years = ageInfo?.years || 0;
    const months = ageInfo?.months || 0;
    const days = ageInfo?.days || 0;
    const babyAgeMonths = years * 12 + months;

    if (babyAgeMonths < 12) {
      if (months === 0) {
        return days > 0 ? `${days} ngày tuổi` : 'Mới sinh';
      }
      return `${months} tháng tuổi`;
    } else {
      return `${years} tuổi ${months} tháng`;
    }
  };

  const getAgeString = () => {
    if (status === 'pregnant') {
      const { weeks } = getPregnancyWeekInfo();
      return `Tuần thai ${weeks}`;
    }
    return getDetailedAgeLabel();
  };

  const getLatestUpdateTime = () => {
    const times = [];
    nutritionLogs.forEach(log => {
      if (log.createdAt) {
        try {
          times.push(log.createdAt.toDate ? log.createdAt.toDate().getTime() : new Date(log.createdAt).getTime());
        } catch(e) {}
      }
    });
    activityLogs.forEach(log => {
      if (log.createdAt) {
        try {
          times.push(log.createdAt.toDate ? log.createdAt.toDate().getTime() : new Date(log.createdAt).getTime());
        } catch(e) {}
      }
    });
    if (times.length === 0) return '10:45';
    const latest = new Date(Math.max(...times));
    return latest.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSuggestionAction = () => {
    setIsChatOpen(true);
    sendMessage(`Hãy gợi ý chi tiết hoạt động Montessori phát triển kỹ năng hôm nay cho ${baby?.name || 'Cốm'} ${getAgeString()} theo phương pháp Montessori nhé!`);
  };

  // Chat core states
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [sessionId]                       = useState(() => uuidv4());
  const [history,       setHistory]       = useState([]);
  const [pendingImgs,   setPendingImgs]   = useState([]);
  const [uploadingImg,  setUploadingImg]  = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);
  const assistantContext = getAssistantContext(profile);

  // 1. Bottom Sheet Specific Inputs
  // A. Nutrition Sheet inputs
  const [nutriTab, setNutriTab] = useState('breast_direct'); // 'breast_direct' | 'breast_pump' | 'formula' | 'solid'
  const [breastSide, setBreastSide] = useState('left'); // 'left' | 'right'
  const [breastDirectTimerActive, setBreastDirectTimerActive] = useState(false);
  const [breastLeftSec, setBreastLeftSec] = useState(0);
  const [breastRightSec, setBreastRightSec] = useState(0);
  const directTimerRef = useRef(null);

  const [nutriMl, setNutriMl] = useState(150);
  const [nutriSuaMe, setNutriSuaMe] = useState(true); // true = Sữa mẹ, false = Sữa công thức
  const [solidDetails, setSolidDetails] = useState('');
  const [pumpLeftMl, setPumpLeftMl] = useState(60);
  const [pumpRightMl, setPumpRightMl] = useState(60);

  // Redesigned Nutrition Sheet States
  const [mealType, setMealType] = useState('breakfast'); // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  const [appetite, setAppetite] = useState('good'); // 'good' | 'medium' | 'poor' | 'refused'
  const [foodNote, setFoodNote] = useState('');
  const [milkType, setMilkType] = useState('breast'); // 'breast' | 'formula' | 'fresh'
  const [amountMl, setAmountMl] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [waterInputMode, setWaterInputMode] = useState('ml'); // 'ml' | 'cup'
  const [isSavingNutri, setIsSavingNutri] = useState(false);
  const [saveNutriError, setSaveNutriError] = useState(false);

  // B. Sleep Sheet inputs
  const [sleepActive, setSleepActive] = useState(false);
  const [sleepSecs, setSleepSecs] = useState(0);
  const [sleepStartStr, setSleepStartStr] = useState('');
  const [sleepTag, setSleepTag] = useState('Tự ngủ'); // 'Tự ngủ' | 'Ti mẹ' | 'Bế ru'
  const sleepTimerRef = useRef(null);

  // Optimized sleep sheet states
  const [sleepTab, setSleepTab] = useState('live'); // 'live' | 'manual'
  const [sleepFlowState, setSleepFlowState] = useState('idle'); // 'idle' | 'running' | 'finished'
  const [sleepStartTime, setSleepStartTime] = useState(null);
  const [sleepEndTime, setSleepEndTime] = useState(null);
  const [sleepType, setSleepType] = useState('day'); // 'day' | 'night'
  const [sleepNote, setSleepNote] = useState('');
  const [manualStartStr, setManualStartStr] = useState('');
  const [manualEndStr, setManualEndStr] = useState('');
  const [showSleepResetConfirm, setShowSleepResetConfirm] = useState(false);
  const [hasManuallySetSleepType, setHasManuallySetSleepType] = useState(false);
  const [isSavingSleep, setIsSavingSleep] = useState(false);
  const [saveSleepError, setSaveSleepError] = useState(false);

  const formatHHMM = (date) => {
    if (!date) return '';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const getManualDuration = () => {
    if (!manualStartStr || !manualEndStr) return 0;
    const [sH, sM] = manualStartStr.split(':').map(Number);
    const [eH, eM] = manualEndStr.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) {
      diff += 24 * 60; // Crosses midnight
    }
    return diff;
  };

  const handleManualStartChange = (val) => {
    setManualStartStr(val);
    if (!hasManuallySetSleepType && val) {
      const [hh, mm] = val.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        const totalMinutes = hh * 60 + mm;
        setSleepType(totalMinutes >= 360 && totalMinutes <= 1080 ? 'day' : 'night');
      }
    }
  };

  const handleSelectSleepType = (type) => {
    setSleepType(type);
    setHasManuallySetSleepType(true);
  };

  // C. Diaper Sheet inputs
  const [diaperType, setDiaperType] = useState('pee'); // 'pee' | 'poop' | 'both'
  const [diaperColor, setDiaperColor] = useState('yellow'); // 'yellow' | 'mustard' | 'green' | 'brown'
  const [diaperDesc, setDiaperDesc] = useState('Bình thường');

  // Potty / Toilet / Diaper redesign states
  const [pottyCategory, setPottyCategory] = useState('diaper'); // 'diaper' | 'potty' | 'toilet'
  const [pottyDiaperType, setPottyDiaperType] = useState(null); // 'wet' | 'dirty' | 'both' | 'dry' | null
  const [pottyResult, setPottyResult] = useState(null); // 'success' | 'no_result' | 'practice' | null
  const [pottyToiletType, setPottyToiletType] = useState(null); // 'pee' | 'poop' | 'both' | null
  const [pottyNote, setPottyNote] = useState('');
  const [pottyTimeStr, setPottyTimeStr] = useState('');
  const [isSavingPotty, setIsSavingPotty] = useState(false);
  const [savePottyError, setSavePottyError] = useState(false);

  // D. Growth Sheet inputs
  const [growthWeight, setGrowthWeight] = useState(7.5);
  const [growthHeight, setGrowthHeight] = useState(68.2);

  // E. Pregnancy Kick inputs
  const [kickActive, setKickActive] = useState(false);
  const [kickCount, setKickCount] = useState(0);
  const [kickSecs, setKickSecs] = useState(0);
  const kickTimerRef = useRef(null);
  const [kickStartTime, setKickStartTime] = useState(null);
  const [isSavingKick, setIsSavingKick] = useState(false);
  const [saveKickError, setSaveKickError] = useState(false);

  // F. Pregnancy Contractions inputs
  const [contraActive, setContraActive] = useState(false);
  const [contraCount, setContraCount] = useState(0);
  const [contraSecs, setContraSecs] = useState(0);
  const contraTimerRef = useRef(null);
  
  // Advanced contraction tracking states
  const [inContraction, setInContraction] = useState(false);
  const [contractionCurrentSecs, setContractionCurrentSecs] = useState(0);
  const [contractionList, setContractionList] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [isSavingContra, setIsSavingContra] = useState(false);
  const [saveContraError, setSaveContraError] = useState(false);
  const [currentContractionStartTime, setCurrentContractionStartTime] = useState(null);

  // G. Pregnancy Weight inputs
  const [pregWeight, setPregWeight] = useState(58.5);
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [saveWeightError, setSaveWeightError] = useState(false);
  const [showPrePregInput, setShowPrePregInput] = useState(false);
  const [prePregInputValue, setPrePregInputValue] = useState('');
  const [isSavingPrePreg, setIsSavingPrePreg] = useState(false);

  // 2. Compute dynamic handbook & age data
  const ageInfo = calculateDetailedAge(dob, status, pregnancyInfo);
  const handbook = getHandbookForAge(ageInfo);

  // Subscriptions to Firestore Logs (unified pathways to TrackerScreen)
  useEffect(() => {
    if (!userId) return;

    const nutritionQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'nutritionLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubNutrition = onSnapshot(nutritionQuery, (snap) => {
      setNutritionLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const activityQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'activityLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubActivity = onSnapshot(activityQuery, (snap) => {
      setActivityLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    const momentsQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'moments'),
      orderBy('createdAt', 'desc')
    );
    const unsubMoments = onSnapshot(momentsQuery, (snap) => {
      setMemories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    return () => {
      unsubNutrition();
      unsubActivity();
      unsubMoments();
    };
  }, [userId, babyId]);

  // Timers handler
  // Bú trực tiếp (Breastfeeding Stopwatch)
  useEffect(() => {
    if (breastDirectTimerActive) {
      directTimerRef.current = setInterval(() => {
        if (breastSide === 'left') setBreastLeftSec(s => s + 1);
        else setBreastRightSec(s => s + 1);
      }, 1000);
    } else {
      if (directTimerRef.current) {
        clearInterval(directTimerRef.current);
        directTimerRef.current = null;
      }
    }
    return () => {
      if (directTimerRef.current) clearInterval(directTimerRef.current);
    };
  }, [breastDirectTimerActive, breastSide]);

  // Giấc ngủ (Sleep Stopwatch)
  useEffect(() => {
    if (sleepActive) {
      sleepTimerRef.current = setInterval(() => {
        setSleepSecs(s => s + 1);
      }, 1000);
    } else {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepActive]);

  // Đếm máy thai (Pregnancy Kick Counter)
  useEffect(() => {
    if (kickActive) {
      kickTimerRef.current = setInterval(() => {
        setKickSecs(s => s + 1);
      }, 1000);
    } else {
      if (kickTimerRef.current) {
        clearInterval(kickTimerRef.current);
        kickTimerRef.current = null;
      }
    }
    return () => {
      if (kickTimerRef.current) clearInterval(kickTimerRef.current);
    };
  }, [kickActive]);

  // Đếm cơn gò (Pregnancy Contractions Counter)
  useEffect(() => {
    if (contraActive) {
      contraTimerRef.current = setInterval(() => {
        setContraSecs(s => s + 1);
        if (inContraction) {
          setContractionCurrentSecs(c => c + 1);
        }
      }, 1000);
    } else {
      if (contraTimerRef.current) {
        clearInterval(contraTimerRef.current);
        contraTimerRef.current = null;
      }
    }
    return () => {
      if (contraTimerRef.current) clearInterval(contraTimerRef.current);
    };
  }, [contraActive, inContraction]);

  // Reset and initialize Contraction counter startedAt timestamp
  useEffect(() => {
    if (activeBottomSheet === 'contractions') {
      setContraSecs(0);
      setContraCount(0);
      setContraActive(true); // Automatically starts running session
      setInContraction(false);
      setContractionCurrentSecs(0);
      setContractionList([]);
      setSessionStartTime(new Date().toISOString());
      setSaveContraError(false);
    }
  }, [activeBottomSheet]);

  // Reset and initialize Kick counter startedAt timestamp
  useEffect(() => {
    if (activeBottomSheet === 'kick') {
      setKickSecs(0);
      setKickCount(0);
      setKickActive(false);
      setKickStartTime(new Date().toISOString());
      setSaveKickError(false);
    }
  }, [activeBottomSheet]);

  // Sound synthesis chime Kalimba on safe load
  const triggerChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };
      const now = ctx.currentTime;
      playTone(523.25, now, 1.0);
      playTone(659.25, now + 0.12, 0.8);
      playTone(784.00, now + 0.24, 0.6);
    } catch (e) {
      console.warn("Kalimba chime failed:", e);
    }
  };

  // Chat message scrolling
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [messages, isLoading, isChatOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const pickImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 9);
    setPendingImgs(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f), id: uuidv4() }))].slice(0, 9));
    e.target.value = '';
  };

  const removeImg = (id) => setPendingImgs(prev => prev.filter(p => p.id !== id));

  // Send message chatbot logic
  const getDynamicContext = useCallback(() => {
    const todayStr = getTodayLocalyyyymmdd();
    const todayNutrition = nutritionLogs.filter(l => l.date === todayStr);
    const todayActivity = activityLogs.filter(l => l.date === todayStr);
    
    let logsDesc = '';
    if (todayNutrition.length === 0 && todayActivity.length === 0) {
      logsDesc = 'Chưa có ghi nhận hoạt động nào hôm nay.';
    } else {
      logsDesc = 'Các hoạt động đã ghi nhận hôm nay:\n' + 
        [
          ...todayNutrition.map(l => `[${l.time}] Ăn uống - ${l.type === 'breast_direct' ? 'Bú mẹ' : l.type === 'breast_pump' ? 'Bú sữa mẹ vắt' : l.type === 'formula' ? 'Bú sữa công thức' : l.type === 'solid' ? 'Ăn dặm' : 'Ăn'} (${l.amountMl ? `${l.amountMl}ml` : ''}${l.foodDetails || ''})`),
          ...todayActivity.map(l => `[${l.time}] ${l.type === 'sleep' || l.type === 'day_sleep' || l.type === 'night_sleep' ? 'Ngủ' : l.type === 'diaper' ? 'Thay tã' : l.type === 'growth' ? 'Tăng trưởng' : l.type === 'preg_kick' ? 'Thai máy' : l.type === 'preg_contraction' ? 'Cơn gò' : l.type === 'preg_weight' ? 'Cân nặng mẹ' : l.type === 'preg_reminders' ? 'Vi chất' : 'Khác'} - ${l.note || ''}`)
        ].join('\n');
    }

    if (status === 'pregnant') {
      const { weeks, days } = getPregnancyWeekInfo();
      const fruitInfo = getPregnancyFruitAndDesc(weeks);
      const daysRemaining = getDaysRemaining();
      return `[Ngữ cảnh hệ thống Montessori AI]
Người dùng: Mẹ ${profile?.momName || 'Maud'}, đang mang thai bé ${baby?.name || 'Cốm'}.
Tuần thai: Tuần ${weeks} + ${days} ngày.
Kích thước thai nhi: Bằng một ${fruitInfo.fruitName} ${fruitInfo.fruit} (${fruitInfo.sizeText}). Mô tả phát triển: "${fruitInfo.desc}".
Thời gian dự sinh: Còn ${daysRemaining !== null ? `${daysRemaining} ngày` : 'chưa thiết lập ngày dự sinh'}.
${logsDesc}`;
    } else {
      const detailAge = getDetailedAgeLabel();
      const devMilestone = handbook?.milestone || 'Phát triển khỏe mạnh toàn diện.';
      return `[Ngữ cảnh hệ thống Montessori AI]
Người dùng: Mẹ ${profile?.momName || 'Maud'}, em bé: ${baby?.name || 'Cốm'}.
Tuổi của bé: ${detailAge} (${ageInfo?.months || 0} tháng tuổi).
Mốc phát triển tháng tuổi này: "${devMilestone}".
${logsDesc}`;
    }
  }, [status, profile, baby, nutritionLogs, activityLogs, ageInfo, handbook]);

  // Send message chatbot logic
  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim();
    if ((!question && pendingImgs.length === 0) || isLoading) return;

    let imageUrls = [];
    if (pendingImgs.length > 0 && CLOUD_NAME && UPLOAD_PRESET) {
      setUploadingImg(true);
      imageUrls = await Promise.all(pendingImgs.map(p => uploadToCloudinary(p.file)));
      setUploadingImg(false);
    }
    const userMsg = { id: uuidv4(), role: 'user', content: question, images: imageUrls, status: 'sent', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImgs([]);
    setIsLoading(true);

    try {
      const ctx = getDynamicContext();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${ctx}\n\nHỏi: ${question || '(Gửi ảnh)'}`, sessionId, history }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const aiMsg = { id: uuidv4(), role: 'assistant', content: data.answer, status: 'delivered', timestamp: new Date() };
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], status: 'seen' },
        aiMsg,
      ]);
      setHistory(prev => [...prev, { userMessage: question, aiMessage: data.answer }]);
    } catch (err) {
      const errMsg = err?.name === 'AbortError'
        ? '⏳ Trợ lý AI đang bận, mẹ thử lại sau nhé.'
        : '❌ Lỗi kết nối. Vui lòng thử lại.';
      setMessages(prev => [...prev, { id: uuidv4(), role: 'error', content: errMsg, status: 'failed', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, history, pendingImgs, profile, getDynamicContext]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]); setHistory([]);
    fetch(`${API_BASE}/chat/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleConfirmDelete = () => {
    clearChat();
    setShowDeleteConfirm(false);
    showToast("Đã xoá cuộc trò chuyện");
  };

  const canSend = (input.trim() || pendingImgs.length > 0) && !isLoading && !uploadingImg;

  // 3. Database Saving Methods (Saves dynamically into Firestore)
  // Nutrition Log save
  // Nutrition Log save (Redesigned with unified models and validation)
  const handleSaveNutrition = async (e) => {
    if (e) e.preventDefault();
    if (!userId || isSavingNutri) return;

    // 1. Validation check
    let isValid = false;
    if (nutriTab === 'meal') {
      isValid = !!mealType || !!appetite || (!!foodNote && foodNote.trim() !== '');
    } else if (nutriTab === 'milk') {
      isValid = !!milkType && Number(amountMl) > 0;
    } else if (nutriTab === 'water') {
      isValid = Number(waterMl) > 0;
    } else if (nutriTab === 'breastfeeding') {
      isValid = (breastLeftSec + breastRightSec) > 0;
    }

    if (!isValid) {
      showToast("Mẹ ghi nhận ít nhất một thông tin trước khi lưu nhé.");
      return;
    }

    setIsSavingNutri(true);
    setSaveNutriError(false);

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    // Prepare log details & note strings
    let logType = nutriTab; // 'meal' | 'milk' | 'water' | 'breastfeeding'
    let note = '';
    let toastMsg = 'Đã ghi nhận cữ ăn';

    if (nutriTab === 'meal') {
      const mealNames = { breakfast: 'bữa sáng', lunch: 'bữa trưa', dinner: 'bữa tối', snack: 'bữa phụ' };
      const mealName = mealNames[mealType] || 'bữa ăn';
      note = `Đã ghi nhận ${mealName}`;
      if (foodNote && foodNote.trim()) {
        note += ` · ${foodNote.trim()}`;
      }
      toastMsg = 'Đã lưu bữa ăn';
    } else if (nutriTab === 'milk') {
      const milkNames = { breast: 'sữa mẹ', formula: 'sữa công thức', fresh: 'sữa tươi' };
      const milkName = milkNames[milkType] || 'sữa';
      note = `Đã ghi nhận cữ ${milkName} ${amountMl} ml`;
      toastMsg = 'Đã lưu cữ sữa';
    } else if (nutriTab === 'water') {
      note = `Đã ghi nhận uống nước ${waterMl} ml`;
      toastMsg = 'Đã lưu nước uống';
    } else if (nutriTab === 'breastfeeding') {
      const totalMin = Math.round((breastLeftSec + breastRightSec) / 60) || 1;
      note = `Đã ghi nhận cữ bú ${totalMin} phút`;
      toastMsg = 'Đã lưu cữ bú';
    }

    const logData = {
      date: getTodayLocalyyyymmdd(),
      time: formattedTime,
      type: logType,
      mealType: nutriTab === 'meal' ? mealType : null,
      appetite: nutriTab === 'meal' ? appetite : null,
      foodNote: nutriTab === 'meal' ? foodNote.trim() : null,
      milkType: nutriTab === 'milk' ? milkType : null,
      amountMl: nutriTab === 'milk' ? Number(amountMl) : null,
      waterMl: nutriTab === 'water' ? Number(waterMl) : null,
      breastLeftSeconds: nutriTab === 'breastfeeding' ? breastLeftSec : 0,
      breastRightSeconds: nutriTab === 'breastfeeding' ? breastRightSec : 0,
      totalBreastfeedingSeconds: nutriTab === 'breastfeeding' ? (breastLeftSec + breastRightSec) : 0,
      note,
      createdAt: serverTimestamp(),
      loggedAt: serverTimestamp(),
      childId: babyId || ''
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'nutritionLogs'), logData);
      triggerChime();
      showToast(toastMsg);
      handleCleanCloseSheet('nutrition');
      
      // Reset inputs
      setMealType('breakfast');
      setAppetite('good');
      setFoodNote('');
      setMilkType('breast');
      setAmountMl('');
      setWaterMl('');
      setWaterInputMode('ml');
      setBreastLeftSec(0);
      setBreastRightSec(0);
      setBreastDirectTimerActive(false);
    } catch (err) {
      console.error(err);
      setSaveNutriError(true);
    } finally {
      setIsSavingNutri(false);
    }
  };

  // Sleep Log save
  const handleSaveSleep = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!userId || isSavingSleep) return;

    const isLive = sleepTab === 'live';
    let finalStart = isLive ? sleepStartTime : null;
    let finalEnd = isLive ? sleepEndTime : null;
    let durationMin = 0;

    if (isLive) {
      durationMin = Math.round(sleepSecs / 60) || 1;
    } else {
      if (!manualStartStr || !manualEndStr) return;
      const today = new Date();
      const [sH, sM] = manualStartStr.split(':').map(Number);
      const [eH, eM] = manualEndStr.split(':').map(Number);
      finalStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sH, sM);
      finalEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eH, eM);
      if (finalEnd < finalStart) {
        finalEnd.setDate(finalEnd.getDate() + 1);
      }
      durationMin = Math.round((finalEnd.getTime() - finalStart.getTime()) / 60000);
    }

    if (!finalStart || !finalEnd || durationMin <= 0 || finalEnd <= finalStart) {
      return;
    }

    setIsSavingSleep(true);
    setSaveSleepError(false);

    const type = sleepType === 'day' ? 'day_sleep' : 'night_sleep';
    const typeLabel = sleepType === 'day' ? 'Ngủ ngày' : 'Ngủ đêm';

    const startYear = finalStart.getFullYear();
    const startMonth = String(finalStart.getMonth() + 1).padStart(2, '0');
    const startDay = String(finalStart.getDate()).padStart(2, '0');
    const localDateStr = `${startYear}-${startMonth}-${startDay}`;

    const logData = {
      date: localDateStr,
      time: formatHHMM(finalEnd),
      type,
      startedAt: finalStart, // JS Date mapped to Firestore Timestamp
      endedAt: finalEnd,     // JS Date mapped to Firestore Timestamp
      durationMinutes: durationMin,
      note: sleepNote.trim() ? `${typeLabel} · ${durationMin} phút · ${sleepNote.trim()}` : `${typeLabel} · ${durationMin} phút`,
      rawNote: sleepNote.trim(),
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      childId: babyId || ''
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      showToast("Đã lưu giấc ngủ");
      handleCleanCloseSheet('sleep');
      
      // Reset states
      setSleepActive(false);
      setSleepSecs(0);
      setSleepStartTime(null);
      setSleepEndTime(null);
      setSleepFlowState('idle');
      setSleepNote('');
      setSleepType('day');
      setHasManuallySetSleepType(false);
    } catch (err) {
      console.error(err);
      setSaveSleepError(true);
    } finally {
      setIsSavingSleep(false);
    }
  };

  // Diaper Log save
  const handleSaveDiaper = async () => {
    if (!userId || isSavingPotty) return;

    setIsSavingPotty(true);
    setSavePottyError(false);

    const today = new Date();
    let finalDate = today;
    if (pottyTimeStr) {
      const [hh, mm] = pottyTimeStr.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        finalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm);
      }
    }

    // Format note based on category and subtypes
    let formattedNote = '';
    let toastMessage = 'Đã lưu ghi nhận vệ sinh';

    if (pottyCategory === 'diaper') {
      toastMessage = 'Đã lưu thay tã';
      let subLabel = '';
      if (pottyDiaperType === 'wet') subLabel = 'tã ướt';
      else if (pottyDiaperType === 'dirty') subLabel = 'tã bẩn';
      else if (pottyDiaperType === 'both') subLabel = 'thay tã';
      else if (pottyDiaperType === 'dry') subLabel = 'thay tã';

      const base = subLabel ? `Đã ghi nhận ${subLabel}` : 'Đã ghi nhận thay tã';
      formattedNote = pottyNote.trim() ? `${base} · ${pottyNote.trim()}` : base;
    } else if (pottyCategory === 'potty') {
      toastMessage = 'Đã lưu tập bô';
      let subLabel = '';
      if (pottyResult === 'success') subLabel = 'Có đi';
      else if (pottyResult === 'no_result') subLabel = 'Chưa đi';
      else if (pottyResult === 'practice') subLabel = 'Làm quen';

      const base = subLabel ? `Ngồi bô · ${subLabel}` : 'Đã ghi nhận ngồi bô';
      formattedNote = pottyNote.trim() ? `${base} · ${pottyNote.trim()}` : base;
    } else if (pottyCategory === 'toilet') {
      toastMessage = 'Đã lưu vệ sinh';
      let subLabel = '';
      if (pottyToiletType === 'pee') subLabel = 'đi tè';
      else if (pottyToiletType === 'poop') subLabel = 'đi ị';
      else if (pottyToiletType === 'both') subLabel = 'đi vệ sinh';

      const base = subLabel ? `Đã ghi nhận ${subLabel}` : 'Đã ghi nhận đi vệ sinh';
      formattedNote = pottyNote.trim() ? `${base} · ${pottyNote.trim()}` : base;
    }

    const logData = {
      date: getTodayLocalyyyymmdd(),
      time: formatHHMM(finalDate),
      type: pottyCategory || 'diaper',
      diaperType: pottyCategory === 'diaper' ? pottyDiaperType : null,
      pottyResult: pottyCategory === 'potty' ? pottyResult : null,
      toiletType: pottyCategory === 'toilet' ? pottyToiletType : null,
      note: formattedNote,
      rawNote: pottyNote.trim(),
      loggedAt: finalDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      childId: babyId || ''
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      showToast(toastMessage);
      handleCleanCloseSheet('diaper');
    } catch (err) {
      console.error(err);
      setSavePottyError(true);
    } finally {
      setIsSavingPotty(false);
    }
  };

  // Growth Log save
  const handleSaveGrowth = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const logData = {
      date: getTodayLocalyyyymmdd(),
      time: formattedTime,
      type: 'growth',
      weightKg: Number(growthWeight),
      heightCm: Number(growthHeight),
      note: `Cân nặng: ${growthWeight}kg, Chiều cao: ${growthHeight}cm`,
      createdAt: serverTimestamp(),
      childId: babyId || ''
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      handleCleanCloseSheet('growth');
    } catch (err) {
      console.error(err);
    }
  };

  // Pregnancy Logs: Weight
  const handleSavePregWeight = async () => {
    if (!userId || isSavingWeightRef.current) return;
    const wNum = Number(pregWeight);
    if (isNaN(wNum) || wNum < 30 || wNum > 200) return;
    isSavingWeightRef.current = true;
    setIsSavingWeight(true);
    setSaveWeightError(false);

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().split('T')[0];

    const logData = {
      date: todayStr,
      time: formattedTime,
      type: 'preg_weight',
      weightKg: wNum,
      note: `Cân nặng mẹ bầu: ${wNum} kg`,
      createdAt: serverTimestamp()
    };

    // ── Ghi vào activityLogs (nhật ký hoạt động) ──
    const saveActivity = addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData)
      .then(() => {
        triggerChime();
        showToast("Đã lưu cân nặng hôm nay");
      })
      .catch(err => {
        console.error("Error background saving weight:", err);
        setSaveWeightError(true);
      });

    // ── Đồng bộ vào pregnancyVisits để GrowthScreen đọc được ──
    const syncVisit = (async () => {
      const visitRef = doc(db, 'users', userId, 'pregnancyVisits', `weight_${todayStr}`);
      await setDoc(visitRef, {
        date: todayStr,
        motherWeight: wNum,
        type: 'weight_only',
        source: 'chat_weight_tracker',
        updatedAt: serverTimestamp()
      }, { merge: true });
    })().catch(err => console.error('Error syncing weight to pregnancyVisits:', err));

    // Close sheet immediately
    handleCleanCloseSheet('preg_weight');
    setIsSavingWeight(false);

    Promise.all([saveActivity, syncVisit]).finally(() => {
      isSavingWeightRef.current = false;
    });
  };

  // Pregnancy Logs: Kick
  const handleSaveKick = async () => {
    if (!userId) return;
    
    if (kickCount === 0) {
      showToast("Mẹ hãy ghi nhận ít nhất 1 lần thai máy trước khi lưu nhé.");
      return;
    }
    
    setIsSavingKick(true);
    setSaveKickError(false);

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const durationMin = Math.round(kickSecs / 60) || 1;
    const { weeks } = getPregnancyWeekInfo();

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_kick',
      kickCount,
      kickDurationMin: durationMin,
      startedAt: kickStartTime || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: kickSecs,
      notes: '',
      pregnancyWeek: weeks || 0,
      babyContext: isTwin ? 'twins' : 'singleton',
      note: `Đã ghi nhận ${kickCount} lần trong ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      showToast("Đã lưu buổi đếm thai máy");
      handleCleanCloseSheet('kick');
      setKickActive(false); 
      setKickCount(0); 
      setKickSecs(0);
    } catch (err) {
      console.error(err);
      setSaveKickError(true);
    } finally {
      setIsSavingKick(false);
    }
  };

  // Advanced Contraction Tracker handlers
  const handleContractionToggle = () => {
    const now = new Date();
    triggerChime();
    if (!inContraction) {
      // Start a new contraction
      setInContraction(true);
      setContractionCurrentSecs(0);
      setCurrentContractionStartTime(now.toISOString());
    } else {
      // End the active contraction
      setInContraction(false);
      const startStr = currentContractionStartTime || now.toISOString();
      const endStr = now.toISOString();
      const duration = Math.max(1, Math.round((now - new Date(startStr)) / 1000));
      
      // Calculate interval since the end of the previous contraction (if any)
      let interval = null;
      if (contractionList.length > 0) {
        const prevEndStr = contractionList[contractionList.length - 1].endTime;
        interval = Math.max(0, Math.round((new Date(startStr) - new Date(prevEndStr)) / 1000));
      }

      const newItem = {
        startTime: startStr,
        endTime: endStr,
        durationSeconds: duration,
        intervalSeconds: interval
      };

      setContractionList(prev => [...prev, newItem]);
      setContraCount(c => c + 1);
    }
  };

  const handleUndoContra = () => {
    if (contractionList.length > 0) {
      setContractionList(prev => prev.slice(0, -1));
      setContraCount(c => Math.max(0, c - 1));
    }
  };

  const handleResetContraSession = () => {
    if (contraCount > 0 || inContraction) {
      if (window.confirm("Mẹ có chắc chắn muốn làm lại buổi theo dõi này không? Toàn bộ dữ liệu đang theo dõi sẽ bị xóa.")) {
        setContraCount(0);
        setContraSecs(0);
        setInContraction(false);
        setContractionCurrentSecs(0);
        setContractionList([]);
        setSessionStartTime(new Date().toISOString());
        setSaveContraError(false);
      }
    } else {
      setContraCount(0);
      setContraSecs(0);
      setInContraction(false);
      setContractionCurrentSecs(0);
      setContractionList([]);
      setSessionStartTime(new Date().toISOString());
      setSaveContraError(false);
    }
  };

  // Pregnancy Logs: Contractions
  const handleSaveContra = async () => {
    if (!userId || isSavingContra) return;
    if (contraCount === 0) return; // Prevent saving empty sessions

    setIsSavingContra(true);
    setSaveContraError(false);

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const { weeks } = getPregnancyWeekInfo();
    const durationMin = Math.round(contraSecs / 60) || 1;

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_contraction',
      contraCount,
      startedAt: sessionStartTime || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      sessionDurationSeconds: contraSecs,
      contractions: contractionList,
      pregnancyWeek: weeks || 0,
      note: `Đã ghi nhận ${contraCount} cơn trong ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      showToast("Đã lưu buổi theo dõi cơn gò");
      handleCleanCloseSheet('contractions');
      setContraActive(false);
      // Reset local tracking state to clean
      setContraCount(0);
      setContraSecs(0);
      setInContraction(false);
      setContractionCurrentSecs(0);
      setContractionList([]);
    } catch (err) {
      console.error(err);
      setSaveContraError(true);
    } finally {
      setIsSavingContra(false);
    }
  };


  const handleSavePrePregWeight = async () => {
    if (!userId || !prePregInputValue) return;
    const val = Number(prePregInputValue);
    if (isNaN(val) || val < 30 || val > 200) return;
    setIsSavingPrePreg(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        prePregnancyWeight: val
      });
      showToast("Đã lưu cân nặng trước thai kỳ");
      setShowPrePregInput(false);
    } catch (err) {
      console.error("Error saving pre-pregnancy weight:", err);
    } finally {
      setIsSavingPrePreg(false);
    }
  };

  // Pregnancy Logs: Vitamin & Nước
  const [vitaminsLogged, setVitaminsLogged] = useState({ Folic: false, Iron: false, Calcium: false, DHA: false });
  const [waterCount, setWaterCount] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8);
  const [configuredVitamins, setConfiguredVitamins] = useState(['Folic', 'Iron', 'Calcium', 'DHA']);
  const [isSavingVitamins, setIsSavingVitamins] = useState(false);
  const [saveVitaminsError, setSaveVitaminsError] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // --- BOTTOM SHEET & CHAT DRAWER UX REFINEMENTS ---
  const [confirmCloseTarget, setConfirmCloseTarget] = useState(null);
  const pregWeightInitialRef = useRef(58.5);
  const pregRemindersInitialRef = useRef({ vitaminsLogged: { Folic: false, Iron: false, Calcium: false, DHA: false }, waterCount: 0 });
  const chatOverlayStateRef = useRef({ isDirty: false, saving: false });
  const isSavingWeightRef = useRef(false);
  const isSavingVitaminsRef = useRef(false);
  const isSavingClinicRef = useRef(false);
  const isSavingEmotionRef = useRef(false);
  const lastInitializedSheetRef = useRef(null);

  useEffect(() => {
    if (!activeBottomSheet) {
      lastInitializedSheetRef.current = null;
      return;
    }
    if (lastInitializedSheetRef.current === activeBottomSheet) {
      return;
    }
    lastInitializedSheetRef.current = activeBottomSheet;

    if (activeBottomSheet === 'nutrition') {
      const babyAgeMonths = (ageInfo?.years || 0) * 12 + (ageInfo?.months || 0);
      if (babyAgeMonths >= 12) {
        setNutriTab('meal');
      } else {
        setNutriTab('breastfeeding');
      }
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 10) {
        setMealType('breakfast');
      } else if (hour >= 10 && hour < 14) {
        setMealType('lunch');
      } else if (hour >= 14 && hour < 17) {
        setMealType('snack');
      } else if (hour >= 17 && hour < 21) {
        setMealType('dinner');
      } else {
        setMealType('breakfast');
      }
      setAppetite('good');
      setFoodNote('');
      setMilkType('breast');
      setAmountMl('');
      setWaterMl('');
      setWaterInputMode('ml');
      setBreastLeftSec(0);
      setBreastRightSec(0);
      setBreastDirectTimerActive(false);
      setSaveNutriError(false);
      setIsSavingNutri(false);
    } else if (activeBottomSheet === 'preg_reminders') {
      const todayStr = getTodayLocalyyyymmdd();
      const todayLog = activityLogs.find(l => l.type === 'preg_reminders' && l.date === todayStr);
      if (todayLog) {
        const loadedVits = {
          Folic: todayLog.vitaminsLogged?.Folic || false,
          Iron: todayLog.vitaminsLogged?.Iron || false,
          Calcium: todayLog.vitaminsLogged?.Calcium || false,
          DHA: todayLog.vitaminsLogged?.DHA || false
        };
        const loadedWater = todayLog.waterCount !== undefined ? todayLog.waterCount : 0;
        setVitaminsLogged(loadedVits);
        setWaterCount(loadedWater);
        pregRemindersInitialRef.current = { vitaminsLogged: loadedVits, waterCount: loadedWater };

        setWaterTarget(todayLog.waterTarget !== undefined ? todayLog.waterTarget : 8);
        if (todayLog.configuredVitamins) {
          setConfiguredVitamins(todayLog.configuredVitamins);
        } else {
          setConfiguredVitamins(['Folic', 'Iron', 'Calcium', 'DHA']);
        }
      } else {
        const defaultVits = { Folic: false, Iron: false, Calcium: false, DHA: false };
        setVitaminsLogged(defaultVits);
        setWaterCount(0);
        pregRemindersInitialRef.current = { vitaminsLogged: defaultVits, waterCount: 0 };

        setWaterTarget(8);
        setConfiguredVitamins(['Folic', 'Iron', 'Calcium', 'DHA']);
      }
      setSaveVitaminsError(false);
    } else if (activeBottomSheet === 'preg_weight') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = activityLogs.find(l => l.type === 'preg_weight' && l.date === todayStr);
      if (todayLog) {
        setPregWeight(todayLog.weightKg);
        pregWeightInitialRef.current = todayLog.weightKg;
      } else {
        const wLogs = activityLogs.filter(l => l.type === 'preg_weight');
        if (wLogs.length > 0) {
          setPregWeight(wLogs[0].weightKg);
          pregWeightInitialRef.current = wLogs[0].weightKg;
        } else {
          setPregWeight(58.5);
          pregWeightInitialRef.current = 58.5;
        }
      }
      setSaveWeightError(false);
      setShowPrePregInput(false);
      setPrePregInputValue(profile?.prePregnancyWeight || '');
    } else if (activeBottomSheet === 'preg_emotion') {
      const todayStr = getTodayLocalyyyymmdd();
      const todayLog = activityLogs.find(l => l.type === 'preg_emotion' && l.date === todayStr);
      if (todayLog) {
        setSelectedEmotions(todayLog.selectedEmotions || []);
        setEmotionNote(todayLog.emotionNote || '');
        setEmotionIntensity(todayLog.intensity || 'Vừa');
      } else {
        setSelectedEmotions([]);
        setEmotionNote('');
        setEmotionIntensity('Vừa');
      }
      setSaveEmotionError(false);
    } else if (activeBottomSheet === 'preg_clinic') {
      const todayStr = getTodayLocalyyyymmdd();
      const todayLog = activityLogs.find(l => l.type === 'preg_clinic' && l.date === todayStr);
      if (todayLog) {
        setClinicNote(todayLog.clinicNote || '');
        setNextApptDate(todayLog.nextApptDate || '');
        setReminderEnabled(todayLog.reminderEnabled !== undefined ? todayLog.reminderEnabled : true);
        setVisitDate(todayLog.date || getTodayLocalyyyymmdd());
      } else {
        setClinicNote('');
        setNextApptDate('');
        setReminderEnabled(true);
        setVisitDate(getTodayLocalyyyymmdd());
      }
      setSaveClinicError(false);
      setShowValidationWarning(false);
    } else if (activeBottomSheet === 'kick') {
      setKickActive(false);
      setKickSecs(0);
      setKickCount(0);
      setSaveKickError(false);
    } else if (activeBottomSheet === 'contractions') {
      setContraActive(false);
      setContraSecs(0);
      setContraCount(0);
      setSaveContraError(false);
    } else if (activeBottomSheet === 'growth') {
      setGrowthWeight(7.5);
      setGrowthHeight(68.2);
    } else if (activeBottomSheet === 'sleep') {
      setSleepTab('live');
      const now = new Date();
      let initialType = 'day';
      if (sleepActive && sleepStartTime) {
        const h = sleepStartTime.getHours();
        initialType = (h >= 6 && h < 18) ? 'day' : 'night';
      } else {
        const h = now.getHours();
        initialType = (h >= 6 && h < 18) ? 'day' : 'night';
      }
      if (!sleepActive) {
        setSleepFlowState('idle');
        setSleepSecs(0);
        setSleepStartTime(null);
        setSleepEndTime(null);
      } else {
        setSleepFlowState('running');
      }
      setSleepType(initialType);
      setSleepNote('');
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setManualStartStr(formatHHMM(oneHourAgo));
      setManualEndStr(formatHHMM(now));
      setHasManuallySetSleepType(false);
      setShowSleepResetConfirm(false);
      setSaveSleepError(false);
      setIsSavingSleep(false);
    } else if (activeBottomSheet === 'diaper') {
      const babyAgeMonths = (ageInfo?.years || 0) * 12 + (ageInfo?.months || 0);
      if (babyAgeMonths >= 18) {
        if (babyAgeMonths <= 36) {
          setPottyCategory('diaper'); // Vệ sinh / Tập bô defaults to Thay tã
        } else {
          setPottyCategory('toilet'); // Vệ sinh defaults to Đi vệ sinh
        }
      } else {
        setPottyCategory('diaper'); // Under 18 months defaults to Thay tã
      }
      setPottyDiaperType(null);
      setPottyResult(null);
      setPottyToiletType(null);
      setPottyNote('');
      setPottyTimeStr(formatHHMM(new Date()));
      setSavePottyError(false);
      setIsSavingPotty(false);
    }
  }, [activeBottomSheet, activityLogs, profile, sleepActive, ageInfo]);

  const handleSaveVitamins = async () => {
    if (!userId || isSavingVitaminsRef.current) return;
    isSavingVitaminsRef.current = true;
    setIsSavingVitamins(true);
    setSaveVitaminsError(false);

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().split('T')[0];

    const activeCheckedVitamins = configuredVitamins.filter(k => vitaminsLogged[k]);
    const checkedCount = activeCheckedVitamins.length;
    const totalCount = configuredVitamins.length;

    const logData = {
      date: todayStr,
      time: formattedTime,
      type: 'preg_reminders',
      note: `Đã ghi nhận ${checkedCount}/${totalCount} vi chất · ${waterCount}/${waterTarget} ly nước`,
      vitaminsLogged,
      vitaminCount: checkedCount,
      totalVitamins: totalCount,
      waterCount,
      waterTarget,
      configuredVitamins,
      createdAt: serverTimestamp()
    };

    const todayLog = activityLogs.find(l => l.type === 'preg_reminders' && l.date === todayStr);
    const savePromise = todayLog
      ? updateDoc(doc(db, 'users', userId, 'babies', babyId, 'activityLogs', todayLog.id), {
          ...logData,
          createdAt: todayLog.createdAt || serverTimestamp()
        })
      : addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);

    // Save in background
    const saveTask = savePromise
      .then(() => {
        triggerChime();
        showToast("Đã lưu ghi nhận hôm nay");
      })
      .catch(err => {
        console.error("Error background saving vitamins/water:", err);
        setSaveVitaminsError(true);
      });

    // Close sheet immediately
    handleCleanCloseSheet('preg_reminders');
    setIsSavingVitamins(false);

    saveTask.finally(() => {
      isSavingVitaminsRef.current = false;
    });
  };

  const getVitaminStatusText = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = activityLogs.find(l => l.type === 'preg_reminders' && l.date === todayStr);
    if (!todayLog) return 'Chưa ghi nhận hôm nay';
    
    const vitCount = todayLog.vitaminCount !== undefined ? todayLog.vitaminCount : 0;
    const vitTotal = todayLog.totalVitamins !== undefined ? todayLog.totalVitamins : 4;
    const watCount = todayLog.waterCount !== undefined ? todayLog.waterCount : 0;
    const watTarget = todayLog.waterTarget !== undefined ? todayLog.waterTarget : 8;
    return `Đã uống ${vitCount}/${vitTotal} vi chất · ${watCount}/${watTarget} ly nước`;
  };


  // Helper to format date YYYY-MM-DD to DD/MM/YYYY
  const formatDateForDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length !== 3) return val;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  // Helper to check if a date string is in the past compared to local today
  const isDateInPast = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };


  // Helper to parse ultrasound indices from freeform checkup notes
  const parseClinicNote = (note) => {
    if (!note) return {};
    const parseMetric = (regex) => {
      const match = note.match(regex);
      return match && match[1] ? parseFloat(match[1]) : null;
    };
    return {
      bpd: parseMetric(/BPD:\s*(\d+(?:\.\d+)?)\s*mm/i),
      fl: parseMetric(/FL:\s*(\d+(?:\.\d+)?)\s*mm/i),
      ac: parseMetric(/AC:\s*(\d+(?:\.\d+)?)\s*mm/i),
      hc: parseMetric(/HC:\s*(\d+(?:\.\d+)?)\s*mm/i),
      crl: parseMetric(/CRL:\s*(\d+(?:\.\d+)?)\s*mm/i),
      efw: parseMetric(/EFW:\s*(\d+(?:\.\d+)?)\s*(?:g|gram)/i),
      fetalHeartRate: parseMetric(/Tim thai:\s*(\d+)\s*(?:bpm|lần\/phút)/i)
    };
  };

  // Pregnancy Logs: Clinic Checkup
  const handleSavePregClinic = async () => {
    if (!userId || isSavingClinicRef.current) return;

    setSaveClinicError(false);
    setShowValidationWarning(false);

    // Validation: Require either notes/chips or a next appointment date
    if (!clinicNote.trim() && !nextApptDate) {
      setShowValidationWarning(true);
      return;
    }

    isSavingClinicRef.current = true;
    setIsSavingClinic(true);
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const ultrasoundData = parseClinicNote(clinicNote);

    const displayNote = nextApptDate
      ? `Đã ghi nhận kết quả khám · Hẹn tiếp theo: ${formatDateForDisplay(nextApptDate)}`
      : `Đã ghi nhận kết quả khám hôm nay`;

    const logData = {
      date: visitDate,
      time: formattedTime,
      type: 'preg_clinic',
      clinicNote,
      nextApptDate,
      reminderEnabled: nextApptDate ? reminderEnabled : false,
      note: displayNote,
      createdAt: serverTimestamp(),
      
      // Dynamic variables support
      pregnancy: {
        currentWeek: pregWeeks || 30,
        babyName: headerBabyName || 'Bé yêu'
      },
      appointment: {
        visitDate: visitDate || null,
        notes: clinicNote || '',
        nextAppointmentDate: nextApptDate || null,
        reminderEnabled: nextApptDate ? reminderEnabled : false
      },
      ultrasound: {
        bpd: ultrasoundData.bpd || null,
        fl: ultrasoundData.fl || null,
        ac: ultrasoundData.ac || null,
        hc: ultrasoundData.hc || null,
        crl: ultrasoundData.crl || null,
        efw: ultrasoundData.efw || null,
        fetalHeartRate: ultrasoundData.fetalHeartRate || null
      }
    };

    // Save in background
    const saveTask = addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData)
      .then(() => {
        triggerChime();
        if (nextApptDate && reminderEnabled) {
          showToast("Đã lưu ghi nhận khám thai · App sẽ nhắc mẹ trước 1 ngày");
        } else {
          showToast("Đã lưu ghi nhận khám thai");
        }
      })
      .catch(err => {
        console.error("Error background saving clinic visit:", err);
        setSaveClinicError(true);
      });

    // Close sheet immediately
    handleCleanCloseSheet('preg_clinic');
    setClinicNote('');
    setNextApptDate('');
    setIsSavingClinic(false);

    saveTask.finally(() => {
      isSavingClinicRef.current = false;
    });
  };

  const [activeChipLabel, setActiveChipLabel] = useState(null);

  const handleQuickChipClick = (label, template) => {
    setActiveChipLabel(label);
    setTimeout(() => setActiveChipLabel(null), 150);

    const textarea = document.getElementById('clinic-note-textarea');
    if (!textarea) return;

    let currentText = clinicNote;
    const lines = currentText.split('\n');

    // Check if label already exists (starts with label + ':')
    const existingLineIndex = lines.findIndex(line => 
      line.trim().toLowerCase().startsWith(label.toLowerCase() + ':') ||
      line.trim().toLowerCase() === label.toLowerCase()
    );

    let newText = '';
    let targetIndex = -1;
    let lineStartOffset = 0;

    if (existingLineIndex !== -1) {
      newText = currentText;
      lineStartOffset = lines.slice(0, existingLineIndex).join('\n').length + (existingLineIndex > 0 ? 1 : 0);
    } else {
      const prefix = currentText ? (currentText.endsWith('\n') ? '' : '\n') : '';
      newText = currentText + prefix + template;
      lineStartOffset = currentText.length + prefix.length;
    }

    setClinicNote(newText);

    setTimeout(() => {
      textarea.focus();
      const currentLines = newText.split('\n');
      const activeLine = existingLineIndex !== -1 ? currentLines[existingLineIndex] : template;
      const placeholderOffset = activeLine.indexOf('--');

      if (placeholderOffset !== -1) {
        const cursorStart = lineStartOffset + placeholderOffset;
        const cursorEnd = cursorStart + 2;
        textarea.setSelectionRange(cursorStart, cursorEnd);
      } else {
        const cursorPosition = lineStartOffset + activeLine.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 50);
  };

  // Get AI Suggestion based on selected emotions
  const getEmotionAiSuggestion = (emotions) => {
    if (!emotions || emotions.length === 0) return 'Chọn cảm xúc để nhận một gợi ý nhỏ từ AI.';
    if (emotions.includes('Lo lắng')) {
      return 'Mẹ thử hít thở chậm 1 phút và ghi lại điều khiến mẹ lo nhất hôm nay.';
    }
    if (emotions.includes('Nhạy cảm')) {
      return 'Mẹ hãy cho mình một khoảng nghỉ nhẹ nhàng và viết ra cảm xúc đang đến.';
    }
    if (emotions.includes('Mệt mỏi')) {
      return 'Mẹ có thể nghỉ 5 phút, uống nước và thả lỏng vai.';
    }
    if (emotions.includes('Vui vẻ') || emotions.includes('Hạnh phúc')) {
      return 'Mẹ có thể lưu lại một điều nhỏ khiến mẹ vui hôm nay.';
    }
    return '';
  };

  const handleEmotionClick = (state) => {
    if (selectedEmotions.includes(state)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== state));
    } else {
      setSelectedEmotions([...selectedEmotions, state]);
    }
  };

  // Pregnancy Logs: Emotion Tracker
  const handleSavePregEmotion = async () => {
    if (!userId || isSavingEmotionRef.current) return;
    
    // Validation: if both emotions and notes are empty, return silently
    if (selectedEmotions.length === 0 && !emotionNote.trim()) {
      return;
    }
    
    isSavingEmotionRef.current = true;
    setIsSavingEmotion(true);
    setSaveEmotionError(false);
    
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const aiSuggestionText = getEmotionAiSuggestion(selectedEmotions);
    
    let summaryNote = '';
    const emotionsStr = selectedEmotions.join(' · ');
    if (emotionsStr && emotionNote.trim()) {
      summaryNote = `Tâm trạng: ${emotionsStr}. Chi tiết: ${emotionNote.trim()}`;
    } else if (emotionsStr) {
      summaryNote = `Tâm trạng: ${emotionsStr}. Mức độ: ${emotionIntensity}`;
    } else if (emotionNote.trim()) {
      summaryNote = `Ghi chú cảm xúc. Chi tiết: ${emotionNote.trim()}`;
    }

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_emotion',
      selectedEmotions,
      intensity: selectedEmotions.length > 0 ? emotionIntensity : null,
      emotionNote: emotionNote.trim(),
      aiSuggestion: selectedEmotions.length > 0 ? aiSuggestionText : null,
      note: summaryNote,
      createdAt: serverTimestamp()
    };

    // Save in background silently
    const saveTask = addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData)
      .catch(err => {
        console.error("Error background saving pregnancy emotion log:", err);
        setSaveEmotionError(true);
      });

    // Close and reset states immediately
    handleCleanCloseSheet('preg_emotion');
    setSelectedEmotions([]);
    setEmotionIntensity('Vừa');
    setEmotionNote('');
    setIsSavingEmotion(false);

    saveTask.finally(() => {
      isSavingEmotionRef.current = false;
    });
  };

  // Overdue status transition
  const handleTransitionToBorn = async () => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'parent' });
      triggerChime();
      setIsTransitionCardDismissed(true);
      alert("Chúc mừng mẹ và bé! 🎉 Trạng thái đã được chuyển sang nuôi con. Hãy cập nhật thông tin của bé yêu trong tab Hồ sơ nhé!");
      setActiveTab('baby');
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic status details for the 4 dashboard cards
  const getLastNutriText = () => {
    if (nutritionLogs.length === 0) return 'Chưa có cữ ăn nào';
    const last = nutritionLogs[0];
    return `Cữ ăn cuối: ${last.time || 'Vừa xong'}`;
  };

  const getLastSleepText = () => {
    if (sleepActive) {
      const minutes = Math.floor(sleepSecs / 60);
      return `Đang ngủ · ${minutes} phút`;
    }
    const sleepLogs = activityLogs.filter(l => l.type === 'sleep' || l.type === 'day_sleep' || l.type === 'night_sleep');
    if (sleepLogs.length === 0) return 'Chưa có cữ ngủ nào';
    const last = sleepLogs[0];
    const duration = last.durationMinutes || last.sleepDurationMin || 0;
    return `Giấc ngủ gần nhất: ${duration} phút`;
  };

  const getLastDiaperText = () => {
    const diaperLogs = activityLogs.filter(l => l.type === 'diaper');
    if (diaperLogs.length === 0) return 'Thay cuối: --';
    const last = diaperLogs[0];
    return `Thay cuối: ${last.time || 'Vừa xong'}`;
  };

  const getLastGrowthText = () => {
    const growthLogs = activityLogs.filter(l => l.type === 'growth');
    if (growthLogs.length === 0) return 'Chưa có số đo';
    const last = growthLogs[0];
    const parts = [];
    if (last.weightKg) parts.push(`Cân nặng: ${last.weightKg} kg`);
    if (last.heightCm) parts.push(`Chiều cao: ${last.heightCm} cm`);
    if (parts.length === 0) {
      if (last.headCircumferenceCm) return `Chu vi đầu: ${last.headCircumferenceCm} cm`;
      return 'Chưa có số đo';
    }
    return parts.join(' · ');
  };

  const getLastKickText = () => {
    const kickLogs = activityLogs.filter(l => l.type === 'preg_kick');
    if (kickLogs.length === 0) return 'Hôm nay: --';
    return `Cú máy cuối: ${kickLogs[0].kickCount} lần`;
  };

  const getKickStatusText = (weeks) => {
    if (weeks < 16) {
      return 'Chờ tuần 16+ để đếm máy';
    }
    const todayStr = getTodayLocalyyyymmdd();
    const todayKicks = activityLogs.filter(l => l.type === 'preg_kick' && l.date === todayStr);
    const totalCount = todayKicks.reduce((sum, log) => sum + (log.kickCount || 0), 0);
    
    if (weeks >= 16 && weeks <= 27) {
      if (todayKicks.length === 0) return 'Ghi nhận cảm nhận';
      return `Hôm nay: ${totalCount} lần`;
    }
    return `Hôm nay: ${totalCount} lần`;
  };

  const getLastContraText = () => {
    const contraLogs = activityLogs.filter(l => l.type === 'preg_contraction');
    if (contraLogs.length === 0) return 'Cơn gò: Bình thường';
    return `Ghi nhận cuối: ${contraLogs[0].time}`;
  };

  const getContractionsStatusText = () => {
    const todayStr = getTodayLocalyyyymmdd();
    const todayContras = activityLogs.filter(l => l.type === 'preg_contraction' && l.date === todayStr);
    if (todayContras.length === 0) return 'Hôm nay: 0 cơn';
    const totalCount = todayContras.reduce((sum, log) => sum + (log.contraCount || 0), 0);
    return `Hôm nay: ${totalCount} cơn`;
  };

  const getLastPregWeightText = () => {
    const wLogs = activityLogs.filter(l => l.type === 'preg_weight');
    if (wLogs.length === 0) return 'Cân nặng của mẹ: -- kg';
    return `Cân nặng của mẹ: ${wLogs[0].weightKg} kg`;
  };

  const getLastClinicText = () => {
    const clinicLogs = activityLogs.filter(l => l.type === 'preg_clinic');
    if (clinicLogs.length === 0) return 'Lịch khám: Chưa ghi nhận';
    const last = clinicLogs[0];
    if (last.nextApptDate) {
      return `Lịch khám: ${formatDateForDisplay(last.nextApptDate)}`;
    }
    return 'Đã ghi nhận kết quả khám';
  };

  const getLastEmotionText = () => {
    const emotionLogs = activityLogs.filter(l => l.type === 'preg_emotion');
    if (emotionLogs.length === 0) return 'Tâm trạng hôm nay: --';
    const last = emotionLogs[0];
    if (last.selectedEmotions && last.selectedEmotions.length > 0) {
      return `Tâm trạng hôm nay: ${last.selectedEmotions.join(', ')}`;
    } else if (last.emotionState) {
      return `Tâm trạng hôm nay: ${last.emotionState}`;
    }
    return 'Đã lưu ghi chú cảm xúc';
  };


  // Build vertical sorted list of timeline items
  const timelineItems = (() => {
    const list = [];
    const todayStr = getTodayLocalyyyymmdd();

    // 1. Feeding (Nutrition Logs) today
    nutritionLogs.filter(log => log.date === todayStr).forEach(log => {
      let desc = '';
      let typeLabel = 'Ăn uống';
      let icon = '🍼';
      let colorClass = 'timeline-nutrition';

      if (log.type === 'breast_direct') {
        desc = `Bú mẹ trực tiếp (${log.breastTimeLeft + log.breastTimeRight} phút)`;
        icon = '🤱';
      } else if (log.type === 'breast_pump') {
        desc = `Sữa mẹ vắt - ${log.amountMl} ml`;
      } else if (log.type === 'formula') {
        desc = `Sữa công thức - ${log.amountMl} ml`;
      } else if (log.type === 'solid') {
        desc = `Ăn dặm: ${log.foodDetails}`;
        icon = '🥣';
      } else if (log.type === 'meal') {
        const mealNames = { breakfast: 'bữa sáng', lunch: 'bữa trưa', dinner: 'bữa tối', snack: 'bữa phụ' };
        const mealName = mealNames[log.mealType] || 'bữa ăn';
        desc = `Đã ghi nhận ${mealName}`;
        if (log.foodNote && log.foodNote.trim()) {
          desc += ` · ${log.foodNote.trim()}`;
        }
        icon = '🥣';
      } else if (log.type === 'milk') {
        const milkNames = { breast: 'sữa mẹ', formula: 'sữa công thức', fresh: 'sữa tươi' };
        const milkName = milkNames[log.milkType] || 'sữa';
        desc = `Đã ghi nhận cữ ${milkName} ${log.amountMl} ml`;
        icon = '🍼';
      } else if (log.type === 'water') {
        desc = `Đã ghi nhận uống nước ${log.waterMl} ml`;
        icon = '🥤';
      } else if (log.type === 'breastfeeding') {
        const totalMin = Math.round(log.totalBreastfeedingSeconds / 60) || 1;
        desc = `Đã ghi nhận cữ bú ${totalMin} phút`;
        icon = '🤱';
      } else {
        desc = log.note || 'Đã ghi nhận một cữ ăn';
      }

      list.push({
        id: log.id,
        time: log.time || '—',
        typeLabel,
        desc,
        icon,
        colorClass,
        createdAt: log.createdAt?.toDate() || new Date()
      });
    });

    // 2. Activities (Sleep, Diaper, Growth, etc.) today
    activityLogs.filter(log => {
      if (log.type === 'sleep' || log.type === 'day_sleep' || log.type === 'night_sleep') {
        const startedAtDate = log.startedAt ? (typeof log.startedAt.toDate === 'function' ? log.startedAt.toDate() : new Date(log.startedAt)) : null;
        if (startedAtDate) {
          const year = startedAtDate.getFullYear();
          const month = String(startedAtDate.getMonth() + 1).padStart(2, '0');
          const day = String(startedAtDate.getDate()).padStart(2, '0');
          const localDateStr = `${year}-${month}-${day}`;
          return localDateStr === todayStr;
        }
      }
      return log.date === todayStr;
    }).forEach(log => {
      let desc = log.note || '';
      let typeLabel = '';
      let icon = '⏱️';
      let colorClass = '';

      if (log.type === 'diaper' || log.type === 'potty' || log.type === 'toilet') {
        colorClass = 'timeline-diaper';
        let baseDesc = 'Đã ghi nhận vệ sinh';

        if (log.type === 'diaper') {
          typeLabel = 'Vệ sinh';
          icon = '🧷';
          const dType = log.diaperType;
          if (dType === 'potty') {
            typeLabel = 'Tập bô';
            icon = '🚽';
            baseDesc = 'Đã ghi nhận ngồi bô';
          } else if (dType === 'toilet') {
            typeLabel = 'Vệ sinh';
            icon = '🚻';
            baseDesc = 'Đã ghi nhận đi vệ sinh';
          } else if (dType === 'wet' || dType === 'pee') {
            baseDesc = dType === 'wet' ? 'Đã ghi nhận tã ướt' : 'Thay tã - Ướt';
          } else if (dType === 'dirty' || dType === 'poop') {
            baseDesc = dType === 'dirty' ? 'Đã ghi nhận tã bẩn' : 'Thay tã - Bẩn';
          } else if (dType === 'both') {
            baseDesc = 'Thay tã - Cả hai';
          } else if (dType === 'dry') {
            baseDesc = 'Thay tã - Khô';
          } else {
            baseDesc = 'Đã ghi nhận thay tã';
          }
        } else if (log.type === 'potty') {
          typeLabel = 'Tập bô';
          icon = '🚽';
          const pRes = log.pottyResult;
          if (pRes === 'success') baseDesc = 'Ngồi bô · Có đi';
          else if (pRes === 'no_result') baseDesc = 'Ngồi bô · Chưa đi';
          else if (pRes === 'practice') baseDesc = 'Ngồi bô · Làm quen';
          else baseDesc = 'Đã ghi nhận ngồi bô';
        } else if (log.type === 'toilet') {
          typeLabel = 'Vệ sinh';
          icon = '🚻';
          const tType = log.toiletType;
          if (tType === 'pee') baseDesc = 'Đã ghi nhận đi tè';
          else if (tType === 'poop') baseDesc = 'Đã ghi nhận đi ị';
          else baseDesc = 'Đã ghi nhận đi vệ sinh';
        }

        let rawNote = log.rawNote || '';
        if (!rawNote && log.note) {
          desc = log.note;
        } else {
          if (rawNote.trim() && rawNote.trim() !== 'undefined' && rawNote.trim() !== 'null') {
            desc = `${baseDesc} · ${rawNote.trim()}`;
          } else {
            desc = baseDesc;
          }
        }
      } else if (log.type === 'sleep' || log.type === 'day_sleep' || log.type === 'night_sleep') {
        typeLabel = 'Ngủ';
        icon = '🌙';
        colorClass = 'timeline-sleep';
        const duration = log.durationMinutes || log.sleepDurationMin || 0;
        
        let typeText = 'Giấc ngủ';
        if (log.type === 'day_sleep') {
          typeText = 'Ngủ ngày';
        } else if (log.type === 'night_sleep') {
          typeText = 'Ngủ đêm';
        }

        let durationText = `${duration} phút`;
        if (log.type === 'night_sleep' && duration >= 60) {
          const hours = duration / 60;
          if (hours % 1 === 0) {
            durationText = `${hours} giờ`;
          } else {
            durationText = `${hours.toFixed(1)} giờ`;
          }
        }

        const customNote = log.rawNote || '';
        if (customNote.trim()) {
          desc = `${typeText} · ${durationText} · ${customNote.trim()}`;
        } else {
          desc = `${typeText} · ${durationText}`;
        }
      } else if (log.type === 'growth') {
        typeLabel = 'Phát triển';
        icon = '⚖️';
        colorClass = 'timeline-growth';
        desc = log.note || (log.weightKg ? `Cân nặng gần nhất: ${log.weightKg} kg` : `Chiều cao: ${log.heightCm} cm`);
      } else if (log.type === 'preg_kick') {
        typeLabel = 'Thai máy';
        icon = '💓';
        colorClass = 'timeline-kick';
        desc = log.note || `Thai máy: ${log.kickCount} lần`;
      } else if (log.type === 'preg_contraction') {
        typeLabel = 'Cơn gò';
        icon = '⏱️';
        colorClass = 'timeline-contraction';
        desc = log.note || `Ghi nhận cơn gò`;
      } else if (log.type === 'preg_weight') {
        typeLabel = 'Cân nặng thai kỳ';
        icon = '⚖️';
        colorClass = 'timeline-weight';
        desc = `Đã ghi nhận ${log.weightKg} kg`;
      } else if (log.type === 'preg_reminders') {
        typeLabel = 'Vi chất';
        icon = '💊';
        colorClass = 'timeline-vitamin';
        desc = log.note || 'Uống vitamin bầu';
      } else if (log.type === 'preg_clinic') {
        typeLabel = 'Khám thai';
        icon = '🏥';
        colorClass = 'timeline-clinic';
        if (log.nextApptDate) {
          desc = `Đã ghi nhận kết quả khám · Hẹn tiếp theo: ${formatDateForDisplay(log.nextApptDate)}`;
        } else {
          desc = `Đã ghi nhận kết quả khám hôm nay`;
        }
      } else if (log.type === 'preg_emotion') {
        typeLabel = 'Cảm xúc hôm nay';
        icon = '😊';
        colorClass = 'timeline-emotion';
        
        let emotionsText = '';
        if (log.selectedEmotions && log.selectedEmotions.length > 0) {
          emotionsText = log.selectedEmotions.join(' · ');
        } else if (log.emotionState) {
          emotionsText = log.emotionState;
        }
        
        const hasNote = (log.emotionNote && log.emotionNote.trim()) || (log.note && log.note.includes('Chi tiết:'));
        
        if (emotionsText && hasNote) {
          desc = `${emotionsText} · Có ghi chú tâm sự`;
        } else if (emotionsText) {
          desc = emotionsText;
        } else if (hasNote) {
          desc = 'Có ghi chú tâm sự';
        } else {
          desc = 'Đã ghi nhận cảm xúc hôm nay';
        }
      }

      if (typeLabel) {
        list.push({
          id: log.id,
          time: log.time || '—',
          typeLabel,
          desc,
          icon,
          colorClass,
          createdAt: log.createdAt?.toDate() || new Date()
        });
      }
    });

    // 3. Memories (Moments) today (max 3, other ones linked to Moments tab)
    const todayMoments = memories
      .map(log => {
        if (!log.createdAt) return null;
        const dt = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
        if (isNaN(dt.getTime())) return null;
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const logDate = `${year}-${month}-${day}`;
        return { log, dt, logDate };
      })
      .filter(x => x && x.logDate === todayStr)
      .sort((a, b) => b.dt - a.dt);

    const momentsToShow = todayMoments.slice(0, 3);
    const hasMoreMoments = todayMoments.length > 3;

    momentsToShow.forEach(({ log, dt }, idx) => {
      let desc = '';
      if (log.caption && log.caption.trim()) {
        desc = log.caption.trim();
      } else if (log.tag && log.tag.trim()) {
        desc = log.tag.trim();
      } else {
        desc = 'Đã lưu một khoảnh khắc mới';
      }

      list.push({
        id: log.id,
        time: dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        typeLabel: 'Khoảnh khắc',
        desc,
        thumbnailUrl: log.url || null,
        colorClass: 'timeline-moments',
        createdAt: dt,
        hasMoreMomentsLink: hasMoreMoments && (idx === momentsToShow.length - 1)
      });
    });

    return list.sort((a, b) => b.createdAt - a.createdAt);
  })();

  // ── DYNAMIC PERSONALIZATION CONSTANTS & HELPERS ──
  const daysRemaining = status === 'pregnant' ? getDaysRemaining() : null;
  const { weeks: pregWeeks } = status === 'pregnant' ? getPregnancyWeekInfo() : { weeks: 0 };
  const fruitInfo = status === 'pregnant' ? getPregnancyFruitAndDesc(pregWeeks) : null;
  
  const showTransitionCard = status === 'pregnant' && 
    !isTransitionCardDismissed && 
    (pregWeeks >= 40 || (daysRemaining !== null && daysRemaining <= 0));

  const getChildNamesText = () => {
    const isPregnant = status === 'pregnant';
    
    if (!isPregnant) {
      // Mẹ đã sinh
      const validBabies = babies.filter(b => b.name && b.name.trim());
      if (validBabies.length === 1) {
        return validBabies[0].name.trim();
      } else if (validBabies.length === 2) {
        const combined = `${validBabies[0].name.trim()} & ${validBabies[1].name.trim()}`;
        if (combined.length <= 22) {
          return combined;
        }
        return 'hai bé';
      } else {
        return 'các bé'; // Từ 3 bé trở lên luôn hiển thị "các bé" trên mobile để tránh rối
      }
    } else {
      // Mẹ đang bầu
      const rawBabyName = profile?.babyName || pregnancyInfo?.babyName || '';
      const nameParts = rawBabyName ? rawBabyName.split('&').map(n => n.trim()).filter(Boolean) : [];
      
      if (babyCount === 1) {
        return nameParts[0] || 'bé yêu';
      } else if (babyCount === 2) {
        if (nameParts.length >= 2) {
          const combined = `${nameParts[0]} & ${nameParts[1]}`;
          if (combined.length <= 22) {
            return combined;
          }
        }
        return 'hai bé';
      } else {
        return 'các bé';
      }
    }
  };

  const renderGreeting = () => {
    const hour = new Date().getHours();
    const motherName = (profile?.momName || '').trim();
    
    let greetingPrefix = '';
    if (hour >= 5 && hour < 11) {
      greetingPrefix = 'Chào buổi sáng, mẹ';
    } else if (hour >= 11 && hour < 13) {
      greetingPrefix = 'Chào buổi trưa, mẹ';
    } else if (hour >= 13 && hour < 18) {
      greetingPrefix = 'Chào buổi chiều, mẹ';
    } else if (hour >= 18 && hour < 24) {
      greetingPrefix = 'Chào buổi tối, mẹ';
    } else {
      greetingPrefix = motherName ? 'Mẹ nghỉ ngơi sớm nhé, mẹ' : 'Mẹ nghỉ ngơi sớm nhé';
    }
    
    return (
      <span className="greeting-label" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '15px', color: '#55685B', fontWeight: '500', display: 'block', lineHeight: '1.2' }}>
        {greetingPrefix}
        {motherName && (
          <span style={{ fontWeight: '700', color: '#2F6B4F', marginLeft: '4px' }}>
            {motherName}
          </span>
        )}
      </span>
    );
  };

  const headerBabyName = status === 'pregnant'
    ? (isTwin ? twinWording : (profile?.babyName || pregnancyInfo?.babyName || 'Bé yêu'))
    : (baby?.name || 'Bé yêu');

  const headerAgeBadge = status === 'pregnant'
    ? (isTwin ? `Tuần thai ${pregWeeks} · ${twinBadgeText}` : `Tuần thai ${pregWeeks}`)
    : getAgeString();
  
  const getHeaderAvatar = () => {
    const avatarUrl = profile?.user?.avatar || profile?.avatar || profile?.user?.photoURL;
    if (avatarUrl && !headerAvatarError) {
      return (
        <img 
          src={avatarUrl} 
          alt="avatar" 
          className="mother-avatar-img" 
          onError={() => setHeaderAvatarError(true)} 
        />
      );
    }
    const initial = status === 'pregnant'
      ? (profile?.momName || 'M').charAt(0).toUpperCase()
      : (baby?.name || profile?.momName || 'B').charAt(0).toUpperCase();
    return (
      <div className="mother-avatar-emoji-wrap" style={{
        fontWeight: '700',
        color: '#2F6B4F',
        fontSize: '18px',
        width: '100%',
        height: '100%',
        backgroundColor: '#E8F4EA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%'
      }}>
        {initial}
      </div>
    );
  };

  const handlePregnancySuggestionAction = () => {
    setIsChatOpen(true);
    sendMessage(`Hãy gợi ý chi tiết hoạt động Montessori và chăm sóc sức khỏe hôm nay cho mẹ bầu ở tuần thai thứ ${pregWeeks} theo phương pháp Montessori nhé!`);
  };

  // ── PREGNANCY & BABY DASHBOARD GRID RENDERING HELPERS ──
  const renderPregnancyGrid = (weeks) => {
    if (weeks < 16) {
      return (
        <div className="preg-quick-track-section">
          <p className="preg-quick-track-label">Theo dõi nhanh hôm nay</p>
          <div className="preg-quick-track-scroll">

            {/* Card 1: Vitamin & Nước */}
            <div className="preg-quick-track-card pqt-vitamin" onClick={() => setActiveBottomSheet('preg_reminders')}>
              <div className="preg-quick-track-icon-wrap">
                <PregRemindersIcon />
              </div>
              <p className="preg-quick-track-title">Vitamin &amp; Nước</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getVitaminStatusText();
                return t && t.length < 12 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getVitaminStatusText()}</p>
            </div>

            {/* Card 2: Cân nặng thai kỳ */}
            <div className="preg-quick-track-card pqt-weight" onClick={() => setActiveBottomSheet('preg_weight')}>
              <div className="preg-quick-track-icon-wrap">
                <PregWeightIcon />
              </div>
              <p className="preg-quick-track-title">Cân nặng</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastPregWeightText();
                const m = t.match(/[\d.]+\s*kg/);
                return m ? m[0] : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{isTwin ? 'Cân nặng mẹ' : 'Thai kỳ'}</p>
            </div>

            {/* Card 3: Lịch khám thai */}
            <div className="preg-quick-track-card pqt-clinic" onClick={() => {
              if (setGrowthPendingAction) setGrowthPendingAction('openCheckupSheet');
              setActiveTab('growth');
            }}>
              <div className="preg-quick-track-icon-wrap">
                <PregClinicIcon />
              </div>
              <p className="preg-quick-track-title">Khám thai</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastClinicText();
                return t && t.length < 10 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getLastClinicText()}</p>
            </div>

            {/* Card 4: Cảm xúc hôm nay */}
            <div className="preg-quick-track-card pqt-emotion" onClick={() => setActiveBottomSheet('preg_emotion')}>
              <div className="preg-quick-track-icon-wrap">
                <PregEmotionIcon />
              </div>
              <p className="preg-quick-track-title">Cảm xúc</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastEmotionText();
                return t && t.length < 10 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">Hôm nay</p>
            </div>

          </div>

          {/* Info card: Thai máy (< 16 tuần) */}
          <div className="preg-info-card-full">
            <div className="preg-info-card-full-icon">
              <PregKickIcon />
            </div>
            <div className="preg-info-card-full-body">
              <p className="preg-info-card-full-title">Thai máy (Tuần &lt; 16)</p>
              <p className="preg-info-card-full-desc">
                Thai máy thường bắt đầu rõ nét từ tuần 16–20. Mẹ hãy tìm hiểu trước cách theo dõi nhé!
              </p>
            </div>
            <button
              type="button"
              className="preg-info-card-full-btn"
              onClick={() => {
                setIsChatOpen(true);
                sendMessage("Khi nào thai máy bắt đầu rõ nét và cách theo dõi cử động của thai nhi ra sao?");
              }}
            >
              Tìm hiểu
            </button>
          </div>
        </div>
      );
    } else if (weeks >= 16 && weeks <= 27) {
      return (
        <div className="preg-quick-track-section">
          <p className="preg-quick-track-label">Theo dõi nhanh hôm nay</p>
          <div className="preg-quick-track-scroll">

            {/* Card 1: Đếm thai máy */}
            <div className="preg-quick-track-card pqt-sage" onClick={() => { setActiveBottomSheet('kick'); setKickSecs(0); setKickCount(0); }}>
              <div className="preg-quick-track-icon-wrap">
                <PregKickIcon />
              </div>
              <p className="preg-quick-track-title">Thai máy</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getKickStatusText(weeks);
                const m = t.match(/\d+/);
                return m ? `${m[0]} lần` : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getKickStatusText(weeks)}</p>
            </div>

            {/* Card 2: Cân nặng thai kỳ */}
            <div className="preg-quick-track-card pqt-weight" onClick={() => setActiveBottomSheet('preg_weight')}>
              <div className="preg-quick-track-icon-wrap">
                <PregWeightIcon />
              </div>
              <p className="preg-quick-track-title">Cân nặng</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastPregWeightText();
                const m = t.match(/[\d.]+\s*kg/);
                return m ? m[0] : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{isTwin ? 'Cân nặng mẹ' : 'Thai kỳ'}</p>
            </div>

            {/* Card 3: Lịch khám thai */}
            <div className="preg-quick-track-card pqt-clinic" onClick={() => {
              if (setGrowthPendingAction) setGrowthPendingAction('openCheckupSheet');
              setActiveTab('growth');
            }}>
              <div className="preg-quick-track-icon-wrap">
                <PregClinicIcon />
              </div>
              <p className="preg-quick-track-title">Khám thai</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastClinicText();
                return t && t.length < 10 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getLastClinicText()}</p>
            </div>

            {/* Card 4: Cảm xúc hôm nay */}
            <div className="preg-quick-track-card pqt-emotion" onClick={() => setActiveBottomSheet('preg_emotion')}>
              <div className="preg-quick-track-icon-wrap">
                <PregEmotionIcon />
              </div>
              <p className="preg-quick-track-title">Cảm xúc</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastEmotionText();
                return t && t.length < 10 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">Hôm nay</p>
            </div>

          </div>

          {/* Info card: Vitamin & Nước */}
          <div className="preg-info-card-full">
            <div className="preg-info-card-full-icon">
              <PregRemindersIcon />
            </div>
            <div className="preg-info-card-full-body">
              <p className="preg-info-card-full-title">Vitamin &amp; Nước</p>
              <p className="preg-info-card-full-desc">{getVitaminStatusText()}</p>
            </div>
            <button
              type="button"
              className="preg-info-card-full-btn"
              onClick={() => setActiveBottomSheet('preg_reminders')}
            >
              Ghi nhận
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="preg-quick-track-section">
          <p className="preg-quick-track-label">Theo dõi nhanh hôm nay</p>
          <div className="preg-quick-track-scroll">

            {/* Card 1: Đếm thai máy */}
            <div className="preg-quick-track-card pqt-sage" onClick={() => { setActiveBottomSheet('kick'); setKickSecs(0); setKickCount(0); }}>
              <div className="preg-quick-track-icon-wrap">
                <PregKickIcon />
              </div>
              <p className="preg-quick-track-title">Thai máy</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getKickStatusText(weeks);
                const m = t.match(/\d+/);
                return m ? `${m[0]} lần` : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getKickStatusText(weeks)}</p>
            </div>

            {/* Card 2: Đếm cơn gò */}
            <div className="preg-quick-track-card pqt-contra" onClick={() => { setActiveBottomSheet('contractions'); setContraSecs(0); setContraCount(0); }}>
              <div className="preg-quick-track-icon-wrap">
                <PregContraIcon />
              </div>
              <p className="preg-quick-track-title">Cơn gò</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getContractionsStatusText();
                const m = t.match(/\d+/);
                return m ? `${m[0]} lần` : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getContractionsStatusText()}</p>
            </div>

            {/* Card 3: Cân nặng thai kỳ */}
            <div className="preg-quick-track-card pqt-weight" onClick={() => setActiveBottomSheet('preg_weight')}>
              <div className="preg-quick-track-icon-wrap">
                <PregWeightIcon />
              </div>
              <p className="preg-quick-track-title">Cân nặng</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastPregWeightText();
                const m = t.match(/[\d.]+\s*kg/);
                return m ? m[0] : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{isTwin ? 'Cân nặng mẹ' : 'Thai kỳ'}</p>
            </div>

            {/* Card 4: Lịch khám thai */}
            <div className="preg-quick-track-card pqt-clinic" onClick={() => {
              if (setGrowthPendingAction) setGrowthPendingAction('openCheckupSheet');
              setActiveTab('growth');
            }}>
              <div className="preg-quick-track-icon-wrap">
                <PregClinicIcon />
              </div>
              <p className="preg-quick-track-title">Khám thai</p>
              <p className="preg-quick-track-value">{(() => {
                const t = getLastClinicText();
                return t && t.length < 10 ? t : '—';
              })()}</p>
              <p className="preg-quick-track-meta">{getLastClinicText()}</p>
            </div>

          </div>

          {/* Info card: Vitamin & Nước */}
          <div className="preg-info-card-full">
            <div className="preg-info-card-full-icon">
              <PregRemindersIcon />
            </div>
            <div className="preg-info-card-full-body">
              <p className="preg-info-card-full-title">Vitamin &amp; Nước</p>
              <p className="preg-info-card-full-desc">{getVitaminStatusText()}</p>
            </div>
            <button
              type="button"
              className="preg-info-card-full-btn"
              onClick={() => setActiveBottomSheet('preg_reminders')}
            >
              Ghi nhận
            </button>
          </div>

          {/* Info card: Cảm xúc hôm nay */}
          <div className="preg-info-card-full" style={{ marginTop: 8, background: 'linear-gradient(135deg, #FDF7F5 0%, #F9E1DD 100%)', borderColor: 'rgba(217,109,85,0.16)' }}>
            <div className="preg-info-card-full-icon" style={{ color: '#D96D55', boxShadow: '0 2px 8px rgba(217,109,85,0.12)' }}>
              <PregEmotionIcon />
            </div>
            <div className="preg-info-card-full-body">
              <p className="preg-info-card-full-title" style={{ color: '#8C3D2B' }}>Cảm xúc hôm nay</p>
              <p className="preg-info-card-full-desc" style={{ color: '#A65B49' }}>{getLastEmotionText()}</p>
            </div>
            <button
              type="button"
              className="preg-info-card-full-btn"
              style={{ background: '#D96D55', boxShadow: '0 4px 10px rgba(217,109,85,0.2)' }}
              onClick={() => setActiveBottomSheet('preg_emotion')}
            >
              Ghi nhận
            </button>
          </div>
        </div>
      );
    }
  };
  
  const renderBabyGrid = () => {
    const babyAgeMonths = (ageInfo?.years || 0) * 12 + (ageInfo?.months || 0);
    
    // Calculate custom diaper card details based on baby age
    const todayStr = getTodayLocalyyyymmdd();
    const diaperLogs = activityLogs.filter(l => l.type === 'diaper' || l.type === 'potty' || l.type === 'toilet');
    const todayDiapers = diaperLogs.filter(l => l.date === todayStr);

    let diaperCardTitle = 'Thay tã';
    let diaperCardStatus = 'Chưa có ghi nhận hôm nay';
    let diaperCardButtonText = 'Ghi nhận tã';

    if (babyAgeMonths >= 18) {
      diaperCardTitle = babyAgeMonths <= 36 ? 'Vệ sinh / Tập bô' : 'Vệ sinh';
      diaperCardButtonText = 'Ghi nhận';
      if (todayDiapers.length > 0) {
        diaperCardStatus = `Lần gần nhất: ${todayDiapers[0].time || 'Vừa xong'}`;
      } else {
        diaperCardStatus = 'Chưa có ghi nhận hôm nay';
      }
    } else {
      diaperCardTitle = 'Thay tã';
      diaperCardButtonText = 'Ghi nhận tã';
      if (todayDiapers.length > 0) {
        diaperCardStatus = `Thay cuối: ${todayDiapers[0].time || 'Vừa xong'}`;
      } else {
        diaperCardStatus = 'Chưa có ghi nhận hôm nay';
      }
    }

    return (
      <div className="born-quick-actions-grid">
        {/* CARD 1: Ăn uống */}
        <div className="born-quick-action-card bqa-mint" onClick={() => setActiveBottomSheet('nutrition')}>
          <div className="born-quick-action-icon">
            <BottleIcon />
          </div>
          <div className="born-quick-action-text">
            <p className="born-quick-action-title">Ăn uống</p>
            <p className="born-quick-action-sub">{getLastNutriText()}</p>
          </div>
          <div className="born-quick-action-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* CARD 2: Ngủ */}
        <div className="born-quick-action-card bqa-peach" onClick={() => { setActiveBottomSheet('sleep'); setSleepSecs(0); }}>
          <div className="born-quick-action-icon">
            <MoonStarIcon />
          </div>
          <div className="born-quick-action-text">
            <p className="born-quick-action-title">Ngủ</p>
            <p className="born-quick-action-sub">{getLastSleepText()}</p>
          </div>
          <div className="born-quick-action-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* CARD 3: Thay tã / Vệ sinh / Tập bô */}
        <div className="born-quick-action-card bqa-sky" onClick={() => setActiveBottomSheet('diaper')}>
          <div className="born-quick-action-icon">
            <DiaperIcon />
          </div>
          <div className="born-quick-action-text">
            <p className="born-quick-action-title">{diaperCardTitle}</p>
            <p className="born-quick-action-sub">{diaperCardStatus}</p>
          </div>
          <div className="born-quick-action-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* CARD 4: Phát triển */}
        <div className="born-quick-action-card bqa-mint" onClick={() => setActiveTab('growth')}>
          <div className="born-quick-action-icon">
            <ScaleIcon />
          </div>
          <div className="born-quick-action-text">
            <p className="born-quick-action-title">Phát triển</p>
            <p className="born-quick-action-sub">{getLastGrowthText()}</p>
          </div>
          <div className="born-quick-action-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const getMontessoriSuggestion = () => {
    if (status === 'pregnant') {
      return {
        text: `Nghe nhạc nhẹ và trò chuyện với Bé yêu 5–7 phút để tạo kết nối hôm nay.`,
        meta: '5–7 phút · Thai giáo Montessori',
        action: handlePregnancySuggestionAction
      };
    } else {
      const babyAgeMonths = ageInfo?.years * 12 + ageInfo?.months || 0;
      if (babyAgeMonths < 3) {
        return {
          text: `${headerBabyName} có thể thử quan sát thẻ kích thích thị giác đen trắng Montessori cách mắt bé 20-30cm.`,
          meta: '5–7 phút · Dễ thực hiện tại nhà',
          action: handleSuggestionAction
        };
      } else if (babyAgeMonths >= 3 && babyAgeMonths < 6) {
        return {
          text: `${headerBabyName} tập với và cầm nắm lục lạc gỗ hoặc vòng gỗ Montessori để kích thích xúc giác và cơ tay.`,
          meta: '5–7 phút · Dễ thực hiện tại nhà',
          action: handleSuggestionAction
        };
      } else if (babyAgeMonths >= 6 && babyAgeMonths < 12) {
        return {
          text: `${headerBabyName} bắt đầu học nhân quả với trò chơi thả bóng vào hộp Montessori (Object Permanence Box).`,
          meta: '5–7 phút · Dễ thực hiện tại nhà',
          action: handleSuggestionAction
        };
      } else if (babyAgeMonths >= 12 && babyAgeMonths < 24) {
        return {
          text: `${headerBabyName} tập rót nui lớn hoặc pom-pom to từ cốc này sang cốc khác bằng cốc nhựa nhỏ Montessori để rèn luyện khéo léo. Mẹ luôn quan sát bé khi chơi nhé!`,
          meta: '5–7 phút · Dễ thực hiện tại nhà',
          action: handleSuggestionAction
        };
      } else {
        return {
          text: `${headerBabyName} có thể thử hoạt động phân loại đồ vật theo màu sắc và xếp gọn đồ chơi vào rổ đựng sau khi chơi.`,
          meta: '5–7 phút · Dễ thực hiện tại nhà',
          action: handleSuggestionAction
        };
      }
    }
  };

  // --- DIRTY CHECK MATRIX FOR THE 10 TRACKERS ---
  const isSheetDirty = (sheetId) => {
    if (sheetId === 'nutrition') {
      return (
        breastDirectTimerActive ||
        breastLeftSec > 0 ||
        breastRightSec > 0 ||
        solidDetails !== '' ||
        nutriMl !== 150 ||
        nutriSuaMe !== true ||
        pumpLeftMl !== 60 ||
        pumpRightMl !== 60 ||
        nutriTab !== 'breast_direct'
      );
    }
    if (sheetId === 'sleep') {
      return sleepActive || sleepSecs > 0 || sleepTag !== 'Tự ngủ';
    }
    if (sheetId === 'diaper') {
      return diaperType !== 'pee' || diaperColor !== 'yellow' || diaperDesc !== 'Bình thường';
    }
    if (sheetId === 'growth') {
      return growthWeight !== 7.5 || growthHeight !== 68.2;
    }
    if (sheetId === 'kick') {
      return kickActive || kickSecs > 0 || kickCount > 0;
    }
    if (sheetId === 'contractions') {
      return contraActive || contraSecs > 0 || contraCount > 0;
    }
    if (sheetId === 'preg_weight') {
      const initialW = pregWeightInitialRef.current !== undefined ? pregWeightInitialRef.current : 58.5;
      return Number(pregWeight) !== Number(initialW) || prePregInputValue !== (profile?.prePregnancyWeight || '');
    }
    if (sheetId === 'preg_reminders') {
      const initialVits = pregRemindersInitialRef.current?.vitaminsLogged || { Folic: false, Iron: false, Calcium: false, DHA: false };
      const initialWater = pregRemindersInitialRef.current?.waterCount !== undefined ? pregRemindersInitialRef.current.waterCount : 0;
      const vitsChanged = Object.keys(vitaminsLogged).some(k => vitaminsLogged[k] !== initialVits[k]);
      return vitsChanged || waterCount !== initialWater;
    }
    if (sheetId === 'preg_clinic') {
      return clinicNote !== '' || nextApptDate !== '' || visitDate !== getTodayLocalyyyymmdd();
    }
    if (sheetId === 'preg_emotion') {
      return selectedEmotions.length > 0 || emotionNote !== '' || emotionIntensity !== 'Vừa';
    }
    return false;
  };

  // Keep state ref updated
  useEffect(() => {
    chatOverlayStateRef.current = {
      isDirty: activeBottomSheet ? isSheetDirty(activeBottomSheet) : (isChatOpen ? (input !== '' || pendingImgs.length > 0) : false),
      saving: isSavingWeight || isSavingPrePreg || isSavingVitamins || isSavingClinic || isSavingEmotion || isSavingKick || isSavingContra
    };
  });

  // History stack registration for activeBottomSheet
  useEffect(() => {
    if (activeBottomSheet && window._overlayStack) {
      const sheetId = activeBottomSheet;
      window._overlayStack.push(
        sheetId,
        () => {
          if (chatOverlayStateRef.current.saving) return 'saving';
          if (chatOverlayStateRef.current.isDirty) return 'dirty';
          return 'clean';
        },
        () => {
          setActiveBottomSheet(null);
        },
        () => {
          setConfirmCloseTarget(sheetId);
        }
      );
    }
    return () => {
      if (activeBottomSheet && window._overlayStack) {
        window._overlayStack.pop(activeBottomSheet);
      }
    };
  }, [activeBottomSheet]);

  // History stack registration for isChatOpen
  useEffect(() => {
    if (isChatOpen && window._overlayStack) {
      window._overlayStack.push(
        'chat-assistant',
        () => {
          if (chatOverlayStateRef.current.saving) return 'saving';
          if (input !== '' || pendingImgs.length > 0) return 'dirty';
          return 'clean';
        },
        () => {
          setIsChatOpen(false);
        },
        () => {
          setConfirmCloseTarget('chat-assistant');
        }
      );
    }
    return () => {
      if (isChatOpen && window._overlayStack) {
        window._overlayStack.pop('chat-assistant');
      }
    };
  }, [isChatOpen]);

  // Attempt close handlers
  const handleAttemptCloseSheet = () => {
    const isDirty = isSheetDirty(activeBottomSheet);
    if (isDirty) {
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === activeBottomSheet)) {
        window.history.back();
      } else {
        setConfirmCloseTarget(activeBottomSheet);
      }
    } else {
      const sheetId = activeBottomSheet;
      setActiveBottomSheet(null);
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === sheetId)) {
        window._overlayStack.pop(sheetId);
        window.history.back();
      }
    }
  };

  const handleAttemptCloseChat = () => {
    const isChatDirty = input !== '' || pendingImgs.length > 0;
    if (isChatDirty) {
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'chat-assistant')) {
        window.history.back();
      } else {
        setConfirmCloseTarget('chat-assistant');
      }
    } else {
      setIsChatOpen(false);
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'chat-assistant')) {
        window._overlayStack.pop('chat-assistant');
        window.history.back();
      }
    }
  };

  const handleCleanCloseSheet = (sheetId) => {
    // Clear BOTH dirty and saving flags before closing to prevent popstate
    // handler from seeing 'saving' state and blocking the close
    chatOverlayStateRef.current.isDirty = false;
    chatOverlayStateRef.current.saving = false;
    
    // Return to main screen (close both bottom sheet and chat assistant)
    setActiveBottomSheet(null);
    setIsChatOpen(false);
    
    let backCount = 0;
    if (window._overlayStack) {
      if (window._overlayStack.stack.some(item => item.id === sheetId)) {
        window._overlayStack.pop(sheetId);
        backCount++;
      }
      if (window._overlayStack.stack.some(item => item.id === 'chat-assistant')) {
        window._overlayStack.pop('chat-assistant');
        backCount++;
      }
    }
    
    if (backCount > 0) {
      window.history.go(-backCount);
    }
  };

  const handleConfirmDiscard = () => {
    const target = confirmCloseTarget;
    setConfirmCloseTarget(null);
    
    if (target === 'chat-assistant') {
      setInput('');
      setPendingImgs([]);
      chatOverlayStateRef.current.isDirty = false;
      chatOverlayStateRef.current.saving = false;
      setIsChatOpen(false);
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'chat-assistant')) {
        window._overlayStack.pop('chat-assistant');
        window.history.back();
      }
    } else if (target) {
      chatOverlayStateRef.current.isDirty = false;
      chatOverlayStateRef.current.saving = false;
      setActiveBottomSheet(null);
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === target)) {
        window._overlayStack.pop(target);
        window.history.back();
      }
    }
  };

  // Keyboard helper visual viewport listeners
  // Use refs + direct DOM manipulation instead of useState to avoid re-renders
  // that cause inputs to lose focus when the keyboard opens/closes (the flicker bug).
  const bottomSheetPanelRef = useRef(null);
  const chatPanelRef = useRef(null);

  useEffect(() => {
    if (!activeBottomSheet || !window.visualViewport) {
      if (bottomSheetPanelRef.current) {
        bottomSheetPanelRef.current.style.bottom = '';
        bottomSheetPanelRef.current.style.maxHeight = '';
      }
      return;
    }
    const panel = bottomSheetPanelRef.current;
    const handleResize = () => {
      if (!panel) return;
      const vv = window.visualViewport;
      const offsetTop = vv ? (vv.offsetTop || 0) : 0;
      const height = vv ? (vv.height || window.innerHeight) : window.innerHeight;
      if (window.innerWidth < 640) {
        const bottomOffset = Math.max(0, window.innerHeight - (offsetTop + height));
        if (bottomOffset > 40) {
          panel.style.bottom = `${bottomOffset}px`;
          panel.style.maxHeight = `${height * 0.9}px`;
        } else {
          panel.style.bottom = '';
          panel.style.maxHeight = '';
        }
      } else {
        panel.style.bottom = '';
        panel.style.maxHeight = '';
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, [activeBottomSheet]);

  useEffect(() => {
    if (!isChatOpen || !window.visualViewport) {
      if (chatPanelRef.current) {
        chatPanelRef.current.style.bottom = '';
        chatPanelRef.current.style.maxHeight = '';
      }
      return;
    }
    const panel = chatPanelRef.current;
    const handleResize = () => {
      if (!panel) return;
      const vv = window.visualViewport;
      const offsetTop = vv ? (vv.offsetTop || 0) : 0;
      const height = vv ? (vv.height || window.innerHeight) : window.innerHeight;
      if (window.innerWidth < 640) {
        const bottomOffset = Math.max(0, window.innerHeight - (offsetTop + height));
        if (bottomOffset > 40) {
          panel.style.bottom = `${bottomOffset}px`;
          panel.style.maxHeight = `${height * 0.9}px`;
        } else {
          panel.style.bottom = '';
          panel.style.maxHeight = '';
        }
      } else {
        panel.style.bottom = '';
        panel.style.maxHeight = '';
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, [isChatOpen]);

  // Focus centering auto-scroll — uses scrollIntoView only, no state changes
  const handleFocusCapture = (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      // Use block:'nearest' to avoid scrolling the viewport (which could trigger
      // the visualViewport scroll listener and cause a re-render/flicker)
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  };

  // Body class effects for overlay state
  // overlay-open class hides bottom-nav via CSS in App.css
  // NOTE: We do NOT set overflow:hidden on body — iOS Safari freezes touch events
  // on position:fixed elements when body has overflow:hidden. The app uses
  // height:100dvh everywhere so body scroll lock is unnecessary.
  useEffect(() => {
    const isModalOpen = !!activeBottomSheet || isChatOpen || !!confirmCloseTarget;
    if (isModalOpen) {
      // Do NOT set document.body.style.overflow = 'hidden' (iOS Safari bug)
      document.body.classList.add('cs-modal-open');
      document.body.classList.add('overlay-open');
    } else {
      document.body.classList.remove('cs-modal-open');
      document.body.classList.remove('overlay-open');
    }
    return () => {
      document.body.classList.remove('cs-modal-open');
      document.body.classList.remove('overlay-open');
    };
  }, [activeBottomSheet, isChatOpen, confirmCloseTarget]);

  const suggestionData = getMontessoriSuggestion();

  return (
    <div className="chat-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="premium-toast-container">
          <div className="premium-toast-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-check-icon">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* 📱 iOS-STYLE PREMIUM SINGLE HEADER */}
      <header className="premium-ios-header" style={{ padding: '20px 20px 14px', background: '#F7FAF8', borderBottom: 'none' }}>
        <div className="header-left-meta" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
          {renderGreeting()}
          <h1 className="baby-today-heading" style={{
            fontSize: '15px',
            color: '#7B8A82',
            fontWeight: '600',
            margin: '4px 0 0 0',
            textTransform: 'none',
            letterSpacing: 'normal',
            lineHeight: '1.4',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }} title={`Hành trình Montessori cùng ${getChildNamesText()} mỗi ngày`}>
            Hành trình Montessori cùng <span style={{ color: '#2F6B4F', fontWeight: '700' }}>{getChildNamesText()}</span> mỗi ngày
          </h1>
          {status === 'pregnant' && (
            <div className="baby-age-meta-row" style={{ marginTop: '6px', fontSize: '11.5px', color: '#7B8A82', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              {!pregWeeks || isNaN(pregWeeks) || pregWeeks <= 0 ? (
                <span style={{ fontStyle: 'italic', color: '#8C9C90' }}>
                  {babyCount === 1 ? 'Hồ sơ thai kỳ đang được cập nhật · Thai đơn' :
                   babyCount === 2 ? 'Hồ sơ thai kỳ đang được cập nhật · Thai đôi' :
                   babyCount >= 3 ? 'Hồ sơ thai kỳ đang được cập nhật · Đa thai' :
                   'Hồ sơ thai kỳ đang được cập nhật'}
                </span>
              ) : (
                <>
                  <span>Tuần thai {pregWeeks}</span>
                  <span className="meta-dot" style={{ color: '#A8D5BA', margin: '0 2px' }}>·</span>
                  <span>{babyCount === 1 ? 'Thai đơn' : babyCount === 2 ? 'Thai đôi' : 'Đa thai'}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="header-right-profile" onClick={() => setActiveTab('baby')} style={{ cursor: 'pointer', marginLeft: '12px' }}>
          <div className="mother-avatar-circle" title="Xem hồ sơ">
            {getHeaderAvatar()}
          </div>
        </div>
      </header>

      {/* 🌟 TWIN OVERVIEW SELECTOR - removed per user request */}

      {/* 🎉 INTERACTIVE OVERDUE TRANSITION CARD */}
      {showTransitionCard && (
        <div className="pregnancy-overdue-transition-card animate-float-slow" style={{
          background: '#FDF2F0',
          border: '1.5px solid rgba(217, 109, 85, 0.18)',
          borderRadius: '24px',
          padding: '20px 24px',
          margin: '12px 16px 20px',
          boxShadow: '0 10px 24px rgba(217, 109, 85, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>👶🎉</span>
            <div>
              <h4 style={{ color: '#8C3D2B', fontSize: '16px', fontWeight: '700', margin: 0 }}>Bé yêu đã chào đời chưa mẹ ơi?</h4>
              <p style={{ color: '#A65B49', fontSize: '13.5px', margin: '4px 0 0', fontWeight: '600', lineHeight: '1.4' }}>
                Tuần thai hiện tại của mẹ đã đạt mốc {pregWeeks} tuần. Trợ lý AI sẵn sàng chuyển đổi sang chế độ chăm sóc bé yêu Montessori sơ sinh!
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              onClick={handleTransitionToBorn}
              style={{
                background: '#D96D55',
                color: 'white',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 109, 85, 0.2)',
                transition: 'all 0.2s ease'
              }}
            >
              Đã sinh bé 🍼
            </button>
            <button
              onClick={() => setIsTransitionCardDismissed(true)}
              style={{
                background: 'transparent',
                color: '#A65B49',
                border: '1.5px solid rgba(217, 109, 85, 0.25)',
                padding: '8px 16px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Chưa, tôi vẫn mang bầu 🤰
            </button>
          </div>
        </div>
      )}

      {/* 🤰 PREGNANCY HERO CARD & CAROUSEL & CHECKLIST */}
      {status === 'pregnant' && (
        <>
          {/* Hero Card thai kỳ */}
          <div className="pregnancy-hero-card">
            <img
              className="hero-card-bg-image"
              src={getPregnancyQuoteImage(PREGNANCY_MONTESSORI_QUOTES[getDayOfYear() % 30].image)}
              alt="Belly"
            />
            <div className="hero-card-content">
              <h4 className="hero-card-title">
                {(() => {
                  const displayName = isTwin 
                    ? twinWording 
                    : (profile?.babyName || pregnancyInfo?.babyName || 'bé');
                  return `Tuần ${pregWeeks}: ${displayName} đang bình an lớn lên từng ngày`;
                })()}
              </h4>
              <p className="hero-card-desc">
                {daysRemaining !== null ? (
                  daysRemaining > 0
                    ? (() => {
                        const meetTarget = isTwin
                          ? twinWording
                          : (profile?.babyName || pregnancyInfo?.babyName || 'con');
                        return `Còn khoảng ${daysRemaining} ngày nữa là gặp ${meetTarget}`;
                      })()
                    : `Bé đã sẵn sàng chào đời!`
                ) : (
                  'Hãy cập nhật ngày dự sinh của mẹ'
                )}
              </p>
              <div className="hero-card-quote-section">
                <p className="hero-card-quote-text">
                  “{PREGNANCY_MONTESSORI_QUOTES[getDayOfYear() % 30].text}”
                </p>
                <span className="hero-card-quote-author">
                  — {PREGNANCY_MONTESSORI_QUOTES[getDayOfYear() % 30].author}
                </span>
              </div>
            </div>
          </div>

          {/* Carousel "Hôm nay, mẹ và bé cùng lớn lên" */}
          <div className="preg-grow-together-section">
            <div className="preg-section-header">
              <h3 className="preg-section-title">Hôm nay, mẹ và bé cùng lớn lên</h3>
              <span className="preg-section-link" onClick={handleSuggestionAction}>Xem chi tiết</span>
            </div>
            <div className="preg-horizontal-scroll-container">
              {(() => {
                const dayIdx = pregnancyDayIndex !== null && !isNaN(pregnancyDayIndex) ? pregnancyDayIndex : 0;
                const startIdx = (Math.max(0, dayIdx) % 7) * 3;
                const activities = PREGNANCY_TODAY_ACTIVITIES.slice(startIdx, startIdx + 3);
                return activities.map((act, i) => {
                  let tagClass = 'tag-connect';
                  if (act.tag === 'Hiểu Montessori' || act.tag === 'Montessori') tagClass = 'tag-montessori';
                  else if (act.tag === 'Chăm sóc mẹ') tagClass = 'tag-selfcare';
                  
                  return (
                    <div key={i} className="preg-scroll-card" onClick={handleSuggestionAction} style={{ cursor: 'pointer' }}>
                      <div className="preg-card-image-wrap">
                        <img
                          src={act.image ? `${import.meta.env.BASE_URL}${act.image.startsWith('/') ? act.image.slice(1) : act.image}` : `${import.meta.env.BASE_URL}quote-images/pregnancy/pregnancy-quote-01-belly-touch.png`}
                          alt={act.title}
                          className="preg-card-img"
                        />
                      </div>
                      <div className="preg-card-body">
                        <span className={`preg-card-tag-inline ${tagClass}`}>{act.tag}</span>
                        <h4 className="preg-card-title">{act.title}</h4>
                        <p className="preg-card-subtitle">{act.subtitle}</p>
                        <div className="preg-card-footer">
                          <span className="preg-card-duration">
                            <ClockIcon size={12} className="preg-card-clock-icon" />
                            {act.duration}
                          </span>
                          <BookmarkIcon size={14} className="preg-card-bookmark" />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Checklist "Hành trình hôm nay" */}
          {renderDailyMissionsSection()}
        </>
      )}

      {/* 🌿 POSTPARTUM MONTESSORI RECOMMENDATION CARD & CAROUSEL & CHECKLIST */}
      {status === 'born' && babies.length > 0 && (
        <>
          {/* Card Quote Montessori cho đã sinh */}
          {(() => {
            const quoteIndex = getDayOfYear() % BORN_MONTESSORI_QUOTES.length;
            const quoteObj = BORN_MONTESSORI_QUOTES[quoteIndex];
            return (
              <div className="born-quote-hero-card">
                <img
                  className="hero-card-bg-image"
                  src={getBornQuoteImage(quoteObj.image)}
                  alt="Cảm hứng Montessori"
                  style={{ objectPosition: quoteObj.objectPosition || 'center center' }}
                  onError={(e) => {
                    if (e.target.getAttribute('data-retry') !== 'true') {
                      e.target.setAttribute('data-retry', 'true');
                      e.target.src = getBornQuoteImage(BORN_MONTESSORI_QUOTES[0].image);
                    } else {
                      e.target.style.display = 'none';
                      const card = e.target.closest('.born-quote-hero-card');
                      if (card) card.style.background = 'linear-gradient(135deg, #FCFAF7 0%, #EAEFEA 100%)';
                    }
                  }}
                />
                <div className="hero-card-overlay-gradient" />
                <div className="hero-card-content">
                  <div className="hero-card-quote-section">
                    <p className="hero-card-quote-text">
                      “{quoteObj.text}”
                    </p>
                    <span className="hero-card-quote-author">
                      — {quoteObj.author}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Carousel "Hôm nay, mình cùng con" */}
          {renderPostpartumCarouselSection()}

          {/* Checklist "Hành trình hôm nay" */}
          {renderBornDailyMissionsSection()}
        </>
      )}
      {/* 📊 2X2 DASHBOARD TRACKERS GRID */}
      {(!status || status !== 'pregnant' ? babies.length > 0 : true) && (
        status === 'pregnant' ? renderPregnancyGrid(pregWeeks) : renderBabyGrid()
      )}

      {/* ⏰ DAILY TIMELINE */}
      {(!status || status !== 'pregnant' ? babies.length > 0 : true) && (
        <>
          {status !== 'pregnant' && !dob && (
            <div className="premium-alert-banner" style={{
              margin: '0 20px 16px',
              padding: '12px 16px',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }} onClick={() => setActiveTab('baby')}>
              <span style={{ fontSize: '18px' }}>🌱</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#B45309' }}>Cập nhật ngày sinh cho bé</h5>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#D97706' }}>Mẹ hãy thêm ngày sinh của bé trong Hồ sơ để trợ lý cá nhân hóa gợi ý tốt nhất nhé!</p>
              </div>
              <span style={{ fontSize: '14px', color: '#D97706' }}>→</span>
            </div>
          )}
          
          <section className="daily-timeline-section">
            <h3 className="timeline-title-headline">Dòng thời gian hôm nay</h3>
            <div className="timeline-outer-scroll-wrapper">
              {timelineItems.length === 0 ? (
                <div className="timeline-empty-state-box">
                  <span className="empty-state-icon">📝</span>
                  <h4>Chưa có ghi nhận hôm nay</h4>
                  {status === 'pregnant' ? (
                    <>
                      <p>Mẹ bầu hãy ghi nhận cảm xúc hoặc chỉ số sức khỏe hôm nay để trợ lý Montessori AI đồng hành tốt nhất!</p>
                      <button className="timeline-first-action-btn" onClick={() => setActiveBottomSheet('preg_emotion')}>
                        + Ghi nhận đầu tiên
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Mẹ hãy ghi nhận hoạt động ăn uống, ngủ nghỉ của bé để trợ lý Montessori AI theo dõi sức khỏe tốt nhất!</p>
                      <button className="timeline-first-action-btn" onClick={() => setActiveBottomSheet('nutrition')}>
                        + Ghi nhận đầu tiên
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="timeline-vertical-path-line">
                  {timelineItems.map((item, index) => {
                    /* Map type → SVG icon component */
                    let NodeIcon;
                    if (item.colorClass === 'timeline-nutrition') NodeIcon = TimelineBottleIcon;
                    else if (item.colorClass === 'timeline-sleep') NodeIcon = TimelineMoonIcon;
                    else if (item.colorClass === 'timeline-diaper') NodeIcon = TimelineDiaperIcon;
                    else if (item.colorClass === 'timeline-growth') NodeIcon = TimelineGrowthIcon;
                    else if (item.colorClass === 'timeline-weight') NodeIcon = TimelineWeightIcon;
                    else if (item.colorClass === 'timeline-clinic') NodeIcon = TimelineClinicIcon;
                    else if (item.colorClass === 'timeline-emotion') NodeIcon = TimelineEmotionIcon;
                    else if (item.colorClass === 'timeline-vitamin') NodeIcon = TimelineVitaminIcon;
                    else if (item.colorClass === 'timeline-moments') NodeIcon = TimelineCameraIcon;
                    else NodeIcon = TimelineSunIcon;

                    return (
                      <div key={item.id || index} className="timeline-record-node">
                        <div className="timeline-node-time-col">
                          <span className="node-time-txt">{item.time}</span>
                        </div>
                        <div className={`timeline-node-icon-dot ${item.colorClass}`}>
                          <NodeIcon />
                        </div>
                        <div className="timeline-node-details-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <h4 className="node-details-title">{item.typeLabel}</h4>
                            <p className="node-details-desc" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              margin: 0
                            }}>{item.desc}</p>
                            {item.hasMoreMomentsLink && (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('moments');
                                }} 
                                style={{ 
                                  color: '#2F6B4F', 
                                  fontWeight: '700', 
                                  fontSize: '11px', 
                                  cursor: 'pointer', 
                                  display: 'inline-block', 
                                  marginTop: '6px',
                                  textDecoration: 'underline'
                                }}
                              >
                                Xem thêm trong Khoảnh khắc →
                              </span>
                            )}
                          </div>
                          {item.thumbnailUrl && (
                            <img 
                              src={item.thumbnailUrl} 
                              alt="thumbnail" 
                              style={{
                                width: '44px',
                                height: '44px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.05)',
                                flexShrink: 0
                              }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* 💬 FLOATING ASSISTANT BUTTON — fixed bottom-right */}
      <button
        className="floating-assistant-fab"
        onClick={() => setIsChatOpen(true)}
        aria-label="Trợ lý AI"
      >
        <LeafIcon size={22} strokeWidth={2} />
        <span className="floating-fab-dot" />
      </button>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 💬 MONTESSORI AI CHAT SLIDE-UP MODAL (90% HEIGHT) */}
      {isChatOpen && createPortal(
        <>
          <div className="chat-slide-up-modal-overlay" onClick={handleAttemptCloseChat} />
          <div ref={chatPanelRef} className="chat-slide-up-content-panel animate-slide-up" onClick={e => e.stopPropagation()} onFocusCapture={handleFocusCapture}>
            
            {/* Drag handle pill visible only on Mobile bottom sheet */}
            <div className="sheet-drag-handle-pill mobile-only-drag-handle" />

            {/* Chat Header inside sliding panel */}
            <header className="chat-sliding-header">
              <div className="header-sliding-left">
                <div className="sliding-ai-avatar">
                  <LeafIcon size={20} strokeWidth={2} />
                  <span className="online-dot" />
                </div>
                <div>
                  <h3 className="sliding-title-label">Trợ lý Montessori AI</h3>
                </div>
              </div>
              <div className="header-sliding-right">
                {messages.length > 0 && (
                  <button 
                    className="clear-chat-sliding-btn" 
                    onClick={() => setShowDeleteConfirm(true)} 
                    title="Xóa cuộc trò chuyện"
                  >
                    <TrashIcon size={16} strokeWidth={2} />
                  </button>
                )}
                <button className="close-sliding-modal-btn" onClick={handleAttemptCloseChat}>✕</button>
              </div>
            </header>

            {/* Message bubbles list */}
            <div className="sliding-chat-messages-container">
              {messages.length === 0 ? (
                <div className="welcome-dashboard-inner-sliding">
                  <div className="sliding-welcome-hero">
                    <span className="sliding-welcome-avatar"><LeafIcon size={52} strokeWidth={1.6} /></span>
                    <h3 className="sliding-welcome-title">{assistantContext.title}</h3>
                    <p className="sliding-welcome-sub">{assistantContext.subtitle}</p>
                  </div>
                  <div className="welcome-suggestions-section">
                    <h4 className="suggestions-section-title">Gợi ý câu hỏi thông minh hôm nay</h4>
                    <div className="suggestions-grid">
                      {assistantContext.suggestions.map((q, i) => (
                        <button key={i} className="suggestion-card" onClick={() => sendMessage(q)}>
                          <span className="suggestion-card-bullet"><LeafIcon size={13} strokeWidth={2} /></span> {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} profile={profile} />
                  ))}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input row */}
            <div className="sliding-chat-input-area">
              {pendingImgs.length > 0 && (
                <div className="pending-images-row">
                  {pendingImgs.map(img => (
                    <div key={img.id} className="pending-img-thumb">
                      <img src={img.preview} alt="pending" />
                      <button className="remove-pending-img" onClick={() => removeImg(img.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="sliding-input-wrapper-glow">
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={pickImages} />
                <button className="attach-btn-sliding" onClick={() => fileInputRef.current?.click()} title="Đính kèm ảnh">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="4"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </button>
                <textarea
                  ref={textareaRef}
                  className="chat-input-sliding"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingImgs.length > 0 ? 'Thêm mô tả cho ảnh...' : assistantContext.placeholder}
                  rows={1}
                  disabled={isLoading}
                />
                <button className={`send-btn-sliding ${canSend ? 'ready' : ''}`} onClick={() => sendMessage()} disabled={!canSend}>
                  {(isLoading || uploadingImg) ? (
                    <span className="send-spinner" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

          </div>
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {showDeleteConfirm && createPortal(
        <div className="chat-delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="chat-delete-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon-wrapper">
              <TrashIcon size={24} strokeWidth={2} />
            </div>
            <h3 className="confirm-title">Xoá cuộc trò chuyện?</h3>
            <p className="confirm-desc">
              Toàn bộ nội dung trong cuộc trò chuyện hiện tại với Trợ lý Montessori AI sẽ được xoá.
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setShowDeleteConfirm(false)}>Huỷ</button>
              <button className="confirm-btn delete" onClick={handleConfirmDelete}>Xoá</button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 📥 4 INPUT TRACKER BOTTOM SHEETS (70% HEIGHT) */}
      {activeBottomSheet && createPortal(
        <>
          <div className="bottom-sheet-backdrop-overlay" onClick={handleAttemptCloseSheet} />
          <div ref={bottomSheetPanelRef} className="bottom-sheet-content-panel animate-slide-up" onClick={e => e.stopPropagation()} onFocusCapture={handleFocusCapture}>
            
            {/* Sliding Header top notch bar */}
            <div className="sheet-drag-handle-pill" />

            {/* 1. NUTRITION BOTTOM SHEET */}
            {activeBottomSheet === 'nutrition' && (() => {
              const babyAgeMonths = (ageInfo?.years || 0) * 12 + (ageInfo?.months || 0);
              const sheetTitle = 'Ghi nhận ăn uống (v2)';
              const childName = baby?.name || '';
              const sheetSubtitle = childName ? `Hôm nay ${childName} ăn gì rồi mẹ?` : 'Hôm nay bé ăn gì rồi mẹ?';

              // Build Segmented Tabs list dynamically based on child's age
              const tabsList = [];
              if (babyAgeMonths < 6) {
                tabsList.push({ id: 'breastfeeding', label: 'Bú mẹ' });
                tabsList.push({ id: 'milk', label: 'Bú bình' });
              } else if (babyAgeMonths < 12) {
                tabsList.push({ id: 'breastfeeding', label: 'Bú mẹ' });
                tabsList.push({ id: 'milk', label: 'Bú bình' });
                tabsList.push({ id: 'meal', label: 'Ăn dặm' });
              } else {
                tabsList.push({ id: 'meal', label: 'Bữa ăn' });
                tabsList.push({ id: 'milk', label: 'Sữa' });
                tabsList.push({ id: 'water', label: 'Nước' });
                tabsList.push({ id: 'breastfeeding', label: 'Bú mẹ' });
              }

              // Active save button logic
              let isSaveEnabled = false;
              let saveBtnText = 'Lưu cữ ăn';
              if (nutriTab === 'meal') {
                isSaveEnabled = !!mealType || !!appetite || (!!foodNote && foodNote.trim() !== '');
                saveBtnText = babyAgeMonths >= 12 ? 'Lưu bữa ăn' : 'Lưu cữ ăn';
              } else if (nutriTab === 'milk') {
                isSaveEnabled = !!milkType && Number(amountMl) > 0;
                saveBtnText = 'Lưu cữ sữa';
              } else if (nutriTab === 'water') {
                isSaveEnabled = Number(waterMl) > 0;
                saveBtnText = 'Lưu nước uống';
              } else if (nutriTab === 'breastfeeding') {
                isSaveEnabled = (breastLeftSec + breastRightSec) > 0;
                saveBtnText = 'Lưu cữ bú';
              }

              const currentTimeString = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

              return (
                <div className="tracker-sheet-viewport" style={{ maxHeight: '82vh', overflowY: 'auto', paddingBottom: '30px' }}>
                  <h3 className="tracker-sheet-title" style={{ marginBottom: '4px' }}>{sheetTitle}</h3>
                  <p className="tracker-sheet-subtitle" style={{ fontSize: '13.5px', color: '#687E70', margin: '0 0 20px', fontWeight: '500' }}>
                    {sheetSubtitle}
                  </p>
                  
                  {/* Segmented Control Tabs */}
                  <div className="tracker-subtabs-row" style={{ display: 'flex', background: '#EEF2EF', padding: '4px', borderRadius: '16px', gap: '4px', marginBottom: '24px' }}>
                    {tabsList.map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`subtab-chip ${nutriTab === tab.id ? 'active' : ''}`}
                        style={{
                          flex: 1,
                          padding: '10px 4px',
                          border: 'none',
                          background: nutriTab === tab.id ? '#FFFFFF' : 'transparent',
                          color: nutriTab === tab.id ? '#2F6B4F' : '#5C6E64',
                          fontWeight: '700',
                          fontSize: '13px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          boxShadow: nutriTab === tab.id ? '0 4px 12px rgba(47, 107, 79, 0.08)' : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onClick={() => setNutriTab(tab.id)}
                        disabled={isSavingNutri}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Errors / Warnings */}
                  {saveNutriError && (
                    <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#B91C1C', fontSize: '12.5px', marginBottom: '16px', textAlign: 'left' }}>
                      Chưa thể lưu cữ ăn. Mẹ thử lại sau một chút nhé.
                    </div>
                  )}

                  <div className="tracker-sheet-form-body" style={{ opacity: isSavingNutri ? 0.6 : 1, pointerEvents: isSavingNutri ? 'none' : 'auto' }}>
                    
                    {/* 🥣 TAB: MEAL (Bữa ăn / Ăn dặm) */}
                    {nutriTab === 'meal' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
                        {/* Section 1: Bữa nào? */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Bữa nào?
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { id: 'breakfast', label: 'Bữa sáng' },
                              { id: 'lunch', label: 'Bữa trưa' },
                              { id: 'dinner', label: 'Bữa tối' },
                              { id: 'snack', label: 'Bữa phụ' }
                            ].map(item => (
                              <button
                                key={item.id}
                                type="button"
                                style={{
                                  padding: '9px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderRadius: '100px',
                                  border: mealType === item.id ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                                  background: mealType === item.id ? '#F0F9F4' : '#FFFFFF',
                                  color: mealType === item.id ? '#2F6B4F' : '#55655B',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => setMealType(item.id)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Bé ăn thế nào? */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Bé ăn thế nào?
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { id: 'good', label: 'Ăn tốt' },
                              { id: 'medium', label: 'Ăn vừa' },
                              { id: 'poor', label: 'Ăn ít' },
                              { id: 'refused', label: 'Từ chối' }
                            ].map(item => (
                              <button
                                key={item.id}
                                type="button"
                                style={{
                                  padding: '9px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderRadius: '100px',
                                  border: appetite === item.id 
                                    ? (item.id === 'refused' ? '1.5px solid #D97706' : '1.5px solid #2F6B4F')
                                    : '1.5px solid #E2EFE7',
                                  background: appetite === item.id 
                                    ? (item.id === 'refused' ? '#FFFBEB' : '#F0F9F4')
                                    : '#FFFFFF',
                                  color: appetite === item.id 
                                    ? (item.id === 'refused' ? '#D97706' : '#2F6B4F')
                                    : '#55655B',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => setAppetite(item.id)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 3: Món ăn / ghi chú */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Món ăn / ghi chú
                          </label>
                          <textarea
                            style={{
                              width: '100%',
                              minHeight: '84px',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              border: '1px solid #E2EFE7',
                              fontSize: '16px', // iOS zoom safe minimum
                              fontFamily: 'inherit',
                              outline: 'none',
                              backgroundColor: '#FBFDFB',
                              boxSizing: 'border-box',
                              resize: 'none'
                            }}
                            value={foodNote}
                            onChange={e => setFoodNote(e.target.value)}
                            placeholder="Ví dụ: Cơm, trứng, canh rau. Bé ăn được nửa bát."
                          />
                        </div>

                        {/* Section 4: Thời gian */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4FAF6', padding: '12px 16px', borderRadius: '12px' }}>
                          <span style={{ fontSize: '13px', color: '#4E6856', fontWeight: '600' }}>Thời gian</span>
                          <span style={{ fontSize: '13px', color: '#2F6B4F', fontWeight: '700' }}>Hôm nay · {currentTimeString}</span>
                        </div>
                      </div>
                    )}

                    {/* 🍼 TAB: MILK (Sữa / Bú bình) */}
                    {nutriTab === 'milk' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
                        {/* Section 1: Loại sữa */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Loại sữa
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {[
                              { id: 'breast', label: 'Sữa mẹ' },
                              { id: 'formula', label: 'Sữa công thức' },
                              ...(babyAgeMonths >= 12 ? [{ id: 'fresh', label: 'Sữa tươi' }] : [])
                            ].map(item => (
                              <button
                                key={item.id}
                                type="button"
                                style={{
                                  padding: '9px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  borderRadius: '100px',
                                  border: milkType === item.id ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                                  background: milkType === item.id ? '#F0F9F4' : '#FFFFFF',
                                  color: milkType === item.id ? '#2F6B4F' : '#55655B',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => setMilkType(item.id)}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Section 2: Lượng sữa (Input + Quick Chips) */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Lượng sữa (ml)
                          </label>
                          <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                paddingRight: '48px',
                                borderRadius: '14px',
                                border: '1px solid #E2EFE7',
                                fontSize: '16px', // iOS zoom safe minimum
                                outline: 'none',
                                backgroundColor: '#FBFDFB',
                                boxSizing: 'border-box'
                              }}
                              placeholder="Nhập số ml"
                              value={amountMl}
                              onChange={e => setAmountMl(e.target.value)}
                            />
                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13.5px', fontWeight: '700', color: '#8A8A8A' }}>
                              ml
                            </span>
                          </div>
                          
                          {/* Quick selection ml chips */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['60', '120', '180', '240'].map(val => (
                              <button
                                key={val}
                                type="button"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  borderRadius: '8px',
                                  border: '1px solid #E2EFE7',
                                  background: amountMl === val ? '#F0F9F4' : '#F7FAF8',
                                  color: amountMl === val ? '#2F6B4F' : '#55655B',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => setAmountMl(val)}
                              >
                                {val} ml
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Optional notes */}
                        <div>
                          <label style={{ fontSize: '13px', color: '#4E6856', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                            Ghi chú thêm (tùy chọn)
                          </label>
                          <input
                            type="text"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: '1px solid #E2EFE7',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: '#FBFDFB',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Ghi chú thêm nếu cần"
                            value={foodNote}
                            onChange={e => setFoodNote(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* 🥤 TAB: WATER (Nước) */}
                    {nutriTab === 'water' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
                        {/* Section 1: Bé uống bao nhiêu nước? */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700' }}>
                              Bé uống bao nhiêu nước?
                            </label>
                            
                            {/* Toggle ml / ly */}
                            <div style={{ display: 'inline-flex', background: '#EEF2EF', padding: '2px', borderRadius: '8px' }}>
                              <button
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  border: 'none',
                                  borderRadius: '6px',
                                  background: waterInputMode === 'ml' ? 'white' : 'transparent',
                                  color: waterInputMode === 'ml' ? '#2F6B4F' : '#5C6E64',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setWaterInputMode('ml')}
                              >
                                ml
                              </button>
                              <button
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  border: 'none',
                                  borderRadius: '6px',
                                  background: waterInputMode === 'cup' ? 'white' : 'transparent',
                                  color: waterInputMode === 'cup' ? '#2F6B4F' : '#5C6E64',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setWaterInputMode('cup')}
                              >
                                Ly nhỏ
                              </button>
                            </div>
                          </div>

                          {/* Water input field */}
                          {waterInputMode === 'ml' ? (
                            <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                style={{
                                  width: '100%',
                                  padding: '12px 14px',
                                  paddingRight: '48px',
                                  borderRadius: '14px',
                                  border: '1px solid #E2EFE7',
                                  fontSize: '16px', // iOS zoom safe minimum
                                  outline: 'none',
                                  backgroundColor: '#FBFDFB',
                                  boxSizing: 'border-box'
                                }}
                                placeholder="Nhập số ml"
                                value={waterMl}
                                onChange={e => setWaterMl(e.target.value)}
                              />
                              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13.5px', fontWeight: '700', color: '#8A8A8A' }}>
                                ml
                              </span>
                            </div>
                          ) : (
                            <>
                              <div style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    paddingRight: '48px',
                                    borderRadius: '14px',
                                    border: '1px solid #E2EFE7',
                                    fontSize: '16px', // iOS zoom safe minimum
                                    outline: 'none',
                                    backgroundColor: '#FBFDFB',
                                    boxSizing: 'border-box'
                                  }}
                                  placeholder="Nhập số ly"
                                  value={Math.round(Number(waterMl) / 50) || ''}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setWaterMl(val > 0 ? String(val * 50) : '');
                                  }}
                                />
                                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13.5px', fontWeight: '700', color: '#8A8A8A' }}>
                                  ly
                                </span>
                              </div>
                              <p style={{ fontSize: '12.5px', color: '#687E70', margin: '-6px 0 14px 4px', fontStyle: 'italic', fontWeight: '500' }}>
                                * 1 ly nhỏ ≈ 50ml
                              </p>
                            </>
                          )}
                          
                          {/* Quick selection water chips */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {waterInputMode === 'ml' ? (
                              ['50', '100', '150', '200'].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #E2EFE7',
                                    background: waterMl === val ? '#F0F9F4' : '#F7FAF8',
                                    color: waterMl === val ? '#2F6B4F' : '#55655B',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onClick={() => setWaterMl(val)}
                                >
                                  {val} ml
                                </button>
                              ))
                            ) : (
                              [
                                { id: '50', label: '1 ly (50ml)' },
                                { id: '100', label: '2 ly (100ml)' },
                                { id: '150', label: '3 ly (150ml)' },
                                { id: '200', label: '4 ly (200ml)' }
                              ].map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    borderRadius: '8px',
                                    border: '1px solid #E2EFE7',
                                    background: waterMl === item.id ? '#F0F9F4' : '#F7FAF8',
                                    color: waterMl === item.id ? '#2F6B4F' : '#55655B',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onClick={() => setWaterMl(item.id)}
                                >
                                  {item.label}
                                </button>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Optional notes */}
                        <div>
                          <label style={{ fontSize: '13px', color: '#4E6856', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                            Ghi chú thêm (tùy chọn)
                          </label>
                          <input
                            type="text"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: '1px solid #E2EFE7',
                              fontSize: '14px',
                              outline: 'none',
                              backgroundColor: '#FBFDFB',
                              boxSizing: 'border-box'
                            }}
                            placeholder="Ghi chú thêm nếu cần"
                            value={foodNote}
                            onChange={e => setFoodNote(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* 🤱 TAB: BREASTFEEDING (Bú mẹ) */}
                    {nutriTab === 'breastfeeding' && (
                      <div className="direct-breast-stopwatch-group" style={{ width: '100%' }}>
                        <div className="breast-side-selector-row" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                          <button
                            type="button"
                            className={`side-choice-btn ${breastSide === 'left' ? 'active' : ''}`}
                            style={{
                              flex: 1,
                              padding: '12px',
                              fontSize: '13.5px',
                              fontWeight: '700',
                              border: breastSide === 'left' ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                              borderRadius: '12px',
                              background: breastSide === 'left' ? '#F0F9F4' : '#FFFFFF',
                              color: breastSide === 'left' ? '#2F6B4F' : '#55655B',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setBreastSide('left')}
                          >
                            Bên trái
                          </button>
                          <button
                            type="button"
                            className={`side-choice-btn ${breastSide === 'right' ? 'active' : ''}`}
                            style={{
                              flex: 1,
                              padding: '12px',
                              fontSize: '13.5px',
                              fontWeight: '700',
                              border: breastSide === 'right' ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                              borderRadius: '12px',
                              background: breastSide === 'right' ? '#F0F9F4' : '#FFFFFF',
                              color: breastSide === 'right' ? '#2F6B4F' : '#55655B',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setBreastSide('right')}
                          >
                            Bên phải
                          </button>
                        </div>

                        <div className="double-breast-stopwatches" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <div className="breast-watch-card" style={{ flex: 1, background: '#F8FAF9', padding: '14px', borderRadius: '14px', border: '1px solid #E2EFE7', textAlign: 'center' }}>
                            <div className="side-watch-title" style={{ fontSize: '11.5px', color: '#687E70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Bên trái</div>
                            <div className="side-watch-time" style={{ fontSize: '18px', color: '#2F6B4F', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{Math.floor(breastLeftSec / 60)}m {breastLeftSec % 60}s</span>
                            </div>
                          </div>
                          <div className="breast-watch-card" style={{ flex: 1, background: '#F8FAF9', padding: '14px', borderRadius: '14px', border: '1px solid #E2EFE7', textAlign: 'center' }}>
                            <div className="side-watch-title" style={{ fontSize: '11.5px', color: '#687E70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Bên phải</div>
                            <div className="side-watch-time" style={{ fontSize: '18px', color: '#2F6B4F', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{Math.floor(breastRightSec / 60)}m {breastRightSec % 60}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="watch-timer-actions-row" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <button
                            type="button"
                            className={`timer-trigger-pulse-btn ${breastDirectTimerActive ? 'running' : ''}`}
                            style={{
                              flex: 1,
                              padding: '14px 20px',
                              fontSize: '14px',
                              fontWeight: '700',
                              border: breastDirectTimerActive ? '1.5px solid #2F6B4F' : 'none',
                              borderRadius: '100px',
                              background: breastDirectTimerActive ? '#E8F5EE' : '#2F6B4F',
                              color: breastDirectTimerActive ? '#2F6B4F' : 'white',
                              cursor: 'pointer',
                              boxShadow: breastDirectTimerActive ? 'none' : '0 4px 14px rgba(47, 107, 79, 0.2)',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => setBreastDirectTimerActive(!breastDirectTimerActive)}
                          >
                            {breastDirectTimerActive ? 'Dừng bú' : 'Bắt đầu bú'}
                          </button>
                          <button
                            type="button"
                            className="timer-reset-flat-btn"
                            style={{
                              padding: '14px 24px',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              border: '1.5px solid #E2EFE7',
                              borderRadius: '100px',
                              background: (breastLeftSec + breastRightSec === 0) ? '#F7FAF8' : 'white',
                              color: (breastLeftSec + breastRightSec === 0) ? '#B0C0B5' : '#55655B',
                              cursor: (breastLeftSec + breastRightSec === 0) ? 'not-allowed' : 'pointer',
                              opacity: (breastLeftSec + breastRightSec === 0) ? 0.6 : 1,
                              transition: 'all 0.2s ease'
                            }}
                            disabled={breastLeftSec + breastRightSec === 0}
                            onClick={() => {
                              setBreastLeftSec(0);
                              setBreastRightSec(0);
                              setBreastDirectTimerActive(false);
                            }}
                          >
                            Làm lại
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Nút nhắc nhở nhẹ nếu chưa điền thông tin */}
                    {!isSaveEnabled && !isSavingNutri && (
                      <p style={{ fontSize: '12.5px', color: '#7A8E82', margin: '12px 0 0', fontStyle: 'italic', textAlign: 'center' }}>
                        * {nutriTab === 'breastfeeding' ? 'Mẹ ghi nhận thời gian bú trước khi lưu nhé.' : 'Mẹ ghi nhận ít nhất một thông tin trước khi lưu nhé.'}
                      </p>
                    )}

                    {/* STICKY FOOTER SAVE BUTTON */}
                    <button
                      className="submit-tracker-log-btn-full"
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '100px',
                        background: isSaveEnabled ? '#2F6B4F' : '#C2D1C8',
                        color: 'white',
                        border: 'none',
                        fontSize: '15px',
                        fontWeight: '700',
                        marginTop: '20px',
                        cursor: isSaveEnabled ? 'pointer' : 'not-allowed',
                        boxShadow: isSaveEnabled ? '0 8px 24px rgba(47, 107, 79, 0.25)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={handleSaveNutrition}
                      disabled={isSavingNutri || !isSaveEnabled}
                    >
                      {isSavingNutri ? 'Đang lưu...' : saveBtnText}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 2. SLEEP BOTTOM SHEET */}
            {activeBottomSheet === 'sleep' && (() => {
              const childName = baby?.name || '';
              const sheetSubtitle = childName 
                ? `${childName} đang ngủ hay mẹ muốn ghi lại giấc ngủ đã qua?`
                : 'Bé đang ngủ hay mẹ muốn ghi lại giấc ngủ đã qua?';

              return (
                <div className="tracker-sheet-viewport" style={{ maxHeight: '82vh', overflowY: 'auto', paddingBottom: '30px', position: 'relative' }}>
                  <h3 className="tracker-sheet-title" style={{ marginBottom: '4px' }}>Ghi nhận giấc ngủ (v2)</h3>
                  <p className="tracker-sheet-subtitle" style={{ fontSize: '13.5px', color: '#687E70', margin: '0 0 20px', fontWeight: '500', textAlign: 'left' }}>
                    {sheetSubtitle}
                  </p>

                  {/* Segmented Control Tabs */}
                  <div className="tracker-subtabs-row" style={{ display: 'flex', background: '#EEF2EF', padding: '4px', borderRadius: '16px', gap: '4px', marginBottom: '24px' }}>
                    <button
                      type="button"
                      className={`subtab-chip ${sleepTab === 'live' ? 'active' : ''}`}
                      style={{
                        flex: 1,
                        padding: '10px 4px',
                        border: 'none',
                        background: sleepTab === 'live' ? '#FFFFFF' : 'transparent',
                        color: sleepTab === 'live' ? '#2F6B4F' : '#5C6E64',
                        fontWeight: '700',
                        fontSize: '13px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: sleepTab === 'live' ? '0 4px 12px rgba(47, 107, 79, 0.08)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={() => {
                        setSleepTab('live');
                        if (!hasManuallySetSleepType) {
                          const startHour = (sleepActive && sleepStartTime) ? sleepStartTime.getHours() : new Date().getHours();
                          setSleepType(startHour >= 6 && startHour < 18 ? 'day' : 'night');
                        }
                      }}
                      disabled={isSavingSleep}
                    >
                      Đang ngủ
                    </button>
                    <button
                      type="button"
                      className={`subtab-chip ${sleepTab === 'manual' ? 'active' : ''}`}
                      style={{
                        flex: 1,
                        padding: '10px 4px',
                        border: 'none',
                        background: sleepTab === 'manual' ? '#FFFFFF' : 'transparent',
                        color: sleepTab === 'manual' ? '#2F6B4F' : '#5C6E64',
                        fontWeight: '700',
                        fontSize: '13px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: sleepTab === 'manual' ? '0 4px 12px rgba(47, 107, 79, 0.08)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={() => {
                        setSleepTab('manual');
                        if (!hasManuallySetSleepType && manualStartStr) {
                          const [hh] = manualStartStr.split(':').map(Number);
                          if (!isNaN(hh)) {
                            setSleepType(hh >= 6 && hh < 18 ? 'day' : 'night');
                          }
                        }
                      }}
                      disabled={isSavingSleep}
                    >
                      Ngủ đã xong
                    </button>
                  </div>

                  {/* Errors / Warnings */}
                  {saveSleepError && (
                    <div style={{ padding: '14px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '14px', color: '#D97706', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: '700' }}>Chưa thể lưu giấc ngủ</p>
                      <p style={{ margin: '0 0 10px' }}>Mẹ thử lại sau một chút nhé.</p>
                      <button 
                        type="button" 
                        style={{
                          padding: '6px 12px',
                          background: '#D97706',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                        onClick={handleSaveSleep}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}

                  <div className="tracker-sheet-form-body" style={{ opacity: isSavingSleep ? 0.6 : 1, pointerEvents: isSavingSleep ? 'none' : 'auto' }}>
                    
                    {/* 🌙 TAB: LIVE SLEEP (Đang ngủ) */}
                    {sleepTab === 'live' && (
                      <>
                        {sleepFlowState === 'idle' && (
                          <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <h4 style={{ fontSize: '12px', color: '#687E70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                              Giấc ngủ hiện tại
                            </h4>
                            <div style={{ fontSize: '36px', color: '#2F6B4F', fontWeight: '800', margin: '12px 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                              </svg>
                              <span>0 phút</span>
                            </div>
                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '100px',
                                background: '#2F6B4F',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '15px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(47, 107, 79, 0.2)',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => {
                                const start = new Date();
                                setSleepFlowState('running');
                                setSleepActive(true);
                                setSleepStartTime(start);
                                setSleepEndTime(null);
                                setSleepSecs(0);
                                if (!hasManuallySetSleepType) {
                                  const h = start.getHours();
                                  setSleepType(h >= 6 && h < 18 ? 'day' : 'night');
                                }
                              }}
                            >
                              Bắt đầu ngủ
                            </button>
                            <p style={{ fontSize: '12.5px', color: '#7A8E82', marginTop: '16px', fontStyle: 'italic', fontWeight: '500' }}>
                              Mẹ bấm bắt đầu khi bé vừa ngủ, rồi kết thúc khi bé thức dậy.
                            </p>
                          </div>
                        )}

                        {sleepFlowState === 'running' && (
                          <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <h4 style={{ fontSize: '12px', color: '#D97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                              Đang ngủ
                            </h4>
                            <div style={{ fontSize: '36px', color: '#2F6B4F', fontWeight: '800', margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{Math.floor(sleepSecs / 60)} phút {sleepSecs % 60}s</span>
                            </div>
                            <p style={{ fontSize: '13px', color: '#687E70', margin: '0 0 24px', fontWeight: '600' }}>
                              Bắt đầu lúc {sleepStartTime ? sleepStartTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                type="button"
                                style={{
                                  flex: 2,
                                  padding: '14px 20px',
                                  fontSize: '14px',
                                  fontWeight: '700',
                                  border: 'none',
                                  borderRadius: '100px',
                                  background: '#2F6B4F',
                                  color: 'white',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 14px rgba(47, 107, 79, 0.2)',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => {
                                  setSleepActive(false);
                                  setSleepFlowState('finished');
                                  const end = new Date();
                                  setSleepEndTime(end);
                                  const startHour = sleepStartTime ? sleepStartTime.getHours() : new Date().getHours();
                                  if (!hasManuallySetSleepType) {
                                    setSleepType(startHour >= 6 && startHour < 18 ? 'day' : 'night');
                                  }
                                }}
                              >
                                Kết thúc giấc ngủ
                              </button>
                              <button
                                type="button"
                                style={{
                                  flex: 1,
                                  padding: '14px 20px',
                                  fontSize: '13.5px',
                                  fontWeight: '600',
                                  border: '1.5px solid #E2EFE7',
                                  borderRadius: '100px',
                                  background: 'white',
                                  color: '#55655B',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => setShowSleepResetConfirm(true)}
                              >
                                Làm lại
                              </button>
                            </div>
                          </div>
                        )}

                        {sleepFlowState === 'finished' && (
                          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: '#F4FAF6', padding: '16px', borderRadius: '16px', border: '1px solid #E2EFE7', textAlign: 'center' }}>
                              <h4 style={{ fontSize: '11px', color: '#687E70', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
                                Giấc ngủ đã kết thúc
                              </h4>
                              <p style={{ fontSize: '18px', color: '#2F6B4F', fontWeight: '800', margin: '0 0 4px' }}>
                                {sleepStartTime ? sleepStartTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} – {sleepEndTime ? sleepEndTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                              <p style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', margin: 0 }}>
                                Tổng thời gian: {Math.round(sleepSecs / 60) || 1} phút
                              </p>
                            </div>

                            {/* Loại giấc ngủ */}
                            <div>
                              <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                                Loại giấc ngủ
                              </label>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  type="button"
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    border: sleepType === 'day' 
                                      ? (hasManuallySetSleepType ? '1.5px solid #2F6B4F' : '1.5px dashed #2F6B4F')
                                      : '1.5px solid #E2EFE7',
                                    borderRadius: '12px',
                                    background: sleepType === 'day' 
                                      ? (hasManuallySetSleepType ? '#F0F9F4' : '#F7FAF8')
                                      : '#FFFFFF',
                                    color: sleepType === 'day' ? '#2F6B4F' : '#55655B',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() => handleSelectSleepType('day')}
                                >
                                  Ngủ ngày
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    flex: 1,
                                    padding: '12px',
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    border: sleepType === 'night' 
                                      ? (hasManuallySetSleepType ? '1.5px solid #2F6B4F' : '1.5px dashed #2F6B4F')
                                      : '1.5px solid #E2EFE7',
                                    borderRadius: '12px',
                                    background: sleepType === 'night' 
                                      ? (hasManuallySetSleepType ? '#F0F9F4' : '#F7FAF8')
                                      : '#FFFFFF',
                                    color: sleepType === 'night' ? '#2F6B4F' : '#55655B',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() => handleSelectSleepType('night')}
                                >
                                  Ngủ đêm
                                </button>
                              </div>
                            </div>

                            {/* Ghi chú */}
                            <div>
                              <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                                Ghi chú nếu cần
                              </label>
                              <textarea
                                style={{
                                  width: '100%',
                                  minHeight: '80px',
                                  padding: '12px 14px',
                                  borderRadius: '14px',
                                  border: '1px solid #E2EFE7',
                                  fontSize: '16px', // iOS zoom safe
                                  fontFamily: 'inherit',
                                  outline: 'none',
                                  backgroundColor: '#FBFDFB',
                                  boxSizing: 'border-box',
                                  resize: 'none'
                                }}
                                placeholder="Ví dụ: Bé ngủ dễ, tỉnh dậy vui vẻ."
                                value={sleepNote}
                                onChange={e => setSleepNote(e.target.value)}
                              />
                            </div>

                            {/* Footer Nút Lưu */}
                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '100px',
                                background: '#2F6B4F',
                                color: 'white',
                                border: 'none',
                                fontSize: '15px',
                                fontWeight: '700',
                                marginTop: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(47, 107, 79, 0.25)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                              onClick={handleSaveSleep}
                              disabled={isSavingSleep}
                            >
                              {isSavingSleep ? 'Đang lưu...' : 'Lưu giấc ngủ'}
                            </button>
                            
                            {/* Link flat button to go back to timer */}
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#687E70',
                                fontSize: '13px',
                                fontWeight: '600',
                                textDecoration: 'underline',
                                textAlign: 'center',
                                cursor: 'pointer',
                                marginTop: '-10px',
                                width: '100%'
                              }}
                              onClick={() => setShowSleepResetConfirm(true)}
                            >
                              Làm lại giấc ngủ
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* 📝 TAB: MANUAL SLEEP (Ngủ đã xong) */}
                    {sleepTab === 'manual' && (
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Bé ngủ lúc nào? */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Bé ngủ lúc nào?
                          </label>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '12.5px', color: '#687E70', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Bắt đầu</span>
                              <input
                                type="time"
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid #E2EFE7',
                                  fontSize: '16px', // iOS safe zoom
                                  outline: 'none',
                                  backgroundColor: '#FBFDFB',
                                  boxSizing: 'border-box'
                                }}
                                value={manualStartStr}
                                onChange={e => handleManualStartChange(e.target.value)}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: '12.5px', color: '#687E70', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Kết thúc</span>
                              <input
                                type="time"
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid #E2EFE7',
                                  fontSize: '16px', // iOS safe zoom
                                  outline: 'none',
                                  backgroundColor: '#FBFDFB',
                                  boxSizing: 'border-box'
                                }}
                                value={manualEndStr}
                                onChange={e => setManualEndStr(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Duration calculation / Warning */}
                          {(() => {
                            const duration = getManualDuration();
                            const isInvalid = !manualStartStr || !manualEndStr || duration <= 0;
                            
                            if (isInvalid) {
                              return (
                                <p style={{ fontSize: '12.5px', color: '#7A8E82', margin: '8px 0 0', fontStyle: 'italic', fontWeight: '600' }}>
                                  * Giờ kết thúc cần sau giờ bắt đầu.
                                </p>
                              );
                            }
                            
                            const hours = Math.floor(duration / 60);
                            const mins = duration % 60;
                            return (
                              <p style={{ fontSize: '13px', color: '#2F6B4F', margin: '8px 0 0', fontWeight: '700' }}>
                                Tổng thời gian: {hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`}
                              </p>
                            );
                          })()}
                        </div>

                        {/* Loại giấc ngủ */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Loại giấc ngủ
                          </label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: '13.5px',
                                fontWeight: '700',
                                border: sleepType === 'day' 
                                  ? (hasManuallySetSleepType ? '1.5px solid #2F6B4F' : '1.5px dashed #2F6B4F')
                                  : '1.5px solid #E2EFE7',
                                borderRadius: '12px',
                                background: sleepType === 'day' 
                                  ? (hasManuallySetSleepType ? '#F0F9F4' : '#F7FAF8')
                                  : '#FFFFFF',
                                color: sleepType === 'day' ? '#2F6B4F' : '#55655B',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => handleSelectSleepType('day')}
                            >
                              Ngủ ngày
                            </button>
                            <button
                              type="button"
                              style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: '13.5px',
                                fontWeight: '700',
                                border: sleepType === 'night' 
                                  ? (hasManuallySetSleepType ? '1.5px solid #2F6B4F' : '1.5px dashed #2F6B4F')
                                  : '1.5px solid #E2EFE7',
                                borderRadius: '12px',
                                background: sleepType === 'night' 
                                  ? (hasManuallySetSleepType ? '#F0F9F4' : '#F7FAF8')
                                  : '#FFFFFF',
                                color: sleepType === 'night' ? '#2F6B4F' : '#55655B',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => handleSelectSleepType('night')}
                            >
                              Ngủ đêm
                            </button>
                          </div>
                        </div>

                        {/* Ghi chú */}
                        <div>
                          <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                            Ghi chú nếu cần
                          </label>
                          <textarea
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              border: '1px solid #E2EFE7',
                              fontSize: '16px', // iOS safe zoom
                              fontFamily: 'inherit',
                              outline: 'none',
                              backgroundColor: '#FBFDFB',
                              boxSizing: 'border-box',
                              resize: 'none'
                            }}
                            placeholder="Ví dụ: Bé ngủ ngắn, tỉnh giữa giấc."
                            value={sleepNote}
                            onChange={e => setSleepNote(e.target.value)}
                          />
                        </div>

                        {/* Footer Nút Lưu */}
                        <button
                          type="button"
                          style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '100px',
                            background: (getManualDuration() > 0 && manualStartStr && manualEndStr) ? '#2F6B4F' : '#C2D1C8',
                            color: 'white',
                            border: 'none',
                            fontSize: '15px',
                            fontWeight: '700',
                            marginTop: '10px',
                            cursor: (getManualDuration() > 0 && manualStartStr && manualEndStr) ? 'pointer' : 'not-allowed',
                            boxShadow: (getManualDuration() > 0 && manualStartStr && manualEndStr) ? '0 8px 24px rgba(47, 107, 79, 0.25)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onClick={handleSaveSleep}
                          disabled={isSavingSleep || getManualDuration() <= 0 || !manualStartStr || !manualEndStr}
                        >
                          {isSavingSleep ? 'Đang lưu...' : 'Lưu giấc ngủ'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 🚨 Custom Confirmation Dialog for Resetting stopwatch */}
                  {showSleepResetConfirm && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(3px)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      zIndex: 999,
                      borderRadius: '28px 28px 0 0'
                    }} onClick={() => setShowSleepResetConfirm(false)}>
                      <div style={{
                        background: '#FFFFFF',
                        width: '100%',
                        padding: '24px 20px 34px',
                        borderRadius: '24px 24px 0 0',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)'
                      }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '40px', height: '4px', background: '#E2EFE7', borderRadius: '10px', margin: '0 auto 16px' }} />
                        <h4 style={{ fontSize: '17px', color: '#1A3326', fontWeight: '700', margin: '0 0 8px' }}>
                          Làm lại giấc ngủ?
                        </h4>
                        <p style={{ fontSize: '13.5px', color: '#687E70', margin: '0 0 24px', fontWeight: '500', lineHeight: '1.4' }}>
                          Thời gian đang ghi nhận sẽ được xóa.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button
                            type="button"
                            style={{
                              width: '100%',
                              padding: '14px',
                              borderRadius: '100px',
                              background: '#2F6B4F',
                              color: '#FFFFFF',
                              fontWeight: '700',
                              fontSize: '14.5px',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(47, 107, 79, 0.15)'
                            }}
                            onClick={() => {
                              setSleepActive(false);
                              setSleepSecs(0);
                              setSleepStartTime(null);
                              setSleepEndTime(null);
                              setSleepFlowState('idle');
                              setShowSleepResetConfirm(false);
                            }}
                          >
                            Làm lại
                          </button>
                          <button
                            type="button"
                            style={{
                              width: '100%',
                              padding: '14px',
                              borderRadius: '100px',
                              background: '#FFFFFF',
                              color: '#55655B',
                              fontWeight: '700',
                              fontSize: '14.5px',
                              border: '1.5px solid #E2EFE7',
                              cursor: 'pointer'
                            }}
                            onClick={() => setShowSleepResetConfirm(false)}
                          >
                            Tiếp tục ghi nhận
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 3. DIAPER BOTTOM SHEET */}
            {activeBottomSheet === 'diaper' && (() => {
              const babyAgeMonths = (ageInfo?.years || 0) * 12 + (ageInfo?.months || 0);
              const childName = baby?.name || '';
              const sheetTitle = babyAgeMonths >= 18 
                ? (babyAgeMonths <= 36 ? 'Vệ sinh / Tập bô (v2)' : 'Ghi nhận Vệ sinh (v2)') 
                : 'Ghi nhận thay tã (v2)';
              const subtitle = childName ? `Hôm nay ${childName} đi vệ sinh thế nào mẹ?` : 'Hôm nay bé đi vệ sinh thế nào mẹ?';

              // Inline line icon SVGs
              const DiaperLineIcon = () => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M2 10h20v2a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z" />
                  <circle cx="12" cy="13" r="1.5" />
                </svg>
              );

              const PottyLineIcon = () => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10h10v4a5 5 0 0 1-10 0z" />
                  <path d="M5 5v5a7 7 0 0 0 14 0V5" />
                  <path d="M12 17v4" />
                  <path d="M9 21h6" />
                </svg>
              );

              const ToiletLineIcon = () => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v8h6V5a3 3 0 0 0-3-3z" />
                  <path d="M19 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z" />
                  <path d="M12 13v4" />
                </svg>
              );

              // Validate if save is enabled
              const isSaveEnabled = pottyCategory !== null;

              // Compute placeholder and submit button text
              let pottyPlaceholder = 'Ví dụ: Bé tự gọi mẹ, bé hợp tác...';
              let saveBtnText = 'Lưu ghi nhận';
              if (pottyCategory === 'diaper') {
                pottyPlaceholder = 'Ví dụ: Tã rất đầy, bé hơi hăm, phân mềm...';
                saveBtnText = 'Lưu thay tã';
              } else if (pottyCategory === 'potty') {
                pottyPlaceholder = 'Ví dụ: Bé tự ngồi bô, bé gọi mẹ, bé chưa hợp tác...';
                saveBtnText = 'Lưu tập bô';
              } else if (pottyCategory === 'toilet') {
                pottyPlaceholder = 'Ví dụ: Bé tự gọi mẹ, tè nhiều, phân hơi cứng...';
                saveBtnText = 'Lưu vệ sinh';
              }

              return (
                <div className="tracker-sheet-viewport" style={{ maxHeight: '82vh', overflowY: 'auto', paddingBottom: '30px', position: 'relative' }}>
                  <h3 className="tracker-sheet-title" style={{ marginBottom: '4px' }}>{sheetTitle}</h3>
                  <p className="tracker-sheet-subtitle" style={{ fontSize: '13.5px', color: '#687E70', margin: '0 0 20px', fontWeight: '500', textAlign: 'left' }}>
                    {subtitle}
                  </p>

                  {/* Errors / Warnings */}
                  {savePottyError && (
                    <div style={{ padding: '14px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '14px', color: '#D97706', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: '700' }}>Chưa thể lưu ghi nhận</p>
                      <p style={{ margin: '0 0 10px' }}>Mẹ thử lại sau một chút nhé.</p>
                      <button 
                        type="button" 
                        style={{
                          padding: '6px 12px',
                          background: '#D97706',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        onClick={handleSaveDiaper}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}

                  <div className="tracker-sheet-form-body" style={{ opacity: isSavingPotty ? 0.6 : 1, pointerEvents: isSavingPotty ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* SECTION 1: Category Selector (Hidden for babies < 18 months) */}
                    {babyAgeMonths >= 18 && (
                      <div>
                        <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '10px' }}>
                          Con vừa làm gì?
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          
                          {/* Card 1: Thay tã */}
                          <button
                            type="button"
                            onClick={() => setPottyCategory('diaper')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              border: pottyCategory === 'diaper' ? '2px solid #2F6B4F' : '1px solid #E2EFE7',
                              background: pottyCategory === 'diaper' ? '#F0F9F4' : '#FFFFFF',
                              color: pottyCategory === 'diaper' ? '#2F6B4F' : '#2D3732',
                              textAlign: 'left',
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ color: pottyCategory === 'diaper' ? '#2F6B4F' : '#7A8E82' }}>
                              <DiaperLineIcon />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '13.5px' }}>Thay tã</div>
                              <div style={{ fontSize: '11.5px', color: pottyCategory === 'diaper' ? '#4E6856' : '#7A8E82', marginTop: '2px', fontWeight: '500' }}>
                                Ghi nhận tã ướt/bẩn
                              </div>
                            </div>
                            {pottyCategory === 'diaper' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>

                          {/* Card 2: Ngồi bô */}
                          <button
                            type="button"
                            onClick={() => setPottyCategory('potty')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              border: pottyCategory === 'potty' ? '2px solid #2F6B4F' : '1px solid #E2EFE7',
                              background: pottyCategory === 'potty' ? '#F0F9F4' : '#FFFFFF',
                              color: pottyCategory === 'potty' ? '#2F6B4F' : '#2D3732',
                              textAlign: 'left',
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ color: pottyCategory === 'potty' ? '#2F6B4F' : '#7A8E82' }}>
                              <PottyLineIcon />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '13.5px' }}>Ngồi bô</div>
                              <div style={{ fontSize: '11.5px', color: pottyCategory === 'potty' ? '#4E6856' : '#7A8E82', marginTop: '2px', fontWeight: '500' }}>
                                Bé ngồi bô, có hoặc chưa có kết quả
                              </div>
                            </div>
                            {pottyCategory === 'potty' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>

                          {/* Card 3: Đi vệ sinh */}
                          <button
                            type="button"
                            onClick={() => setPottyCategory('toilet')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              border: pottyCategory === 'toilet' ? '2px solid #2F6B4F' : '1px solid #E2EFE7',
                              background: pottyCategory === 'toilet' ? '#F0F9F4' : '#FFFFFF',
                              color: pottyCategory === 'toilet' ? '#2F6B4F' : '#2D3732',
                              textAlign: 'left',
                              cursor: 'pointer',
                              width: '100%',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ color: pottyCategory === 'toilet' ? '#2F6B4F' : '#7A8E82' }}>
                              <ToiletLineIcon />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '13.5px' }}>Đi vệ sinh</div>
                              <div style={{ fontSize: '11.5px', color: pottyCategory === 'toilet' ? '#4E6856' : '#7A8E82', marginTop: '2px', fontWeight: '500' }}>
                                Bé đã tè/ị ngoài tã
                              </div>
                            </div>
                            {pottyCategory === 'toilet' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: Subtype details based on Category */}
                    {pottyCategory === 'diaper' && (
                      <div>
                        <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                          Loại tã
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                          {[
                            { key: 'wet', label: 'Ướt' },
                            { key: 'dirty', label: 'Bẩn' },
                            { key: 'both', label: 'Cả hai' },
                            { key: 'dry', label: 'Khô' }
                          ].map(item => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setPottyDiaperType(pottyDiaperType === item.key ? null : item.key)}
                              style={{
                                padding: '12px',
                                fontSize: '13px',
                                fontWeight: '700',
                                border: pottyDiaperType === item.key ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                                borderRadius: '12px',
                                background: pottyDiaperType === item.key ? '#F0F9F4' : '#F7FAF8',
                                color: pottyDiaperType === item.key ? '#2F6B4F' : '#55655B',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {pottyCategory === 'potty' && (
                      <div>
                        <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                          Kết quả
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { key: 'success', label: 'Có đi' },
                            { key: 'no_result', label: 'Chưa đi' },
                            { key: 'practice', label: 'Chỉ làm quen' }
                          ].map(item => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setPottyResult(pottyResult === item.key ? null : item.key)}
                              style={{
                                flex: 1,
                                padding: '12px 6px',
                                fontSize: '12.5px',
                                fontWeight: '700',
                                border: pottyResult === item.key ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                                borderRadius: '12px',
                                background: pottyResult === item.key ? '#F0F9F4' : '#F7FAF8',
                                color: pottyResult === item.key ? '#2F6B4F' : '#55655B',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {pottyCategory === 'toilet' && (
                      <div>
                        <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                          Bé đi gì?
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { key: 'pee', label: 'Đi tè' },
                            { key: 'poop', label: 'Đi ị' },
                            { key: 'both', label: 'Cả hai' }
                          ].map(item => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setPottyToiletType(pottyToiletType === item.key ? null : item.key)}
                              style={{
                                flex: 1,
                                padding: '12px 6px',
                                fontSize: '12.5px',
                                fontWeight: '700',
                                border: pottyToiletType === item.key ? '1.5px solid #2F6B4F' : '1.5px solid #E2EFE7',
                                borderRadius: '12px',
                                background: pottyToiletType === item.key ? '#F0F9F4' : '#F7FAF8',
                                color: pottyToiletType === item.key ? '#2F6B4F' : '#55655B',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION 3: Time Picker */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAF8', padding: '10px 14px', borderRadius: '12px', border: '1px solid #EEF5F1' }}>
                      <span style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700' }}>Thời gian</span>
                      <input
                        type="time"
                        value={pottyTimeStr}
                        onChange={(e) => setPottyTimeStr(e.target.value)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #E2EFE7',
                          fontSize: '16px',
                          outline: 'none',
                          backgroundColor: '#FBFDFB',
                          color: '#2F6B4F',
                          fontWeight: '700'
                        }}
                      />
                    </div>

                    {/* SECTION 4: Ghi chú */}
                    <div>
                      <label style={{ fontSize: '13.5px', color: '#4E6856', fontWeight: '700', display: 'block', marginBottom: '8px' }}>
                        Ghi chú nếu cần
                      </label>
                      <textarea
                        value={pottyNote}
                        onChange={(e) => setPottyNote(e.target.value)}
                        placeholder={pottyPlaceholder}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: '1px solid #E2EFE7',
                          fontSize: '16px',
                          outline: 'none',
                          backgroundColor: '#FBFDFB',
                          boxSizing: 'border-box',
                          resize: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Sticky Footer Save Button */}
                  <div style={{ marginTop: '24px' }}>
                    {!isSaveEnabled && (
                      <p style={{ fontSize: '12.5px', color: '#7A8E82', fontStyle: 'italic', fontWeight: '600', marginBottom: '12px', textAlign: 'center' }}>
                        Mẹ chọn một hoạt động để lưu nhé.
                      </p>
                    )}
                    <button
                      type="button"
                      className="submit-tracker-log-btn-full"
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '100px',
                        background: isSaveEnabled ? '#2F6B4F' : '#A3B8AC',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '15px',
                        border: 'none',
                        cursor: isSaveEnabled ? 'pointer' : 'not-allowed',
                        boxShadow: isSaveEnabled ? '0 8px 24px rgba(47, 107, 79, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                        pointerEvents: isSavingPotty ? 'none' : 'auto'
                      }}
                      onClick={handleSaveDiaper}
                      disabled={!isSaveEnabled || isSavingPotty}
                    >
                      {isSavingPotty ? 'Đang lưu...' : saveBtnText}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 4. GROWTH BOTTOM SHEET */}
            {activeBottomSheet === 'growth' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Chỉ số Phát triển</h3>

                <div className="growth-ruler-sliders-pack">
                  
                  {/* Weight Ruler */}
                  <div className="ruler-slider-node">
                    <div className="ruler-title-meta-display">
                      <span className="ruler-name">Cân nặng (kg)</span>
                      <h4 className="ruler-current-value font-weight-bold">{growthWeight} kg</h4>
                    </div>
                    <div className="horizontal-ruler-simulation">
                      <input type="range" min="2.0" max="25.0" step="0.1" value={growthWeight} className="horizontal-styled-ruler-bar" onChange={e => setGrowthWeight(Number(e.target.value))} />
                      <div className="ticks-decor-line">
                        {Array.from({ length: 16 }).map((_, i) => <span key={i} className="ruler-tick" />)}
                      </div>
                    </div>
                  </div>

                  {/* Height Ruler */}
                  <div className="ruler-slider-node">
                    <div className="ruler-title-meta-display">
                      <span className="ruler-name">Chiều cao (cm)</span>
                      <h4 className="ruler-current-value font-weight-bold">{growthHeight} cm</h4>
                    </div>
                    <div className="horizontal-ruler-simulation">
                      <input type="range" min="40" max="110" step="0.5" value={growthHeight} className="horizontal-styled-ruler-bar" onChange={e => setGrowthHeight(Number(e.target.value))} />
                      <div className="ticks-decor-line">
                        {Array.from({ length: 16 }).map((_, i) => <span key={i} className="ruler-tick" />)}
                      </div>
                    </div>
                  </div>

                  {/* AI Smart Insight Banner */}
                  <div className="growth-ai-smart-insight-banner">
                    <span className="insight-sparkles-icon">✨</span>
                    <div className="insight-content-wrapper">
                      <h5 className="insight-heading-label">AI Smart Insight</h5>
                      <p className="insight-body-text">Minh Anh đang phát triển rất tốt. Cân nặng đạt chuẩn WHO!</p>
                    </div>
                  </div>

                  <button className="submit-tracker-log-btn-full" onClick={handleSaveGrowth}>
                    Lưu chỉ số
                  </button>
                </div>
              </div>
            )}

            {/* 5. PREGNANCY: KICK BOTTOM SHEET */}
            {activeBottomSheet === 'kick' && (
              <div className="tracker-sheet-viewport" style={{ paddingBottom: '24px' }}>
                <h3 className="tracker-sheet-title" style={{ marginBottom: '4px' }}>Đếm thai máy</h3>
                <p className="tracker-sheet-subtitle" style={{ fontSize: '13.5px', color: '#7C8B80', margin: '0 0 16px 0' }}>
                  Bấm mỗi khi mẹ cảm nhận bé cử động.
                </p>

                {/* Twin notice */}
                {isTwin && (
                  <div className="twin-kick-notice" style={{
                    backgroundColor: '#FFFDF4',
                    border: '1px solid #F6ECD1',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D683B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>
                    </svg>
                    <p style={{ fontSize: '13px', color: '#7D683B', margin: 0, lineHeight: '1.4' }}>
                      Với thai đôi, mẹ có thể ghi nhận cảm nhận chung. Nếu phân biệt được vị trí của từng bé, mẹ có thể ghi chú thêm.
                    </p>
                  </div>
                )}

                {/* Instruction card */}
                <div className="kick-instruction-card" style={{
                  backgroundColor: '#F4FAF6',
                  border: '1px solid #E2EFE7',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5FAF82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>
                  </svg>
                  <p style={{ fontSize: '13px', color: '#4E6856', margin: 0, lineHeight: '1.4' }}>
                    Mẹ hãy chọn lúc thư giãn và bấm mỗi khi cảm nhận bé cử động.
                  </p>
                </div>

                <div className="pregnancy-timer-box text-center" style={{ marginTop: '16px' }}>
                  {/* Grid layout to completely prevent text collision */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '16px',
                      border: '1px solid #EEEEEE',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '12px', color: '#666666', display: 'block', marginBottom: '4px' }}>Thời gian đếm</span>
                      <strong style={{ fontSize: '14.5px', color: '#333333', display: 'block' }}>
                        {Math.floor(kickSecs / 60)} phút {kickSecs % 60} giây
                      </strong>
                    </div>
                    <div style={{
                      backgroundColor: '#F8F9FA',
                      padding: '12px',
                      borderRadius: '16px',
                      border: '1px solid #EEEEEE',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '12px', color: '#666666', display: 'block', marginBottom: '4px' }}>Số lần máy</span>
                      <strong style={{ fontSize: '14.5px', color: '#2E7D32', display: 'block' }}>
                        {kickCount} lần
                      </strong>
                    </div>
                  </div>

                  {/* Main circular button with heartbeat wave SVG instead of baby emoji */}
                  <button
                    type="button"
                    className="kick-button-tap-modern animate-pulse-subtle"
                    onClick={() => {
                      setKickCount(c => c + 1);
                      if (!kickActive) setKickActive(true);
                      triggerChime();
                    }}
                    style={{
                      width: '140px',
                      height: '140px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #E8F5E9 0%, #C8E6C9 100%)',
                      border: '2px solid #81C784',
                      color: '#2E7D32',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      fontWeight: '700',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(76, 175, 80, 0.15)',
                      cursor: 'pointer',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      margin: '12px auto 20px auto',
                      outline: 'none',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}>
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <span>Bé máy (+1)</span>
                  </button>

                  {/* Action buttons row with SVG icons instead of emojis */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    <button
                      type="button"
                      className="timer-flat-pill-btn"
                      disabled={kickSecs === 0 && kickCount === 0}
                      onClick={() => setKickActive(!kickActive)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        fontSize: '12.5px',
                        borderRadius: '12px',
                        backgroundColor: (kickSecs === 0 && kickCount === 0) ? '#FAFAFA' : '#FFFFFF',
                        border: (kickSecs === 0 && kickCount === 0) ? '1px solid #EEEEEE' : '1px solid #DDDDDD',
                        color: (kickSecs === 0 && kickCount === 0) ? '#BBBBBB' : '#333333',
                        fontWeight: '500',
                        cursor: (kickSecs === 0 && kickCount === 0) ? 'not-allowed' : 'pointer',
                        opacity: (kickSecs === 0 && kickCount === 0) ? 0.6 : 1
                      }}
                    >
                      {kickActive ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></svg>
                          Tạm dừng
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          Tiếp tục
                        </span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      className="timer-flat-pill-btn"
                      disabled={kickCount === 0}
                      onClick={() => {
                        setKickActive(false);
                        setKickCount(0);
                        setKickSecs(0);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        fontSize: '12.5px',
                        borderRadius: '12px',
                        backgroundColor: kickCount > 0 ? '#FFFFFF' : '#FAFAFA',
                        border: kickCount > 0 ? '1px solid #DDDDDD' : '1px solid #EEEEEE',
                        color: kickCount > 0 ? '#333333' : '#BBBBBB',
                        fontWeight: '500',
                        cursor: kickCount > 0 ? 'pointer' : 'not-allowed',
                        opacity: kickCount > 0 ? 1 : 0.6
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
                        Đếm lại
                      </span>
                    </button>

                    <button
                      type="button"
                      className="timer-flat-pill-btn"
                      disabled={kickCount === 0}
                      onClick={() => {
                        if (kickCount > 0) setKickCount(c => c - 1);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        fontSize: '12.5px',
                        borderRadius: '12px',
                        backgroundColor: kickCount > 0 ? '#FFFFFF' : '#FAFAFA',
                        border: kickCount > 0 ? '1px solid #DDDDDD' : '1px solid #EEEEEE',
                        color: kickCount > 0 ? '#333333' : '#BBBBBB',
                        fontWeight: '500',
                        cursor: kickCount > 0 ? 'pointer' : 'not-allowed',
                        opacity: kickCount > 0 ? 1 : 0.6
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center', width: '100%' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                        Hoàn tác (-1)
                      </span>
                    </button>
                  </div>

                  {/* Safety note card with premium soft warm cream colors & amber stroke SVG */}
                  <div className="kick-safety-card" style={{
                    backgroundColor: '#FFFDF4',
                    border: '1px solid #F6ECD1',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    textAlign: 'left'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4A33C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
                    </svg>
                    <p style={{ fontSize: '12.5px', color: '#7D683B', margin: 0, lineHeight: '1.45' }}>
                      Nếu mẹ cảm thấy thai máy giảm rõ rệt hoặc khác thường so với mọi ngày, hãy liên hệ bác sĩ/cơ sở y tế.
                    </p>
                  </div>

                  {/* Save kick error banner */}
                  {saveKickError && (
                    <div className="emotion-alert-banner emotion-error-banner animate-fade-in" style={{ marginBottom: '16px' }}>
                      <span>Chưa thể lưu buổi đếm. Mẹ thử lại sau một chút nhé.</span>
                    </div>
                  )}

                  {/* Save button (disabled if kickCount === 0) */}
                  <button
                    className="submit-tracker-log-btn-full"
                    onClick={handleSaveKick}
                    disabled={isSavingKick || kickCount === 0}
                    style={{
                      width: '100%',
                      backgroundColor: kickCount > 0 ? '#5FAF82' : '#C2DBCB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: (isSavingKick || kickCount === 0) ? 'not-allowed' : 'pointer',
                      opacity: isSavingKick ? 0.7 : 1,
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {isSavingKick ? 'Đang lưu...' : saveKickError ? 'Thử lại' : 'Lưu buổi đếm'}
                  </button>
                </div>
              </div>
            )}

            {/* 6. PREGNANCY: CONTRACTIONS BOTTOM SHEET */}
            {activeBottomSheet === 'contractions' && (() => {
              const formatDurationVi = (secs) => {
                if (secs === null || secs === undefined) return '—';
                if (secs < 60) return `${secs} giây`;
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
              };

              const formatIntervalVi = (secs) => {
                if (secs === null || secs === undefined) return '';
                if (secs < 60) return ` cách cơn trước ${secs} giây`;
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                return s > 0 ? ` cách cơn trước ${m} phút ${s} giây` : ` cách cơn trước ${m} phút`;
              };

              const lastItem = contractionList.length > 0 ? contractionList[contractionList.length - 1] : null;

              return (
                <div className="tracker-sheet-viewport">
                  <h3 className="tracker-sheet-title">Theo dõi cơn gò</h3>
                  
                  <div className="contra-session-time-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="contra-session-clock-icon">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Thời gian theo dõi: {Math.floor(contraSecs / 60)} phút {contraSecs % 60} giây</span>
                  </div>

                  <p className="contra-subtitle">
                    Bấm bắt đầu khi cơn gò xuất hiện và kết thúc khi cơn gò dịu lại.
                  </p>

                  {/* Bento Grid Metrics */}
                  <div className="contra-grid-dashboard">
                    <div className="contra-metric-card">
                      <span className="contra-metric-label">Tổng số cơn</span>
                      <div className="contra-metric-value-row">
                        <span className="contra-metric-value">{contraCount}</span>
                        <span className="contra-metric-unit"> cơn</span>
                      </div>
                    </div>
                    <div className={`contra-metric-card${inContraction ? ' active-glow' : ''}`}>
                      <span className="contra-metric-label">Cơn hiện tại</span>
                      <div className="contra-metric-value-row">
                        <span className="contra-metric-value">
                          {inContraction ? `${contractionCurrentSecs}s` : '—'}
                        </span>
                        {inContraction && <span className="contra-metric-unit"> đang gò</span>}
                      </div>
                    </div>
                    <div className="contra-metric-card">
                      <span className="contra-metric-label">Cơn gần nhất</span>
                      <div className="contra-metric-value-row">
                        <span className="contra-metric-value">
                          {lastItem ? `${lastItem.durationSeconds}s` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="contra-metric-card">
                      <span className="contra-metric-label">Khoảng cách gần nhất</span>
                      <div className="contra-metric-value-row">
                        <span className="contra-metric-value" style={{ fontSize: lastItem && lastItem.intervalSeconds >= 60 ? '14px' : '18px' }}>
                          {lastItem && lastItem.intervalSeconds !== null ? formatDurationVi(lastItem.intervalSeconds) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Trigger Button */}
                  <div className="contra-primary-action-container">
                    <button
                      type="button"
                      className={`contra-toggle-btn ${inContraction ? 'active' : 'idle'}`}
                      onClick={handleContractionToggle}
                      disabled={isSavingContra}
                    >
                      {inContraction ? 'Kết thúc cơn gò' : 'Bắt đầu cơn gò'}
                    </button>
                  </div>

                  {/* Secondary Controllers */}
                  <div className="contra-secondary-actions-row">
                    <button
                      type="button"
                      className="contra-flat-btn"
                      onClick={handleUndoContra}
                      disabled={contractionList.length === 0 || isSavingContra}
                    >
                      Hoàn tác
                    </button>
                    <button
                      type="button"
                      className="contra-flat-btn"
                      onClick={handleResetContraSession}
                      disabled={isSavingContra}
                    >
                      Làm lại
                    </button>
                  </div>

                  {/* Contractions Session History */}
                  <div className="contra-history-section">
                    <span className="contra-history-header">Lịch sử cơn gò</span>
                    {contractionList.length === 0 ? (
                      <p className="contra-history-empty">Chưa có cơn gò nào trong buổi này.</p>
                    ) : (
                      <div className="contra-history-list">
                        {contractionList.map((item, idx) => (
                          <div key={idx} className="contra-history-item">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="contra-history-bullet-icon">
                              <circle cx="12" cy="12" r="6" />
                            </svg>
                            <span className="contra-history-item-c">Cơn {idx + 1}</span>
                            <span className="contra-history-item-d"> · {formatDurationVi(item.durationSeconds)}</span>
                            {item.intervalSeconds !== null && (
                              <span className="contra-history-item-i"> · {formatIntervalVi(item.intervalSeconds)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medical Safety Warnings Note */}
                  <div className="contra-safety-card">
                    <div className="contra-safety-icon-wrapper">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <p className="contra-safety-text">
                      Nếu cơn gò đều, đau nhiều, ra máu, vỡ ối, thai máy giảm hoặc mẹ chưa đủ 37 tuần mà có dấu hiệu chuyển dạ, hãy liên hệ bác sĩ/cơ sở y tế.
                    </p>
                  </div>

                  {/* Sticky Save Footer */}
                  <div className="contra-sticky-footer">
                    {saveContraError && (
                      <div className="contra-save-error-banner">
                        Chưa thể lưu buổi ghi nhận. Mẹ thử lại sau một chút nhé.
                      </div>
                    )}
                    {contraCount === 0 && (
                      <p className="contra-empty-warning-tip">
                        Mẹ hãy ghi nhận ít nhất 1 cơn gò trước khi lưu nhé.
                      </p>
                    )}
                    <button
                      type="button"
                      className="submit-tracker-log-btn-full"
                      onClick={handleSaveContra}
                      disabled={contraCount === 0 || isSavingContra}
                      style={{
                        opacity: (contraCount === 0 || isSavingContra) ? 0.6 : 1,
                        cursor: (contraCount === 0 || isSavingContra) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSavingContra ? 'Đang lưu...' : (saveContraError ? 'Thử lại' : 'Lưu buổi ghi nhận')}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 7. PREGNANCY: WEIGHT BOTTOM SHEET */}
            {activeBottomSheet === 'preg_weight' && (() => {
              // Calculate slider range dynamically based on last weight
              const wLogs = activityLogs.filter(l => l.type === 'preg_weight');
              const todayStr = new Date().toISOString().split('T')[0];
              const prevLogs = wLogs.filter(l => l.date !== todayStr);
              const lastWeight = prevLogs.length > 0 ? prevLogs[0].weightKg : (wLogs.length > 0 ? wLogs[0].weightKg : null);
              
              let min = 35;
              let max = 120;
              if (lastWeight) {
                min = Math.max(30, lastWeight - 15);
                max = Math.min(200, lastWeight + 15);
              }
              
              const currentVal = Number(pregWeight);
              if (!isNaN(currentVal) && currentVal > 0) {
                if (currentVal < min) min = Math.max(30, Math.floor(currentVal - 5));
                if (currentVal > max) max = Math.min(200, Math.ceil(currentVal + 5));
              }

              min = Math.round(min * 10) / 10;
              max = Math.round(max * 10) / 10;

              // Previous weight analysis
              let deltaText = '';
              if (lastWeight !== null) {
                const delta = (currentVal - lastWeight).toFixed(1);
                const sign = delta > 0 ? '+' : '';
                deltaText = `Lần trước: ${lastWeight} kg · ${sign}${delta} kg`;
              } else {
                deltaText = "Đây sẽ là mốc cân nặng đầu tiên của mẹ.";
              }

              const isWeightValid = !isNaN(currentVal) && currentVal >= 30 && currentVal <= 200;
              const hasPrePreg = profile?.prePregnancyWeight !== undefined && profile?.prePregnancyWeight !== null && profile?.prePregnancyWeight !== 0;

              return (
                <div className="tracker-sheet-viewport">
                  <h3 className="tracker-sheet-title">Cân nặng thai kỳ</h3>
                  <p className="tracker-sheet-subtitle" style={{ fontSize: '14px', color: '#7C8B80', marginTop: '-12px', marginBottom: '16px' }}>
                    Ghi nhận cân nặng hiện tại của mẹ hôm nay.
                  </p>

                  {/* Large Input Selector */}
                  <div className="weight-numeric-input-wrapper">
                    <input
                      type="number"
                      step="0.1"
                      className="weight-numeric-input"
                      value={pregWeight === '' ? '' : pregWeight}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setPregWeight('');
                        } else {
                          setPregWeight(Number(val));
                        }
                      }}
                      placeholder="0.0"
                    />
                    <span className="weight-unit-label">kg</span>
                  </div>

                  {/* Slider Control */}
                  <div className="ruler-slider-node" style={{ padding: '0 8px' }}>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step="0.1"
                      value={currentVal || min}
                      className="weight-slider-input"
                      onChange={e => setPregWeight(Number(e.target.value))}
                    />
                    <div className="weight-ticks-line">
                      {Array.from({ length: 11 }).map((_, i) => (
                        <span key={i} className={`weight-tick-indicator ${i % 5 === 0 ? 'major' : ''}`} />
                      ))}
                    </div>
                  </div>

                  {/* Weight comparison analysis badge */}
                  <div className="weight-comparison-badge">
                    {deltaText}
                  </div>

                  {/* Warning banner */}
                  {!isWeightValid && pregWeight !== '' && (
                    <div className="weight-warning-banner" style={{ marginTop: '16px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Mẹ kiểm tra lại cân nặng vừa nhập nhé.</span>
                    </div>
                  )}

                  {/* Pre-pregnancy weight helper card */}
                  {!hasPrePreg && (
                    <div className="prepreg-card-box">
                      <div className="prepreg-card-header">
                        Thêm cân nặng trước thai kỳ để theo dõi mức tăng chính xác hơn.
                      </div>
                      {!showPrePregInput ? (
                        <button type="button" className="prepreg-btn-trigger" onClick={() => setShowPrePregInput(true)}>
                          Thêm thông tin
                        </button>
                      ) : (
                        <div className="prepreg-inline-form">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="kg"
                            className="prepreg-inline-input"
                            value={prePregInputValue}
                            onChange={e => setPrePregInputValue(e.target.value)}
                          />
                          <button
                            type="button"
                            className="prepreg-save-btn"
                            disabled={isSavingPrePreg || !prePregInputValue || Number(prePregInputValue) < 30 || Number(prePregInputValue) > 200}
                            onClick={handleSavePrePregWeight}
                          >
                            {isSavingPrePreg ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {saveWeightError && (
                    <p style={{ color: '#d9534f', fontSize: '13px', margin: '8px 0 0', textAlign: 'center' }}>
                      Lỗi khi lưu cân nặng. Vui lòng thử lại.
                    </p>
                  )}

                  {/* Submit Button */}
                  <div style={{ marginTop: '24px' }}>
                    <button
                      className="submit-tracker-log-btn-full"
                      onTouchStart={e => {
                        e.preventDefault();
                        handleSavePregWeight();
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSavePregWeight();
                      }}
                      onClick={handleSavePregWeight}
                      disabled={isSavingWeight || !isWeightValid}
                    >
                      {isSavingWeight ? 'Đang lưu...' : 'Lưu cân nặng'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 8. PREGNANCY: REMINDERS & VITAMINS */}
            {activeBottomSheet === 'preg_reminders' && (() => {
              const vitaminInfo = [
                { 
                  key: 'Folic', 
                  label: 'Axit Folic', 
                  sub: 'Ngừa dị tật ống thần kinh', 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2z" />
                      <path d="M9 22v-4" />
                    </svg>
                  )
                },
                { 
                  key: 'Iron', 
                  label: 'Sắt & B9', 
                  sub: 'Phòng ngừa thiếu máu, thiếu sắt', 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
                    </svg>
                  )
                },
                { 
                  key: 'Calcium', 
                  label: 'Canxi hữu cơ', 
                  sub: 'Hỗ trợ phát triển hệ xương & răng', 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-45 12 12)" />
                      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" />
                    </svg>
                  )
                },
                { 
                  key: 'DHA', 
                  label: 'DHA & Omega 3', 
                  sub: 'Phát triển não bộ và thị giác của bé', 
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z" />
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
                    </svg>
                  )
                }
              ];

              return (
                <div className="tracker-sheet-viewport">
                  <h3 className="tracker-sheet-title">Ghi nhận Vitamin &amp; Nước</h3>
                  <p className="vitamin-intro-meta" style={{ marginBottom: '16px' }}>
                    Tích chọn vi chất mẹ đã uống và cập nhật lượng nước hôm nay.
                  </p>

                  {/* Nước hôm nay Section */}
                  <div className="water-tracker-container">
                    <div className="water-tracker-info">
                      <div className="water-tracker-label-group">
                        <span className="water-tracker-label">Nước uống hôm nay</span>
                        <span className="water-tracker-count">{waterCount} / {waterTarget} ly</span>
                      </div>
                      <div className="water-tracker-controls">
                        <button 
                          type="button" 
                          className="water-btn minus" 
                          onClick={() => setWaterCount(prev => Math.max(0, prev - 1))}
                          disabled={isSavingVitamins}
                        >
                          −
                        </button>
                        <button 
                          type="button" 
                          className="water-btn plus" 
                          onClick={() => setWaterCount(prev => prev + 1)}
                          disabled={isSavingVitamins}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="water-progress-bar-bg">
                      <div 
                        className="water-progress-bar-fill" 
                        style={{ width: `${Math.min(100, (waterCount / waterTarget) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Vi chất hôm nay Section */}
                  <h4 style={{ color: '#2F6B4F', fontSize: '14px', fontWeight: '700', margin: '0 0 10px 0' }}>Vi chất hôm nay</h4>
                  
                  {configuredVitamins.length === 0 ? (
                    <div className="vitamin-empty-state">
                      <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </div>
                      <p className="empty-state-title">Chưa có vi chất nào trong lịch nhắc</p>
                      <p className="empty-state-desc">Mẹ có thể thêm vi chất theo chỉ định của bác sĩ.</p>
                      <button 
                        type="button" 
                        className="empty-state-action-btn"
                        onClick={() => setConfiguredVitamins(['Folic', 'Iron', 'Calcium', 'DHA'])}
                      >
                        Thêm vi chất
                      </button>
                    </div>
                  ) : (
                    <div className="vitamin-cards-list">
                      {vitaminInfo
                        .filter(item => configuredVitamins.includes(item.key))
                        .map(item => (
                          <label key={item.key} className={`vitamin-card-row ${vitaminsLogged[item.key] ? 'checked' : ''}`}>
                            <div className="vitamin-card-left">
                              <div className="vitamin-checkbox-wrapper">
                                <input 
                                  type="checkbox" 
                                  checked={vitaminsLogged[item.key]} 
                                  onChange={e => setVitaminsLogged({ ...vitaminsLogged, [item.key]: e.target.checked })} 
                                  className="vitamin-checkbox-input"
                                  disabled={isSavingVitamins}
                                />
                                <span className="vitamin-checkbox-custom">
                                  {vitaminsLogged[item.key] && (
                                    <svg className="checkmark-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </span>
                              </div>
                              <div className="vitamin-card-icon-wrap">
                                {item.icon}
                              </div>
                              <div className="vitamin-card-info">
                                <span className="vitamin-card-label">{item.label}</span>
                                <span className="vitamin-card-sub">{item.sub}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}

                  {/* Error display */}
                  {saveVitaminsError && (
                    <div className="vitamin-error-alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Chưa thể lưu ghi nhận. Mẹ thử lại sau một chút nhé.</span>
                    </div>
                  )}

                  {/* Primary Save Button */}
                  <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                    <button 
                      className="submit-tracker-log-btn-full" 
                      onTouchStart={e => {
                        e.preventDefault();
                        handleSaveVitamins();
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSaveVitamins();
                      }}
                      onClick={handleSaveVitamins}
                      disabled={isSavingVitamins}
                      style={{ margin: 0 }}
                    >
                      {isSavingVitamins ? "Đang lưu..." : saveVitaminsError ? "Thử lại" : "Lưu ghi nhận hôm nay"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 9. PREGNANCY: CLINIC CHECKUP BOTTOM SHEET */}
            {activeBottomSheet === 'preg_clinic' && (
              <>
                <div className="tracker-sheet-viewport clinic-sheet-viewport">
                  <h3 className="tracker-sheet-title" style={{ marginBottom: '6px' }}>Ghi nhận khám thai</h3>
                  <p className="clinic-subtitle">Lưu lại kết quả khám và lịch hẹn tiếp theo của mẹ.</p>

                  {isClinicLoading ? (
                    <div className="clinic-skeleton-container">
                      <div className="clinic-skeleton-item">
                        <div className="clinic-skeleton-label"></div>
                        <div className="clinic-skeleton-input"><div className="clinic-shimmer"></div></div>
                      </div>
                      <div className="clinic-skeleton-item">
                        <div className="clinic-skeleton-label"></div>
                        <div className="clinic-skeleton-textarea"><div className="clinic-shimmer"></div></div>
                      </div>
                      <div className="clinic-skeleton-item">
                        <div className="clinic-skeleton-label"></div>
                        <div className="clinic-skeleton-chips">
                          <div className="clinic-skeleton-chip" style={{ width: '80px' }}></div>
                          <div className="clinic-skeleton-chip" style={{ width: '80px' }}></div>
                          <div className="clinic-skeleton-chip" style={{ width: '80px' }}></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Banners */}
                      {showValidationWarning && (
                        <div className="clinic-warning-banner">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          <span>Mẹ hãy thêm nội dung khám hoặc ngày hẹn tiếp theo trước khi lưu nhé.</span>
                        </div>
                      )}

                      {nextApptDate && isDateInPast(nextApptDate) && (
                        <div className="clinic-warning-banner">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span>Mẹ kiểm tra lại ngày hẹn khám nhé.</span>
                        </div>
                      )}

                      {saveClinicError && (
                        <div className="clinic-error-banner">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            <span>Lưu thất bại. Vui lòng thử lại.</span>
                          </div>
                          <button type="button" className="clinic-retry-btn" onClick={handleSavePregClinic}>Thử lại</button>
                        </div>
                      )}

                      {/* Ngày khám */}
                      <div className="clinic-input-group">
                        <label className="clinic-label">Ngày khám</label>
                        <button
                          type="button"
                          className="clinic-date-input-wrapper"
                          disabled={isSavingClinic}
                          onClick={() => setShowVisitDateCalendar(true)}
                        >
                          <div className="clinic-custom-date-display">
                            <div className="clinic-date-icon-text">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              <span className="clinic-date-value">{formatDateForDisplay(visitDate) || "Hôm nay"}</span>
                            </div>
                            <span className="clinic-date-chevron">▼</span>
                          </div>
                        </button>
                      </div>

                      {/* Nội dung kết quả khám */}
                      <div className="clinic-input-group">
                        <label className="clinic-label">Nội dung hoặc kết quả khám</label>
                        <textarea
                          id="clinic-note-textarea"
                          placeholder="Mẹ ghi lại kết quả siêu âm hoặc lưu ý của bác sĩ..."
                          value={clinicNote}
                          disabled={isSavingClinic}
                          onChange={(e) => setClinicNote(e.target.value)}
                          className="clinic-textarea"
                        />

                        {/* Quick Suggestions Chips */}
                        <div className="clinic-suggestions-container">
                          <div className="clinic-suggestions-section">
                            <div className="clinic-section-header">
                              <span className="clinic-section-title">Chỉ số siêu âm (mm, g)</span>
                              <button
                                type="button"
                                className="clinic-info-trigger-btn"
                                onClick={() => setShowInfoModal(true)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                <span>Giải thích chỉ số</span>
                              </button>
                            </div>
                            <div className="clinic-chips-grid">
                              {[
                                { label: 'BPD', template: 'BPD: -- mm' },
                                { label: 'FL', template: 'FL: -- mm' },
                                { label: 'AC', template: 'AC: -- mm' },
                                { label: 'HC', template: 'HC: -- mm' },
                                { label: 'CRL', template: 'CRL: -- mm' },
                                { label: 'EFW', template: 'EFW: -- g' }
                              ].map((chip) => (
                                <button
                                  key={chip.label}
                                  type="button"
                                  disabled={isSavingClinic}
                                  onClick={() => handleQuickChipClick(chip.label, chip.template)}
                                  className={`clinic-quick-chip ${activeChipLabel === chip.label ? 'chip-active' : ''}`}
                                >
                                  + {chip.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="clinic-suggestions-section">
                            <span className="clinic-section-title">Thông tin khám</span>
                            <div className="clinic-chips-grid">
                              {[
                                { label: 'Tim thai', template: 'Tim thai: -- bpm' },
                                { label: 'Lưu ý bác sĩ', template: 'Lưu ý bác sĩ: --' },
                                { label: 'Kết quả xét nghiệm', template: 'Kết quả xét nghiệm: --' },
                                { label: 'Lịch tái khám', template: 'Lịch tái khám: --' }
                              ].map((chip) => (
                                <button
                                  key={chip.label}
                                  type="button"
                                  disabled={isSavingClinic}
                                  onClick={() => handleQuickChipClick(chip.label, chip.template)}
                                  className={`clinic-quick-chip ${activeChipLabel === chip.label ? 'chip-active' : ''}`}
                                >
                                  + {chip.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ngày hẹn khám tiếp theo */}
                      <div className="clinic-input-group">
                        <label className="clinic-label">Ngày hẹn khám tiếp theo</label>
                        <button
                          type="button"
                          className="clinic-date-input-wrapper"
                          disabled={isSavingClinic}
                          onClick={() => setShowNextApptDateCalendar(true)}
                        >
                          <div className="clinic-custom-date-display">
                            <div className="clinic-date-icon-text">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              <span className="clinic-date-value">
                                {nextApptDate ? formatDateForDisplay(nextApptDate) : "Chọn ngày hẹn khám"}
                              </span>
                            </div>
                            <span className="clinic-date-chevron">▼</span>
                          </div>
                        </button>
                      </div>

                      {/* Reminder Toggle Card */}
                      {nextApptDate && (
                        <div className="clinic-reminder-toggle-card">
                          <div className="clinic-reminder-info">
                            <span className="clinic-reminder-title">Nhắc lịch khám trước 1 ngày</span>
                            <span className="clinic-reminder-desc">Nhận thông báo để không bỏ lỡ lịch hẹn</span>
                          </div>
                          <label className="clinic-toggle-switch">
                            <input
                              type="checkbox"
                              checked={reminderEnabled}
                              disabled={isSavingClinic}
                              onChange={(e) => setReminderEnabled(e.target.checked)}
                            />
                            <span className="clinic-toggle-slider"></span>
                          </label>
                        </div>
                      )}

                      <button
                        className="submit-tracker-log-btn-full"
                        onClick={handleSavePregClinic}
                        disabled={isSavingClinic}
                        style={{ marginTop: '10px' }}
                      >
                        {isSavingClinic ? "Đang lưu..." : "Lưu lịch khám"}
                      </button>
                    </div>
                  )}
                </div>

                {showInfoModal && (
                  <div className="clinic-info-modal-overlay" onClick={() => setShowInfoModal(false)}>
                    <div className="clinic-info-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="clinic-modal-header">
                        <h4 className="clinic-modal-title">Giải thích chỉ số siêu âm</h4>
                        <button
                          type="button"
                          className="clinic-modal-close-btn"
                          onClick={() => setShowInfoModal(false)}
                        >
                          &times;
                        </button>
                      </div>
                      <div className="clinic-modal-body">
                        {[
                          { acronym: 'BPD (Biparietal Diameter)', desc: 'Đường kính lưỡng đỉnh: Đo ngang qua xương tai từ hai bên đầu của bé, giúp ước tính tuổi thai và cân nặng.' },
                          { acronym: 'FL (Femur Length)', desc: 'Chiều dài xương đùi: Đo chiều dài xương đùi của bé, phản ánh sự phát triển chiều dài cơ thể.' },
                          { acronym: 'AC (Abdominal Circumference)', desc: 'Chu vi vòng bụng: Đo xung quanh bụng bé, là chỉ số quan trọng nhất để ước lượng cân nặng thai nhi.' },
                          { acronym: 'HC (Head Circumference)', desc: 'Chu vi vòng đầu: Đo vòng quanh đầu của bé, giúp kiểm tra sự phát triển não bộ.' },
                          { acronym: 'CRL (Crown Rump Length)', desc: 'Chiều dài đầu mông: Đo từ đỉnh đầu đến mông bé, dùng chủ yếu trong 3 tháng đầu để tính tuổi thai cực chính xác.' },
                          { acronym: 'EFW (Estimated Fetal Weight)', desc: 'Cân nặng thai nhi ước tính: Tính toán dựa trên các chỉ số BPD, FL, AC, HC để theo dõi sự tăng trưởng của bé.' }
                        ].map((item) => (
                          <div key={item.acronym} className="clinic-acronym-item">
                            <span className="clinic-acronym-name">{item.acronym}</span>
                            <span className="clinic-acronym-desc">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                      <div className="clinic-modal-footer">
                        <button
                          type="button"
                          className="clinic-modal-ok-btn"
                          onClick={() => setShowInfoModal(false)}
                        >
                          Đồng ý
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 10. PREGNANCY: EMOTION TRACKER BOTTOM SHEET */}
            {activeBottomSheet === 'preg_emotion' && (
              <div className="tracker-sheet-viewport emotion-sheet-viewport">
                <h3 className="tracker-sheet-title">Cảm xúc mẹ bầu hôm nay</h3>
                
                {isEmotionLoading ? (
                  <div className="emotion-skeleton-container">
                    <div className="skeleton-line skeleton-title" />
                    <div className="skeleton-chips-grid">
                      <div className="skeleton-chip" />
                      <div className="skeleton-chip" />
                      <div className="skeleton-chip" />
                      <div className="skeleton-chip" />
                      <div className="skeleton-chip" />
                    </div>
                    <div className="skeleton-line skeleton-intensity-label" />
                    <div className="skeleton-intensity-bar" />
                    <div className="skeleton-card skeleton-ai-card" />
                    <div className="skeleton-textarea" />
                    <div className="skeleton-button" />
                  </div>
                ) : (
                  <div className="emotion-sheet-content">
                    {/* Chips section */}
                    <div className="emotion-chips-section">
                      <div className="emotion-chips-grid">
                        {Object.keys(emotionIconMap).map(state => {
                          const IconComponent = emotionIconMap[state];
                          const isSelected = selectedEmotions.includes(state);
                          return (
                            <button
                              key={state}
                              type="button"
                              className={`emotion-chip-btn ${isSelected ? 'active' : ''}`}
                              onClick={() => handleEmotionClick(state)}
                              disabled={isSavingEmotion}
                            >
                              <span className="emotion-chip-icon">
                                <IconComponent />
                              </span>
                              <span className="emotion-chip-label">{state}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Intensity control */}
                    {selectedEmotions.length > 0 && (
                      <div className="emotion-intensity-section animate-fade-in">
                        <label className="emotion-section-label">Mức độ hôm nay:</label>
                        <div className="intensity-segmented-control">
                          {['Nhẹ', 'Vừa', 'Nhiều'].map(level => (
                            <button
                              key={level}
                              type="button"
                              className={`intensity-segment-btn ${emotionIntensity === level ? 'active' : ''}`}
                              onClick={() => setEmotionIntensity(level)}
                              disabled={isSavingEmotion}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI suggestion card */}
                    <div className="emotion-ai-section">
                      {selectedEmotions.length > 0 ? (
                        <div className="emotion-ai-card active-suggestion animate-fade-in">
                          <div className="ai-card-header">
                            <LeafSparkleIcon />
                            <span className="ai-card-title">Gợi ý từ AI</span>
                          </div>
                          <p className="ai-card-text">
                            {getEmotionAiSuggestion(selectedEmotions)}
                          </p>
                        </div>
                      ) : (
                        <div className="emotion-ai-card placeholder-dashed">
                          <div className="ai-card-header">
                            <LeafSparkleIcon />
                            <span className="ai-card-title">Gợi ý từ AI</span>
                          </div>
                          <p className="ai-card-text placeholder-text">
                            Mẹ hãy chọn ít nhất một cảm xúc ở trên để nhận lời khuyên gợi ý từ AI nhé.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notes field */}
                    <div className="emotion-notes-section">
                      <label className="emotion-section-label">Ghi chú tâm sự (nếu có)</label>
                      <textarea
                        className="emotion-notes-textarea"
                        placeholder="Mẹ bầu có cảm nhận hay tâm sự gì muốn lưu giữ hôm nay không..."
                        value={emotionNote}
                        onChange={e => setEmotionNote(e.target.value)}
                        disabled={isSavingEmotion}
                      />
                    </div>

                    {/* Save button */}
                    <button
                      className="submit-tracker-log-btn-full"
                      onClick={handleSavePregEmotion}
                      disabled={isSavingEmotion}
                      style={{ marginTop: '10px' }}
                    >
                      {isSavingEmotion ? "Đang lưu..." : "Lưu cảm xúc hiện tại"}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ── IOS-STYLE CONFIRM CLOSE DIALOG ── */}
      {confirmCloseTarget && createPortal(
        <div className="ios-confirm-overlay" onClick={() => setConfirmCloseTarget(null)}>
          <div className="ios-confirm-card" onClick={e => e.stopPropagation()}>
            <h3 className="ios-confirm-title">Bỏ thay đổi?</h3>
            <p className="ios-confirm-message">Mẹ có muốn bỏ các thay đổi đang nhập không?</p>
            <div className="ios-confirm-buttons">
              <button type="button" className="ios-confirm-btn danger" onClick={handleConfirmDiscard}>
                Bỏ thay đổi
              </button>
              <button type="button" className="ios-confirm-btn" onClick={() => setConfirmCloseTarget(null)}>
                Tiếp tục nhập
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}


      {/* ── DATE PICKERS (visit date & next appointment) ── */}
      {showVisitDateCalendar && createPortal(
        <AppDatePicker
          value={visitDate}
          onConfirm={(dateStr) => {
            setVisitDate(dateStr);
            setShowVisitDateCalendar(false);
          }}
          onCancel={() => setShowVisitDateCalendar(false)}
          dateType="visitDate"
        />,
        document.getElementById('modal-root') || document.body
      )}

      {showNextApptDateCalendar && createPortal(
        <AppDatePicker
          value={nextApptDate}
          onConfirm={(dateStr) => {
            setNextApptDate(dateStr);
            setShowNextApptDateCalendar(false);
          }}
          onCancel={() => setShowNextApptDateCalendar(false)}
          dateType="nextAppointmentDate"
        />,
        document.getElementById('modal-root') || document.body
      )}

    </div>
  );
}

/* ══════════ MESSAGE BUBBLE ══════════ */
function MessageBubble({ message, profile }) {
  const isUser  = message.role === 'user';
  const isError = message.role === 'error';
  const [expanded, setExpanded] = useState(null);
  const [imgError, setImgError] = useState(false);

  const timeStr = message.timestamp?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const Status = () => {
    if (!isUser) return null;
    if (message.status === 'sending') return <span className="msg-status sending">⏱</span>;
    if (message.status === 'failed')  return <span className="msg-status failed">⚠️</span>;
    if (message.status === 'seen')    return <span className="msg-status seen">✓✓</span>;
    return <span className="msg-status sent">✓</span>;
  };

  const avatarUrl = profile?.user?.avatar || profile?.avatar || profile?.user?.photoURL;

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      {!isUser && <div className="msg-avatar ai-msg-avatar"><LeafIcon size={18} strokeWidth={2} /></div>}

      <div className={`bubble-group ${isUser ? 'user-group' : 'ai-group'}`}>
        {/* Image grid */}
        {message.images && message.images.length > 0 && (
          <div className={`bubble img-bubble ${isUser ? 'user-img-bubble' : 'ai-img-bubble'}`}>
            <div className={`img-grid img-grid-${Math.min(message.images.length, 4)}`}>
              {message.images.map((url, i) => (
                <img key={i} src={url} alt={`img-${i}`} className="chat-img" onClick={() => setExpanded(url)} />
              ))}
            </div>
          </div>
        )}

        {/* Text bubble */}
        {(message.content || isError) && (
          <div className={`bubble ${isUser ? 'user-bubble' : isError ? 'error-bubble' : 'ai-bubble'}`}>
            {message.role === 'assistant' ? (
              <div className="markdown-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            ) : (
              <p className="bubble-text">{message.content}</p>
            )}
          </div>
        )}

        {/* Time + status */}
        <div className={`msg-footer ${isUser ? 'msg-footer-right' : ''}`}>
          <time className="msg-time">{timeStr}</time>
          <Status />
        </div>
      </div>

      {expanded && (
        <div className="img-lightbox" onClick={() => setExpanded(null)}>
          <img src={expanded} alt="expanded" />
        </div>
      )}

    </div>
  );
}

/* ══════════ TYPING INDICATOR ══════════ */
function TypingIndicator() {
  return (
    <div className="message-row ai">
      <div className="msg-avatar ai-msg-avatar"><LeafIcon size={18} strokeWidth={2} /></div>
      <div className="bubble ai-bubble typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}
