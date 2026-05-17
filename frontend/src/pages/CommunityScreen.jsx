/**
 * CommunityScreen.jsx
 * Hệ thống Phòng Chat Chủ Đề & Tin nhắn (Cộng đồng)
 * Có hỗ trợ chế độ Ẩn danh (Anonymous Mode)
 */
import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, limit, updateDoc, doc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './CommunityScreen.css';

/* ── Constants ── */
const CHAT_ROOMS = [
  { id: 'pregnancy', name: 'Góc Mẹ Bầu', emoji: '🤰', desc: 'Hành trình mang thai, thai giáo, chuẩn bị đón bé' },
  { id: 'weaning',   name: 'Hành Trình Ăn Dặm', emoji: '🥣', desc: 'Thực đơn, phương pháp BLW, kiểu Nhật, truyền thống' },
  { id: 'sleep',     name: 'Rèn Ngủ Xuyên Đêm', emoji: '💤', desc: 'EASY, luyện ngủ tự lập, tuần khủng hoảng (WW)' },
  { id: 'health',    name: 'Sức Khoẻ Mẹ & Bé', emoji: '🏥', desc: 'Kinh nghiệm chăm sóc bé ốm, phục hồi sau sinh' },
  { id: 'family',    name: 'Chuyện Gia Đình', emoji: '👨‍👩‍👧', desc: 'Tâm sự chuyện vợ chồng, bỉm sữa, xả stress' },
];

const ANIMAL_NAMES = ['Thỏ Ngọc', 'Gấu Misa', 'Cún Con', 'Mèo Ú', 'Sóc Nhỏ', 'Cáo Nâu', 'Hươu Cao Cổ', 'Chim Cánh Cụt'];
const ANIMAL_EMOJIS = ['🐰', '🐻', '🐶', '🐱', '🐿️', '🦊', '🦒', '🐧'];

