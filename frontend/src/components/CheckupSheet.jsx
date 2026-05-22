/**
 * CheckupSheet.jsx — Bottom Sheet Premium "Ghi nhận khám thai"
 * iOS-style, xanh lá pastel brand, drag handle, blur overlay, scroll-in-sheet
 * All states: loading, saving, error, validation, success toast, reminder toggle
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CheckupSheet.css';

/* ── Icons ── */
const CalendarLineIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const CloseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const BellIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const RefreshIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const AlertCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const PlusIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const HelpCircleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ── Quick chip suggestions for qualitative notes ── */
const QUICK_CHIPS = [
  { label: '+ Lời dặn tái khám', text: 'Lời dặn bác sĩ:\n- ' },
  { label: '+ Kết quả xét nghiệm', text: 'Kết quả xét nghiệm: ' },
  { label: '+ Dặn dò đặc biệt', text: 'Dặn dò đặc biệt: ' },
];

/* ── Format date to ISO yyyy-mm-dd ── */
const todayISO = () => new Date().toISOString().split('T')[0];

/* ── Format date for display dd/mm/yyyy ── */
const fmtDisplay = (iso) => {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
};

/* ── Check if a date string is in the past ── */
const isDateInPast = (iso) => {
  if (!iso) return false;
  return new Date(iso) < new Date(todayISO());
};

/* ═══════════════════════════════════════════════════════════
   CUSTOM CALENDAR PICKER OVERLAY COMPONENT
   ═══════════════════════════════════════════════════════════ */
