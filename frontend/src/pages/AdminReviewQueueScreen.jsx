/**
 * AdminReviewQueueScreen.jsx
 * Phase 2C.1 — Admin-only review queue for aiContentReviewQueue.
 *
 * SAFETY CONTRACT:
 * - NEVER writes to chatRooms, customRooms, communityPosts or any public collection.
 * - Only users where users/{uid}.role === 'admin' can access this screen.
 * - 'approved_for_publish' status does NOT publish posts publicly in Phase 2C.1.
 * - Only updates: reviewStatus, reviewedAt, reviewedByUid, reviewNotes, updatedAt.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, updateDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './AdminReviewQueueScreen.css';

// ── Admin guard (same pattern as AdminImportScreen) ─────────────────────────
async function checkIsAdmin(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    return snap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

// ── Constants ────────────────────────────────────────────────────────────────
const REVIEW_STATUSES = [
  { value: '',                   label: 'Tất cả trạng thái' },
  { value: 'pending_review',     label: 'Chờ duyệt' },
  { value: 'needs_edit',         label: 'Cần chỉnh sửa' },
  { value: 'approved_for_publish', label: 'Đã duyệt — chờ xuất bản' },
  { value: 'rejected',           label: 'Từ chối' },
];

const STATUS_META = {
  pending_review:      { label: 'Chờ duyệt',              color: '#b07d00', bg: '#fff8e1' },
  needs_edit:          { label: 'Cần chỉnh sửa',          color: '#b05800', bg: '#fff3e0' },
  approved_for_publish:{ label: 'Đã duyệt',               color: '#2f6b4f', bg: '#e8f5ee' },
  rejected:            { label: 'Từ chối',                 color: '#c0392b', bg: '#fdecea' },
};

const NOTE_MAX = 500;

// ── Helper: format Firestore timestamp ───────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color: '#888', bg: '#f4f4f4' };
  return (
    <span className="arq-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, authUid, onClose, onUpdate }) {
  const [status,  setStatus]  = useState(item.reviewStatus || 'pending_review');
  const [notes,   setNotes]   = useState(item.reviewNotes || '');
  const [confirm, setConfirm] = useState(null); // { nextStatus, message }
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState('');

  const doUpdate = useCallback(async (nextStatus) => {
    setErr('');
    setSaving(true);
    try {
      const ref = doc(db, 'aiContentReviewQueue', item.id);
      await updateDoc(ref, {
        reviewStatus:   nextStatus,
        reviewedByUid:  authUid,
        reviewedAt:     serverTimestamp(),
        reviewNotes:    notes.trim().slice(0, NOTE_MAX),
        updatedAt:      serverTimestamp(),
      });
      setSaved(true);
      setStatus(nextStatus);
      onUpdate(item.id, nextStatus, notes.trim().slice(0, NOTE_MAX));
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr('Lỗi khi cập nhật: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }, [authUid, item.id, notes, onUpdate]);

  const requestUpdate = (nextStatus) => {
    if (nextStatus === 'approved_for_publish') {
      setConfirm({
        nextStatus,
        message: 'Bài này sẽ được đánh dấu là đã duyệt để chờ xuất bản. Phase hiện tại chưa đăng công khai. Bạn có muốn tiếp tục không?',
      });
    } else if (nextStatus === 'rejected') {
      setConfirm({ nextStatus, message: 'Bạn có chắc muốn từ chối bài này không?' });
    } else {
      doUpdate(nextStatus);
    }
  };

  const sugg = item.communityPostSuggestion;

  return (
    <div className="arq-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="arq-modal" role="dialog" aria-modal="true" aria-label={item.title}>

        {/* ── Header ── */}
        <div className="arq-modal-header">
          <div>
            <StatusBadge status={status} />
            <h2 className="arq-modal-title">{item.title || '(Không có tiêu đề)'}</h2>
            <p className="arq-modal-meta">
              Import: {fmtDate(item.importedAt)} &nbsp;·&nbsp;
              {item.contentType && <span>Loại: {item.contentType}</span>}
              {item.category && <span> · {item.category}</span>}
              {item.targetAudience && <span> · {item.targetAudience}</span>}
            </p>
          </div>
          <button className="arq-modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {/* ── Content ── */}
        <div className="arq-modal-body">
          {item.summary && (
            <section className="arq-modal-section">
              <h3>Tóm tắt</h3>
              <p>{item.summary}</p>
            </section>
          )}

          {item.body && (
            <section className="arq-modal-section">
              <h3>Nội dung</h3>
              <div className="arq-body-text">{item.body}</div>
            </section>
          )}

          {item.keyPoints?.length > 0 && (
            <section className="arq-modal-section">
              <h3>Key Points</h3>
              <ul className="arq-list">
                {item.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </section>
          )}

          {item.todayAction && (
            <section className="arq-modal-section">
              <h3>Hành động hôm nay</h3>
              <p>{item.todayAction}</p>
            </section>
          )}

          {item.tags?.length > 0 && (
            <section className="arq-modal-section">
              <h3>Tags</h3>
              <div className="arq-tags">
                {item.tags.map((t, i) => <span key={i} className="arq-tag">#{t}</span>)}
              </div>
            </section>
          )}

          {(item.imagePrompt || item.imageUrl) && (
            <section className="arq-modal-section">
              <h3>Hình ảnh</h3>
              {item.imageUrl && <img src={item.imageUrl} alt="preview" className="arq-image" />}
              {item.imagePrompt && <p className="arq-hint">Prompt: {item.imagePrompt}</p>}
              {item.imageStyle && <p className="arq-hint">Style: {item.imageStyle}</p>}
            </section>
          )}

          {sugg && (
            <section className="arq-modal-section arq-community-box">
              <h3>📌 Đề xuất đăng vào hội nhóm</h3>
              {sugg.roomId     && <p><b>Room:</b> {sugg.roomId}</p>}
              {sugg.roomName   && <p><b>Nhóm:</b> {sugg.roomName}</p>}
              {sugg.postTitle  && <p><b>Tiêu đề:</b> {sugg.postTitle}</p>}
              {sugg.postBody   && <p><b>Nội dung:</b> {sugg.postBody}</p>}
              <p className="arq-hint">⚠️ Phase 2C.1 chưa publish vào hội nhóm</p>
            </section>
          )}

          <section className="arq-modal-section arq-meta-box">
            <h3>Thông tin nguồn</h3>
            <div className="arq-meta-grid">
              {item.authorName       && <><span>Tác giả</span><span>{item.authorName}</span></>}
              {item.authorType       && <><span>Loại tác giả</span><span>{item.authorType}</span></>}
              {item.transparencyLabel && <><span>Nhãn AI</span><span>{item.transparencyLabel}</span></>}
              {item.sourceModel      && <><span>Model</span><span>{item.sourceModel}</span></>}
              {item.safetyNotes      && <><span>Safety</span><span>{item.safetyNotes}</span></>}
            </div>
          </section>
        </div>

        {/* ── Review Actions ── */}
        <div className="arq-modal-footer">
          <div className="arq-note-wrap">
            <label htmlFor="review-note">Ghi chú nội bộ (không hiện cho user)</label>
            <textarea
              id="review-note"
              className="arq-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Ghi chú cho admin (tuỳ chọn)…"
              rows={2}
              maxLength={NOTE_MAX}
            />
            <span className="arq-count">{notes.length}/{NOTE_MAX}</span>
          </div>

          {err && <p className="arq-error">{err}</p>}
          {saved && <p className="arq-success">✓ Đã lưu trạng thái</p>}

          <div className="arq-action-row">
            <button
              className="arq-btn arq-btn-neutral"
              disabled={saving || status === 'pending_review'}
              onClick={() => requestUpdate('pending_review')}
            >Giữ chờ duyệt</button>
            <button
              className="arq-btn arq-btn-warn"
              disabled={saving || status === 'needs_edit'}
              onClick={() => requestUpdate('needs_edit')}
            >Cần chỉnh sửa</button>
            <button
              className="arq-btn arq-btn-approve"
              disabled={saving || status === 'approved_for_publish'}
              onClick={() => requestUpdate('approved_for_publish')}
            >✓ Duyệt</button>
            <button
              className="arq-btn arq-btn-reject"
              disabled={saving || status === 'rejected'}
              onClick={() => requestUpdate('rejected')}
            >✕ Từ chối</button>
          </div>
        </div>

        {/* ── Confirm Dialog ── */}
        {confirm && (
          <div className="arq-confirm-overlay">
            <div className="arq-confirm-box">
              <p>{confirm.message}</p>
              <div className="arq-confirm-actions">
                <button className="arq-btn arq-btn-ghost" onClick={() => setConfirm(null)}>Huỷ</button>
                <button
                  className="arq-btn arq-btn-primary"
                  disabled={saving}
                  onClick={() => doUpdate(confirm.nextStatus)}
                >{saving ? 'Đang lưu…' : 'Xác nhận'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminReviewQueueScreen({ authUser }) {
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [items,        setItems]        = useState([]);
  const [fetchErr,     setFetchErr]     = useState('');
  const [selected,     setSelected]     = useState(null); // item for detail modal

  // ── Filters ────────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterAud,    setFilterAud]    = useState('');

  // ── Admin check ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkIsAdmin(authUser?.uid);
      if (!cancelled) { setIsAdmin(ok); setAdminChecked(true); }
    })();
    return () => { cancelled = true; };
  }, [authUser?.uid]);

  // ── Fetch queue items ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminChecked || !isAdmin) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setFetchErr('');
    (async () => {
      try {
        const q = query(
          collection(db, 'aiContentReviewQueue'),
          orderBy('importedAt', 'desc')
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        if (!cancelled) setFetchErr('Không tải được dữ liệu: ' + (e.message || 'Lỗi không xác định'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminChecked, isAdmin]);

  // ── Local update after review action (optimistic) ─────────────────────────
  const handleUpdate = useCallback((id, newStatus, newNotes) => {
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, reviewStatus: newStatus, reviewNotes: newNotes } : it
    ));
    setSelected(prev => prev?.id === id ? { ...prev, reviewStatus: newStatus, reviewNotes: newNotes } : prev);
  }, []);

  // ── Derived filter options ─────────────────────────────────────────────────
  const types = [...new Set(items.map(i => i.contentType).filter(Boolean))];
  const cats  = [...new Set(items.map(i => i.category).filter(Boolean))];
  const auds  = [...new Set(items.map(i => i.targetAudience).filter(Boolean))];

  const q = search.toLowerCase();
  const filtered = items.filter(it => {
    if (filterStatus && it.reviewStatus !== filterStatus) return false;
    if (filterType   && it.contentType  !== filterType)   return false;
    if (filterCat    && it.category     !== filterCat)    return false;
    if (filterAud    && it.targetAudience !== filterAud)  return false;
    if (q) {
      const hay = [it.title, it.summary, ...(it.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // ── Guard: not admin ───────────────────────────────────────────────────────
  if (adminChecked && !isAdmin) {
    return (
      <div className="arq-denied">
        <span className="arq-denied-icon">🔒</span>
        <h2>Không có quyền truy cập</h2>
        <p>Màn hình này chỉ dành cho quản trị viên.</p>
      </div>
    );
  }

  if (!adminChecked || loading) {
    return (
      <div className="arq-loading">
        <div className="arq-spinner" />
        <p>Đang tải hàng chờ duyệt…</p>
      </div>
    );
  }

  return (
    <div className="arq-root">
      {/* ── Header ── */}
      <header className="arq-header">
        <div className="arq-header-text">
          <h1 className="arq-title">Hàng chờ duyệt nội dung AI</h1>
          <p className="arq-subtitle">
            Xem và duyệt các bài đã import từ Content Studio.&nbsp;
            <strong>Phase này chưa đăng bài công khai.</strong>
          </p>
        </div>
        <div className="arq-counts">
          <span className="arq-count-chip arq-count-total">{items.length} bài</span>
          <span className="arq-count-chip arq-count-pending">
            {items.filter(i => i.reviewStatus === 'pending_review').length} chờ duyệt
          </span>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="arq-filters">
        <input
          className="arq-search"
          type="search"
          placeholder="Tìm tiêu đề, tóm tắt, tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Tìm kiếm bài viết"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Lọc theo trạng thái">
          {REVIEW_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {types.length > 0 && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="Lọc theo loại nội dung">
            <option value="">Tất cả loại</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {cats.length > 0 && (
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} aria-label="Lọc theo danh mục">
            <option value="">Tất cả danh mục</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {auds.length > 0 && (
          <select value={filterAud} onChange={e => setFilterAud(e.target.value)} aria-label="Lọc theo đối tượng">
            <option value="">Tất cả đối tượng</option>
            {auds.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {(search || filterStatus || filterType || filterCat || filterAud) && (
          <button className="arq-clear-btn" onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterCat(''); setFilterAud(''); }}>
            ✕ Xoá bộ lọc
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {fetchErr && <div className="arq-fetch-err">{fetchErr}</div>}

      {/* ── Empty state ── */}
      {!fetchErr && filtered.length === 0 && (
        <div className="arq-empty">
          <span className="arq-empty-icon">{items.length === 0 ? '📭' : '🔍'}</span>
          <p>{items.length === 0
            ? 'Chưa có bài nào trong hàng chờ. Hãy import từ Content Studio.'
            : 'Không có bài nào khớp với bộ lọc.'
          }</p>
        </div>
      )}

      {/* ── List ── */}
      {filtered.length > 0 && (
        <ul className="arq-list-wrap" role="list">
          {filtered.map(item => (
            <li key={item.id} className="arq-card" role="listitem">
              <div className="arq-card-top">
                <StatusBadge status={item.reviewStatus} />
                {item.communityPostSuggestion && (
                  <span className="arq-community-chip" title="Có đề xuất đăng hội nhóm">📌 Hội nhóm</span>
                )}
              </div>
              <h3 className="arq-card-title">{item.title || '(Không có tiêu đề)'}</h3>
              {item.summary && <p className="arq-card-summary">{item.summary.slice(0, 120)}{item.summary.length > 120 ? '…' : ''}</p>}
              <div className="arq-card-meta">
                {item.category      && <span>{item.category}</span>}
                {item.contentType   && <span>{item.contentType}</span>}
                {item.targetAudience && <span>{item.targetAudience}</span>}
                <span className="arq-card-date">{fmtDate(item.importedAt)}</span>
              </div>
              <button
                className="arq-card-btn"
                onClick={() => setSelected(item)}
                aria-label={`Xem chi tiết: ${item.title}`}
              >Xem & Duyệt →</button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <DetailModal
          item={selected}
          authUid={authUser?.uid}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
