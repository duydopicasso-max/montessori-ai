/**
 * GrowthScreen.jsx — Personalized Growth & Pregnancy Tracking
 * - user.status === "pregnant"  → Theo dõi Thai kỳ
 * - user.status === "parent"    → Theo dõi Tăng trưởng (WHO)
 * - Skeleton loading, rich empty states, full data isolation
 */
import { useState, useEffect, useCallback, useRef } from 'react';
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
export default function GrowthScreen({ profile, setActiveTab }) {
  const userStatus = profile?.status || 'parent';
  const userId     = profile?.user?.uid;
  const babies     = profile?.babies || [];

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedBaby, setSelectedBaby] = useState(0);
  const [babyOverrides, setBabyOverrides] = useState({});
  const [logs, setLogs]                 = useState([]);
  const [pregnancyData, setPregnancyData] = useState(null);
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [showVisitForm, setShowVisitForm]     = useState(false);
  const [measureForm, setMeasureForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '', height: '', head: ''
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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [tempBabyName, setTempBabyName] = useState('');
  const [tempEdd, setTempEdd] = useState('');
  const [showEddCalendar, setShowEddCalendar] = useState(false);
  const [showDobCalendar, setShowDobCalendar] = useState(false);
  const [showMeasureDateCalendar, setShowMeasureDateCalendar] = useState(false);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [showConfirmCloseProfile, setShowConfirmCloseProfile] = useState(false);

  const profileOverlayStateRef = useRef({ isDirty: false, saving: false });
  profileOverlayStateRef.current = {
    isDirty: tempBabyName !== (pregnancyData?.babyName || '') || tempEdd !== (pregnancyData?.edd || ''),
    saving: loading
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
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
      window.history.back();
    } else {
      setShowEditProfileModal(false);
    }
  };

  const handleConfirmDiscardProfile = () => {
    setShowConfirmCloseProfile(false);
    profileOverlayStateRef.current.isDirty = false;
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
      window.history.back();
    } else {
      setShowEditProfileModal(false);
    }
  };
  
  const pendingDeletesRef = useRef({});
  const latestDeletedIdRef = useRef(null);

  /* ── Body overflow scroll lock effect for active modals ── */
  useEffect(() => {
    const isModalOpen = showDeleteConfirm || showEditProfileModal || showEddCalendar || showDobCalendar || showMeasureDateCalendar || showRecalcModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('cs-modal-open');
      document.body.classList.add('overlay-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('cs-modal-open');
      document.body.classList.remove('overlay-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('cs-modal-open');
      document.body.classList.remove('overlay-open');
    };
  }, [showDeleteConfirm, showEditProfileModal, showEddCalendar, showDobCalendar, showMeasureDateCalendar, showRecalcModal]);

  /* ── Resolved baby ── */
  const rawBaby  = babies[selectedBaby] || {};
  const override = babyOverrides[selectedBaby] || {};
  const baby     = { ...rawBaby, ...override };
  const babyId   = (rawBaby.id || rawBaby.name || `baby-${selectedBaby}`)
    .toLowerCase().replace(/\s+/g, '-');
  const gender    = baby.gender || 'girl';
  const dob       = baby.dob || '';
  const ageMonths = getAgeInMonths(dob);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      if (userStatus === 'parent') {
        if (!babyId) { setLogs([]); setLoading(false); return; }
        const q = query(
          collection(db, 'users', userId, 'babies', babyId, 'growthLogs'),
          orderBy('date', 'asc')
        );
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
        // Filter out any logs that are pending delete in localStorage
        const pendingList = getPendingDeletesFromStorage().map(item => item.visitId);
        setLogs(fetchedLogs.filter(log => !pendingList.includes(log.id)));
      }
    } catch (e) {
      console.error(e);
      setError('load_failed');
    } finally {
      setLoading(false);
    }
  }, [userId, babyId, userStatus, selectedBaby]);

  useEffect(() => {
    loadData();
    setShowMeasureForm(false);
    setShowVisitForm(false);
  }, [loadData]);

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
    if (!userId || !babyId) return;
    setSaving(true);
    try {
      const entry = {
        date:   measureForm.date,
        weight: parseFloat(measureForm.weight) || null,
        height: parseFloat(measureForm.height) || null,
        head:   parseFloat(measureForm.head)   || null,
        bmi:    calcBMI(parseFloat(measureForm.weight), parseFloat(measureForm.height)),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'growthLogs'), entry);
      setLogs(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
      setMeasureForm({ date: new Date().toISOString().split('T')[0], weight: '', height: '', head: '' });
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
      bpd:                  checkupEntry.bpd !== undefined ? checkupEntry.bpd : null,
      fl:                   checkupEntry.fl !== undefined ? checkupEntry.fl : null,
      ac:                   checkupEntry.ac !== undefined ? checkupEntry.ac : null,
      hc:                   checkupEntry.hc !== undefined ? checkupEntry.hc : null,
      crl:                  checkupEntry.crl !== undefined ? checkupEntry.crl : null,
      efw:                  checkupEntry.efw !== undefined ? checkupEntry.efw : null,
      fetalHeartRate:       checkupEntry.fetalHeartRate !== undefined ? checkupEntry.fetalHeartRate : null,
      gestationalAgeDays:   checkupEntry.gestationalAgeDays !== undefined ? checkupEntry.gestationalAgeDays : null,
      gestationalWeek:      checkupEntry.gestationalWeek !== undefined ? checkupEntry.gestationalWeek : null,
      gestationalDay:       checkupEntry.gestationalDay !== undefined ? checkupEntry.gestationalDay : null,
      gestationalAgeSource: checkupEntry.gestationalAgeSource || 'edd',
      eddSnapshotAtVisit:   checkupEntry.eddSnapshotAtVisit || null,
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

    // Immediately switch to the Assistant tab (màn hình chính - Trợ lý)
    if (setActiveTab) {
      setActiveTab('chat');
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
    setLoading(true);
    setShowRecalcModal(false);
    profileOverlayStateRef.current.isDirty = false;
    profileOverlayStateRef.current.saving = false;
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'growth-profile-edit')) {
      window.history.back();
    } else {
      setShowEditProfileModal(false);
    }
    try {
      const pregRef = doc(db, 'users', userId, 'tracking', 'pregnancy');
      await setDoc(pregRef, {
        babyName: tempBabyName,
        edd: tempEdd,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

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
    } finally {
      setLoading(false);
      // Force reload from database to ensure everything is in sync
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
    setEditVal(field === 'name' ? (baby.name || '') : (baby.dob || ''));
  };
  const saveEdit = async () => {
    setBabyOverrides(prev => ({
      ...prev,
      [selectedBaby]: { ...(prev[selectedBaby] || {}), [editField]: editVal }
    }));
    setEditField(null);
    try {
      const newBabies = [...babies];
      newBabies[selectedBaby] = { ...newBabies[selectedBaby], ...babyOverrides[selectedBaby], [editField]: editVal };
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });
    } catch (e) { console.error('Save failed', e); }
  };
  const handleDobSelect = async (dateStr) => {
    setShowDobCalendar(false);
    try {
      const newBabies = [...babies];
      newBabies[selectedBaby] = { ...newBabies[selectedBaby], dob: dateStr };
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });
      setBabyOverrides(prev => ({
        ...prev,
        [selectedBaby]: { ...(prev[selectedBaby] || {}), dob: dateStr }
      }));
      // Force reload from database to ensure everything is in sync
      loadData();
    } catch (e) {
      console.error('Save DOB failed', e);
    }
  };


  /* ── Chart data builder (WHO baby growth) ── */
  const buildChartData = (type) => {
    const whoRef = getWHOData(gender, type);
    return whoRef.map(ref => {
      const matchLog = logs.find(l => {
        if (!l.date || !dob) return false;
        const lAge = Math.round((new Date(l.date) - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.4375));
        return Math.abs(lAge - ref.month) <= 1;
      });
      const val = matchLog
        ? (type === 'weight' ? matchLog.weight : type === 'height' ? matchLog.height : matchLog.head)
        : null;
      return {
        month:  ref.month,
        label:  `${ref.month}th`,
        lower:  ref.sd_n2,
        band:   parseFloat((ref.sd_p2 - ref.sd_n2).toFixed(2)),
        actual: val ? parseFloat(val) : null,
      };
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

  const ageLabel = !dob ? '—'
    : ageMonths < 24 ? `${ageMonths} tháng tuổi`
    : `${Math.floor(ageMonths / 12)} tuổi ${ageMonths % 12} tháng`;

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
              {userStatus === 'pregnant'
                ? 'Tuần thai · Cân nặng mẹ · Chỉ số siêu âm · Lịch khám'
                : 'Chuẩn WHO Việt Nam · Cân nặng · Chiều cao · Chu vi đầu'}
            </p>
          </div>
        </div>
      </header>

      {/* ── BABY TABS (parent, multi-baby) ── */}
      {userStatus === 'parent' && babies.length > 1 && (
        <div className="baby-tabs">
          {babies.map((b, i) => {
            const ov = babyOverrides[i] || {};
            const n  = ov.name || b.name || `Bé ${String.fromCharCode(65 + i)}`;
            return (
              <button
                key={i}
                className={`baby-tab ${selectedBaby === i ? 'active' : ''}`}
                onClick={() => setSelectedBaby(i)}
              >{n}</button>
            );
          })}
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
              setTempBabyName(pregnancyData?.babyName || '');
              setTempEdd(pregnancyData?.edd || '');
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
        />

        {/* ── CUSTOM DELETE CONFIRM MODAL ── */}
        {showDeleteConfirm && createPortal(
          <div className="cs-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowDeleteConfirm(false)}>
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
                  <label className="cs-label">Tên bé yêu (ở nhà)</label>
                  <input
                    type="text"
                    className="cs-input"
                    style={{ cursor: 'text' }}
                    value={tempBabyName}
                    onChange={e => setTempBabyName(e.target.value)}
                    placeholder="Bé yêu"
                  />
                </div>
                <div className="cs-field-group">
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

        {showMeasureDateCalendar && createPortal(
          <AppDatePicker
            value={measureForm.date}
            onConfirm={(dateStr) => {
              setMeasureForm(f => ({ ...f, date: dateStr }));
              setShowMeasureDateCalendar(false);
            }}
            onCancel={() => setShowMeasureDateCalendar(false)}
            dateType="birthDate"
          />,
          document.body
        )}


        {/* ── CUSTOM RECALCULATION MODAL ── */}
        {showRecalcModal && createPortal(
          <div className="cs-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRecalcModal(false)}>
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
          <button type="button" className="checkup-toast-undo-btn" onClick={handleUndoDelete}>
            Hoàn tác
          </button>
        </div>

        {/* ── PARENT VIEW ── */}
        {!loading && !error && userStatus === 'parent' && (
          <ParentView
            baby={baby}
            dob={dob}
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
          />
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
function PregnantView({
  pregnancyData, pregnancyWeek, latestMotherWeight, lastVisit, logs,
  onOpenCheckupSheet, onEditCheckup, onDeleteCheckup, onOpenEditProfile
}) {
  const babyName = pregnancyData?.babyName;
  const edd      = pregnancyData?.edd;
  const nextAppt = lastVisit?.nextAppointment || pregnancyData?.nextAppointment;

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
              <p className="preg-baby-name">{babyName || 'Bé yêu'}</p>
              <div className="preg-week-badge">
                {pregnancyWeek ? `Tuần ${pregnancyWeek}` : 'Chưa có tuần thai'}
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
          <div className="metrics-grid">
            {[
              { label: 'Cân nặng mẹ', value: lastVisit.motherWeight, unit: 'kg' },
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
        </div>
      ) : (
        <div className="empty-card">
          <div className="empty-icon-wrap"><UltrasoundPlaceholderIcon /></div>
          <p className="empty-title">Chưa có chỉ số siêu âm</p>
          <p className="empty-sub">Mẹ có thể thêm từ kết quả khám thai hoặc siêu âm.</p>
          <button className="outline-btn" onClick={onOpenCheckupSheet}>Thêm chỉ số</button>
        </div>
      )}

      {/* ── COMPARISON TABLE ── */}
      {logs.length >= 2 && (
        <ComparisonTable current={logs[0]} previous={logs[1]} />
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

      {efwChartData.length >= 2 && (
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
      )}

      {/* ── Chart empty: no data at all ── */}
      {weightChartData.length === 0 && efwChartData.length === 0 && (
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
            return (
              <div key={v.id || i} className="visit-item">
                <div className="visit-item-row" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="visit-date">{fmtDate(v.date) || '—'}</span>
                    {ageDisplay && <span className="visit-week-tag">{ageDisplay}</span>}
                  </div>
                  <div className="visit-actions">
                    <button type="button" className="visit-action-btn edit-btn" onClick={() => onEditCheckup(v)}>Sửa</button>
                    <button type="button" className="visit-action-btn delete-btn" onClick={() => onDeleteCheckup(v.id)}>Xóa</button>
                  </div>
                </div>
                <div className="visit-metrics-row">
                  {v.motherWeight && <span className="visit-metric">Mẹ: {v.motherWeight} kg</span>}
                  {v.bpd  && <span className="visit-metric">BPD: {v.bpd}mm</span>}
                  {v.fl   && <span className="visit-metric">FL: {v.fl}mm</span>}
                  {v.ac   && <span className="visit-metric">AC: {v.ac}mm</span>}
                  {v.hc   && <span className="visit-metric">HC: {v.hc}mm</span>}
                  {v.crl  && <span className="visit-metric">CRL: {v.crl}mm</span>}
                  {v.efw  && <span className="visit-metric">EFW: {v.efw}g</span>}
                  {v.fetalHeartRate && <span className="visit-metric">Tim thai: {v.fetalHeartRate} bpm</span>}
                </div>
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
  baby, dob, ageLabel, gender, ageMonths, logs,
  curWeight, curHeight, curHead, latestLog, nutrition,
  chartTab, setChartTab, buildChartData,
  editField, editVal, startEdit, saveEdit, setEditField, setEditVal,
  showMeasureForm, setShowMeasureForm, measureForm, setMeasureForm,
  handleSaveMeasure, saving
}) {
  const hasData      = logs.length > 0;
  const hasChartData = logs.length >= 2 && dob;
  const chartData    = hasChartData ? buildChartData(chartTab) : [];
  const hasActual    = chartData.some(d => d.actual != null);
  const chartColors  = { weight: '#5FAF82', height: '#2F6B4F', head: '#A8C5B0' };

  return (
    <>
      {/* ── BABY INFO CARD ── */}
      <div className="growth-card baby-info-card">
        <div className="card-header">
          <span className="card-title">Thông tin bé</span>
          {editField === null && (
            <button className="edit-link-btn" onClick={() => startEdit('name')}>
              <PencilIcon size={13} /> Chỉnh sửa
            </button>
          )}
        </div>

        <div className="info-rows">
          {/* Name */}
          <div className="info-row">
            <span className="info-label">Tên ở nhà</span>
            {editField === 'name' ? (
              <div className="edit-inline">
                <input autoFocus className="edit-input" value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()} />
                <button className="edit-save" onClick={saveEdit}><CheckIcon /></button>
                <button className="edit-cancel" onClick={() => setEditField(null)}><CloseIcon /></button>
              </div>
            ) : (
              <span className="info-value">{baby.name || 'Chưa cập nhật'}</span>
            )}
          </div>

          {/* DOB */}
          <div className="info-row">
            <span className="info-label">Ngày sinh</span>
            <span className="info-value" style={{ cursor: 'pointer' }} onClick={() => startEdit('dob')}>
              {fmtDate(dob) || <span className="info-hint">Chưa cập nhật</span>}
            </span>
          </div>


          <div className="info-row">
            <span className="info-label">Tuổi</span>
            <span className="info-value">{ageLabel}</span>
          </div>

          <div className="info-row">
            <span className="info-label">Giới tính</span>
            <span className="info-value">{gender === 'boy' ? 'Bé trai' : 'Bé gái'}</span>
          </div>
        </div>

        {!dob && (
          <div className="dob-hint">
            <span>Thêm ngày sinh để app tính tuổi và biểu đồ chính xác hơn.</span>
            <button className="hint-btn" onClick={() => startEdit('dob')}>Thêm ngày sinh</button>
          </div>
        )}
      </div>

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
                <span className="nutrition-tag" style={{ color: nutrition.color }}>{nutrition.label}</span>
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
          <button className="primary-btn mt-8" onClick={() => setShowMeasureForm(v => !v)}>
            {showMeasureForm ? 'Đóng' : '+ Cập nhật số đo'}
          </button>
        </div>
      ) : (
        <div className="empty-card">
          <div className="empty-icon-wrap"><GrowthPlaceholderIcon /></div>
          <p className="empty-title">Chưa có số đo của bé</p>
          <p className="empty-sub">Thêm cân nặng, chiều cao và chu vi đầu để xem biểu đồ tăng trưởng.</p>
          <button className="primary-btn" style={{ width: 'auto', padding: '11px 24px' }} onClick={() => setShowMeasureForm(true)}>
            Thêm lần đo đầu tiên
          </button>
        </div>
      )}

      {/* ── MEASURE FORM ── */}
      {showMeasureForm && (
        <div className="form-card">
          <div className="form-card-header">
            <span className="form-card-title">Thêm lần đo</span>
            <button className="form-close-btn" onClick={() => setShowMeasureForm(false)}>
              <CloseIcon />
            </button>
          </div>
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
          </div>
          <button 
            className="primary-btn" 
            disabled={saving} 
            onTouchStart={e => {
              e.preventDefault();
              handleSaveMeasure();
            }}
            onMouseDown={e => {
              e.preventDefault();
              handleSaveMeasure();
            }}
            onClick={handleSaveMeasure}
          >
            {saving ? 'Đang lưu...' : 'Lưu lần đo'}
          </button>
        </div>
      )}

      {/* ── TABBED GROWTH CHART ── */}
      <div className="growth-card">
        <div className="card-header">
          <span className="card-title">Biểu đồ tăng trưởng</span>
        </div>
        <div className="chart-tabs">
          {['weight', 'height', 'head'].map(tab => (
            <button
              key={tab}
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
                <span className="chart-legend-item">
                  <span className="legend-band" />
                  Vùng tham khảo WHO
                </span>
              </div>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8C847C' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 13 }}
                  formatter={(v, name) => {
                    if (name === 'band' || name === 'lower') return null;
                    const unit = chartTab === 'weight' ? 'kg' : 'cm';
                    return [`${v} ${unit}`, 'Chỉ số bé'];
                  }}
                />
                <Area type="monotone" dataKey="lower" stackId="who"
                  fill="rgba(240,236,230,0.6)" stroke="rgba(200,210,200,0.4)" strokeWidth={1}
                  dot={false} name="lower" />
                <Area type="monotone" dataKey="band" stackId="who"
                  fill="rgba(95,175,130,0.12)" stroke="rgba(95,175,130,0.3)" strokeWidth={1}
                  dot={false} name="band" />
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
        <button className="ghost-btn" onClick={() => setShowMeasureForm(v => !v)}>
          <PlusIcon size={14} /> Thêm lần đo
        </button>
      </div>

      {logs.length > 0 ? (
        <div className="measure-list">
          {[...logs].reverse().map((l, i) => {
            const logAge = dob ? (() => {
              const months = Math.round(
                (new Date(l.date) - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.4375)
              );
              return months < 24
                ? `${months} tháng`
                : `${Math.floor(months / 12)} tuổi ${months % 12} tháng`;
            })() : null;
            return (
              <div key={l.id || i} className="measure-item">
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
            );
          })}
        </div>
      ) : (
        <div className="empty-list">
          <p className="empty-list-text">Chưa có lần đo nào.</p>
          <button className="outline-btn" onClick={() => setShowMeasureForm(true)}>
            Thêm lần đo đầu tiên
          </button>
        </div>
      )}

      {/* ── WHO NOTE ── */}
      <div className="who-note">
        Biểu đồ theo <strong>Chuẩn tăng trưởng WHO 2006</strong> — áp dụng tại Việt Nam.
        Chỉ mang tính tham khảo, không thay thế đánh giá của bác sĩ.
      </div>
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
