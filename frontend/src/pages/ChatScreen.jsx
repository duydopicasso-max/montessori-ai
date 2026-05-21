/**
 * ChatScreen.jsx — Montessori AI Premium Dashboard
 * 🌿 Dashboard-centric hub with slide-up sheets
 * 💬 Chat AI integrated in slide-up modal (no FAB overlay)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { calculateDetailedAge, getHandbookForAge } from '../data/handbookData.js';
import { LeafIcon, SparkleIcon } from '../icons.jsx';
import './ChatScreen.css';

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

/* Suggested questions per child stage */
const QUESTION_POOL = {
  pregnant:  ['🤰 Chế độ dinh dưỡng tốt nhất cho mẹ bầu?','🧘 Bài tập nhẹ nhàng cho mẹ bầu?','💤 Cách ngủ ngon ở tam cá nguyệt này?','🏥 Mốc khám thai quan trọng cần lưu ý?','🍼 Cần chuẩn bị gì trước khi sinh bé?','🌱 Áp dụng Montessori từ trong bụng mẹ?'],
  newborn:   ['🤱 Thiết lập lịch sinh hoạt EASY cho bé sơ sinh?','😴 Mẹo giúp bé phân biệt ngày đêm?','👐 Kích thích giác quan cho bé dưới 6 tháng?','🧴 Chăm sóc da bé sơ sinh đúng cách?','🧩 Đồ chơi Montessori đầu đời là gì?','🤱 Chế độ ăn để có sữa tốt cho bé?'],
  infant:    ['🍎 Bé 6 tháng bắt đầu ăn dặm thế nào?','🥦 Thực đơn ăn dặm kiểu Nhật/BLW?','🚶 Dấu hiệu bé sắp biết bò/biết đi?','🦷 Bé mọc răng quấy khóc làm gì?','📦 Môi trường Montessori cho bé tập bò?','🗣️ Kích thích ngôn ngữ giai đoạn bập bẹ?'],
  toddler:   ['🧠 Kích thích trí não bé 1-3 tuổi?','🎨 Hoạt động Montessori tại nhà?','😤 Xử lý cơn hờn dỗi (tantrums)?','🚽 Tập vệ sinh cho bé đúng thời điểm?','🥗 Bé biếng ăn phải làm sao?','📖 Sách hay cho bé 2 tuổi phát triển ngôn ngữ?'],
  preschool: ['🤝 Dạy bé kỹ năng giao tiếp chia sẻ?','🧮 Montessori giúp bé làm quen toán học?','📝 Chuẩn bị tâm lý trước khi đi học?','🏃 Trò chơi vận động cho bé 3-6 tuổi?','🎨 Phát triển sáng tạo qua hội họa?','🧹 Dạy bé làm việc nhà theo Montessori?'],
};

