/**
 * CommunityScreen.jsx — Tối ưu UX cộng đồng an toàn
 * - Cá nhân hóa phòng gợi ý theo user.status (pregnant / parent)
 * - Search bar, safety card, rich room metadata
 * - Segment tabs: Phòng cộng đồng / Hộp thư
 * - Skeleton loading, empty states, create room bottom sheet
 * - Phase 1 DM: InboxView, DMRequestSheet, PrivateChatView tách riêng
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, limit, updateDoc, doc, deleteDoc, getDocs, where, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './CommunityScreen.css';
import {
  PregnancyIcon, FoodBowlIcon, SleepMoonIcon,
  HealthHeartIcon, FamilyIcon, ChatBubbleIcon
} from '../icons.jsx';
import InboxView from '../components/dm/InboxView.jsx';
import DMRequestSheet from '../components/dm/DMRequestSheet.jsx';
import PrivateChatView from '../components/dm/PrivateChatView.jsx';
import UserProfileSheet from '../components/community/UserProfileSheet.jsx';

/* ── Room icon map ── */
const ROOM_ICON_MAP = {
  pregnancy: PregnancyIcon,
  weaning:   FoodBowlIcon,
  sleep:     SleepMoonIcon,
  health:    HealthHeartIcon,
  family:    FamilyIcon,
};

/* ── Static room list with richer metadata ── */
const CHAT_ROOMS = [
  {
    id: 'pregnancy',
    name: 'Góc Mẹ Bầu',
    desc: 'Hành trình mang thai, thai giáo, chuẩn bị đón bé',
    unreadCount: 18,
    forStatus: 'pregnant',
    disclaimer: null,
    tags: ['mẹ bầu', 'thai kỳ', 'mang thai', 'thai giáo', 'sinh', 'thai đôi'],
  },
  {
    id: 'weaning',
    name: 'Hành Trình Ăn Dặm',
    desc: 'Thực đơn BLW, kiểu Nhật, truyền thống · Kinh nghiệm thực tế',
    unreadCount: 6,
    forStatus: 'parent',
    disclaimer: null,
    tags: ['ăn dặm', 'blw', 'thức ăn', 'dinh dưỡng', 'thực đơn', 'bé ăn'],
  },
  {
    id: 'sleep',
    name: 'Rèn Ngủ Xuyên Đêm',
    desc: 'EASY, luyện ngủ tự lập, tuần khủng hoảng (Wonder Weeks)',
    unreadCount: 11,
    forStatus: 'parent',
    disclaimer: null,
    tags: ['ngủ', 'giấc ngủ', 'luyện ngủ', 'thức đêm', 'easy', 'wonder weeks'],
  },
  {
    id: 'health',
    name: 'Sức Khoẻ Mẹ & Bé',
    desc: 'Kinh nghiệm chăm sóc bé ốm, phục hồi sau sinh',
    unreadCount: 3,
    forStatus: 'all',
    disclaimer: 'Thông tin chia sẻ chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.',
    tags: ['sức khỏe', 'bé ốm', 'sau sinh', 'phục hồi', 'y tế', 'khám'],
  },
  {
    id: 'family',
    name: 'Chuyện Gia Đình',
    desc: 'Tâm sự chuyện vợ chồng, bỉm sữa, cân bằng cuộc sống',
    unreadCount: 0,
    forStatus: 'all',
    disclaimer: null,
    tags: ['gia đình', 'tâm sự', 'chồng', 'cân bằng', 'bỉm sữa', 'sau sinh'],
  },
];

const ANIMAL_NAMES  = ['Thỏ Ngọc', 'Gấu Misa', 'Cún Con', 'Mèo Ú', 'Sóc Nhỏ', 'Cáo Nâu', 'Hươu Cao Cổ', 'Chim Cánh Cụt'];
const ANIMAL_EMOJIS = ['🐰', '🐻', '🐶', '🐱', '🐿️', '🦊', '🦒', '🐧'];

/* ── Room chips for quick-create ── */
const QUICK_CHIPS = [
  { label: 'Mẹ bầu cùng tháng', name: 'Mẹ bầu cùng tháng', topic: 'Mẹ bầu' },
  { label: 'Bé cùng độ tuổi',   name: 'Bé cùng độ tuổi',   topic: 'Gia đình' },
  { label: 'Ăn dặm hôm nay',   name: 'Ăn dặm hôm nay',    topic: 'Ăn dặm' },
  { label: 'Mẹ cần tâm sự',    name: 'Mẹ cần tâm sự',     topic: 'Gia đình' },
];

