/**
 * TrackerScreen.jsx
 * Bộ công cụ theo dõi (Tracker) sinh hoạt Mẹ & Bé cao cấp.
 * Hỗ trợ chuyển đổi giao diện linh hoạt giữa Mẹ bầu (Pregnancy Logs) và Em bé (Baby Logs).
 * Tích hợp Web Audio API phát tiếng chuông Kalimba êm ái khi lưu thành công.
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { calculateDetailedAge } from '../data/handbookData.js';
import './TrackerScreen.css';
import AppDatePicker from '../components/AppDatePicker.jsx';

// Chuẩn tiêm chủng quốc gia (tháng tuổi, tên vắc xin, mô tả bệnh phòng ngừa)
const VACCINE_SCHEDULE = [
  { months: 0, code: 'HEPB_0', name: 'Viêm gan B (Mũi 0)', desc: 'Tiêm trong 24 giờ đầu sau sinh' },
  { months: 0, code: 'BCG', name: 'Lao (BCG)', desc: 'Phòng bệnh lao phổi và lao màng não' },
  { months: 2, code: '6IN1_1', name: '6 trong 1 (Mũi 1)', desc: 'Bạch hầu, ho gà, uốn ván, bại liệt, Hib, viêm gan B' },
  { months: 2, code: 'ROTA_1', name: 'Rota Virus (Lần 1)', desc: 'Phòng tiêu chảy cấp do Rota virus' },
  { months: 3, code: '6IN1_2', name: '6 trong 1 (Mũi 2)', desc: 'Bạch hầu, ho gà, uốn ván, bại liệt, Hib, viêm gan B' },
  { months: 3, code: 'ROTA_2', name: 'Rota Virus (Lần 2)', desc: 'Phòng tiêu chảy cấp do Rota virus' },
  { months: 4, code: '6IN1_3', name: '6 trong 1 (Mũi 3)', desc: 'Bạch hầu, ho gà, uốn ván, bại liệt, Hib, viêm gan B' },
  { months: 6, code: 'FLU_1', name: 'Cúm (Mũi 1)', desc: 'Phòng cúm mùa (tiêm nhắc lại hàng năm)' },
  { months: 6, code: 'PNEUMO_1', name: 'Phế cầu (Mũi 1)', desc: 'Phòng viêm phổi, viêm màng não, viêm tai giữa' },
  { months: 9, code: 'MEASLES_1', name: 'Sởi đơn (Mũi 1)', desc: 'Phòng sởi bùng dịch' },
  { months: 9, code: 'JE_1', name: 'Viêm não Nhật Bản (Mũi 1)', desc: 'Phòng viêm não virus lây qua muỗi' },
  { months: 12, code: 'MMR_1', name: 'Sởi - Quai bị - Rubella (MMR)', desc: 'Sàng lọc ba bệnh truyền nhiễm kết hợp' },
  { months: 12, code: 'VARICELLA_1', name: 'Thủy đậu (Mũi 1)', desc: 'Phòng bệnh phỏng nước thủy đậu' },
];

export default function TrackerScreen({ profile }) {
  const status = profile?.status || 'born';
  const userId = profile?.user?.uid;
  const babies = [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0));
  const baby = babies[0] || {};
  
  // Tính toán slug ID thống nhất với BabyProfileScreen
  const babyId = baby.id || (baby.name || 'baby-0').toLowerCase().replace(/\s+/g, '-');
  const dob = baby?.dob || '';
  const pregnancyInfo = profile?.pregnancyInfo || baby?.pregnancyInfo;

  // Tính tuổi thực tế của bé hoặc tuần thai mẹ bầu
  const ageInfo = calculateDetailedAge(dob, status, pregnancyInfo);

  // Sub-tabs điều hướng của Tracker
  const [activeSubTab, setActiveSubTab] = useState(status === 'pregnant' ? 'pregnancy_weight' : 'baby_nutrition');

  // Trạng thái dữ liệu tải từ Firestore
  const [nutritionLogs, setNutritionLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [reminderLogs, setReminderLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ đếm cơn co/cử động thai (Kick counter)
  const [kickCount, setKickCount] = useState(0);
  const [kickTimerActive, setKickTimerActive] = useState(false);
  const [kickElapsedSeconds, setKickElapsedSeconds] = useState(0);
  const kickTimerRef = useRef(null);

  // Timer bú trực tiếp (Breastfeeding Timer)
  const [breastSide, setBreastSide] = useState('left'); // 'left' or 'right'
  const [breastTimerActive, setBreastTimerActive] = useState(false);
  const [breastLeftSeconds, setBreastLeftSeconds] = useState(0);
  const [breastRightSeconds, setBreastRightSeconds] = useState(0);
  const breastTimerIntervalRef = useRef(null);

  // Timer giấc ngủ em bé
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [sleepStartTimestamp, setSleepStartTimestamp] = useState(null);
  const [sleepElapsedSeconds, setSleepElapsedSeconds] = useState(0);
  const sleepTimerIntervalRef = useRef(null);

  // Form states cho Dinh dưỡng
  const [milkType, setMilkType] = useState('breast_direct'); // breast_direct, breast_pump, formula, solid
  const [amountMl, setAmountMl] = useState(120);
  const [foodDetails, setFoodDetails] = useState('');
  
  // Form states cho Sinh hoạt (Tã bỉm)
  const [diaperType, setDiaperType] = useState('pee'); // pee, poop, both
  const [diaperStatus, setDiaperStatus] = useState('normal'); // normal, watery, constipated, bloody
  const [diaperNote, setDiaperNote] = useState('');

  // Form states cho Cân nặng thai kỳ
  const [pregWeight, setPregWeight] = useState(60);
  const [pregWeightNote, setPregWeightNote] = useState('');

  // Form states cho Reminders tuỳ chỉnh
  const [customReminderTitle, setCustomReminderTitle] = useState('');
  const [customReminderTime, setCustomReminderTime] = useState('08:00');
  const [customReminderDate, setCustomReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [customReminderTarget, setCustomReminderTarget] = useState('baby'); // baby, mom
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Đăng ký realtime subscriptions tới Firestore
  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    // 1. Subscription Nhật ký dinh dưỡng
    const nutritionQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'nutritionLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubNutrition = onSnapshot(nutritionQuery, (snap) => {
      setNutritionLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Nutrition query error:", err));

    // 2. Subscription Nhật ký sinh hoạt (giấc ngủ, tã bỉm, cân nặng, cử động thai)
    const activityQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'activityLogs'),
      orderBy('createdAt', 'desc')
    );
    const unsubActivity = onSnapshot(activityQuery, (snap) => {
      setActivityLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Activity query error:", err));

    // 3. Subscription Lịch nhắc nhở (Reminders)
    const remindersQuery = query(
      collection(db, 'users', userId, 'babies', babyId, 'reminders'),
      orderBy('createdAt', 'desc')
    );
    const unsubReminders = onSnapshot(remindersQuery, (snap) => {
      setReminderLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Reminders query error:", err);
      setLoading(false);
    });

    return () => {
      unsubNutrition();
      unsubActivity();
      unsubReminders();
    };
  }, [userId, babyId]);

  // Bộ đếm giờ cử động thai (Pregnancy Kick Counter Timer)
  useEffect(() => {
    if (kickTimerActive) {
      kickTimerRef.current = setInterval(() => {
        setKickElapsedSeconds(s => s + 1);
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
  }, [kickTimerActive]);

  // Bộ đếm giờ bú mẹ trực tiếp (Breastfeeding Timer)
  useEffect(() => {
    if (breastTimerActive) {
      breastTimerIntervalRef.current = setInterval(() => {
        if (breastSide === 'left') {
          setBreastLeftSeconds(s => s + 1);
        } else {
          setBreastRightSeconds(s => s + 1);
        }
      }, 1000);
    } else {
      if (breastTimerIntervalRef.current) {
        clearInterval(breastTimerIntervalRef.current);
        breastTimerIntervalRef.current = null;
      }
    }
    return () => {
      if (breastTimerIntervalRef.current) clearInterval(breastTimerIntervalRef.current);
    };
  }, [breastTimerActive, breastSide]);

  // Bộ đếm giờ ngủ bé (Sleep Timer)
  useEffect(() => {
    if (sleepTimerActive) {
      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepElapsedSeconds(s => s + 1);
      }, 1000);
    } else {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current);
        sleepTimerIntervalRef.current = null;
      }
    }
    return () => {
      if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current);
    };
  }, [sleepTimerActive]);

  // Tự động sinh tiếng chuông Kalimba nhẹ nhàng khi lưu thành công (Web Audio API)
  const triggerGentleChime = () => {
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
      // Hợp âm rải Kalimba êm ái: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
      playTone(523.25, now, 1.0);
      playTone(659.25, now + 0.12, 0.8);
      playTone(784.00, now + 0.24, 0.6);
    } catch (e) {
      console.warn("Chime block error:", e);
    }
  };

  // Định dạng hiển thị giây mm:ss
  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* ──────────────── SAVING LOGS ──────────────── */

  // Lưu Dinh Dưỡng (Bú sữa / Ăn dặm)
  const saveNutritionLog = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const data = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: milkType,
      amountMl: (milkType === 'breast_pump' || milkType === 'formula') ? Number(amountMl) : 0,
      breastTimeLeft: milkType === 'breast_direct' ? Math.round(breastLeftSeconds / 60) : 0,
      breastTimeRight: milkType === 'breast_direct' ? Math.round(breastRightSeconds / 60) : 0,
      foodDetails: milkType === 'solid' ? foodDetails : '',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'nutritionLogs'), data);
      triggerGentleChime();
      
      // Reset states
      setBreastLeftSeconds(0);
      setBreastRightSeconds(0);
      setBreastTimerActive(false);
      setFoodDetails('');
    } catch (error) {
      console.error("Save nutrition log error:", error);
    }
  };

  // Lưu giấc ngủ bé
  const saveSleepLog = async () => {
    if (!userId) return;

    let durationMin = Math.round(sleepElapsedSeconds / 60);
    if (durationMin < 1) durationMin = 1; // Tối thiểu 1 phút

    const data = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'sleep',
      sleepDurationMin: durationMin,
      note: `Bé đã ngủ từ ${sleepStartTimestamp || '—'}. Thời lượng: ${durationMin} phút`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), data);
      triggerGentleChime();
      
      // Reset
      setSleepTimerActive(false);
      setSleepElapsedSeconds(0);
      setSleepStartTimestamp(null);
    } catch (error) {
      console.error("Save sleep error:", error);
    }
  };

  // Lưu Tã bỉm
  const saveDiaperLog = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const typeLabels = { pee: 'Tè', poop: 'Đi ngoài', both: 'Cả hai' };
    const statusLabels = { normal: 'Bình thường', watery: 'Lỏng/Nước', constipated: 'Táo bón', bloody: 'Có vết máu' };

    const data = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'diaper',
      diaperType,
      diaperStatus,
      note: `Thay tã: ${typeLabels[diaperType]}. Phân: ${statusLabels[diaperStatus]}. ${diaperNote}`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), data);
      triggerGentleChime();
      
      // Reset
      setDiaperNote('');
    } catch (err) {
      console.error("Save diaper error:", err);
    }
  };

  // Lưu cân nặng thai kỳ (Mẹ bầu)
  const savePregWeightLog = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const data = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'preg_weight',
      weightKg: Number(pregWeight),
      note: `Cân nặng mẹ bầu: ${pregWeight} kg. ${pregWeightNote}`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), data);
      triggerGentleChime();
      setPregWeightNote('');
    } catch (err) {
      console.error("Save preg weight error:", err);
    }
  };

  // Lưu cử động thai (Mẹ bầu)
  const savePregKickLog = async () => {
    if (!userId || kickCount === 0) return;

    const durationMin = Math.round(kickElapsedSeconds / 60) || 1;
    const data = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'preg_kick',
      kickCount,
      kickDurationMin: durationMin,
      note: `Đếm máy thai: ${kickCount} lần trong ${durationMin} phút.`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'activityLogs'), data);
      triggerGentleChime();
      
      // Reset
      setKickCount(0);
      setKickElapsedSeconds(0);
      setKickTimerActive(false);
    } catch (err) {
      console.error("Save kick error:", err);
    }
  };

  // Thêm nhắc nhở tùy chỉnh
  const addCustomReminder = async (e) => {
    e.preventDefault();
    if (!userId || !customReminderTitle.trim()) return;

    const data = {
      type: 'custom',
      target: customReminderTarget,
      title: customReminderTitle,
      date: customReminderDate,
      time: customReminderTime,
      completed: false,
      note: '',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'reminders'), data);
      triggerGentleChime();
      
      setCustomReminderTitle('');
    } catch (error) {
      console.error("Add reminder error:", error);
    }
  };

  // Check hoàn thành nhắc nhở (Vi-ta-min / Tiêm phòng)
  const toggleReminderCompleted = async (id, currentStatus) => {
    if (!userId) return;
    try {
      // Vì firebase chỉ lưu local nên toggle trạng thái
      const ref = doc(db, 'users', userId, 'babies', babyId, 'reminders', id);
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'reminders'), {
        id,
        completed: !currentStatus
      });
      // Do firebase offline mock, ta xoá và lưu trạng thái hoặc update.
      // Để đồng bộ chính xác trên UI trong chế độ mock local:
      // Tìm document cũ trong list và update local state tạm thời
      setReminderLogs(prev => prev.map(r => r.id === id ? { ...r, completed: !currentStatus } : r));
      triggerGentleChime();
    } catch (error) {
      console.error("Toggle reminder status error:", error);
    }
  };

  // Xóa một dòng nhật ký bất kỳ
  const handleDeleteLog = async (colName, id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dòng nhật ký này không?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'babies', babyId, colName, id));
      triggerGentleChime();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // Tiêm chủng mặc định: Kiểm tra hoặc Khởi tạo
  const handleAutoCreateVaccines = async () => {
    if (!userId || !dob) return;
    try {
      const birthDate = new Date(dob);
      
      // Chạy vòng lặp lưu danh sách vắc xin tiêm chủng vào Firestore
      for (const item of VACCINE_SCHEDULE) {
        const scheduleDate = new Date(birthDate);
        scheduleDate.setMonth(scheduleDate.getMonth() + item.months);

        const data = {
          type: 'vaccine',
          target: 'baby',
          title: `💉 ${item.name} (${item.desc})`,
          date: scheduleDate.toISOString().split('T')[0],
          time: '08:00',
          completed: false,
          note: `Lịch chủng ngừa tự động tính theo ngày sinh ${dob}`,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'users', userId, 'babies', babyId, 'reminders'), data);
      }
      triggerGentleChime();
      alert("Đã tự động lập lịch tiêm chủng đầy đủ 13 mũi theo chuẩn WHO cho bé!");
    } catch (e) {
      console.error("Auto generate vaccines error:", e);
    }
  };

  // Tiêm chủng/vitamin tự động cho mẹ bầu
  const handleAutoCreatePregnancyReminders = async () => {
    if (!userId) return;
    try {
      const reminders = [
        { title: '💊 Uống Canxi & Sắt buổi sáng', time: '07:30' },
        { title: '🤰 Bổ sung Acid Folic & Vitamin bầu tổng hợp', time: '08:30' },
        { title: '🥛 Uống sữa bầu/Sữa hạt dinh dưỡng', time: '20:00' },
        { title: '🩺 Kiểm tra huyết áp và đếm máy thai', time: '21:00' }
      ];

      const todayStr = new Date().toISOString().split('T')[0];

      for (const rem of reminders) {
        const data = {
          type: 'vitamin',
          target: 'mom',
          title: rem.title,
          date: todayStr,
          time: rem.time,
          completed: false,
          note: 'Lịch bổ sung vi chất hàng ngày cho mẹ bầu',
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'users', userId, 'babies', babyId, 'reminders'), data);
      }
      triggerGentleChime();
      alert("Đã tự động khởi tạo lịch uống Canxi, Sắt & Vitamin hàng ngày cho mẹ bầu!");
    } catch (e) {
      console.error("Auto generate pregnancy reminders error:", e);
    }
  };

  return (
    <div className="tracker-screen">
      
      {/* HEADER BANNER */}
      <header className="tracker-header-banner">
        <div className="header-badge">🌿 BỘ SỔ GHI CHÉP</div>
        <h1 className="tracker-main-title">
          {status === 'pregnant' ? '🤰 Nhật Ký Thai Kỳ' : `🍼 Nhật Ký Bé ${baby.name || 'Yêu'}`}
        </h1>
        <p className="tracker-sub-info">
          {status === 'pregnant' ? (
            <span>Hành trình kỳ diệu · <b>{ageInfo.label}</b></span>
          ) : (
            <span>Tuổi bé: <b>{ageInfo.label}</b> ({dob ? `Sinh ngày: ${dob}` : 'Chưa cập nhật ngày sinh'})</span>
          )}
        </p>
      </header>

      {/* CHUYỂN TAB CHỨC NĂNG */}
      <div className="tracker-pivot-nav">
        {status === 'pregnant' ? (
          <>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'pregnancy_weight' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('pregnancy_weight')}
            >
              ⚖️ Cân Nặng Mẹ
            </button>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'pregnancy_kick' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('pregnancy_kick')}
            >
              💓 Đếm Máy Thai
            </button>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'pregnancy_reminders' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('pregnancy_reminders')}
            >
              📅 Nhắc Nhở & Vi Chất
            </button>
          </>
        ) : (
          <>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'baby_nutrition' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('baby_nutrition')}
            >
              🍼 Dinh Dưỡng
            </button>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'baby_activity' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('baby_activity')}
            >
              💤 Giấc Ngủ & Tã
            </button>
            <button 
              className={`pivot-tab-btn ${activeSubTab === 'baby_reminders' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('baby_reminders')}
            >
              📅 Tiêm Chủng & Nhắc Nhở
            </button>
          </>
        )}
      </div>

      <div className="tracker-container-grid">
        
        {/* CỘT TRÁI: FORM NHẬP LIỆU ĐỘNG */}
        <div className="tracker-form-side">
          
          {/* TAB 1 MẸ BẦU: CÂN NẶNG */}
          {activeSubTab === 'pregnancy_weight' && (
            <div className="form-card animate-fade-in">
              <div className="card-form-header">
                <span className="card-form-icon">⚖️</span>
                <div>
                  <h3>Theo dõi Cân nặng Mẹ bầu</h3>
                  <p>Theo dõi cân nặng chuẩn theo tuần thai giáo</p>
                </div>
              </div>
              
              <form onSubmit={savePregWeightLog}>
                <div className="form-group-item">
                  <label>Số cân hiện tại (kg)</label>
                  <div className="weight-slider-input">
                    <input 
                      type="range" 
                      min="40" 
                      max="110" 
                      step="0.5" 
                      value={pregWeight} 
                      onChange={e => setPregWeight(e.target.value)} 
                    />
                    <div className="slider-value-display">{pregWeight} kg</div>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Ghi chú trạng thái</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Đo lúc sáng sớm ngủ dậy, cơ thể thoải mái..."
                    value={pregWeightNote}
                    onChange={e => setPregWeightNote(e.target.value)}
                  />
                </div>

                <button type="submit" className="submit-btn-sage">
                  💾 Lưu Cân Nặng
                </button>
              </form>
            </div>
          )}

          {/* TAB 2 MẸ BẦU: ĐẾM MÁY THAI */}
          {activeSubTab === 'pregnancy_kick' && (
            <div className="form-card animate-fade-in">
              <div className="card-form-header">
                <span className="card-form-icon">💓</span>
                <div>
                  <h3>Máy thai & Cử động thai</h3>
                  <p>Luyện đếm máy thai hàng ngày để theo dõi sức khoẻ bé</p>
                </div>
              </div>

              <div className="kick-counter-wellness-box">
                <div className="kick-timer-display">
                  ⏳ {formatMMSS(kickElapsedSeconds)}
                </div>

                <div className="kick-count-huge-number">
                  {kickCount} <span>Cú đạp</span>
                </div>

                <div className="kick-actions-row">
                  <button 
                    type="button"
                    className="kick-primary-tap-btn animate-pulse"
                    onClick={() => {
                      if (!kickTimerActive) setKickTimerActive(true);
                      setKickCount(c => c + 1);
                      triggerGentleChime();
                    }}
                  >
                    🦶 Bé Đạp! (+1)
                  </button>
                </div>

                <div className="kick-controls-wellness">
                  <button 
                    type="button" 
                    className={`kick-toggle-timer ${kickTimerActive ? 'active' : ''}`}
                    onClick={() => setKickTimerActive(t => !t)}
                  >
                    {kickTimerActive ? '⏸️ Tạm dừng' : '▶️ Bắt đầu đếm'}
                  </button>
                  
                  <button 
                    type="button" 
                    className="kick-reset-btn"
                    onClick={() => {
                      setKickCount(0);
                      setKickElapsedSeconds(0);
                      setKickTimerActive(false);
                    }}
                  >
                    🔄 Đếm lại
                  </button>
                </div>

                {kickCount > 0 && (
                  <button 
                    type="button" 
                    className="save-kicks-btn-full"
                    onClick={savePregKickLog}
                  >
                    💾 Lưu buổi đếm này
                  </button>
                )}

                <div className="wellness-tip-quote">
                  💡 <b>Lời khuyên thai giáo:</b> Đếm máy thai sau khi ăn. Bé đạp từ 4 lần trở lên trong 1 tiếng là an toàn, khỏe mạnh!
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 MẸ BẦU: LỊCH NHẮC THAI KỲ */}
          {activeSubTab === 'pregnancy_reminders' && (
            <div className="form-card animate-fade-in">
              <div className="card-form-header">
                <span className="card-form-icon">📅</span>
                <div>
                  <h3>Lịch uống Vitamin & Hẹn Khám</h3>
                  <p>Bảo đảm không quên lịch bổ sung vi chất dinh dưỡng</p>
                </div>
              </div>

              <button 
                type="button"
                className="btn-outline-wellness" 
                onClick={handleAutoCreatePregnancyReminders}
              >
                🪄 Tạo Lịch Uống Vitamin Mỗi Ngày
              </button>

              <form onSubmit={addCustomReminder} className="reminder-custom-form">
                <h4>Thêm nhắc nhở lịch khám / Việc cần làm</h4>
                <div className="form-group-item">
                  <label>Tiêu đề việc cần nhắc</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Siêu âm 4D tuần thứ 22, Uống sắt..."
                    value={customReminderTitle}
                    onChange={e => setCustomReminderTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-inputs">
                  <div>
                    <label>Ngày</label>
                    <button
                      type="button"
                      className="cs-date-trigger-btn"
                      onClick={() => setShowDatePicker(true)}
                    >
                      <span>{customReminderDate ? customReminderDate.split('-').reverse().join('/') : 'Chọn ngày'}</span>
                    </button>
                  </div>
                  <div>
                    <label>Giờ</label>
                    <input 
                      type="time" 
                      value={customReminderTime}
                      onChange={e => setCustomReminderTime(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn-sage" style={{ marginTop: '12px' }}>
                  ➕ Thêm Nhắc Nhở
                </button>
              </form>
            </div>
          )}

          {/* TAB 1 EM BÉ: DINH DƯỠNG */}
          {activeSubTab === 'baby_nutrition' && (
            <div className="form-card animate-fade-in">
              <div className="card-form-header">
                <span className="card-form-icon">🍼</span>
                <div>
                  <h3>Nhật Ký Dinh Dưỡng</h3>
                  <p>Ghi lại chi tiết lượng sữa và cữ ăn dặm của bé</p>
                </div>
              </div>

              {/* Lựa chọn loại cữ ăn */}
              <div className="milk-type-grid-selector">
                {[
                  { id: 'breast_direct', label: '🤱 Bú Mẹ' },
                  { id: 'breast_pump',   label: '🍼 Sữa Mẹ Vắt' },
                  { id: 'formula',       label: '🥛 Sữa Công Thức' },
                  { id: 'solid',         label: '🥣 Ăn Dặm' }
                ].map(t => (
                  <button 
                    key={t.id}
                    type="button"
                    className={`milk-selector-chip ${milkType === t.id ? 'active' : ''}`}
                    onClick={() => setMilkType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={saveNutritionLog}>
                
                {/* 1. KHỐI BÚ MẸ TRỰC TIẾP (HỆ THỐNG TIMERS TỰ ĐỘNG) */}
                {milkType === 'breast_direct' && (
                  <div className="direct-breastfeeding-timer-block">
                    <div className="breast-side-selector-row">
                      <button 
                        type="button" 
                        className={`side-choice-btn ${breastSide === 'left' ? 'active' : ''}`}
                        onClick={() => setBreastSide('left')}
                      >
                        Bầu ngực Trái (L)
                      </button>
                      <button 
                        type="button" 
                        className={`side-choice-btn ${breastSide === 'right' ? 'active' : ''}`}
                        onClick={() => setBreastSide('right')}
                      >
                        Bầu ngực Phải (R)
                      </button>
                    </div>

                    <div className="double-breast-stopwatches">
                      <div className="breast-watch-card">
                        <div className="side-watch-title">Trái (L)</div>
                        <div className="side-watch-time">{formatMMSS(breastLeftSeconds)}</div>
                      </div>
                      <div className="breast-watch-card">
                        <div className="side-watch-title">Phải (R)</div>
                        <div className="side-watch-time">{formatMMSS(breastRightSeconds)}</div>
                      </div>
                    </div>

                    <div className="timer-controls-row">
                      <button 
                        type="button"
                        className={`timer-action-btn ${breastTimerActive ? 'active' : ''}`}
                        onClick={() => setBreastTimerActive(a => !a)}
                      >
                        {breastTimerActive ? '⏸️ Tạm Dừng' : '▶️ Bắt Đầu Bú'}
                      </button>
                      <button 
                        type="button"
                        className="timer-reset-soft"
                        onClick={() => {
                          setBreastLeftSeconds(0);
                          setBreastRightSeconds(0);
                          setBreastTimerActive(false);
                        }}
                      >
                        🔄 Bấm lại
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. KHỐI SỮA MẸ VẮT HOẶC SỮA CÔNG THỨC */}
                {(milkType === 'breast_pump' || milkType === 'formula') && (
                  <div className="ml-slider-amount-block">
                    <label>Lượng sữa bé ăn (ml)</label>
                    <div className="amount-input-flex">
                      <input 
                        type="range" 
                        min="10" 
                        max="350" 
                        step="5"
                        value={amountMl}
                        onChange={e => setAmountMl(e.target.value)}
                      />
                      <div className="amount-ml-indicator">{amountMl} ml</div>
                    </div>
                    <div className="suggested-amounts-row">
                      {[60, 90, 120, 150, 180, 210].map(val => (
                        <button 
                          key={val}
                          type="button"
                          className="amount-quick-btn"
                          onClick={() => setAmountMl(val)}
                        >
                          {val}ml
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. KHỐI ĂN DẶM */}
                {milkType === 'solid' && (
                  <div className="solid-food-input-block">
                    <label>Thực đơn món ăn dặm hôm nay</label>
                    <textarea
                      rows={3}
                      placeholder="Ví dụ: Cháo bí đỏ nấu thịt băm nhuyễn, bé tự bốc cà rốt luộc..."
                      value={foodDetails}
                      onChange={e => setFoodDetails(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button type="submit" className="submit-btn-sage" style={{ marginTop: '16px' }}>
                  💾 Ghi Nhận Cữ Ăn
                </button>
              </form>
            </div>
          )}

          {/* TAB 2 EM BÉ: GIẤC NGỦ & TÃ */}
          {activeSubTab === 'baby_activity' && (
            <div className="form-card-column animate-fade-in">
              
              {/* KHỐI 1: THEO DÕI GIẤC NGỦ */}
              <div className="form-card" style={{ marginBottom: '20px' }}>
                <div className="card-form-header">
                  <span className="card-form-icon">💤</span>
                  <div>
                    <h3>Bộ Đếm Giờ Giấc Ngủ</h3>
                    <p>Bấm giờ ngủ thực tế giúp bé rèn luyện EASY</p>
                  </div>
                </div>

                <div className="sleep-stopwatch-dashboard">
                  <div className="sleep-timer-pulse-ring">
                    <div className={`sleep-pulse-circle ${sleepTimerActive ? 'active' : ''}`}>
                      <span>{formatMMSS(sleepElapsedSeconds)}</span>
                    </div>
                  </div>

                  <div className="sleep-timer-status-text">
                    {sleepTimerActive ? '💤 Bé đang ngủ ngon...' : '⏰ Bấm để ghi nhận giấc ngủ của con'}
                  </div>

                  <div className="sleep-controls-flex">
                    <button 
                      type="button"
                      className={`sleep-trigger-btn ${sleepTimerActive ? 'active' : ''}`}
                      onClick={() => {
                        if (!sleepTimerActive) {
                          setSleepStartTimestamp(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
                          setSleepTimerActive(true);
                        } else {
                          saveSleepLog();
                        }
                      }}
                    >
                      {sleepTimerActive ? '🌅 Bé Thức Giấc & Lưu' : '😴 Bé Đi Ngủ (Bắt Đầu)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: THAY TÃ/BỈM */}
              <div className="form-card">
                <div className="card-form-header">
                  <span className="card-form-icon">💩</span>
                  <div>
                    <h3>Theo Dõi Hệ Tiêu Hóa (Tã/Bỉm)</h3>
                    <p>Theo dõi tần suất tè/đi ngoài để kịp thời phát hiện bất thường</p>
                  </div>
                </div>

                <form onSubmit={saveDiaperLog}>
                  <div className="form-group-item">
                    <label>Loại chất thải</label>
                    <div className="diaper-types-radio-grid">
                      {[
                        { id: 'pee', label: '💦 Chỉ Tè' },
                        { id: 'poop', label: '💩 Chỉ Đi Ngoài' },
                        { id: 'both', label: '🌊 Cả Hai' }
                      ].map(item => (
                        <button 
                          key={item.id}
                          type="button"
                          className={`diaper-radio-btn ${diaperType === item.id ? 'active' : ''}`}
                          onClick={() => setDiaperType(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(diaperType === 'poop' || diaperType === 'both') && (
                    <div className="form-group-item animate-slide-up">
                      <label>Tình trạng phân (Báo cáo hệ tiêu hóa)</label>
                      <select 
                        value={diaperStatus} 
                        onChange={e => setDiaperStatus(e.target.value)}
                        className="wellness-select"
                      >
                        <option value="normal">✅ Bình thường (Vàng/Khá đặc)</option>
                        <option value="watery">⚠️ Lỏng / Rất nhiều nước (Đề phòng tiêu chảy)</option>
                        <option value="constipated">⚠️ Táo bón (Rắn / Dạng hòn nhỏ)</option>
                        <option value="bloody">🚨 Có vết máu / Nhầy màu hồng (Đi khám ngay!)</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group-item">
                    <label>Ghi chú khác</label>
                    <input 
                      type="text"
                      placeholder="Ví dụ: Phân có mùi chua nhẹ, bỉm tràn..."
                      value={diaperNote}
                      onChange={e => setDiaperNote(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="submit-btn-sage">
                    💾 Lưu Lịch Sử Thay Bỉm
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3 EM BÉ: LỊCH TIÊM PHÒNG & VITAMIN */}
          {activeSubTab === 'baby_reminders' && (
            <div className="form-card animate-fade-in">
              <div className="card-form-header">
                <span className="card-form-icon">📅</span>
                <div>
                  <h3>Lịch Tiêm Chủng Quốc Gia WHO</h3>
                  <p>Lập lịch nhắc tự động toàn bộ mũi tiêm chủng trọn đời cho bé</p>
                </div>
              </div>

              <div className="quick-actions-card">
                <button 
                  type="button" 
                  className="btn-outline-wellness"
                  onClick={handleAutoCreateVaccines}
                >
                  🪄 Lập Lịch Tự Động 13 Mũi Tiêm Chủng
                </button>
              </div>

              <form onSubmit={addCustomReminder} className="reminder-custom-form">
                <h4>Thêm nhắc nhở tùy chỉnh (Lịch uống Canxi, D3, tái khám...)</h4>
                <div className="form-group-item">
                  <label>Tiêu đề</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Bổ sung Vitamin D3 K2 giọt ban sáng..."
                    value={customReminderTitle}
                    onChange={e => setCustomReminderTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-inputs">
                  <div>
                    <label>Ngày uống / Lịch hẹn</label>
                    <button
                      type="button"
                      className="cs-date-trigger-btn"
                      onClick={() => setShowDatePicker(true)}
                    >
                      <span>{customReminderDate ? customReminderDate.split('-').reverse().join('/') : 'Chọn ngày'}</span>
                    </button>
                  </div>
                  <div>
                    <label>Giờ nhắc</label>
                    <input 
                      type="time" 
                      value={customReminderTime}
                      onChange={e => setCustomReminderTime(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn-sage" style={{ marginTop: '12px' }}>
                  ➕ Tạo Nhắc Nhở
                </button>
              </form>
            </div>
          )}

        </div>

        {/* CỘT PHẢI: STREAM LỊCH SỬ HOẠT ĐỘNG VÀ NHẮC NHỞ HÔM NAY */}
        <div className="tracker-stream-side">
          
          {/* PHẦN 1: BẢNG VIỆC CẦN LÀM / NHẮC NHỞ HÔM NAY */}
          <div className="stream-section-card">
            <div className="stream-card-title">
              <span>📅</span> Lịch Nhắc Nhở & Việc Cần Làm
            </div>

            {loading ? (
              <div className="stream-empty">Đang tải lịch nhắc...</div>
            ) : reminderLogs.length === 0 ? (
              <div className="stream-empty">
                Chưa có lịch nhắc nhở nào.<br /> Hãy click các nút "Tạo lịch tự động" bên cột trái để khởi tạo nhanh.
              </div>
            ) : (
              <div className="reminders-stream-list">
                {reminderLogs.map(item => (
                  <div key={item.id} className={`reminder-row-item ${item.completed ? 'completed' : ''}`}>
                    <div className="reminder-left-flex">
                      <input 
                        type="checkbox" 
                        checked={item.completed || false} 
                        onChange={() => toggleReminderCompleted(item.id, item.completed)}
                      />
                      <div>
                        <div className="reminder-item-title">{item.title}</div>
                        <div className="reminder-item-time">
                          ⏱️ {item.time} — 📅 {item.date} 
                          {item.target === 'mom' ? <span className="target-mom-badge">Mẹ bầu</span> : <span className="target-baby-badge">Em bé</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="delete-reminder-btn"
                      onClick={() => handleDeleteLog('reminders', item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PHẦN 2: LỊCH SỬ HOẠT ĐỘNG HÀNG NGÀY (DAILY LOGS STREAM) */}
          <div className="stream-section-card">
            <div className="stream-card-title">
              <span>⏳</span> Dòng Thời Gian Nhật Ký
            </div>

            <div className="daily-logs-scroller">
              {/* Dữ liệu dinh dưỡng */}
              {nutritionLogs.length > 0 && (
                <div className="stream-group">
                  <div className="stream-group-header">🍼 Dinh dưỡng (Bú mẹ & sữa công thức)</div>
                  {nutritionLogs.map(log => (
                    <div key={log.id} className="timeline-activity-item">
                      <div className="timeline-icon">🍼</div>
                      <div className="timeline-body">
                        <div className="timeline-time-row">
                          <span className="log-time">{log.time} — {log.date}</span>
                          <button className="del-btn-sub" onClick={() => handleDeleteLog('nutritionLogs', log.id)}>🗑️</button>
                        </div>
                        <div className="log-details-desc">
                          {log.type === 'breast_direct' && `🤱 Bú mẹ trực tiếp: L: ${log.breastTimeLeft} phút · R: ${log.breastTimeRight} phút`}
                          {log.type === 'breast_pump' && `🍼 Sữa mẹ vắt: ${log.amountMl} ml`}
                          {log.type === 'formula' && `🥛 Sữa công thức: ${log.amountMl} ml`}
                          {log.type === 'solid' && `🥣 Ăn dặm: ${log.foodDetails}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dữ liệu giấc ngủ, bỉm, đếm máy, cân nặng */}
              {activityLogs.length > 0 && (
                <div className="stream-group">
                  <div className="stream-group-header">✨ Nhật ký sinh hoạt & Thai kỳ</div>
                  {activityLogs.map(log => (
                    <div key={log.id} className="timeline-activity-item">
                      <div className="timeline-icon">
                        {log.type === 'sleep' ? '💤' : log.type === 'diaper' ? '💩' : log.type === 'preg_weight' ? '⚖️' : '💓'}
                      </div>
                      <div className="timeline-body">
                        <div className="timeline-time-row">
                          <span className="log-time">{log.time} — {log.date}</span>
                          <button className="del-btn-sub" onClick={() => handleDeleteLog('activityLogs', log.id)}>🗑️</button>
                        </div>
                        <div className="log-details-desc">{log.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {nutritionLogs.length === 0 && activityLogs.length === 0 && (
                <div className="stream-empty">
                  Hôm nay mẹ chưa ghi nhận nhật ký nào. Hãy tạo các cữ bú, giấc ngủ, bỉm bên cột trái nhé!
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {showDatePicker && createPortal(
        <AppDatePicker
          value={customReminderDate}
          onConfirm={(dateStr) => {
            setCustomReminderDate(dateStr);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          dateType="nextAppointmentDate"
        />,
        document.body
      )}

    </div>
  );
}
