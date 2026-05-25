/**
 * PrivateChatView.jsx
 * 1-on-1 private chat screen (Phase 1 — text only).
 *
 * Features:
 * - Real-time messages via Firestore sub-collection (conversations/{id}/messages)
 * - Bubble layout (me=right/green, other=left/white)
 * - Day separators + timestamp grouping
 * - Safety notice card at top of conversation
 * - Health room disclaimer (if fromRoom === 'health')
 * - Personal info soft warning (phone/email/URL detection)
 * - Block/Report/Delete via 3-dot menu
 * - Composer: font-size 16px (no iOS zoom), sticky above bottom nav
 * - "Delete for me only" (soft delete: hiddenFor array)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy, limit,
  serverTimestamp, doc, updateDoc, arrayUnion, getDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase.js';
import ReportSheet from './ReportSheet.jsx';
import './dm.css';

/* ─── Inline icons ─── */
const BackIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const MoreIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5"  r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
  </svg>
);
const SendIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ShieldIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
const WarnIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ─── Helpers ─── */
function Avatar({ name, photo, size = 36 }) {
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

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long' });
}

/** Detect potential personal info: phone numbers, emails, URLs */
const PERSONAL_INFO_PATTERN = /(\d{9,11})|(@[^\s]+\.[a-z]{2,})|(https?:\/\/[^\s]+)|([\w.]+@[\w.]+\.\w{2,})/i;

function hasPersonalInfo(text) {
  return PERSONAL_INFO_PATTERN.test(text);
}