const TOPIC_CHIPS = ['Mẹ bầu', 'Ăn dặm', 'Giấc ngủ', 'Sức khỏe', 'Gia đình', 'Montessori', 'Khác'];

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/* ── Inline icons ── */
const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ShieldIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ChevronRightIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MessageIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const PlusIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CloseIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const RefreshIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
export default function CommunityScreen({ profile, onNotificationCountChange }) {
  const user        = profile?.user;
  const babies      = profile?.babies || [];
  const userStatus  = user?.status || 'parent'; // 'pregnant' | 'parent'
  const authorName  = profile?.momName || user?.displayName?.split(' ')[0] || 'Mẹ';
  const authorPhoto = user?.photoURL || '';
  const authorBaby  = babies[0]?.name || '';
  const babyAgeMonths = (() => {
    const dob = babies[0]?.dob;
    if (!dob) return null;
    const months = Math.round((new Date() - new Date(dob)) / (1000 * 60 * 60 * 24 * 30.4375));
    return Math.max(0, months);
  })();

  const [tab, setTab]                       = useState('rooms');
  const [activeRoom, setActiveRoom]         = useState(null);
  const [customRooms, setCustomRooms]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  // DM Phase 1
  const [dmRequests, setDmRequests]           = useState([]); // incoming pending requests
  const [conversations, setConversations]     = useState([]); // accepted conversations
  const [activeConversation, setActiveConversation] = useState(null);
  const [showDMRequestSheet, setShowDMRequestSheet] = useState(null); // { uid, name, photo, baby }
  const [dmToast, setDmToast]                 = useState('');

  // Compute unread conversation count (messages not yet read by current user)
  const unreadConvCount = conversations.filter(c => {
    const myCount = c.unreadCounts?.[user?.uid];
    return myCount && myCount > 0;
  }).length;

  // Total inbox notification = pending DM requests + conversations with unread messages
  const inboxBadgeCount = dmRequests.length + unreadConvCount;
  const inboxBadgeLabel = inboxBadgeCount > 9 ? '9+' : inboxBadgeCount > 0 ? String(inboxBadgeCount) : null;

  /* ── Load custom rooms (with 3-day auto-expire) ── */
  useEffect(() => {
    const q = query(collection(db, 'customRooms'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const now = Date.now();
      const valid = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const last = data.lastMessageAt?.toMillis() || data.createdAt?.toMillis() || now;
        if ((now - last) / (1000 * 60 * 60 * 24) >= 3) {
          deleteDoc(doc(db, 'customRooms', d.id)).catch(console.error);
        } else {
          valid.push({ id: d.id, ...data, isCustom: true });
        }
      });
      setCustomRooms(valid);
      setLoading(false);
    }, () => { setError(true); setLoading(false); });
    return unsub;
  }, []);

  /* ── DM Toast helper ── */
  const showDmToast = useCallback((msg) => {
    setDmToast(msg);
    setTimeout(() => setDmToast(''), 2800);
  }, []);

  /* ── Load DM requests (incoming) + Conversations ── */
  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe dmRequests — no orderBy to avoid composite index requirement
    const qReqs = query(
      collection(db, 'dmRequests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending'),
    );
    const unsubReqs = onSnapshot(qReqs, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setDmRequests(sorted);
    }, err => console.error('dmRequests sub error:', err));

    // Subscribe conversations — no orderBy to avoid composite index requirement
    const qConvs = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', user.uid),
    );
    const unsubConvs = onSnapshot(qConvs, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => !c.hiddenFor?.includes(user.uid))
        .sort((a, b) => {
          const ta = a.lastMessageAt?.toMillis?.() ?? 0;
          const tb = b.lastMessageAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setConversations(sorted);
    }, err => console.error('conversations sub error:', err));

    return () => { unsubReqs(); unsubConvs(); };
  }, [user?.uid]);

  // Emit total notification count to parent whenever it changes
  useEffect(() => {
    onNotificationCountChange?.(inboxBadgeCount);
  }, [inboxBadgeCount, onNotificationCountChange]);


  /* ── Accept DM request → create conversation ── */
  const acceptDMRequest = async (req) => {
    try {
      // Check if conversation already exists
      const existQ = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', user.uid),
      );
      const existing = await getDocs(existQ);
      const alreadyExists = existing.docs.some(d => {
        const ids = d.data().participantIds || [];
        return ids.includes(req.fromUserId) && ids.includes(user.uid);
      });

      let convId;
      if (alreadyExists) {
        // Find and use existing conv
        const existConv = existing.docs.find(d => {
          const ids = d.data().participantIds || [];
          return ids.includes(req.fromUserId) && ids.includes(user.uid);
        });
        convId = existConv?.id;
      } else {
        const newConv = await addDoc(collection(db, 'conversations'), {
          participantIds: [req.fromUserId, user.uid],
          participantData: {
            [req.fromUserId]: req.fromUserData || {},
            [user.uid]: { name: authorName, photo: authorPhoto, baby: authorBaby },
          },
          createdFromRequestId: req.id,
          topic:         req.topic || '',
          fromRoom:      req.fromRoom || null,
          lastMessage:   '',
          lastMessageAt: serverTimestamp(),
          unreadCounts:  { [req.fromUserId]: 1, [user.uid]: 0 },
          blockedBy:     [],
          hiddenFor:     [],
          createdAt:     serverTimestamp(),
        });
        convId = newConv.id;
      }

      await updateDoc(doc(db, 'dmRequests', req.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      showDmToast(`Đã kết nối với ${req.fromUserData?.name || 'mẹ'}`);
      // Open the conversation
      const convSnap = await getDocs(query(collection(db, 'conversations'), where('__name__', '==', convId)));
      if (convSnap.docs[0]) {
        setActiveConversation({ id: convId, ...convSnap.docs[0].data() });
      }
    } catch (e) { console.error('acceptDMRequest error:', e); }
  };

  /* ── Decline DM request ── */
  const declineDMRequest = async (reqId) => {
    try {
      await updateDoc(doc(db, 'dmRequests', reqId), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
      showDmToast('Đã từ chối lời mời');
    } catch (e) { console.error('declineDMRequest error:', e); }
  };

  const handleUserClick = (msg) => {
    if (msg.senderId === user?.uid) return;
    if (msg.isAnon) {
      setSelectedProfile({ isAnon: true, name: msg.senderName, photo: msg.senderPhoto });
      return;
    }
    setSelectedProfile({ uid: msg.senderId, name: msg.senderName, photo: msg.senderPhoto, baby: msg.senderBaby });
  };

  /* ── Personalized recommended rooms (smart, no more than 3) ── */
  const getRecommendedRooms = () => {
    if (userStatus === 'pregnant') {
      // For pregnant users: pregnancy first, then health, then family
      return CHAT_ROOMS.filter(r => ['pregnancy', 'health', 'family'].includes(r.id)).slice(0, 3);
    }
    if (userStatus === 'parent' && babyAgeMonths !== null) {
      if (babyAgeMonths < 6) {
        // Newborn to 6 months: sleep, health, family
        return CHAT_ROOMS.filter(r => ['sleep', 'health', 'family'].includes(r.id)).slice(0, 3);
      }
      if (babyAgeMonths >= 6 && babyAgeMonths <= 24) {
        // 6–24 months: weaning first, then sleep, health
        return CHAT_ROOMS.filter(r => ['weaning', 'sleep', 'health'].includes(r.id)).slice(0, 3);
      }
      if (babyAgeMonths > 24) {
        // Toddler+: family, health, weaning
        return CHAT_ROOMS.filter(r => ['family', 'health', 'weaning'].includes(r.id)).slice(0, 3);
      }
    }
    // Default fallback
    return CHAT_ROOMS.filter(r => r.forStatus === 'all').slice(0, 2);
  };
  const recommendedRooms = getRecommendedRooms();
  const recommendedIds   = new Set(recommendedRooms.map(r => r.id));

  /* ── Filter by search (name + desc + tags) ── */
  const filteredRooms = searchQuery.trim()
    ? CHAT_ROOMS.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.desc.toLowerCase().includes(q) ||
          r.tags?.some(t => t.includes(q))
        );
      })
    : CHAT_ROOMS;

  /* ── Private Conversation view ── */
  if (activeConversation) {
    return (
      <PrivateChatView
        conversation={activeConversation}
        currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
        onBack={() => setActiveConversation(null)}
      />
    );
  }

  /* ── Community chat room view ── */
  if (activeRoom) {
    return (
      <>
        <ChatRoomView
          room={activeRoom}
          onBack={() => setActiveRoom(null)}
          currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
          onUserClick={handleUserClick}
          onSendDMRequest={(toUser) => setShowDMRequestSheet(toUser)}
        />
        {selectedProfile && (
          <UserProfileSheet
            user={selectedProfile}
            currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
            activeRoom={activeRoom}
            conversations={conversations}
            onClose={() => setSelectedProfile(null)}
            onSendDMRequest={(toUser) => { setSelectedProfile(null); setShowDMRequestSheet(toUser); }}
            onOpenConversation={(chat) => { setActiveRoom(chat); setSelectedProfile(null); }}
          />
        )}

        {/* DM Request Sheet — phải nằm trong block này để hiển thị khi đang trong phòng */}
        {showDMRequestSheet && (
          <DMRequestSheet
            toUser={showDMRequestSheet}
            currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
            onClose={() => setShowDMRequestSheet(null)}
            onSent={(msg) => showDmToast(msg)}
          />
        )}

        {/* Toast */}
        {dmToast && (
          <div className="dm-toast" role="status" aria-live="polite">{dmToast}</div>
        )}
      </>
    );
  }


  return (
    <div className="community-screen">

      {/* ── HEADER ── */}
      <header className="community-header">
        <div className="community-header-inner">
          <div className="community-header-icon"><MessageIcon size={20} /></div>
          <div>
            <h1 className="community-title">Cộng đồng</h1>
            <p className="community-sub">Kết nối · Chia sẻ · Đồng hành</p>
          </div>
        </div>
      </header>

      {/* ── SEGMENT TABS ── */}
      <div className="community-tabs">
        <button
          className={`comm-tab ${tab === 'rooms' ? 'active' : ''}`}
          onClick={() => setTab('rooms')}
        >
          Phòng cộng đồng
        </button>
        <button
          className={`comm-tab ${tab === 'inbox' ? 'active' : ''}`}
          onClick={() => setTab('inbox')}
        >
          Hộp thư
          {inboxBadgeLabel && (
            <span className="tab-badge">{inboxBadgeLabel}</span>
          )}
        </button>
      </div>

      <div className="community-content">

        {/* ── SEARCH BAR ── */}
        {tab === 'rooms' && (
          <div className="search-bar-wrap">
            <div className="search-bar">
              <span className="search-icon"><SearchIcon size={16} /></span>
              <input
                className="search-input"
                type="text"
                placeholder="Tìm phòng, chủ đề, mẹ cùng giai đoạn"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {error && (
          <div className="comm-error-card">
            <p className="comm-error-title">Chưa thể tải cộng đồng lúc này</p>
            <p className="comm-error-sub">Mẹ thử lại sau một chút nhé.</p>
            <button className="retry-btn" onClick={() => { setError(false); setLoading(true); }}>
              <RefreshIcon /> Thử lại
            </button>
          </div>
        )}

        {/* ── ROOMS TAB ── */}
        {!error && tab === 'rooms' && (
          <>
            {/* Safety Card */}
            <div className="safety-card">
              <span className="safety-icon"><ShieldIcon size={13} /></span>
              <p className="safety-text">Không gian được kiểm duyệt để mẹ chia sẻ an tâm.</p>
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <CommunitySkeleton />
            ) : (
              <>
                {/* Personalized recommended rooms — max 3, no duplicates in fixed section */}
                {!searchQuery && recommendedRooms.length > 0 && (
                  <div className="rooms-section">
                    <div className="section-hdr">
                      <h2 className="section-label">Phù hợp với mẹ</h2>
                      <span className="section-count">{recommendedRooms.length} phòng</span>
                    </div>
                    <div className="rooms-list">
                      {recommendedRooms.map(r => (
                        <RoomCard
                          key={r.id}
                          room={r}
                          badge={userStatus === 'pregnant' ? 'Gợi ý cho mẹ bầu' : 'Gợi ý cho mẹ'}
                          onClick={() => setActiveRoom(r)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All / filtered rooms — exclude already-recommended when not searching */}
                {(() => {
                  const displayRooms = searchQuery
                    ? filteredRooms
                    : CHAT_ROOMS.filter(r => !recommendedIds.has(r.id));
                  const sectionLabel = searchQuery ? 'Kết quả tìm kiếm' : 'Tất cả phòng';
                  return displayRooms.length > 0 ? (
                    <div className="rooms-section">
                      <div className="section-hdr">
                        <h2 className="section-label">{sectionLabel}</h2>
                        {searchQuery && <span className="section-count">{displayRooms.length} phòng</span>}
                      </div>
                      <div className="rooms-list">
                        {displayRooms.map(r => (
                          <RoomCard key={r.id} room={r} onClick={() => setActiveRoom(r)} />
                        ))}
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <div className="comm-empty-state">
                      <p className="comm-empty-title">Không tìm thấy phòng phù hợp</p>
                      <p className="comm-empty-sub">Mẹ thử từ khóa khác như "ăn dặm", "ngủ", "mẹ bầu"...</p>
                    </div>
                  ) : null;
                })()}

                {/* Custom rooms */}
                {!searchQuery && (
                  <div className="rooms-section">
                    <div className="section-hdr">
                      <h2 className="section-label">Phòng tự tạo</h2>
                      <button className="create-room-btn" onClick={() => setShowCreateSheet(true)}>
                        <PlusIcon size={13} /> Tạo phòng
                      </button>
                    </div>
                    <p className="rooms-expire-note">
                      Phòng tự tạo tự đóng sau 3 ngày không có bài mới.
                    </p>

                    {customRooms.length === 0 ? (
                      <div className="custom-empty">
                        <p className="comm-empty-title">Chưa có phòng nào được tạo</p>
                        <p className="comm-empty-sub">
                          Mẹ có thể tạo một chủ đề nhỏ để thảo luận cùng cộng đồng.
                        </p>
                        <div className="topic-suggestions">
                          {QUICK_CHIPS.map(chip => (
                            <button
                              key={chip.label}
                              className="topic-chip"
                              onClick={() => setShowCreateSheet({ prefill: chip })}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                        <button className="outline-btn" onClick={() => setShowCreateSheet(true)}>
                          Tạo phòng đầu tiên
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="rooms-list">
                          {customRooms.map(r => (
                            <CustomRoomCard key={r.id} room={r} onClick={() => setActiveRoom(r)} />
                          ))}
                        </div>
                        <button className="outline-btn" style={{ marginTop: 4 }} onClick={() => setShowCreateSheet(true)}>
                          + Tạo phòng mới
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── INBOX TAB ── */}
        {!error && tab === 'inbox' && (
          <InboxView
            dmRequests={dmRequests}
            conversations={conversations}
            currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
            onAccept={acceptDMRequest}
            onDecline={declineDMRequest}
            onOpenConversation={(conv) => setActiveConversation(conv)}
            onSwitchToRooms={() => setTab('rooms')}
          />
        )}
      </div>

      {/* ── CREATE ROOM SHEET ── */}
      {showCreateSheet && (
        <CreateRoomSheet
          onClose={() => setShowCreateSheet(false)}
          currentUser={{ uid: user?.uid }}
          prefill={typeof showCreateSheet === 'object' ? showCreateSheet.prefill : null}
        />
      )}

      {/* ── USER PROFILE SHEET ── */}
      {selectedProfile && (
        <UserProfileSheet
          user={selectedProfile}
          currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
          activeRoom={activeRoom}
          conversations={conversations}
          onClose={() => setSelectedProfile(null)}
          onSendDMRequest={(toUser) => { setSelectedProfile(null); setShowDMRequestSheet(toUser); }}
          onOpenConversation={(chat) => { setActiveRoom(chat); setSelectedProfile(null); }}
        />
      )}

      {/* ── DM REQUEST SHEET ── */}
      {showDMRequestSheet && (
        <DMRequestSheet
          toUser={showDMRequestSheet}
          currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
          onClose={() => setShowDMRequestSheet(null)}
          onSent={(msg) => showDmToast(msg)}
        />
      )}

      {/* ── DM TOAST ── */}
      {dmToast && (
        <div className="dm-toast" role="status" aria-live="polite">{dmToast}</div>
      )}
    </div>
  );
}

/* ── Room Card ── */
function RoomCard({ room, badge, onClick }) {
  const RoomIcon = ROOM_ICON_MAP[room.id];
  return (
    <div className="room-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      <div className="room-icon-wrap">
        {RoomIcon ? <RoomIcon size={26} strokeWidth={1.8} /> : <MessageIcon size={22} />}
      </div>
      <div className="room-card-body">
        <div className="room-card-top">
          <h3 className="room-name">{room.name}</h3>
          {badge && <span className="room-badge">{badge}</span>}
        </div>
        <p className="room-desc">{room.desc}</p>
        <div className="room-meta">
          {room.unreadCount > 0 && (
            <span className="room-meta-new">{room.unreadCount} bài mới</span>
          )}
        </div>
        {room.disclaimer && (
          <p className="room-disclaimer">{room.disclaimer}</p>
        )}
      </div>
      <div className="room-arrow"><ChevronRightIcon size={18} /></div>
    </div>
  );
}

/* ── Custom Room Card ── */
function CustomRoomCard({ room, onClick }) {
  return (
    <div className="room-card custom-room-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="room-icon-wrap custom-icon-wrap">
        <MessageIcon size={20} />
      </div>
      <div className="room-card-body">
        <div className="room-card-top">
          <h3 className="room-name">{room.name}</h3>
          <span className="custom-badge">Tự tạo</span>
        </div>
        {room.desc && <p className="room-desc">{room.desc}</p>}
      </div>
      <div className="room-arrow"><ChevronRightIcon size={18} /></div>
    </div>
  );
}

/* ── Community Skeleton ── */
function CommunitySkeleton() {
  return (
    <div className="comm-skeleton-wrap">
      {[1, 2].map(i => <div key={i} className="skel skel-room" />)}
      <div className="skel skel-section-label" />
      {[1, 2, 3].map(i => <div key={i} className="skel skel-room" />)}
    </div>
  );
}

/* ── Create Room Bottom Sheet ── */
function CreateRoomSheet({ onClose, currentUser, prefill }) {
  const [name, setName]         = useState(prefill?.name || '');
  const [selectedTopic, setSelectedTopic] = useState(prefill?.topic || '');
  const [desc, setDesc]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState('');
  const lastSave = useRef(0);

  // Lock body scroll + hide bottom-nav on iOS when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setNameError('Tên phòng không được để trống.'); return; }
    if (name.trim().length < 3) { setNameError('Tên phòng cần ít nhất 3 ký tự.'); return; }
    // Anti-spam: min 5s between saves
    const now = Date.now();
    if (now - lastSave.current < 5000) { setNameError('Vui lòng đợi vài giây rồi thử lại.'); return; }
    setSaving(true);
    try {
      const fullDesc = [selectedTopic, desc.trim()].filter(Boolean).join(' · ');
      await addDoc(collection(db, 'customRooms'), {
        name: name.trim(),
        desc: fullDesc,
        topic: selectedTopic,
        isPublic: true,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      lastSave.current = Date.now();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-post-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 className="sheet-title">Tạo phòng thảo luận</h3>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng"><CloseIcon /></button>
        </div>

        <p className="sheet-hint">Tên phòng nên ngắn, rõ chủ đề và thân thiện.</p>

        <div className="sheet-form-group">
          <label>Tên phòng *</label>
          <input
            className={`sheet-input ${nameError ? 'has-error' : ''}`}
            placeholder="Ví dụ: Mẹ bầu tháng 9"
            value={name}
            onChange={e => { setName(e.target.value); setNameError(''); }}
            maxLength={30}
          />
          {nameError && <p className="input-error">{nameError}</p>}
          <p className="input-hint">{name.length}/30 ký tự</p>
        </div>

        <div className="sheet-form-group">
          <label>Chủ đề</label>
          <div className="topic-chip-select">
            {TOPIC_CHIPS.map(t => (
              <button
                key={t}
                type="button"
                className={`topic-select-chip ${selectedTopic === t ? 'active' : ''}`}
                onClick={() => setSelectedTopic(selectedTopic === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-form-group">
          <label>Mô tả ngắn (tuỳ chọn)</label>
          <input
            className="sheet-input"
            placeholder="Mẹ muốn thảo luận điều gì?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            maxLength={60}
          />
          <p className="input-hint">{desc.length}/60 ký tự</p>
        </div>

        <button
          className="submit-post-btn"
          disabled={!name.trim() || saving}
          onClick={handleCreate}
        >
          {saving ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
                <path d="M4 12a8 8 0 018-8" strokeLinecap="round" />
              </svg>
              Đang tạo...
            </span>
          ) : 'Tạo phòng'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHAT ROOM VIEW
════════════════════════════════════════════════ */
function ChatRoomView({ room, onBack, currentUser, onUserClick, onSendDMRequest }) {
  const [messages, setMessages]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(false);
  const [isAnon, setIsAnon]           = useState(false);
  const [sending, setSending]         = useState(false);
  const [files, setFiles]             = useState([]);
  const [showRules, setShowRules]     = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [showAISheet, setShowAISheet] = useState(false);
  const [imageViewUrl, setImageViewUrl] = useState(null);
  const [likes, setLikes]             = useState({});
  const [saved, setSaved]             = useState({});
  const [directText, setDirectText]   = useState('');
  const fileInputRef                  = useRef(null);
  const directFileInputRef            = useRef(null);
  const scrollRef                     = useRef(null);
  const inputRef                      = useRef(null);

  const roomType = room.id || room.type || 'custom';
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  /* ── Suggested topics by room ── */
  const SUGGESTED_TOPICS_OBJ = {
    pregnancy: [
      { icon: '\u{1F930}', text: 'Mẹ đang ở tuần thai bao nhiêu?' },
      { icon: '\u{1F3B5}', text: 'Thai giáo nhẹ nhàng nên bắt đầu thế nào?' },
      { icon: '\u{1F634}', text: 'Mẹ có đang nghén hoặc mệt không?' },
      { icon: '\u{1F4CB}', text: 'Chuẩn bị gì trước khi sinh?' },
    ],
    weaning: [
      { icon: '\u{1F944}', text: 'Bé mấy tháng thì bắt đầu ăn dặm?' },
      { icon: '\u{1F371}', text: 'BLW hay ăn dặm kiểu Nhật?' },
      { icon: '\u{1F955}', text: 'Món đầu tiên nên thử là gì?' },
      { icon: '\u{1F605}', text: 'Bé không hợp tác khi ăn thì làm sao?' },
    ],
    sleep: [
      { icon: '\u{1F319}', text: 'Bé hay thức đêm phải làm sao?' },
      { icon: '\u{1F4A4}', text: 'Có nên luyện ngủ tự lập không?' },
      { icon: '\u{1F4C5}', text: 'Lịch EASY có phù hợp không?' },
      { icon: '☀️', text: 'Bé ngủ ngày ít có sao không?' },
    ],
    health: [
      { icon: '\u{1F3E5}', text: 'Khi nào nên đưa bé đi khám?' },
      { icon: '\u{1F321}️', text: 'Bé ho/sốt cần theo dõi gì?' },
      { icon: '\u{1F48A}', text: 'Mẹ sau sinh mệt nhiều có bình thường không?' },
      { icon: '\u{1F4DD}', text: 'Cách ghi lại triệu chứng cho bé?' },
    ],
    family: [
      { icon: '\u{1F4AC}', text: 'Mẹ cần được lắng nghe hôm nay?' },
      { icon: '\u{1F46B}', text: 'Chia sẻ việc chăm bé với chồng thế nào?' },
      { icon: '\u{1F33F}', text: 'Áp lực sau sinh nên nói với ai?' },
      { icon: '⏰', text: 'Làm sao để mẹ có thời gian nghỉ ngơi?' },
    ],
  };
  const suggestedTopics = SUGGESTED_TOPICS_OBJ[roomType] || [
    { icon: '\u{1F4A1}', text: 'Bắt đầu chủ đề mới' },
    { icon: '\u{1F4D6}', text: 'Chia sẻ kinh nghiệm' },
    { icon: '❓', text: 'Đặt câu hỏi cho cộng đồng' },
  ];

  /* ── Pinned content ── */
  const PINNED = {
    pregnancy: 'Chào mừng mẹ đến với Góc Mẹ Bầu! Đây là nơi mẹ chia sẻ hành trình mang thai, đặt câu hỏi và đồng hành cùng các mẹ bầu khác. Mọi cảm xúc, thắc mắc đều được chào đón.',
    weaning:   'Mẹ có thể bắt đầu ăn dặm khi bé sẵn sàng về vận động, tiêu hóa và hứng thú với thức ăn. Dù chọn BLW, kiểu Nhật hay truyền thống — không có đúng hay sai, chỉ có phù hợp nhất với bé.',
    sleep:     'Giấc ngủ của bé là hành trình cần kiên nhẫn. Mẹ không cô đơn — các mẹ ở đây đều hiểu cảm giác thức đêm. Hãy chia sẻ để cùng nhau tìm giải pháp.',
    health:    'Đây là nơi mẹ chia sẻ kinh nghiệm chăm sóc sức khỏe mẹ và bé. Các thông tin chỉ mang tính tham khảo — mẹ nên hỏi bác sĩ khi có dấu hiệu bất thường.',
    family:    'Đây là góc nhỏ để mẹ tâm sự, xả stress và cảm thấy được lắng nghe. Không có câu chuyện nào quá nhỏ để chia sẻ.',
  };
  const pinnedContent    = PINNED[roomType] || `Chào mừng mẹ đến với ${room.name}. Hãy chia sẻ và đặt câu hỏi cùng cộng đồng.`;
  const PINNED_PREVIEW   = 120;
  const pinnedTruncated  = pinnedContent.length > PINNED_PREVIEW;

  /* ── Load messages ── */
  useEffect(() => {
    setLoading(true); setLoadError(false);
    const colName = room.isCustom ? 'customRooms' : 'chatRooms';
    const q = query(
      collection(db, colName, room.id, 'messages'),
      orderBy('createdAt', 'desc'), limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }, () => { setLoadError(true); setLoading(false); });
    return unsub;
  }, [room.id, room.isCustom]);

  /* ── File handling ── */
  const handleFileChange = (e) => {
    const valid = Array.from(e.target.files).filter(f => {
      if (f.size > 10 * 1024 * 1024) { alert(`Ảnh ${f.name} vượt quá 10MB.`); return false; }
      return true;
    });
    if (valid.length > 0) setFiles([valid[0]]);
    e.target.value = null;
  };
  const removeFile = () => setFiles([]);

  const uploadImages = async (customFiles) => {
    const targetFiles = customFiles || files;
    const urls = [];
    const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    for (const file of targetFiles) {
      const fd = new FormData();
      fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET);
      try {
        const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data.secure_url) urls.push(data.secure_url);
      } catch (err) { console.error('Upload error:', err); }
    }
    return urls;
  };

  const handleSend = async () => {
    if (!directText.trim() && files.length === 0) return;
    if (sending) return;
    setSending(true);
    const content = directText;
    const attachedFiles = [...files];
    setDirectText(''); setFiles([]);
    try {
      const imageUrls = await uploadImages(attachedFiles);
      const rIndex = Math.floor(Math.random() * ANIMAL_NAMES.length);
      const colName = room.isCustom ? 'customRooms' : 'chatRooms';
      await addDoc(collection(db, colName, room.id, 'messages'), {
        title: '', text: content.trim(), images: imageUrls, label: null,
        createdAt: serverTimestamp(), senderId: currentUser.uid, isAnon,
        senderName:  isAnon ? `${ANIMAL_NAMES[rIndex]} Ẩn Danh` : currentUser.name,
        senderPhoto: isAnon ? ANIMAL_EMOJIS[rIndex]                 : currentUser.photo,
        senderBaby:  isAnon ? null                                  : currentUser.baby,
        likes: 0, replies: 0,
      });
      if (room.isCustom) await updateDoc(doc(db, 'customRooms', room.id), { lastMessageAt: serverTimestamp() });
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gửi bài.');
    } finally { setSending(false); }
  };

  const isEmpty    = messages.length === 0;
  const showTopics = messages.length < 5;

  if (room.isPrivate) {
    return <PrivateChatView room={room} onBack={onBack} currentUser={currentUser} onUserClick={onUserClick}
      messages={messages} loading={loading} files={files}
      handleFileChange={handleFileChange} removeFile={removeFile}
      fileInputRef={fileInputRef} scrollRef={scrollRef} uploadImages={uploadImages}
      isAnon={isAnon} setIsAnon={setIsAnon} sending={sending} setSending={setSending}
      room2={room} />;
  }

  return (
    <div className="room-view-screen">

      {/* HEADER */}
      <header className="room-view-header">
        <button className="rv-back-btn" onClick={onBack} aria-label="Quay lại">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="rv-header-center">
          <h2 className="rv-title">{room.name}</h2>
          <p className="rv-meta">
            {isEmpty ? 'Chưa có bài viết' : `${messages.length} bài chia sẻ`}
            {roomType === 'health' && <span className="rv-meta-disclaimer"> · Chỉ tham khảo</span>}
          </p>
        </div>
        <button className="rv-info-btn" onClick={() => setShowRules(true)} aria-label="Quy tắc nhóm">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </button>
      </header>

      {/* SCROLLABLE CONTENT */}
      <div className="room-view-content" ref={scrollRef}>

        {loading && <RoomSkeleton />}

        {!loading && loadError && (
          <div className="room-error-card">
            <p className="room-error-title">Chưa thể tải nhóm lúc này</p>
            <p className="room-error-sub">Mẹ thử lại sau một chút nhé.</p>
            <button className="retry-btn" onClick={() => { setLoadError(false); setLoading(true); }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Thử lại
            </button>
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Pinned post */}
            <div className="pinned-post-card">
              <div className="pinned-post-label">
                <div className="pinned-icon-wrap">
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="17" x2="12" y2="22"/>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                  </svg>
                </div>
                <span>Bài ghim từ Montessori AI</span>
              </div>
              <p className="pinned-post-content">
                {pinnedExpanded || !pinnedTruncated
                  ? pinnedContent
                  : `${pinnedContent.slice(0, PINNED_PREVIEW)}...`}
              </p>
              {pinnedTruncated && (
                <button className="pinned-expand-btn" onClick={() => setPinnedExpanded(v => !v)}>
                  {pinnedExpanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>

            {/* Suggested topics */}
            {showTopics && (
              <div className="suggested-topics-card">
                <h3 className="suggested-topics-title">Mẹ có thể bắt đầu với</h3>
                <div className="suggested-topics-grid">
                  {suggestedTopics.map((t, i) => (
                    <button key={i} className="topic-card-btn"
                      onClick={() => { setDirectText(t.text); inputRef.current?.focus(); }}>
                      <span className="topic-card-icon">{t.icon}</span>
                      <span className="topic-card-text">{t.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {isEmpty && (
              <div className="room-encourage-card">
                <div className="room-encourage-icon">
                  <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="room-encourage-title">Mẹ có thể là người mở đầu hôm nay</p>
                <p className="room-encourage-sub">Đặt một câu hỏi, chia sẻ kinh nghiệm — cộng đồng đang chờ lắng nghe mẹ.</p>
                <button className="room-encourage-btn" onClick={() => inputRef.current?.focus()}>
                  Đặt câu hỏi đầu tiên
                </button>
              </div>
            )}

            {/* Posts */}
            {!isEmpty && (
              <div className="posts-list">
                {messages.map(msg => (
                  <PostCard
                    key={msg.id}
                    msg={msg}
                    currentUser={currentUser}
                    onUserClick={onUserClick}
                    liked={!!likes[msg.id]}
                    saved2={!!saved[msg.id]}
                    onLike={() => setLikes(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                    onSave={() => setSaved(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                    onReply={() => { setDirectText(`@${msg.senderName || ''} `); inputRef.current?.focus(); }}
                    onImageClick={(url) => setImageViewUrl(url)}
                    onSendDMRequest={onSendDMRequest}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FLOATING COMPOSER */}
      {!loading && !loadError && (
        <div className="rv-composer-container">
          {files.length > 0 && (
            <div className="rv-image-previews">
              <div className="rv-preview-item">
                <img src={URL.createObjectURL(files[0])} alt="preview" />
                <button type="button" className="rv-remove-img-btn" onClick={removeFile} aria-label="Xoà ảnh">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="rv-composer-bar">
            <button className="rv-attach-btn" onClick={() => directFileInputRef.current?.click()} disabled={sending} aria-label="Thêm ảnh">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input type="file" accept="image/jpeg,image/png,image/heic,image/webp" ref={directFileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

            <input
              ref={inputRef}
              type="text"
              className="rv-input"
              placeholder="Đặt câu hỏi hoặc chia sẻ kinh nghiệm..."
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              disabled={sending}
            />

            <button className="rv-ai-btn" onClick={() => setShowAISheet(true)} disabled={sending} aria-label="AI gợi ý">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>

            <button
              className="rv-send-btn"
              onClick={handleSend}
              disabled={sending || (!directText.trim() && files.length === 0)}
              aria-label="Gửi bài"
            >
              {sending ? (
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.2}/>
                  <path d="M4 12a8 8 0 018-8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER */}
      {imageViewUrl && (
        <div className="image-viewer-overlay" onClick={() => setImageViewUrl(null)}>
          <button className="image-viewer-close" onClick={() => setImageViewUrl(null)} aria-label="Đóng">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <img src={imageViewUrl} alt="Xem ảnh" className="image-viewer-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* AI SHEET */}
      {showAISheet && (
        <AISheet
          roomType={roomType}
          currentText={directText}
          onUse={(text) => { setDirectText(text); setShowAISheet(false); inputRef.current?.focus(); }}
          onClose={() => setShowAISheet(false)}
          apiBase={API_BASE}
        />
      )}

      {showRules && <CommunityRulesSheet onClose={() => setShowRules(false)} roomType={roomType} />}
    </div>
  );
}

/* ── Post Card ── */
function PostCard({ msg, currentUser, onUserClick, liked, saved2, onLike, onSave, onReply, onImageClick, onSendDMRequest }) {
  const isMe = msg.senderId === currentUser.uid;
  const isAI = msg.isAI === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const likeCount  = (msg.likes   || 0) + (liked ? 1 : 0);
  const replyCount = (msg.replies || 0);

  function rel(ts) {
    if (!ts) return '';
    const d    = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'Vừa xong';
    if (diff < 3600)  return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  return (
    <div className={`post-card ${isAI ? 'post-card-ai' : ''} ${isMe ? 'post-card-me' : ''}`}>
      <div className="post-card-author">
        {isAI ? (
          <div className="post-ai-avatar">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
        ) : msg.isAnon ? (
          <button
            className="post-avatar-btn anon"
            aria-label="Xem hồ sơ thành viên ẩn danh"
            onClick={() => onUserClick?.(msg)}
          >
            <div className="chat-anon-avatar" style={{ width: 40, height: 40, fontSize: 20 }}>{msg.senderPhoto}</div>
          </button>
        ) : isMe ? (
          <Avatar name={msg.senderName} photo={msg.senderPhoto} size={40} />
        ) : (
          <button
            className="post-avatar-btn"
            aria-label={`Xem hồ sơ ${msg.senderName || 'thành viên'}`}
            onClick={() => onUserClick?.(msg)}
          >
            <Avatar name={msg.senderName} photo={msg.senderPhoto} size={40} />
          </button>
        )}

        <div className="post-author-info">
          <div className="post-author-name-row">
            <span className="post-author-name"
              onClick={() => !isMe && !isAI && onUserClick?.(msg)}
              style={{ cursor: isMe || isAI ? 'default' : 'pointer' }}>
              {isAI ? 'Montessori AI' : (msg.senderName || 'Thành viên')}
            </span>
            {isAI      && <span className="post-ai-badge">AI</span>}
            {msg.isAnon && !isAI && <span className="post-anon-badge">Ẩn danh</span>}
            {isMe      && !isAI && <span className="post-me-badge">Bạn</span>}
          </div>
          <span className="post-author-sub">
            {isAI ? 'Montessori AI'
              : msg.isAnon ? 'Thành viên ẩn danh'
              : msg.senderBaby ? `Mẹ của ${msg.senderBaby}`
              : 'Thành viên'}
          </span>
        </div>

        <div className="post-header-right">
          <span className="post-time">{rel(msg.createdAt)}</span>
          <div className="post-menu-wrap">
            <button className="post-menu-btn" onClick={() => setMenuOpen(v => !v)} aria-label="Tuỳ chọn">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="post-menu-dropdown" onClick={() => setMenuOpen(false)}>
                {isMe ? (
                  <>
                    <button className="post-menu-item">Chỉnh sửa</button>
                    <button className="post-menu-item danger">Xoá bài</button>
                  </>
                ) : isAI ? (
                  <>
                    <button className="post-menu-item" onClick={onSave}>{saved2 ? 'Bỏ lưu' : 'Lưu bài'}</button>
                  </>
                ) : (
                  <>
                    <button className="post-menu-item" onClick={onSave}>{saved2 ? 'Bỏ lưu' : 'Lưu bài'}</button>
                    {!msg.isAnon && msg.senderId && onSendDMRequest && (
                      <button
                        className="post-menu-item"
                        onClick={() => onSendDMRequest({
                          uid:   msg.senderId,
                          name:  msg.senderName || 'Thành viên',
                          photo: msg.senderPhoto || '',
                          baby:  msg.senderBaby  || '',
                        })}
                      >
                        Gửi lời mời nhắn tin
                      </button>
                    )}
                    <button className="post-menu-item">Báo cáo</button>
                    <button className="post-menu-item">Ẩn bài</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {msg.title && <h4 className="post-title">{msg.title}</h4>}
      {msg.text  && <p  className="post-content">{msg.text}</p>}

      {msg.images?.length > 0 && (
        <div className={`post-images grid-${Math.min(msg.images.length, 4)}`}>
          {msg.images.map((url, i) => (
            <img key={i} src={url} alt="ảnh bài viết" className="post-image"
              onClick={() => onImageClick?.(url)} style={{ cursor: 'pointer' }} />
          ))}
        </div>
      )}

      {!isAI && (
        <div className="post-action-footer">
          <button className={`post-action-btn ${liked ? 'active' : ''}`} onClick={onLike}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span>Hữu ích{likeCount > 0 ? ` ${likeCount}` : ''}</span>
          </button>
          <button className="post-action-btn" onClick={onReply}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Trả lời{replyCount > 0 ? ` ${replyCount}` : ''}</span>
          </button>
          <button className={`post-action-btn ${saved2 ? 'active' : ''}`} onClick={onSave}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill={saved2 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Lưu</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── AI Suggest Sheet ── */
function AISheet({ roomType, currentText, onUse, onClose, apiBase }) {
  const [input, setInput]     = useState(currentText || '');
  const [response, setResp]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => { document.body.style.overflow = ''; document.body.classList.remove('overlay-open'); };
  }, []);

  const PROMPTS = {
    pregnancy: ['Viết lại câu hỏi về thai kỳ', 'Gợi ý chủ đề thai giáo', 'Câu hỏi về sức khỏe mẹ bầu'],
    weaning:   ['Gợi ý câu hỏi về BLW', 'Hỏi về món ăn dặm đầu tiên', 'Câu hỏi khi bé không chịu ăn'],
    sleep:     ['Gợi ý về lịch EASY', 'Câu hỏi về luyện ngủ', 'Hỏi về tuần khủng hoảng'],
    health:    ['Câu hỏi an toàn về sức khỏe', 'Gợi ý mô tả triệu chứng', 'Hỏi khi nào cần gặp bác sĩ'],
    family:    ['Chia sẻ cảm xúc của mẹ', 'Câu hỏi về cân bằng gia đình', 'Tâm sự về áp lực sau sinh'],
  };
  const prompts = PROMPTS[roomType] || ['Viết lại câu hỏi rõ hơn', 'Gợi ý chủ đề liên quan'];

  const ask = async (q) => {
    const question = q || input.trim();
    if (!question) return;
    setLoading(true); setError(''); setResp('');
    try {
      const res  = await fetch(`${apiBase}/chat/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, sessionId: `ai-${Date.now()}`, roomType }),
      });
      const data = await res.json();
      setResp(data.reply || data.message || 'AI không có gợi ý lúc này.');
    } catch {
      setError('Chưa kết nối được AI. Mẹ thử lại sau nhé.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-suggest-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="ai-suggest-header">
          <div>
            <h3 className="sheet-title">AI gợi ý bài viết</h3>
            <p className="ai-sheet-sub">Mẹ muốn hỏi theo hướng nào?</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng"><CloseIcon /></button>
        </div>

        {roomType === 'health' && (
          <p className="ai-health-disclaimer">
            AI chỉ hỗ trợ gợi ý cách đặt câu hỏi, không thay thế tư vấn của bác sĩ.
          </p>
        )}

        <div className="ai-quick-prompts">
          {prompts.map((p, i) => (
            <button key={i} className="ai-quick-prompt-chip" onClick={() => { setInput(p); ask(p); }}>{p}</button>
          ))}
        </div>

        <div className="ai-suggest-input-row">
          <input className="ai-chat-input" placeholder="Nhập câu hỏi của mẹ..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()} />
          <button className="ai-chat-send-btn" onClick={() => ask()} disabled={loading || !input.trim()}>
            {loading ? (
              <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" strokeOpacity={0.2}/>
                <path d="M4 12a8 8 0 018-8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>

        {loading && (
          <div className="ai-loading-state">
            <div className="ai-typing-dots"><span/><span/><span/></div>
            <p className="ai-loading-text">AI đang gợi ý...</p>
          </div>
        )}
        {error && <p className="ai-error-inline">{error}</p>}
        {response && !loading && (
          <div className="ai-response-card">
            <p className="ai-response-text">{response}</p>
            <div className="ai-response-actions">
              <button className="ai-post-action-btn primary" onClick={() => onUse(response)}>Dùng nội dung này</button>
              <button className="ai-post-action-btn secondary" onClick={() => setResp('')}>Thử lại</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Room Skeleton ── */
function RoomSkeleton() {
  return (
    <div className="room-skeleton-wrap">
      <div className="skel skel-pinned" />
      <div className="skel skel-topics" />
      {[1, 2, 3].map(i => <div key={i} className="skel skel-post" />)}
    </div>
  );
}

/* ── Avatar ── */
function Avatar({ name, photo, size }) {
  const initial = name ? name[0].toUpperCase() : '?';
  const colors  = ['#5C9E7A', '#7DB896', '#6BBF8E', '#A8D5B5', '#4A8566'];
  const color   = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return photo && photo.startsWith('http')
    ? <img src={photo} alt={name} className="avatar-img" style={{ width: size, height: size }} />
    : <div className="avatar-initials" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>{initial}</div>;
}

/* ── Member Profile Sheet (preserved) ── */
function MemberProfileSheet({ profile, onClose, currentUser, onStartPrivateChat, onSendDMRequest }) {
  const [hasConversation, setHasConversation] = useState(false);
  const [existingConv, setExistingConv] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const [loading, setLoading] = useState(!profile.isAnon && !!profile.uid);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  // Check if already have conversation or pending request with this user
  useEffect(() => {
    if (!profile.uid || !currentUser?.uid || profile.isAnon) { setLoading(false); return; }
    const check = async () => {
      try {
        // Check conversations
        const convSnap = await getDocs(
          query(collection(db, 'conversations'), where('participantIds', 'array-contains', currentUser.uid))
        );
        const conv = convSnap.docs.find(d => d.data().participantIds?.includes(profile.uid));
        if (conv) {
          setHasConversation(true);
          setExistingConv({ id: conv.id, ...conv.data() });
          return;
        }
        // Check pending dmRequest
        const reqSnap = await getDocs(
          query(
            collection(db, 'dmRequests'),
            where('fromUserId', '==', currentUser.uid),
            where('toUserId',   '==', profile.uid),
            where('status',     '==', 'pending'),
          )
        );
        if (!reqSnap.empty) setHasPending(true);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    check();
  }, [profile.uid, currentUser?.uid, profile.isAnon]);

  const handleDMAction = () => {
    if (hasConversation && existingConv) {
      // Open existing conversation directly
      onStartPrivateChat?.(existingConv);
      onClose();
      return;
    }
    // Open DM request sheet
    onSendDMRequest?.({
      uid:   profile.uid,
      name:  profile.name,
      photo: profile.photo,
      baby:  profile.baby,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="member-profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close-btn" onClick={onClose} aria-label="Đóng"><CloseIcon /></button>

        {profile.isAnon ? (
          <div className="anon-profile-container">
            <div className="anon-avatar-large">{profile.photo}</div>
            <h3 className="member-name">{profile.name}</h3>
            <p className="member-role">Thành viên ẩn danh</p>
            <div className="anon-warning-box">
              <p className="anon-warning-text">
                Thành viên này đang trò chuyện ẩn danh. Hồ sơ của họ được bảo mật để tôn trọng sự riêng tư.
              </p>
            </div>
          </div>
        ) : (
          <div className="member-profile-container">
            <Avatar name={profile.name} photo={profile.photo} size={72} />
            <h3 className="member-name">{profile.name}</h3>
            <p className="member-role">
              {profile.baby ? `Mẹ của ${profile.baby}` : 'Thành viên Montessori AI'}
            </p>

            <div className="sheet-actions">
              {loading ? (
                <div className="loading-status">Đang kiểm tra...</div>
              ) : hasConversation ? (
                <>
                  <button className="action-btn chat-btn" onClick={handleDMAction}>
                    Mở cuộc trò chuyện
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
                    Bạn đã có cuộc trò chuyện với mẹ này.
                  </p>
                </>
              ) : hasPending ? (
                <>
                  <button className="action-btn friend-btn status-pending" disabled>
                    Đã gửi lời mời
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
                    Đang chờ mẹ kia phản hồi.
                  </p>
                </>
              ) : (
                <>
                  <button
                    className="action-btn chat-btn"
                    onClick={handleDMAction}
                    disabled={!profile.uid || !onSendDMRequest}
                  >
                    Gửi lời mời nhắn tin
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
                    Lời mời sẽ được gửi đến mẹ. Tin nhắn chỉ bắt đầu khi cả hai đồng ý.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Community Rules Sheet ── */
function CommunityRulesSheet({ onClose, roomType }) {
  // Lock body scroll + hide bottom-nav on iOS when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  const rules = [
    'Tôn trọng & Cảm thông: Không phán xét phương pháp nuôi dạy con của mẹ khác.',
    'Thông tin an toàn: Không chia sẻ đơn thuốc bừa bãi, không tuyên truyền sai lệch.',
    'Bảo mật thông tin: Tôn trọng sự riêng tư của trẻ em và thành viên khác.',
    'Chia sẻ văn minh: Không chèo kéo bán hàng, quảng cáo rác hoặc spam.',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-post-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 className="sheet-title">Quy tắc cộng đồng</h3>
          <button className="sheet-close" onClick={onClose} aria-label="Đóng">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="sheet-room-tag" style={{ marginBottom: 12 }}>
          Áp dụng cho mọi thành viên tham gia thảo luận
        </p>

        <div className="rules-list">
          {rules.map((rule, idx) => (
            <div key={idx} className="rules-item">
              <span className="rules-num">{idx + 1}</span>
              <span className="rules-text">{rule}</span>
            </div>
          ))}
        </div>

        <button className="submit-post-btn" onClick={onClose} style={{ marginTop: 18, width: '100%' }}>
          Đã hiểu & Đồng ý
        </button>
      </div>
    </div>
  );
}


