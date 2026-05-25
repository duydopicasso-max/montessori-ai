/**
 * GrowthScreen.jsx — Personalized Growth & Pregnancy Tracking
 * - user.status === "pregnant"  → Theo dõi Thai kỳ
 * - user.status === "parent"    → Theo dõi Tăng trưởng (WHO)
 * - Skeleton loading, rich empty states, full data isolation
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, getDoc, setDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  getWHOData, getAgeInMonths, calcBMI, assessNutrition, getPctOfMedian
} from '../data/whoData.js';
import CheckupSheet from '../components/CheckupSheet.jsx';
import AppDatePicker from '../components/AppDatePicker.jsx';
import './GrowthScreen.css';
import {
  PencilIcon, CalendarIcon, WeightIcon,
  RulerIcon, HeadCircleIcon, PlusIcon
} from '../icons.jsx';

/* ── Inline SVG Icons ── */
const LineChartIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const CloseIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const RefreshIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const BabyHeartIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="#5FAF82" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21C12 21 4 14.5 4 9a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 5.5-8 12-8 12z" />
    <circle cx="12" cy="7" r="1.5" fill="#5FAF82" stroke="none" />
  </svg>
);
const UltrasoundIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="#C8E8D4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);
const ShieldCheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

/* ── Format date helper ── */
const fmtDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return null; }
};

/* ── Format friendly age helper ── */
const formatFriendlyAge = (ageMonths) => {
  if (ageMonths < 12) {
    return `${ageMonths} tháng tuổi`;
  }
  const years = Math.floor(ageMonths / 12);
  const remainingMonths = ageMonths % 12;
  if (remainingMonths === 0) {
    return `${years} tuổi`;
  }
  return `${years} tuổi ${remainingMonths} tháng`;
};