/* ── Time helper ── */
function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CommunityScreen({ profile }) {
  const user = profile?.user;
  const babies = profile?.babies || [];
  const authorName  = profile?.momName || user?.displayName?.split(' ')[0] || 'Mẹ';
  const authorPhoto = user?.photoURL || '';
  const authorBaby  = babies[0]?.name || '';

  const [tab, setTab] = useState('rooms'); // 'rooms', 'inbox'
  const [activeRoom, setActiveRoom] = useState(null); // null or room object
  const [customRooms, setCustomRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Sync and auto-cleanup custom rooms (3 days = 72 hours)
  useEffect(() => {
    const q = query(collection(db, 'customRooms'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const now = Date.now();
      const validRooms = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const lastMsgTime = data.lastMessageAt ? data.lastMessageAt.toMillis() : (data.createdAt?.toMillis() || now);
        const diffDays = (now - lastMsgTime) / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 3) {
          // Xoá phòng nếu quá 3 ngày không có tin nhắn
          deleteDoc(doc(db, 'customRooms', d.id)).catch(e => console.error('Lỗi xoá phòng:', e));
        } else {
          validRooms.push({ id: d.id, ...data, isCustom: true });
        }
      });
      setCustomRooms(validRooms);
    });
    return unsub;
  }, []);

  // --- RENDERS ---
  if (activeRoom) {
    return (
      <ChatRoomView 
        room={activeRoom} 
        onBack={() => setActiveRoom(null)}
        currentUser={{ uid: user?.uid, name: authorName, photo: authorPhoto, baby: authorBaby }}
      />
    );
  }

  return (
    <div className="community-screen">
      <header className="community-header">
        <div>
          <h1 className="community-title">👩‍👩‍👧 Cộng đồng</h1>
          <p className="community-sub">Chia sẻ · Đồng hành · Chữa lành</p>
        </div>
      </header>

      <div className="community-tabs">
        <button className={`comm-tab ${tab === 'rooms' ? 'active' : ''}`} onClick={() => setTab('rooms')}>
          💬 Phòng Chat
        </button>
        <button className={`comm-tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
          📬 Hộp Thư
        </button>
      </div>

      <div className="community-content">
        {tab === 'rooms' && (
          <div className="rooms-list-container">
            <div className="rooms-section-header">
              <h2 className="rooms-section-title">Phòng Cố Định</h2>
            </div>
            <div className="rooms-list">
              {CHAT_ROOMS.map(r => (
                <div key={r.id} className="room-card" onClick={() => setActiveRoom(r)}>
                  <div className="room-icon">{r.emoji}</div>
                  <div className="room-info">
                    <h3 className="room-name">{r.name}</h3>
                    <p className="room-desc">{r.desc}</p>
                  </div>
                  <div className="room-arrow">➔</div>
                </div>
              ))}
            </div>

            <div className="rooms-section-header custom-header">
              <h2 className="rooms-section-title">Phòng Tự Tạo</h2>
              <button className="create-room-btn" onClick={() => setShowCreateModal(true)}>+ Tạo Phòng</button>
            </div>
            <p className="rooms-section-note">Phòng tự tạo sẽ tự động đóng nếu không có tin nhắn mới trong 3 ngày.</p>
            
            <div className="rooms-list">
              {customRooms.length === 0 && (
                <div className="custom-rooms-empty">Chưa có phòng nào được tạo. Hãy tạo chủ đề mới để thảo luận nhé!</div>
              )}
              {customRooms.map(r => (
                <div key={r.id} className="room-card custom" onClick={() => setActiveRoom(r)}>
                  <div className="room-icon">{r.emoji}</div>
                  <div className="room-info">
                    <h3 className="room-name">{r.name}</h3>
                    <p className="room-desc">{r.desc}</p>
                  </div>
                  <div className="room-arrow">➔</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'inbox' && (
          <div className="inbox-empty">
            <div className="inbox-icon">📬</div>
            <h3>Hộp thư trống</h3>
            <p>Khi có ai đó gửi yêu cầu trò chuyện hoặc nhắn tin riêng cho bạn, nó sẽ hiển thị ở đây.</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal 
          onClose={() => setShowCreateModal(false)} 
          currentUser={{ uid: user?.uid }}
        />
      )}
    </div>
  );
}

function CreateRoomModal({ onClose, currentUser }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [emoji, setEmoji] = useState('🌟');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'customRooms'), {
        name: name.trim(),
        desc: desc.trim(),
        emoji,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp() // init with current time so it doesn't expire instantly
      });
      onClose();
    } catch (err) {
      alert("Lỗi tạo phòng: " + err.message);
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
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Tên chủ đề (Ngắn gọn)</label>
          <input 
            className="chat-input" style={{ border: '2px solid var(--cream-dark)', borderRadius: 12, padding: 12 }}
            placeholder="VD: Hội bỉm sữa Thủ Đức..." 
            value={name} onChange={e => setName(e.target.value)} maxLength={30}
          />
        </div>
        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Mô tả ngắn</label>
          <input 
            className="chat-input" style={{ border: '2px solid var(--cream-dark)', borderRadius: 12, padding: 12 }}
            placeholder="VD: Cùng rủ nhau đi chơi cuối tuần" 
            value={desc} onChange={e => setDesc(e.target.value)} maxLength={60}
          />
        </div>
        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Biểu tượng (Emoji)</label>
          <div className="emoji-picker-row" style={{ display: 'flex', gap: 8, fontSize: 24, marginTop: 4 }}>
            {['🌟','❤️','🧸','👶','👗','🍔','🔥'].map(e => (
              <span key={e} onClick={() => setEmoji(e)} style={{ cursor: 'pointer', opacity: emoji === e ? 1 : 0.4 }}>{e}</span>
            ))}
          </div>
        </div>

        <button 
          className="submit-post-btn" style={{ marginTop: 24, width: '100%' }}
          disabled={!name.trim() || saving}
          onClick={handleCreate}
        >
          {saving ? '⏳...' : 'Tạo phòng ngay'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   CHAT ROOM VIEW
════════════════════════════════════════════════ */
function ChatRoomView({ room, onBack, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sync messages
  useEffect(() => {
    const colName = room.isCustom ? 'customRooms' : 'chatRooms';
    const q = query(collection(db, colName, room.id, 'messages'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [room.id, room.isCustom]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    // Check size & limit
    const validFiles = [];
    for (let f of selected) {
      if (f.size > 10 * 1024 * 1024) {
        alert(`Ảnh ${f.name} vượt quá 10MB.`);
        continue;
      }
      validFiles.push(f);
    }
    
    setFiles(prev => {
      const newFiles = [...prev, ...validFiles];
      if (newFiles.length > 9) {
        alert('Chỉ được chọn tối đa 9 ảnh.');
        return newFiles.slice(0, 9);
      }
      return newFiles;
    });
    e.target.value = null; // reset
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async () => {
    const urls = [];
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST', body: formData
        });
        const data = await res.json();
        if (data.secure_url) urls.push(data.secure_url);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    return urls;
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!text.trim() && files.length === 0) || sending) return;
    setSending(true);

    try {
      const imageUrls = await uploadImages();

      let msgData = {
        text: text.trim(),
        images: imageUrls,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid, 
      };

      if (isAnon) {
        const rIndex = Math.floor(Math.random() * ANIMAL_NAMES.length);
        msgData.isAnon = true;
        msgData.senderName = `${ANIMAL_NAMES[rIndex]} Ẩn Danh`;
        msgData.senderPhoto = ANIMAL_EMOJIS[rIndex]; 
      } else {
        msgData.isAnon = false;
        msgData.senderName = currentUser.name;
        msgData.senderPhoto = currentUser.photo;
        msgData.senderBaby = currentUser.baby;
      }

      const colName = room.isCustom ? 'customRooms' : 'chatRooms';
      await addDoc(collection(db, colName, room.id, 'messages'), msgData);
      
      // Update lastMessageAt for auto-cleanup logic
      if (room.isCustom) {
        await updateDoc(doc(db, 'customRooms', room.id), {
          lastMessageAt: serverTimestamp()
        });
      }

      setText('');
      setFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-room-screen">
      <header className="room-header">
        <button className="back-btn" onClick={onBack}>⬅</button>
        <div className="room-header-info">
          <h2 className="room-header-title">{room.emoji} {room.name}</h2>
          <span className="room-online-status">🟢 Đang hoạt động</span>
        </div>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span>{room.emoji}</span>
            <p>Hãy là người đầu tiên gửi tin nhắn vào phòng này!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.uid;
          const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx+1]?.senderId !== msg.senderId);
          const showName = !isMe && (idx === 0 || messages[idx-1]?.senderId !== msg.senderId);

          return (
            <div key={msg.id} className={`chat-bubble-wrap ${isMe ? 'is-me' : 'is-other'}`}>
              <div className="chat-bubble-row">
                {!isMe && (
                  <div className="chat-avatar-wrap">
                    {showAvatar ? (
                      msg.isAnon ? (
                        <div className="chat-anon-avatar">{msg.senderPhoto}</div>
                      ) : (
                        <Avatar name={msg.senderName} photo={msg.senderPhoto} size={40} />
                      )
                    ) : (
                      <div style={{ width: 40 }} />
                    )}
                  </div>
                )}

                <div className="chat-bubble-col">
                  {showName && (
                    <div className="chat-sender-name">
                      {msg.senderName} 
                      {!msg.isAnon && msg.senderBaby && <span className="chat-sender-baby"> (Mẹ của {msg.senderBaby})</span>}
                    </div>
                  )}
                  
                  <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                    {msg.text && <div className="chat-text">{msg.text}</div>}
                    
                    {msg.images && msg.images.length > 0 && (
                      <div className={`chat-images-grid grid-${Math.min(msg.images.length, 4)} ${!msg.text ? 'no-text' : ''}`}>
                        {msg.images.map((imgUrl, i) => (
                          <img key={i} src={imgUrl} alt="attachment" className="chat-attached-img" />
                        ))}
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
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {files.length > 0 && (
          <div className="chat-files-preview">
            {files.map((f, i) => (
              <div key={i} className="chat-file-preview-item">
                <img src={URL.createObjectURL(f)} alt="preview" />
                <button type="button" className="chat-file-remove" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="anon-toggle">
          <label className="switch">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
            <span className="slider round"></span>
          </label>
          <span className="anon-label">👻 Chế độ ẩn danh</span>
        </div>
        
        <form className="chat-input-row" onSubmit={handleSend}>
          <button type="button" className="chat-attach-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input 
            type="file" 
            multiple 
            accept="image/jpeg,image/png,image/heic,image/webp" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          <input 
            type="text" 
            className="chat-input" 
            placeholder={isAnon ? "Gửi tin nhắn ẩn danh..." : "Gửi tin nhắn..."}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" disabled={(!text.trim() && files.length === 0) || sending}>
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   AVATAR component
════════════════════════════════════════════════ */
function Avatar({ name, photo, size }) {
  const initial = name ? name[0].toUpperCase() : '?';
  const colors = ['#5C9E7A','#7DB896','#6BBF8E','#A8D5B5','#4A8566'];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];

  return photo && photo.startsWith('http')
    ? <img src={photo} alt={name} className="avatar-img" style={{ width: size, height: size }} />
    : (
      <div className="avatar-initials" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
        {initial}
      </div>
    );
}
