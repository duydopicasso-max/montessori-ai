/**
 * UserProfileSheet.jsx
 * Premium profile bottom sheet for Community tab
 * - Opens on avatar tap in PostCard / ChatBubble
 * - Shows stats, recent post, DM CTA
 * - Reuses DMRequestSheet for invite flow
 */
import { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, query, where,
  orderBy, limit, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase.js';
import './user-profile-sheet.css';

/* ── Inline icons (line, no emoji) ── */
const CloseIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const MoreVertIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);
const HeartIcon = ({ filled }) => (
  <svg width={14} height={14} viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const CommentIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const UserIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MessageCircleIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ── Avatar ── */
function Avatar({ name, photo, size = 72 }) {
  const initials = (name || '?').trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const hue = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;

  if (photo && photo.startsWith('http')) {
    return (
      <img
        src={photo} alt={name || 'Avatar'}
        className="ups-avatar-img"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="ups-avatar-initial"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `hsl(${hue}, 55%, 72%)`,
        color: '#fff', fontSize: size * 0.38, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
      {initials}
    </div>
  );
}

/* ── Relative time ── */
function relTime(ts) {
  if (!ts) return '';
  const d    = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return 'Vừa xong';
  if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Join date formatter ── */
function joinDate(ts) {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
}

/* ════════════════════════════════════════════════
   Main UserProfileSheet Component
════════════════════════════════════════════════ */
export default function UserProfileSheet({
  user,              // { uid, name, photo, baby, isAnon }
  currentUser,       // { uid, name, photo, baby }
  activeRoom,        // { id, isCustom, name } — for fetching recent post in context
  conversations,     // passed from CommunityScreen state
  onClose,
  onSendDMRequest,   // (toUser) => void — opens DMRequestSheet
  onOpenConversation,// (conv) => void — opens PrivateChatView
}) {
  const [profile, setProfile]       = useState(null);   // Firestore user doc
  const [recentPost, setRecentPost] = useState(null);
  const [dmStatus, setDmStatus]     = useState('none'); // 'none'|'pending'|'accepted'
  const [existingConv, setExistingConv] = useState(null);
  const [stats, setStats]           = useState({ posts: 0, likes: 0 });
  const [loading, setLoading]       = useState(true);
  const [showMenu, setShowMenu]     = useState(false);

  const sheetRef = useRef(null);
  const isSelf   = user?.uid === currentUser?.uid;

  /* ── Lock body scroll ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  /* ── Fetch data ── */
  useEffect(() => {
    if (!user?.uid || user?.isAnon) { setLoading(false); return; }

    const run = async () => {
      try {
        /* 1. DM status — check existing conversations first */
        const conv = conversations?.find(c => c.participantIds?.includes(user.uid));
        if (conv) {
          setDmStatus('accepted');
          setExistingConv(conv);
        } else {
          /* Check pending dmRequest I sent — 2 fields only, no composite index */
          const reqSnap = await getDocs(query(
            collection(db, 'dmRequests'),
            where('fromUserId', '==', currentUser.uid),
            where('toUserId',   '==', user.uid),
          ));
          const hasPending = reqSnap.docs.some(d => d.data().status === 'pending');
          if (hasPending) setDmStatus('pending');
        }

        /* 2. Fetch Firestore user profile (optional, graceful fallback) */
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) setProfile(userDoc.data());
        } catch { /* no profile doc — that's OK */ }

        /* 3. Fetch stats + recent post from current room (if in a room) */
        if (activeRoom?.id) {
          const colName = activeRoom.isCustom ? 'customRooms' : 'chatRooms';
          const msgsRef = collection(db, colName, activeRoom.id, 'messages');

          /* Stats: posts + total likes in this room */
          const allSnap = await getDocs(query(msgsRef, where('senderId', '==', user.uid)));
          const postCount  = allSnap.docs.filter(d => !d.data().isAI).length;
          const totalLikes = allSnap.docs.reduce((s, d) => s + (d.data().likes || 0), 0);
          setStats({ posts: postCount, likes: totalLikes });

          /* Recent post: latest 1 */
          const recentSnap = await getDocs(query(
            msgsRef,
            where('senderId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1),
          ));
          if (!recentSnap.empty) {
            setRecentPost({ id: recentSnap.docs[0].id, ...recentSnap.docs[0].data() });
          }
        }
      } catch (e) {
        console.error('[UserProfileSheet]', e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user?.uid, currentUser?.uid, activeRoom?.id]);

  /* ── CTA handler ── */
  const handleCTA = () => {
    if (dmStatus === 'accepted' && existingConv) {
      onOpenConversation?.(existingConv);
      onClose();
      return;
    }
    if (dmStatus === 'none') {
      onSendDMRequest?.({ uid: user.uid, name: user.name, photo: user.photo, baby: user.baby });
    }
  };

  /* ── Context label ── */
  const contextLabel = (() => {
    const parts = [];
    if (user?.baby) parts.push(`Mẹ của ${user.baby}`);
    if (activeRoom?.name) parts.push(activeRoom.name);
    return parts.join(' · ') || 'Thành viên Montessori AI';
  })();

  const joinedDate = profile?.createdAt ? joinDate(profile.createdAt) : null;
  const bio        = profile?.bio || null;

  return (
    <div className="ups-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="ups-sheet"
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drag handle ── */}
        <div className="ups-handle" />

        {/* ── Top bar ── */}
        <div className="ups-topbar">
          <button className="ups-icon-btn" onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
          <div className="ups-topbar-spacer" />
          {!user?.isAnon && !isSelf && (
            <div className="ups-menu-wrap">
              <button
                className="ups-icon-btn"
                aria-label="Tuỳ chọn"
                onClick={() => setShowMenu(v => !v)}
              >
                <MoreVertIcon />
              </button>
              {showMenu && (
                <div className="ups-menu-dropdown" onClick={() => setShowMenu(false)}>
                  <button className="ups-menu-item">Báo cáo</button>
                  <button className="ups-menu-item ups-menu-item--danger">Chặn</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="ups-scroll">

          {/* ── Avatar + name ── */}
          <div className="ups-profile-hero">
            {user?.isAnon ? (
              <div className="ups-anon-avatar">{user.photo || '🙈'}</div>
            ) : (
              <div className="ups-avatar-wrap">
                <Avatar name={user?.name} photo={user?.photo} size={80} />
              </div>
            )}
            <h2 className="ups-name">{user?.name || 'Thành viên'}</h2>
            <p className="ups-context">{user?.isAnon ? 'Thành viên ẩn danh' : contextLabel}</p>
            {joinedDate && (
              <p className="ups-join-date">Thành viên từ {joinedDate}</p>
            )}
            {bio && <p className="ups-bio">"{bio}"</p>}
          </div>

          {/* ── Anon notice ── */}
          {user?.isAnon && (
            <div className="ups-anon-notice">
              <UserIcon />
              <p>Thành viên này đang dùng chế độ ẩn danh. Thông tin được bảo mật.</p>
            </div>
          )}

          {/* ── Stats (only when in a room) ── */}
          {!user?.isAnon && activeRoom?.id && (
            <div className="ups-stats-row">
              <div className="ups-stat">
                <span className="ups-stat-num">{loading ? '—' : stats.posts}</span>
                <span className="ups-stat-label">Bài viết</span>
              </div>
              <div className="ups-stat-divider" />
              <div className="ups-stat">
                <span className="ups-stat-num">{loading ? '—' : stats.likes}</span>
                <span className="ups-stat-label">Lượt thích</span>
              </div>
              <div className="ups-stat-divider" />
              <div className="ups-stat">
                <span className="ups-stat-num">{activeRoom?.name ? '•••' : '—'}</span>
                <span className="ups-stat-label">Phòng</span>
              </div>
            </div>
          )}

          {/* ── Recent post ── */}
          {!user?.isAnon && recentPost && (
            <div className="ups-recent-section">
              <h3 className="ups-section-title">Bài viết gần đây</h3>
              <div className="ups-recent-card">
                {recentPost.images?.length > 0 && (
                  <img
                    src={recentPost.images[0]}
                    alt="ảnh bài viết"
                    className="ups-recent-thumb"
                  />
                )}
                <div className="ups-recent-body">
                  {recentPost.title && (
                    <p className="ups-recent-title">{recentPost.title}</p>
                  )}
                  {recentPost.text && (
                    <p className="ups-recent-text">
                      {recentPost.text.length > 80
                        ? recentPost.text.slice(0, 80) + '…'
                        : recentPost.text}
                    </p>
                  )}
                  <div className="ups-recent-meta">
                    <span className="ups-recent-time">{relTime(recentPost.createdAt)}</span>
                    <span className="ups-recent-stats">
                      <HeartIcon />
                      <span>{recentPost.likes || 0}</span>
                      <CommentIcon />
                      <span>{recentPost.replies || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spacing for CTA */}
          <div style={{ height: 24 }} />
        </div>

        {/* ── CTA Button ── */}
        {!isSelf && !user?.isAnon && (
          <div className="ups-cta-wrap">
            {dmStatus === 'pending' ? (
              <button className="ups-cta-btn ups-cta-btn--sent" disabled>
                <CheckCircleIcon />
                <span>Đã gửi lời mời</span>
              </button>
            ) : dmStatus === 'accepted' ? (
              <button className="ups-cta-btn" onClick={handleCTA}>
                <MessageCircleIcon />
                <span>Nhắn tin</span>
              </button>
            ) : (
              <button className="ups-cta-btn" onClick={handleCTA}>
                <MessageCircleIcon />
                <span>Gửi lời mời nhắn tin</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
