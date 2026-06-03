/**
 * BornJourneySummaryScreen.jsx — Polish v2
 * Monthly journey summary for born/postpartum group.
 * Data source: journey_mission_completions_v1 localStorage (born:* keys only)
 * Logic unchanged — only layout/visual polished.
 */
import { useMemo } from 'react';
import './BornJourneySummaryScreen.css';

/* ─── helpers (unchanged logic) ───────────────────────── */

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

function getBornCompletionsForMonth(store, monthStr) {
  const results = [];
  Object.entries(store).forEach(([key, value]) => {
    if (!key.startsWith('born:')) return;
    const parts = key.split(':');
    if (parts.length < 4) return;
    const dateStr = parts[1];
    if (!dateStr.startsWith(monthStr)) return;
    const completed = value === true || (value && typeof value === 'object' && value.completed === true);
    if (!completed) return;
    const missionId = parts.slice(3).join(':');
    results.push({ key, date: dateStr, missionId, meta: typeof value === 'object' ? value : null });
  });
  return results;
}

function countByDate(completions) {
  const map = {};
  completions.forEach(({ date }) => { map[date] = (map[date] || 0) + 1; });
  return map;
}

function computeStreak(countMap) {
  if (Object.keys(countMap).length === 0) return 0;
  const today = getLocalDateStr();
  const sortedDates = Object.keys(countMap).sort().reverse();
  let current = sortedDates[0] > today ? today : sortedDates[0];
  let streak = 0;
  while (true) {
    if (countMap[current] > 0) {
      streak++;
      const d = new Date(current + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      current = getLocalDateStr(d);
    } else { break; }
  }
  return streak;
}

function getTopCategories(completions, limit = 5) {
  const categoryCount = {};
  const categoryType = {};
  completions.forEach(({ meta }) => {
    const cat = meta?.category || 'Thực hành';
    const type = meta?.type || '';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    if (type) categoryType[cat] = type;
  });
  return Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, type: categoryType[name] || '' }));
}

function getFavoriteActivity(completions) {
  if (completions.length === 0) return null;
  const titleCount = {};
  const titleMeta = {};
  completions.forEach(({ missionId, meta }) => {
    const title = meta?.title || missionId;
    titleCount[title] = (titleCount[title] || 0) + 1;
    if (meta && !titleMeta[title]) titleMeta[title] = meta;
  });
  const [title, count] = Object.entries(titleCount).sort((a, b) => b[1] - a[1])[0];
  return { title, count, meta: titleMeta[title] || null };
}

/* ─── Icon components ──────────────────────────────────── */

