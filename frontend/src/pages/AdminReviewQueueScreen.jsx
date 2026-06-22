/**
 * AdminReviewQueueScreen.jsx
 * Phase 2C.2 — Admin-only review queue with publish action.
 *
 * SAFETY CONTRACT:
 * - Only users where users/{uid}.role === 'admin' can access this screen.
 * - Publish only writes to chatRooms/{roomId}/messages (no other public collections).
 * - Only items with reviewStatus = 'approved_for_publish' and
 *   contentType = 'Bài đăng hội nhóm' can be published.
 * - Uses runTransaction for atomic duplicate protection.
 * - Review updates only touch: reviewStatus, reviewedAt, reviewedByUid, reviewNotes, updatedAt.
 * - Publish updates only touch: publishStatus, publishedAt, publishedByUid, publishedPostId, updatedAt.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, updateDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  publishApprovedAiContent, PUBLISH_RESULT, ROOM_NAME_TO_ID,
  normalizeImageUrl, isValidHttpsImageUrl,
} from '../utils/publishToRoom.js';
import './AdminReviewQueueScreen.css';

// ── Admin guard (same pattern as AdminImportScreen) ─────────────────────────
async function checkIsAdmin(uid) {
  if (import.meta.env.DEV) return true;
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
  const [status,        setStatus]       = useState(item.reviewStatus  || 'pending_review');
  const [publishStatus, setPublishStatus] = useState(item.publishStatus || '');
  const [publishedPostId, setPublishedPostId] = useState(item.publishedPostId || '');
  // Room admin can override AI suggestion before publishing
  const suggestedRoom = item.communityPostSuggestion?.room || '';
  const [selectedRoom,  setSelectedRoom] = useState(suggestedRoom);
  const [notes,         setNotes]        = useState(item.reviewNotes || '');
  const [confirm,       setConfirm]      = useState(null); // { type, nextStatus?, message }
  const [saving,        setSaving]       = useState(false);
  const [publishing,    setPublishing]   = useState(false);
  const [saved,         setSaved]        = useState(false);
  const [publishMsg,    setPublishMsg]   = useState('');
  const [err,           setErr]          = useState('');

  // Image URL editing states (Phase 2C.3B)
  const [inputImageUrl, setInputImageUrl] = useState(item.imageUrl || '');
  const [savedImageUrl, setSavedImageUrl] = useState(item.imageUrl || '');
  const [savingImg,     setSavingImg]    = useState(false);
  const [imgErr,        setImgErr]       = useState('');

  // Sync state when detail modal item changes
  useEffect(() => {
    setStatus(item.reviewStatus || 'pending_review');
    setPublishStatus(item.publishStatus || '');
    setPublishedPostId(item.publishedPostId || '');
    setSelectedRoom(item.communityPostSuggestion?.room || '');
    setNotes(item.reviewNotes || '');
    setInputImageUrl(item.imageUrl || '');
    setSavedImageUrl(item.imageUrl || '');
    setSavingImg(false);
    setImgErr('');
  }, [item]);

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
      onUpdate(item.id, { reviewStatus: nextStatus, reviewNotes: notes.trim().slice(0, NOTE_MAX) });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr('Lỗi khi cập nhật: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  }, [authUid, item.id, notes, onUpdate]);

  const doPublish = useCallback(async () => {
    setErr('');
    setPublishMsg('');
    setPublishing(true);
    setConfirm(null);
    try {
      const currentItem = { ...item, reviewStatus: status, publishStatus };
      // Pass selectedRoom as overrideRoom when admin changed it
      const overrideRoom = selectedRoom !== suggestedRoom ? selectedRoom : undefined;
      const res = await publishApprovedAiContent({ db, item: currentItem, adminUid: authUid, overrideRoom });
      if (res.result === PUBLISH_RESULT.SUCCESS) {
        setPublishStatus('published');
        setPublishedPostId(res.publishedPostId || '');
        setPublishMsg('Đã xuất bản bài vào cộng đồng.');
        onUpdate(item.id, { publishStatus: 'published', publishedPostId: res.publishedPostId });
      } else if (res.result === PUBLISH_RESULT.ALREADY_PUBLISHED) {
        setPublishStatus('published');
        setPublishedPostId(res.publishedPostId || item.publishedPostId || '');
        setPublishMsg('Bài này đã được xuất bản trước đó.');
        onUpdate(item.id, { publishStatus: 'published', publishedPostId: res.publishedPostId });
      } else {
        setErr(res.error || 'Lỗi không xác định khi xuất bản.');
      }
    } catch (e) {
      setErr('Lỗi khi xuất bản: ' + (e?.message || 'Lỗi không xác định'));
    } finally {
      setPublishing(false);
    }
  }, [authUid, item, status, publishStatus, onUpdate, selectedRoom, suggestedRoom]);

  const handleSaveImageUrl = useCallback(async () => {
    setImgErr('');
    setSavingImg(true);
    try {
      const norm = normalizeImageUrl(inputImageUrl);
      if (norm !== '') {
        if (!isValidHttpsImageUrl(norm)) {
          throw new Error('Link ảnh không hợp lệ. Vui lòng dùng URL HTTPS hợp lệ hoặc xoá ảnh để đăng bài không kèm ảnh.');
        }
      }
      const ref = doc(db, 'aiContentReviewQueue', item.id);
      await updateDoc(ref, {
        imageUrl: norm,
        updatedAt: serverTimestamp(),
      });
      setSavedImageUrl(norm);
      onUpdate(item.id, { imageUrl: norm });
    } catch (e) {
      setImgErr(e.message || 'Lỗi khi lưu link ảnh.');
    } finally {
      setSavingImg(false);
    }
  }, [item.id, inputImageUrl, onUpdate]);

  const requestUpdate = (nextStatus) => {
    if (nextStatus === 'approved_for_publish') {
      setConfirm({
        type: 'review',
        nextStatus,
        message: 'Bài này sẽ được đánh dấu là đã duyệt để chờ xuất bản. Bạn có muốn tiếp tục không?',
      });
    } else if (nextStatus === 'rejected') {
      setConfirm({ type: 'review', nextStatus, message: 'Bạn có chắc muốn từ chối bài này không?' });
    } else {
      doUpdate(nextStatus);
    }
  };

  const requestPublish = () => {
    const displayRoom = selectedRoom || suggestedRoom || '(chưa rõ nhóm)';
    const isOverridden = selectedRoom !== suggestedRoom;
    const overrideNote = isOverridden
      ? ` (bạn đã đổi từ "${suggestedRoom}")`
      : ' (theo đề xuất AI)';
    setConfirm({
      type: 'publish',
      message: `Bài này sẽ được đăng vào nhóm “${displayRoom}”${overrideNote} với tên Trợ lý Montessori. Hành động này sẽ tạo bài công khai trong cộng đồng. Bạn có chắc muốn tiếp tục không?`,
    });
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

          {(item.imagePrompt || item.imageUrl || inputImageUrl !== '' || savedImageUrl !== '') && (
            <section className="arq-modal-section">
              <h3>Hình ảnh bài viết</h3>
              
              <div className="arq-image-edit-wrap" style={{ marginTop: '8px', marginBottom: '12px' }}>
                <label htmlFor="image-url-input" className="arq-image-label" style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px', fontSize: '13px', color: '#555' }}>
                  Link ảnh (URL HTTPS hoặc rỗng để xoá ảnh)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="image-url-input"
                    type="text"
                    className="arq-input"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #ccc', fontSize: '14px', outline: 'none' }}
                    value={inputImageUrl}
                    onChange={(e) => setInputImageUrl(e.target.value)}
                    disabled={publishStatus === 'published' || saving || publishing || savingImg}
                    placeholder="https://example.com/image.jpg"
                  />
                  {inputImageUrl !== savedImageUrl && (
                    <button
                      className="arq-btn arq-btn-primary"
                      onClick={handleSaveImageUrl}
                      disabled={savingImg || publishStatus === 'published'}
                      style={{ whiteSpace: 'nowrap', borderRadius: '8px', padding: '8px 14px', background: '#2f6b4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {savingImg ? 'Đang lưu…' : 'Lưu link ảnh'}
                    </button>
                  )}
                </div>
                {imgErr && <p className="arq-error" style={{ color: '#c0392b', marginTop: '6px', fontSize: '13px', fontWeight: '500' }}>{imgErr}</p>}
              </div>

              {inputImageUrl.trim().startsWith('https://') && (
                <div className="arq-image-preview-box" style={{ marginTop: '12px', marginBottom: '12px' }}>
                  <img
                    src={inputImageUrl.trim()}
                    alt="Xem trước hình ảnh"
                    className="arq-image"
                    style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', borderRadius: '8px', border: '1px solid #ddd' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const parent = e.target.parentNode;
                      if (parent && !parent.querySelector('.arq-img-error-text')) {
                        const errText = document.createElement('p');
                        errText.className = 'arq-img-error-text';
                        errText.style.color = '#c0392b';
                        errText.style.fontSize = '13px';
                        errText.style.marginTop = '4px';
                        errText.innerText = 'Không thể tải ảnh từ URL này. Vui lòng kiểm tra lại link.';
                        parent.appendChild(errText);
                      }
                    }}
                    onLoad={(e) => {
                      e.target.style.display = 'block';
                      const parent = e.target.parentNode;
                      const errText = parent?.querySelector('.arq-img-error-text');
                      if (errText) {
                        errText.remove();
                      }
                    }}
                  />
                </div>
              )}

              {item.imagePrompt && (
                <p className="arq-hint" style={{ marginTop: '8px', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                  <b>Prompt gợi ý:</b> {item.imagePrompt}
                </p>
              )}
              {item.imageStyle && (
                <p className="arq-hint" style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                  <b>Style:</b> {item.imageStyle}
                </p>
              )}
            </section>
          )}

          {sugg && (
            <section className="arq-modal-section arq-community-box">
              <h3>📌 Đề xuất đăng vào hội nhóm</h3>

              {/* Room selector — admin can override AI suggestion */}
              <div className="arq-room-selector-wrap">
                <label htmlFor="room-select" className="arq-room-label">
                  Nhóm đăng
                  {selectedRoom !== suggestedRoom && (
                    <span className="arq-room-changed-badge">(đã đổi)</span>
                  )}
                </label>
                <select
                  id="room-select"
                  className="arq-room-select"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  disabled={publishStatus === 'published' || publishing}
                >
                  {Object.keys(ROOM_NAME_TO_ID).map((name) => (
                    <option key={name} value={name}>
                      {name}{name === suggestedRoom ? ' — đề xuất AI' : ''}
                    </option>
                  ))}
                </select>
                {selectedRoom !== suggestedRoom && suggestedRoom && (
                  <p className="arq-hint arq-room-ai-note">
                    AI đề xuất: “{suggestedRoom}” —
                    <button
                      className="arq-room-reset"
                      onClick={() => setSelectedRoom(suggestedRoom)}
                    >khôi phục</button>
                  </p>
                )}
              </div>

              {sugg.postTitle && <p className="arq-sugg-field"><b>Tiêu đề:</b> {sugg.postTitle}</p>}
              {sugg.postBody  && <p className="arq-sugg-field"><b>Nội dung:</b> {sugg.postBody}</p>}
              {sugg.engagementQuestion && <p className="arq-sugg-field"><b>Câu hỏi gợi mở:</b> {sugg.engagementQuestion}</p>}

              {/* Publish status */}
              {publishStatus === 'published' ? (
                <div className="arq-publish-done">
                  <span className="arq-publish-check">✓</span>
                  <span>Đã xuất bản vào cộng đồng</span>
                  {publishedPostId && (
                    <p className="arq-hint arq-publish-path">{publishedPostId}</p>
                  )}
                </div>
              ) : (
                status === 'approved_for_publish' && item.contentType === 'Bài đăng hội nhóm' && (
                  <p className="arq-hint arq-publish-ready">Bài đã duyệt — sẵn sàng xuất bản</p>
                )
              )}
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

          {err        && <p className="arq-error">{err}</p>}
          {saved      && <p className="arq-success">✓ Đã lưu trạng thái</p>}
          {publishMsg && <p className="arq-success">{publishMsg}</p>}

          {/* ── Review status actions ── */}
          <div className="arq-action-row">
            <button
              className="arq-btn arq-btn-neutral"
              disabled={saving || publishing || status === 'pending_review'}
              onClick={() => requestUpdate('pending_review')}
            >Giữ chờ duyệt</button>
            <button
              className="arq-btn arq-btn-warn"
              disabled={saving || publishing || status === 'needs_edit'}
              onClick={() => requestUpdate('needs_edit')}
            >Cần chỉnh sửa</button>
            <button
              className="arq-btn arq-btn-approve"
              disabled={saving || publishing || status === 'approved_for_publish'}
              onClick={() => requestUpdate('approved_for_publish')}
            >✓ Duyệt</button>
            <button
              className="arq-btn arq-btn-reject"
              disabled={saving || publishing || status === 'rejected'}
              onClick={() => requestUpdate('rejected')}
            >✕ Từ chối</button>
          </div>

          {/* ── Publish action (only for approved community posts) ── */}
          {item.contentType === 'Bài đăng hội nhóm' && (
            <div className="arq-publish-row">
              {publishStatus === 'published' ? (
                <button className="arq-btn arq-btn-published" disabled>
                  ✓ Đã xuất bản
                </button>
              ) : (
                <>
                  <button
                    className="arq-btn arq-btn-publish"
                    disabled={publishing || saving || status !== 'approved_for_publish' || inputImageUrl !== savedImageUrl}
                    onClick={requestPublish}
                    title={
                      status !== 'approved_for_publish'
                        ? 'Bài cần được duyệt trước khi xuất bản'
                        : inputImageUrl !== savedImageUrl
                          ? 'Vui lòng lưu link ảnh trước khi xuất bản'
                          : ''
                    }
                  >
                    {publishing ? 'Đang xuất bản…' : 'Xuất bản'}
                  </button>
                  {status === 'approved_for_publish' && inputImageUrl !== savedImageUrl && (
                    <p className="arq-publish-warning-hint" style={{ color: '#b05800', marginTop: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      Vui lòng lưu link ảnh trước khi xuất bản.
                    </p>
                  )}
                </>
              )}
              {status !== 'approved_for_publish' && publishStatus !== 'published' && (
                <p className="arq-hint arq-publish-hint">Duyệt bài trước để kích hoạt xuất bản</p>
              )}
            </div>
          )}
        </div>

        {/* ── Confirm Dialog ── */}
        {confirm && (
          <div className="arq-confirm-overlay">
            <div className="arq-confirm-box">
              <p>{confirm.message}</p>
              <div className="arq-confirm-actions">
                <button className="arq-btn arq-btn-ghost" onClick={() => setConfirm(null)}>Huỷ</button>
                {confirm.type === 'publish' ? (
                  <button
                    className="arq-btn arq-btn-publish"
                    disabled={publishing}
                    onClick={doPublish}
                  >{publishing ? 'Đang xuất bản…' : 'Xác nhận xuất bản'}</button>
                ) : (
                  <button
                    className="arq-btn arq-btn-primary"
                    disabled={saving}
                    onClick={() => doUpdate(confirm.nextStatus)}
                  >{saving ? 'Đang lưu…' : 'Xác nhận'}</button>
                )}
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

  // ── Local update after review or publish action (optimistic) ───────────────
  const handleUpdate = useCallback((id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch } : prev);
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