/* ─── Component ─── */
export default function PrivateChatView({ conversation, currentUser, onBack }) {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [sending, setSending]         = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [toast, setToast]             = useState('');
  const [showInfoWarn, setShowInfoWarn] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const menuRef    = useRef(null);

  const convId     = conversation.id;
  const otherUid   = conversation.participantIds?.find(id => id !== currentUser?.uid);
  const otherData  = conversation.participantData?.[otherUid] || {};
  const otherName  = otherData.name  || 'Thành viên';
  const otherPhoto = otherData.photo || '';
  const otherBaby  = otherData.baby;
  const otherWeek  = otherData.pregnancyWeek;
  const otherSub   = otherBaby
    ? `Mẹ của ${otherBaby}`
    : otherWeek ? `Mẹ bầu tuần ${otherWeek}` : 'Thành viên cộng đồng';

  const isBlocked   = conversation.blockedBy?.includes(currentUser?.uid);
  const iBlockedThem = conversation.blockedBy?.includes(currentUser?.uid);
  const theyBlockedMe = conversation.blockedBy?.includes(otherUid);
  const isFromHealth = conversation.fromRoom === 'health';
  const isAnyBlocked = (conversation.blockedBy?.length || 0) > 0;

  /* ── Subscribe messages ── */
  useEffect(() => {
    if (!convId) return;
    const q = query(
      collection(db, 'conversations', convId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(80)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => !m.deletedFor?.includes(currentUser?.uid));
      setMessages(msgs);
      // Mark as read: update unreadCounts for currentUser
      if (currentUser?.uid) {
        updateDoc(doc(db, 'conversations', convId), {
          [`unreadCounts.${currentUser.uid}`]: 0,
        }).catch(() => {});
      }
    });
    return unsub;
  }, [convId, currentUser?.uid]);

  /* ── Scroll to bottom when messages change ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Close menu on outside click ── */
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showMenu]);

  /* ── Toast helper ── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  /* ── Send message ── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || isAnyBlocked) return;
    setSending(true);
    setInput('');
    setShowInfoWarn(false);
    try {
      const msgRef = collection(db, 'conversations', convId, 'messages');
      await addDoc(msgRef, {
        senderId:  currentUser.uid,
        text,
        createdAt: serverTimestamp(),
        readBy:    [currentUser.uid],
        deletedFor: [],
        status:    'sent',
      });
      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage:    text.length > 50 ? text.slice(0, 50) + '…' : text,
        lastMessageAt:  serverTimestamp(),
        [`unreadCounts.${otherUid}`]: (conversation.unreadCounts?.[otherUid] || 0) + 1,
      });
    } catch (e) {
      console.error('Send error:', e);
      showToast('Gửi thất bại. Vui lòng thử lại.');
      setInput(text); // restore
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── Input change with personal info detection ── */
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    setShowInfoWarn(val.length > 5 && hasPersonalInfo(val));
  };

  /* ── Handle Enter key ── */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Block user ── */
  const handleBlock = async () => {
    setShowMenu(false);
    try {
      await updateDoc(doc(db, 'conversations', convId), {
        blockedBy: arrayUnion(currentUser.uid),
      });
      showToast('Đã chặn cuộc trò chuyện');
    } catch (e) { console.error(e); }
  };

  /* ── Unblock ── */
  const handleUnblock = async () => {
    try {
      const convDoc = await getDoc(doc(db, 'conversations', convId));
      const blocked = convDoc.data()?.blockedBy?.filter(uid => uid !== currentUser.uid) || [];
      await updateDoc(doc(db, 'conversations', convId), { blockedBy: blocked });
      showToast('Đã bỏ chặn');
    } catch (e) { console.error(e); }
  };

  /* ── Delete for me (soft delete) ── */
  const handleDeleteForMe = async () => {
    setShowMenu(false);
    try {
      await updateDoc(doc(db, 'conversations', convId), {
        hiddenFor: arrayUnion(currentUser.uid),
      });
      showToast('Đã xóa khỏi hộp thư của mẹ');
      onBack();
    } catch (e) { console.error(e); }
  };

  /* ── Group messages by day ── */
  const grouped = [];
  let currentDay = null;
  messages.forEach(msg => {
    const day = msg.createdAt
      ? formatDay(msg.createdAt)
      : null;
    if (day && day !== currentDay) {
      grouped.push({ type: 'separator', label: day, key: `sep-${day}` });
      currentDay = day;
    }
    grouped.push({ type: 'message', msg, key: msg.id });
  });

  return (
    <div className="pc-screen">

      {/* ── HEADER ── */}
      <header className="pc-header">
        <button className="pc-back-btn" onClick={onBack} aria-label="Quay lại">
          <BackIcon size={20} />
        </button>

        <div className="pc-header-center">
          <Avatar name={otherName} photo={otherPhoto} size={36} />
          <div className="pc-header-info">
            <h2 className="pc-header-name">{otherName}</h2>
            <p className="pc-header-sub">{otherSub}</p>
          </div>
        </div>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="pc-menu-btn"
            onClick={() => setShowMenu(v => !v)}
            aria-label="Tùy chọn"
            aria-expanded={showMenu}
          >
            <MoreIcon size={20} />
          </button>

          {showMenu && (
            <div className="pc-menu-dropdown" role="menu">
              <button
                className="pc-menu-item"
                role="menuitem"
                onClick={() => { setShowMenu(false); }}
              >
                Xem hồ sơ
              </button>
              <div className="pc-menu-divider" />
              {iBlockedThem ? (
                <button className="pc-menu-item" role="menuitem" onClick={handleUnblock}>
                  Bỏ chặn mẹ này
                </button>
              ) : (
                <button className="pc-menu-item danger" role="menuitem" onClick={handleBlock}>
                  Chặn mẹ này
                </button>
              )}
              <button
                className="pc-menu-item danger"
                role="menuitem"
                onClick={() => { setShowMenu(false); setShowReport(true); }}
              >
                Báo cáo cuộc trò chuyện
              </button>
              <div className="pc-menu-divider" />
              <button className="pc-menu-item danger" role="menuitem" onClick={handleDeleteForMe}>
                Xóa khỏi hộp thư của tôi
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MESSAGE LIST ── */}
      <div className="pc-content">

        {/* Safety notice */}
        <div className="pc-safety-notice">
          <ShieldIcon size={14} />
          <p>
            Cuộc trò chuyện riêng tư. Mẹ có thể chặn hoặc báo cáo bất kỳ lúc nào qua menu ⋮ ở góc trên.
          </p>
        </div>

        {/* Health disclaimer */}
        {isFromHealth && (
          <p className="pc-health-disclaimer">
            Thông tin chia sẻ chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.
          </p>
        )}

        {/* Blocked state banner */}
        {isAnyBlocked && (
          <div className="pc-blocked-notice">
            <p>
              {iBlockedThem
                ? 'Bạn đã chặn cuộc trò chuyện này. Tin nhắn mới không thể gửi.'
                : 'Không thể tiếp tục cuộc trò chuyện này.'}
            </p>
            {iBlockedThem && (
              <button className="pc-unblock-btn" onClick={handleUnblock}>Bỏ chặn</button>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 && !isAnyBlocked && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Bắt đầu trò chuyện với {otherName} nhé!
          </div>
        )}

        {grouped.map(item => {
          if (item.type === 'separator') {
            return (
              <div key={item.key} className="chat-day-separator">
                <div className="chat-day-line" />
                <span className="chat-day-label">{item.label}</span>
                <div className="chat-day-line" />
              </div>
            );
          }

          const { msg } = item;
          const isMe = msg.senderId === currentUser?.uid;

          return (
            <div
              key={item.key}
              className={`chat-bubble-wrap ${isMe ? 'me' : 'other'}`}
            >
              <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                {msg.text}
              </div>
              {msg.createdAt && (
                <span className="bubble-meta">{formatTime(msg.createdAt)}</span>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── COMPOSER ── */}
      <div className="pc-composer-container">
        {/* Personal info soft warning */}
        {showInfoWarn && (
          <div className="pc-info-warning">
            <WarnIcon size={13} />
            <span>Mẹ cân nhắc trước khi chia sẻ thông tin cá nhân nhé.</span>
          </div>
        )}

        {isAnyBlocked ? (
          <div className="pc-blocked-composer">
            Không thể gửi tin nhắn trong cuộc trò chuyện này
          </div>
        ) : (
          <div className="pc-composer-bar">
            <textarea
              ref={inputRef}
              className="pc-input"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={1000}
              aria-label="Nhập tin nhắn"
            />
            <button
              className="pc-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              aria-label="Gửi tin nhắn"
            >
              <SendIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ── REPORT SHEET ── */}
      {showReport && (
        <ReportSheet
          conversationId={convId}
          reportedUserId={otherUid}
          currentUserId={currentUser?.uid}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* ── TOAST ── */}
      {toast && <div className="dm-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
