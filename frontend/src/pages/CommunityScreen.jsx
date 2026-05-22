/**
 * CommunityScreen.jsx — Tối ưu UX cộng đồng an toàn
 * - Cá nhân hóa phòng gợi ý theo user.status (pregnant / parent)
 * - Search bar, safety card, rich room metadata
 * - Segment tabs: Phòng Chat / Tin nhắn
 * - Skeleton loading, empty states, create room bottom sheet
 * - Giữ nguyên ChatRoomView, Avatar, MemberProfileSheet, logic Firestore
 */
import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, limit, updateDoc, doc, deleteDoc, getDocs, where
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './CommunityScreen.css';
import {
  PregnancyIcon, FoodBowlIcon, SleepMoonIcon,
  HealthHeartIcon, FamilyIcon, ChatBubbleIcon
} from '../icons.jsx';

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
    memberCount: 1243,
    unreadCount: 18,
    forStatus: 'pregnant',
    disclaimer: null,
  },
  {
    id: 'weaning',
    name: 'Hành Trình Ăn Dặm',
    desc: 'Thực đơn BLW, kiểu Nhật, truyền thống · Kinh nghiệm thực tế',
    memberCount: 987,
    unreadCount: 6,
    forStatus: 'parent',
    disclaimer: null,
  },
  {
    id: 'sleep',
    name: 'Rèn Ngủ Xuyên Đêm',
    desc: 'EASY, luyện ngủ tự lập, tuần khủng hoảng (Wonder Weeks)',
    memberCount: 754,
    unreadCount: 11,
    forStatus: 'parent',
    disclaimer: null,
  },
  {
    id: 'health',
    name: 'Sức Khoẻ Mẹ & Bé',
    desc: 'Kinh nghiệm chăm sóc bé ốm, phục hồi sau sinh',
    memberCount: 621,
    unreadCount: 3,
    forStatus: 'all',
    disclaimer: 'Thông tin chia sẻ chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.',
  },
  {
    id: 'family',
    name: 'Chuyện Gia Đình',
    desc: 'Tâm sự chuyện vợ chồng, bỉm sữa, cân bằng cuộc sống',
    memberCount: 512,
    unreadCount: 0,
    forStatus: 'all',
    disclaimer: null,
  },
];