export function CustomCalendar({ value, onChange, onClose, minDate, maxDate }) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0]);
    return today.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1]) - 1;
    return today.getMonth();
  });
  const [selectedDate, setSelectedDate] = useState(value || '');

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDay = firstDayOfMonth.getDay();
  const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  
  const cells = [];
  // Fill leading empty cells
  for (let i = adjustedStartingDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    cells.push({ day, month: m, year: y, isCurrentMonth: false });
  }
  
  // Current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: currentMonth, year: currentYear, isCurrentMonth: true });
  }

  // Trailing empty cells
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextDaysCount = totalCells - cells.length;
  for (let d = 1; d <= nextDaysCount; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  const monthsList = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleSelectDay = (cell) => {
    const y = cell.year;
    const m = String(cell.month + 1).padStart(2, '0');
    const d = String(cell.day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;
    
    setSelectedDate(dateStr);
  };

  const handleToday = () => {
    const yStr = today.getFullYear();
    const mStr = String(today.getMonth() + 1).padStart(2, '0');
    const dStr = String(today.getDate()).padStart(2, '0');
    const tISO = `${yStr}-${mStr}-${dStr}`;
    
    if (minDate && tISO < minDate) return;
    if (maxDate && tISO > maxDate) return;

    setSelectedDate(tISO);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onChange(selectedDate);
    }
    onClose();
  };

  return (
    <div className="custom-calendar-overlay" onClick={onClose}>
      <div className="custom-calendar-box" onClick={e => e.stopPropagation()}>
        <div className="calendar-header-nav">
          <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth}>&larr;</button>
          <div className="calendar-month-year">
            {monthsList[currentMonth]} {currentYear}
          </div>
          <button type="button" className="calendar-nav-btn" onClick={handleNextMonth}>&rarr;</button>
        </div>

        <div className="calendar-weekdays">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(wd => (
            <div key={wd} className="weekday-cell">{wd}</div>
          ))}
        </div>

        <div className="calendar-days-grid">
          {cells.map((cell, idx) => {
            const y = cell.year;
            const m = String(cell.month + 1).padStart(2, '0');
            const d = String(cell.day).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;
            
            let isDisabled = false;
            if (minDate && dateStr < minDate) isDisabled = true;
            if (maxDate && dateStr > maxDate) isDisabled = true;
            
            return (
              <button
                key={idx}
                type="button"
                className={`day-cell ${cell.isCurrentMonth ? '' : 'day-other-month'} ${isSelected ? 'day-selected' : ''} ${isToday ? 'day-today' : ''}`}
                disabled={isDisabled}
                onClick={() => handleSelectDay(cell)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="calendar-actions">
          <button type="button" className="calendar-action-btn calendar-action-today" onClick={handleToday}>
            Hôm nay
          </button>
          <div className="calendar-actions-right">
            <button type="button" className="calendar-action-btn calendar-action-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="calendar-action-btn calendar-action-confirm" onClick={handleConfirm}>
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function CheckupSheet({ open, onClose, onSave, existingVisit = null, edd = null }) {
  const textareaRef = useRef(null);
  const sheetRef    = useRef(null);

  // Form fields
  const [visitDate, setVisitDate]             = useState(todayISO());
  const [notes, setNotes]                     = useState('');
  const [nextAppointment, setNextAppointment] = useState('');
  const [enableReminder, setEnableReminder]   = useState(true);

  // Ultrasound indicators & Fetal Heart Rate
  const [motherWeight, setMotherWeight]       = useState('');
  const [bpd, setBpd]                         = useState('');
  const [fl, setFl]                           = useState('');
  const [ac, setAc]                           = useState('');
  const [hc, setHc]                           = useState('');
  const [crl, setCrl]                         = useState('');
  const [efw, setEfw]                         = useState('');
  const [fetalHeartRate, setFetalHeartRate]   = useState('');
  const [gestationalWeek, setGestationalWeek] = useState('');
  const [gestationalDay, setGestationalDay]   = useState('');
  const [activeMetrics, setActiveMetrics]     = useState({
    motherWeight: false, bpd: false, fl: false, ac: false, hc: false, crl: false, efw: false, fetalHeartRate: false
  });

  // Input refs for auto focus
  const inputRefs = {
    motherWeight: useRef(null),
    bpd: useRef(null),
    fl: useRef(null),
    ac: useRef(null),
    hc: useRef(null),
    crl: useRef(null),
    efw: useRef(null),
    fetalHeartRate: useRef(null)
  };

  // UI states
  const [saving, setSaving]                 = useState(false);
  const [loadError, setLoadError]           = useState(false);
  const [saveError, setSaveError]           = useState(false);
  const [validationMsg, setValidationMsg]   = useState('');
  const [toastMsg, setToastMsg]             = useState('');
  const [toastVisible, setToastVisible]     = useState(false);
  const [sheetLoading, setSheetLoading]     = useState(false);

  // Overlay modal states
  const [calendarTarget, setCalendarTarget]   = useState(null); // 'visitDate' | 'nextAppointment' | null
  const [showExplanation, setShowExplanation] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Calculate gestational age based on EDD and visitDate
  const calculateGestationalAge = (eddStr, visitDateStr) => {
    if (!eddStr || !visitDateStr) return null;
    const due = new Date(eddStr);
    due.setHours(12, 0, 0, 0);
    const visit = new Date(visitDateStr);
    visit.setHours(12, 0, 0, 0);
    const diffTime = due.getTime() - visit.getTime();
    const diffDays = Math.round(diffTime / 86400000);
    const ageDays = 280 - diffDays;
    if (ageDays < 0 || ageDays > 300) return null;
    return ageDays;
  };

  // Calculate computed age
  let computedWeek = null;
  let computedDay = null;
  let computedAgeDays = null;
  if (edd && visitDate) {
    const ageDays = calculateGestationalAge(edd, visitDate);
    if (ageDays !== null) {
      computedAgeDays = ageDays;
      computedWeek = Math.floor(ageDays / 7);
      computedDay = ageDays % 7;
    }
  }

  // Check if form is dirty
  const isDirty = () => {
    const initialVisitDate = existingVisit?.date || todayISO();
    const initialNotes = existingVisit?.notes || '';
    const initialNextAppt = existingVisit?.nextAppointment || '';
    const initialReminder = existingVisit?.reminder ?? true;
    
    const initialWeight = existingVisit?.motherWeight !== undefined && existingVisit?.motherWeight !== null ? String(existingVisit.motherWeight) : '';
    const initialBpd = existingVisit?.bpd !== undefined && existingVisit?.bpd !== null ? String(existingVisit.bpd) : '';
    const initialFl = existingVisit?.fl !== undefined && existingVisit?.fl !== null ? String(existingVisit.fl) : '';
    const initialAc = existingVisit?.ac !== undefined && existingVisit?.ac !== null ? String(existingVisit.ac) : '';
    const initialHc = existingVisit?.hc !== undefined && existingVisit?.hc !== null ? String(existingVisit.hc) : '';
    const initialCrl = existingVisit?.crl !== undefined && existingVisit?.crl !== null ? String(existingVisit.crl) : '';
    const initialEfw = existingVisit?.efw !== undefined && existingVisit?.efw !== null ? String(existingVisit.efw) : '';
    const initialFhr = existingVisit?.fetalHeartRate !== undefined && existingVisit?.fetalHeartRate !== null ? String(existingVisit.fetalHeartRate) : '';

    const initialWeek = existingVisit?.gestationalWeek !== undefined && existingVisit?.gestationalWeek !== null ? String(existingVisit.gestationalWeek) : '';
    const initialDay = existingVisit?.gestationalDay !== undefined && existingVisit?.gestationalDay !== null ? String(existingVisit.gestationalDay) : '';

    return (
      visitDate !== initialVisitDate ||
      notes !== initialNotes ||
      nextAppointment !== initialNextAppt ||
      enableReminder !== initialReminder ||
      motherWeight !== initialWeight ||
      bpd !== initialBpd ||
      fl !== initialFl ||
      ac !== initialAc ||
      hc !== initialHc ||
      crl !== initialCrl ||
      efw !== initialEfw ||
      fetalHeartRate !== initialFhr ||
      gestationalWeek !== initialWeek ||
      gestationalDay !== initialDay
    );
  };

  // Set the overlayStateRef
  const overlayStateRef = useRef({ isDirty: false, saving: false });
  overlayStateRef.current = { isDirty: isDirty(), saving };

  useEffect(() => {
    if (open && window._overlayStack) {
      window._overlayStack.push(
        'checkup-sheet',
        () => {
          if (overlayStateRef.current.saving) return 'saving';
          if (overlayStateRef.current.isDirty) return 'dirty';
          return 'clean';
        },
        () => {
          onClose();
        },
        () => {
          setShowConfirmClose(true);
        }
      );
    }
    return () => {
      if (window._overlayStack) {
        window._overlayStack.pop('checkup-sheet');
      }
    };
  }, [open]);

  /* ── On open: prefill from existingVisit or reset ── */
  useEffect(() => {
    if (!open) return;

    if (existingVisit) {
      setSheetLoading(true);
      setTimeout(() => {
        setVisitDate(existingVisit.date || todayISO());
        setNotes(existingVisit.notes || '');
        setNextAppointment(existingVisit.nextAppointment || '');
        setEnableReminder(existingVisit.reminder ?? true);

        // Load metrics
        setMotherWeight(existingVisit.motherWeight !== undefined && existingVisit.motherWeight !== null ? String(existingVisit.motherWeight) : '');
        setBpd(existingVisit.bpd !== undefined && existingVisit.bpd !== null ? String(existingVisit.bpd) : '');
        setFl(existingVisit.fl !== undefined && existingVisit.fl !== null ? String(existingVisit.fl) : '');
        setAc(existingVisit.ac !== undefined && existingVisit.ac !== null ? String(existingVisit.ac) : '');
        setHc(existingVisit.hc !== undefined && existingVisit.hc !== null ? String(existingVisit.hc) : '');
        setCrl(existingVisit.crl !== undefined && existingVisit.crl !== null ? String(existingVisit.crl) : '');
        setEfw(existingVisit.efw !== undefined && existingVisit.efw !== null ? String(existingVisit.efw) : '');
        setFetalHeartRate(existingVisit.fetalHeartRate !== undefined && existingVisit.fetalHeartRate !== null ? String(existingVisit.fetalHeartRate) : '');

        setGestationalWeek(existingVisit.gestationalWeek !== undefined && existingVisit.gestationalWeek !== null ? String(existingVisit.gestationalWeek) : '');
        setGestationalDay(existingVisit.gestationalDay !== undefined && existingVisit.gestationalDay !== null ? String(existingVisit.gestationalDay) : '');

        setActiveMetrics({
          motherWeight: existingVisit.motherWeight !== undefined && existingVisit.motherWeight !== null,
          bpd: existingVisit.bpd !== undefined && existingVisit.bpd !== null,
          fl: existingVisit.fl !== undefined && existingVisit.fl !== null,
          ac: existingVisit.ac !== undefined && existingVisit.ac !== null,
          hc: existingVisit.hc !== undefined && existingVisit.hc !== null,
          crl: existingVisit.crl !== undefined && existingVisit.crl !== null,
          efw: existingVisit.efw !== undefined && existingVisit.efw !== null,
          fetalHeartRate: existingVisit.fetalHeartRate !== undefined && existingVisit.fetalHeartRate !== null,
        });

        setSheetLoading(false);
        setLoadError(false);
      }, 350);
    } else {
      setVisitDate(todayISO());
      setNotes('');
      setNextAppointment('');
      setEnableReminder(true);

      setMotherWeight('');
      setBpd('');
      setFl('');
      setAc('');
      setHc('');
      setCrl('');
      setEfw('');
      setFetalHeartRate('');
      setGestationalWeek('');
      setGestationalDay('');
      setActiveMetrics({
        motherWeight: false, bpd: false, fl: false, ac: false, hc: false, crl: false, efw: false, fetalHeartRate: false
      });

      setSheetLoading(false);
      setLoadError(false);
    }
    setSaveError(false);
    setValidationMsg('');
    setToastVisible(false);
    setCalendarTarget(null);
    setShowExplanation(false);
    setShowConfirmClose(false);
  }, [open, existingVisit]);

  /* ── Keyboard: close on Escape ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showExplanation) {
          setShowExplanation(false);
        } else if (calendarTarget) {
          setCalendarTarget(null);
        } else if (showConfirmClose) {
          setShowConfirmClose(false);
        } else {
          handleAttemptClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, showExplanation, calendarTarget, showConfirmClose, visitDate, notes, nextAppointment, enableReminder, motherWeight, bpd, fl, ac, hc, crl, efw, fetalHeartRate]);

  /* ── Visual Viewport keyboard helper for mobile ── */
  const [viewportStyle, setViewportStyle] = useState({});

  useEffect(() => {
    if (!open || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      const width = window.innerWidth;
      
      if (width < 640) {
        const bottomOffset = Math.max(0, window.innerHeight - (vv.offsetTop + vv.height));
        setViewportStyle({
          bottom: `${bottomOffset}px`,
          maxHeight: `${vv.height * 0.9}px`
        });
      } else {
        setViewportStyle({});
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      window.visualViewport.removeEventListener('scroll', handleResize);
    };
  }, [open]);

  /* ── Prevent body scroll and handle touch lock when open ── */
  useEffect(() => {
    if (!open) return;

    // Lock body scroll and apply pointer isolation
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('cs-modal-open');
    document.body.classList.add('overlay-open');

    let startY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      // Don't prevent default if there are multiple touches or if event is not cancelable
      if (e.touches.length !== 1 || !e.cancelable) return;

      const hasActiveSubModal = showExplanation || !!calendarTarget || showConfirmClose;

      // Find the nearest target in the DOM tree that matches our classes
      let target = e.target;
      let interactiveElement = null;

      while (target && target !== document.body) {
        if (hasActiveSubModal) {
          // If sub-modal is open, only allow scrolling inside the sub-modal's scrollable body
          if (target.classList.contains('cs-modal-body')) {
            interactiveElement = target;
            break;
          }
        } else {
          // If no sub-modal, allow scrolling inside checkup sheet body/fields
          const isMatch = 
            target.classList.contains('checkup-scroll') || 
            target.classList.contains('cs-modal-body') ||
            target.classList.contains('cs-textarea');

          if (isMatch) {
            interactiveElement = target;
            break;
          }
        }
        target = target.parentElement;
      }

      if (!interactiveElement) {
        // Not touching any active interactive container, block scroll
        e.preventDefault();
        return;
      }

      // If they touched a textarea, but it's not scrollable, fall back to checkup-scroll
      if (!hasActiveSubModal && interactiveElement.classList.contains('cs-textarea')) {
        const { scrollHeight, clientHeight } = interactiveElement;
        if (scrollHeight <= clientHeight) {
          let p = interactiveElement.parentElement;
          while (p && p !== document.body) {
            if (p.classList.contains('checkup-scroll')) {
              interactiveElement = p;
              break;
            }
            p = p.parentElement;
          }
        }
      }

      // Now we have the active scrollable container
      const { scrollTop, scrollHeight, clientHeight } = interactiveElement;
      
      // If the container is not scrollable, block scroll
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Prevent boundary scroll chaining with 1.5px sub-pixel layout tolerance
      const isAtTop = scrollTop <= 1.5;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1.5;

      if (deltaY > 0 && isAtTop) {
        e.preventDefault();
      } else if (deltaY < 0 && isAtBottom) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove('cs-modal-open');
      document.body.classList.remove('overlay-open');
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [open, showExplanation, calendarTarget, showConfirmClose]);

  const handleAttemptClose = () => {
    if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'checkup-sheet')) {
      window.history.back();
    } else {
      onClose();
    }
  };

  const handleFocusCapture = (e) => {
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  };

  const handleCalendarChange = (dateStr) => {
    if (calendarTarget === 'visitDate') {
      setVisitDate(dateStr);
      if (validationMsg) setValidationMsg('');
    } else if (calendarTarget === 'nextAppointment') {
      setNextAppointment(dateStr);
      if (validationMsg) setValidationMsg('');
    }
  };

  /* ── Insert quick chip text into textarea ── */
  const handleChipInsert = (text) => {
    const ta = textareaRef.current;
    if (!ta) {
      setNotes(prev => prev + (prev.endsWith('\n') || !prev ? text : '\n' + text));
      return;
    }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const before = notes.slice(0, start);
    const after  = notes.slice(end);
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const newVal = before + prefix + text + after;
    setNotes(newVal);
    setTimeout(() => {
      ta.focus();
      const newCursor = start + prefix.length + text.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  /* ── Show toast ── */
  const showToast = (msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3200);
  };

  /* ── Metric chips click handler ── */
  const handleMetricChipClick = (key) => {
    setActiveMetrics(prev => {
      const next = { ...prev, [key]: true };
      return next;
    });
    setTimeout(() => {
      if (inputRefs[key].current) {
        inputRefs[key].current.focus();
      }
    }, 50);
  };

  const handleDeactivateMetric = (key) => {
    setActiveMetrics(prev => ({ ...prev, [key]: false }));
    if (key === 'motherWeight') setMotherWeight('');
    if (key === 'bpd') setBpd('');
    if (key === 'fl') setFl('');
    if (key === 'ac') setAc('');
    if (key === 'hc') setHc('');
    if (key === 'crl') setCrl('');
    if (key === 'efw') setEfw('');
    if (key === 'fetalHeartRate') setFetalHeartRate('');
  };

  /* ── Validate ── */
  const validate = () => {
    const hasAnyMetric = motherWeight || bpd || fl || ac || hc || crl || efw || fetalHeartRate;
    if (!notes.trim() && !nextAppointment && !hasAnyMetric) {
      setValidationMsg('Mẹ hãy thêm ít nhất một thông tin (chỉ số siêu âm, ghi chú hoặc ngày hẹn tiếp theo) trước khi lưu nhé.');
      return false;
    }
    if (!edd) {
      if (gestationalWeek === '' || gestationalDay === '') {
        setValidationMsg('Mẹ vui lòng nhập đầy đủ tuần thai và ngày thai nhé.');
        return false;
      }
    }
    setValidationMsg('');
    return true;
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(false);
    try {
      let finalWeek = null;
      let finalDay = null;
      let finalAgeDays = null;
      let source = 'manual';

      if (edd) {
        finalAgeDays = computedAgeDays;
        finalWeek = computedWeek;
        finalDay = computedDay;
        source = 'edd';
      } else {
        const w = parseInt(gestationalWeek);
        const d = parseInt(gestationalDay);
        finalAgeDays = w * 7 + d;
        finalWeek = w;
        finalDay = d;
        source = 'manual';
      }

      const entry = {
        date:            visitDate,
        notes:           notes.trim(),
        nextAppointment: nextAppointment || null,
        reminder:        nextAppointment ? enableReminder : false,
        motherWeight:    motherWeight ? parseFloat(motherWeight) : null,
        bpd:             bpd ? parseFloat(bpd) : null,
        fl:              fl ? parseFloat(fl) : null,
        ac:              ac ? parseFloat(ac) : null,
        hc:              hc ? parseFloat(hc) : null,
        crl:             crl ? parseFloat(crl) : null,
        efw:             efw ? parseFloat(efw) : null,
        fetalHeartRate:  fetalHeartRate ? parseFloat(fetalHeartRate) : null,
        gestationalAgeDays: finalAgeDays,
        gestationalWeek:    finalWeek,
        gestationalDay:     finalDay,
        gestationalAgeSource: source,
        eddSnapshotAtVisit:   edd || null,
      };
      await onSave(entry);

      if (nextAppointment && enableReminder) {
        showToast('Đã lưu · App sẽ nhắc mẹ trước lịch khám 1 ngày');
      } else {
        showToast(existingVisit ? 'Đã cập nhật ghi nhận khám thai' : 'Đã lưu ghi nhận khám thai');
      }

      setTimeout(() => {
        overlayStateRef.current.isDirty = false;
        overlayStateRef.current.saving = false;
        if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'checkup-sheet')) {
          window.history.back();
        } else {
          onClose();
        }
      }, 1200);
    } catch (e) {
      console.error(e);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  /* ── Warnings & Errors ── */
  const nextApptPast = nextAppointment && isDateInPast(nextAppointment);
  const isVisitDateFutureWarn = () => {
    if (!visitDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const visit = new Date(visitDate);
    const diffTime = visit.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  };

  const isAnyMetricActive = Object.values(activeMetrics).some(v => v);

  if (!open) return null;

  return createPortal(
    <>
      {/* ── OVERLAY ── */}
      <div
        className="checkup-overlay"
        onClick={handleAttemptClose}
        aria-label="Đóng"
      />

      {/* ── SHEET ── */}
      <div
        ref={sheetRef}
        className={`checkup-sheet ${open ? 'checkup-sheet--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ghi nhận khám thai"
        style={viewportStyle}
      >
        {/* Drag handle */}
        <div className="checkup-drag-handle" />

        {/* Header */}
        <div className="checkup-header">
          <div className="checkup-header-text">
            <h2 className="checkup-title">{existingVisit ? 'Chỉnh sửa khám thai' : 'Ghi nhận khám thai'}</h2>
            <p className="checkup-subtitle">Lưu lại kết quả khám và lịch hẹn tiếp theo của mẹ.</p>
          </div>
          <button type="button" className="checkup-close-btn" onClick={handleAttemptClose} aria-label="Đóng">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="checkup-scroll" onFocusCapture={handleFocusCapture}>

          {/* ── LOAD ERROR ── */}
          {loadError && (
            <div className="checkup-error-box">
              <AlertCircleIcon size={16} />
              <div>
                <p className="checkup-error-title">Chưa thể tải thông tin khám thai</p>
                <p className="checkup-error-sub">Mẹ thử lại sau một chút nhé.</p>
              </div>
              <button type="button" className="checkup-retry-btn" onClick={() => setLoadError(false)}>
                <RefreshIcon size={13} /> Thử lại
              </button>
            </div>
          )}

          {/* ── SKELETON LOADING ── */}
          {sheetLoading && !loadError && (
            <div className="checkup-skeleton-wrap">
              <div className="cs-skel cs-skel-label" />
              <div className="cs-skel cs-skel-input" />
              <div className="cs-skel cs-skel-label" style={{ marginTop: 16 }} />
              <div className="cs-skel cs-skel-textarea" />
              <div className="cs-skel cs-skel-label" style={{ marginTop: 16 }} />
              <div className="cs-skel cs-skel-input" />
            </div>
          )}

          {/* ── FORM ── */}
          {!sheetLoading && !loadError && (
            <div className="checkup-form">

              {/* Field: Ngày khám */}
              <div className="cs-field-group">
                <label className="cs-label">
                  <CalendarLineIcon size={13} />
                  Ngày khám
                </label>
                <div className="cs-input-icon-wrap">
                  <button
                    type="button"
                    className={`cs-date-trigger-btn ${isVisitDateFutureWarn() ? 'cs-input--warn' : ''}`}
                    onClick={() => setCalendarTarget('visitDate')}
                  >
                    <CalendarLineIcon size={15} color="#5FAF82" />
                    <span>{fmtDisplay(visitDate) || 'Chọn ngày khám'}</span>
                  </button>
                </div>
                {isVisitDateFutureWarn() && (
                  <p className="cs-date-warn">
                    <AlertCircleIcon size={13} />
                    Mẹ đang chọn một ngày khám trong tương lai.
                  </p>
                )}
              </div>

              {/* Field: Tuổi thai tại ngày khám */}
              <div className="cs-field-group">
                <label className="cs-label">Tuổi thai tại ngày khám</label>
                {edd ? (
                  <div className="cs-computed-age-box">
                    <span className="cs-computed-age-value">
                      {computedWeek !== null ? `Tuần ${computedWeek} + ${computedDay} ngày` : '—'}
                    </span>
                    <span className="cs-computed-age-source">Tự động tính từ Ngày dự sinh</span>
                  </div>
                ) : (
                  <div className="cs-manual-age-container">
                    <div className="cs-manual-age-warning">
                      <span>Thêm ngày dự sinh để app tính tuần thai chính xác hơn.</span>
                    </div>
                    <div className="cs-manual-age-selectors">
                      <div className="cs-manual-selector-field">
                        <span className="cs-selector-label">Tuần</span>
                        <select
                          className="cs-select"
                          value={gestationalWeek}
                          onChange={e => {
                            setGestationalWeek(e.target.value);
                            if (validationMsg) setValidationMsg('');
                          }}
                        >
                          <option value="">--</option>
                          {Array.from({ length: 42 }, (_, i) => i + 1).map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                      <div className="cs-manual-selector-field">
                        <span className="cs-selector-label">Ngày</span>
                        <select
                          className="cs-select"
                          value={gestationalDay}
                          onChange={e => {
                            setGestationalDay(e.target.value);
                            if (validationMsg) setValidationMsg('');
                          }}
                        >
                          <option value="">--</option>
                          {Array.from({ length: 7 }, (_, i) => i).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Field: Các chỉ số siêu âm (Grid Chips) */}
              <div className="cs-field-group">
                <label className="cs-label">Chỉ số siêu âm & Sức khỏe</label>
                <div className="cs-metric-chips-row">
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.motherWeight ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('motherWeight')}
                  >
                    {activeMetrics.motherWeight ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    Cân nặng mẹ
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.bpd ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('bpd')}
                  >
                    {activeMetrics.bpd ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    BPD
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.fl ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('fl')}
                  >
                    {activeMetrics.fl ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    FL
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.ac ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('ac')}
                  >
                    {activeMetrics.ac ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    AC
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.hc ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('hc')}
                  >
                    {activeMetrics.hc ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    HC
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.crl ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('crl')}
                  >
                    {activeMetrics.crl ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    CRL
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.efw ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('efw')}
                  >
                    {activeMetrics.efw ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    EFW (Cân nặng bé)
                  </button>
                  <button
                    type="button"
                    className={`cs-metric-chip ${activeMetrics.fetalHeartRate ? 'cs-metric-chip--active' : ''}`}
                    onClick={() => handleMetricChipClick('fetalHeartRate')}
                  >
                    {activeMetrics.fetalHeartRate ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                    Tim thai
                  </button>
                </div>

                <div className="cs-explain-row">
                  <button type="button" className="cs-explain-btn" onClick={() => setShowExplanation(true)}>
                    <HelpCircleIcon size={13} /> Giải thích chỉ số siêu âm
                  </button>
                </div>

                {/* Structured Fields Input Grid */}
                {isAnyMetricActive && (
                  <div className="cs-metrics-inputs-grid">
                    {activeMetrics.motherWeight && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">Cân nặng mẹ</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.motherWeight}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={motherWeight}
                            onChange={e => setMotherWeight(e.target.value)}
                          />
                          <span className="cs-metric-unit">kg</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('motherWeight')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.bpd && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">BPD (Lưỡng đỉnh)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.bpd}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={bpd}
                            onChange={e => setBpd(e.target.value)}
                          />
                          <span className="cs-metric-unit">mm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('bpd')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.fl && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">FL (Xương đùi)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.fl}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={fl}
                            onChange={e => setFl(e.target.value)}
                          />
                          <span className="cs-metric-unit">mm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('fl')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.ac && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">AC (Chu vi bụng)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.ac}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={ac}
                            onChange={e => setAc(e.target.value)}
                          />
                          <span className="cs-metric-unit">mm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('ac')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.hc && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">HC (Chu vi đầu)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.hc}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={hc}
                            onChange={e => setHc(e.target.value)}
                          />
                          <span className="cs-metric-unit">mm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('hc')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.crl && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">CRL (Chiều dài mông)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.crl}
                            type="number"
                            step="0.1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={crl}
                            onChange={e => setCrl(e.target.value)}
                          />
                          <span className="cs-metric-unit">mm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('crl')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.efw && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">EFW (Cân nặng thai)</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.efw}
                            type="number"
                            step="1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={efw}
                            onChange={e => setEfw(e.target.value)}
                          />
                          <span className="cs-metric-unit">g</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('efw')}>&times;</button>
                        </div>
                      </div>
                    )}
                    {activeMetrics.fetalHeartRate && (
                      <div className="cs-metric-field">
                        <label className="cs-metric-field-label">Tim thai</label>
                        <div className="cs-metric-input-wrapper">
                          <input
                            ref={inputRefs.fetalHeartRate}
                            type="number"
                            step="1"
                            placeholder="--"
                            className="cs-metric-input"
                            value={fetalHeartRate}
                            onChange={e => setFetalHeartRate(e.target.value)}
                          />
                          <span className="cs-metric-unit">bpm</span>
                          <button type="button" className="cs-metric-clear" onClick={() => handleDeactivateMetric('fetalHeartRate')}>&times;</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Field: Nội dung khám */}
              <div className="cs-field-group">
                <label className="cs-label">Ghi chú & lời dặn khám thai</label>
                <textarea
                  ref={textareaRef}
                  className="cs-textarea"
                  rows={4}
                  placeholder="Mẹ có thể ghi lời dặn của bác sĩ, hướng dẫn ăn uống hoặc các triệu chứng cần lưu ý..."
                  value={notes}
                  onChange={e => {
                    setNotes(e.target.value);
                    if (validationMsg) setValidationMsg('');
                  }}
                />
                {/* Quick chips */}
                <div className="cs-chips-row">
                  {QUICK_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      className="cs-chip"
                      onClick={() => handleChipInsert(chip.text)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field: Ngày hẹn tiếp */}
              <div className="cs-field-group">
                <label className="cs-label">
                  <CalendarLineIcon size={13} />
                  Ngày hẹn khám tiếp theo{' '}
                  <span className="cs-label-optional">(nếu có)</span>
                </label>
                <div className="cs-input-icon-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className={`cs-date-trigger-btn ${nextApptPast ? 'cs-input--warn' : ''}`}
                    onClick={() => setCalendarTarget('nextAppointment')}
                    style={{ flex: 1 }}
                  >
                    <CalendarLineIcon size={15} color={nextApptPast ? '#C47A3A' : '#5FAF82'} />
                    <span>{fmtDisplay(nextAppointment) || 'Chọn ngày hẹn tiếp theo'}</span>
                  </button>
                  {nextAppointment && (
                    <button
                      type="button"
                      className="cs-clear-date-btn"
                      onClick={() => {
                        setNextAppointment('');
                        if (validationMsg) setValidationMsg('');
                      }}
                      title="Xóa ngày hẹn"
                    >
                      <CloseIcon size={12} />
                    </button>
                  )}
                </div>
                {nextApptPast && (
                  <p className="cs-date-warn">
                    <AlertCircleIcon size={13} />
                    Mẹ kiểm tra lại ngày hẹn khám nhé (không chọn ngày quá khứ).
                  </p>
                )}
              </div>

              {/* Reminder toggle — only when nextAppointment is set */}
              {nextAppointment && !nextApptPast && (
                <div className="cs-reminder-row">
                  <div className="cs-reminder-info">
                    <BellIcon size={16} />
                    <div>
                      <p className="cs-reminder-title">Nhắc mẹ trước lịch khám</p>
                      <p className="cs-reminder-sub">Trước 1 ngày</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`cs-toggle ${enableReminder ? 'cs-toggle--on' : ''}`}
                    onClick={() => setEnableReminder(v => !v)}
                    aria-checked={enableReminder}
                    role="switch"
                  >
                    <span className="cs-toggle-thumb" />
                  </button>
                </div>
              )}

              {/* Validation message */}
              {validationMsg && (
                <div className="cs-validation-msg">
                  <AlertCircleIcon size={14} />
                  {validationMsg}
                </div>
              )}

              {/* Save error */}
              {saveError && (
                <div className="cs-save-error">
                  <AlertCircleIcon size={14} />
                  <span>Chưa thể lưu ghi nhận khám thai. Mẹ thử lại sau một chút nhé.</span>
                  <button
                    type="button"
                    className="cs-retry-inline"
                    onClick={handleSave}
                  >
                    <RefreshIcon size={12} /> Thử lại
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── FOOTER / SAVE BUTTON ── */}
        {!sheetLoading && !loadError && (
          <div className="checkup-footer">
            <button
              className="checkup-save-btn"
              disabled={saving || !!nextApptPast}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <span className="cs-btn-spinner" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckIcon size={16} />
                  {existingVisit ? 'Cập nhật ghi nhận khám' : 'Lưu ghi nhận khám thai'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── CUSTOM CALENDAR MODAL ── */}
      {calendarTarget && (
        <CustomCalendar
          value={calendarTarget === 'visitDate' ? visitDate : nextAppointment}
          minDate={calendarTarget === 'nextAppointment' ? todayISO() : null}
          onChange={handleCalendarChange}
          onClose={() => setCalendarTarget(null)}
        />
      )}

      {/* ── EXPLANATION MODAL ── */}
      {showExplanation && (
        <div className="cs-modal-overlay" onClick={() => setShowExplanation(false)}>
          <div className="cs-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cs-modal-header">
              <h3 className="cs-modal-title">Giải thích chỉ số siêu âm</h3>
              <button type="button" className="cs-modal-close" onClick={() => setShowExplanation(false)}>
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="cs-modal-body">
              <table className="cs-explain-table">
                <thead>
                  <tr>
                    <th>Chỉ số</th>
                    <th>Ý nghĩa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>BPD</strong></td>
                    <td>Đường kính lưỡng đỉnh (mm) - Đường kính đầu từ thái dương trái sang phải, dùng để ước lượng cân nặng và tuổi thai.</td>
                  </tr>
                  <tr>
                    <td><strong>FL</strong></td>
                    <td>Chiều dài xương đùi (mm) - Chỉ số đo xương dài nhất cơ thể bé, giúp đánh giá phát triển chiều cao.</td>
                  </tr>
                  <tr>
                    <td><strong>AC</strong></td>
                    <td>Chu vi bụng (mm) - Đo vòng quanh bụng bé, thể hiện rõ nhất tình trạng dinh dưỡng tổng thể.</td>
                  </tr>
                  <tr>
                    <td><strong>HC</strong></td>
                    <td>Chu vi đầu (mm) - Đo kích thước vòng quanh đầu bé, quan trọng cho hệ thần kinh.</td>
                  </tr>
                  <tr>
                    <td><strong>CRL</strong></td>
                    <td>Chiều dài đầu mông (mm) - Đo độ dài từ đỉnh đầu đến mông bé, dùng chủ yếu ở quý 1 thai kỳ.</td>
                  </tr>
                  <tr>
                    <td><strong>EFW</strong></td>
                    <td>Cân nặng thai nhi ước tính (g) - Ước lượng cân nặng bé dựa vào BPD, FL, AC, HC.</td>
                  </tr>
                  <tr>
                    <td><strong>Tim thai</strong></td>
                    <td>Nhịp tim thai (bpm) - Số lần tim bé đập trong 1 phút. Bình thường là 120-160 lần/phút.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM CLOSE DIALOG ── */}
      {showConfirmClose && (
        <div className="ios-confirm-overlay" onClick={() => setShowConfirmClose(false)}>
          <div className="ios-confirm-card" onClick={e => e.stopPropagation()}>
            <h3 className="ios-confirm-title">Bỏ ghi nhận khám thai?</h3>
            <p className="ios-confirm-message">Mẹ có muốn bỏ ghi nhận đang nhập không? Các thay đổi sẽ không được lưu.</p>
            <div className="ios-confirm-buttons">
              <button type="button" className="ios-confirm-btn danger" onClick={() => {
                setShowConfirmClose(false);
                overlayStateRef.current.isDirty = false;
                if (window._overlayStack && window._overlayStack.stack.some(item => item.id === 'checkup-sheet')) {
                  window.history.back();
                } else {
                  onClose();
                }
              }}>
                Bỏ ghi nhận
              </button>
              <button type="button" className="ios-confirm-btn" onClick={() => setShowConfirmClose(false)}>
                Tiếp tục nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`checkup-toast ${toastVisible ? 'checkup-toast--visible' : ''}`}>
        <CheckIcon size={14} />
        {toastMsg}
      </div>
    </>,
    document.body
  );
}
