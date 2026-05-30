/**
 * MomentsScreen.jsx — Nhật ký khoảnh khắc cá nhân hoá theo trạng thái mẹ
 * - Pregnant (1 bé / đôi / ba) → nhật ký thai kỳ
 * - Parent (1 bé / nhiều bé)   → nhật ký kỷ niệm của bé
 * Lưu: Cloudinary (media) + Firestore (metadata)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  collection, addDoc, getDocs, query,
  orderBy, serverTimestamp, where,
  doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import AppDatePicker from '../components/AppDatePicker.jsx';
import './MomentsScreen.css';
import { getCurrentPregnancyWeek } from '../utils/pregnancyWeek.js';


/* ─── Cloudinary config ─── */
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* ─── SVG icons (line, no emoji) ─── */
const IconCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);
const IconScan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1.4"/>
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconLeaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);
const IconMessage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconMilestone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17l4-8 4 5 3-3 4 6"/>
    <circle cx="19" cy="7" r="2"/>
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
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

/* ─── Cloudinary upload ─── */
async function uploadToCloudinary(file, folder, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error('Upload thất bại'));
    xhr.send(fd);
  });
}

/* ─── Helpers ─── */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Format YYYY-MM-DD → DD/MM/YYYY for display */
const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
};

const safeStr  = (v) => (v && v !== 'undefined' && v !== 'null' ? String(v) : '');
const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


/* ─── Filter definitions ─── */
const FILTERS_PREGNANT = [
  { key: '',          label: 'Tất cả' },
  { key: 'ultrasound',label: 'Siêu âm' },
  { key: 'checkup',   label: 'Khám thai' },
  { key: 'belly',     label: 'Bụng bầu' },
  { key: 'movement',  label: 'Thai máy' },
  { key: 'emotion',   label: 'Cảm xúc' },
  { key: 'education', label: 'Thai giáo' },
  { key: 'letter',    label: 'Lời nhắn' },
];
const FILTERS_PARENT = [
  { key: '',          label: 'Tất cả' },
  { key: 'photo',     label: 'Ảnh' },
  { key: 'milestone', label: 'Cột mốc' },
  { key: 'note',      label: 'Ghi chú' },
  { key: 'montessori',label: 'Montessori' },
  { key: 'birthday',  label: 'Sinh nhật' },
  { key: 'activity',  label: 'Vui chơi' },
];

/* ─── Bottom sheet options ─── */
const SHEET_OPTIONS_PREGNANT = [
  { type: 'ultrasound', label: 'Ảnh siêu âm',      desc: 'Lưu lại hình ảnh của bé trong bụng mẹ', Icon: IconScan },
  { type: 'belly',      label: 'Ảnh bụng bầu',     desc: 'Ghi lại sự thay đổi của mẹ theo từng tuần', Icon: IconCamera },
  { type: 'milestone',  label: 'Cột mốc thai kỳ',  desc: 'Ví dụ: thai máy đầu tiên, lần khám đáng nhớ', Icon: IconMilestone },
  { type: 'emotion',    label: 'Cảm xúc của mẹ',   desc: 'Lưu lại cảm xúc trong hành trình mang thai', Icon: IconHeart },
  { type: 'education',  label: 'Thai giáo Montessori', desc: 'Ghi lại hoạt động kết nối cùng bé', Icon: IconLeaf },
  { type: 'letter',     label: 'Lời nhắn cho bé',  desc: 'Viết vài dòng gửi tới bé yêu', Icon: IconMessage },
];
const SHEET_OPTIONS_PARENT = [
  { type: 'photo',      label: 'Ảnh / Video',       desc: 'Lưu lại hình ảnh và video của bé', Icon: IconCamera },
  { type: 'milestone',  label: 'Cột mốc',           desc: 'Ghi lại những bước phát triển đặc biệt', Icon: IconMilestone },
  { type: 'emotion',    label: 'Ghi chú cảm xúc',  desc: 'Lưu lại cảm xúc của mẹ và bé', Icon: IconHeart },
  { type: 'montessori', label: 'Hoạt động Montessori', desc: 'Ghi lại hoạt động học hỏi của bé', Icon: IconLeaf },
];

/* ─── Type → tag mapping ─── */
const TYPE_TAG_MAP = {
  ultrasound: 'ultrasound', belly: 'belly', milestone: 'milestone',
  emotion: 'emotion', education: 'education', letter: 'emotion',
  photo: 'photo', montessori: 'montessori', note: 'note',
};

/* ─── Type → readable label ─── */
const TYPE_LABEL = {
  ultrasound: 'Ảnh siêu âm', belly: 'Ảnh bụng bầu', milestone: 'Cột mốc thai kỳ',
  emotion: 'Cảm xúc', education: 'Thai giáo Montessori', letter: 'Lời nhắn',
  photo: 'Ảnh / Video', montessori: 'Hoạt động Montessori', note: 'Ghi chú',
};