const ANIMAL_NAMES  = ['Thỏ Ngọc', 'Gấu Misa', 'Cún Con', 'Mèo Ú', 'Sóc Nhỏ', 'Cáo Nâu', 'Hươu Cao Cổ', 'Chim Cánh Cụt'];
const ANIMAL_EMOJIS = ['🐰', '🐻', '🐶', '🐱', '🐿️', '🦊', '🦒', '🐧'];

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatMemberCount(n) {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
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
export default function CommunityScreen({ profile }) {
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
  const [friendRequests, setFriendRequests] = useState([]);
  const [privateChats, setPrivateChats]     = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

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

  /* ── Load inbox ── */
  useEffect(() => {
    if (!user?.uid) return;
    const unsubReqs = onSnapshot(
      query(collection(db, 'friendRequests'), orderBy('createdAt', 'desc')),
      snap => {
        setFriendRequests(snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.receiverId === user.uid && r.status === 'pending')
        );
      }
    );
    const unsubChats = onSnapshot(
      query(collection(db, 'privateChats'), orderBy('lastMessageAt', 'desc')),
      snap => {
        setPrivateChats(snap.docs
          .map(d => ({ id: d.id, ...d.data(), isPrivate: true }))
          .filter(c => c.participants?.includes(user.uid))
        );
      }
    );
    return () => { unsubReqs(); unsubChats(); };
  }, [user?.uid]);

  /* ── Accept / Decline friend requests ── */
  const acceptRequest = async (req) => {
    try {
      await addDoc(collection(db, 'privateChats'), {
        participants: [req.senderId, user.uid],
        participantData: {
          [req.senderId]: { name: req.senderName, photo: req.senderPhoto, baby: req.senderBaby },
          [user.uid]:     { name: authorName, photo: authorPhoto, baby: authorBaby }
        },
        createdAt: serverTimestamp(), lastMessageAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'accepted' });
    } catch (e) { console.error(e); }
  };
  const declineRequest = async (id) => {
    try { await updateDoc(doc(db, 'friendRequests', id), { status: 'declined' }); }
    catch (e) { console.error(e); }
  };

  const handleUserClick = (msg) => {
    if (msg.senderId === user?.uid) return;
    if (msg.isAnon) {
      setSelectedProfile({ isAnon: true, name: msg.senderName, photo: msg.senderPhoto });
      return;
    }
    setSelectedProfile({ uid: msg.senderId, name: msg.senderName, photo: msg.senderPhoto, baby: msg.senderBaby });
  };

  /* ── Personalized recommended rooms ── */
  const getRecommendedRooms = () => {
    if (userStatus === 'pregnant') {
      return CHAT_ROOMS.filter(r => r.id === 'pregnancy');
    }
    // For parent, recommend based on baby age
    if (babyAgeMonths !== null) {
      if (babyAgeMonths >= 4 && babyAgeMonths <= 18) {
        return CHAT_ROOMS.filter(r => r.id === 'weaning' || r.id === 'sleep');
      }
      if (babyAgeMonths < 4) {
        return CHAT_ROOMS.filter(r => r.id === 'sleep');
      }
    }
    return CHAT_ROOMS.filter(r => r.forStatus === 'parent' || r.forStatus === 'all').slice(0, 2);
  };
  const recommendedRooms = getRecommendedRooms();

  /* ── Filter by search ── */
  const filteredRooms = searchQuery.trim()
    ? CHAT_ROOMS.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CHAT_ROOMS;

  /* ── Chat room view ── */
  if (activeRoom) {
    return (
      <>
        <ChatRoomView
          room={activeRoom}
          onBack={() => setActiveRoom(null)}
          currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
          onUserClick={handleUserClick}
        />
        {selectedProfile && (
          <MemberProfileSheet
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
            onStartPrivateChat={(chat) => { setActiveRoom(chat); setSelectedProfile(null); }}
          />
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
          Phòng Chat
        </button>
        <button
          className={`comm-tab ${tab === 'inbox' ? 'active' : ''}`}
          onClick={() => setTab('inbox')}
        >
          Tin nhắn
          {friendRequests.length > 0 && (
            <span className="tab-badge">{friendRequests.length}</span>
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
                {/* Personalized recommended rooms */}
                {!searchQuery && recommendedRooms.length > 0 && (
                  <div className="rooms-section">
                    <div className="section-hdr">
                      <h2 className="section-label">Phù hợp với mẹ</h2>
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

                {/* All / filtered rooms */}
                <div className="rooms-section">
                  <div className="section-hdr">
                    <h2 className="section-label">
                      {searchQuery ? `Kết quả tìm kiếm` : 'Phòng Cố Định'}
                    </h2>
                    {searchQuery && (
                      <span className="section-count">{filteredRooms.length} phòng</span>
                    )}
                  </div>
                  {filteredRooms.length > 0 ? (
                    <div className="rooms-list">
                      {filteredRooms.map(r => (
                        <RoomCard key={r.id} room={r} onClick={() => setActiveRoom(r)} />
                      ))}
                    </div>
                  ) : (
                    <div className="comm-empty-state">
                      <p className="comm-empty-title">Không tìm thấy phòng phù hợp</p>
                      <p className="comm-empty-sub">Thử từ khóa khác hoặc tạo phòng mới.</p>
                    </div>
                  )}
                </div>

                {/* Custom rooms */}
                {!searchQuery && (
                  <div className="rooms-section">
                    <div className="section-hdr">
                      <h2 className="section-label">Phòng Tự Tạo</h2>
                      <button className="create-room-btn" onClick={() => setShowCreateSheet(true)}>
                        <PlusIcon size={13} /> Tạo phòng
                      </button>
                    </div>
                    <p className="rooms-expire-note">
                      Phòng tự tạo sẽ tự đóng nếu không có tin mới trong 3 ngày.
                    </p>

                    {customRooms.length === 0 ? (
                      <div className="custom-empty">
                        <p className="comm-empty-title">Chưa có phòng nào được tạo</p>
                        <p className="comm-empty-sub">
                          Mẹ có thể tạo một chủ đề nhỏ để thảo luận cùng cộng đồng.
                        </p>
                        <div className="topic-suggestions">
                          {['Mẹ bầu cùng tháng', 'Bé cùng độ tuổi', 'Ăn dặm hôm nay'].map(t => (
                            <span key={t} className="topic-chip">{t}</span>
                          ))}
                        </div>
                        <button className="outline-btn" onClick={() => setShowCreateSheet(true)}>
                          Tạo phòng đầu tiên
                        </button>
                      </div>
                    ) : (
                      <div className="rooms-list">
                        {customRooms.map(r => (
                          <CustomRoomCard key={r.id} room={r} onClick={() => setActiveRoom(r)} />
                        ))}
                      </div>
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
            friendRequests={friendRequests}
            privateChats={privateChats}
            user={user}
            onAccept={acceptRequest}
            onDecline={declineRequest}
            onOpenChat={(chat) => setActiveRoom(chat)}
          />
        )}
      </div>

      {/* ── CREATE ROOM SHEET ── */}
      {showCreateSheet && (
        <CreateRoomSheet
          onClose={() => setShowCreateSheet(false)}
          currentUser={{ uid: user?.uid }}
        />
      )}

      {/* ── MEMBER PROFILE SHEET ── */}
      {selectedProfile && (
        <MemberProfileSheet
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
          onStartPrivateChat={(chat) => { setActiveRoom(chat); setSelectedProfile(null); }}
        />
      )}
    </div>
  );
}

/* ── Room Card ── */
function RoomCard({ room, badge, onClick }) {
  const RoomIcon = ROOM_ICON_MAP[room.id];
  return (
    <div className="room-card" onClick={onClick} role="button" tabIndex={0}>
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
          <span className="room-meta-item">{formatMemberCount(room.memberCount)} thành viên</span>
          {room.unreadCount > 0 && (
            <span className="room-meta-new">{room.unreadCount} tin mới</span>
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

/* ── Inbox View ── */
function InboxView({ friendRequests, privateChats, user, onAccept, onDecline, onOpenChat }) {
  return (
    <div className="inbox-wrap">
      {friendRequests.length > 0 && (
        <div className="rooms-section">
          <div className="section-hdr">
            <h2 className="section-label">Yêu cầu nhắn tin</h2>
            <span className="section-count">{friendRequests.length}</span>
          </div>
          <div className="requests-list">
            {friendRequests.map(req => (
              <div key={req.id} className="request-card">
                <Avatar name={req.senderName} photo={req.senderPhoto} size={46} />
                <div className="request-info">
                  <h4 className="request-name">{req.senderName}</h4>
                  {req.senderBaby && <p className="request-baby">Mẹ của {req.senderBaby}</p>}
                </div>
                <div className="request-actions">
                  <button className="req-btn accept" onClick={() => onAccept(req)}>✓</button>
                  <button className="req-btn decline" onClick={() => onDecline(req.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rooms-section">
        <div className="section-hdr">
          <h2 className="section-label">Đang trò chuyện</h2>
        </div>
        {privateChats.length === 0 ? (
          <div className="inbox-empty-state">
            <div className="inbox-empty-icon"><MessageIcon size={28} /></div>
            <p className="comm-empty-title">Chưa có tin nhắn nào</p>
            <p className="comm-empty-sub">Khi mẹ trò chuyện riêng, tin nhắn sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="rooms-list">
            {privateChats.map(chat => {
              const otherUid  = chat.participants?.find(id => id !== user?.uid);
              const otherUser = chat.participantData?.[otherUid];
              if (!otherUser) return null;
              return (
                <div key={chat.id} className="room-card" onClick={() => onOpenChat({
                  id: chat.id, name: otherUser.name, isPrivate: true, otherUid, otherUser
                })}>
                  <Avatar name={otherUser.name} photo={otherUser.photo} size={46} />
                  <div className="room-card-body" style={{ marginLeft: 4 }}>
                    <h3 className="room-name">{otherUser.name}</h3>
                    <p className="room-desc">Trò chuyện riêng tư</p>
                  </div>
                  <div className="room-arrow"><ChevronRightIcon size={18} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Create Room Bottom Sheet ── */
function CreateRoomSheet({ onClose, currentUser }) {
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [nameError, setNameError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setNameError('Tên phòng không được để trống.'); return; }
    if (name.trim().length < 3) { setNameError('Tên phòng cần ít nhất 3 ký tự.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'customRooms'), {
        name: name.trim(),
        desc: desc.trim(),
        isPublic,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
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
          <h3 className="sheet-title">Tạo phòng chat mới</h3>
          <button className="sheet-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <p className="sheet-hint">Tên phòng nên ngắn, dễ hiểu và tích cực.</p>

        <div className="sheet-form-group">
          <label>Tên phòng *</label>
          <input
            className={`sheet-input ${nameError ? 'has-error' : ''}`}
            placeholder="VD: Mẹ bầu cùng tháng, Bé 6 tháng..."
            value={name}
            onChange={e => { setName(e.target.value); setNameError(''); }}
            maxLength={30}
          />
          {nameError && <p className="input-error">{nameError}</p>}
          <p className="input-hint">{name.length}/30 ký tự</p>
        </div>

        <div className="sheet-form-group">
          <label>Chủ đề (tuỳ chọn)</label>
          <input
            className="sheet-input"
            placeholder="VD: Chia sẻ kinh nghiệm ăn dặm BLW"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            maxLength={60}
          />
        </div>

        <div className="sheet-form-group">
          <label>Chế độ phòng</label>
          <div className="privacy-toggle">
            <button
              className={`privacy-btn ${isPublic ? 'active' : ''}`}
              onClick={() => setIsPublic(true)}
            >Công khai</button>
            <button
              className={`privacy-btn ${!isPublic ? 'active' : ''}`}
              onClick={() => setIsPublic(false)}
            >Riêng tư</button>
          </div>
          <p className="input-hint">
            {isPublic ? 'Tất cả mọi người đều có thể vào phòng này.' : 'Chỉ người được mời mới vào được.'}
          </p>
        </div>

        <button
          className="submit-post-btn"
          disabled={!name.trim() || saving}
          onClick={handleCreate}
        >
          {saving ? 'Đang tạo...' : 'Tạo phòng'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHAT ROOM VIEW
════════════════════════════════════════════════ */
function ChatRoomView({ room, onBack, currentUser, onUserClick }) {
  const [messages, setMessages]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(false);
  const [isAnon, setIsAnon]           = useState(false);
  const [sending, setSending]         = useState(false);
  const [files, setFiles]             = useState([]);
  const [showRules, setShowRules]     = useState(false);
  const fileInputRef                  = useRef(null);
  const scrollRef                     = useRef(null);
  const [directText, setDirectText]   = useState('');
  const directFileInputRef            = useRef(null);


  /* ── Room type ── */
  const roomType = room.id || room.type || 'custom';

  /* ── Suggested topics by room type ── */
  const SUGGESTED_TOPICS = {
    pregnancy: [
      'Mẹ đang ở tuần thai bao nhiêu?',
      'Thai giáo nhẹ nhàng nên bắt đầu thế nào?',
      'Mẹ có đang nghén hoặc mệt không?',
      'Chuẩn bị gì trước khi sinh?',
    ],
    weaning: [
      'Bé mấy tháng thì bắt đầu ăn dặm?',
      'BLW hay ăn dặm kiểu Nhật?',
      'Món đầu tiên nên thử là gì?',
      'Bé không hợp tác khi ăn thì làm sao?',
    ],
    sleep: [
      'Bé hay thức đêm phải làm sao?',
      'Có nên luyện ngủ tự lập không?',
      'Lịch EASY có phù hợp không?',
      'Bé ngủ ngày ít có sao không?',
    ],
    health: [
      'Khi nào nên đưa bé đi khám?',
      'Bé ho/sốt cần theo dõi gì?',
      'Mẹ sau sinh mệt nhiều có bình thường không?',
    ],
    family: [
      'Mẹ cần được lắng nghe hôm nay?',
      'Chia sẻ việc chăm bé với chồng thế nào?',
      'Áp lực sau sinh nên nói với ai?',
      'Làm sao để mẹ có thời gian nghỉ ngơi?',
    ],
  };
  const suggestedTopics = SUGGESTED_TOPICS[roomType] || [
    'Bắt đầu chủ đề mới',
    'Chia sẻ kinh nghiệm',
    'Đặt câu hỏi cho cộng đồng',
  ];

  /* ── Pinned welcome post ── */
  const PINNED_CONTENT = {
    pregnancy: 'Chào mừng mẹ đến với Góc Mẹ Bầu. Đây là nơi mẹ có thể chia sẻ hành trình mang thai, đặt câu hỏi và đồng hành cùng các mẹ bầu khác. Mọi cảm xúc, thắc mắc đều được chào đón.',
    weaning:   'Chào mừng mẹ đến với Hành Trình Ăn Dặm! Dù chọn BLW, kiểu Nhật hay phương pháp truyền thống, không có đúng hay sai — chỉ có điều phù hợp nhất với bé và mẹ.',
    sleep:     'Chào mừng mẹ đến với Rèn Ngủ Xuyên Đêm. Giấc ngủ của bé là hành trình cần sự kiên nhẫn. Mẹ không cô đơn — các mẹ ở đây đều hiểu cảm giác thức đêm.',
    health:    'Chào mừng mẹ đến với Sức Khoẻ Mẹ & Bé. Ở đây mẹ có thể chia sẻ kinh nghiệm chăm sóc. Lưu ý: thông tin trong nhóm chỉ mang tính tham khảo, không thay thế tư vấn y tế.',
    family:    'Chào mừng mẹ đến với Chuyện Gia Đình. Đây là góc nhỏ để mẹ tâm sự, xả stress và cảm thấy được lắng nghe. Mọi câu chuyện đều xứng đáng được chia sẻ.',
  };
  const pinnedContent = PINNED_CONTENT[roomType]
    || `Chào mừng mẹ đến với ${room.name}. Đây là nơi mẹ có thể chia sẻ, đặt câu hỏi và đồng hành cùng các mẹ khác trong cùng giai đoạn.`;

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
    const selected = Array.from(e.target.files);
    const valid = selected.filter(f => {
      if (f.size > 10 * 1024 * 1024) { alert(`Ảnh ${f.name} vượt quá 10MB.`); return false; }
      return true;
    });
    if (valid.length > 0) {
      setFiles([valid[0]]);
    }
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

  const handleSendDirect = async () => {
    if (!directText.trim() && files.length === 0) return;
    if (sending) return;
    setSending(true);
    const content = directText;
    const attachedFiles = [...files];
    setDirectText('');
    setFiles([]);
    try {
      const imageUrls = await uploadImages(attachedFiles);
      const rIndex = Math.floor(Math.random() * ANIMAL_NAMES.length);
      const msgData = {
        title:       '',
        text:        content.trim(),
        images:      imageUrls,
        label:       null,
        createdAt:   serverTimestamp(),
        senderId:    currentUser.uid,
        isAnon:      isAnon,
        senderName:  isAnon ? `${ANIMAL_NAMES[rIndex]} Ẩn Danh` : currentUser.name,
        senderPhoto: isAnon ? ANIMAL_EMOJIS[rIndex] : currentUser.photo,
        senderBaby:  isAnon ? null : currentUser.baby,
      };
      const colName = room.isCustom ? 'customRooms' : 'chatRooms';
      await addDoc(collection(db, colName, room.id, 'messages'), msgData);
      if (room.isCustom) {
        await updateDoc(doc(db, 'customRooms', room.id), { lastMessageAt: serverTimestamp() });
      }
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const handleTopicSelect = (topic) => {
    setDirectText(topic);
  };

  const isEmpty    = messages.length === 0;
  const showTopics = messages.length < 5;

  /* ── Private chat: simple bubble view ── */
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

      {/* ── HEADER ── */}
      <header className="room-view-header">
        <button className="back-btn" onClick={onBack} aria-label="Quay lại">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="back-btn-label">Quay lại</span>
        </button>
        <div className="room-view-header-center">
          <h2 className="room-view-title">{room.name}</h2>
          <p className="room-view-status">
            {isEmpty
              ? 'Nhóm mới · Chưa có bài viết'
              : `${room.memberCount ? `${room.memberCount >= 1000 ? (room.memberCount/1000).toFixed(1)+'k' : room.memberCount} thành viên · ` : ''}${messages.length} bài`}
          </p>
        </div>
        <button className="room-rules-btn" onClick={() => setShowRules(true)} aria-label="Quy tắc nhóm">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </button>
      </header>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="room-view-content" ref={scrollRef}>

        {room.desc && <p className="room-view-desc">{room.desc}</p>}

        {/* Safety card */}
        <div className="room-safety-card">
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <span>Không gian được kiểm duyệt để mẹ chia sẻ an tâm.</span>
        </div>

        {/* Health disclaimer */}
        {roomType === 'health' && (
          <div className="room-health-disclaimer">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Thông tin trong nhóm chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.</span>
          </div>
        )}

        {/* Loading */}
        {loading && <RoomSkeleton />}

        {/* Error */}
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
            {/* Pinned welcome post */}
            <div className="pinned-post-card">
              <div className="pinned-post-label">
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Bài ghim từ Montessori AI
              </div>
              <p className="pinned-post-content">{pinnedContent}</p>
            </div>

            {/* Suggested topics */}
            {showTopics && (
              <div className="suggested-topics-card">
                <h3 className="suggested-topics-title">Mẹ có thể bắt đầu với</h3>
                <div className="suggested-topics-chips">
                  {suggestedTopics.map(t => (
                    <button key={t} className="topic-chip-btn" onClick={() => handleTopicSelect(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Posts list */}
            {!isEmpty && (
              <div className="posts-list">
                {messages.map(msg => (
                  <PostCard key={msg.id} msg={msg} currentUser={currentUser} onUserClick={onUserClick} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Input Bar at the bottom of group (iPhone premium style) */}
      {!loading && !loadError && (
        <div className="room-quick-input-bar-container">
          {/* Attached image previews */}
          {files.length > 0 && (
            <div className="quick-image-previews">
              <div className="quick-preview-item">
                <img src={URL.createObjectURL(files[0])} alt="preview" />
                <button type="button" className="quick-remove-file-btn" onClick={removeFile} aria-label="Xoá ảnh">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="room-quick-input-bar">
            <button className="quick-attach-btn" onClick={() => directFileInputRef.current?.click()} aria-label="Thêm ảnh" disabled={sending}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/heic,image/webp" 
              ref={directFileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />

            <button 
              className={`quick-anon-btn ${isAnon ? 'active' : ''}`} 
              onClick={() => setIsAnon(!isAnon)}
              title={isAnon ? "Chế độ ẩn danh: BẬT (Tên của mẹ sẽ được ẩn)" : "Chế độ ẩn danh: TẮT (Hiển thị tên thật)"}
              aria-label="Chế độ ẩn danh"
              disabled={sending}
            >
              {isAnon ? (
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M8 14a4 4 0 0 0 8 0" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                </svg>
              ) : (
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.0} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>

            <input
              type="text"
              className="quick-input-field"
              placeholder="Hỏi hoặc chia sẻ cùng các mẹ..."
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendDirect();
                }
              }}
              disabled={sending}
            />

            <button 
              className="quick-post-btn" 
              onClick={handleSendDirect} 
              disabled={sending || (!directText.trim() && files.length === 0)}
              style={{ opacity: sending || (!directText.trim() && files.length === 0) ? 0.6 : 1 }}
              aria-label="Gửi tin nhắn"
            >
              {sending ? (
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2.5} style={{ opacity: 0.2 }} />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
                </svg>
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {showRules && (
        <CommunityRulesSheet onClose={() => setShowRules(false)} roomType={roomType} />
      )}
    </div>
  );
}

/* ── Post Card ── */
function PostCard({ msg, currentUser, onUserClick }) {
  const isMe = msg.senderId === currentUser.uid;
  const isAI = msg.isAI === true;
  const labelMap = {
    question:   { text: 'Câu hỏi',              color: '#2F6B4F', bg: 'rgba(95,175,130,0.12)' },
    share:      { text: 'Chia sẻ',              color: '#5F8C72', bg: 'rgba(95,175,130,0.08)' },
    experience: { text: 'Kinh nghiệm cá nhân',  color: '#7B6A4F', bg: 'rgba(200,170,120,0.12)' },
  };
  const labelInfo = msg.label ? labelMap[msg.label] : null;

  return (
    <div className="post-card">
      <div className="post-card-author">
        {isAI ? (
          <div className="post-ai-avatar">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
        ) : msg.isAnon ? (
          <div className="chat-anon-avatar" style={{ width: 36, height: 36, fontSize: 18 }}>{msg.senderPhoto}</div>
        ) : (
          <Avatar name={msg.senderName} photo={msg.senderPhoto} size={36} />
        )}
        <div className="post-author-info">
          <div className="post-author-name-row">
            <span className="post-author-name"
              onClick={() => !isMe && !isAI && onUserClick?.(msg)}
              style={{ cursor: isMe || isAI ? 'default' : 'pointer' }}>
              {isAI ? 'Montessori AI' : msg.senderName}
            </span>
            {isAI    && <span className="post-ai-badge">AI</span>}
            {msg.isAnon && !isAI && <span className="post-anon-badge">Ẩn danh</span>}
            {isMe    && !isAI && <span className="post-me-badge">Bạn</span>}
          </div>
          {!isAI && !msg.isAnon && msg.senderBaby && (
            <span className="post-author-sub">Mẹ của {msg.senderBaby}</span>
          )}
        </div>
        <span className="post-time">{formatTime(msg.createdAt)}</span>
      </div>

      {(labelInfo || isAI) && (
        <div className="post-labels-row">
          {labelInfo && (
            <span className="post-label" style={{ color: labelInfo.color, background: labelInfo.bg }}>
              {labelInfo.text}
            </span>
          )}
          {isAI && (
            <span className="post-label" style={{ color: '#2F6B4F', background: 'rgba(95,175,130,0.1)' }}>
              Trả lời từ Montessori AI
            </span>
          )}
        </div>
      )}

      {msg.title && <h4 className="post-title">{msg.title}</h4>}
      {msg.text  && <p className="post-content">{msg.text}</p>}

      {msg.images?.length > 0 && (
        <div className={`post-images grid-${Math.min(msg.images.length, 4)}`}>
          {msg.images.map((url, i) => (
            <img key={i} src={url} alt="attachment" className="post-image" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Private Chat View ── */
function PrivateChatView({ room, onBack, currentUser, onUserClick, messages, loading,
  files, handleFileChange, removeFile, fileInputRef, scrollRef, uploadImages,
  isAnon, setIsAnon, sending, setSending }) {
  const [text, setText] = useState('');

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!text.trim() && files.length === 0) || sending) return;
    setSending(true);
    try {
      const imageUrls = await uploadImages();
      const rIndex = Math.floor(Math.random() * ANIMAL_NAMES.length);
      const msgData = {
        text: text.trim(), images: imageUrls, createdAt: serverTimestamp(),
        senderId: currentUser.uid, isAnon,
        senderName:  isAnon ? `${ANIMAL_NAMES[rIndex]} Ẩn Danh` : currentUser.name,
        senderPhoto: isAnon ? ANIMAL_EMOJIS[rIndex] : currentUser.photo,
        senderBaby:  isAnon ? null : currentUser.baby,
      };
      const colName = room.isCustom ? 'customRooms' : 'chatRooms';
      await addDoc(collection(db, colName, room.id, 'messages'), msgData);
      if (room.isCustom) await updateDoc(doc(db, 'customRooms', room.id), { lastMessageAt: serverTimestamp() });
      setText('');
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  return (
    <div className="chat-room-screen">
      <header className="room-header">
        <button className="back-btn" onClick={onBack} aria-label="Quay lại">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="back-btn-label">Quay lại</span>
        </button>
        <div className="room-header-info" style={{ cursor: 'pointer' }}
          onClick={() => onUserClick?.({ senderId: room.otherUid, senderName: room.otherUser?.name,
            senderPhoto: room.otherUser?.photo, senderBaby: room.otherUser?.baby, isAnon: false })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={room.otherUser?.name} photo={room.otherUser?.photo} size={34} />
            <div>
              <h2 className="room-header-title">{room.name}</h2>
              <span className="room-online-status">Trò chuyện riêng tư</span>
            </div>
          </div>
        </div>
      </header>
      <div className="chat-messages" ref={scrollRef}>
        {!loading && messages.length === 0 && (
          <div className="chat-empty"><ChatBubbleIcon size={28} strokeWidth={1.6} /><p>Hãy bắt đầu cuộc trò chuyện!</p></div>
        )}
        {messages.map((msg, idx) => {
          const isMe       = msg.senderId === currentUser.uid;
          const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId);
          const showName   = !isMe && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId);
          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMe ? 'is-me' : 'is-other'}`}>
              <div className="chat-bubble-row">
                {!isMe && (
                  <div className="chat-avatar-wrap" style={{ cursor: showAvatar ? 'pointer' : 'default' }}
                    onClick={showAvatar ? () => onUserClick?.(msg) : undefined}>
                    {showAvatar ? <Avatar name={msg.senderName} photo={msg.senderPhoto} size={36} /> : <div style={{ width: 36 }} />}
                  </div>
                )}
                <div className="chat-bubble-col">
                  {showName && <div className="chat-sender-name" style={{ cursor: 'pointer' }} onClick={() => onUserClick?.(msg)}>{msg.senderName}</div>}
                  <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                    {msg.text && <div className="chat-text">{msg.text}</div>}
                    {msg.images?.length > 0 && (
                      <div className={`chat-images-grid grid-${Math.min(msg.images.length, 4)} ${!msg.text ? 'no-text' : ''}`}>
                        {msg.images.map((url, i) => <img key={i} src={url} alt="attachment" className="chat-attached-img" />)}
                      </div>
                    )}
                  </div>
                  <div className="chat-meta">
                    <span className="chat-time">{formatTime(msg.createdAt)}</span>
                    {isMe && <span className="chat-status-icon">✓✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-input-area">
        {files.length > 0 && (
          <div className="chat-files-preview">
            <div className="chat-file-preview-item">
              <img src={URL.createObjectURL(files[0])} alt="preview" />
              <button type="button" className="chat-file-remove" onClick={removeFile}>✕</button>
            </div>
          </div>
        )}
        <form className="chat-input-row" onSubmit={handleSend}>
          <button type="button" className="chat-attach-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input type="file" accept="image/jpeg,image/png,image/heic,image/webp" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          <input type="text" className="chat-input" placeholder="Gửi tin nhắn..." value={text} onChange={e => setText(e.target.value)} />
          <label className="chat-anon-toggle">
             <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
             <span>Ẩn danh</span>
          </label>
          <button type="submit" className="chat-send-btn" disabled={(!text.trim() && files.length === 0) || sending}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </form>
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
function MemberProfileSheet({ profile, onClose, currentUser, onStartPrivateChat }) {
  const [status, setStatus]             = useState('none');
  const [existingChat, setExistingChat] = useState(null);
  const [loading, setLoading]           = useState(!profile.isAnon);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (profile.isAnon) return;
    const check = async () => {
      try {
        const qChats = query(collection(db, 'privateChats'), where('participants', 'array-contains', currentUser.uid));
        const snap   = await getDocs(qChats);
        let foundChat = null;
        const isFriend = snap.docs.some(d => {
          const data = d.data();
          const matches = data.participants?.includes(profile.uid);
          if (matches) {
            const otherUid  = data.participants.find(id => id !== currentUser.uid);
            const otherUser = data.participantData[otherUid];
            foundChat = { id: d.id, name: otherUser.name, isPrivate: true, otherUser };
          }
          return matches;
        });
        if (isFriend) { setStatus('friends'); setExistingChat(foundChat); return; }

        const [sentSnap, recvSnap] = await Promise.all([
          getDocs(query(collection(db, 'friendRequests'), where('senderId', '==', currentUser.uid), where('receiverId', '==', profile.uid), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'friendRequests'), where('senderId', '==', profile.uid), where('receiverId', '==', currentUser.uid), where('status', '==', 'pending'))),
        ]);
        if (!sentSnap.empty || !recvSnap.empty) setStatus('pending');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    check();
  }, [profile.uid, currentUser.uid, profile.isAnon]);

  const sendRequest = async () => {
    if (sendingRequest) return;
    setSendingRequest(true);
    try {
      await addDoc(collection(db, 'friendRequests'), {
        senderId: currentUser.uid, senderName: currentUser.name,
        senderPhoto: currentUser.photo, senderBaby: currentUser.baby,
        receiverId: profile.uid, status: 'pending', createdAt: serverTimestamp()
      });
      setStatus('pending');
    } catch (e) { console.error(e); }
    finally { setSendingRequest(false); }
  };

  const handlePrivateChat = async () => {
    if (status === 'friends' && existingChat) onStartPrivateChat(existingChat);
    else await sendRequest();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="member-profile-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close-btn" onClick={onClose}><CloseIcon /></button>

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
            <p className="member-role">{profile.baby ? `Mẹ của ${profile.baby}` : 'Thành viên Montessori AI'}</p>
            <div className="sheet-actions">
              {loading ? (
                <div className="loading-status">Đang tải...</div>
              ) : (
                <div className="actions-grid">
                  {status === 'friends' ? (
                    <button className="action-btn friend-btn status-friends" disabled>✓ Bạn bè</button>
                  ) : status === 'pending' ? (
                    <button className="action-btn friend-btn status-pending" disabled>Đã gửi yêu cầu</button>
                  ) : (
                    <button className="action-btn friend-btn" onClick={sendRequest} disabled={sendingRequest}>
                      {sendingRequest ? 'Đang gửi...' : 'Kết bạn'}
                    </button>
                  )}
                  <button className="action-btn chat-btn" onClick={handlePrivateChat}>Nhắn tin riêng</button>
                </div>
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