/* ── Custom Tooltip component for WHO Growth Chart ── */
const CustomTooltip = ({ active, payload, label, chartTab }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.actual == null) return null; // Chỉ hiển thị tooltip cho mốc đo thực tế của bé
    const unit = chartTab === 'weight' ? 'kg' : 'cm';
    const friendlyAge = data.ageLabel || `${Math.round(data.month)} tháng tuổi`;
    const formattedDate = data.date ? fmtDate(data.date) : '';
    
    return (
      <div style={{
        background: '#FFFFFF',
        padding: '12px 14px',
        border: '1.5px solid rgba(95,175,130,0.18)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(47,107,79,0.08)',
        fontSize: '12.5px',
        fontFamily: 'inherit',
        color: '#333'
      }}>
        {formattedDate && <div style={{ color: '#888888', fontWeight: '600', marginBottom: '4px' }}>{formattedDate}</div>}
        <div style={{ color: '#2F6B4F', fontWeight: '700', marginBottom: '6px' }}>{friendlyAge}</div>
        <div style={{ fontWeight: '800', color: '#1E4A33', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{chartTab === 'weight' ? 'Cân nặng:' : 'Chiều cao:'}</span>
          <span style={{ color: '#5FAF82' }}>{data.actual} {unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

/* ── Format date to dd/mm/yyyy ── */
const fmtDisplay = (iso) => {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
};

/* ── Format gestational age to dynamic text ── */
const formatGestationalAge = (week, day) => {
  if (week === undefined || week === null) return '';
  if (day === undefined || day === null || day === 0) return `Tuần ${week}`;
  return `Tuần ${week} + ${day} ngày`;
};

/* ── Compute pregnancy week from EDD ── */
const computePregnancyWeek = (edd) => {
  if (!edd) return null;
  const due = new Date(edd);
  const now = new Date();
  const daysLeft = Math.round((due - now) / 86400000);
  const weeks = Math.floor((280 - daysLeft) / 7);
  if (weeks < 1 || weeks > 42) return null;
  return weeks;
};

/* ── Compute pregnancy week from EDD and visit date ── */
const computePregnancyWeekForDate = (edd, visitDateStr) => {
  if (!edd || !visitDateStr) return null;
  const due = new Date(edd);
  due.setHours(12, 0, 0, 0);
  const visit = new Date(visitDateStr);
  visit.setHours(12, 0, 0, 0);
  const diffTime = due - visit;
  const diffDays = Math.round(diffTime / 86400000);
  const weeks = Math.floor((280 - diffDays) / 7);
  if (weeks < 1 || weeks > 42) return null;
  return weeks;
};

/* ── LocalStorage Helpers for Pending Deletes ── */
const getPendingDeletesFromStorage = () => {
  try {
    const raw = localStorage.getItem('pendingDeleteVisits');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const savePendingToLocalStorage = (visitId, userId) => {
  const list = getPendingDeletesFromStorage();
  list.push({ visitId, userId, timerStartTime: Date.now() });
  localStorage.setItem('pendingDeleteVisits', JSON.stringify(list));
};

const removePendingFromLocalStorage = (visitId) => {
  const list = getPendingDeletesFromStorage();
  const filtered = list.filter(item => item.visitId !== visitId);
  localStorage.setItem('pendingDeleteVisits', JSON.stringify(filtered));
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function GrowthScreen({ profile, setActiveTab, pendingAction, onConsumePendingAction }) {
  // 'born' is a legacy status value that should be treated as 'parent'
  const rawStatus = profile?.status || 'parent';
  const userStatus = rawStatus === 'born' ? 'parent' : rawStatus;
  const userId     = profile?.user?.uid;
  const babies     = useMemo(() => [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0)), [profile?.babies]);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedBaby, setSelectedBaby] = useState(() => {
    return (profile?.numBabies || 1) >= 2 ? 'overview' : 0;
  });
  const [babyOverrides, setBabyOverrides] = useState({});
  const [logs, setLogs]                 = useState([]);
  const [pregnancyData, setPregnancyData] = useState(null);
  const [babyLogs, setBabyLogs]         = useState({});
  const [pregnancyVisits, setPregnancyVisits] = useState([]);

  // EDD near-due banner state
  const [dismissedNearDueBannerTime, setDismissedNearDueBannerTime] = useState(() => {
    try {
      const hideUntil = parseInt(localStorage.getItem('dismissedNearDueBannerUntil') || '0');
      return hideUntil;
    } catch {
      return 0;
    }
  });

  // Confirm birth bottom sheet states
  const [showConfirmBirthSheet, setShowConfirmBirthSheet] = useState(false);
  const [savingBirth, setSavingBirth]                     = useState(false);
  const [showBirthSuccessModal, setShowBirthSuccessModal] = useState(false);

  // Form inputs for birth confirmation
  const [birthNames, setBirthNames]   = useState(['', '', '']);
  const [birthGenders, setBirthGenders] = useState(['girl', 'girl', 'girl']);
  const [birthWeights, setBirthWeights] = useState(['', '', '']);
  const [birthHeights, setBirthHeights] = useState(['', '', '']);
  const [birthHeads, setBirthHeads]     = useState(['', '', '']);
  const [birthTime, setBirthTime]       = useState('');
  const [birthDate, setBirthDate]       = useState(() => new Date().toISOString().split('T')[0]);
  const [sameBirthDate, setSameBirthDate] = useState(true);
  const [birthDates, setBirthDates]     = useState([
    new Date().toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  ]);

  // Date picker state for birth confirmation sheet
  const [activeBirthDatePickerIndex, setActiveBirthDatePickerIndex] = useState(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);

  const isTwin     = (profile?.numBabies || pregnancyData?.babyCount || 1) >= 2;
  const nameParts  = (pregnancyData?.babyName || '').split('&');
  const babyAName  = nameParts[0]?.trim() || 'Bé A';
  const babyBName  = nameParts[1]?.trim() || 'Bé B';
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [showVisitForm, setShowVisitForm]     = useState(false);

  // Active child measurement form target (in case of multiple babies)
  const [measureFormBabyIndex, setMeasureFormBabyIndex] = useState(0);

  const [measureForm, setMeasureForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '', height: '', head: '', note: ''
  });
  const [saving, setSaving]       = useState(false);
  const [editField, setEditField] = useState(null);
  const [editVal, setEditVal]     = useState('');
  const [chartTab, setChartTab]   = useState('weight');

  // Edit / Delete checkup & Profile states
  const [editingVisit, setEditingVisit] = useState(null);
  const [activePendingDeleteIds, setActivePendingDeleteIds] = useState([]);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('delete'); // 'delete' | 'error'
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [tempBabyName, setTempBabyName] = useState('');
  const [tempBabyNameA, setTempBabyNameA] = useState('');
  const [tempBabyNameB, setTempBabyNameB] = useState('');
  const [tempBabyNameC, setTempBabyNameC] = useState('');
  const [tempEdd, setTempEdd] = useState('');
  const [tempNumBabies, setTempNumBabies] = useState(1);
  const [showEddCalendar, setShowEddCalendar] = useState(false);
  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const [showMeasureDateCalendar, setShowMeasureDateCalendar] = useState(false);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [showConfirmCloseProfile, setShowConfirmCloseProfile] = useState(false);

  // Baby Info Edit Bottom Sheet States
  const [showEditBabyModal, setShowEditBabyModal]                 = useState(false);
  const [tempEditBabyName, setTempEditBabyName]                   = useState('');
  const [tempEditBabyDob, setTempEditBabyDob]                     = useState('');
  const [tempEditBabyGender, setTempEditBabyGender]               = useState('girl');
  const [tempEditBabyBirthWeight, setTempEditBabyBirthWeight]     = useState('');
  const [tempEditBabyBirthHeight, setTempEditBabyBirthHeight]     = useState('');
  const [tempEditBabyBirthHead, setTempEditBabyBirthHead]         = useState('');
  const [savingBabyInfo, setSavingBabyInfo]                       = useState(false);
  const [showBabyEditDobCalendar, setShowBabyEditDobCalendar]     = useState(false);

  const forceCleanRef = useRef(false);
  const initialBabyNameARef = useRef('');
  const initialBabyNameBRef = useRef('');
  const initialBabyNameCRef = useRef('');

  const profileOverlayStateRef = useRef({ isDirty: false, saving: false });
  profileOverlayStateRef.current = {
    isDirty: forceCleanRef.current ? false : (
      tempBabyNameA !== initialBabyNameARef.current ||
      tempBabyNameB !== initialBabyNameBRef.current ||
      tempBabyNameC !== initialBabyNameCRef.current ||
      tempEdd !== (pregnancyData?.edd || '') || 
      tempNumBabies !== (profile?.numBabies || 1)
    ),
    saving: forceCleanRef.current ? false : loading
  };

  useEffect(() => {
    if (showEditProfileModal && window._overlayStack) {
      window._overlayStack.push(
        'growth-profile-edit',
        () => {
          if (profileOverlayStateRef.current.saving) return 'saving';
          if (profileOverlayStateRef.current.isDirty) return 'dirty';
          return 'clean';
        },
        () => {
          setShowEditProfileModal(false);
        },
        () => {
          setShowConfirmCloseProfile(true);
        }
      );
    }
    return () => {
      if (window._overlayStack) {
        window._overlayStack.pop('growth-profile-edit');
      }
    };
  }, [showEditProfileModal]);

  const handleAttemptCloseProfile = () => {
    const isDirty = profileOverlayStateRef.current.isDirty;
    if (isDirty) {
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
        window.history.back();
      } else {
        setShowConfirmCloseProfile(true);
      }
    } else {
      setShowEditProfileModal(false);
      if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
        window._overlayStack.pop('growth-profile-edit');
        window.history.back();
      }
    }
  };

  const handleConfirmDiscardProfile = () => {
    forceCleanRef.current = true;
    setTempBabyName(pregnancyData?.babyName || '');
    setTempEdd(pregnancyData?.edd || '');
    setShowConfirmCloseProfile(false);
    profileOverlayStateRef.current.isDirty = false;
    profileOverlayStateRef.current.saving = false;
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
      window._overlayStack.pop('growth-profile-edit');
      window.history.back();
    }
    setShowEditProfileModal(false);
  };
  
  const pendingDeletesRef = useRef({});
  const latestDeletedIdRef = useRef(null);

  /* ── Body class effects for active modals — NO overflow:hidden (iOS Safari bug) ── */
  useEffect(() => {
    const isModalOpen = showDeleteConfirm || showEditProfileModal || showEddCalendar || showDobCalendar || showMeasureDateCalendar || showRecalcModal;
    if (isModalOpen) {
      // Do NOT set overflow:hidden — iOS Safari freezes touch events on fixed elements
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
  }, [showDeleteConfirm, showEditProfileModal, showEddCalendar, showDobCalendar, showMeasureDateCalendar, showRecalcModal]);


  /* ── Resolved baby ── */
  const currentBabyIndex = typeof selectedBaby === 'number' ? selectedBaby : 0;
  const rawBaby  = babies[currentBabyIndex] || {};
  const override = babyOverrides[currentBabyIndex] || {};
  const baby     = { ...rawBaby, ...override };
  const babyId   = rawBaby.id || rawBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${currentBabyIndex}`;
  const gender    = baby.gender || 'girl';
  const dob       = baby.dob || '';
  const ageMonths = getAgeInMonths(dob);

  const getPersonalizedSubtitle = () => {
    if (userStatus === 'pregnant') {
      return 'Tuần thai · Cân nặng mẹ · Chỉ số siêu âm · Lịch khám';
    }
    
    // For twins/triplets in overview/compare
    if (babies.length > 1 && (selectedBaby === 'overview' || selectedBaby === 'compare')) {
      return 'Các bé · Theo dõi riêng từng bé';
    }
    
    // For a single baby (or selected baby tab)
    const activeIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
    const currentActiveBaby = babies[activeIdx] || baby || {};
    const babyName = currentActiveBaby.name || 'Bé yêu';
    
    const babyDob = currentActiveBaby.dob || '';
    const babyAgeMonths = babyDob ? getAgeInMonths(babyDob) : 0;
    
    const babyAgeLabel = !babyDob ? '—' : formatFriendlyAge(babyAgeMonths);
      
    let metricsLabel = 'Cân nặng · Chiều cao · Chu vi đầu';
    if (babyAgeMonths <= 12) {
      metricsLabel = 'Cân nặng · Chiều dài · Chu vi đầu';
    } else if (babyAgeMonths > 12 && babyAgeMonths <= 36) {
      metricsLabel = 'Cân nặng · Chiều cao · Mốc phát triển';
    } else {
      metricsLabel = 'Chiều cao · Cân nặng · Mốc phát triển';
    }
    
    return `${babyName} · ${babyAgeLabel} · ${metricsLabel}`;
  };

  // Initialize birth form names when pregnancyData is loaded
  useEffect(() => {
    if (pregnancyData?.babyName) {
      const parts = pregnancyData.babyName.split('&').map(p => p.trim());
      setBirthNames([parts[0] || '', parts[1] || '', parts[2] || '']);
    }
  }, [pregnancyData]);

  /* ── Near-due checker ── */
  // Returns: null | 'approaching' (≤14d) | 'urgent' (≤3d) | 'overdue' (past EDD)
  const nearDueLevel = (() => {
    if (userStatus !== 'pregnant' || !pregnancyData?.edd) return null;
    try {
      const hideUntil = parseInt(localStorage.getItem('dismissedNearDueBannerUntil') || '0');
      if (Date.now() < hideUntil) return null;
    } catch {}

    const now = new Date();
    const eddDate = new Date(pregnancyData.edd);
    eddDate.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffDays = Math.ceil((eddDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 14) return 'approaching';
    return null;
  })();

  const isNearDue = nearDueLevel !== null;

  const handleDismissBanner = (days) => {
    const hideUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
    localStorage.setItem('dismissedNearDueBannerUntil', hideUntil.toString());
    setDismissedNearDueBannerTime(hideUntil);
  };

  const handleConfirmBirth = async (e) => {
    if (e) e.preventDefault();
    if (!userId || savingBirth) return;

    setSavingBirth(true);
    const confirmedBabyCount = pregnancyData?.babyCount || profile?.numBabies || 1;
    
    try {
      const batch = writeBatch(db);
      const updatedBabies = [];

      for (let i = 0; i < confirmedBabyCount; i++) {
        // Generate unique baby ID
        const babyDocRef = doc(collection(db, 'users', userId, 'babies'));
        const bId = babyDocRef.id;
        const childKey = i === 0 ? 'baby-a' : i === 1 ? 'baby-b' : 'baby-c';
        const childOrder = i;

        const babyName = birthNames[i].trim() || (confirmedBabyCount > 1 ? `Bé ${String.fromCharCode(65 + i)}` : 'Bé yêu');
        const babyDob = sameBirthDate ? birthDate : birthDates[i];
        const babyGender = birthGenders[i];

        const bWeight = parseFloat(birthWeights[i]) || null;
        const bHeight = parseFloat(birthHeights[i]) || null;
        const bHead = parseFloat(birthHeads[i]) || null;

        // 1. Create baby document under users/{userId}/babies/{bId}
        batch.set(babyDocRef, {
          id: bId,
          childKey,
          childOrder,
          name: babyName,
          dob: babyDob,
          gender: babyGender,
          birthWeight: bWeight,
          birthHeight: bHeight,
          birthHeadCircumference: bHead,
          linkedPregnancyId: 'pregnancy',
          linkedFetusId: bId,
          createdAt: serverTimestamp()
        }, { merge: true });

        // 2. Create the first growth log if birth indicators are provided
        if (bWeight !== null || bHeight !== null || bHead !== null) {
          const logRef = doc(collection(db, 'users', userId, 'babies', bId, 'growthLogs'));
          batch.set(logRef, {
            date: babyDob,
            weight: bWeight,
            height: bHeight,
            head: bHead,
            bmi: calcBMI(bWeight, bHeight),
            note: 'Chỉ số lúc sinh',
            createdAt: serverTimestamp()
          });

          // Also write to activityLogs
          const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const activityLogRef = doc(collection(db, 'users', userId, 'babies', bId, 'activityLogs'));
          batch.set(activityLogRef, {
            date: babyDob,
            time: formattedTime,
            type: 'growth',
            weightKg: bWeight,
            heightCm: bHeight,
            headCircumferenceCm: bHead,
            note: 'Chỉ số lúc sinh',
            createdAt: serverTimestamp(),
            childId: bId
          });
        }

        updatedBabies.push({
          id: bId,
          childKey,
          childOrder,
          label: confirmedBabyCount > 1 ? `Bé ${String.fromCharCode(65 + i)}` : 'Bé yêu',
          name: babyName,
          gender: babyGender,
          dob: babyDob
        });
      }

      // 3. Update pregnancy status to completed
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
        numBabies: confirmedBabyCount,
        babies: updatedBabies
      }, { merge: true });

      // Execute batch
      await batch.commit();

      setSavingBirth(false);
      setShowConfirmBirthSheet(false);
      setShowBirthSuccessModal(true);
    } catch (err) {
      console.error('Birth confirmation failed:', err);
      setSavingBirth(false);
      alert('Không thể lưu thông tin. Mẹ vui lòng kiểm tra kết nối mạng nhé.');
    }
  };

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    // If parent but babies not yet loaded from subcollection, wait — don't show blank
    if (userStatus === 'parent' && babies.length === 0) {
      // Keep loading state, babies will arrive via onSnapshot and trigger re-run
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (userStatus === 'parent') {
        const logsMap = {};
        for (let i = 0; i < babies.length; i++) {
          const b = babies[i];
          const bId = b.id || b.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${i}`;
          const q = query(
            collection(db, 'users', userId, 'babies', bId, 'growthLogs'),
            orderBy('date', 'asc')
          );
          const snap = await getDocs(q);
          logsMap[bId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        setBabyLogs(logsMap);

        const activeIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
        const activeBaby = babies[activeIdx] || {};
        const activeBabyId = activeBaby.id || activeBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${activeIdx}`;
        setLogs(logsMap[activeBabyId] || []);

        // Also load pregnancy history
        const pregRef  = doc(db, 'users', userId, 'tracking', 'pregnancy');
        const pregSnap = await getDoc(pregRef);
        setPregnancyData(pregSnap.exists() ? pregSnap.data() : null);

        const vq = query(
          collection(db, 'users', userId, 'pregnancyVisits'),
          orderBy('date', 'desc')
        );
        const vSnap = await getDocs(vq);
        const fetchedLogs = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pendingList = getPendingDeletesFromStorage().map(item => item.visitId);
        setPregnancyVisits(fetchedLogs.filter(log => !pendingList.includes(log.id)));
      } else {
        const pregRef  = doc(db, 'users', userId, 'tracking', 'pregnancy');
        const pregSnap = await getDoc(pregRef);
        setPregnancyData(pregSnap.exists() ? pregSnap.data() : null);

        const vq = query(
          collection(db, 'users', userId, 'pregnancyVisits'),
          orderBy('date', 'desc')
        );
        const vSnap = await getDocs(vq);
        const fetchedLogs = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pendingList = getPendingDeletesFromStorage().map(item => item.visitId);
        setLogs(fetchedLogs.filter(log => !pendingList.includes(log.id)));
      }
    } catch (e) {
      console.error(e);
      setError('load_failed');
    } finally {
      setLoading(false);
    }
  }, [userId, userStatus, selectedBaby, babies]);

  useEffect(() => {
    if (userStatus === 'parent' && Object.keys(babyLogs).length > 0) {
      const activeIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
      const activeBaby = babies[activeIdx] || {};
      const activeBabyId = activeBaby.id || activeBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${activeIdx}`;
      setLogs(babyLogs[activeBabyId] || []);
    }
  }, [selectedBaby, babyLogs, userStatus, babies]);

  useEffect(() => {
    loadData();
    setShowMeasureForm(false);
    setShowVisitForm(false);
  }, [userId, userStatus, babies]);

  // Safety: if parent status but babies still empty after 6s, stop loading to prevent infinite spinner
  useEffect(() => {
    if (userStatus !== 'parent' || babies.length > 0) return;
    const timer = setTimeout(() => {
      setLoading(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [userStatus, babies.length]);

  /* ── Consume pending action from App (e.g. navigate here + open CheckupSheet) ── */
  useEffect(() => {
    if (!loading) {
      if (pendingAction === 'openCheckupSheet') {
        setEditingVisit(null);
        setShowVisitForm(true);
        if (onConsumePendingAction) onConsumePendingAction();
      } else if (pendingAction === 'openEditProfile') {
        const fallbackBabyName = babies[selectedBaby]?.name || profile?.childName || 'Bé yêu';
        const fallbackEdd = babies[selectedBaby]?.pregnancyInfo?.dueDate || profile?.pregnancyInfo?.dueDate || '';
        const rawBabyName = pregnancyData?.babyName || fallbackBabyName;
        setTempBabyName(rawBabyName);

        const nameParts = rawBabyName.split('&').map(n => n.trim());
        const nA = nameParts[0] || '';
        const nB = nameParts[1] || '';
        const nC = nameParts[2] || '';

        setTempBabyNameA(nA);
        setTempBabyNameB(nB);
        setTempBabyNameC(nC);

        initialBabyNameARef.current = nA;
        initialBabyNameBRef.current = nB;
        initialBabyNameCRef.current = nC;

        setTempEdd(pregnancyData?.edd || fallbackEdd);
        setTempNumBabies(profile?.numBabies || 1);
        setShowEditProfileModal(true);
        if (onConsumePendingAction) onConsumePendingAction();
      }
    }
  }, [pendingAction, loading, onConsumePendingAction, babies, selectedBaby, profile, pregnancyData]);

  /* ── Process lingering deletes from localStorage on mount ── */
  useEffect(() => {
    if (!userId) return;
    const processLingeringDeletes = async () => {
      const list = getPendingDeletesFromStorage();
      const userDeletes = list.filter(item => item.userId === userId);
      for (const item of userDeletes) {
        try {
          await deleteDoc(doc(db, 'users', userId, 'pregnancyVisits', item.visitId));
        } catch (e) {
          console.error("Failed to delete lingering visit:", e);
        }
        removePendingFromLocalStorage(item.visitId);
      }
    };
    processLingeringDeletes();
  }, [userId]);

  /* ── Unmount / Page Close Deletes Cleanup ── */
  useEffect(() => {
    const handleBeforeUnload = () => {
      const pendingIds = Object.keys(pendingDeletesRef.current);
      pendingIds.forEach(visitId => {
        deleteDoc(doc(db, 'users', userId, 'pregnancyVisits', visitId));
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Unmount cleanup: execute all pending deletes immediately
      const pendingIds = Object.keys(pendingDeletesRef.current);
      pendingIds.forEach(visitId => {
        if (pendingDeletesRef.current[visitId]) {
          clearTimeout(pendingDeletesRef.current[visitId]);
        }
        deleteDoc(doc(db, 'users', userId, 'pregnancyVisits', visitId));
        removePendingFromLocalStorage(visitId);
      });
    };
  }, [userId]);

  /* ── Save baby measurement ── */
  const handleSaveMeasure = async () => {
    const targetIdx = babies.length > 1 ? measureFormBabyIndex : currentBabyIndex;
    const targetBaby = babies[targetIdx] || {};
    const targetBabyId = targetBaby.id || targetBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${targetIdx}`;

    if (!userId || !targetBabyId || saving) return;

    const wVal = parseFloat(measureForm.weight) || null;
    const hVal = parseFloat(measureForm.height) || null;
    const headVal = parseFloat(measureForm.head) || null;
    const noteVal = measureForm.note?.trim() || '';

    if (wVal === null && hVal === null && headVal === null) {
      alert("Mẹ nhập ít nhất một chỉ số trước khi lưu nhé.");
      return;
    }

    setSaving(true);
    try {
      const entry = {
        date:   measureForm.date,
        weight: wVal,
        height: hVal,
        head:   headVal,
        bmi:    calcBMI(wVal, hVal),
        note:   noteVal,
        createdAt: serverTimestamp(),
      };
      
      // 1. Write to growthLogs
      const docRef = await addDoc(collection(db, 'users', userId, 'babies', targetBabyId, 'growthLogs'), entry);
      const savedEntry = { id: docRef.id, ...entry };

      // 2. Write to activityLogs for Home card and ChatScreen timeline
      let detailParts = [];
      if (wVal) detailParts.push(`${wVal} kg`);
      if (hVal) detailParts.push(`${hVal} cm`);
      if (headVal) detailParts.push(`${headVal} cm chu vi đầu`);
      
      const metricsText = detailParts.join(', ');
      const activityNote = noteVal 
        ? `Đã cập nhật số đo (${metricsText}) · ${noteVal}` 
        : `Đã cập nhật số đo (${metricsText})`;

      const formattedTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const activityLogRef = doc(collection(db, 'users', userId, 'babies', targetBabyId, 'activityLogs'));
      await setDoc(activityLogRef, {
        date: measureForm.date,
        time: formattedTime,
        type: 'growth',
        weightKg: wVal,
        heightCm: hVal,
        headCircumferenceCm: headVal,
        note: activityNote,
        createdAt: serverTimestamp(),
        childId: targetBabyId
      });
      
      setBabyLogs(prev => {
        const currentLogs = prev[targetBabyId] || [];
        const newLogs = [...currentLogs, savedEntry].sort((a, b) => a.date.localeCompare(b.date));
        return { ...prev, [targetBabyId]: newLogs };
      });

      setMeasureForm({ date: new Date().toISOString().split('T')[0], weight: '', height: '', head: '', note: '' });
      setShowMeasureForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  /* ── Save pregnancy visit (via CheckupSheet) ── */
  const handleSaveCheckup = async (checkupEntry) => {
    if (!userId) throw new Error('No userId');

    const entry = {
      date:                 checkupEntry.date,
      notes:                checkupEntry.notes || '',
      nextAppointment:      checkupEntry.nextAppointment || null,
      reminder:             checkupEntry.reminder || false,
      motherWeight:         checkupEntry.motherWeight !== undefined ? checkupEntry.motherWeight : null,
      gestationalAgeDays:   checkupEntry.gestationalAgeDays !== undefined ? checkupEntry.gestationalAgeDays : null,
      gestationalWeek:      checkupEntry.gestationalWeek !== undefined ? checkupEntry.gestationalWeek : null,
      gestationalDay:       checkupEntry.gestationalDay !== undefined ? checkupEntry.gestationalDay : null,
      gestationalAgeSource: checkupEntry.gestationalAgeSource || 'edd',
      eddSnapshotAtVisit:   checkupEntry.eddSnapshotAtVisit || null,
      // Twin: save babyA/babyB and babyMetrics sub-objects; single: flat fields
      ...((checkupEntry.isTwin || checkupEntry.babyMetrics || checkupEntry.babyA) ? {
        isTwin: true,
        babyA: checkupEntry.babyA || {},
        babyB: checkupEntry.babyB || {},
        babyMetrics: checkupEntry.babyMetrics || {},
      } : {
        bpd:           checkupEntry.bpd !== undefined ? checkupEntry.bpd : null,
        fl:            checkupEntry.fl !== undefined ? checkupEntry.fl : null,
        ac:            checkupEntry.ac !== undefined ? checkupEntry.ac : null,
        hc:            checkupEntry.hc !== undefined ? checkupEntry.hc : null,
        crl:           checkupEntry.crl !== undefined ? checkupEntry.crl : null,
        efw:           checkupEntry.efw !== undefined ? checkupEntry.efw : null,
        fetalHeartRate: checkupEntry.fetalHeartRate !== undefined ? checkupEntry.fetalHeartRate : null,
      }),
      updatedAt:            serverTimestamp(),
    };

    // Save asynchronously in the background
    try {
      if (editingVisit?.id) {
        updateDoc(doc(db, 'users', userId, 'pregnancyVisits', editingVisit.id), entry)
          .catch(err => console.error("Error updating pregnancy visit:", err));
        setLogs(prev => prev.map(item => item.id === editingVisit.id ? { ...item, ...entry, updatedAt: new Date() } : item).sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        entry.createdAt = serverTimestamp();
        addDoc(collection(db, 'users', userId, 'pregnancyVisits'), entry).then(docRef => {
          setLogs(prev => [{ id: docRef.id, ...entry, createdAt: new Date() }, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
        }).catch(err => console.error("Error creating pregnancy visit:", err));
      }
    } catch (e) {
      console.error("Error saving checkup in background:", e);
    }
  };

  /* ── Delete pregnancy visit (5s delayed delete with undo) ── */
  const handleDeleteClick = (visitId) => {
    setVisitToDelete(visitId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!visitToDelete) return;
    const visitId = visitToDelete;
    setShowDeleteConfirm(false);
    setVisitToDelete(null);

    // 1. Hide immediately from local list
    setActivePendingDeleteIds(prev => [...prev, visitId]);

    // 2. Write to localStorage
    savePendingToLocalStorage(visitId, userId);

    // 3. Show Toast with Undo option
    latestDeletedIdRef.current = visitId;
    setToastType('delete');
    setToastMsg("Đã xóa ghi nhận khám thai");
    setToastVisible(true);

    // 4. Start 5-second timer
    const timerId = setTimeout(() => {
      executeDelete(visitId);
      setToastVisible(false);
    }, 5000);
    pendingDeletesRef.current[visitId] = timerId;
  };

  const executeDelete = async (visitId) => {
    if (pendingDeletesRef.current[visitId]) {
      clearTimeout(pendingDeletesRef.current[visitId]);
      delete pendingDeletesRef.current[visitId];
    }
    try {
      await deleteDoc(doc(db, 'users', userId, 'pregnancyVisits', visitId));
      setLogs(prev => prev.filter(item => item.id !== visitId));
    } catch (e) {
      console.error("Failed to delete checkup:", e);
    }
    removePendingFromLocalStorage(visitId);
    setActivePendingDeleteIds(prev => prev.filter(id => id !== visitId));
  };

  const handleUndoDelete = () => {
    const visitId = latestDeletedIdRef.current;
    if (!visitId) return;

    if (pendingDeletesRef.current[visitId]) {
      clearTimeout(pendingDeletesRef.current[visitId]);
      delete pendingDeletesRef.current[visitId];
    }

    setActivePendingDeleteIds(prev => prev.filter(id => id !== visitId));
    removePendingFromLocalStorage(visitId);
    setToastVisible(false);
    latestDeletedIdRef.current = null;
  };

  /* ── Save profile updates ── */
  const handleSaveProfile = () => {
    const isEddChanged = tempEdd !== (pregnancyData?.edd || '');
    if (isEddChanged && logs.length > 0) {
      setShowRecalcModal(true);
    } else {
      handleProfileUpdate(false);
    }
  };

  const handleProfileUpdate = async (shouldRecalculate) => {
    if (!userId) return;

    // ── Calculate joinedName ──
    const nameA = tempBabyNameA.trim();
    const nameB = tempBabyNameB.trim();
    const nameC = tempBabyNameC.trim();
    let joinedName = '';
    if (tempNumBabies === 1) {
      joinedName = nameA || 'Bé yêu';
    } else if (tempNumBabies === 2) {
      joinedName = `${nameA || 'Bé A'} & ${nameB || 'Bé B'}`;
    } else if (tempNumBabies === 3) {
      joinedName = `${nameA || 'Bé A'} & ${nameB || 'Bé B'} & ${nameC || 'Bé C'}`;
    }

    // ── Optimistic close: đóng modal NGAY LẬP TỨC, không chờ Firestore ──
    setShowRecalcModal(false);
    forceCleanRef.current = true;
    profileOverlayStateRef.current.isDirty = false;
    profileOverlayStateRef.current.saving = false;
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
      window.history.back();
    } else {
      setShowEditProfileModal(false);
    }

    // ── Optimistic UI update: cập nhật state local ngay lập tức ──
    setPregnancyData(prev => ({
      ...prev,
      babyName: joinedName,
      edd: tempEdd,
      babyCount: tempNumBabies
    }));

    // ── Prepare user document babies array ──
    const getOrCreateBabyId = (idx) => {
      if (babies[idx]?.id) return babies[idx].id;
      return doc(collection(db, 'users', userId, 'babies')).id;
    };
    const idA = getOrCreateBabyId(0);
    const idB = getOrCreateBabyId(1);
    const idC = getOrCreateBabyId(2);

    const updatedBabies = [];
    if (tempNumBabies >= 1) {
      updatedBabies.push({
        id: idA,
        childKey: 'baby-a',
        childOrder: 0,
        label: 'Bé A',
        name: nameA || 'Bé A',
        gender: babies[0]?.gender || 'girl',
        dob: babies[0]?.dob || '',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameA || 'Bé A'
        }
      });
    }
    if (tempNumBabies >= 2) {
      updatedBabies.push({
        id: idB,
        childKey: 'baby-b',
        childOrder: 1,
        label: 'Bé B',
        name: nameB || 'Bé B',
        gender: babies[1]?.gender || 'girl',
        dob: babies[1]?.dob || '',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameB || 'Bé B'
        }
      });
    }
    if (tempNumBabies === 3) {
      updatedBabies.push({
        id: idC,
        childKey: 'baby-c',
        childOrder: 2,
        label: 'Bé C',
        name: nameC || 'Bé C',
        gender: babies[2]?.gender || 'girl',
        dob: babies[2]?.dob || '',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameC || 'Bé C'
        }
      });
    }

    // ── Background save: lưu song song lên Firestore mà không block UI ──
    const pregRef = doc(db, 'users', userId, 'tracking', 'pregnancy');
    const userRef = doc(db, 'users', userId);

    const writePromises = [
      setDoc(pregRef, {
        babyName: joinedName,
        edd: tempEdd,
        babyCount: tempNumBabies,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(userRef, {
        numBabies: tempNumBabies,
        babies: updatedBabies,
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: joinedName
        }
      }, { merge: true })
    ];

    // 3. Đồng bộ subcollection babies
    if (tempNumBabies >= 1) {
      const babyARef = doc(db, 'users', userId, 'babies', idA);
      writePromises.push(setDoc(babyARef, {
        id: idA,
        childKey: 'baby-a',
        childOrder: 0,
        label: 'Bé A',
        name: nameA || 'Bé A',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameA || 'Bé A'
        }
      }, { merge: true }));
    }
    if (tempNumBabies >= 2) {
      const babyBRef = doc(db, 'users', userId, 'babies', idB);
      writePromises.push(setDoc(babyBRef, {
        id: idB,
        childKey: 'baby-b',
        childOrder: 1,
        label: 'Bé B',
        name: nameB || 'Bé B',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameB || 'Bé B'
        }
      }, { merge: true }));
    }
    if (tempNumBabies === 3) {
      const babyCRef = doc(db, 'users', userId, 'babies', idC);
      writePromises.push(setDoc(babyCRef, {
        id: idC,
        childKey: 'baby-c',
        childOrder: 2,
        label: 'Bé C',
        name: nameC || 'Bé C',
        pregnancyInfo: {
          dueDate: tempEdd,
          babyName: nameC || 'Bé C'
        }
      }, { merge: true }));
    }

    try {
      await Promise.all(writePromises);

      if (shouldRecalculate) {
        const batch = writeBatch(db);
        const newDue = new Date(tempEdd);
        newDue.setHours(12, 0, 0, 0);
        const startPregnancyTime = newDue.getTime() - 280 * 24 * 60 * 60 * 1000;

        let hasUpdates = false;
        const updatedLogs = logs.map(log => {
          const source = log.gestationalAgeSource || 'edd';
          if (source !== 'manual') {
            const visit = new Date(log.date);
            visit.setHours(12, 0, 0, 0);
            if (visit.getTime() >= startPregnancyTime) {
              const diffDays = Math.round((newDue - visit) / 86400000);
              const newAgeDays = 280 - diffDays;
              const newWeek = Math.floor(newAgeDays / 7);
              const newDay = newAgeDays % 7;

              if (newAgeDays >= 0 && newAgeDays <= 300) {
                const logRef = doc(db, 'users', userId, 'pregnancyVisits', log.id);
                batch.update(logRef, {
                  gestationalAgeDays: newAgeDays,
                  gestationalWeek: newWeek,
                  gestationalDay: newDay,
                  gestationalAgeSource: 'edd',
                  eddSnapshotAtVisit: tempEdd,
                  updatedAt: serverTimestamp()
                });
                hasUpdates = true;
                return {
                  ...log,
                  gestationalAgeDays: newAgeDays,
                  gestationalWeek: newWeek,
                  gestationalDay: newDay,
                  gestationalAgeSource: 'edd',
                  eddSnapshotAtVisit: tempEdd
                };
              }
            }
          }
          return log;
        });

        if (hasUpdates) {
          await batch.commit();
          setLogs(updatedLogs);
        }
      } else {
        setPregnancyData(prev => ({
          ...prev,
          babyName: tempBabyName,
          edd: tempEdd
        }));
      }
    } catch (e) {
      console.error("Failed to update profile or recalculate:", e);
      // Nhẹ nhàng thông báo lỗi mà không khóa màn hình
      setToastType('error');
      setToastMsg('Chưa lưu được thay đổi, mẹ kiểm tra kết nối mạng nhé 🌿');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3500);
    } finally {
      forceCleanRef.current = false;
      // Reload nhẹ để đồng bộ dữ liệu
      loadData();
    }
  };

  /* ── Inline edit ── */
  const startEdit = (field) => {
    if (field === 'dob') {
      setShowDobCalendar(true);
      return;
    }
    setEditField(field);
    let initialVal = '';
    if (field === 'name') initialVal = baby.name || '';
    else if (field === 'dob') initialVal = baby.dob || '';
    else if (field === 'birthWeight') initialVal = baby.birthWeight || '';
    else if (field === 'birthHeight') initialVal = baby.birthHeight || '';
    else if (field === 'birthHeadCircumference') initialVal = baby.birthHeadCircumference || '';
    setEditVal(initialVal);
  };
  const saveEdit = async () => {
    const targetIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
    const isMetric = ['birthWeight', 'birthHeight', 'birthHeadCircumference'].includes(editField);
    const parsedVal = isMetric ? (parseFloat(editVal) || null) : editVal;
    
    setBabyOverrides(prev => ({
      ...prev,
      [targetIdx]: { ...(prev[targetIdx] || {}), [editField]: parsedVal }
    }));
    setEditField(null);
    try {
      const newBabies = [...babies];
      newBabies[targetIdx] = { ...newBabies[targetIdx], ...babyOverrides[targetIdx], [editField]: parsedVal };
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });
      // Sync to subcollection if baby has an id
      const targetBaby = babies[targetIdx] || {};
      if (targetBaby.id && ['name', 'birthWeight', 'birthHeight', 'birthHeadCircumference'].includes(editField)) {
        updateDoc(doc(db, 'users', userId, 'babies', targetBaby.id), { [editField]: parsedVal })
          .catch(e => console.error(`Failed to sync ${editField} to subcollection:`, e));
      }
    } catch (e) { console.error('Save failed', e); }
  };
  /* ── Baby Info Bottom Sheet Handlers ── */
  const handleOpenEditBabyModal = () => {
    const targetIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
    const activeBaby = babies[targetIdx] || {};
    setTempEditBabyName(activeBaby.name || '');
    setTempEditBabyDob(activeBaby.dob || '');
    setTempEditBabyGender(activeBaby.gender || 'girl');
    setTempEditBabyBirthWeight(activeBaby.birthWeight !== undefined && activeBaby.birthWeight !== null ? activeBaby.birthWeight : '');
    setTempEditBabyBirthHeight(activeBaby.birthHeight !== undefined && activeBaby.birthHeight !== null ? activeBaby.birthHeight : '');
    setTempEditBabyBirthHead(activeBaby.birthHeadCircumference !== undefined && activeBaby.birthHeadCircumference !== null ? activeBaby.birthHeadCircumference : '');
    setSavingBabyInfo(false);
    setShowEditBabyModal(true);
  };

  const handleSaveBabyInfo = async () => {
    if (savingBabyInfo) return;
    setSavingBabyInfo(true);
    
    const targetIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
    const activeBaby = babies[targetIdx] || {};
    const babyId = activeBaby.id || activeBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${targetIdx}`;
    
    try {
      const newBabies = [...babies];
      const parsedWeight = tempEditBabyBirthWeight !== '' ? parseFloat(tempEditBabyBirthWeight) : null;
      const parsedHeight = tempEditBabyBirthHeight !== '' ? parseFloat(tempEditBabyBirthHeight) : null;
      const parsedHead = tempEditBabyBirthHead !== '' ? parseFloat(tempEditBabyBirthHead) : null;
      
      newBabies[targetIdx] = {
        ...activeBaby,
        name: tempEditBabyName.trim() || activeBaby.name || (babies.length > 1 ? `Bé ${String.fromCharCode(65 + targetIdx)}` : 'Bé yêu'),
        dob: tempEditBabyDob || null,
        gender: tempEditBabyGender,
        birthWeight: parsedWeight,
        birthHeight: parsedHeight,
        birthHeadCircumference: parsedHead
      };
      
      // Update user doc babies array
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });
      
      // Sync to subcollection if baby has an id or we build the id
      await setDoc(doc(db, 'users', userId, 'babies', babyId), {
        id: babyId,
        name: tempEditBabyName.trim() || activeBaby.name || (babies.length > 1 ? `Bé ${String.fromCharCode(65 + targetIdx)}` : 'Bé yêu'),
        dob: tempEditBabyDob || null,
        gender: tempEditBabyGender,
        birthWeight: parsedWeight,
        birthHeight: parsedHeight,
        birthHeadCircumference: parsedHead
      }, { merge: true });
      
      // Update local overrides so UI reflects instantly without lag
      setBabyOverrides(prev => ({
        ...prev,
        [targetIdx]: {
          name: tempEditBabyName.trim() || activeBaby.name,
          dob: tempEditBabyDob || null,
          gender: tempEditBabyGender,
          birthWeight: parsedWeight,
          birthHeight: parsedHeight,
          birthHeadCircumference: parsedHead
        }
      }));
      
      // Show success toast
      setToastMsg('Đã cập nhật thông tin bé');
      setToastType('success'); 
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
      
      setShowEditBabyModal(false);
    } catch (e) {
      console.error('Failed to save baby info', e);
      setToastMsg('Chưa thể cập nhật thông tin bé. Mẹ thử lại sau một chút nhé.');
      setToastType('error');
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    } finally {
      setSavingBabyInfo(false);
    }
  };

  const handleDobSelect = async (dateStr) => {
    setShowDobCalendar(false);
    try {
      const targetIdx = typeof selectedBaby === 'number' ? selectedBaby : 0;
      const targetBaby = babies[targetIdx] || {};
      const targetBabyId = targetBaby.id || targetBaby.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${targetIdx}`;

      const newBabies = [...babies];
      newBabies[targetIdx] = { ...newBabies[targetIdx], dob: dateStr };

      // Update user doc babies array
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });

      // Also update subcollection baby doc (source of truth)
      if (targetBaby.id) {
        updateDoc(doc(db, 'users', userId, 'babies', targetBabyId), { dob: dateStr })
          .catch(e => console.error('Failed to sync dob to subcollection:', e));
      }

      setBabyOverrides(prev => ({
        ...prev,
        [targetIdx]: { ...(prev[targetIdx] || {}), dob: dateStr }
      }));
      // Force reload from database to ensure everything is in sync
      loadData();
    } catch (e) {
      console.error('Save DOB failed', e);
    }
  };


  /* ── Chart data builder (WHO baby growth) ── */
  const buildChartData = (type) => {
    if (!dob) return [];
    const whoRef = (gender === 'boy' || gender === 'girl') ? (getWHOData(gender, type) || []) : [];
    
    // Collect actual points with real values (no grouping by months)
    const actualPoints = logs.map(l => {
      if (!l.date) return null;
      const val = type === 'weight' ? l.weight : type === 'height' ? l.height : l.head;
      if (val === undefined || val === null || val === '') return null;
      const exactAge = (new Date(l.date) - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.4375);
      return {
        isActual: true,
        exactAge,
        date: l.date,
        val: parseFloat(val)
      };
    }).filter(p => p !== null);
    
    const maxActualAge = actualPoints.length > 0 ? Math.max(...actualPoints.map(p => p.exactAge)) : 0;
    const limitAge = Math.max(12, Math.ceil(maxActualAge) + 3);
    
    // Filter WHO reference points
    const whoPoints = whoRef
      .filter(r => r.month <= limitAge)
      .map(r => ({
        isActual: false,
        exactAge: r.month,
        ref: r
      }));
      
    // Combine and sort by exact age (float)
    const allPoints = [...whoPoints, ...actualPoints].sort((a, b) => a.exactAge - b.exactAge);
    
    return allPoints.map(pt => {
      const age = pt.exactAge;
      let lower = null;
      let band = null;
      
      if (!pt.isActual) {
        lower = pt.ref.sd_n2;
        band = parseFloat((pt.ref.sd_p2 - pt.ref.sd_n2).toFixed(2));
      } else {
        // Interpolate WHO values for float ages
        const refPrev = whoRef.findLast(r => r.month <= age);
        const refNext = whoRef.find(r => r.month > age);
        if (refPrev && refNext) {
          const t = (age - refPrev.month) / (refNext.month - refPrev.month);
          const interpLower = refPrev.sd_n2 + t * (refNext.sd_n2 - refPrev.sd_n2);
          const interpUpper = refPrev.sd_p2 + t * (refNext.sd_p2 - refPrev.sd_p2);
          lower = interpLower;
          band = parseFloat((interpUpper - interpLower).toFixed(2));
        } else if (refPrev) {
          lower = refPrev.sd_n2;
          band = parseFloat((refPrev.sd_p2 - refPrev.sd_n2).toFixed(2));
        } else if (refNext) {
          lower = refNext.sd_n2;
          band = parseFloat((refNext.sd_p2 - refNext.sd_n2).toFixed(2));
        }
      }
      
      const isInteger = Number.isInteger(age);
      const label = isInteger ? `${age}th` : '';
      
      let ageLabel = '';
      if (pt.isActual) {
        if (pt.date === dob) {
          ageLabel = 'Lúc sinh';
        } else {
          ageLabel = formatFriendlyAge(Math.round(age));
        }
      }
      
      return {
        month: age,
        label,
        lower,
        band,
        actual: pt.isActual ? pt.val : null,
        date: pt.isActual ? pt.date : null,
        ageLabel,
        isActualPoint: pt.isActual
      };
    });
  };

  /* ── Chart comparison data builder (multi-baby growth) ── */
  const buildComparisonChartData = (type) => {
    if (babies.length === 0) return [];
    const refGender = babies[0]?.gender || 'girl';
    const whoRef = getWHOData(refGender, type) || [];
    
    // Collect ages from all babies' logs
    const actualAges = [];
    babies.forEach((b, i) => {
      const bId = b.id || b.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${i}`;
      const bDob = b.dob || '';
      const bLogs = babyLogs[bId] || [];
      bLogs.forEach(l => {
        if (l.date && bDob) {
          const lAge = Math.round((new Date(l.date) - new Date(bDob)) / (1000 * 60 * 60 * 24 * 30.4375));
          actualAges.push(lAge);
        }
      });
    });

    const whoAges = whoRef.map(r => r.month);
    const allAges = Array.from(new Set([...whoAges, ...actualAges])).sort((a, b) => a - b);

    const maxActualAge = actualAges.length > 0 ? Math.max(...actualAges) : 0;
    const limitAge = Math.max(12, maxActualAge + 3);
    const filteredAges = allAges.filter(age => age <= limitAge);

    return filteredAges.map(month => {
      const ref = whoRef.find(r => r.month === month);
      const dataPoint = {
        month,
        label: `${month}th`,
        lower: ref ? ref.sd_n2 : null,
        band: ref ? parseFloat((ref.sd_p2 - ref.sd_n2).toFixed(2)) : null,
      };
      
      babies.forEach((b, i) => {
        const bId = b.id || b.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${i}`;
        const bDob = b.dob || '';
        const bLogs = babyLogs[bId] || [];
        const matchLog = bLogs.find(l => {
          if (!l.date || !bDob) return false;
          const lAge = Math.round((new Date(l.date) - new Date(bDob)) / (1000 * 60 * 60 * 24 * 30.4375));
          return lAge === month;
        });
        const val = matchLog
          ? (type === 'weight' ? matchLog.weight : type === 'height' ? matchLog.height : matchLog.head)
          : null;
        dataPoint[`actual_${i}`] = val ? parseFloat(val) : null;
      });
      
      return dataPoint;
    });
  };

  /* ── Derived values ── */
  const latestLog  = logs[logs.length - 1];
  const curWeight  = parseFloat(latestLog?.weight || 0);
  const curHeight  = parseFloat(latestLog?.height || 0);
  const curHead    = parseFloat(latestLog?.head   || 0);
  const nutrition  = assessNutrition(curWeight, ageMonths, gender);

  const pregnancyWeek      = pregnancyData?.currentWeek || computePregnancyWeek(pregnancyData?.edd);
  const lastVisit          = logs[0];
  const latestMotherWeight = lastVisit?.motherWeight || pregnancyData?.lastMotherWeight;

  const ageLabel = !dob ? '—' : formatFriendlyAge(ageMonths);

  return (
    <div className="growth-screen">
      {/* ── HEADER ── */}
      <header className="growth-header">
        <div className="growth-header-inner">
          <div className="growth-header-icon">
            <LineChartIcon size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 className="growth-title">
              {userStatus === 'pregnant' ? 'Theo dõi Thai kỳ' : 'Theo dõi Tăng trưởng'}
            </h1>
            <p className="growth-subtitle">
              {getPersonalizedSubtitle()}
            </p>
          </div>
        </div>
      </header>

      {/* ── NEAR DUE BANNER ── */}
      {isNearDue && (() => {
        const isOverdue = nearDueLevel === 'overdue';
        const isUrgent  = nearDueLevel === 'urgent';
        const bannerBg  = isOverdue ? 'rgba(95, 175, 130, 0.08)' : '#F0FAF4';
        const borderClr = isOverdue ? 'rgba(95, 175, 130, 0.4)' : 'rgba(95, 175, 130, 0.25)';

        const daysLeft = (() => {
          if (!pregnancyData?.edd) return 0;
          const now = new Date(); now.setHours(0,0,0,0);
          const edd = new Date(pregnancyData.edd); edd.setHours(0,0,0,0);
          return Math.ceil((edd - now) / (1000 * 60 * 60 * 24));
        })();

        return (
          <div className="near-due-banner" style={{
            backgroundColor: bannerBg,
            border: `1.5px solid ${borderClr}`,
            borderRadius: '16px',
            padding: '16px',
            margin: '14px 16px 0 16px',
            boxShadow: '0 2px 10px rgba(47, 107, 79, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#5FAF82" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <strong style={{ color: '#1E4A33', fontSize: '14.5px' }}>
                {isOverdue
                  ? 'Mẹ đã qua ngày dự sinh rồi'
                  : isUrgent
                    ? `Còn ${daysLeft} ngày nữa gặp bé`
                    : `Còn khoảng ${daysLeft} ngày nữa`
                }
              </strong>
            </div>
            <p style={{ color: '#4F7C62', fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.5' }}>
              {isOverdue
                ? 'Chúc mừng mẹ! Khi bé đã chào đời, mẹ xác nhận để app chuyển sang theo dõi tăng trưởng sau sinh nhé.'
                : isUrgent
                  ? 'Mong mẹ và bé bình an. Khi bé chào đời, mẹ có thể xác nhận ngay tại đây.'
                  : 'Mong mẹ và bé luôn khỏe mạnh. Khi gần đến ngày, app sẽ nhắc mẹ xác nhận đã sinh.'
              }
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-btn"
                style={{ flex: isOverdue || isUrgent ? 2 : 1, padding: '9px 14px', fontSize: '13px', boxShadow: 'none' }}
                onClick={() => setShowConfirmBirthSheet(true)}
              >
                Bé đã chào đời
              </button>
              {!isOverdue && (
                <button
                  type="button"
                  className="outline-btn"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '12.5px', border: '1px solid rgba(95,175,130,0.5)', color: '#2F6B4F', background: 'transparent' }}
                  onClick={() => handleDismissBanner(isUrgent ? 1 : 3)}
                >
                  {isUrgent ? 'Nhắc lại sau' : 'Đã biết'}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── BABY TABS (parent, multi-baby selector) ── */}
      {userStatus === 'parent' && babies.length > 1 && (
        <div className="baby-tabs">
          <button
            type="button"
            className={`baby-tab ${selectedBaby === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedBaby('overview')}
          >
            Tổng quan
          </button>
          {babies.map((b, i) => {
            const ov = babyOverrides[i] || {};
            const n  = ov.name || b.name || `Bé ${String.fromCharCode(65 + i)}`;
            return (
              <button
                key={i}
                type="button"
                className={`baby-tab ${selectedBaby === i ? 'active' : ''}`}
                onClick={() => setSelectedBaby(i)}
              >{n}</button>
            );
          })}
          <button
            type="button"
            className={`baby-tab ${selectedBaby === 'compare' ? 'active' : ''}`}
            onClick={() => setSelectedBaby('compare')}
          >
            So sánh
          </button>
        </div>
      )}

      <div className="growth-content">
        {/* ── ERROR ── */}
        {error && (
          <div className="growth-error-card">
            <p className="growth-error-title">Chưa thể tải dữ liệu tăng trưởng</p>
            <p className="growth-error-sub">Mẹ thử lại sau một chút nhé.</p>
            <button className="retry-btn" onClick={loadData}>
              <RefreshIcon size={14} /> Thử lại
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && !error && <GrowthSkeleton />}

        {/* ── PREGNANT VIEW ── */}
        {!loading && !error && userStatus === 'pregnant' && (
          <PregnantView
            isTwin={isTwin}
            pregnancyData={pregnancyData}
            pregnancyWeek={pregnancyWeek}
            latestMotherWeight={latestMotherWeight}
            lastVisit={logs.filter(l => !activePendingDeleteIds.includes(l.id))[0]}
            logs={logs.filter(l => !activePendingDeleteIds.includes(l.id))}
            onOpenCheckupSheet={() => {
              setEditingVisit(null);
              setShowVisitForm(true);
            }}
            onEditCheckup={(visit) => {
              setEditingVisit(visit);
              setShowVisitForm(true);
            }}
            onDeleteCheckup={handleDeleteClick}
            onOpenEditProfile={() => {
              const fallbackBabyName = babies[selectedBaby]?.name || profile?.childName || 'Bé yêu';
              const fallbackEdd = babies[selectedBaby]?.pregnancyInfo?.dueDate || profile?.pregnancyInfo?.dueDate || '';
              const rawBabyName = pregnancyData?.babyName || fallbackBabyName;
              setTempBabyName(rawBabyName);

              const nameParts = rawBabyName.split('&').map(n => n.trim());
              const nA = nameParts[0] || '';
              const nB = nameParts[1] || '';
              const nC = nameParts[2] || '';

              setTempBabyNameA(nA);
              setTempBabyNameB(nB);
              setTempBabyNameC(nC);

              initialBabyNameARef.current = nA;
              initialBabyNameBRef.current = nB;
              initialBabyNameCRef.current = nC;

              setTempEdd(pregnancyData?.edd || fallbackEdd);
              setTempNumBabies(profile?.numBabies || 1);
              setShowEditProfileModal(true);
            }}
          />
        )}

        {/* ── CHECKUP SHEET (portal-level) ── */}
        <CheckupSheet
          open={showVisitForm}
          onClose={() => {
            setShowVisitForm(false);
            setEditingVisit(null);
          }}
          onSave={handleSaveCheckup}
          existingVisit={editingVisit}
          edd={pregnancyData?.edd}
          isTwin={isTwin}
          babyAName={babyAName}
          babyBName={babyBName}
        />

        {/* ── CUSTOM DELETE CONFIRM MODAL ── */}
        {showDeleteConfirm && createPortal(
          <div className="cs-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="cs-confirm-box" onClick={e => e.stopPropagation()}>
              <h3 className="cs-confirm-title">Xóa ghi nhận khám thai?</h3>
              <p className="cs-confirm-text">Mẹ có chắc chắn muốn xóa ghi nhận này không? Thao tác này có thể hoàn tác trong vòng 5 giây.</p>
              <div className="cs-confirm-actions">
                <button type="button" className="cs-confirm-btn cs-confirm-btn--secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Hủy
                </button>
                <button type="button" className="cs-confirm-btn cs-confirm-btn--danger" onClick={handleConfirmDelete}>
                  Xóa ghi nhận
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── CUSTOM EDIT PROFILE MODAL ── */}
        {showEditProfileModal && createPortal(
          <div className="cs-modal-overlay" onClick={handleAttemptCloseProfile}>
            <div className="cs-modal-box" onClick={e => e.stopPropagation()}>
              <div className="cs-modal-header">
                <h3 className="cs-modal-title">Chỉnh sửa hồ sơ thai kỳ</h3>
                <button type="button" className="cs-modal-close" onClick={handleAttemptCloseProfile}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <div className="cs-modal-body" onFocusCapture={(e) => {
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 250);
                }
              }}>
                <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                  <label className="cs-label">Số lượng bé</label>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '6px',
                    backgroundColor: '#F8F9FA',
                    padding: '4px',
                    borderRadius: '16px',
                    border: '1px solid #EEEEEE'
                  }}>
                    {[
                      { value: 1, label: '1 bé' },
                      { value: 2, label: 'Thai đôi' },
                      { value: 3, label: 'Thai ba' }
                    ].map(opt => {
                      const isSelected = tempNumBabies === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`cs-num-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => setTempNumBabies(opt.value)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: isSelected ? '1.5px solid #5FAF82' : '1px solid transparent',
                            backgroundColor: isSelected ? '#F0F9F4' : 'transparent',
                            color: isSelected ? '#2E7D32' : '#666666',
                            fontWeight: isSelected ? '600' : '500',
                            fontSize: '13.5px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isSelected ? '0 2px 8px rgba(95, 175, 130, 0.12)' : 'none'
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {tempNumBabies === 1 && (
                  <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                    <label className="cs-label">Tên bé yêu (ở nhà)</label>
                    <input
                      type="text"
                      className="cs-input"
                      style={{ cursor: 'text' }}
                      value={tempBabyNameA}
                      onChange={e => setTempBabyNameA(e.target.value)}
                      placeholder="Bé yêu"
                    />
                  </div>
                )}

                {tempNumBabies === 2 && (
                  <>
                    <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                      <label className="cs-label">Tên Bé A (ở nhà)</label>
                      <input
                        type="text"
                        className="cs-input"
                        style={{ cursor: 'text' }}
                        value={tempBabyNameA}
                        onChange={e => setTempBabyNameA(e.target.value)}
                        placeholder="Bắp"
                      />
                    </div>
                    <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                      <label className="cs-label">Tên Bé B (ở nhà)</label>
                      <input
                        type="text"
                        className="cs-input"
                        style={{ cursor: 'text' }}
                        value={tempBabyNameB}
                        onChange={e => setTempBabyNameB(e.target.value)}
                        placeholder="Bơ"
                      />
                    </div>
                  </>
                )}

                {tempNumBabies === 3 && (
                  <>
                    <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                      <label className="cs-label">Tên Bé A (ở nhà)</label>
                      <input
                        type="text"
                        className="cs-input"
                        style={{ cursor: 'text' }}
                        value={tempBabyNameA}
                        onChange={e => setTempBabyNameA(e.target.value)}
                        placeholder="Bắp"
                      />
                    </div>
                    <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                      <label className="cs-label">Tên Bé B (ở nhà)</label>
                      <input
                        type="text"
                        className="cs-input"
                        style={{ cursor: 'text' }}
                        value={tempBabyNameB}
                        onChange={e => setTempBabyNameB(e.target.value)}
                        placeholder="Bơ"
                      />
                    </div>
                    <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                      <label className="cs-label">Tên Bé C (ở nhà)</label>
                      <input
                        type="text"
                        className="cs-input"
                        style={{ cursor: 'text' }}
                        value={tempBabyNameC}
                        onChange={e => setTempBabyNameC(e.target.value)}
                        placeholder="Cà Rốt"
                      />
                    </div>
                  </>
                )}

                <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                  <label className="cs-label">Ngày dự sinh (EDD)</label>
                  <button
                    type="button"
                    className="cs-date-trigger-btn"
                    onClick={() => setShowEddCalendar(true)}
                  >
                    <CalendarIcon size={15} color="#5FAF82" />
                    <span>{fmtDisplay(tempEdd) || 'Chọn ngày dự sinh'}</span>
                  </button>
                </div>
                
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    style={{ flex: 1 }}
                    onClick={handleAttemptCloseProfile}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={handleSaveProfile}
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── PROFILE CONFIRM CLOSE DIALOG ── */}
        {showConfirmCloseProfile && createPortal(
          <div className="ios-confirm-overlay" onClick={() => setShowConfirmCloseProfile(false)}>
            <div className="ios-confirm-card" onClick={e => e.stopPropagation()}>
              <h3 className="ios-confirm-title">Bỏ thay đổi?</h3>
              <p className="ios-confirm-message">Mẹ có muốn bỏ các thay đổi đang nhập không?</p>
              <div className="ios-confirm-buttons">
                <button type="button" className="ios-confirm-btn danger" onClick={handleConfirmDiscardProfile}>
                  Bỏ thay đổi
                </button>
                <button type="button" className="ios-confirm-btn" onClick={() => setShowConfirmCloseProfile(false)}>
                  Tiếp tục nhập
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── CUSTOM CALENDAR IN GROWTH SCREEN ── */}
        {showEddCalendar && createPortal(
          <AppDatePicker
            value={tempEdd}
            onConfirm={(dateStr) => {
              setTempEdd(dateStr);
              setShowEddCalendar(false);
            }}
            onCancel={() => setShowEddCalendar(false)}
            dateType="dueDate"
          />,
          document.body
        )}

        {showDobCalendar && createPortal(
          <AppDatePicker
            value={dob}
            onConfirm={handleDobSelect}
            onCancel={() => setShowDobCalendar(false)}
            dateType="birthDate"
          />,
          document.body
        )}

        {showBabyEditDobCalendar && createPortal(
          <AppDatePicker
            value={tempEditBabyDob || new Date().toISOString().split('T')[0]}
            onConfirm={(dateStr) => {
              setTempEditBabyDob(dateStr);
              setShowBabyEditDobCalendar(false);
            }}
            onCancel={() => setShowBabyEditDobCalendar(false)}
            dateType="birthDate"
          />,
          document.body
        )}

        {showMeasureDateCalendar && createPortal(
          <AppDatePicker
            value={measureForm.date}
            onConfirm={(dateStr) => {
              setMeasureForm(f => ({ ...f, date: dateStr }));
              setShowMeasureDateCalendar(false);
            }}
            onCancel={() => setShowMeasureDateCalendar(false)}
            dateType="measurementDate"
          />,
          document.body
        )}

        {showBirthDatePicker && createPortal(
          <AppDatePicker
            value={activeBirthDatePickerIndex === null ? birthDate : birthDates[activeBirthDatePickerIndex]}
            onConfirm={(dateStr) => {
              if (activeBirthDatePickerIndex === null) {
                setBirthDate(dateStr);
              } else {
                setBirthDates(prev => {
                  const copy = [...prev];
                  copy[activeBirthDatePickerIndex] = dateStr;
                  return copy;
                });
              }
              setShowBirthDatePicker(false);
            }}
            onCancel={() => setShowBirthDatePicker(false)}
            dateType="birthDate"
          />,
          document.body
        )}

        {/* ── CHỈNH SỬA THÔNG TIN BÉ BOTTOM SHEET ── */}
        {showEditBabyModal && createPortal(
          <div className="cs-bottom-sheet-overlay" onClick={() => setShowEditBabyModal(false)}>
            <div className="cs-bottom-sheet-box" onClick={e => e.stopPropagation()}>
              <div className="cs-bottom-sheet-handle" />
              <div className="cs-modal-header" style={{ padding: '12px 20px 16px' }}>
                <div>
                  <h3 className="cs-modal-title" style={{ fontSize: '18px', fontWeight: '800' }}>
                    Chỉnh sửa thông tin {babies.length > 1 ? (tempEditBabyName || `Bé ${String.fromCharCode(65 + currentBabyIndex)}`) : (tempEditBabyName || 'Bé')}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Cập nhật thông tin cơ bản của bé.
                  </p>
                </div>
                <button type="button" className="cs-modal-close" onClick={() => setShowEditBabyModal(false)}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSaveBabyInfo(); }} 
                className="cs-modal-body" 
                style={{ padding: '20px' }}
                onFocusCapture={(e) => {
                  const target = e.target;
                  if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                    setTimeout(() => {
                      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 250);
                  }
                }}
              >
                <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                  <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Tên / Biệt danh của bé</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="Ví dụ: Cốm, Bắp"
                    value={tempEditBabyName}
                    onChange={e => setTempEditBabyName(e.target.value)}
                    disabled={savingBabyInfo}
                  />
                </div>

                <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                  <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Ngày sinh của bé</label>
                  <button
                    type="button"
                    className="cs-date-trigger-btn"
                    onClick={() => setShowBabyEditDobCalendar(true)}
                    disabled={savingBabyInfo}
                  >
                    <CalendarIcon size={15} color="#5FAF82" />
                    <span>{fmtDisplay(tempEditBabyDob) || 'Chọn ngày sinh'}</span>
                  </button>
                </div>

                <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                  <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Giới tính</label>
                  <div className="cs-segmented-control">
                    {[
                      { value: 'girl', label: 'Bé gái', class: 'girl' },
                      { value: 'boy', label: 'Bé trai', class: 'boy' },
                      { value: 'other', label: 'Khác', class: 'other' }
                    ].map(g => (
                      <button
                        key={g.value}
                        type="button"
                        className={`cs-segment-btn ${tempEditBabyGender === g.value ? `active ${g.class}` : ''}`}
                        onClick={() => setTempEditBabyGender(g.value)}
                        disabled={savingBabyInfo}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                  <div className="cs-field-group">
                    <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Cân nặng sinh (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="cs-input"
                      placeholder="3.2"
                      value={tempEditBabyBirthWeight}
                      onChange={e => setTempEditBabyBirthWeight(e.target.value)}
                      disabled={savingBabyInfo}
                    />
                  </div>
                  <div className="cs-field-group">
                    <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Chiều dài sinh (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="cs-input"
                      placeholder="50"
                      value={tempEditBabyBirthHeight}
                      onChange={e => setTempEditBabyBirthHeight(e.target.value)}
                      disabled={savingBabyInfo}
                    />
                  </div>
                  <div className="cs-field-group">
                    <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Vòng đầu sinh (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="cs-input"
                      placeholder="34"
                      value={tempEditBabyBirthHead}
                      onChange={e => setTempEditBabyBirthHead(e.target.value)}
                      disabled={savingBabyInfo}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setShowEditBabyModal(false)}
                    disabled={savingBabyInfo}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ flex: 1, padding: '12px', margin: 0 }}
                    disabled={savingBabyInfo || !tempEditBabyName.trim()}
                  >
                    {savingBabyInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ── BIRTH CONFIRMATION BOTTOM SHEET ── */}
        {showConfirmBirthSheet && createPortal(
          <div className="cs-modal-overlay" onClick={() => setShowConfirmBirthSheet(false)}>
            <div className="cs-modal-box" style={{ maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="cs-modal-header">
                <h3 className="cs-modal-title">Chúc mừng mẹ và bé</h3>
                <button type="button" className="cs-modal-close" onClick={() => setShowConfirmBirthSheet(false)}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <form onSubmit={handleConfirmBirth} className="cs-modal-body" style={{ padding: '20px' }} onFocusCapture={(e) => {
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 250);
                }
              }}>
                <p style={{ fontSize: '13.5px', color: '#687E70', margin: '0 0 20px 0', lineHeight: '1.5', fontWeight: '500' }}>
                  Một hành trình mới bắt đầu. Chúc mẹ, bé và gia đình luôn mạnh khỏe, bình an và nhiều yêu thương.
                </p>

                {((pregnancyData?.babyCount || profile?.numBabies || 1) <= 1 || sameBirthDate) && (
                  <div className="cs-field-group" style={{ marginBottom: '16px' }}>
                    <label className="cs-label">Ngày sinh của bé</label>
                    <button
                      type="button"
                      className="cs-date-trigger-btn"
                      onClick={() => {
                        setActiveBirthDatePickerIndex(null);
                        setShowBirthDatePicker(true);
                      }}
                      disabled={savingBirth}
                    >
                      <CalendarIcon size={15} color="#5FAF82" />
                      <span>{fmtDisplay(birthDate) || 'Chọn ngày sinh'}</span>
                    </button>
                  </div>
                )}

                {(pregnancyData?.babyCount || profile?.numBabies || 1) > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <input
                      type="checkbox"
                      id="sameBirthDateCheckbox"
                      checked={sameBirthDate}
                      onChange={e => setSameBirthDate(e.target.checked)}
                      disabled={savingBirth}
                      style={{ accentColor: '#5FAF82', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="sameBirthDateCheckbox" style={{ fontSize: '13px', fontWeight: '600', color: '#2F6B4F', cursor: 'pointer' }}>
                      Các bé có cùng ngày sinh
                    </label>
                  </div>
                )}

                {Array.from({ length: pregnancyData?.babyCount || profile?.numBabies || 1 }).map((_, idx) => {
                  const label = (pregnancyData?.babyCount || profile?.numBabies || 1) > 1 ? `Bé ${String.fromCharCode(65 + idx)}` : 'Thông tin của bé';
                  return (
                    <div key={idx} style={{
                      padding: '16px',
                      backgroundColor: '#F8FAF8',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      border: '1px solid #EEF2EF'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#2F6B4F' }}>{label}</h4>
                      
                      {(pregnancyData?.babyCount || profile?.numBabies || 1) > 1 && !sameBirthDate && (
                        <div className="cs-field-group" style={{ marginBottom: '12px' }}>
                          <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Ngày sinh</label>
                          <button
                            type="button"
                            className="cs-date-trigger-btn"
                            onClick={() => {
                              setActiveBirthDatePickerIndex(idx);
                              setShowBirthDatePicker(true);
                            }}
                            disabled={savingBirth}
                          >
                            <CalendarIcon size={14} color="#5FAF82" />
                            <span>{fmtDisplay(birthDates[idx])}</span>
                          </button>
                        </div>
                      )}

                      <div className="cs-field-group" style={{ marginBottom: '12px' }}>
                        <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Tên / Biệt danh</label>
                        <input
                          type="text"
                          className="cs-input"
                          placeholder="Ví dụ: Cốm, Bơ"
                          value={birthNames[idx]}
                          onChange={e => setBirthNames(prev => {
                            const copy = [...prev];
                            copy[idx] = e.target.value;
                            return copy;
                          })}
                          disabled={savingBirth}
                        />
                      </div>

                      <div className="cs-field-group" style={{ marginBottom: '12px' }}>
                        <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Giới tính</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { value: 'girl', label: 'Bé gái' },
                            { value: 'boy', label: 'Bé trai' },
                            { value: 'other', label: 'Khác' }
                          ].map(g => (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => setBirthGenders(prev => {
                                const copy = [...prev];
                                copy[idx] = g.value;
                                return copy;
                              })}
                              disabled={savingBirth}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: birthGenders[idx] === g.value ? '1.5px solid #5FAF82' : '1px solid #EEF2EF',
                                backgroundColor: birthGenders[idx] === g.value ? '#F0F9F4' : '#FFFFFF',
                                color: birthGenders[idx] === g.value ? '#2E7D32' : '#666666',
                                fontWeight: birthGenders[idx] === g.value ? '700' : '500',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div className="cs-field-group">
                          <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Cân nặng (kg)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="cs-input"
                            placeholder="3.2"
                            value={birthWeights[idx]}
                            onChange={e => setBirthWeights(prev => {
                              const copy = [...prev];
                              copy[idx] = e.target.value;
                              return copy;
                            })}
                            disabled={savingBirth}
                          />
                        </div>
                        <div className="cs-field-group">
                          <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Chiều cao (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="cs-input"
                            placeholder="50"
                            value={birthHeights[idx]}
                            onChange={e => setBirthHeights(prev => {
                              const copy = [...prev];
                              copy[idx] = e.target.value;
                              return copy;
                            })}
                            disabled={savingBirth}
                          />
                        </div>
                        <div className="cs-field-group">
                          <label className="cs-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666' }}>Vòng đầu (cm)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="cs-input"
                            placeholder="34"
                            value={birthHeads[idx]}
                            onChange={e => setBirthHeads(prev => {
                              const copy = [...prev];
                              copy[idx] = e.target.value;
                              return copy;
                            })}
                            disabled={savingBirth}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    style={{ flex: 1 }}
                    onClick={() => setShowConfirmBirthSheet(false)}
                    disabled={savingBirth}
                  >
                    Để sau
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    style={{ flex: 1, padding: '12px' }}
                    disabled={savingBirth}
                  >
                    {savingBirth ? 'Đang lưu...' : 'Xác nhận đã sinh'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ── BIRTH SUCCESS CONFIRM MODAL ── */}
        {showBirthSuccessModal && createPortal(
          <div className="cs-modal-overlay" style={{ zIndex: 99999 }}>
            <div className="cs-confirm-box" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</div>
              <h3 className="cs-confirm-title" style={{ fontSize: '17px', color: '#2F6B4F' }}>Chào mừng bé đến với gia đình</h3>
              <p className="cs-confirm-text" style={{ fontSize: '13.5px', color: '#555555', margin: '8px 0 20px 0', lineHeight: '1.5' }}>
                Chúc mẹ, bé và gia đình luôn bình an, khỏe mạnh và tràn đầy yêu thương.
              </p>
              <div className="cs-confirm-actions">
                <button
                  type="button"
                  className="primary-btn"
                  style={{ padding: '12px' }}
                  onClick={() => {
                    setShowBirthSuccessModal(false);
                    loadData();
                  }}
                >
                  Bắt đầu theo dõi tăng trưởng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


        {/* ── CUSTOM RECALCULATION MODAL ── */}
        {showRecalcModal && createPortal(
          <div className="cs-modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowRecalcModal(false)}>
            <div className="cs-confirm-box" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
              <h3 className="cs-confirm-title">Cập nhật ngày dự sinh?</h3>
              <p className="cs-confirm-text">
                Ngày dự sinh mới có thể ảnh hưởng đến cách tính tuần thai trong các lần khám đã lưu. Mẹ muốn giữ nguyên lịch sử cũ hay tính lại tuổi thai cho các lần khám được tính từ ngày dự sinh?
              </p>
              <div className="cs-confirm-actions">
                <button
                  type="button"
                  className="cs-confirm-btn cs-confirm-btn--secondary"
                  onClick={() => handleProfileUpdate(false)}
                >
                  Giữ nguyên lịch sử
                </button>
                <button
                  type="button"
                  className="cs-confirm-btn"
                  style={{ backgroundColor: '#5FAF82', color: 'white' }}
                  onClick={() => handleProfileUpdate(true)}
                >
                  Tính lại từ ngày dự sinh mới
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── FLOATING UNDO TOAST ── */}
        <div className={`checkup-toast ${toastVisible ? 'checkup-toast--visible' : ''}`}>
          <span>{toastMsg}</span>
          {toastType === 'delete' && (
            <button type="button" className="checkup-toast-undo-btn" onClick={handleUndoDelete}>
              Hoàn tác
            </button>
          )}
        </div>

        {/* ── PARENT VIEW ── */}
        {!loading && !error && userStatus === 'parent' && babies.length > 0 && (
          <ParentView
            selectedBaby={selectedBaby}
            setSelectedBaby={setSelectedBaby}
            babies={babies}
            babyLogs={babyLogs}
            pregnancyVisits={pregnancyVisits}
            pregnancyData={pregnancyData}
            baby={baby}
            dob={dob}
            handleOpenEditBabyModal={handleOpenEditBabyModal}
            ageLabel={ageLabel}
            gender={gender}
            ageMonths={ageMonths}
            logs={logs}
            curWeight={curWeight}
            curHeight={curHeight}
            curHead={curHead}
            latestLog={latestLog}
            nutrition={nutrition}
            chartTab={chartTab}
            setChartTab={setChartTab}
            buildChartData={buildChartData}
            buildComparisonChartData={buildComparisonChartData}
            editField={editField}
            editVal={editVal}
            startEdit={startEdit}
            saveEdit={saveEdit}
            setEditField={setEditField}
            setEditVal={setEditVal}
            showMeasureForm={showMeasureForm}
            setShowMeasureForm={setShowMeasureForm}
            measureForm={measureForm}
            setMeasureForm={setMeasureForm}
            handleSaveMeasure={handleSaveMeasure}
            saving={saving}
            measureFormBabyIndex={measureFormBabyIndex}
            setMeasureFormBabyIndex={setMeasureFormBabyIndex}
            setShowMeasureDateCalendar={setShowMeasureDateCalendar}
          />
        )}

        {/* ── EMPTY STATE: parent but no baby data yet ── */}
        {!loading && !error && userStatus === 'parent' && babies.length === 0 && (
          <div className="empty-card" style={{ margin: '24px 16px' }}>
            <div className="empty-icon-wrap">
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
                stroke="#C8E8D4" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <p className="empty-title">Chưa có hồ sơ bé</p>
            <p className="empty-sub">
              Dữ liệu bé chưa được tải. Mẹ thử tải lại trang hoặc kiểm tra kết nối mạng nhé.
            </p>
            <button
              type="button"
              className="primary-btn"
              style={{ width: 'auto', padding: '11px 24px' }}
              onClick={loadData}
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SKELETON
═══════════════════════════════════════════════════════════ */
function GrowthSkeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="skel skel-card-full" />
      <div className="skel skel-card-full" style={{ height: 100 }} />
      <div className="skel skel-card-half-row">
        <div className="skel skel-card" />
        <div className="skel skel-card" />
      </div>
      <div className="skel skel-card-full skel-tall" />
      <div className="skel skel-card-full" style={{ height: 80 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPARISON TABLE COMPONENT
═══════════════════════════════════════════════════════════ */
function ComparisonTable({ current, previous }) {
  if (!current || !previous) return null;

  const metrics = [
    { name: 'Cân nặng mẹ', key: 'motherWeight', unit: 'kg' },
    { name: 'BPD (Đường kính lưỡng đỉnh)', key: 'bpd', unit: 'mm' },
    { name: 'FL (Chiều dài xương đùi)', key: 'fl', unit: 'mm' },
    { name: 'AC (Chu vi bụng)', key: 'ac', unit: 'mm' },
    { name: 'HC (Chu vi đầu)', key: 'hc', unit: 'mm' },
    { name: 'CRL (Chiều dài đầu mông)', key: 'crl', unit: 'mm' },
    { name: 'EFW (Cân nặng thai)', key: 'efw', unit: 'g' },
    { name: 'Tim thai', key: 'fetalHeartRate', unit: 'bpm' }
  ];

  const activeMetrics = metrics.filter(m => {
    const curVal = current[m.key];
    const prevVal = previous[m.key];
    return (curVal !== undefined && curVal !== null && curVal !== '') || 
           (prevVal !== undefined && prevVal !== null && prevVal !== '');
  });

  if (activeMetrics.length === 0) return null;

  const getDeltaText = (curVal, prevVal, unit) => {
    if (curVal === undefined || curVal === null || curVal === '' || prevVal === undefined || prevVal === null || prevVal === '') {
      return { text: '—', color: '#7B8A82' };
    }
    const diff = curVal - prevVal;
    if (diff > 0) {
      return { text: `+${diff.toFixed(1).replace('.0', '')} ${unit}`, color: '#2F6B4F' };
    } else if (diff < 0) {
      return { text: `${diff.toFixed(1).replace('.0', '')} ${unit}`, color: '#8C6060' };
    } else {
      return { text: `0 ${unit}`, color: '#7B8A82' };
    }
  };

  const formatValue = (val, unit) => {
    if (val === undefined || val === null || val === '') return '—';
    return `${val} ${unit}`;
  };

  return (
    <div className="growth-card comparison-card">
      <div className="card-header" style={{ marginBottom: '12px' }}>
        <span className="card-title">So sánh với lần khám trước</span>
      </div>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th align="left">Chỉ số</th>
              <th align="center">Trước ({fmtDate(previous.date)})</th>
              <th align="center">Nay ({fmtDate(current.date)})</th>
              <th align="right">Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {activeMetrics.map(m => {
              const curVal = current[m.key];
              const prevVal = previous[m.key];
              const delta = getDeltaText(curVal, prevVal, m.unit);

              return (
                <tr key={m.key}>
                  <td align="left" className="comp-metric-name">{m.name}</td>
                  <td align="center" className="comp-value">{formatValue(prevVal, m.unit)}</td>
                  <td align="center" className="comp-value">{formatValue(curVal, m.unit)}</td>
                  <td align="right" className="comp-delta" style={{ color: delta.color, fontWeight: 'bold' }}>
                    {delta.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="comparison-disclaimer">
        * Các thay đổi chỉ mang tính theo dõi tham khảo, không thay thế đánh giá của bác sĩ sản khoa.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PREGNANT VIEW
═══════════════════════════════════════════════════════════ */
/* ── Twin Helper — Extract Standardized Baby Metrics ── */
const getBabyMetrics = (log, babyKey) => {
  if (!log) return {};
  const subKey = babyKey === 'A' ? 'baby_a' : 'baby_b';
  const legacyKey = babyKey === 'A' ? 'babyA' : 'babyB';
  const metrics = log.babyMetrics?.[subKey] || log[legacyKey] || {};
  return {
    bpd: metrics.bpd !== undefined && metrics.bpd !== null ? metrics.bpd : null,
    fl: metrics.fl !== undefined && metrics.fl !== null ? metrics.fl : null,
    ac: metrics.ac !== undefined && metrics.ac !== null ? metrics.ac : null,
    hc: metrics.hc !== undefined && metrics.hc !== null ? metrics.hc : null,
    crl: metrics.crl !== undefined && metrics.crl !== null ? metrics.crl : null,
    efw: metrics.efw !== undefined && metrics.efw !== null ? metrics.efw : null,
    fetalHeartRate: metrics.fetalHeartRate !== undefined && metrics.fetalHeartRate !== null ? metrics.fetalHeartRate : null,
  };
};

/* ── TWIN COMPARISON TABLE COMPONENT ── */
function TwinComparisonTable({ logs, pregnancyData }) {
  const [compTab, setCompTab] = useState('Bé A');
  const nameA = pregnancyData?.babyName?.split('&')[0]?.trim() || 'Bé A';
  const nameB = pregnancyData?.babyName?.split('&')[1]?.trim() || 'Bé B';

  // Find 2 most recent visits with data for a specific baby
  const getTwinVisitsForBaby = (babyKey) => {
    const validVisits = logs.filter(log => {
      const b = getBabyMetrics(log, babyKey);
      return b.bpd || b.fl || b.ac || b.hc || b.crl || b.efw || b.fetalHeartRate;
    });
    return validVisits.slice(0, 2);
  };

  // Find most recent visit with data for BOTH babies
  const getVisitWithBothBabies = () => {
    return logs.find(log => {
      const bA = getBabyMetrics(log, 'A');
      const bB = getBabyMetrics(log, 'B');
      const hasA = bA.bpd || bA.fl || bA.ac || bA.hc || bA.crl || bA.efw || bA.fetalHeartRate;
      const hasB = bB.bpd || bB.fl || bB.ac || bB.hc || bB.crl || bB.efw || bB.fetalHeartRate;
      return hasA && hasB;
    });
  };

  const metrics = [
    { name: 'BPD (Đường kính lưỡng đỉnh)', key: 'bpd', unit: 'mm' },
    { name: 'FL (Chiều dài xương đùi)', key: 'fl', unit: 'mm' },
    { name: 'AC (Chu vi bụng)', key: 'ac', unit: 'mm' },
    { name: 'HC (Chu vi đầu)', key: 'hc', unit: 'mm' },
    { name: 'CRL (Chiều dài đầu mông)', key: 'crl', unit: 'mm' },
    { name: 'EFW (Cân nặng thai)', key: 'efw', unit: 'g' },
    { name: 'Tim thai', key: 'fetalHeartRate', unit: 'bpm' }
  ];

  const getDeltaText = (curVal, prevVal, unit) => {
    if (curVal === undefined || curVal === null || curVal === '' || prevVal === undefined || prevVal === null || prevVal === '') {
      return { text: '—', color: '#7B8A82' };
    }
    const diff = curVal - prevVal;
    if (diff > 0) {
      return { text: `+${diff.toFixed(1).replace('.0', '')} ${unit}`, color: '#2F6B4F' };
    } else if (diff < 0) {
      return { text: `${diff.toFixed(1).replace('.0', '')} ${unit}`, color: '#8C6060' };
    } else {
      return { text: `0 ${unit}`, color: '#7B8A82' };
    }
  };

  const formatValue = (val, unit) => {
    if (val === undefined || val === null || val === '') return '—';
    return `${val} ${unit}`;
  };

  if (compTab === 'Bé A' || compTab === 'Bé B') {
    const babyKey = compTab === 'Bé A' ? 'A' : 'B';
    const babyName = compTab === 'Bé A' ? nameA : nameB;
    const babyLogs = getTwinVisitsForBaby(babyKey);

    if (babyLogs.length < 2) {
      return (
        <div className="growth-card comparison-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F5F4', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
            {['Bé A', 'Bé B', 'So sánh hai bé'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setCompTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: compTab === tab ? '600' : '500',
                  backgroundColor: compTab === tab ? '#FFFFFF' : 'transparent',
                  color: compTab === tab ? '#2F6B4F' : '#666666',
                  boxShadow: compTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {tab === 'Bé A' ? nameA : tab === 'Bé B' ? nameB : tab}
              </button>
            ))}
          </div>
          <p style={{ margin: '12px 0', fontSize: '13px', color: '#666666' }}>
            Cần ít nhất 2 lần khám có chỉ số siêu âm của {babyName} để so sánh.
          </p>
        </div>
      );
    }

    const currentLog = babyLogs[0];
    const previousLog = babyLogs[1];
    const bCurrent = getBabyMetrics(currentLog, babyKey);
    const bPrevious = getBabyMetrics(previousLog, babyKey);

    const activeMetrics = metrics.filter(m => {
      const curVal = bCurrent[m.key];
      const prevVal = bPrevious[m.key];
      return (curVal !== undefined && curVal !== null && curVal !== '') || 
             (prevVal !== undefined && prevVal !== null && prevVal !== '');
    });

    return (
      <div className="growth-card comparison-card">
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F5F4', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
          {['Bé A', 'Bé B', 'So sánh hai bé'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setCompTab(tab)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: compTab === tab ? '600' : '500',
                backgroundColor: compTab === tab ? '#FFFFFF' : 'transparent',
                color: compTab === tab ? '#2F6B4F' : '#666666',
                boxShadow: compTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              {tab === 'Bé A' ? nameA : tab === 'Bé B' ? nameB : tab}
            </button>
          ))}
        </div>

        <div className="card-header" style={{ marginBottom: '12px' }}>
          <span className="card-title">Thay đổi chỉ số {babyName}</span>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th align="left">Chỉ số</th>
                <th align="center">Trước ({fmtDate(previousLog.date)})</th>
                <th align="center">Nay ({fmtDate(currentLog.date)})</th>
                <th align="right">Thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {activeMetrics.map(m => {
                const curVal = bCurrent[m.key];
                const prevVal = bPrevious[m.key];
                const delta = getDeltaText(curVal, prevVal, m.unit);

                return (
                  <tr key={m.key}>
                    <td align="left" className="comp-metric-name">{m.name.split(' (')[0]}</td>
                    <td align="center" className="comp-value">{formatValue(prevVal, m.unit)}</td>
                    <td align="center" className="comp-value">{formatValue(curVal, m.unit)}</td>
                    <td align="right" className="comp-delta" style={{ color: delta.color, fontWeight: 'bold' }}>
                      {delta.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="comparison-disclaimer">
          * Các thay đổi chỉ mang tính theo dõi tham khảo, không thay thế đánh giá của bác sĩ.
        </p>
      </div>
    );
  } else {
    // Tab So sánh hai bé
    const jointVisit = getVisitWithBothBabies();

    if (!jointVisit) {
      return (
        <div className="growth-card comparison-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F5F4', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
            {['Bé A', 'Bé B', 'So sánh hai bé'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setCompTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: compTab === tab ? '600' : '500',
                  backgroundColor: compTab === tab ? '#FFFFFF' : 'transparent',
                  color: compTab === tab ? '#2F6B4F' : '#666666',
                  boxShadow: compTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {tab === 'Bé A' ? nameA : tab === 'Bé B' ? nameB : tab}
              </button>
            ))}
          </div>
          <p style={{ margin: '12px 0', fontSize: '13.5px', color: '#666666', fontWeight: '500' }}>
            Chưa đủ dữ liệu để so sánh hai bé.
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888888' }}>
            Cần có ít nhất một lần khám ghi nhận đồng thời chỉ số của cả hai bé.
          </p>
        </div>
      );
    }

    const bA = getBabyMetrics(jointVisit, 'A');
    const bB = getBabyMetrics(jointVisit, 'B');

    const activeMetrics = metrics.filter(m => {
      const valA = bA[m.key];
      const valB = bB[m.key];
      return (valA !== undefined && valA !== null && valA !== '') || 
             (valB !== undefined && valB !== null && valB !== '');
    });

    const getComparisonDelta = (valA, valB, unit) => {
      if (valA === undefined || valA === null || valA === '' || valB === undefined || valB === null || valB === '') {
        return { text: '—', color: '#7B8A82' };
      }
      const diff = valA - valB;
      if (diff > 0) {
        return { text: `A lớn hơn B: +${diff.toFixed(1).replace('.0', '')} ${unit}`, color: '#2F6B4F' };
      } else if (diff < 0) {
        return { text: `B lớn hơn A: +${Math.abs(diff).toFixed(1).replace('.0', '')} ${unit}`, color: '#2F6B4F' };
      } else {
        return { text: `Bằng nhau`, color: '#7B8A82' };
      }
    };

    return (
      <div className="growth-card comparison-card">
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F5F4', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
          {['Bé A', 'Bé B', 'So sánh hai bé'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setCompTab(tab)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: compTab === tab ? '600' : '500',
                backgroundColor: compTab === tab ? '#FFFFFF' : 'transparent',
                color: compTab === tab ? '#2F6B4F' : '#666666',
                boxShadow: compTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              {tab === 'Bé A' ? nameA : tab === 'Bé B' ? nameB : tab}
            </button>
          ))}
        </div>

        <div className="card-header" style={{ marginBottom: '6px' }}>
          <span className="card-title">So sánh hai bé ({nameA} vs {nameB})</span>
        </div>
        <p style={{ fontSize: '11.5px', color: '#666666', margin: '0 0 12px 0' }}>
          Mốc so sánh: Lần khám ngày {fmtDate(jointVisit.date)} (Tuần {jointVisit.gestationalWeek})
        </p>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th align="left">Chỉ số</th>
                <th align="center">{nameA}</th>
                <th align="center">{nameB}</th>
                <th align="right">Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              {activeMetrics.map(m => {
                const valA = bA[m.key];
                const valB = bB[m.key];
                const delta = getComparisonDelta(valA, valB, m.unit);

                return (
                  <tr key={m.key}>
                    <td align="left" className="comp-metric-name">{m.name.split(' (')[0]}</td>
                    <td align="center" className="comp-value">{formatValue(valA, m.unit)}</td>
                    <td align="center" className="comp-value">{formatValue(valB, m.unit)}</td>
                    <td align="right" className="comp-delta" style={{ color: delta.color, fontWeight: '500', fontSize: '12.5px' }}>
                      {delta.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="comparison-disclaimer">
          * Thông tin so sánh chỉ mang tính chất tham khảo trực quan, không dùng làm kết luận y khoa.
        </p>
      </div>
    );
  }
}

/* ── PREGNANT VIEW ── */
function PregnantView({
  isTwin, pregnancyData, pregnancyWeek, latestMotherWeight, lastVisit, logs,
  onOpenCheckupSheet, onEditCheckup, onDeleteCheckup, onOpenEditProfile
}) {
  const [activeUltraTab, setActiveUltraTab] = useState('Tổng quan');
  const [showLineA, setShowLineA] = useState(true);
  const [showLineB, setShowLineB] = useState(true);

  const babyName = pregnancyData?.babyName;
  const edd      = pregnancyData?.edd;
  const nextAppt = lastVisit?.nextAppointment || pregnancyData?.nextAppointment;

  const nameA = babyName?.split('&')[0]?.trim() || 'Bé A';
  const nameB = babyName?.split('&')[1]?.trim() || 'Bé B';

  const weightChartData = logs
    .filter(l => l.motherWeight && (l.gestationalAgeDays != null || l.week != null))
    .map(l => {
      const ageDays = l.gestationalAgeDays != null ? l.gestationalAgeDays : (l.week * 7);
      const fracWeek = ageDays / 7;
      return {
        fracWeek,
        label: `T${Math.floor(fracWeek)}`,
        weight: parseFloat(l.motherWeight),
        tooltipLabel: l.gestationalAgeDays != null 
          ? `Tuần ${Math.floor(l.gestationalAgeDays / 7)} + ${l.gestationalAgeDays % 7} ngày` 
          : `Tuần ${l.week}`
      };
    })
    .sort((a, b) => a.fracWeek - b.fracWeek);

  const efwChartData = logs
    .filter(l => l.efw && (l.gestationalAgeDays != null || l.week != null))
    .map(l => {
      const ageDays = l.gestationalAgeDays != null ? l.gestationalAgeDays : (l.week * 7);
      const fracWeek = ageDays / 7;
      return {
        fracWeek,
        label: `T${Math.floor(fracWeek)}`,
        efw: parseFloat(l.efw),
        tooltipLabel: l.gestationalAgeDays != null 
          ? `Tuần ${Math.floor(l.gestationalAgeDays / 7)} + ${l.gestationalAgeDays % 7} ngày` 
          : `Tuần ${l.week}`
      };
    })
    .sort((a, b) => a.fracWeek - b.fracWeek);

  // Twin EFW data builder
  const twinEfwChartData = logs
    .filter(l => {
      const bA = getBabyMetrics(l, 'A');
      const bB = getBabyMetrics(l, 'B');
      return (bA.efw || bB.efw) && (l.gestationalAgeDays != null || l.week != null);
    })
    .map(l => {
      const ageDays = l.gestationalAgeDays != null ? l.gestationalAgeDays : (l.week * 7);
      const fracWeek = ageDays / 7;
      const bA = getBabyMetrics(l, 'A');
      const bB = getBabyMetrics(l, 'B');
      return {
        fracWeek,
        label: `T${Math.floor(fracWeek)}`,
        efwA: bA.efw ? parseFloat(bA.efw) : null,
        efwB: bB.efw ? parseFloat(bB.efw) : null,
        tooltipLabel: l.gestationalAgeDays != null 
          ? `Tuần ${Math.floor(l.gestationalAgeDays / 7)} + ${l.gestationalAgeDays % 7} ngày` 
          : `Tuần ${l.week}`
      };
    })
    .sort((a, b) => a.fracWeek - b.fracWeek);

  return (
    <>
      {/* ── OVERVIEW CARD ── */}
      <div className="preg-overview-card">
        <div className="preg-overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="preg-overview-icon-wrap">
              <PregnancyFetusIcon />
            </div>
            <div>
              <p className="preg-baby-name">
                {isTwin ? (babyName || 'Bé A & Bé B') : (babyName || 'Bé yêu')}
              </p>
              <div className="preg-week-badge">
                {pregnancyWeek ? `Tuần ${pregnancyWeek}${isTwin ? ' · Thai đôi' : ''}` : 'Chưa có tuần thai'}
              </div>
            </div>
          </div>
          <button type="button" className="edit-link-btn" style={{ padding: '6px 12px', border: '1px solid rgba(95, 175, 130, 0.3)', borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }} onClick={onOpenEditProfile}>
            <PencilIcon size={12} /> Chỉnh sửa
          </button>
        </div>

        <div className="preg-overview-grid">
          <div className="preg-overview-item">
            <span className="preg-ov-label">Cân nặng mẹ</span>
            <span className="preg-ov-value">
              {latestMotherWeight ? `${latestMotherWeight} kg` : 'Chưa cập nhật'}
            </span>
          </div>
          <div className="preg-overview-item">
            <span className="preg-ov-label">Ngày dự sinh</span>
            <span className="preg-ov-value">{fmtDate(edd) || 'Chưa cập nhật'}</span>
          </div>
          <div className="preg-overview-item">
            <span className="preg-ov-label">Lần khám gần nhất</span>
            <span className="preg-ov-value">{fmtDate(lastVisit?.date) || 'Chưa ghi nhận'}</span>
          </div>
          <div className="preg-overview-item">
            <span className="preg-ov-label">Hẹn khám tiếp</span>
            <span className="preg-ov-value" style={{ color: nextAppt ? '#2F6B4F' : undefined }}>
              {fmtDate(nextAppt) || 'Chưa có lịch hẹn'}
            </span>
          </div>
        </div>

        {!pregnancyData && (
          <div className="preg-hint">
            <span>Hoàn thiện thông tin thai kỳ để theo dõi chính xác hơn.</span>
          </div>
        )}

        {!edd && pregnancyData && (
          <div className="preg-hint">
            <span>Thêm ngày dự sinh để tính ngày gặp bé chính xác hơn.</span>
          </div>
        )}

        <button className="primary-btn" onClick={onOpenCheckupSheet}>
          + Ghi nhận khám thai
        </button>

        <button
          type="button"
          className="outline-btn mt-8"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid #5FAF82', color: '#2F6B4F', padding: '12px', borderRadius: '16px', background: 'transparent' }}
          onClick={() => setShowConfirmBirthSheet(true)}
        >
          Cập nhật bé đã chào đời
        </button>
      </div>

      {/* ── LATEST ULTRASOUND METRICS ── */}
      {lastVisit ? (
        <div className="growth-card">
          <div className="card-header">
            <span className="card-title">Chỉ số siêu âm gần nhất</span>
            <span className="card-badge">
              {lastVisit.gestationalWeek !== undefined && lastVisit.gestationalWeek !== null
                ? formatGestationalAge(lastVisit.gestationalWeek, lastVisit.gestationalDay)
                : lastVisit.week ? `Tuần ${lastVisit.week}` : '—'}
            </span>
          </div>

          {isTwin && (
            <div className="twin-segmented-control" style={{ display: 'flex', gap: '4px', backgroundColor: '#F4F5F4', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
              {['Tổng quan', 'Bé A', 'Bé B'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveUltraTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: activeUltraTab === tab ? '600' : '500',
                    backgroundColor: activeUltraTab === tab ? '#FFFFFF' : 'transparent',
                    color: activeUltraTab === tab ? '#2F6B4F' : '#666666',
                    boxShadow: activeUltraTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  {tab === 'Bé A' ? nameA : tab === 'Bé B' ? nameB : tab}
                </button>
              ))}
            </div>
          )}

          {isTwin ? (
            activeUltraTab === 'Tổng quan' ? (
              // Tab Tổng quan
              <div className="metrics-grid" style={{ gap: '12px' }}>
                {(() => {
                  const bA = getBabyMetrics(lastVisit, 'A');
                  const bB = getBabyMetrics(lastVisit, 'B');
                  const bpdA = bA.bpd ? `${bA.bpd} mm` : '—';
                  const efwA = bA.efw ? `${bA.efw} g` : '—';
                  const bpdB = bB.bpd ? `${bB.bpd} mm` : '—';
                  const efwB = bB.efw ? `${bB.efw} g` : '—';

                  // If no baby metrics are recorded yet for either baby
                  if (!bA.bpd && !bA.fl && !bA.efw && !bA.crl && !bA.fetalHeartRate &&
                      !bB.bpd && !bB.fl && !bB.efw && !bB.crl && !bB.fetalHeartRate) {
                    return (
                      <div style={{ width: '100%', padding: '12px 0' }}>
                        <p className="metric-empty-note" style={{ margin: 0, color: '#666666', fontSize: '13.5px' }}>
                          Lần khám gần nhất chưa có chỉ số siêu âm của từng bé.
                        </p>
                        {lastVisit.motherWeight && (
                          <p style={{ margin: '6px 0 0 0', color: '#2F6B4F', fontWeight: '500', fontSize: '13.5px' }}>
                            Đã ghi nhận cân nặng mẹ: {lastVisit.motherWeight} kg
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <div className="twin-overview-item-card" style={{ backgroundColor: '#F8FAF8', padding: '12px 14px', borderRadius: '12px', border: '1px solid #EAEAEA' }}>
                        <div style={{ fontWeight: '600', color: '#2F6B4F', marginBottom: '4px', fontSize: '14px' }}>{nameA}</div>
                        <div style={{ color: '#555555', fontSize: '13.5px' }}>
                          Cân nặng (EFW): <strong style={{ color: '#2F6B4F' }}>{efwA}</strong> · Lưỡng đỉnh (BPD): <strong>{bpdA}</strong>
                        </div>
                      </div>
                      <div className="twin-overview-item-card" style={{ backgroundColor: '#F8FAF8', padding: '12px 14px', borderRadius: '12px', border: '1px solid #EAEAEA' }}>
                        <div style={{ fontWeight: '600', color: '#2F6B4F', marginBottom: '4px', fontSize: '14px' }}>{nameB}</div>
                        <div style={{ color: '#555555', fontSize: '13.5px' }}>
                          Cân nặng (EFW): <strong style={{ color: '#2F6B4F' }}>{efwB}</strong> · Lưỡng đỉnh (BPD): <strong>{bpdB}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Tab Bé A hoặc Bé B
              <div className="metrics-grid">
                {(() => {
                  const babyKey = activeUltraTab === 'Bé A' ? 'A' : 'B';
                  const b = getBabyMetrics(lastVisit, babyKey);
                  const name = activeUltraTab === 'Bé A' ? nameA : nameB;

                  const list = [
                    { label: 'BPD (Đường kính lưỡng đỉnh)', value: b.bpd,          unit: 'mm' },
                    { label: 'FL (Chiều dài xương đùi)',    value: b.fl,           unit: 'mm' },
                    { label: 'AC (Chu vi bụng)',            value: b.ac,           unit: 'mm' },
                    { label: 'HC (Chu vi đầu)',             value: b.hc,           unit: 'mm' },
                    { label: 'CRL (Chiều dài đầu mông)',    value: b.crl,          unit: 'mm' },
                    { label: 'EFW (Cân nặng thai nhi)',     value: b.efw,          unit: 'g'  },
                    { label: 'Tim thai',                    value: b.fetalHeartRate, unit: 'bpm' },
                  ].filter(m => m.value != null && m.value !== '' && m.value !== 0);

                  if (list.length === 0) {
                    return <p className="metric-empty-note">Chưa có chỉ số siêu âm của {name} từ lần khám này.</p>;
                  }

                  return list.map(m => (
                    <div key={m.label} className="metric-chip" style={{ minWidth: 'calc(50% - 6px)' }}>
                      <span className="metric-chip-label" style={{ fontSize: '11px', color: '#666666' }}>{m.label.split(' (')[0]}</span>
                      <span className="metric-chip-value" style={{ fontSize: '14px', fontWeight: '600', color: '#2F6B4F' }}>{m.value} {m.unit}</span>
                    </div>
                  ));
                })()}
              </div>
            )
          ) : (
            // Single Baby Grid
            <div className="metrics-grid">
              {[
                { label: 'BPD',         value: lastVisit.bpd,          unit: 'mm' },
                { label: 'FL',          value: lastVisit.fl,           unit: 'mm' },
                { label: 'AC',          value: lastVisit.ac,           unit: 'mm' },
                { label: 'HC',          value: lastVisit.hc,           unit: 'mm' },
                { label: 'CRL',         value: lastVisit.crl,          unit: 'mm' },
                { label: 'EFW',         value: lastVisit.efw,          unit: 'g'  },
                { label: 'Tim thai',    value: lastVisit.fetalHeartRate, unit: 'bpm' },
              ].filter(m => m.value != null && m.value !== '' && m.value !== 0).map(m => (
                <div key={m.label} className="metric-chip">
                  <span className="metric-chip-label">{m.label}</span>
                  <span className="metric-chip-value">{m.value} {m.unit}</span>
                </div>
              ))}
              {!lastVisit.bpd && !lastVisit.fl && !lastVisit.efw && !lastVisit.crl && !lastVisit.fetalHeartRate && (
                <p className="metric-empty-note">Chưa có chỉ số siêu âm từ lần khám này.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        // Empty State
        isTwin ? (
          <div className="empty-card" style={{ padding: '24px 16px', textAlign: 'center', backgroundColor: '#F8FAF8', border: '1px dashed rgba(95, 175, 130, 0.4)', borderRadius: '16px' }}>
            <div className="empty-icon-wrap" style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#EAF5EF', borderRadius: '50%', marginBottom: '12px' }}><UltrasoundPlaceholderIcon /></div>
            <p className="empty-title" style={{ fontSize: '15.5px', fontWeight: '600', color: '#2F6B4F', margin: '0 0 4px 0' }}>Chưa có chỉ số siêu âm của từng bé</p>
            <p className="empty-sub" style={{ fontSize: '13px', color: '#666666', margin: '0 0 16px 0', lineHeight: '1.4' }}>Mẹ có thể thêm BPD, FL, AC, HC, EFW và tim thai cho Bé A/B trong lần khám tiếp theo.</p>
            <button className="primary-btn" style={{ width: 'auto', padding: '10px 20px', fontSize: '13.5px' }} onClick={onOpenCheckupSheet}>Ghi nhận khám thai</button>
          </div>
        ) : (
          <div className="empty-card">
            <div className="empty-icon-wrap"><UltrasoundPlaceholderIcon /></div>
            <p className="empty-title">Chưa có chỉ số siêu âm</p>
            <p className="empty-sub">Mẹ có thể thêm từ kết quả khám thai hoặc siêu âm.</p>
            <button className="outline-btn" onClick={onOpenCheckupSheet}>Thêm chỉ số</button>
          </div>
        )
      )}

      {/* ── COMPARISON TABLE ── */}
      {isTwin ? (
        <TwinComparisonTable logs={logs} pregnancyData={pregnancyData} />
      ) : (
        logs.length >= 2 && (
          <ComparisonTable current={logs[0]} previous={logs[1]} />
        )
      )}

      {/* ── PREGNANCY CHARTS ── */}
      {weightChartData.length >= 2 ? (
        <div className="growth-card chart-card-inner">
          <div className="card-header">
            <span className="card-title">Cân nặng mẹ theo tuần</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={weightChartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
              <XAxis 
                dataKey="fracWeek" 
                type="number"
                domain={['dataMin - 1', 'dataMax + 1']}
                tickFormatter={val => `T${Math.floor(val)}`}
                tick={{ fontSize: 11, fill: '#8C847C' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 13 }}
                labelFormatter={(value) => {
                  const item = weightChartData.find(d => d.fracWeek === value);
                  return item ? item.tooltipLabel : `Tuần ${Math.floor(value)}`;
                }}
                formatter={(v) => [`${v} kg`, 'Cân nặng mẹ']}
              />
              <Line type="monotone" dataKey="weight" stroke="#5FAF82" strokeWidth={2.5}
                dot={{ r: 5, fill: '#5FAF82', stroke: 'white', strokeWidth: 2 }}
                activeDot={{ r: 7 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : weightChartData.length === 1 ? (
        <div className="chart-empty-hint">
          <p>Thêm ít nhất 2 lần ghi nhận để xem biểu đồ cân nặng mẹ.</p>
        </div>
      ) : null}

      {isTwin ? (
        twinEfwChartData.length >= 2 && (
          <div className="growth-card chart-card-inner">
            <div className="card-header">
              <span className="card-title">Cân nặng hai bé ước tính (EFW)</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '8px 0 12px 0' }}>
              <button
                type="button"
                onClick={() => setShowLineA(!showLineA)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #E0E0E0',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: showLineA ? '#F0F9F4' : '#F9F9F9',
                  color: showLineA ? '#2F6B4F' : '#999999',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5FAF82' }} />
                {nameA} ({showLineA ? 'Đang bật' : 'Đã tắt'})
              </button>
              <button
                type="button"
                onClick={() => setShowLineB(!showLineB)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #E0E0E0',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: showLineB ? '#F0FAF5' : '#F9F9F9',
                  color: showLineB ? '#2F6B4F' : '#999999',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2F6B4F' }} />
                {nameB} ({showLineB ? 'Đang bật' : 'Đã tắt'})
              </button>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={twinEfwChartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis 
                  dataKey="fracWeek" 
                  type="number"
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={val => `T${Math.floor(val)}`}
                  tick={{ fontSize: 11, fill: '#8C847C' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 13 }}
                  labelFormatter={(value) => {
                    const item = twinEfwChartData.find(d => d.fracWeek === value);
                    return item ? item.tooltipLabel : `Tuần ${Math.floor(value)}`;
                  }}
                  formatter={(v, name) => [`${v} g`, name]}
                />
                {showLineA && (
                  <Line type="monotone" dataKey="efwA" stroke="#5FAF82" strokeWidth={2.5}
                    dot={{ r: 5, fill: '#5FAF82', stroke: 'white', strokeWidth: 2 }}
                    activeDot={{ r: 7 }} name={nameA} />
                )}
                {showLineB && (
                  <Line type="monotone" dataKey="efwB" stroke="#2F6B4F" strokeWidth={2.5}
                    dot={{ r: 5, fill: '#2F6B4F', stroke: 'white', strokeWidth: 2 }}
                    activeDot={{ r: 7 }} name={nameB} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        efwChartData.length >= 2 && (
          <div className="growth-card chart-card-inner">
            <div className="card-header">
              <span className="card-title">Cân nặng thai nhi ước tính (EFW)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={efwChartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis 
                  dataKey="fracWeek" 
                  type="number"
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={val => `T${Math.floor(val)}`}
                  tick={{ fontSize: 11, fill: '#8C847C' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 13 }}
                  labelFormatter={(value) => {
                    const item = efwChartData.find(d => d.fracWeek === value);
                    return item ? item.tooltipLabel : `Tuần ${Math.floor(value)}`;
                  }}
                  formatter={(v) => [`${v} g`, 'Cân nặng ước tính']}
                />
                <Line type="monotone" dataKey="efw" stroke="#2F6B4F" strokeWidth={2.5}
                  dot={{ r: 5, fill: '#2F6B4F', stroke: 'white', strokeWidth: 2 }}
                  activeDot={{ r: 7 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )
      )}

      {/* ── Chart empty: no data at all ── */}
      {((!isTwin && weightChartData.length === 0 && efwChartData.length === 0) || 
        (isTwin && weightChartData.length === 0 && twinEfwChartData.length === 0)) && (
        <div className="chart-empty-hint">
          <p>Chưa đủ dữ liệu để vẽ biểu đồ. Mẹ hãy thêm ít nhất 2 lần ghi nhận để xem xu hướng thai kỳ.</p>
        </div>
      )}

      {/* ── VISIT HISTORY ── */}
      <div className="section-hdr">
        <h2 className="section-title">Lịch sử khám thai</h2>
        <button className="ghost-btn" onClick={onOpenCheckupSheet}>
          <PlusIcon size={14} /> Thêm lần khám
        </button>
      </div>

      {logs.length > 0 ? (
        <div className="visit-list">
          {logs.map((v, i) => {
            const ageDisplay = v.gestationalWeek !== undefined && v.gestationalWeek !== null
              ? formatGestationalAge(v.gestationalWeek, v.gestationalDay)
              : v.week ? `Tuần ${v.week}` : null;
            
            const hasTwinRecord = v.isTwin || v.babyMetrics || v.babyA || v.babyB;

            return (
              <div key={v.id || i} className="visit-item">
                <div className="visit-item-row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="visit-date">{fmtDate(v.date) || '—'}</span>
                    {ageDisplay && <span className="visit-week-tag">{ageDisplay}</span>}
                    {isTwin && !hasTwinRecord && (
                      <span style={{ fontSize: '11px', backgroundColor: '#EBEBEB', color: '#666666', padding: '2px 8px', borderRadius: '10px', fontWeight: '500', marginLeft: '4px' }}>
                        Dữ liệu cũ · Chưa phân bé
                      </span>
                    )}
                  </div>
                  <div className="visit-actions">
                    <button type="button" className="visit-action-btn edit-btn" onClick={() => onEditCheckup(v)}>Sửa</button>
                    <button type="button" className="visit-action-btn delete-btn" onClick={() => onDeleteCheckup(v.id)}>Xóa</button>
                  </div>
                </div>

                {isTwin && hasTwinRecord ? (
                  // Detailed twin metrics row layout
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(() => {
                      const bA = getBabyMetrics(v, 'A');
                      const bB = getBabyMetrics(v, 'B');
                      const hasA = bA.bpd || bA.fl || bA.ac || bA.hc || bA.crl || bA.efw || bA.fetalHeartRate;
                      const hasB = bB.bpd || bB.fl || bB.ac || bB.hc || bB.crl || bB.efw || bB.fetalHeartRate;

                      return (
                        <>
                          {hasA && (
                            <div style={{ fontSize: '13px', color: '#555555' }}>
                              <span style={{ fontWeight: '600', color: '#2F6B4F' }}>{nameA}:</span>{' '}
                              {[
                                bA.bpd && `BPD ${bA.bpd}mm`,
                                bA.fl && `FL ${bA.fl}mm`,
                                bA.ac && `AC ${bA.ac}mm`,
                                bA.hc && `HC ${bA.hc}mm`,
                                bA.crl && `CRL ${bA.crl}mm`,
                                bA.efw && `EFW ${bA.efw}g`,
                                bA.fetalHeartRate && `Tim thai ${bA.fetalHeartRate} bpm`
                              ].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {hasB && (
                            <div style={{ fontSize: '13px', color: '#555555' }}>
                              <span style={{ fontWeight: '600', color: '#2F6B4F' }}>{nameB}:</span>{' '}
                              {[
                                bB.bpd && `BPD ${bB.bpd}mm`,
                                bB.fl && `FL ${bB.fl}mm`,
                                bB.ac && `AC ${bB.ac}mm`,
                                bB.hc && `HC ${bB.hc}mm`,
                                bB.crl && `CRL ${bB.crl}mm`,
                                bB.efw && `EFW ${bB.efw}g`,
                                bB.fetalHeartRate && `Tim thai ${bB.fetalHeartRate} bpm`
                              ].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {v.motherWeight && (
                            <div style={{ fontSize: '13px', color: '#555555' }}>
                              <span style={{ fontWeight: '600', color: '#666666' }}>Cân nặng mẹ:</span> {v.motherWeight} kg
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // Standard single or legacy root-level metrics layout
                  <div className="visit-metrics-row">
                    {v.motherWeight && <span className="visit-metric">Cân nặng mẹ: {v.motherWeight} kg</span>}
                    {v.bpd  && <span className="visit-metric">BPD: {v.bpd}mm</span>}
                    {v.fl   && <span className="visit-metric">FL: {v.fl}mm</span>}
                    {v.ac   && <span className="visit-metric">AC: {v.ac}mm</span>}
                    {v.hc   && <span className="visit-metric">HC: {v.hc}mm</span>}
                    {v.crl  && <span className="visit-metric">CRL: {v.crl}mm</span>}
                    {v.efw  && <span className="visit-metric">EFW: {v.efw}g</span>}
                    {v.fetalHeartRate && <span className="visit-metric">Tim thai: {v.fetalHeartRate} bpm</span>}
                  </div>
                )}

                {v.notes && <p className="visit-notes">{v.notes}</p>}
                {v.nextAppointment && (
                  <p className="visit-next-appt">
                    📅 Hẹn khám tiếp: {fmtDate(v.nextAppointment)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-list">
          <div className="empty-icon-wrap" style={{ marginBottom: 4 }}>
            <BabyHeartIcon size={28} />
          </div>
          <p className="empty-title">Chưa có lần khám nào</p>
          <p className="empty-list-text">Mẹ có thể thêm lần khám đầu tiên để theo dõi thai kỳ rõ hơn.</p>
          <button className="outline-btn" onClick={onOpenCheckupSheet}>
            Thêm lần khám đầu tiên
          </button>
        </div>
      )}

      {/* ── SAFETY NOTE ── */}
      <div className="who-note">
        <ShieldCheckIcon size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Thông tin chỉ mang tính tham khảo, không thay thế đánh giá của bác sĩ sản khoa.
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   PARENT VIEW
═══════════════════════════════════════════════════════════ */
function ParentView({
  selectedBaby,
  setSelectedBaby,
  babies,
  babyLogs,
  pregnancyVisits,
  pregnancyData,
  baby,
  dob,
  ageLabel,
  gender,
  ageMonths,
  logs,
  curWeight,
  curHeight,
  curHead,
  latestLog,
  nutrition,
  chartTab,
  setChartTab,
  buildChartData,
  buildComparisonChartData,
  editField,
  editVal,
  startEdit,
  saveEdit,
  setEditField,
  setEditVal,
  showMeasureForm,
  setShowMeasureForm,
  measureForm,
  setMeasureForm,
  handleSaveMeasure,
  saving,
  measureFormBabyIndex,
  setMeasureFormBabyIndex,
  setShowMeasureDateCalendar,
  handleOpenEditBabyModal
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Render collapsible pregnancy history at the bottom of the screens
  const renderPregnancyHistory = () => {
    const hasVisits = pregnancyVisits && pregnancyVisits.length > 0;
    const hasPregData = pregnancyData && (pregnancyData.edd || pregnancyData.deliveredAt);
    if (!hasVisits && !hasPregData) return null;

    const edd = pregnancyData?.edd;
    const deliveredAt = pregnancyData?.deliveredAt;
    const completedAt = pregnancyData?.completedAt;

    // Find first baby's dob as delivery reference
    const actualDelivery = deliveredAt
      || (babies.length > 0 && babies[0].dob ? babies[0].dob : null);

    return (
      <div className="pregnancy-history-card">
        {/* Pregnancy Summary Header */}
        {hasPregData && (
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 0',
            borderBottom: hasVisits ? '1px solid rgba(95,175,130,0.12)' : 'none',
            marginBottom: hasVisits ? '10px' : '0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PregnancyFetusIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E4A33', marginBottom: '6px' }}>
                Hành trình thai kỳ
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {edd && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11.5px', color: '#4F7C62', background: 'rgba(95,175,130,0.08)',
                    padding: '3px 10px', borderRadius: '20px'
                  }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Dự sinh: {fmtDate(edd)}
                  </span>
                )}
                {actualDelivery && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11.5px', color: '#2F6B4F', background: 'rgba(95,175,130,0.15)',
                    padding: '3px 10px', borderRadius: '20px', fontWeight: '700'
                  }}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Sinh ngày: {fmtDate(actualDelivery)}
                  </span>
                )}
                {hasVisits && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11.5px', color: '#666', background: '#F4F7F4',
                    padding: '3px 10px', borderRadius: '20px'
                  }}>
                    {pregnancyVisits.length} lần khám thai
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {hasVisits && (
          <>
            <button
              type="button"
              className="history-toggle-header"
              onClick={() => setHistoryExpanded(!historyExpanded)}
            >
              <div className="history-toggle-title">
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#2F6B4F' }}>
                  {historyExpanded ? 'Ẩn lịch sử khám' : 'Xem chi tiết lịch khám'}
                </span>
              </div>
              <div className={`history-toggle-icon ${historyExpanded ? 'expanded' : ''}`}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {historyExpanded && (
              <div className="history-content">
                <div className="visit-list" style={{ marginTop: '10px' }}>
                  {pregnancyVisits.map((v, idx) => (
                    <div key={v.id || idx} className="visit-item">
                      <div className="visit-item-row" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="visit-date">{fmtDate(v.date)}</span>
                          {v.week && (
                            <span className="visit-week-tag">Tuần {v.week}</span>
                          )}
                        </div>
                        {v.motherWeight && (
                          <span className="visit-metric" style={{ fontSize: '11.5px', fontWeight: 700 }}>
                            Cân nặng mẹ: {v.motherWeight} kg
                          </span>
                        )}
                      </div>

                      <div className="visit-metrics-row">
                        {v.bp && <span className="visit-metric">Huyết áp: {v.bp}</span>}
                        {v.bpd && <span className="visit-metric">BPD: {v.bpd} mm</span>}
                        {v.fl && <span className="visit-metric">FL: {v.fl} mm</span>}
                        {v.efw && <span className="visit-metric">EFW: {v.efw} g</span>}
                        {v.lh && <span className="visit-metric">Lượng ối: {v.lh}</span>}
                      </div>

                      {v.notes && (
                        <p className="visit-notes" style={{ fontSize: '12.5px', margin: '4px 0 0' }}>{v.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderMeasureForm = () => {
    return (
      <div className="form-card">
        <div className="form-card-header">
          <span className="form-card-title">Thêm lần đo</span>
          <button type="button" className="form-close-btn" onClick={() => setShowMeasureForm(false)}>
            <CloseIcon />
          </button>
        </div>

        {babies.length > 1 && (
          <div className="form-group form-group-full">
            <label>Chọn bé</label>
            <select
              value={measureFormBabyIndex}
              onChange={e => setMeasureFormBabyIndex(parseInt(e.target.value))}
              className="cs-select"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '2px solid var(--cream-dark)',
                background: 'var(--surface-1)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                fontWeight: 600,
                outline: 'none',
                color: 'var(--text-primary)'
              }}
              disabled={typeof selectedBaby === 'number'}
            >
              {babies.map((b, idx) => (
                <option key={idx} value={idx}>
                  {b.name || `Bé ${String.fromCharCode(65 + idx)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-group">
            <label><CalendarIcon size={13} /> Ngày đo</label>
            <button
              type="button"
              className="cs-date-trigger-btn"
              style={{ padding: '11px 14px', borderRadius: '12px' }}
              onClick={() => setShowMeasureDateCalendar(true)}
            >
              {fmtDisplay(measureForm.date) || 'Chọn ngày'}
            </button>
          </div>
          <div className="form-group">
            <label><WeightIcon size={13} /> Cân nặng (kg)</label>
            <input type="number" step="0.01" placeholder="8.5"
              value={measureForm.weight}
              onChange={e => setMeasureForm(f => ({ ...f, weight: e.target.value }))} />
          </div>
          <div className="form-group">
            <label><RulerIcon size={13} /> Chiều cao (cm)</label>
            <input type="number" step="0.1" placeholder="72.5"
              value={measureForm.height}
              onChange={e => setMeasureForm(f => ({ ...f, height: e.target.value }))} />
          </div>
          <div className="form-group">
            <label><HeadCircleIcon size={13} /> Chu vi đầu (cm)</label>
            <input type="number" step="0.1" placeholder="44.0"
              value={measureForm.head}
              onChange={e => setMeasureForm(f => ({ ...f, head: e.target.value }))} />
          </div>
          <div className="form-group form-group-full" style={{ gridColumn: 'span 2' }}>
            <label>Ghi chú</label>
            <input type="text" placeholder="Ví dụ: Bé khỏe mạnh, mọc răng..."
              value={measureForm.note || ''}
              onChange={e => setMeasureForm(f => ({ ...f, note: e.target.value }))}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: '2px solid var(--cream-dark)',
                background: 'var(--surface-1)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '15px',
                outline: 'none',
                color: 'var(--text-primary)'
              }} />
          </div>
        </div>
        <button 
          type="button"
          className="primary-btn" 
          disabled={saving} 
          onClick={handleSaveMeasure}
        >
          {saving ? 'Đang lưu...' : 'Lưu lần đo'}
        </button>
      </div>
    );
  };

  // 1. OVERVIEW VIEW
  if (selectedBaby === 'overview') {
    return (
      <>
        <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: babies.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '14px' }}>
          {babies.map((b, idx) => {
            const bId = b.id || b.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${idx}`;
            const bLogs = babyLogs[bId] || [];
            const bLatest = bLogs[bLogs.length - 1];
            const bWeight = parseFloat(bLatest?.weight || 0);
            const bHeight = parseFloat(bLatest?.height || 0);
            const bHead = parseFloat(bLatest?.head || 0);
            const bDob = b.dob || '';
            const bAgeMonths = getAgeInMonths(bDob);
            const bAgeLabel = !bDob ? '—' : formatFriendlyAge(bAgeMonths);
            const bNutrition = assessNutrition(bWeight, bAgeMonths, b.gender || 'girl');

            return (
              <div key={bId} className="growth-card baby-overview-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`baby-avatar-circle ${b.gender || 'girl'}`} style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: b.gender === 'boy' ? 'rgba(95, 175, 130, 0.15)' : 'rgba(212, 232, 220, 0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', fontWeight: 'bold', color: '#2F6B4F'
                    }}>
                      {b.name ? b.name.trim().charAt(0).toUpperCase() : 'B'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{b.name || 'Bé yêu'}</h3>
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {b.gender === 'boy' ? 'Bé trai' : 'Bé gái'} · {bAgeLabel}
                      </p>
                    </div>
                  </div>
                  <button type="button" className="ghost-btn" style={{ padding: '6px 12px' }} onClick={() => setSelectedBaby(idx)}>
                    Xem chi tiết
                  </button>
                </div>

                <div className="latest-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div className="latest-metric" style={{ padding: '10px 6px', background: 'var(--surface-1)', borderRadius: '12px' }}>
                    <div className="latest-metric-icon weight-icon" style={{ width: '28px', height: '28px', borderRadius: '8px', margin: '0 auto 4px' }}><WeightIcon size={14} /></div>
                    <span className="latest-metric-value" style={{ fontSize: '14px' }}>{bWeight > 0 ? `${bWeight} kg` : '—'}</span>
                    <span className="latest-metric-label" style={{ fontSize: '9.5px' }}>Cân nặng</span>
                  </div>
                  <div className="latest-metric" style={{ padding: '10px 6px', background: 'var(--surface-1)', borderRadius: '12px' }}>
                    <div className="latest-metric-icon height-icon" style={{ width: '28px', height: '28px', borderRadius: '8px', margin: '0 auto 4px' }}><RulerIcon size={14} /></div>
                    <span className="latest-metric-value" style={{ fontSize: '14px' }}>{bHeight > 0 ? `${bHeight} cm` : '—'}</span>
                    <span className="latest-metric-label" style={{ fontSize: '9.5px' }}>Chiều cao</span>
                  </div>
                  <div className="latest-metric" style={{ padding: '10px 6px', background: 'var(--surface-1)', borderRadius: '12px' }}>
                    <div className="latest-metric-icon head-icon" style={{ width: '28px', height: '28px', borderRadius: '8px', margin: '0 auto 4px' }}><HeadCircleIcon size={14} /></div>
                    <span className="latest-metric-value" style={{ fontSize: '14px' }}>{bHead > 0 ? `${bHead} cm` : '—'}</span>
                    <span className="latest-metric-label" style={{ fontSize: '9.5px' }}>Chu vi đầu</span>
                  </div>
                </div>

                {bNutrition && bWeight > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(95,175,130,0.06)', padding: '8px 12px', borderRadius: '10px', fontSize: '11.5px', color: '#2F6B4F', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: bNutrition.color }} />
                    Tình trạng: <span style={{ color: bNutrition.color }}>{bNutrition.label}</span>
                  </div>
                )}

                <button type="button" className="outline-btn" style={{ width: '100%', padding: '10px' }} onClick={() => {
                  setMeasureFormBabyIndex(idx);
                  setShowMeasureForm(true);
                }}>
                  + Thêm số đo mới
                </button>
              </div>
            );
          })}
        </div>

        {showMeasureForm && renderMeasureForm()}
        {renderPregnancyHistory()}
      </>
    );
  }

  // 2. COMPARISON VIEW
  if (selectedBaby === 'compare') {
    const compColors = ['#5FAF82', '#2F6B4F', '#A8C5B0'];
    const compChartData = buildComparisonChartData(chartTab);
    const hasAnyActual = compChartData.some(d => babies.some((_, i) => d[`actual_${i}`] != null));
    const hasWHO = compChartData.some(d => d.lower != null && d.band != null);

    // Get latest log for each baby
    const latestLogs = babies.map((b, idx) => {
      const bId = b.id || b.name?.toLowerCase().replace(/\s+/g, '-') || `baby-${idx}`;
      const bLogs = babyLogs[bId] || [];
      return bLogs[bLogs.length - 1] || null;
    });

    const hasAll = latestLogs.every(l => l !== null);
    const dates = latestLogs.map(l => l ? new Date(l.date) : null);

    const isClose = (() => {
      if (!hasAll) return false;
      const timeValues = dates.map(d => d.getTime());
      const minTime = Math.min(...timeValues);
      const maxTime = Math.max(...timeValues);
      const diffDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);
      return diffDays <= 14;
    })();

    const dateStrings = latestLogs.map(l => l ? fmtDate(l.date) : '—');
    const allDatesSame = dateStrings.every((d, i, arr) => d === arr[0]);

    const getTwinCompareDelta = (valA, valB, unit) => {
      const a = parseFloat(valA);
      const b = parseFloat(valB);
      if (isNaN(a) || isNaN(b)) return '—';
      const diff = a - b;
      const nameA = babies[0]?.name || 'Bé A';
      const nameB = babies[1]?.name || 'Bé B';
      if (diff > 0) return `${nameA} lớn hơn ${nameB}: +${diff.toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
      if (diff < 0) return `${nameB} lớn hơn ${nameA}: +${Math.abs(diff).toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
      return 'Bằng nhau';
    };

    const getTripletCompareDelta = (valA, valB, valC, unit) => {
      const a = parseFloat(valA);
      const b = parseFloat(valB);
      const c = parseFloat(valC);
      if (isNaN(a) || isNaN(b) || isNaN(c)) return '—';
      const vals = [a, b, c];
      const maxVal = Math.max(...vals);
      const minVal = Math.min(...vals);
      const diff = maxVal - minVal;
      if (diff === 0) return 'Bằng nhau';
      return `Chênh lệch tối đa: ${diff.toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
    };

    const getCompareDelta = (idx, unit) => {
      const vals = latestLogs.map(l => l ? (idx === 0 ? l.weight : idx === 1 ? l.height : l.head) : null);
      if (babies.length === 2) {
        return getTwinCompareDelta(vals[0], vals[1], unit);
      } else if (babies.length === 3) {
        return getTripletCompareDelta(vals[0], vals[1], vals[2], unit);
      }
      return '—';
    };

    return (
      <>
        {/* Comparison Table */}
        <div className="growth-card comparison-card">
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <span className="card-title">Bảng so sánh đối chiếu các bé</span>
          </div>

          {!isClose ? (
            <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F8FAF8', borderRadius: '16px', border: '1px dashed rgba(95, 175, 130, 0.3)' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '700', color: '#2F6B4F' }}>
                Chưa đủ dữ liệu để so sánh các bé
              </p>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#666666', lineHeight: '1.4' }}>
                Mẹ cần thêm số đo cho từng bé với các ngày đo gần nhau (trong vòng 14 ngày) để tiến hành đối chiếu chỉ số tăng trưởng.
              </p>
              <div style={{ textAlign: 'left', display: 'inline-block', fontSize: '12.5px', color: '#555' }}>
                {babies.map((b, idx) => (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    · <strong>{b.name || `Bé ${String.fromCharCode(65 + idx)}`}</strong>: {dateStrings[idx] ? `Đo ngày ${dateStrings[idx]}` : 'Chưa có số đo'}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {!allDatesSame && (
                <div style={{ backgroundColor: '#F8FAF8', padding: '10px 12px', borderRadius: '12px', border: '1px solid #EEF2EF', marginBottom: '12px', fontSize: '12px', color: '#4F7C62', lineHeight: '1.4' }}>
                  💡 Ngày đo của các bé chênh lệch không quá 14 ngày:
                  <div style={{ marginTop: '4px', paddingLeft: '8px' }}>
                    {babies.map((b, idx) => (
                      <div key={idx}>· {b.name || `Bé ${String.fromCharCode(65 + idx)}`}: {dateStrings[idx]}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th align="left">Chỉ số</th>
                      {babies.map((b, idx) => (
                        <th key={idx} align="center">{b.name || `Bé ${String.fromCharCode(65 + idx)}`}</th>
                      ))}
                      <th align="right">Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td align="left" className="comp-metric-name">Ngày sinh</td>
                      {babies.map((b, idx) => (
                        <td key={idx} align="center" className="comp-value">{fmtDate(b.dob) || '—'}</td>
                      ))}
                      <td align="right" className="comp-delta">—</td>
                    </tr>
                    {!allDatesSame && (
                      <tr>
                        <td align="left" className="comp-metric-name">Ngày đo</td>
                        {babies.map((b, idx) => {
                          const log = latestLogs[idx];
                          return <td key={idx} align="center" className="comp-value">{log ? fmtDate(log.date) : '—'}</td>;
                        })}
                        <td align="right" className="comp-delta">—</td>
                      </tr>
                    )}
                    <tr>
                      <td align="left" className="comp-metric-name">Tuổi đo</td>
                      {babies.map((b, idx) => {
                        const log = latestLogs[idx];
                        if (!log || !b.dob) return <td key={idx} align="center" className="comp-value">—</td>;
                        const ageM = Math.round((new Date(log.date) - new Date(b.dob)) / (1000 * 60 * 60 * 24 * 30.4375));
                        const ageLbl = formatFriendlyAge(ageM);
                        return <td key={idx} align="center" className="comp-value">{ageLbl}</td>;
                      })}
                      <td align="right" className="comp-delta">—</td>
                    </tr>
                    <tr>
                      <td align="left" className="comp-metric-name">Cân nặng</td>
                      {babies.map((b, idx) => {
                        const log = latestLogs[idx];
                        return <td key={idx} align="center" className="comp-value" style={{ fontWeight: 'bold' }}>
                          {log?.weight ? `${log.weight} kg` : '—'}
                        </td>;
                      })}
                      <td align="right" className="comp-delta" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {getCompareDelta(0, 'kg')}
                      </td>
                    </tr>
                    <tr>
                      <td align="left" className="comp-metric-name">Chiều cao</td>
                      {babies.map((b, idx) => {
                        const log = latestLogs[idx];
                        return <td key={idx} align="center" className="comp-value" style={{ fontWeight: 'bold' }}>
                          {log?.height ? `${log.height} cm` : '—'}
                        </td>;
                      })}
                      <td align="right" className="comp-delta" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {getCompareDelta(1, 'cm')}
                      </td>
                    </tr>
                    <tr>
                      <td align="left" className="comp-metric-name">Chu vi đầu</td>
                      {babies.map((b, idx) => {
                        const log = latestLogs[idx];
                        return <td key={idx} align="center" className="comp-value" style={{ fontWeight: 'bold' }}>
                          {log?.head ? `${log.head} cm` : '—'}
                        </td>;
                      })}
                      <td align="right" className="comp-delta" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {getCompareDelta(2, 'cm')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Comparison Chart */}
        <div className="growth-card">
          <div className="card-header">
            <span className="card-title">Biểu đồ so sánh tăng trưởng</span>
          </div>
          <div className="chart-tabs">
            {['weight', 'height', 'head'].map(tab => (
              <button
                key={tab}
                type="button"
                className={`chart-tab-btn ${chartTab === tab ? 'active' : ''}`}
                onClick={() => setChartTab(tab)}
              >
                {tab === 'weight' ? 'Cân nặng' : tab === 'height' ? 'Chiều cao' : 'Chu vi đầu'}
              </button>
            ))}
          </div>

          <div className="chart-legend-row" style={{ flexWrap: 'wrap', gap: '10px 14px', marginBottom: '14px' }}>
            {babies.map((b, i) => (
              <span key={i} className="chart-legend-item">
                <span className="legend-dot" style={{ background: compColors[i % compColors.length] }} />
                {b.name || `Bé ${String.fromCharCode(65 + i)}`}
              </span>
            ))}
            {hasWHO && (
              <span className="chart-legend-item">
                <span className="legend-band" />
                Vùng tham khảo WHO
              </span>
            )}
          </div>

          {hasAnyActual ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={compChartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 13 }}
                    formatter={(v, name) => {
                      if (name === 'band' || name === 'lower') return null;
                      const unit = chartTab === 'weight' ? 'kg' : 'cm';
                      return [`${v} ${unit}`, name];
                    }}
                  />
                  {hasWHO && (
                    <>
                      <Area type="monotone" dataKey="lower" stackId="who"
                        fill="rgba(240,236,230,0.6)" stroke="rgba(200,210,200,0.4)" strokeWidth={1}
                        dot={false} name="lower" />
                      <Area type="monotone" dataKey="band" stackId="who"
                        fill="rgba(95,175,130,0.12)" stroke="rgba(95,175,130,0.3)" strokeWidth={1}
                        dot={false} name="band" />
                    </>
                  )}
                  {babies.map((b, i) => {
                    const key = `actual_${i}`;
                    const color = compColors[i % compColors.length];
                    const bName = b.name || `Bé ${String.fromCharCode(65 + i)}`;
                    return (
                      <Line type="monotone" key={i} dataKey={key} stroke={color}
                        strokeWidth={2.5}
                        dot={({ cx, cy, payload }) =>
                          payload[key] != null ? (
                            <g key={`dot-${cx}-${i}`}>
                              <circle cx={cx} cy={cy} r={4.5} fill={color}
                                stroke="white" strokeWidth={1.5} />
                            </g>
                          ) : <g key={`dot-${cx}-${i}`} />
                        }
                        activeDot={{ r: 6 }}
                        name={bName}
                        connectNulls={true}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
              <p className="who-chart-note">
                Biểu đồ so sánh dựa theo <strong>Chuẩn tăng trưởng WHO 2006</strong>.
              </p>
            </>
          ) : (
            <div className="chart-empty-state">
              <GrowthChartEmptyIcon />
              <p className="empty-title">Chưa có dữ liệu vẽ biểu đồ</p>
              <p className="empty-sub">Hãy thêm ít nhất một chỉ số cho các bé để bắt đầu so sánh.</p>
            </div>
          )}
        </div>

        {renderPregnancyHistory()}
      </>
    );
  }

  // 3. SINGLE BABY VIEW (selectedBaby is index 0, 1, 2...)
  const hasData      = logs.length > 0;
  const hasChartData = logs.length >= 2 && dob;
  const chartData    = hasChartData ? buildChartData(chartTab) : [];
  const hasActual    = chartData.some(d => d.actual != null);
  const hasWHO       = chartData.some(d => d.lower != null && d.band != null);
  const chartColors  = { weight: '#5FAF82', height: '#2F6B4F', head: '#A8C5B0' };

  const renderBabyGrowthComparison = () => {
    if (logs.length < 2) {
      return (
        <div className="growth-card comparison-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div className="card-header" style={{ marginBottom: '8px' }}>
            <span className="card-title">So sánh với lần đo trước</span>
          </div>
          <p style={{ margin: '12px 0', fontSize: '13.5px', color: '#666666', fontWeight: '600' }}>
            Chưa đủ dữ liệu để so sánh
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888888', lineHeight: '1.4' }}>
            Mẹ cần ít nhất 2 lần đo để xem sự thay đổi.
          </p>
        </div>
      );
    }

    const prev = logs[logs.length - 2];
    const curr = logs[logs.length - 1];

    const getDiffLabel = (currVal, prevVal, unit) => {
      const c = parseFloat(currVal);
      const p = parseFloat(prevVal);
      if (isNaN(c) || isNaN(p)) return '—';
      const diff = c - p;
      if (diff > 0) return `+${diff.toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
      if (diff < 0) return `${diff.toFixed(2).replace(/\.?0+$/, '')} ${unit}`;
      return 'Không thay đổi';
    };

    const formatVal = (val, unit) => {
      const v = parseFloat(val);
      return isNaN(v) ? '—' : `${v} ${unit}`;
    };

    return (
      <div className="growth-card comparison-card">
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <span className="card-title">So sánh với lần đo trước</span>
        </div>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th align="left">Chỉ số</th>
                <th align="center">Lần trước ({fmtDate(prev.date)})</th>
                <th align="center">Mới nhất ({fmtDate(curr.date)})</th>
                <th align="right">Thay đổi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td align="left" className="comp-metric-name">Cân nặng</td>
                <td align="center" className="comp-value">{formatVal(prev.weight, 'kg')}</td>
                <td align="center" className="comp-value">{formatVal(curr.weight, 'kg')}</td>
                <td align="right" className="comp-delta" style={{ fontWeight: '600', color: '#2F6B4F' }}>
                  {getDiffLabel(curr.weight, prev.weight, 'kg')}
                </td>
              </tr>
              <tr>
                <td align="left" className="comp-metric-name">Chiều cao</td>
                <td align="center" className="comp-value">{formatVal(prev.height, 'cm')}</td>
                <td align="center" className="comp-value">{formatVal(curr.height, 'cm')}</td>
                <td align="right" className="comp-delta" style={{ fontWeight: '600', color: '#2F6B4F' }}>
                  {getDiffLabel(curr.height, prev.height, 'cm')}
                </td>
              </tr>
              <tr>
                <td align="left" className="comp-metric-name">Chu vi đầu</td>
                <td align="center" className="comp-value">{formatVal(prev.head, 'cm')}</td>
                <td align="center" className="comp-value">{formatVal(curr.head, 'cm')}</td>
                <td align="right" className="comp-delta" style={{ fontWeight: '600', color: '#2F6B4F' }}>
                  {getDiffLabel(curr.head, prev.head, 'cm')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── BABY INFO CARD (Profile Summary Card) ── */}
      <div className="baby-profile-summary-card" style={{ marginBottom: '14px' }}>
        <div className="baby-profile-left">
          <div className="baby-profile-avatar">
            {gender === 'boy' ? '👦🏻' : gender === 'girl' ? '👧🏻' : '👶🏻'}
          </div>
          <div>
            <h3 className="baby-profile-name">{baby.name || 'Cốm'}</h3>
            <p className="baby-profile-subtitle">
              {dob ? ageLabel : 'Chưa cập nhật ngày sinh'} · {gender === 'boy' ? 'Bé trai' : gender === 'girl' ? 'Bé gái' : 'Chưa xác định giới tính'}
            </p>
            {dob && <p className="baby-profile-dob">Sinh ngày {fmtDate(dob)}</p>}
          </div>
        </div>
        <button
          type="button"
          className="baby-profile-edit-btn"
          onClick={handleOpenEditBabyModal}
          title="Chỉnh sửa thông tin bé"
        >
          <PencilIcon size={12} /> Chỉnh sửa
        </button>
      </div>

      {!dob && (
        <div style={{
          margin: '0 0 14px 0',
          padding: '12px 14px',
          backgroundColor: 'rgba(95, 175, 130, 0.06)',
          borderRadius: '12px',
          border: '1.5px dashed rgba(95, 175, 130, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5FAF82" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <span style={{ fontSize: '13px', color: '#2F6B4F', fontWeight: '600', lineHeight: '1.4' }}>
              Thêm ngày sinh để tính tuổi & biểu đồ tăng trưởng chính xác
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenEditBabyModal}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: '10px',
              border: '1.5px solid #5FAF82',
              background: '#F0F9F4',
              color: '#2F6B4F',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Thêm
          </button>
        </div>
      )}

      {/* ── BIRTH MEASUREMENTS CARD ── */}
      {dob && (
        <div className="growth-card birth-metrics-card" style={{ padding: '14px 16px', marginTop: '-6px', marginBottom: '14px', backgroundColor: '#F8FAF8', border: '1px solid #EEF2EF', borderRadius: '16px' }}>
          <div className="card-header" style={{ marginBottom: '8px' }}>
            <span className="card-title" style={{ fontSize: '13.5px', color: '#2F6B4F', fontWeight: '700' }}>Số đo lúc sinh</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(!baby.birthWeight || !baby.birthHeight || !baby.birthHeadCircumference) && (
                <button 
                  type="button" 
                  className="edit-link-btn" 
                  style={{ padding: '2px 6px', color: '#5FAF82', fontSize: '11px', opacity: 0.9, background: 'rgba(95,175,130,0.08)', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                  onClick={handleOpenEditBabyModal}
                >
                  + Bổ sung
                </button>
              )}
              <span className="card-date" style={{ fontSize: '11.5px', color: '#666666' }}>{fmtDate(dob)}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', textAlign: 'center' }}>
            {baby.birthWeight && (
              <div className="birth-metric-box">
                <div style={{ fontSize: '11px', color: '#888' }}>Cân nặng</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginTop: '2px' }}>
                  {baby.birthWeight} kg
                </div>
              </div>
            )}
            {baby.birthHeight && (
              <div className="birth-metric-box">
                <div style={{ fontSize: '11px', color: '#888' }}>Chiều dài</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginTop: '2px' }}>
                  {baby.birthHeight} cm
                </div>
              </div>
            )}
            {baby.birthHeadCircumference && (
              <div className="birth-metric-box">
                <div style={{ fontSize: '11px', color: '#888' }}>Chu vi đầu</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', marginTop: '2px' }}>
                  {baby.birthHeadCircumference} cm
                </div>
              </div>
            )}
            {!baby.birthWeight && !baby.birthHeight && !baby.birthHeadCircumference && (
              <div style={{ gridColumn: '1 / -1', padding: '8px 0', fontSize: '12.5px', color: '#888', fontStyle: 'italic' }}>
                Chưa cập nhật số đo lúc sinh
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LATEST MEASUREMENTS ── */}
      {hasData ? (
        <div className="growth-card">
          <div className="card-header">
            <span className="card-title">Chỉ số gần nhất</span>
            {latestLog?.date && <span className="card-date">{fmtDate(latestLog.date)}</span>}
          </div>
          <div className="latest-metrics-grid">
            <div className="latest-metric">
              <div className="latest-metric-icon weight-icon"><WeightIcon size={18} /></div>
              <span className="latest-metric-value">{curWeight > 0 ? `${curWeight} kg` : '—'}</span>
              <span className="latest-metric-label">Cân nặng</span>
              {nutrition && curWeight > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', background: 'rgba(95,175,130,0.06)', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${nutrition.color}1E` }}>
                  <span className="nutrition-tag" style={{ color: nutrition.color, fontSize: '10.5px', fontWeight: '700', margin: 0 }}>
                    {nutrition.label}
                  </span>
                  <span 
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '12px', height: '12px', borderRadius: '50%', 
                      background: 'rgba(0,0,0,0.04)', color: '#666', fontSize: '8px', 
                      cursor: 'pointer', fontWeight: 'bold', flexShrink: 0
                    }}
                    title={`${nutrition.detail}\nKhoảng tham khảo an toàn: ${nutrition.sd}`}
                  >
                    i
                  </span>
                </div>
              )}
            </div>
            <div className="latest-metric">
              <div className="latest-metric-icon height-icon"><RulerIcon size={18} /></div>
              <span className="latest-metric-value">{curHeight > 0 ? `${curHeight} cm` : '—'}</span>
              <span className="latest-metric-label">Chiều cao</span>
            </div>
            <div className="latest-metric">
              <div className="latest-metric-icon head-icon"><HeadCircleIcon size={18} /></div>
              <span className="latest-metric-value">{curHead > 0 ? `${curHead} cm` : '—'}</span>
              <span className="latest-metric-label">Chu vi đầu</span>
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#8c9c90', fontStyle: 'italic', margin: '10px 4px 4px', textAlign: 'center', lineHeight: '1.4' }}>
            * Thông tin chỉ mang tính theo dõi tham khảo, không thay thế đánh giá của bác sĩ.
          </p>

          <button type="button" className="primary-btn mt-8" onClick={() => {
            setMeasureFormBabyIndex(selectedBaby);
            setShowMeasureForm(v => !v);
          }}>
            {showMeasureForm ? 'Đóng' : '+ Thêm lần đo'}
          </button>
        </div>
      ) : (
        <div className="empty-card">
          <div className="empty-icon-wrap"><GrowthPlaceholderIcon /></div>
          <p className="empty-title">Chưa có số đo của bé</p>
          <p className="empty-sub">Thêm cân nặng, chiều cao và chu vi đầu để theo dõi sự phát triển của bé.</p>
          <button type="button" className="primary-btn" style={{ width: 'auto', padding: '11px 24px' }} onClick={() => {
            setMeasureFormBabyIndex(selectedBaby);
            setShowMeasureForm(true);
          }}>
            Thêm lần đo đầu tiên
          </button>
        </div>
      )}

      {/* ── MEASURE FORM ── */}
      {showMeasureForm && renderMeasureForm()}

      {/* ── COMPARISON WITH PREVIOUS MEASUREMENT ── */}
      {renderBabyGrowthComparison()}

      {/* ── TABBED GROWTH CHART ── */}
      <div className="growth-card">
        <div className="card-header">
          <span className="card-title">Biểu đồ tăng trưởng</span>
        </div>
        <div className="chart-tabs">
          {['weight', 'height', 'head'].map(tab => (
            <button
              key={tab}
              type="button"
              className={`chart-tab-btn ${chartTab === tab ? 'active' : ''}`}
              onClick={() => setChartTab(tab)}
            >
              {tab === 'weight' ? 'Cân nặng' : tab === 'height' ? 'Chiều cao' : 'Chu vi đầu'}
            </button>
          ))}
        </div>

        {hasChartData ? (
          <>
            {hasActual && (
              <div className="chart-legend-row">
                <span className="chart-legend-item">
                  <span className="legend-dot" style={{ background: chartColors[chartTab] }} />
                  Chỉ số của bé
                </span>
                {hasWHO && (
                  <span className="chart-legend-item">
                    <span className="legend-band" />
                    Vùng tham khảo WHO
                  </span>
                )}
              </div>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip chartTab={chartTab} />} />
                {hasWHO && (
                  <>
                    <Area type="monotone" dataKey="lower" stackId="who"
                      fill="rgba(240,236,230,0.6)" stroke="rgba(200,210,200,0.4)" strokeWidth={1}
                      dot={false} name="lower" />
                    <Area type="monotone" dataKey="band" stackId="who"
                      fill="rgba(95,175,130,0.12)" stroke="rgba(95,175,130,0.3)" strokeWidth={1}
                      dot={false} name="band" />
                  </>
                )}
                {hasActual && (
                  <Line type="monotone" dataKey="actual" stroke={chartColors[chartTab]}
                    strokeWidth={2.5}
                    dot={({ cx, cy, payload }) =>
                      payload.actual != null ? (
                        <g key={`dot-${cx}`}>
                          <circle cx={cx} cy={cy} r={5} fill={chartColors[chartTab]}
                            stroke="white" strokeWidth={2} />
                        </g>
                      ) : <g key={`dot-${cx}`} />
                    }
                    activeDot={{ r: 7 }}
                    name="actual"
                    connectNulls={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            {!hasActual && (
              <div className="chart-no-actual">
                <p>Chưa có dữ liệu của bé trên biểu đồ.</p>
                <p>Vùng xanh là tham khảo WHO — thêm số đo để hiển thị chỉ số bé.</p>
              </div>
            )}
            <p className="who-chart-note">
              Biểu đồ theo <strong>Chuẩn tăng trưởng WHO 2006</strong> — áp dụng tại Việt Nam.
            </p>
            {gender === 'other' && (
              <div className="who-disclaimer-card" style={{ marginTop: '10px' }}>
                <p className="who-disclaimer-text">
                  Vùng tham khảo WHO cần thông tin giới tính để hiển thị chính xác.
                </p>
                <button
                  type="button"
                  className="who-disclaimer-btn"
                  onClick={handleOpenEditBabyModal}
                >
                  Cập nhật giới tính
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="chart-empty-state">
            <GrowthChartEmptyIcon />
            <p className="empty-title">Chưa đủ dữ liệu để vẽ biểu đồ</p>
            <p className="empty-sub">
              {!dob
                ? 'Thêm ngày sinh và ít nhất 2 lần đo để xem xu hướng tăng trưởng.'
                : 'Thêm ít nhất 2 lần đo để xem xu hướng tăng trưởng.'}
            </p>
          </div>
        )}
      </div>

      {/* ── MEASUREMENT HISTORY ── */}
      <div className="section-hdr">
        <h2 className="section-title">Lịch sử đo lường</h2>
        <button type="button" className="ghost-btn" onClick={() => {
          setMeasureFormBabyIndex(selectedBaby);
          setShowMeasureForm(v => !v);
        }}>
          <PlusIcon size={14} /> Thêm lần đo
        </button>
      </div>

      {logs.length > 0 ? (
        <div className="measure-list">
          {[...logs].reverse().map((l, i) => {
            const logAge = dob ? (() => {
              if (l.date === dob || l.note === 'Chỉ số lúc sinh') return 'Lúc sinh';
              const months = Math.round(
                (new Date(l.date) - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.4375)
              );
              return formatFriendlyAge(months);
            })() : null;
            return (
              <div key={l.id || i} className="measure-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="measure-item-left">
                    <span className="measure-date">{fmtDate(l.date) || '—'}</span>
                    {logAge && <span className="measure-age">{logAge}</span>}
                  </div>
                  <div className="measure-item-right">
                    {l.weight && <span className="measure-val">{l.weight} kg</span>}
                    {l.height && <span className="measure-val">{l.height} cm</span>}
                    {l.head   && <span className="measure-val head-val">{l.head} cm đầu</span>}
                  </div>
                </div>
                {l.note && (
                  <div className="measure-item-note" style={{ fontSize: '12.5px', color: '#687E70', fontStyle: 'italic', marginTop: '-2px', paddingLeft: '2px' }}>
                    📝 {l.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-list">
          <p className="empty-list-text">Chưa có lần đo nào.</p>
          <button type="button" className="outline-btn" onClick={() => {
            setMeasureFormBabyIndex(selectedBaby);
            setShowMeasureForm(true);
          }}>
            Thêm lần đo đầu tiên
          </button>
        </div>
      )}

      {renderPregnancyHistory()}
    </>
  );
}

/* ── Inline SVG Placeholders ── */
function PregnancyFetusIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
      stroke="#5FAF82" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2.5" />
      <path d="M8 9c-1 0-1.5 1-1.5 2.5 0 4 2 7.5 5.5 7.5s5.5-3.5 5.5-7.5C17.5 10 17 9 16 9" />
      <path d="M10.5 14.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5" strokeWidth={1.4} />
    </svg>
  );
}

function UltrasoundPlaceholderIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
      stroke="#C8E8D4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function GrowthPlaceholderIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none"
      stroke="#C8E8D4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function GrowthChartEmptyIcon() {
  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
      stroke="#D4E8DC" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <line x1="6" y1="17" x2="6" y2="12" />
      <line x1="12" y1="17" x2="12" y2="8" />
      <line x1="18" y1="17" x2="18" y2="5" />
    </svg>
  );
}