/* ─── Icon by type ─── */
const TypeIcon = ({ type }) => {
  const map = {
    ultrasound: IconScan, belly: IconCamera, milestone: IconMilestone,
    emotion: IconHeart, education: IconLeaf, letter: IconMessage,
    photo: IconImage, montessori: IconLeaf, note: IconNote, checkup: IconCalendar,
    movement: IconStar,
  };
  const Comp = map[type] || IconCamera;
  return <Comp />;
};

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function MomentsScreen({ profile }) {
  const userId       = profile?.user?.uid;
  const status       = profile?.status || 'pregnant'; // 'pregnant' | 'parent'
  const isPregnant   = status === 'pregnant';

  /* ─── Resolve babies / fetuses ─── */
  // Only use babies that belong to current user's active context
  const rawBabies   = [...(profile?.babies || [])].sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0));
  const pregnancyId = safeStr(profile?.pregnancyId || profile?.currentPregnancyId || profile?.pregnancyInfo?.id);
  // pregnancyInfo is stored in profile as { weeks, days, dueDate } from onboarding
  const currentWeek = isPregnant ? (getCurrentPregnancyWeek(profile, null) || '') : '';

  // For pregnant: fetuses come from the babies array (childKey = 'baby-a', 'baby-b', 'baby-c')
  // Each baby doc has: childKey, name, childOrder
  const fetuses = isPregnant
    ? rawBabies
        .filter(b => b && safeStr(b.childKey))
        .map(b => ({ key: safeStr(b.childKey), name: safeStr(b.name) }))
    : [];

  // For parent: use sorted babies list
  const babies = isPregnant ? [] : rawBabies;
  // Show selector when there are multiple subjects (twins/triplets or multiple children)
  const needsSubjectSelector = isPregnant
    ? fetuses.length > 1
    : babies.length > 1;

  // All-label adapts to context
  const allLabel = isPregnant
    ? (fetuses.length === 2 ? 'Cả hai bé' : fetuses.length > 2 ? 'Tất cả các bé' : 'Tất cả')
    : (babies.length > 1 ? 'Tất cả' : 'Tất cả');

  /* ─── Derive subject options ─── */
  const subjectOptions = isPregnant
    ? [
        { id: 'all', label: allLabel },
        ...fetuses.map(f => ({ id: f.key, label: f.name || f.key })),
      ]
    : [
        { id: 'all', label: allLabel },
        ...babies.map((b, i) => ({ id: b.id || `baby-${i}`, label: b.name || `Bé ${String.fromCharCode(65 + i)}` })),
      ];

  /* ─── Header text ─── */
  const headerTitle = isPregnant
    ? 'Khoảnh khắc thai kỳ'
    : babies.length > 1
      ? 'Khoảnh khắc của các bé'
      : `Khoảnh khắc của ${safeStr(babies[0]?.name) || 'bé yêu'}`;

  const buildSubtitle = () => {
    if (isPregnant) {
      if (fetuses.length === 2) {
        return 'Lưu lại hành trình của mẹ và 2 bé';
      }
      if (fetuses.length > 2) {
        return 'Lưu lại hành trình của mẹ và các bé';
      }
      const name = safeStr(fetuses[0]?.name);
      return `Lưu lại hành trình của mẹ và ${name || 'bé yêu'}`;
    }
    if (babies.length > 1) return 'Lưu lại kỷ niệm của từng bé';
    return 'Lưu lại những điều đáng nhớ của bé';
  };
  const headerSubtitle = buildSubtitle();

  /* ─── Empty state description ─── */
  const emptyDesc = isPregnant
    ? fetuses.length >= 2
      ? `Mẹ có thể lưu ảnh siêu âm, cảm nhận thai máy hoặc một lời nhắn gửi tới ${fetuses.map(f => f.name).filter(Boolean).join(' và ') || 'các bé'}.`
      : 'Mẹ có thể lưu ảnh siêu âm, cảm nhận thai máy hoặc một lời nhắn gửi tới bé.'
    : 'Mẹ có thể lưu lại nụ cười, cột mốc hoặc một điều đáng nhớ của bé hôm nay.';

  /* ─── State ─── */
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterTag, setFilterTag]             = useState('');
  const [moments, setMoments]                 = useState([]);
  const [loadState, setLoadState]             = useState('loading'); // 'loading' | 'done' | 'error'
  const [showSheet, setShowSheet]             = useState(false);
  const [activeForm, setActiveForm]           = useState(null); // form type string
  // sheetSubject: subject pre-selected in sheet step 1 ("Dành cho ai?")
  const [sheetSubject, setSheetSubject]       = useState('all');
  // sheetStep: 'subject' (only for multi-baby) | 'type' | 'form'
  const [sheetStep, setSheetStep]             = useState('type');
  const [saving, setSaving]                   = useState(false);
  const [saveError, setSaveError]             = useState('');
  const [uploadProgress, setUploadProgress]   = useState(0);
  const sheetRef = useRef();

  /* ─── Nâng cấp UI/UX state ─── */
  const [activeImageViewer, setActiveImageViewer]   = useState(null); // { moment, index }
  const [activeMomentDetail, setActiveMomentDetail] = useState(null); // moment
  const [deleteConfirmMoment, setDeleteConfirmMoment] = useState(null); // moment
  const [deleting, setDeleting]                       = useState(false);
  const [editingMoment, setEditingMoment]             = useState(null); // moment
  const [toast, setToast]                             = useState(''); // toast message text

  /* ─── Filters by status ─── */
  const filters = isPregnant ? FILTERS_PREGNANT : FILTERS_PARENT;

  /* ─── Load moments ─── */
  const loadMoments = useCallback(async () => {
    if (!userId) return;
    setLoadState('loading');
    try {
      const colRef = collection(db, 'users', userId, 'moments');
      const q = isPregnant && pregnancyId
        ? query(colRef, where('pregnancyId', '==', pregnancyId), orderBy('happenedAt', 'desc'))
        : query(colRef, where('statusContext', '==', 'parent'), orderBy('happenedAt', 'desc'));
      const snap = await getDocs(q);
      setMoments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadState('done');
    } catch {
      // Fallback without where clause if index not ready
      try {
        const snap = await getDocs(query(collection(db, 'users', userId, 'moments'), orderBy('createdAt', 'desc')));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMoments(all.filter(m => isPregnant
          ? m.statusContext === 'pregnant' && (!pregnancyId || m.pregnancyId === pregnancyId)
          : m.statusContext === 'parent'
        ));
        setLoadState('done');
      } catch {
        setLoadState('error');
      }
    }
  }, [userId, isPregnant, pregnancyId]);

  useEffect(() => { loadMoments(); }, [loadMoments]);

  /* ─── Filter displayed moments ─── */
  const filteredMoments = moments.filter(m => {
    const tagMatch = !filterTag || m.tags?.includes(filterTag) || m.type === filterTag;
    const subjectMatch = selectedSubject === 'all' || (() => {
      if (isPregnant) return m.fetusKey === selectedSubject || m.fetusKeys?.includes(selectedSubject);
      return m.childId === selectedSubject || m.childIds?.includes(selectedSubject);
    })();
    return tagMatch && subjectMatch;
  });

  /* ─── Open sheet ─── */
  const openSheet = () => {
    // If multi-baby, start at 'subject' step; otherwise go straight to 'type'
    setSheetStep(needsSubjectSelector ? 'subject' : 'type');
    setSheetSubject('all');
    setActiveForm(null);
    setSaveError('');
    setShowSheet(true);
  };

  /* ─── Close sheet on backdrop ─── */
  const closeSheet = () => {
    setShowSheet(false);
    setActiveForm(null);
    setSheetStep('type');
    setSheetSubject('all');
    setEditingMoment(null);
    setSaveError('');
  };

  /* ─── Save moment ─── */
  const saveMoment = async (data) => {
    if (!userId) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        userId,
        statusContext: isPregnant ? 'pregnant' : 'parent',
        pregnancyId:   isPregnant ? (pregnancyId || null) : null,
        childId:       !isPregnant && data.subjectId && data.subjectId !== 'all' ? data.subjectId : null,
        childIds:      !isPregnant && data.subjectId === 'all' ? babies.map(b => b.id) : null,
        fetusKey:      isPregnant && data.subjectId && data.subjectId !== 'all' ? data.subjectId : null,
        fetusKeys:     isPregnant && data.subjectId === 'all' ? fetuses.map(f => f.key) : null,
        type:          data.type || '',
        title:         safeStr(data.title),
        note:          safeStr(data.note),
        mediaUrls:     data.mediaUrls || [],
        tags:          [TYPE_TAG_MAP[data.type] || data.type].filter(Boolean),
        pregnancyWeek: isPregnant ? (data.week || safeStr(currentWeek)) : null,
        happenedAt:    data.happenedAt ? new Date(data.happenedAt) : new Date(),
        updatedAt:     serverTimestamp(),
      };

      if (editingMoment) {
        // Edit Mode
        await updateDoc(doc(db, 'users', userId, 'moments', editingMoment.id), payload);
        setMoments(prev => prev.map(m => m.id === editingMoment.id ? { ...m, ...payload, happenedAt: payload.happenedAt } : m));
        setToast('Đã cập nhật khoảnh khắc');
      } else {
        // Create Mode
        const payloadWithCreated = {
          ...payload,
          createdAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, 'users', userId, 'moments'), payloadWithCreated);
        setMoments(prev => [{ id: ref.id, ...payloadWithCreated, happenedAt: payloadWithCreated.happenedAt, createdAt: new Date() }, ...prev]);
        setToast('Đã lưu khoảnh khắc');
      }
      closeSheet();
    } catch (e) {
      setSaveError('Chưa thể lưu khoảnh khắc. Mẹ thử lại sau một chút nhé.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete moment ─── */
  const deleteMoment = async (moment) => {
    if (!userId || !moment?.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', userId, 'moments', moment.id));
      setMoments(prev => prev.filter(m => m.id !== moment.id));
      setToast('Đã xóa khoảnh khắc');
      setDeleteConfirmMoment(null);
      setActiveMomentDetail(null);
    } catch (e) {
      setToast('Chưa thể xóa khoảnh khắc. Mẹ thử lại sau một chút nhé.');
    } finally {
      setDeleting(false);
    }
  };


  /* ─── Moment card label ─── */
  const momentSubjectLabel = (m) => {
    if (isPregnant) {
      if (m.fetusKeys && m.fetusKeys.length > 1) {
        const names = m.fetusKeys.map(k => fetuses.find(f => f.key === k)?.name || k).filter(Boolean);
        return names.join(' và ') || 'Cả hai bé';
      }
      if (m.fetusKey) return fetuses.find(f => f.key === m.fetusKey)?.name || m.fetusKey;
      return '';
    }
    if (m.childIds && m.childIds.length > 1) {
      return babies.length > 1 ? 'Tất cả các bé' : '';
    }
    if (m.childId) {
      const b = babies.find(b => b.id === m.childId);
      return safeStr(b?.name);
    }
    return '';
  };

  return (
    <div className="ms-screen">
      {/* ── Header ── */}
      <header className="ms-header">
        <div className="ms-header-text">
          <h1 className="ms-title">{headerTitle}</h1>
          <p className="ms-subtitle">{headerSubtitle}</p>
        </div>
        <button
          className="ms-add-btn"
          onClick={openSheet}
          aria-label="Lưu khoảnh khắc"
        >
          <span className="ms-add-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
          Lưu khoảnh khắc
        </button>
      </header>

      {/* Baby / Fetus Selector removed per user request */}

      {/* ── Filter bar ── */}
      <div className="ms-filter-wrap">
        <div className="ms-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`ms-filter-pill${filterTag === f.key ? ' active' : ''}`}
              onClick={() => setFilterTag(f.key)}
            >
              {f.label}
              {f.key && filteredMoments.filter(m => m.tags?.includes(f.key) || m.type === f.key).length > 0 && (
                <span className="ms-filter-count">
                  {filteredMoments.filter(m => m.tags?.includes(f.key) || m.type === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="ms-content">
        {loadState === 'loading' && <SkeletonList />}

        {loadState === 'error' && (
          <div className="ms-error-state">
            <div className="ms-error-icon"><IconCamera /></div>
            <p className="ms-error-title">Chưa thể tải khoảnh khắc</p>
            <p className="ms-error-desc">Mẹ thử lại sau một chút nhé.</p>
            <button className="ms-retry-btn" onClick={loadMoments}>Thử lại</button>
          </div>
        )}

        {loadState === 'done' && filteredMoments.length === 0 && (
          <EmptyState
            isPregnant={isPregnant}
            description={emptyDesc}
            onAdd={openSheet}
          />
        )}

        {loadState === 'done' && filteredMoments.length > 0 && (
          <div className="ms-timeline">
            {filteredMoments.map((m, i) => (
              <MomentCard
                key={m.id}
                moment={m}
                subjectLabel={momentSubjectLabel(m)}
                isPregnant={isPregnant}
                style={{ animationDelay: `${i * 40}ms` }}
                onCardClick={(mom) => setActiveMomentDetail(mom)}
                onThumbClick={(mom, idx) => setActiveImageViewer({ moment: mom, index: idx })}
              />
            ))}
            <div className="ms-privacy-note">
              <span className="ms-privacy-icon"><IconLock /></span>
              Khoảnh khắc được lưu riêng tư trong hồ sơ của mẹ và bé.
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Sheet ── */}
      {showSheet && (
        <BottomSheet
          ref={sheetRef}
          isPregnant={isPregnant}
          activeForm={activeForm}
          setActiveForm={setActiveForm}
          sheetStep={sheetStep}
          setSheetStep={setSheetStep}
          sheetSubject={sheetSubject}
          setSheetSubject={setSheetSubject}
          onClose={closeSheet}
          onSave={saveMoment}
          saving={saving}
          saveError={saveError}
          setSaveError={setSaveError}
          needsSubjectSelector={needsSubjectSelector}
          subjectOptions={subjectOptions}
          currentWeek={safeStr(currentWeek)}
          uploadProgress={uploadProgress}
          setUploadProgress={setUploadProgress}
          userId={userId}
          pregnancyId={pregnancyId}
          editingMoment={editingMoment}
        />
      )}

      {/* ── ImageViewer Modal ── */}
      {activeImageViewer && (
        <ImageViewer
          moment={activeImageViewer.moment}
          initialIndex={activeImageViewer.index}
          onClose={() => setActiveImageViewer(null)}
          onOpenDetail={(mom) => {
            setActiveImageViewer(null);
            setActiveMomentDetail(mom);
          }}
        />
      )}

      {/* ── MomentDetail Modal ── */}
      {activeMomentDetail && (
        <MomentDetail
          moment={activeMomentDetail}
          subjectLabel={momentSubjectLabel(activeMomentDetail)}
          isPregnant={isPregnant}
          onClose={() => setActiveMomentDetail(null)}
          onEdit={(m) => {
            setEditingMoment(m);
            setActiveForm(m.type);
            setSheetSubject(m.fetusKey || m.childId || 'all');
            setSheetStep('form');
            setShowSheet(true);
            setActiveMomentDetail(null);
          }}
          onDelete={(m) => setDeleteConfirmMoment(m)}
        />
      )}

      {/* ── iOS Confirm Modal ── */}
      {deleteConfirmMoment && (
        <IOSConfirmModal
          title="Xóa khoảnh khắc này?"
          description="Ảnh và ghi chú sẽ bị xóa khỏi nhật ký của mẹ."
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          processing={deleting}
          onConfirm={() => deleteMoment(deleteConfirmMoment)}
          onCancel={() => setDeleteConfirmMoment(null)}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast('')}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   SKELETON LOADING
   ════════════════════════════════════════ */
function SkeletonList() {
  return (
    <div className="ms-skeleton-list">
      {[0, 1, 2].map(i => (
        <div key={i} className="ms-skeleton-card" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="ms-skeleton-icon" />
          <div className="ms-skeleton-body">
            <div className="ms-skeleton-line wide" />
            <div className="ms-skeleton-line" />
            <div className="ms-skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   EMPTY STATE
   ════════════════════════════════════════ */
function EmptyState({ isPregnant, description, onAdd }) {
  return (
    <div className="ms-empty">
      <div className="ms-empty-icon">{isPregnant ? <IconScan /> : <IconCamera />}</div>
      <h3 className="ms-empty-title">Chưa có khoảnh khắc nào</h3>
      <p className="ms-empty-desc">{description}</p>
      <button className="ms-empty-btn" onClick={onAdd}>
        + Lưu khoảnh khắc đầu tiên
      </button>
      <p className="ms-privacy-note-empty">
        <span className="ms-privacy-icon"><IconLock /></span>
        Khoảnh khắc được lưu riêng tư trong hồ sơ của mẹ và bé.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════
   MOMENT CARD (timeline item)
   ════════════════════════════════════════ */
function MomentCard({ moment: m, subjectLabel, isPregnant, style, onCardClick, onThumbClick }) {
  const typeLabel = TYPE_LABEL[m.type] || m.type || 'Khoảnh khắc';
  const weekLabel = isPregnant && m.pregnancyWeek ? ` · Tuần ${m.pregnancyWeek}` : '';
  const hasImage  = m.mediaUrls && m.mediaUrls.length > 0;
  return (
    <div className="ms-card" style={style} onClick={() => onCardClick?.(m)}>
      <div className="ms-card-icon-wrap">
        <TypeIcon type={m.type} />
      </div>
      <div className="ms-card-body">
        <div className="ms-card-meta">
          <span className="ms-card-type">{typeLabel}{weekLabel}</span>
          {subjectLabel && <span className="ms-card-subject">{subjectLabel}</span>}
        </div>
        {safeStr(m.title) && <p className="ms-card-title">{m.title}</p>}
        {safeStr(m.note)  && <p className="ms-card-note">{m.note}</p>}
        {hasImage && (
          <div 
            className="ms-card-thumb-wrap"
            onClick={(e) => {
              e.stopPropagation();
              onThumbClick?.(m, 0);
            }}
          >
            <img src={m.mediaUrls[0]} alt={m.title || typeLabel} className="ms-card-thumb" loading="lazy" />
            {m.mediaUrls.length > 1 && (
              <span className="ms-card-thumb-count">+{m.mediaUrls.length - 1}</span>
            )}
          </div>
        )}
        <span className="ms-card-date">
          <span className="ms-card-date-icon"><IconCalendar /></span>
          {formatDate(m.happenedAt || m.createdAt) || '—'}
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   BOTTOM SHEET
   ════════════════════════════════════════ */
const BottomSheet = ({
  isPregnant, activeForm, setActiveForm,
  sheetStep, setSheetStep, sheetSubject, setSheetSubject,
  onClose, onSave, saving, saveError, setSaveError,
  needsSubjectSelector, subjectOptions, currentWeek,
  uploadProgress, setUploadProgress, userId, pregnancyId,
  editingMoment
}) => {
  const options = isPregnant ? SHEET_OPTIONS_PREGNANT : SHEET_OPTIONS_PARENT;
  const overlayRef = useRef();

  const onOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  // Step: subject → type → form (back navigation)
  const goBack = () => {
    if (sheetStep === 'form') {
      if (editingMoment) {
        // If editing, clicking back should close the sheet entirely
        onClose();
      } else {
        setActiveForm(null);
        setSheetStep('type');
        setSaveError('');
      }
    } else if (sheetStep === 'type' && needsSubjectSelector) {
      setSheetStep('subject');
    } else {
      onClose();
    }
  };

  return (
    <div className="ms-sheet-overlay" ref={overlayRef} onClick={onOverlayClick}>
      <div className="ms-sheet" role="dialog" aria-modal="true">
        <div className="ms-sheet-drag-handle" />

        {/* ── STEP 1: Dành cho ai? (only for multi-baby) ── */}
        {sheetStep === 'subject' && (
          <>
            <div className="ms-sheet-header">
              <h2 className="ms-sheet-title">Khoảnh khắc này dành cho ai?</h2>
              <p className="ms-sheet-subtitle">Mẹ có thể chọn từng bé hoặc cả hai</p>
            </div>
            <div className="ms-sheet-subject-list">
              {subjectOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`ms-sheet-subject-btn${sheetSubject === opt.id ? ' active' : ''}`}
                  onClick={() => setSheetSubject(opt.id)}
                >
                  <span className="ms-sheet-subject-dot" />
                  <span className="ms-sheet-subject-label">{opt.label}</span>
                  {sheetSubject === opt.id && (
                    <span className="ms-sheet-subject-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="ms-sheet-subject-footer">
              <button className="ms-sheet-cancel" onClick={onClose}>Huỷ</button>
              <button
                className="ms-sheet-next-btn"
                onClick={() => setSheetStep('type')}
              >
                Tiếp theo
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Chọn loại khoảnh khắc ── */}
        {sheetStep === 'type' && (
          <>
            <div className="ms-sheet-header">
              {needsSubjectSelector && (
                <div className="ms-sheet-subject-badge">
                  <span className="ms-sheet-subject-badge-dot" />
                  {subjectOptions.find(o => o.id === sheetSubject)?.label || 'Tất cả'}
                </div>
              )}
              <h2 className="ms-sheet-title">
                {isPregnant ? 'Lưu khoảnh khắc thai kỳ' : 'Lưu khoảnh khắc'}
              </h2>
              <p className="ms-sheet-subtitle">Mẹ muốn lưu điều gì hôm nay?</p>
            </div>
            <div className="ms-sheet-options">
              {options.map(opt => (
                <button
                  key={opt.type}
                  className="ms-sheet-option"
                  onClick={() => {
                    setSaveError('');
                    setActiveForm(opt.type);
                    setSheetStep('form');
                  }}
                >
                  <span className="ms-sheet-option-icon"><opt.Icon /></span>
                  <div className="ms-sheet-option-text">
                    <span className="ms-sheet-option-label">{opt.label}</span>
                    <span className="ms-sheet-option-desc">{opt.desc}</span>
                  </div>
                  <span className="ms-sheet-option-chevron"><IconChevronRight /></span>
                </button>
              ))}
            </div>
            <button className="ms-sheet-cancel" onClick={onClose}>Huỷ</button>
          </>
        )}

        {/* ── STEP 3: Form nhập liệu ── */}
        {sheetStep === 'form' && activeForm && (
          <MomentForm
            type={activeForm}
            isPregnant={isPregnant}
            needsSubjectSelector={needsSubjectSelector}
            subjectOptions={subjectOptions}
            initialSubjectId={sheetSubject}
            currentWeek={currentWeek}
            onSave={onSave}
            onBack={goBack}
            saving={saving}
            saveError={saveError}
            uploadProgress={uploadProgress}
            setUploadProgress={setUploadProgress}
            userId={userId}
            pregnancyId={pregnancyId}
            editingMoment={editingMoment}
          />
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   MOMENT FORM
   ════════════════════════════════════════ */
function MomentForm({
  type, isPregnant, needsSubjectSelector, subjectOptions,
  initialSubjectId,
  currentWeek, onSave, onBack, saving, saveError,
  uploadProgress, setUploadProgress, userId, pregnancyId,
  editingMoment
}) {
  // Pre-populate from sheet step 1 selection or editingMoment
  const [subjectId, setSubjectId]   = useState(() => {
    if (editingMoment) {
      return editingMoment.fetusKey || editingMoment.childId || (editingMoment.fetusKeys?.length > 1 || editingMoment.childIds?.length > 1 ? 'all' : '');
    }
    return initialSubjectId || 'all';
  });
  const [title, setTitle]           = useState(() => {
    if (editingMoment) return editingMoment.title || '';
    return '';
  });
  const [note, setNote]             = useState(() => {
    if (editingMoment && editingMoment.note) {
      // Extract the raw note without chips
      const parts = editingMoment.note.split(/ · | — /);
      const actualNoteParts = parts.filter(p => 
        !['Thai máy đầu tiên','Lần khám đáng nhớ','Biết giới tính bé','Chuẩn bị đồ cho bé','Vào tam cá nguyệt mới','Tùy chỉnh',
         'Bình yên','Hạnh phúc','Hồi hộp','Lo lắng','Tự hào','Mệt nhưng thương con',
         '5 phút','10 phút','15 phút','20 phút'].includes(p)
      );
      return actualNoteParts.join(' ');
    }
    return '';
  });
  const [week, setWeek]             = useState(() => {
    if (editingMoment) return editingMoment.pregnancyWeek || '';
    return currentWeek || '';
  });
  const [happenedAt, setHappenedAt] = useState(() => {
    if (editingMoment && editingMoment.happenedAt) {
      const d = editingMoment.happenedAt.toDate ? editingMoment.happenedAt.toDate() : new Date(editingMoment.happenedAt);
      if (!isNaN(d)) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return today();
  });
  const [selectedChips, setSelectedChips] = useState(() => {
    if (editingMoment && editingMoment.note) {
      const parts = editingMoment.note.split(/ · | — /);
      return parts.filter(p => 
        ['Thai máy đầu tiên','Lần khám đáng nhớ','Biết giới tính bé','Chuẩn bị đồ cho bé','Vào tam cá nguyệt mới','Tùy chỉnh',
         'Bình yên','Hạnh phúc','Hồi hộp','Lo lắng','Tự hào','Mệt nhưng thương con',
         '5 phút','10 phút','15 phút','20 phút'].includes(p)
      );
    }
    return [];
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaUrls, setMediaUrls]   = useState(() => {
    if (editingMoment) return editingMoment.mediaUrls || [];
    return [];
  });
  const [uploading, setUploading]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const fileRef = useRef();

  const toggleChip = (chip) => setSelectedChips(prev =>
    prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
  );

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      // Fallback: use local object URLs for preview
      const urls = files.map(f => URL.createObjectURL(f));
      setMediaUrls(prev => [...prev, ...urls]);
      setMediaFiles(prev => [...prev, ...files]);
      return;
    }
    setUploading(true);
    const folder = `montessori/${userId}/${pregnancyId || 'moments'}`;
    const newUrls = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const res = await uploadToCloudinary(files[i], folder, (pct) => {
          setUploadProgress(Math.round(((i / files.length) + pct / 100 / files.length) * 100));
        });
        newUrls.push(res.secure_url);
      } catch {}
    }
    setMediaUrls(prev => [...prev, ...newUrls]);
    setUploadProgress(0);
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = () => {
    const noteValue = type === 'milestone'
      ? [selectedChips.join(', '), note].filter(Boolean).join(' · ')
      : type === 'emotion'
        ? [selectedChips.join(', '), note].filter(Boolean).join(' — ')
        : note;
    onSave({ type, subjectId, title, note: noteValue, week, happenedAt, mediaUrls });
  };

  const formTitle    = SHEET_OPTIONS_PREGNANT.find(o => o.type === type)?.label
    || SHEET_OPTIONS_PARENT.find(o => o.type === type)?.label
    || '---';
  const submitLabel  = {
    ultrasound: 'Lưu ảnh siêu âm', belly: 'Lưu ảnh bụng bầu',
    milestone:  'Lưu cột mốc',     emotion: 'Lưu cảm xúc',
    education:  'Lưu hoạt động',   letter: 'Lưu lời nhắn',
    photo:      'Lưu ảnh',         montessori: 'Lưu hoạt động',
  }[type] || 'Lưu khoảnh khắc';

  const milestoneChips = ['Thai máy đầu tiên','Lần khám đáng nhớ','Biết giới tính bé','Chuẩn bị đồ cho bé','Vào tam cá nguyệt mới','Tùy chỉnh'];
  const emotionChips   = ['Bình yên','Hạnh phúc','Hồi hộp','Lo lắng','Tự hào','Mệt nhưng thương con'];
  const durationChips  = ['5 phút','10 phút','15 phút','20 phút'];

  const showWeek      = isPregnant && (type === 'ultrasound' || type === 'belly' || type === 'milestone');
  const showTitle     = type === 'ultrasound' || type === 'milestone' || type === 'education' || type === 'photo' || type === 'montessori';
  const showMedia     = type === 'ultrasound' || type === 'belly' || type === 'photo';
  const showMilestoneChips = type === 'milestone';
  const showEmotionChips   = type === 'emotion';
  const showDuration       = type === 'education' || type === 'montessori';
  const showLetterTarget   = type === 'letter';
  const showNote      = !showLetterTarget;
  const notePlaceholder = {
    ultrasound: 'Mẹ muốn ghi lại điều gì về lần siêu âm này?',
    belly:      'Mẹ cảm nhận gì tuần này?',
    milestone:  'Ghi thêm cảm nhận của mẹ...',
    emotion:    'Mẹ muốn ghi lại cảm xúc gì hôm nay?',
    education:  'Ghi lại cảm nhận sau hoạt động...',
    photo:      'Mô tả khoảnh khắc này...',
    montessori: 'Bé phản ứng thế nào với hoạt động?',
  }[type] || 'Ghi chú...';

  return (
    <div className="ms-form">
      {/* Form header */}
      <div className="ms-form-header">
        <button className="ms-form-back" onClick={onBack} aria-label="Quay lại">
          <IconArrowLeft />
        </button>
        <h2 className="ms-form-title">{formTitle}</h2>
      </div>

      <div className="ms-form-body">
        {/* Subject selector */}
        {needsSubjectSelector && (
          <div className="ms-form-group">
            <label className="ms-form-label">Khoảnh khắc này dành cho ai?</label>
            <div className="ms-chip-group">
              {subjectOptions.map(opt => (
                <button
                  key={opt.id}
                  className={`ms-chip${subjectId === opt.id ? ' active' : ''}`}
                  onClick={() => setSubjectId(opt.id)}
                  disabled={saving}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Media upload */}
        {showMedia && (
          <div className="ms-form-group">
            <label className="ms-form-label">Thêm ảnh</label>
            <div
              className="ms-upload-zone"
              onClick={() => !saving && !uploading && fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              {mediaUrls.length > 0 ? (
                <div className="ms-upload-preview">
                  {mediaUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Preview ${i + 1}`} className="ms-upload-preview-img" />
                  ))}
                  <button
                    className="ms-upload-add-more"
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    <IconUpload /> Thêm
                  </button>
                </div>
              ) : (
                <div className="ms-upload-placeholder">
                  <span className="ms-upload-icon"><IconUpload /></span>
                  <span className="ms-upload-label">{uploading ? `Đang tải ${uploadProgress}%...` : 'Nhấn để chọn ảnh'}</span>
                </div>
              )}
              {uploading && (
                <div className="ms-upload-progress">
                  <div className="ms-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFileChange} />
          </div>
        )}

        {/* Milestone chips */}
        {showMilestoneChips && (
          <div className="ms-form-group">
            <label className="ms-form-label">Loại cột mốc</label>
            <div className="ms-chip-group wrap">
              {milestoneChips.map(c => (
                <button
                  key={c}
                  className={`ms-chip${selectedChips.includes(c) ? ' active' : ''}`}
                  onClick={() => toggleChip(c)}
                  disabled={saving}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emotion chips */}
        {showEmotionChips && (
          <div className="ms-form-group">
            <label className="ms-form-label">Cảm xúc hôm nay</label>
            <div className="ms-chip-group wrap">
              {emotionChips.map(c => (
                <button
                  key={c}
                  className={`ms-chip${selectedChips.includes(c) ? ' active' : ''}`}
                  onClick={() => toggleChip(c)}
                  disabled={saving}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration chips */}
        {showDuration && (
          <div className="ms-form-group">
            <label className="ms-form-label">Thời lượng</label>
            <div className="ms-chip-group">
              {durationChips.map(c => (
                <button
                  key={c}
                  className={`ms-chip${selectedChips.includes(c) ? ' active' : ''}`}
                  onClick={() => setSelectedChips([c])}
                  disabled={saving}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Week */}
        {showWeek && (
          <div className="ms-form-group">
            <label className="ms-form-label">Tuần thai</label>
            <input
              className="ms-input"
              type="number"
              min="1" max="42"
              placeholder="Ví dụ: 21"
              value={week}
              onChange={e => setWeek(e.target.value)}
              disabled={saving}
            />
          </div>
        )}

        {/* Title */}
        {showTitle && (
          <div className="ms-form-group">
            <label className="ms-form-label">Tiêu đề</label>
            <input
              className="ms-input"
              type="text"
              placeholder={{
                ultrasound: 'Ví dụ: Ảnh siêu âm tuần 21',
                education:  'Ví dụ: Nghe nhạc nhẹ và trò chuyện với bé',
                montessori: 'Ví dụ: Bé tự xúc ăn lần đầu',
                photo:      'Tiêu đề khoảnh khắc',
              }[type] || 'Tiêu đề'}
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>
        )}

        {/* Letter: send to */}
        {showLetterTarget && (
          <div className="ms-form-group">
            <label className="ms-form-label">Gửi tới</label>
            <div className="ms-chip-group">
              {(needsSubjectSelector ? subjectOptions : [{ id: 'all', label: 'Bé yêu' }]).map(opt => (
                <button
                  key={opt.id}
                  className={`ms-chip${subjectId === opt.id ? ' active' : ''}`}
                  onClick={() => setSubjectId(opt.id)}
                  disabled={saving}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note / Letter content */}
        <div className="ms-form-group">
          <label className="ms-form-label">{showLetterTarget ? 'Nội dung' : 'Ghi chú'}</label>
          <textarea
            className="ms-textarea"
            placeholder={showLetterTarget ? 'Mẹ muốn nói gì với bé hôm nay?' : notePlaceholder}
            rows={4}
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* ── Ngày ghi nhận — mở AppDatePicker premium ── */}
        <div className="ms-form-group">
          <label className="ms-form-label">Ngày ghi nhận</label>
          <button
            type="button"
            className="ms-date-trigger"
            onClick={() => !saving && setShowDatePicker(true)}
            disabled={saving}
          >
            <span className="ms-date-trigger-icon"><IconCalendar /></span>
            <span className="ms-date-trigger-text">
              {happenedAt ? fmtDate(happenedAt) : 'Chọn ngày'}
            </span>
            <span className="ms-date-trigger-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>
          {happenedAt > today() && (
            <p className="ms-date-future-hint">
              Mẹ chọn ngày hôm nay hoặc trước đó nhé.
            </p>
          )}
        </div>

        {/* AppDatePicker modal via portal — above bottom sheet */}
        {showDatePicker && createPortal(
          <AppDatePicker
            value={happenedAt}
            onConfirm={(dateStr) => {
              setHappenedAt(dateStr);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
            dateType="momentDate"
            disableFuture={true}
          />,
          document.body
        )}

        {/* Save error */}
        {saveError && (
          <div className="ms-save-error">
            <p className="ms-save-error-title">Chưa thể lưu khoảnh khắc</p>
            <p className="ms-save-error-desc">Mẹ thử lại sau một chút nhé.</p>
          </div>
        )}

        {/* Submit */}
        <button
          className="ms-save-btn"
          onClick={handleSubmit}
          disabled={saving || uploading}
        >
          {saving ? 'Đang lưu...' : (editingMoment ? 'Cập nhật khoảnh khắc' : submitLabel)}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   IMAGE & VIDEO VIEWER (iOS style)
   ════════════════════════════════════════ */
function ImageViewer({ moment: m, initialIndex, onClose, onOpenDetail }) {
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0);
  const mediaUrls = m.mediaUrls || [];
  const currentUrl = mediaUrls[activeIndex] || '';

  useEffect(() => {
    // Lock scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrev = (e) => {
    e.stopPropagation();
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (activeIndex < mediaUrls.length - 1) setActiveIndex(activeIndex + 1);
  };

  const isVideoUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('video/upload') || lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
  };

  const typeLabel = TYPE_LABEL[m.type] || m.type || 'Khoảnh khắc';

  return (
    <div className="ms-viewer-overlay" onClick={onClose}>
      <button 
        className="ms-viewer-detail-trigger" 
        onClick={(e) => { e.stopPropagation(); onOpenDetail?.(m); }}
      >
        Chi tiết
      </button>

      <button className="ms-viewer-close" onClick={onClose} aria-label="Đóng">
        <IconClose />
      </button>

      {mediaUrls.length > 1 && (
        <div className="ms-viewer-counter">
          {activeIndex + 1}/{mediaUrls.length}
        </div>
      )}

      <div className="ms-viewer-content" onClick={e => e.stopPropagation()}>
        {mediaUrls.length > 1 && activeIndex > 0 && (
          <button className="ms-viewer-nav prev" onClick={handlePrev} aria-label="Ảnh trước">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}

        <div className="ms-viewer-media-wrap">
          {isVideoUrl(currentUrl) ? (
            <VideoPlayer src={currentUrl} />
          ) : (
            <img src={currentUrl} alt={m.title || typeLabel} className="ms-viewer-img" />
          )}
        </div>

        {mediaUrls.length > 1 && activeIndex < mediaUrls.length - 1 && (
          <button className="ms-viewer-nav next" onClick={handleNext} aria-label="Ảnh sau">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      <div className="ms-viewer-info" onClick={e => e.stopPropagation()}>
        <span className="ms-viewer-badge">{typeLabel}</span>
        <h4 className="ms-viewer-title">{m.title || typeLabel}</h4>
        <p className="ms-viewer-meta">
          {m.pregnancyWeek ? `Tuần ${m.pregnancyWeek} · ` : ''}
          {formatDate(m.happenedAt || m.createdAt)}
        </p>
        {m.note && <p className="ms-viewer-note">{m.note}</p>}
      </div>
    </div>
  );
}

function VideoPlayer({ src }) {
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  if (error) {
    return (
      <div className="ms-viewer-video-error">
        <p className="ms-viewer-video-error-text">Chưa thể tải video</p>
        <button 
          className="ms-viewer-video-retry-btn"
          onClick={() => { setError(false); setKey(prev => prev + 1); }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <video
      key={key}
      src={src}
      className="ms-viewer-video"
      controls
      playsInline
      preload="metadata"
      onError={() => setError(true)}
    />
  );
}

/* ════════════════════════════════════════
   MOMENT DETAIL SHEET (bottom sheet style)
   ════════════════════════════════════════ */
function MomentDetail({ moment: m, subjectLabel, isPregnant, onClose, onEdit, onDelete }) {
  const typeLabel = TYPE_LABEL[m.type] || m.type || 'Khoảnh khắc';
  const hasImage = m.mediaUrls && m.mediaUrls.length > 0;
  
  const isVideoUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('video/upload') || lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm');
  };

  return (
    <div className="ms-sheet-overlay" onClick={onClose}>
      <div className="ms-sheet ms-detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="ms-sheet-drag-handle" />
        
        <div className="ms-detail-header">
          <div className="ms-detail-header-text">
            <span className="ms-detail-badge">{typeLabel}</span>
            {subjectLabel && <span className="ms-detail-subject">{subjectLabel}</span>}
          </div>
          <button className="ms-detail-close" onClick={onClose} aria-label="Đóng">
            <IconClose />
          </button>
        </div>

        <div className="ms-detail-body">
          <h2 className="ms-detail-title">{m.title || typeLabel}</h2>
          
          <div className="ms-detail-meta">
            <span className="ms-detail-meta-item">
              <span className="ms-detail-meta-icon"><IconCalendar /></span>
              {formatDate(m.happenedAt || m.createdAt)}
            </span>
            {isPregnant && m.pregnancyWeek && (
              <span className="ms-detail-meta-item">
                <span className="ms-detail-meta-icon"><IconMilestone /></span>
                Tuần {m.pregnancyWeek}
              </span>
            )}
          </div>

          {m.note && (
            <div className="ms-detail-note-box">
              <p className="ms-detail-note">{m.note}</p>
            </div>
          )}

          {hasImage && (
            <div className="ms-detail-media-gallery">
              {m.mediaUrls.map((url, i) => (
                <div key={i} className="ms-detail-media-item">
                  {isVideoUrl(url) ? (
                    <video src={url} className="ms-detail-media-video" controls playsInline preload="metadata" />
                  ) : (
                    <img src={url} alt={m.title || typeLabel} className="ms-detail-media-img" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ms-detail-footer">
          <button className="ms-detail-btn edit" onClick={() => onEdit(m)}>
            Chỉnh sửa
          </button>
          <button className="ms-detail-btn delete" onClick={() => onDelete(m)}>
            Xóa
          </button>
          <button className="ms-detail-btn close-btn" onClick={onClose}>
            Đóng
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
          <button 
            className="ms-ios-confirm-btn cancel" 
            onClick={onCancel}
            disabled={processing}
          >
            {cancelLabel || 'Hủy'}
          </button>
          <button 
            className="ms-ios-confirm-btn confirm" 
            onClick={onConfirm}
            disabled={processing}
          >
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
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="ms-toast">
      <span className="ms-toast-text">{message}</span>
    </div>
  );
}
