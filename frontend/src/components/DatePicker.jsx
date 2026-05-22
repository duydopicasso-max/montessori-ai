/**
 * DatePicker.jsx — Shared Calendar Date Picker Component
 *
 * API:
 *   value      {string}   ISO date "yyyy-mm-dd" hoặc '' — ngày hiện tại được chọn
 *   onChange   {fn}       (isoDateStr: string) => void — gọi khi người dùng xác nhận
 *   onClose    {fn}       () => void — gọi khi đóng (Hủy hoặc click backdrop)
 *   minDate    {string?}  ISO "yyyy-mm-dd" — ngày tối thiểu (inclusive)
 *   maxDate    {string?}  ISO "yyyy-mm-dd" — ngày tối đa (inclusive)
 *
 * Usage (với createPortal):
 *   import DatePicker from '../components/DatePicker';
 *   import { createPortal } from 'react-dom';
 *
 *   {showPicker && createPortal(
 *     <DatePicker
 *       value={selectedDate}
 *       onChange={(d) => setSelectedDate(d)}
 *       onClose={() => setShowPicker(false)}
 *     />,
 *     document.body
 *   )}
 *
 * Usage (inline, không portal):
 *   <DatePicker value={date} onChange={setDate} onClose={() => setShow(false)} />
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import './DatePicker.css';

/* ── Helpers ── */
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS   = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Build a flat array of {day, month, year, isCurrentMonth} cells for the grid */
function buildCells(year, month) {
  const firstDay     = new Date(year, month, 1);
  const startingDay  = firstDay.getDay(); // 0=Sun
  const leadingDays  = startingDay === 0 ? 6 : startingDay - 1; // Mon-based
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const prevDays     = new Date(year, month, 0).getDate();

  const cells = [];

  // Leading cells from previous month
  for (let i = leadingDays - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  // Trailing cells to fill last row
  const total    = Math.ceil(cells.length / 7) * 7;
  const trailing = total - cells.length;
  for (let d = 1; d <= trailing; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  return cells;
}

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ── Chevron icons ── */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ══════════════════════════════════════════════════════════
   DatePicker Component
   ══════════════════════════════════════════════════════════ */
export default function DatePicker({ value, onChange, onClose, minDate, maxDate }) {
  const today    = todayISO();
  const initDate = value || today;
  const [year, setYear]     = useState(() => parseInt(initDate.split('-')[0]));
  const [month, setMonth]   = useState(() => parseInt(initDate.split('-')[1]) - 1);
  const [selected, setSelected] = useState(value || '');

  const cells = buildCells(year, month);

  /* Navigation */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  };

  /* Day selection */
  const selectDay = (cell) => {
    const iso = toISO(cell.year, cell.month, cell.day);
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    setSelected(iso);
  };

  /* Jump to today */
  const goToday = () => {
    if (minDate && today < minDate) return;
    if (maxDate && today > maxDate) return;
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(today);
  };

  /* Confirm */
  const confirm = () => {
    if (selected) onChange(selected);
    onClose();
  };

  return createPortal(
    <div className="dp-overlay" onClick={onClose}>
      <div className="dp-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dp-header">
          <button type="button" className="dp-nav-btn" onClick={prevMonth} aria-label="Tháng trước">
            <ChevronLeft />
          </button>
          <span className="dp-month-year">{MONTHS[month]} {year}</span>
          <button type="button" className="dp-nav-btn" onClick={nextMonth} aria-label="Tháng sau">
            <ChevronRight />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="dp-weekdays">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="dp-weekday">{wd}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="dp-days">
          {cells.map((cell, idx) => {
            const iso = toISO(cell.year, cell.month, cell.day);
            const isSelected = selected === iso;
            const isToday    = today === iso;
            let isDisabled   = false;
            if (minDate && iso < minDate) isDisabled = true;
            if (maxDate && iso > maxDate) isDisabled = true;

            return (
              <button
                key={idx}
                type="button"
                className={[
                  'dp-day',
                  !cell.isCurrentMonth ? 'dp-day--other-month' : '',
                  isSelected ? 'dp-day--selected' : '',
                  isToday    ? 'dp-day--today'    : '',
                ].filter(Boolean).join(' ')}
                disabled={isDisabled}
                onClick={() => selectDay(cell)}
                aria-label={iso}
                aria-pressed={isSelected}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="dp-actions">
          <button type="button" className="dp-action-btn dp-action-today" onClick={goToday}>
            Hôm nay
          </button>
          <div className="dp-actions-right">
            <button type="button" className="dp-action-btn dp-action-cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="button" className="dp-action-btn dp-action-confirm" onClick={confirm}>
              Xác nhận
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
