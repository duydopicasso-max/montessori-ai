/**
 * icons.jsx — Central SVG Icon Library — Montessori AI
 *
 * Design token:
 *   stroke: currentColor  (inherits from CSS color)
 *   strokeWidth: 1.8 (UI chrome) | 2 (large card icons)
 *   strokeLinecap/join: round
 *   fill: none (outline style)
 *   viewBox: 0 0 24 24
 *
 * Usage:
 *   import { LeafIcon, BottleIcon } from '../icons.jsx';
 *   <LeafIcon size={24} strokeWidth={1.8} />
 *
 * Accessibility bypass: aria-label placeholder label
 */

/* ═══════════════════════════════════════
   BRAND / NATURE
   ═══════════════════════════════════════ */

export const LeafIcon = ({ size = 24, strokeWidth = 1.8, className = '' }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

export const SparkleIcon = ({ size = 24, strokeWidth = 1.8, className = '' }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2Q12 12 2 12Q12 12 12 22Q12 12 22 12Q12 12 12 2Z" />
  </svg>
);

export const ChatBubbleIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

/* ═══════════════════════════════════════
   TRACKER CARD ICONS  (large, 52px container)
   ═══════════════════════════════════════ */

/** Ăn uống — baby bottle with cap and grip line */
export const BottleIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4h4"/>
    <path d="M9 6h6l1 3H8l1-3z"/>
    <path d="M8 9v10a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V9"/>
    <path d="M10 14h4"/>
  </svg>
);

/** Ngủ — crescent moon with small star */
export const MoonStarIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    <path d="M19 4l.6 1.4 1.4.6-1.4.6L19 8l-.6-1.4L17 6l1.4-.6z"/>
  </svg>
);

/** Thay tã — diaper with waistband and gather line */
export const DiaperIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 5h12l2 4H4L6 5z"/>
    <path d="M4 9v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9"/>
    <path d="M4 13c2.5-1.5 5-2 8-2s5.5.5 8 2"/>
  </svg>
);

/** Phát triển / Tăng trưởng — bar chart in rounded box */
export const BarChartIcon = ({ size = 24, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <line x1="7"  y1="17" x2="7"  y2="12"/>
    <line x1="12" y1="17" x2="12" y2="9"/>
    <line x1="17" y1="17" x2="17" y2="6"/>
  </svg>
);

/* ═══════════════════════════════════════
   UI ACTION ICONS
   ═══════════════════════════════════════ */

/** Chỉnh sửa — pencil on square */
export const PencilIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

/** Hồ sơ / Records — clipboard with list */
export const ClipboardIcon = ({ size = 20, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
);

/** Ngày / Lịch — calendar */
export const CalendarIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
);

/** Cân nặng — weighing scale */
export const WeightIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="6" r="4"/>
    <path d="M3 20h18l-2-10H5L3 20z"/>
    <line x1="9" y1="16" x2="15" y2="16"/>
  </svg>
);

/** Chiều cao — ruler */
export const RulerIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l4-4 14 14-4 4-14-14z"/>
    <line x1="7"  y1="14" x2="9"  y2="12"/>
    <line x1="11" y1="10" x2="13" y2="8"/>
    <line x1="15" y1="6"  x2="17" y2="4"/>
  </svg>
);

/** Chu vi đầu — circle with dot */
export const HeadCircleIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="3"  x2="12" y2="9"/>
    <line x1="12" y1="15" x2="12" y2="21"/>
  </svg>
);

/** Lưu / Save — floppy disk */
export const SaveIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

/** Thêm / Plus */
export const PlusIcon = ({ size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

/* ═══════════════════════════════════════
   COMMUNITY ROOM ICONS
   ═══════════════════════════════════════ */

/** Góc Mẹ Bầu — pregnant / new life */
export const PregnancyIcon = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Head */}
    <circle cx="12" cy="4" r="2.5"/>
    {/* Belly curve */}
    <path d="M8 9c-1 0-1.5 1-1.5 2.5 0 4 2 7.5 5.5 7.5s5.5-3.5 5.5-7.5C17.5 10 17 9 16 9"/>
    {/* Arms */}
    <path d="M8 10.5c-1.5 0-2.5.5-3 1.5M16 10.5c1.5 0 2.5.5 3 1.5"/>
    {/* Heart inside belly */}
    <path d="M10.5 14c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.5c0 1-1.5 2.5-1.5 2.5S10.5 15 10.5 14z" strokeWidth={1.2}/>
  </svg>
);

/** Hành Trình Ăn Dặm — bowl and spoon */
export const FoodBowlIcon = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0 5 3.5 9 8 9s8-4 8-9H4z"/>
    <line x1="4" y1="10" x2="20" y2="10"/>
    {/* Steam */}
    <path d="M8 7c0-2 2-2 2-4"/>
    <path d="M14 7c0-2 2-2 2-4"/>
    {/* Spoon */}
    <path d="M22 4c0 2-1 3-2 3.5V21" strokeWidth={1.4}/>
  </svg>
);

/** Rèn Ngủ — moon with Z */
export const SleepMoonIcon = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    {/* Z */}
    <path d="M16 5h3l-3 3h3" strokeWidth={1.4}/>
  </svg>
);

/** Sức Khoẻ Mẹ & Bé — heart with medical cross */
export const HealthHeartIcon = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    <line x1="12" y1="9" x2="12" y2="15"/>
    <line x1="9"  y1="12" x2="15" y2="12"/>
  </svg>
);

/** Chuyện Gia Đình — family group */
export const FamilyIcon = ({ size = 28, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {/* Adult 1 */}
    <circle cx="7" cy="5" r="2.5"/>
    <path d="M4.5 11c0-1.5 1.5-2.5 2.5-2.5S9.5 9.5 9.5 11v2"/>
    {/* Adult 2 */}
    <circle cx="17" cy="5" r="2.5"/>
    <path d="M14.5 11c0-1.5 1.5-2.5 2.5-2.5S19.5 9.5 19.5 11v2"/>
    {/* Child */}
    <circle cx="12" cy="14" r="2"/>
    <path d="M9.5 21c0-1.5 1.5-2.5 2.5-2.5s2.5 1 2.5 2.5"/>
  </svg>
);

/* ═══════════════════════════════════════
   PROFILE / GROWTH SCREEN ICONS
   ═══════════════════════════════════════ */

/** Spinner loading */
export const LoadingSpinIcon = ({ size = 24, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
  </svg>
);
