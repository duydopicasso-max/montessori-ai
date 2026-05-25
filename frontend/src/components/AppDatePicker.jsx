import React, { useState, useEffect } from 'react';
import './AppDatePicker.css';

/**
 * AppDatePicker - Unified custom premium date picker modal for Montessori-AI.
 * 
 * Props:
 * - value: string (YYYY-MM-DD)
 * - onConfirm: function(dateStr)
 * - onCancel: function()
 * - minDate: string (YYYY-MM-DD)
 * - maxDate: string (YYYY-MM-DD)
 * - dateType: 'visitDate' | 'nextAppointmentDate' | 'dueDate' | 'birthDate' | 'memoryDate' | 'milestoneDate' | 'eventDate'
 * - title: string (Optional custom title)
 * - allowToday: boolean (Default: true)
 * - disablePast: boolean (Override past disable rule)
 * - disableFuture: boolean (Override future disable rule)
 */
export default function AppDatePicker({
  value,
  onConfirm,
  onCancel,
  minDate,
  maxDate,
  dateType = 'visitDate',
  title,
  allowToday = true,
  disablePast = false,
  disableFuture = false,
}) {
  const today = new Date();
  
  const getTodayStr = () => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();

  // Initialize selected date to value or empty string (can default to today if not provided)
  const [selectedDate, setSelectedDate] = useState(value || todayStr);

  const [currentYear, setCurrentYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0]);
    return today.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return parseInt(value.split('-')[1]) - 1;
    return today.getMonth();
  });

  // Calculate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDay = firstDayOfMonth.getDay();
  // Adjust starting day so Monday is 0, Sunday is 6
  const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const cells = [];
  
  // Leading cells from previous month
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

  // Trailing cells from next month
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

  // Determine if a specific cell date is disabled
  const isCellDisabled = (dateStr) => {
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;

    // Apply rules based on dateType
    if (dateType === 'nextAppointmentDate' || disablePast) {
      if (dateStr < todayStr) return true;
    }
    
    if (dateType === 'birthDate' || dateType === 'memoryDate' || dateType === 'milestoneDate' || disableFuture) {
      if (dateStr > todayStr) return true;
    }

    return false;
  };

  const handleSelectDay = (cell) => {
    const y = cell.year;
    const m = String(cell.month + 1).padStart(2, '0');
    const d = String(cell.day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    if (isCellDisabled(dateStr)) return;

    setSelectedDate(dateStr);
  };

  const handleToday = () => {
    if (isCellDisabled(todayStr)) return;

    setSelectedDate(todayStr);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleConfirm = () => {
    if (selectedDate && !isCellDisabled(selectedDate)) {
      onConfirm(selectedDate);
    }
  };

  // Calculate gentle warnings based on date selection
  const getWarning = () => {
    if (!selectedDate) return '';
    
    if (dateType === 'visitDate' && selectedDate > todayStr) {
      return 'Mẹ kiểm tra lại ngày khám nhé.';
    }

    if (dateType === 'dueDate') {
      if (selectedDate < todayStr) {
        return 'Ngày dự sinh dường như ở quá khứ, mẹ kiểm tra lại nhé.';
      }
      // Warn if EDD is too far in future (> 300 days)
      const diffTime = Math.abs(new Date(selectedDate) - new Date(todayStr));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 300) {
        return 'Ngày dự sinh hơi xa, mẹ kiểm tra lại nhé.';
      }
    }

    return '';
  };

  const warningMsg = getWarning();

  // Default custom title by dateType if not provided
  const getTitle = () => {
    if (title) return title;
    switch (dateType) {
      case 'visitDate':
        return 'Chọn ngày khám';
      case 'nextAppointmentDate':
        return 'Chọn ngày hẹn khám tiếp theo';
      case 'dueDate':
        return 'Chọn ngày dự sinh';
      case 'birthDate':
        return 'Chọn ngày sinh của bé';
      case 'memoryDate':
      case 'milestoneDate':
      case 'momentDate':
        return 'Chọn ngày ghi nhận';
      case 'eventDate':
        return 'Chọn ngày diễn ra sự kiện';
      default:
        return 'Chọn ngày';
    }
  };

  return (
    <div className="app-datepicker-overlay" onClick={onCancel}>
      <div className="app-datepicker-box" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header Title */}
        <div className="app-datepicker-title">{getTitle()}</div>

        {/* Month Selector Header */}
        <div className="app-datepicker-header-nav">
          <button type="button" className="app-datepicker-nav-btn" onClick={handlePrevMonth}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div className="app-datepicker-month-year">
            {monthsList[currentMonth]} {currentYear}
          </div>
          <button type="button" className="app-datepicker-nav-btn" onClick={handleNextMonth}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        {/* Week Days Header */}
        <div className="app-datepicker-weekdays">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(wd => (
            <div key={wd} className="app-datepicker-weekday-cell">{wd}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="app-datepicker-days-grid">
          {cells.map((cell, idx) => {
            const y = cell.year;
            const m = String(cell.month + 1).padStart(2, '0');
            const d = String(cell.day).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            
            const isSelected = selectedDate === dateStr;
            const isToday = todayStr === dateStr;
            const isDisabled = isCellDisabled(dateStr);
            
            return (
              <button
                key={idx}
                type="button"
                className={`app-datepicker-day-cell ${cell.isCurrentMonth ? '' : 'app-datepicker-day-other-month'} ${isSelected ? 'app-datepicker-day-selected' : ''} ${isToday ? 'app-datepicker-day-today' : ''}`}
                disabled={isDisabled}
                onClick={() => handleSelectDay(cell)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {/* Inline Pastel Warning Banner */}
        {warningMsg && (
          <div className="app-datepicker-warning-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="warning-icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="warning-text">{warningMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="app-datepicker-actions">
          {allowToday ? (
            <button 
              type="button" 
              className="app-datepicker-action-btn app-datepicker-action-today" 
              onClick={handleToday}
              disabled={isCellDisabled(todayStr)}
            >
              Hôm nay
            </button>
          ) : (
            <div />
          )}
          <div className="app-datepicker-actions-right">
            <button type="button" className="app-datepicker-action-btn app-datepicker-action-cancel" onClick={onCancel}>
              Hủy
            </button>
            <button 
              type="button" 
              className="app-datepicker-action-btn app-datepicker-action-confirm" 
              onClick={handleConfirm}
              disabled={!selectedDate}
            >
              Xác nhận
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
