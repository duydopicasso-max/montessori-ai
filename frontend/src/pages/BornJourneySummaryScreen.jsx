/**
 * BornJourneySummaryScreen.jsx
 * Monthly journey summary for born/postpartum group only.
 * Data source: journey_mission_completions_v1 localStorage (born:* keys only)
 * No Firestore. No backend. Backward-compatible with value=true or value={object}
 */
import { useMemo } from 'react';
import './BornJourneySummaryScreen.css';

/* ─── helpers ─────────────────────────────────────────── */

function getLocalDateStr(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseJourneyStore() {
  try {
    const raw = localStorage.getItem('journey_mission_completions_v1');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Filter born completions for a given YYYY-MM month string.
 * Returns array of { date, missionId, meta } where meta may be true or object.
 */
function getBornCompletionsForMonth(store, monthStr) {
  const results = [];
  Object.entries(store).forEach(([key, value]) => {
    // key format: born:YYYY-MM-DD:age{N}:{missionId}
    if (!key.startsWith('born:')) return;
    const parts = key.split(':');
    // parts[0]=born  parts[1]=YYYY-MM-DD  parts[2]=age{N}  parts[3..]=missionId
    if (parts.length < 4) return;
    const dateStr = parts[1]; // YYYY-MM-DD
    if (!dateStr.startsWith(monthStr)) return; // filter by month

    // Determine completed status (backward compat: value===true OR value.completed===true)
    const completed = value === true || (value && typeof value === 'object' && value.completed === true);
    if (!completed) return;

    const missionId = parts.slice(3).join(':');
    results.push({
      key,
      date: dateStr,
      missionId,
      meta: typeof value === 'object' ? value : null
    });
  });
  return results;
}

/**
 * Count completions per calendar date.
 * Returns { [YYYY-MM-DD]: number }
 */
function countByDate(completions) {
  const map = {};
  completions.forEach(({ date }) => {
    map[date] = (map[date] || 0) + 1;
  });
  return map;
}

/**
 * Compute streak: consecutive days ending today (or most recent day with data).
 */
function computeStreak(countMap) {
  const today = getLocalDateStr();
  const sortedDates = Object.keys(countMap).sort().reverse();
  if (sortedDates.length === 0) return 0;

  // Start from today or the most recent date
  let current = sortedDates[0] > today ? today : sortedDates[0];
  let streak = 0;

  while (true) {
    if (countMap[current] > 0) {
      streak++;
      // Move to previous day
      const d = new Date(current + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      current = getLocalDateStr(d);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Top categories from completions metadata.
 * Falls back to 'Thực hành' if no category in metadata.
 */
function getTopCategories(completions, limit = 5) {
  const categoryCount = {};
  const categoryType = {};
  completions.forEach(({ meta }) => {
    const cat = (meta?.category) || 'Thực hành';
    const type = (meta?.type) || '';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (type) categoryType[cat] = type;
  });
  return Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, type: categoryType[name] || '' }));
}

/**
 * Favorite activity: most-completed title.
 */
function getFavoriteActivity(completions) {
  if (completions.length === 0) return null;
  const titleCount = {};
  const titleMeta = {};
  completions.forEach(({ missionId, meta }) => {
    const title = meta?.title || missionId;
    titleCount[title] = (titleCount[title] || 0) + 1;
    if (meta && !titleMeta[title]) titleMeta[title] = meta;
  });
  const sorted = Object.entries(titleCount).sort((a, b) => b[1] - a[1]);
  const [title, count] = sorted[0];
  return { title, count, meta: titleMeta[title] || null };
}

/* ─── SVG icons ────────────────────────────────────────── */

function IconByType({ type }) {
  const t = (type || '').toLowerCase();
  if (t === 'fine_motor' || t === 'gross_motor' || t === 'vận động')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14a4 4 0 0 0 4 4h4a6 6 0 0 0 6-6v-1a2 2 0 0 0-2-2h-1"/></svg>;
  if (t === 'sensory' || t === 'giác quan')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
  if (t === 'language' || t === 'cognitive' || t === 'ngôn ngữ' || t === 'nhận thức')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (t === 'connection' || t === 'kết nối' || t === 'gắn kết')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  if (t === 'environment' || t === 'môi trường' || t === 'trật tự')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
  if (t === 'care' || t === 'hygiene' || t === 'self_care' || t === 'tự lập' || t === 'vệ sinh')
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
  // Default leaf
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/></svg>;
}

function getSkillColors(type) {
  const t = (type || '').toLowerCase();
  if (t === 'fine_motor' || t === 'gross_motor') return { bg: '#E8F4EE', color: '#2F6B4F' };
  if (t === 'sensory') return { bg: '#EBF0F8', color: '#4A6FA5' };
  if (t === 'language' || t === 'cognitive') return { bg: '#EEE8F5', color: '#5A4A7B' };
  if (t === 'connection') return { bg: '#F8EBF0', color: '#B85472' };
  if (t === 'environment') return { bg: '#F5F0E4', color: '#7B6A3E' };
  if (t === 'care' || t === 'hygiene' || t === 'self_care') return { bg: '#EBF0F8', color: '#4A6FA5' };
  return { bg: '#E9F3EE', color: '#2F6B4F' };
}

/* ─── Calendar sub-component ───────────────────────────── */

function MonthCalendar({ year, month, countMap }) {
  const today = getLocalDateStr();
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed
  // Day of week the 1st falls on (0=Sun)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const cells = [];
  // Empty leading cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`e-${i}`} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = countMap[dateStr] || 0;
    const isFuture = dateStr > today;
    const isToday = dateStr === today;

    let cls = 'bjs-day-cell ';
    if (isFuture) cls += 'future';
    else if (count >= 3) cls += 'done';
    else if (count >= 1) cls += 'partial';
    else cls += 'skipped';

    if (isToday) cls += ' today-ring';

    cells.push(
      <div key={dateStr} className={cls} title={`${d}/${month}: ${count} nhiệm vụ`}>
        {d}
      </div>
    );
  }

  return (
    <div>
      <div className="bjs-weekday-row">
        {WEEKDAYS.map(d => <div key={d} className="bjs-weekday-label">{d}</div>)}
      </div>
      <div className="bjs-calendar-grid">{cells}</div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────── */

export default function BornJourneySummaryScreen({ onBack, babyName }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9',
    'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const displayName = babyName || 'con';

  const { completions, totalCompleted, practiceDays, streakDays, countMap, topCategories, favoriteActivity } = useMemo(() => {
    const store = parseJourneyStore();
    const comps = getBornCompletionsForMonth(store, monthStr);
    const cm = countByDate(comps);
    const prDays = Object.keys(cm).length;
    const streak = computeStreak(cm);
    const cats = getTopCategories(comps);
    const fav = getFavoriteActivity(comps);
    return {
      completions: comps,
      totalCompleted: comps.length,
      practiceDays: prDays,
      streakDays: streak,
      countMap: cm,
      topCategories: cats,
      favoriteActivity: fav
    };
  }, [monthStr]);

  const isEmpty = totalCompleted === 0;
  const maxCount = favoriteActivity?.count || 1;

  return (
    <div className="bjs-overlay" role="dialog" aria-label="Tổng kết hành trình tháng">
      {/* Header */}
      <div className="bjs-header">
        <button className="bjs-back-btn" onClick={onBack} aria-label="Quay lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="bjs-header-titles">
          <h2 className="bjs-header-title">Tổng kết {MONTH_NAMES[currentMonth]}</h2>
          <p className="bjs-header-sub">
            Những khoảnh khắc Montessori mẹ đã cùng <strong style={{ color: '#2F6B4F' }}>{displayName}</strong> thực hành
          </p>
        </div>
        <div className="bjs-month-pill">{MONTH_NAMES[currentMonth]}</div>
      </div>

      {/* Body */}
      <div className="bjs-body">

        {/* A. Stats card */}
        <div className="bjs-stats-card">
          <div className="bjs-stat">
            <span className="bjs-stat-number">{totalCompleted}</span>
            <span className="bjs-stat-label">nhiệm vụ{'\n'}hoàn thành</span>
          </div>
          <div className="bjs-stat">
            <span className="bjs-stat-number">{practiceDays}</span>
            <span className="bjs-stat-label">ngày{'\n'}thực hành</span>
          </div>
          <div className="bjs-stat">
            <span className="bjs-stat-number">{streakDays}</span>
            <span className="bjs-stat-label">ngày liên{'\n'}tiếp 🔥</span>
          </div>
        </div>

        {/* Empty state message */}
        {isEmpty && (
          <div className="bjs-card">
            <p className="bjs-empty-message">
              Mẹ hãy bắt đầu bằng một hoạt động nhỏ hôm nay.
              Mỗi khoảnh khắc cùng {displayName} đều có giá trị. 🌱
            </p>
          </div>
        )}

        {/* B. Skills grid */}
        {!isEmpty && topCategories.length > 0 && (
          <div className="bjs-card">
            <p className="bjs-section-title">Nhóm kỹ năng nổi bật</p>
            <div className="bjs-skills-grid">
              {topCategories.map(({ name, count, type }) => {
                const colors = getSkillColors(type);
                return (
                  <div key={name} className="bjs-skill-chip">
                    <div className="bjs-skill-icon-wrap" style={{ background: colors.bg, color: colors.color }}>
                      <IconByType type={type || name} />
                    </div>
                    <span className="bjs-skill-name">{name}</span>
                    <span className="bjs-skill-count">{count}×</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. Favorite activity */}
        {!isEmpty && favoriteActivity && (
          <div className="bjs-card">
            <p className="bjs-section-title">Hoạt động {displayName} yêu thích nhất</p>
            <div className="bjs-fav-row">
              <div className="bjs-fav-thumb">
                {favoriteActivity.meta?.image
                  ? <img src={favoriteActivity.meta.image} alt={favoriteActivity.title} />
                  : (
                    <div className="bjs-fav-thumb-gradient">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                  )
                }
              </div>
              <div className="bjs-fav-info">
                <p className="bjs-fav-title">{favoriteActivity.title}</p>
                {favoriteActivity.meta?.category && (
                  <p className="bjs-fav-category">{favoriteActivity.meta.category}</p>
                )}
                <span className="bjs-fav-times">Đã thực hành {favoriteActivity.count} lần</span>
                <div className="bjs-progress-bar-wrap">
                  <div
                    className="bjs-progress-bar-fill"
                    style={{ width: `${Math.min((favoriteActivity.count / Math.max(totalCompleted, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* D. Monthly calendar */}
        <div className="bjs-card">
          <p className="bjs-section-title">Tiến trình {MONTH_NAMES[currentMonth]}</p>
          <MonthCalendar year={currentYear} month={currentMonth} countMap={countMap} />
          <div className="bjs-legend">
            <div className="bjs-legend-item"><div className="bjs-legend-dot done" />Hoàn thành</div>
            <div className="bjs-legend-item"><div className="bjs-legend-dot part" />Một phần</div>
            <div className="bjs-legend-item"><div className="bjs-legend-dot skip" />Bỏ qua</div>
          </div>
        </div>

        {/* E. Closing emotional card */}
        <div className="bjs-closing-card">
          <div className="bjs-closing-text">
            <p>
              {isEmpty
                ? `Hãy cùng ${displayName} bắt đầu hành trình Montessori tháng này nhé! 🌱`
                : <>Tháng này mẹ đã cùng <strong>{displayName}</strong> tạo nên <strong>{totalCompleted}</strong> khoảnh khắc Montessori thật ý nghĩa.</>
              }
            </p>
          </div>
          <div className="bjs-closing-graphic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/>
            </svg>
          </div>
        </div>

        {/* F. CTA buttons */}
        <div className="bjs-cta-row">
          <button
            className="bjs-cta-btn secondary"
            onClick={() => {
              // Placeholder: future quarterly view
              console.info('[BornJourneySummary] Xem hành trình quý — coming soon');
            }}
          >
            Xem hành trình quý
          </button>
          <button
            className="bjs-cta-btn primary"
            onClick={onBack}
          >
            Tiếp tục tháng mới
          </button>
        </div>

      </div>
    </div>
  );
}