function getSuggestions(profile) {
  if (profile.status === 'pregnant') return QUESTION_POOL.pregnant;
  const m = parseInt(profile.ageInfo?.months || 0);
  const y = parseInt(profile.ageInfo?.years  || 0) || Math.floor(m / 12);
  if (m < 6)  return QUESTION_POOL.newborn;
  if (m < 12) return QUESTION_POOL.infant;
  if (y < 3)  return QUESTION_POOL.toddler;
  return QUESTION_POOL.preschool;
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

export default function ChatScreen({ profile }) {
  const status = profile?.status || 'born';
  const userId = profile?.user?.uid;
  const babies = profile?.babies || [];
  const baby = babies[0] || {};
  const babyId = (baby.name || 'baby-0').toLowerCase().replace(/\s+/g, '-');
  const dob = baby?.dob || '';
  const pregnancyInfo = profile?.pregnancyInfo || baby?.pregnancyInfo;
  
  // Real-time local baby/mom logs
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Screen loading state simulation (Skeleton Loader Shimmer)
  const [isScreenLoading, setIsScreenLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsScreenLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Active bottom sheets
  const [activeBottomSheet, setActiveBottomSheet] = useState(null); // 'nutrition' | 'sleep' | 'diaper' | 'growth' | 'kick' | 'contractions' | 'preg_weight' | 'preg_reminders'
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Dynamic age calculation & update time helpers
  const getAgeString = () => {
    if (status === 'pregnant') {
      return `Tuần thai ${pregnancyInfo?.week || 30}`;
    }
    const m = parseInt(ageInfo?.months || 0);
    const y = parseInt(ageInfo?.years  || 0);
    const totalMonths = y * 12 + m;
    if (totalMonths > 0) {
      return `${totalMonths} tháng tuổi`;
    }
    return `${ageInfo?.days || 5} ngày tuổi`;
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
  const suggestions = getSuggestions(profile);

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

  // B. Sleep Sheet inputs
  const [sleepActive, setSleepActive] = useState(false);
  const [sleepSecs, setSleepSecs] = useState(0);
  const [sleepStartStr, setSleepStartStr] = useState('');
  const [sleepTag, setSleepTag] = useState('Tự ngủ'); // 'Tự ngủ' | 'Ti mẹ' | 'Bế ru'
  const sleepTimerRef = useRef(null);

  // C. Diaper Sheet inputs
  const [diaperType, setDiaperType] = useState('pee'); // 'pee' | 'poop' | 'both'
  const [diaperColor, setDiaperColor] = useState('yellow'); // 'yellow' | 'mustard' | 'green' | 'brown'
  const [diaperDesc, setDiaperDesc] = useState('Bình thường');

  // D. Growth Sheet inputs
  const [growthWeight, setGrowthWeight] = useState(7.5);
  const [growthHeight, setGrowthHeight] = useState(68.2);

  // E. Pregnancy Kick inputs
  const [kickActive, setKickActive] = useState(false);
  const [kickCount, setKickCount] = useState(0);
  const [kickSecs, setKickSecs] = useState(0);
  const kickTimerRef = useRef(null);

  // F. Pregnancy Contractions inputs
  const [contraActive, setContraActive] = useState(false);
  const [contraCount, setContraCount] = useState(0);
  const [contraSecs, setContraSecs] = useState(0);
  const contraTimerRef = useRef(null);

  // G. Pregnancy Weight inputs
  const [pregWeight, setPregWeight] = useState(58.5);

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

    return () => {
      unsubNutrition();
      unsubActivity();
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
  }, [contraActive]);

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
      const ctx = `[Profile: ${profile.displayName}, ${profile.role}, Child: ${profile.childName}, ${profile.status}] `;
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: ctx + (question || '(Gửi ảnh)'), sessionId, history }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const aiMsg = { id: uuidv4(), role: 'assistant', content: data.answer, status: 'delivered', timestamp: new Date() };
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], status: 'seen' },
        aiMsg,
      ]);
      setHistory(prev => [...prev, { userMessage: question, aiMessage: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'error', content: '❌ Lỗi kết nối. Vui lòng thử lại.', status: 'failed', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, history, pendingImgs, profile]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]); setHistory([]);
    fetch(`${API_BASE}/chat/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  };

  const canSend = (input.trim() || pendingImgs.length > 0) && !isLoading && !uploadingImg;

  // 3. Database Saving Methods (Saves dynamically into Firestore)
  // Nutrition Log save
  const handleSaveNutrition = async (e) => {
    if (e) e.preventDefault();
    if (!userId) return;

    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: nutriTab,
      amountMl: (nutriTab === 'breast_pump') ? (pumpLeftMl + pumpRightMl) : (nutriTab === 'formula') ? Number(nutriMl) : 0,
      breastTimeLeft: nutriTab === 'breast_direct' ? Math.round(breastLeftSec / 60) : 0,
      breastTimeRight: nutriTab === 'breast_direct' ? Math.round(breastRightSec / 60) : 0,
      foodDetails: nutriTab === 'solid' ? solidDetails : nutriTab === 'breast_pump' ? `Vắt sữa: Trái ${pumpLeftMl}ml, Phải ${pumpRightMl}ml` : '',
      suaMe: nutriTab === 'formula' ? nutriSuaMe : true,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'nutritionLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
      // Reset
      setBreastLeftSec(0); setBreastRightSec(0); setBreastDirectTimerActive(false); setSolidDetails('');
    } catch (err) {
      console.error(err);
    }
  };

  // Sleep Log save
  const handleSaveSleep = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    let durationMin = Math.round(sleepSecs / 60) || 1;

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'sleep',
      sleepDurationMin: durationMin,
      note: `Bé đã ngủ. Cách vào giấc: ${sleepTag}. Thời lượng: ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
      setSleepActive(false); setSleepSecs(0); setSleepStartStr('');
    } catch (err) {
      console.error(err);
    }
  };

  // Diaper Log save
  const handleSaveDiaper = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = diaperType === 'pee' ? 'Tã ướt' : diaperType === 'poop' ? 'Tã bẩn' : 'Cả hai';

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'diaper',
      diaperType,
      diaperStatus: diaperColor,
      note: `Thay tã: ${typeLabel}. Màu phân: ${diaperDesc}`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Growth Log save
  const handleSaveGrowth = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'growth',
      weightKg: Number(growthWeight),
      heightCm: Number(growthHeight),
      note: `Cân nặng: ${growthWeight}kg, Chiều cao: ${growthHeight}cm`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Pregnancy Logs: Kick
  const handleSaveKick = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const durationMin = Math.round(kickSecs / 60) || 1;

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_kick',
      kickCount,
      kickDurationMin: durationMin,
      note: `Đếm máy thai: ${kickCount} lần trong ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
      setKickActive(false); setKickCount(0); setKickSecs(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Pregnancy Logs: Contractions
  const handleSaveContra = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const durationMin = Math.round(contraSecs / 60) || 1;

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_contraction',
      contraCount,
      note: `Đếm cơn gò: ${contraCount} lần trong ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
      setContraActive(false); setContraCount(0); setContraSecs(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Pregnancy Logs: Weight
  const handleSavePregWeight = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_weight',
      weightKg: Number(pregWeight),
      note: `Cân nặng mẹ bầu: ${pregWeight} kg`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Pregnancy Logs: Vitamin Check-off
  const [vitaminsLogged, setVitaminsLogged] = useState({ Folic: false, Iron: false, Calcium: false, DHA: false });
  const handleSaveVitamins = async () => {
    if (!userId) return;
    const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const checked = Object.keys(vitaminsLogged).filter(k => vitaminsLogged[k]).join(', ');

    const logData = {
      date: new Date().toISOString().split('T')[0],
      time: formattedTime,
      type: 'preg_reminders',
      note: `Ghi nhận vi chất đã uống: ${checked || 'Chưa uống loại nào'}`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), logData);
      triggerChime();
      setActiveBottomSheet(null);
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
    const sleepLogs = activityLogs.filter(l => l.type === 'sleep');
    if (sleepLogs.length === 0) return 'Giấc ngủ 1: --';
    const last = sleepLogs[0];
    return `Giấc ngủ cuối: ${last.sleepDurationMin} phút`;
  };

  const getLastDiaperText = () => {
    const diaperLogs = activityLogs.filter(l => l.type === 'diaper');
    if (diaperLogs.length === 0) return 'Thay cuối: --';
    const last = diaperLogs[0];
    return `Thay cuối: ${last.time || 'Vừa xong'}`;
  };

  const getLastGrowthText = () => {
    const growthLogs = activityLogs.filter(l => l.type === 'growth');
    if (growthLogs.length === 0) return 'Cân nặng: -- kg';
    const last = growthLogs[0];
    return `Cân nặng: ${last.weightKg} kg`;
  };

  const getLastKickText = () => {
    const kickLogs = activityLogs.filter(l => l.type === 'preg_kick');
    if (kickLogs.length === 0) return 'Hôm nay: --';
    return `Cú máy cuối: ${kickLogs[0].kickCount} lần`;
  };

  const getLastContraText = () => {
    const contraLogs = activityLogs.filter(l => l.type === 'preg_contraction');
    if (contraLogs.length === 0) return 'Cơn gò: Bình thường';
    return `Ghi nhận cuối: ${contraLogs[0].time}`;
  };

  const getLastPregWeightText = () => {
    const wLogs = activityLogs.filter(l => l.type === 'preg_weight');
    if (wLogs.length === 0) return 'Cân nặng: -- kg';
    return `Cân mẹ: ${wLogs[0].weightKg} kg`;
  };

  // Build vertical sorted list of timeline items
  const timelineItems = (() => {
    const list = [];
    nutritionLogs.forEach(log => {
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

    activityLogs.forEach(log => {
      let desc = log.note || '';
      let typeLabel = '';
      let icon = '⏱️';
      let colorClass = '';

      if (log.type === 'diaper') {
        typeLabel = 'Tã';
        icon = '🧷';
        colorClass = 'timeline-diaper';
        if (log.diaperType === 'pee') { desc = 'Thay tã - Ướt'; icon = '💦'; }
        else if (log.diaperType === 'poop') { desc = 'Thay tã - Bẩn'; icon = '💩'; }
        else { desc = 'Thay tã - Cả hai'; icon = '🧷'; }
      } else if (log.type === 'sleep') {
        typeLabel = 'Ngủ';
        icon = '🌙';
        colorClass = 'timeline-sleep';
        desc = `Đã ngủ: ${log.sleepDurationMin} phút`;
      } else if (log.type === 'growth') {
        typeLabel = 'Tăng trưởng';
        icon = '⚖️';
        colorClass = 'timeline-growth';
        desc = `Đo chỉ số: ${log.weightKg}kg, ${log.heightCm}cm`;
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
        typeLabel = 'Cân nặng mẹ';
        icon = '⚖️';
        colorClass = 'timeline-weight';
        desc = `Cân nặng mẹ bầu: ${log.weightKg} kg`;
      } else if (log.type === 'preg_reminders') {
        typeLabel = 'Vi chất';
        icon = '💊';
        colorClass = 'timeline-vitamin';
        desc = log.note || 'Uống vitamin bầu';
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

    return list.sort((a, b) => b.createdAt - a.createdAt);
  })();

  if (isScreenLoading) {
    return (
      <div className="chat-screen screen-loading-state">
        {/* Premium Shimmer Header */}
        <div className="premium-ios-header skeleton-loading shimmer">
          <div className="header-left-meta">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            <div className="skeleton-line skeleton-age" />
          </div>
          <div className="skeleton-avatar" />
        </div>

        {/* Skeleton Recommendation Card */}
        <div className="montessori-daily-suggestion-card skeleton-loading shimmer">
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-paragraph-1" />
          <div className="skeleton-line skeleton-paragraph-2" />
          <div className="skeleton-button" />
        </div>

        {/* Skeleton 2x2 grid */}
        <div className="dashboard-trackers-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tracker-item-card skeleton-loading shimmer">
              <div className="skeleton-icon" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-status" />
              <div className="skeleton-button" />
            </div>
          ))}
        </div>

        {/* Skeleton Timeline */}
        <div className="daily-timeline-section">
          <div className="skeleton-line skeleton-section-title" />
          <div className="skeleton-timeline-path shimmer">
            <div className="skeleton-timeline-node">
              <div className="skeleton-time" />
              <div className="skeleton-node-dot" />
              <div className="skeleton-details" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-screen">
      
      {/* 📱 iOS-STYLE PREMIUM SINGLE HEADER */}
      <header className="premium-ios-header">
        <div className="header-left-meta">
          <span className="greeting-label">Xin chào, Mẹ {profile?.momName || 'Maud'}</span>
          <h1 className="baby-today-heading">Hôm nay của {baby?.name || 'Cốm'}</h1>
          <div className="baby-age-meta-row">
            <span className="baby-age-badge">{getAgeString()}</span>
            <span className="meta-dot">·</span>
            <span className="update-time-label">Cập nhật lúc {getLatestUpdateTime()}</span>
          </div>
        </div>
        <div className="header-right-profile">
          <div className="mother-avatar-circle" title="Xem hồ sơ">
            {profile?.user?.photoURL ? (
              <img src={profile.user.photoURL} alt="avatar" className="mother-avatar-img" />
            ) : (
              <div className="mother-avatar-emoji-wrap">
                {profile.status === 'pregnant' ? '🤰' : '👩‍🍼'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 🤰 PREGNANCY BANNER */}
      {status === 'pregnant' && (
        <div className="pregnancy-ad-avocado-card animate-float-slow">
          <div className="avocado-baby-illustration">🥑👶</div>
          <div className="pregnancy-avocado-text-wrap">
            <h4 className="avocado-growth-banner">Cốm đang lớn bằng quả bơ 🥑</h4>
            <p className="avocado-growth-sub">Mẹ ơi, con đang tập đá bụng mẹ đấy!</p>
            <span className="pregnancy-countdown-pill">Còn 120 ngày nữa là gặp Cốm!</span>
          </div>
        </div>
      )}

      {/* 🌿 DAILY MONTESSORI RECOMMENDATION CARD */}
      {status !== 'pregnant' && babies.length > 0 && (
        <div className="montessori-daily-suggestion-card">
          <SparkleIcon size={20} strokeWidth={1.8} className="suggestion-card-floating-sparkle" />
          <div className="suggestion-card-header">
            <span className="suggestion-card-icon-wrap">
              <LeafIcon size={18} strokeWidth={2.2} className="suggestion-leaf-icon" />
            </span>
            <div className="suggestion-header-text-col">
              <span className="suggestion-ai-badge">AI CÁ NHÂN HÓA</span>
              <h3>Gợi ý Montessori hôm nay</h3>
            </div>
          </div>
          
          <p className="suggestion-card-body">
            {baby?.name || 'Cốm'} có thể thử hoạt động phân loại đồ vật theo màu.
          </p>

          <div className="suggestion-card-metadata">
            <span className="suggestion-metadata-item">⏱ 5–7 phút</span>
            <span className="suggestion-metadata-dot">·</span>
            <span className="suggestion-metadata-item">🏠 Dễ thực hiện tại nhà</span>
          </div>

          <button className="suggestion-card-action-btn" onClick={handleSuggestionAction}>
            Xem hướng dẫn
          </button>
        </div>
      )}

      {/* ⚠️ MISSING PROFILE STATE WARNING */}
      {status !== 'pregnant' && babies.length === 0 && (
        <div className="missing-profile-warning-card">
          <span className="warning-icon">⚠️</span>
          <div className="warning-text-wrap">
            <h4>Mẹ chưa tạo hồ sơ cho bé yêu</h4>
            <p>Hãy thêm hồ sơ của bé trong tab **Hồ sơ** để nhận gợi ý hoạt động Montessori cá nhân hóa phù hợp nhất với độ tuổi.</p>
          </div>
        </div>
      )}

      {/* 📊 2X2 DASHBOARD TRACKERS GRID */}
      {(!status || status !== 'pregnant' ? babies.length > 0 : true) && (
        <div className="dashboard-trackers-grid">
          {status === 'pregnant' ? (
            /* PREGNANCY MODE */
            <>
              <div className="tracker-item-card mint-light">
                <span className="tracker-card-icon">💓</span>
                <h4 className="tracker-card-name">Đếm thai máy</h4>
                <span className="tracker-card-status-text">{getLastKickText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => { setActiveBottomSheet('kick'); setKickSecs(0); setKickCount(0); }}>
                  Bắt đầu đếm
                </button>
              </div>

              <div className="tracker-item-card pink-light">
                <span className="tracker-card-icon">⏱️</span>
                <h4 className="tracker-card-name">Đếm cơn gò</h4>
                <span className="tracker-card-status-text">{getLastContraText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => { setActiveBottomSheet('contractions'); setContraSecs(0); setContraCount(0); }}>
                  Bắt đầu đếm
                </button>
              </div>

              <div className="tracker-item-card pink-light">
                <span className="tracker-card-icon">⚖️</span>
                <h4 className="tracker-card-name">Cân nặng thai kỳ</h4>
                <span className="tracker-card-status-text">{getLastPregWeightText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => setActiveBottomSheet('preg_weight')}>
                  Cập nhật
                </button>
              </div>

              <div className="tracker-item-card mint-light">
                <span className="tracker-card-icon">💊</span>
                <h4 className="tracker-card-name">Vitamin &amp; Nước</h4>
                <span className="tracker-card-status-text">Lịch nhắc vi chất hàng ngày</span>
                <button className="tracker-action-trigger-btn" onClick={() => setActiveBottomSheet('preg_reminders')}>
                  Ghi nhận
                </button>
              </div>
            </>
          ) : (
            /* BABY MODE */
            <>
              {/* CARD 1: Ăn uống — Sage Green */}
              <div className="tracker-item-card mint-light">
                <div className="tracker-card-icon">
                  <BottleIcon />
                </div>
                <h4 className="tracker-card-name">Ăn uống</h4>
                <span className="tracker-card-status-text">{getLastNutriText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => setActiveBottomSheet('nutrition')}>
                  Ghi nhận ăn
                </button>
              </div>

              {/* CARD 2: Ngủ — Salmon Peach Pink */}
              <div className="tracker-item-card pink-light">
                <div className="tracker-card-icon">
                  <MoonStarIcon />
                </div>
                <h4 className="tracker-card-name">Ngủ</h4>
                <span className="tracker-card-status-text">{getLastSleepText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => { setActiveBottomSheet('sleep'); setSleepSecs(0); }}>
                  Ghi nhận ngủ
                </button>
              </div>

              {/* CARD 3: Thay tã — Salmon Peach Pink */}
              <div className="tracker-item-card pink-light">
                <div className="tracker-card-icon">
                  <DiaperIcon />
                </div>
                <h4 className="tracker-card-name">Thay tã</h4>
                <span className="tracker-card-status-text">{getLastDiaperText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => setActiveBottomSheet('diaper')}>
                  Ghi nhận thay tã
                </button>
              </div>

              {/* CARD 4: Phát triển — Sage Green */}
              <div className="tracker-item-card mint-light">
                <div className="tracker-card-icon">
                  <ScaleIcon />
                </div>
                <h4 className="tracker-card-name">Phát triển</h4>
                <span className="tracker-card-status-text">{getLastGrowthText()}</span>
                <button className="tracker-action-trigger-btn" onClick={() => setActiveBottomSheet('growth')}>
                  Xem thống kê
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ⏰ DAILY TIMELINE */}
      {(!status || status !== 'pregnant' ? babies.length > 0 : true) && (
        <section className="daily-timeline-section">
          <h3 className="timeline-title-headline">Dòng thời gian hôm nay</h3>
          <div className="timeline-outer-scroll-wrapper">
            {timelineItems.length === 0 ? (
              <div className="timeline-empty-state-box">
                <span className="empty-state-icon">📝</span>
                <h4>Chưa có hoạt động hôm nay</h4>
                <p>Mẹ hãy ghi nhận hoạt động đầu tiên của bé để trợ lý Montessori AI theo dõi và phân tích sức khỏe tốt nhất!</p>
                <button className="timeline-first-action-btn" onClick={() => setActiveBottomSheet('nutrition')}>
                  + Ghi nhận đầu tiên
                </button>
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
                  else NodeIcon = TimelineSunIcon;
                  return (
                    <div key={item.id || index} className="timeline-record-node">
                      <div className="timeline-node-time-col">
                        <span className="node-time-txt">{item.time}</span>
                      </div>
                      <div className={`timeline-node-icon-dot ${item.colorClass}`}>
                        <NodeIcon />
                      </div>
                      <div className="timeline-node-details-card">
                        <h4 className="node-details-title">{item.typeLabel}</h4>
                        <p className="node-details-desc">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 💬 FLOATING ASSISTANT BUTTON — fixed bottom-right */}
      <button
        className="floating-assistant-fab"
        onClick={() => setIsChatOpen(true)}
        aria-label="Trợ lý AI"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="floating-fab-dot" />
      </button>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 💬 MONTESSORI AI CHAT SLIDE-UP MODAL (90% HEIGHT) */}
      {isChatOpen && (
        <div className="chat-slide-up-modal-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="chat-slide-up-content-panel animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* Chat Header inside sliding panel */}
            <header className="chat-sliding-header">
              <div className="header-sliding-left">
                <div className="sliding-ai-avatar">
                  <LeafIcon size={20} strokeWidth={2} />
                  <span className="online-dot" />
                </div>
                <div>
                  <h3 className="sliding-title-label">Trợ lý Montessori AI</h3>
                  <p className="sliding-subtitle-status">🟢 Đang hoạt động</p>
                </div>
              </div>
              <div className="header-sliding-right">
                {messages.length > 0 && (
                  <button className="clear-chat-sliding-btn" onClick={clearChat} title="Xóa cuộc trò chuyện">🗑️</button>
                )}
                <button className="close-sliding-modal-btn" onClick={() => setIsChatOpen(false)}>✕</button>
              </div>
            </header>

            {/* Message bubbles list */}
            <div className="sliding-chat-messages-container">
              {messages.length === 0 ? (
                <div className="welcome-dashboard-inner-sliding">
                  <div className="sliding-welcome-hero">
                    <span className="sliding-welcome-avatar"><LeafIcon size={52} strokeWidth={1.6} /></span>
                    <h3 className="sliding-welcome-title">Xin chào mẹ Maud! 👋</h3>
                    <p className="sliding-welcome-sub">Hôm nay mẹ cần trợ lý Montessori AI giúp đỡ gì cho em bé?</p>
                  </div>
                  <div className="welcome-suggestions-section">
                    <h4 className="suggestions-section-title">Gợi ý câu hỏi thông minh hôm nay</h4>
                    <div className="suggestions-grid">
                      {suggestions.map((q, i) => (
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
                  placeholder={pendingImgs.length > 0 ? 'Thêm mô tả cho ảnh...' : 'Hỏi về thai kỳ, chăm sóc bé, Montessori...'}
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
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 📥 4 INPUT TRACKER BOTTOM SHEETS (70% HEIGHT) */}
      {activeBottomSheet && (
        <div className="bottom-sheet-backdrop-overlay" onClick={() => setActiveBottomSheet(null)}>
          <div className="bottom-sheet-content-panel animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* Sliding Header top notch bar */}
            <div className="sheet-drag-handle-pill" />

            {/* 1. NUTRITION BOTTOM SHEET */}
            {activeBottomSheet === 'nutrition' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Ghi nhận ăn uống</h3>
                
                {/* 3 tabs selector */}
                <div className="tracker-subtabs-row">
                  <button className={`subtab-chip ${nutriTab === 'breast_direct' ? 'active' : ''}`} onClick={() => setNutriTab('breast_direct')}>
                    🤱 Bú mẹ
                  </button>
                  <button className={`subtab-chip ${nutriTab === 'formula' ? 'active' : ''}`} onClick={() => setNutriTab('formula')}>
                    🍼 Bú bình
                  </button>
                  <button className={`subtab-chip ${nutriTab === 'solid' ? 'active' : ''}`} onClick={() => setNutriTab('solid')}>
                    🥣 Ăn dặm
                  </button>
                </div>

                <div className="tracker-sheet-form-body">
                  {/* Tab Bú mẹ: Timer Left / Right */}
                  {nutriTab === 'breast_direct' && (
                    <div className="direct-breast-stopwatch-group">
                      <div className="breast-side-selector-row">
                        <button type="button" className={`side-choice-btn ${breastSide === 'left' ? 'active' : ''}`} onClick={() => setBreastSide('left')}>
                          Bầu ngực Trái (L)
                        </button>
                        <button type="button" className={`side-choice-btn ${breastSide === 'right' ? 'active' : ''}`} onClick={() => setBreastSide('right')}>
                          Bầu ngực Phải (R)
                        </button>
                      </div>

                      <div className="double-breast-stopwatches">
                        <div className="breast-watch-card">
                          <div className="side-watch-title">Lực bú Trái</div>
                          <div className="side-watch-time">⏱️ {Math.floor(breastLeftSec / 60)}m {breastLeftSec % 60}s</div>
                        </div>
                        <div className="breast-watch-card">
                          <div className="side-watch-title">Lực bú Phải</div>
                          <div className="side-watch-time">⏱️ {Math.floor(breastRightSec / 60)}m {breastRightSec % 60}s</div>
                        </div>
                      </div>

                      <div className="watch-timer-actions-row">
                        <button type="button" className={`timer-trigger-pulse-btn ${breastDirectTimerActive ? 'running' : ''}`} onClick={() => setBreastDirectTimerActive(!breastDirectTimerActive)}>
                          {breastDirectTimerActive ? '⏸️ Tạm Dừng' : '▶️ Bắt Đầu Bú'}
                        </button>
                        <button type="button" className="timer-reset-flat-btn" onClick={() => { setBreastLeftSec(0); setBreastRightSec(0); setBreastDirectTimerActive(false); }}>
                          🔄 Nhập lại
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab Bú bình: Volume Ml scrolling slider */}
                  {nutriTab === 'formula' && (
                    <div className="formula-bottle-scroll-ruler">
                      <label className="ruler-input-label">Thời gian: Hôm nay, 10:30 Sáng</label>
                      
                      <div className="premium-scroll-vertical-ruler-simulation">
                        <div className="ruler-vertical-numbers">
                          <span>130</span>
                          <span>140</span>
                          <span className="selected-ruler-val">150</span>
                          <span>160</span>
                          <span>170</span>
                        </div>
                        <div className="ruler-display-box-value">
                          <h3>{nutriMl} <span className="ml-label">ml</span></h3>
                        </div>
                      </div>

                      <div className="styled-ruler-slider-container">
                        <input type="range" min="30" max="300" step="5" value={nutriMl} className="styled-range-slider-ruler" onChange={e => setNutriMl(Number(e.target.value))} />
                        <div className="slider-ticks-decoration">
                          {Array.from({ length: 11 }).map((_, i) => <span key={i} className="ruler-tick-mark" />)}
                        </div>
                      </div>

                      {/* Milk classification toggle */}
                      <div className="milk-type-selection-toggle-pills">
                        <button type="button" className={`milk-toggle-pill ${nutriSuaMe ? 'active' : ''}`} onClick={() => setNutriSuaMe(true)}>
                          💧 Sữa mẹ
                        </button>
                        <button type="button" className={`milk-toggle-pill ${!nutriSuaMe ? 'active' : ''}`} onClick={() => setNutriSuaMe(false)}>
                          🥛 Sữa công thức
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab Ăn dặm: Simple input */}
                  {nutriTab === 'solid' && (
                    <div className="solid-diet-input-block">
                      <label className="solid-field-label">Chi tiết món ăn dặm của bé</label>
                      <textarea className="solid-textarea-input" placeholder="Ví dụ: Bột ăn dặm vị rau củ, bí đỏ hấp nghiền, quả bơ dầm mịn..." value={solidDetails} onChange={e => setSolidDetails(e.target.value)} />
                    </div>
                  )}

                  <button className="submit-tracker-log-btn-full" onClick={handleSaveNutrition}>
                    Lưu cữ ăn
                  </button>
                </div>
              </div>
            )}

            {/* 2. SLEEP BOTTOM SHEET (LOCAL DARK-MODE & NEON ACCENT) */}
            {activeBottomSheet === 'sleep' && (
              <div className="tracker-sheet-viewport sleep-dark-mode">
                <h3 className="tracker-sheet-title">Ghi nhận Giấc ngủ</h3>

                <div className="sleep-stopwatch-neon-box">
                  {/* Glowing neon accent timer ring */}
                  <div className={`neon-timer-glow-accent ${sleepActive ? 'glowing-pulsing' : ''}`}>
                    <span className="sleep-clock-timer-icon">🌙</span>
                    <h2 className="neon-timer-digits">
                      {Math.floor(sleepSecs / 3600).toString().padStart(2, '0')}:
                      {Math.floor((sleepSecs % 3600) / 60).toString().padStart(2, '0')}:
                      {(sleepSecs % 60).toString().padStart(2, '0')}
                    </h2>
                  </div>

                  <p className="sleep-insight-predictive-txt">
                    Dự kiến Minh Anh sẽ thức dậy vào khoảng 15:30.
                  </p>

                  <div className="sleep-watch-actions-controls">
                    <button type="button" className={`sleep-btn-control-trigger ${sleepActive ? 'running' : ''}`} onClick={() => { setSleepActive(!sleepActive); if(!sleepStartStr) setSleepStartStr(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })); }}>
                      {sleepActive ? '⏸️ Tạm dừng' : '▶️ Bắt đầu ngủ'}
                    </button>
                  </div>

                  {/* How fell asleep pills */}
                  <div className="how-fell-asleep-tags-block">
                    <span className="tags-label-heading">Cách bé vào giấc?</span>
                    <div className="tags-selection-row">
                      {['Tự ngủ', 'Ti mẹ', 'Bế ru'].map(tag => (
                        <button key={tag} type="button" className={`sleep-tag-pill ${sleepTag === tag ? 'active' : ''}`} onClick={() => setSleepTag(tag)}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="submit-tracker-log-btn-full neon-timer-action" onClick={handleSaveSleep}>
                    Kết thúc & Lưu
                  </button>
                </div>
              </div>
            )}

            {/* 3. DIAPER BOTTOM SHEET */}
            {activeBottomSheet === 'diaper' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Ghi nhận thay tã</h3>

                <div className="diaper-types-toggles-row">
                  <button type="button" className={`diaper-card-large-btn ${diaperType === 'pee' ? 'active' : ''}`} onClick={() => { setDiaperType('pee'); setDiaperDesc('Tã ướt bình thường'); }}>
                    <span className="diaper-icon">💦</span>
                    <span className="diaper-label">Tã ướt</span>
                  </button>
                  <button type="button" className={`diaper-card-large-btn ${diaperType === 'poop' ? 'active' : ''}`} onClick={() => { setDiaperType('poop'); setDiaperDesc('Tã bẩn màu vàng mustard'); }}>
                    <span className="diaper-icon">💩</span>
                    <span className="diaper-label">Tã bẩn</span>
                  </button>
                  <button type="button" className={`diaper-card-large-btn ${diaperType === 'both' ? 'active' : ''}`} onClick={() => { setDiaperType('both'); setDiaperDesc('Tã vừa ướt vừa bẩn'); }}>
                    <span className="diaper-icon">🧷</span>
                    <span className="diaper-label">Cả hai</span>
                  </button>
                </div>

                <div className="diaper-stool-color-spectrum-wrapper">
                  <h4 className="stool-spectrum-label-heading">Màu sắc theo dõi tiêu hóa:</h4>
                  <div className="stool-color-row-chips">
                    {[
                      { color: 'yellow', label: 'Vàng tươi', hex: '#FFEB3B' },
                      { color: 'mustard', label: 'Mù tạt', hex: '#E5A93B' },
                      { color: 'green', label: 'Xanh phân xu', hex: '#689F38' },
                      { color: 'brown', label: 'Nâu sẫm', hex: '#5D4037' }
                    ].map(item => (
                      <button key={item.color} type="button" className={`stool-color-chip ${diaperColor === item.color ? 'active' : ''}`} style={{ backgroundColor: item.hex }} onClick={() => { setDiaperColor(item.color); setDiaperDesc(item.label); }} title={item.label} />
                    ))}
                  </div>
                  <p className="selected-stool-feedback">Tình trạng phân: <b>{diaperDesc}</b></p>
                </div>

                <button className="submit-tracker-log-btn-full" onClick={handleSaveDiaper}>
                  Lưu thay tã
                </button>
              </div>
            )}

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
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Đếm cử động thai (Kick)</h3>
                <div className="pregnancy-timer-box text-center">
                  <h4 className="preg-timer-display">⏳ {Math.floor(kickSecs / 60)}m {kickSecs % 60}s</h4>
                  <div className="huge-kick-counter-glow-number">
                    {kickCount} <span className="k-unit">Lần máy</span>
                  </div>
                  <div className="kick-interactive-triggers-row">
                    <button type="button" className="kick-button-tap animate-pulse" onClick={() => { setKickCount(c => c + 1); if(!kickActive) setKickActive(true); triggerChime(); }}>
                      🦶 Bé Đạp! (+1)
                    </button>
                  </div>
                  <div className="kick-timer-adjust-row">
                    <button type="button" className="timer-flat-pill-btn" onClick={() => setKickActive(!kickActive)}>
                      {kickActive ? '⏸️ Tạm dừng' : '▶️ Tiếp tục'}
                    </button>
                    <button type="button" className="timer-flat-pill-btn reset" onClick={() => { setKickActive(false); setKickCount(0); setKickSecs(0); }}>
                      🔄 Đếm lại
                    </button>
                  </div>
                  <button className="submit-tracker-log-btn-full" onClick={handleSaveKick}>
                    Lưu buổi đếm
                  </button>
                </div>
              </div>
            )}

            {/* 6. PREGNANCY: CONTRACTIONS BOTTOM SHEET */}
            {activeBottomSheet === 'contractions' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Đếm cơn gò tử cung</h3>
                <div className="pregnancy-timer-box text-center">
                  <h4 className="preg-timer-display">⏳ {Math.floor(contraSecs / 60)}m {contraSecs % 60}s</h4>
                  <div className="huge-kick-counter-glow-number">
                    {contraCount} <span className="k-unit">Cơn gò</span>
                  </div>
                  <div className="kick-interactive-triggers-row">
                    <button type="button" className="kick-button-tap red-theme" onClick={() => { setContraCount(c => c + 1); if(!contraActive) setContraActive(true); triggerChime(); }}>
                      💓 Bắt đầu gò! (+1)
                    </button>
                  </div>
                  <div className="kick-timer-adjust-row">
                    <button type="button" className="timer-flat-pill-btn" onClick={() => setContraActive(!contraActive)}>
                      {contraActive ? '⏸️ Tạm dừng' : '▶️ Tiếp tục'}
                    </button>
                    <button type="button" className="timer-flat-pill-btn reset" onClick={() => { setContraActive(false); setContraCount(0); setContraSecs(0); }}>
                      🔄 Làm lại
                    </button>
                  </div>
                  <button className="submit-tracker-log-btn-full" onClick={handleSaveContra}>
                    Lưu buổi ghi nhận
                  </button>
                </div>
              </div>
            )}

            {/* 7. PREGNANCY: WEIGHT BOTTOM SHEET */}
            {activeBottomSheet === 'preg_weight' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Cân nặng thai kỳ</h3>
                <div className="growth-ruler-sliders-pack">
                  <div className="ruler-slider-node">
                    <div className="ruler-title-meta-display">
                      <span className="ruler-name">Cân nặng hiện tại (kg)</span>
                      <h4 className="ruler-current-value font-weight-bold">{pregWeight} kg</h4>
                    </div>
                    <div className="horizontal-ruler-simulation">
                      <input type="range" min="40" max="120" step="0.5" value={pregWeight} className="horizontal-styled-ruler-bar" onChange={e => setPregWeight(Number(e.target.value))} />
                      <div className="ticks-decor-line">
                        {Array.from({ length: 16 }).map((_, i) => <span key={i} className="ruler-tick" />)}
                      </div>
                    </div>
                  </div>
                  <button className="submit-tracker-log-btn-full" onClick={handleSavePregWeight}>
                    Lưu cân nặng
                  </button>
                </div>
              </div>
            )}

            {/* 8. PREGNANCY: REMINDERS & VITAMINS */}
            {activeBottomSheet === 'preg_reminders' && (
              <div className="tracker-sheet-viewport">
                <h3 className="tracker-sheet-title">Lịch nhắc vi chất dinh dưỡng</h3>
                <div className="prenatal-vitamins-checklist-block">
                  <p className="vitamin-intro-meta">Tích chọn các loại vi chất mẹ đã uống hôm nay:</p>
                  
                  <div className="vitamin-checklist-grid">
                    {[
                      { key: 'Folic', label: '🤰 Axit Folic (Ngừa dị tật)' },
                      { key: 'Iron', label: '🩸 Sắt & B9 (Bổ máu)' },
                      { key: 'Calcium', label: '🦴 Canxi hữu cơ (Hệ xương)' },
                      { key: 'DHA', label: '🧠 DHA & Omega 3 (Trí não)' }
                    ].map(item => (
                      <label key={item.key} className="vitamin-checkbox-row">
                        <input type="checkbox" checked={vitaminsLogged[item.key]} onChange={e => setVitaminsLogged({ ...vitaminsLogged, [item.key]: e.target.checked })} className="v-custom-checkbox" />
                        <span className="v-label-txt">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <button className="submit-tracker-log-btn-full" onClick={handleSaveVitamins}>
                    Hoàn thành uống thuốc
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════ MESSAGE BUBBLE ══════════ */
function MessageBubble({ message, profile }) {
  const isUser  = message.role === 'user';
  const isError = message.role === 'error';
  const [expanded, setExpanded] = useState(null);

  const timeStr = message.timestamp?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const Status = () => {
    if (!isUser) return null;
    if (message.status === 'sending') return <span className="msg-status sending">⏱</span>;
    if (message.status === 'failed')  return <span className="msg-status failed">⚠️</span>;
    if (message.status === 'seen')    return <span className="msg-status seen">✓✓</span>;
    return <span className="msg-status sent">✓</span>;
  };

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

      {isUser && (
        <div className="msg-avatar user-msg-avatar">
          {profile?.user?.photoURL
            ? <img src={profile.user.photoURL} alt="me" />
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4"/>
                <path d="M5 20a7 7 0 0 1 14 0"/>
              </svg>
          }
        </div>
      )}

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
