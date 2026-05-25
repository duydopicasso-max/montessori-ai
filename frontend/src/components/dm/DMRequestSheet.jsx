/**
 * DMRequestSheet.jsx
 * Bottom sheet to send a DM invitation (lời mời nhắn tin).
 *
 * Flow: Select topic + write intro message → submit → Firestore dmRequests
 *
 * Rate limit: localStorage-based, max 5 requests per 24h.
 * TODO Phase 2: Replace localStorage rate limit with server-side or Firestore-based solution.
 */
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import '../dm/dm.css';

const DM_TOPICS = ['Ăn dặm', 'Giấc ngủ', 'Sức khỏe', 'Thai kỳ', 'Sau sinh', 'Tâm sự', 'Khác'];
const MAX_INTRO_LEN = 300;
const RATE_LIMIT_KEY  = 'dm_invite_log'; // localStorage key
const RATE_LIMIT_MAX  = 5;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24h in ms

const CloseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function Avatar({ name, photo, size = 44 }) {
  const initials = (name || '?').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#A8D5B5', '#D5C5A8', '#B5D5C5', '#C5B5D5', '#D5B5B5'];
  const bg = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden', fontSize: size * 0.38,
      fontWeight: 800, color: '#2F6B4F', fontFamily: "'Nunito', sans-serif",
    }}>
      {photo
        ? <img src={photo} alt={name || '?'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : initials}
    </div>
  );
}

/** localStorage-based rate limiter — TODO: replace with server-side in Phase 2 */
function checkRateLimit() {
  const now = Date.now();
  let log;
  try { log = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]'); }
  catch { log = []; }
  const recent = log.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  return { allowed: recent.length < RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX - recent.length, log: recent };
}

function recordInvite() {
  const now = Date.now();
  let log;
  try { log = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]'); }
  catch { log = []; }
  const recent = log.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  recent.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
}

export default function DMRequestSheet({ toUser, currentUser, onClose, onSent }) {
  const [topic, setTopic]             = useState('');
  const [intro, setIntro]             = useState('');
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  const toName  = toUser?.name || 'Thành viên';
  const toPhoto = toUser?.photo || '';
  const toBaby  = toUser?.baby;
  const toWeek  = toUser?.pregnancyWeek;
  const toSub   = toBaby
    ? `Mẹ của ${toBaby}`
    : toWeek ? `Mẹ bầu tuần ${toWeek}` : 'Thành viên cộng đồng';

  const handleSend = async () => {
    if (!topic && !intro.trim()) {
      setError('Vui lòng chọn chủ đề hoặc viết lời nhắn mở đầu.');
      return;
    }

    // Rate limit check (localStorage — Phase 1 only)
    const { allowed } = checkRateLimit();
    if (!allowed) {
      setError('Mẹ đã gửi quá 5 lời mời trong 24 giờ. Vui lòng thử lại sau.');
      return;
    }

    if (!currentUser?.uid || !toUser?.uid) {
      setError('Không xác định được người dùng. Vui lòng thử lại.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Check if request already exists — use 2 fields only (no composite index needed)
      const existingQ = query(
        collection(db, 'dmRequests'),
        where('fromUserId', '==', currentUser.uid),
        where('toUserId',   '==', toUser.uid),
      );
      const existing = await getDocs(existingQ);
      const hasPending = existing.docs.some(d => d.data().status === 'pending');
      if (hasPending) {
        setError('Mẹ đã gửi lời mời cho người này rồi. Vui lòng đợi phản hồi.');
        setSubmitting(false);
        return;
      }


      await addDoc(collection(db, 'dmRequests'), {
        fromUserId:   currentUser.uid,
        toUserId:     toUser.uid,
        fromUserData: {
          name:            currentUser.name  || '',
          photo:           currentUser.photo || '',
          baby:            currentUser.baby  || '',
          pregnancyWeek:   currentUser.pregnancyWeek || null,
        },
        topic:        topic || '',
        introMessage: intro.trim(),
        status:       'pending',
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
      });

      recordInvite();
      onSent?.(`Đã gửi lời mời đến ${toName}`);
      onClose();
    } catch (e) {
      console.error('DMRequest error:', e);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dm-request-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <h3 className="sheet-title">Gửi lời mời nhắn tin</h3>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng"><CloseIcon /></button>
        </div>

        <p className="sheet-hint">
          Giới thiệu ngắn để mẹ kia biết mẹ muốn trao đổi về điều gì.
        </p>

        {/* Recipient preview */}
        <div className="dmrs-recipient-preview">
          <Avatar name={toName} photo={toPhoto} size={44} />
          <div className="dmrs-recipient-info">
            <p className="dmrs-recipient-name">{toName}</p>
            <p className="dmrs-recipient-sub">{toSub}</p>
          </div>
        </div>

        {/* Topic selector */}
        <p className="dmrs-section-label">Chủ đề muốn trao đổi</p>
        <div className="dmrs-topic-grid">
          {DM_TOPICS.map(t => (
            <button
              key={t}
              type="button"
              className={`dmrs-topic-chip ${topic === t ? 'active' : ''}`}
              onClick={() => setTopic(prev => prev === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Intro message */}
        <p className="dmrs-section-label">Lời nhắn mở đầu</p>
        <textarea
          className="dmrs-textarea"
          placeholder='Ví dụ: Chào mẹ, mình thấy bài chia sẻ của mẹ rất hữu ích. Mình muốn hỏi thêm một chút.'
          value={intro}
          onChange={e => { setIntro(e.target.value.slice(0, MAX_INTRO_LEN)); setError(''); }}
          rows={4}
        />
        <p className="dmrs-char-count">{intro.length}/{MAX_INTRO_LEN}</p>

        {/* Rate limit note */}
        <p className="dmrs-rate-limit-note">
          Để bảo vệ cộng đồng, mỗi mẹ có thể gửi tối đa 5 lời mời mỗi ngày.
        </p>

        {error && <p className="dmrs-error" role="alert">{error}</p>}

        {/* Actions */}
        <div className="dmrs-actions">
          <button className="dmrs-cancel-btn" onClick={onClose}>Hủy</button>
          <button
            className="dmrs-submit-btn"
            disabled={submitting || (!topic && !intro.trim())}
            onClick={handleSend}
          >
            {submitting ? 'Đang gửi…' : 'Gửi lời mời'}
          </button>
        </div>
      </div>
    </div>
  );
}