function IconByType({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('fine_motor') || t.includes('gross_motor') || t.includes('vận động'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M6 14a4 4 0 0 0 4 4h4a6 6 0 0 0 6-6v-1a2 2 0 0 0-2-2h-1"/></svg>;
  if (t.includes('sensory') || t.includes('giác quan'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
  if (t.includes('language') || t.includes('cognitive') || t.includes('ngôn ngữ'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (t.includes('connection') || t.includes('kết nối'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
  if (t.includes('environment') || t.includes('môi trường'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
  if (t.includes('care') || t.includes('hygiene') || t.includes('tự lập'))
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/></svg>;
}

function getSkillColors(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('fine_motor') || t.includes('gross_motor')) return { bg: '#E4F2EA', color: '#2F6B4F' };
  if (t.includes('sensory')) return { bg: '#E8EEF7', color: '#4A6FA5' };
  if (t.includes('language') || t.includes('cognitive')) return { bg: '#EDE8F5', color: '#5A4A7B' };
  if (t.includes('connection')) return { bg: '#F7E8EE', color: '#B85472' };
  if (t.includes('environment')) return { bg: '#F5F0E2', color: '#7B6A3E' };
  if (t.includes('care') || t.includes('hygiene')) return { bg: '#E8EEF7', color: '#4A6FA5' };
  return { bg: '#E4F2EA', color: '#2F6B4F' };
}

/* ─── Compact Calendar ─────────────────────────────────── */

function MonthCalendar({ year, month, countMap }) {
  const today = getLocalDateStr();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`e-${i}`} />);

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
      <div key={dateStr} className={cls} title={`${d}/${month}: ${count} nv`}>{d}</div>
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

/* ─── Main Component ───────────────────────────────────── */

export default function BornJourneySummaryScreen({ onBack, babyName }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const MONTH_NAMES = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const displayName = babyName || 'con';

  const { totalCompleted, practiceDays, streakDays, countMap, topCategories, favoriteActivity } = useMemo(() => {
    const store = parseJourneyStore();
    const comps = getBornCompletionsForMonth(store, monthStr);
    const cm = countByDate(comps);
    return {
      totalCompleted: comps.length,
      practiceDays: Object.keys(cm).length,
      streakDays: computeStreak(cm),
      countMap: cm,
      topCategories: getTopCategories(comps),
      favoriteActivity: getFavoriteActivity(comps)
    };
  }, [monthStr]);

  const isEmpty = totalCompleted === 0;

  return (
    <div className="bjs-overlay" role="dialog" aria-label="Tổng kết hành trình tháng">

      {/* ── Header ── */}
      <div className="bjs-header">
        <button className="bjs-back-btn" onClick={onBack} aria-label="Quay lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="bjs-header-titles">
          <h2 className="bjs-header-title">Tổng kết {MONTH_NAMES[currentMonth]}</h2>
          <p className="bjs-header-sub">
            Cùng <strong style={{ color: '#2F6B4F', fontWeight: 700 }}>{displayName}</strong> trên hành trình Montessori
          </p>
        </div>
        <div className="bjs-month-pill">{MONTH_NAMES[currentMonth]}</div>
      </div>

      {/* ── Body ── */}
      <div className="bjs-body">

        {/* A+B. Stats + Skills combined card */}
        <div className="bjs-stats-card">
          {/* Stats row */}
          <div className="bjs-stat">
            <div className="bjs-stat-icon-wrap" style={{ background: '#E4F2EA' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            </div>
            <span className="bjs-stat-number">{totalCompleted}</span>
            <span className="bjs-stat-label">nhiệm vụ{'\n'}hoàn thành</span>
          </div>

          <div className="bjs-stat">
            <div className="bjs-stat-icon-wrap" style={{ background: '#FEF3E2' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#E07820" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c0 6-6 8-6 13a6 6 0 0 0 12 0c0-5-6-7-6-13z"/><path d="M12 12c0 3-2 4-2 6a2 2 0 0 0 4 0c0-2-2-3-2-6z"/>
              </svg>
            </div>
            <span className="bjs-stat-number">{streakDays}</span>
            <span className="bjs-stat-label">ngày liên{'\n'}tiếp</span>
          </div>

          <div className="bjs-stat">
            <div className="bjs-stat-icon-wrap" style={{ background: '#EDE8F5' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#5A4A7B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span className="bjs-stat-number">{practiceDays}</span>
            <span className="bjs-stat-label">ngày{'\n'}thực hành</span>
          </div>
        </div>

        {/* B. Skills (separate card, only if not empty) */}
        {!isEmpty && topCategories.length > 0 && (
          <div className="bjs-card">
            <p className="bjs-skills-label">Nhóm kỹ năng nổi bật</p>
            <div className="bjs-skills-row">
              {topCategories.map(({ name, count, type }) => {
                const colors = getSkillColors(type);
                return (
                  <div key={name} className="bjs-skill-chip">
                    <div className="bjs-skill-icon-circle" style={{ background: colors.bg, color: colors.color }}>
                      <IconByType type={type || name} />
                    </div>
                    <span className="bjs-skill-name">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="bjs-card">
            <div className="bjs-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/>
              </svg>
            </div>
            <p className="bjs-empty-message">
              Mẹ hãy bắt đầu bằng một hoạt động nhỏ hôm nay.<br/>
              Mỗi khoảnh khắc cùng <strong>{displayName}</strong> đều có giá trị. 🌱
            </p>
          </div>
        )}

        {/* C. Favorite activity — 2 col */}
        {!isEmpty && favoriteActivity && (
          <div className="bjs-card">
            <div className="bjs-fav-inner">
              <div className="bjs-fav-left">
                <p className="bjs-fav-eyebrow">Yêu thích nhất</p>
                <p className="bjs-fav-title">{favoriteActivity.title}</p>
                <span className="bjs-fav-times">Đã thực hành {favoriteActivity.count} lần</span>
                <div className="bjs-progress-bar-wrap">
                  <div
                    className="bjs-progress-bar-fill"
                    style={{ width: `${Math.min((favoriteActivity.count / Math.max(totalCompleted, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bjs-fav-right">
                {favoriteActivity.meta?.image
                  ? <img src={favoriteActivity.meta.image} alt={favoriteActivity.title} />
                  : (
                    <div className="bjs-fav-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </div>
                  )
                }
              </div>
            </div>
          </div>
        )}

        {/* D. Calendar — compact */}
        <div className="bjs-card">
          <div className="bjs-cal-header">
            <p className="bjs-cal-title">Tiến trình {MONTH_NAMES[currentMonth]}</p>
            <div className="bjs-legend">
              <div className="bjs-legend-item"><div className="bjs-legend-dot done"/>Xong</div>
              <div className="bjs-legend-item"><div className="bjs-legend-dot part"/>Một phần</div>
              <div className="bjs-legend-item"><div className="bjs-legend-dot skip"/>Bỏ qua</div>
            </div>
          </div>
          <MonthCalendar year={currentYear} month={currentMonth} countMap={countMap} />
        </div>

        {/* E. Closing card */}
        <div className="bjs-closing-card">
          <div className="bjs-closing-bg" />
          <div className="bjs-closing-inner">
            <div className="bjs-closing-text-col">
              <p className="bjs-closing-eyebrow">Hành trình của mẹ</p>
              <p>
                {isEmpty
                  ? <>Hãy cùng <strong>{displayName}</strong> bắt đầu hành trình Montessori tháng này nhé! 🌱</>
                  : <>Tháng này mẹ đã cùng <strong>{displayName}</strong> tạo nên <strong>{totalCompleted}</strong> khoảnh khắc Montessori thật ý nghĩa.</>
                }
              </p>
            </div>
            <div className="bjs-closing-visual">
              <div className="bjs-closing-visual-gradient">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 8C8 10 5.9 16.17 3.82 19.34c-.39.53.32 1.18.81.78l.27-.21A5 5 0 0 1 8 19c3 0 5-2 5-2 1.5 1.5 3 2 5 2s4-1 4-4c0-2-1-4-2-5s-3-4-3-4z"/>
                </svg>
                <div className="bjs-closing-visual-dots">
                  <span/><span/><span/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* F. CTA buttons */}
        <div className="bjs-cta-row">
          <button
            className="bjs-cta-btn secondary"
            onClick={() => console.info('[BornJourneySummary] Xem hành trình quý — coming soon')}
          >
            Xem hành trình quý
          </button>
          <button className="bjs-cta-btn primary" onClick={onBack}>
            Tiếp tục tháng mới
          </button>
        </div>

      </div>
    </div>
  );
}
