/**
 * ChatScreen.jsx — Bong Bóng Chat UI
 * AI-bubble: #E8F4EA (sage green, left)
 * User-bubble: #FDE8E6 (peach, right)
 * Image upload via Cloudinary · Status: ✓ ✓✓ ⏱ ⚠️
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import './ChatScreen.css';

const API_BASE      = import.meta.env.VITE_API_URL || '/api';
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* ── Suggested questions per child stage ── */
const QUESTION_POOL = {
  pregnant:  ['🤰 Chế độ dinh dưỡng tốt nhất cho mẹ bầu?','🧘 Bài tập nhẹ nhàng cho mẹ bầu?','💤 Cách ngủ ngon ở tam cá nguyệt này?','🏥 Mốc khám thai quan trọng cần lưu ý?','🍼 Cần chuẩn bị gì trước khi sinh bé?','🌱 Áp dụng Montessori từ trong bụng mẹ?'],
  newborn:   ['🤱 Thiết lập lịch sinh hoạt EASY cho bé sơ sinh?','😴 Mẹo giúp bé phân biệt ngày đêm?','👐 Kích thích giác quan cho bé dưới 6 tháng?','🧴 Chăm sóc da bé sơ sinh đúng cách?','🧩 Đồ chơi Montessori đầu đời là gì?','🤱 Chế độ ăn để có sữa tốt cho bé?'],
  infant:    ['🍎 Bé 6 tháng bắt đầu ăn dặm thế nào?','🥦 Thực đơn ăn dặm kiểu Nhật/BLW?','🚶 Dấu hiệu bé sắp biết bò/biết đi?','🦷 Bé mọc răng quấy khóc làm gì?','📦 Môi trường Montessori cho bé tập bò?','🗣️ Kích thích ngôn ngữ giai đoạn bập bẹ?'],
  toddler:   ['🧠 Kích thích trí não bé 1-3 tuổi?','🎨 Hoạt động Montessori tại nhà?','😤 Xử lý cơn hờn dỗi (tantrums)?','🚽 Tập vệ sinh cho bé đúng thời điểm?','🥗 Bé biếng ăn phải làm sao?','📖 Sách hay cho bé 2 tuổi phát triển ngôn ngữ?'],
  preschool: ['🤝 Dạy bé kỹ năng giao tiếp chia sẻ?','🧮 Montessori giúp bé làm quen toán học?','📝 Chuẩn bị tâm lý trước khi đi học?','🏃 Trò chơi vận động cho bé 3-6 tuổi?','🎨 Phát triển sáng tạo qua hội họa?','🧹 Dạy bé làm việc nhà theo Montessori?'],
};

function getSuggestions(profile) {
  if (profile.status === 'pregnant') return QUESTION_POOL.pregnant;
  const m = parseInt(profile.ageInfo?.months || 0);
  const y = parseInt(profile.ageInfo?.years  || 0) || Math.floor(m / 12);
  if (m < 6)  return QUESTION_POOL.newborn;
  if (m < 12) return QUESTION_POOL.infant;
  if (y < 3)  return QUESTION_POOL.toddler;
  return QUESTION_POOL.preschool;
}

async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'montessori/chat');
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  return data.secure_url;
}

/* ══════════ MAIN SCREEN ══════════ */
export default function ChatScreen({ profile }) {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [sessionId]                       = useState(() => uuidv4());
  const [history,       setHistory]       = useState([]);
  const [pendingImgs,   setPendingImgs]   = useState([]);
  const [uploadingImg,  setUploadingImg]  = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);

  const suggestions = getSuggestions(profile);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const pickImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 9);
    setPendingImgs(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f), id: uuidv4() }))].slice(0, 9));
    e.target.value = '';
  };

  const removeImg = (id) => setPendingImgs(prev => prev.filter(p => p.id !== id));

  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim();
    if ((!question && pendingImgs.length === 0) || isLoading) return;

    let imageUrls = [];
    if (pendingImgs.length > 0 && CLOUD_NAME && UPLOAD_PRESET) {
      setUploadingImg(true);
      imageUrls = await Promise.all(pendingImgs.map(p => uploadToCloudinary(p.file)));
      setUploadingImg(false);
    }

    const userMsg = { id: uuidv4(), role: 'user', content: question, images: imageUrls, status: 'sent', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImgs([]);
    setIsLoading(true);

    try {
      const ctx = `[Profile: ${profile.displayName}, ${profile.role}, Child: ${profile.childName}, ${profile.status}] `;
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: ctx + (question || '(Gửi ảnh)'), sessionId, history }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const aiMsg = { id: uuidv4(), role: 'assistant', content: data.answer, status: 'delivered', timestamp: new Date() };
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], status: 'seen' },
        aiMsg,
      ]);
      setHistory(prev => [...prev, { userMessage: question, aiMessage: data.answer }]);
    } catch {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'error', content: '❌ Lỗi kết nối. Vui lòng thử lại.', status: 'failed', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, history, pendingImgs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]); setHistory([]);
    fetch(`${API_BASE}/chat/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  };

  const canSend = (input.trim() || pendingImgs.length > 0) && !isLoading && !uploadingImg;

  return (
    <div className="chat-screen">

      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="ai-avatar-header">
            <span>🌿</span>
            <span className="online-dot" />
          </div>
          <div>
            <h1 className="header-title">Trợ lý Montessori AI</h1>
            <p className="header-status">🟢 Đang hoạt động</p>
          </div>
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat} title="Xóa cuộc trò chuyện">🗑️</button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <WelcomeScreen profile={profile} onSuggest={sendMessage} suggestions={suggestions} />
        ) : (
          <div className="messages-list">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} profile={profile} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="input-area">
        {pendingImgs.length > 0 && (
          <div className="pending-images-row">
            {pendingImgs.map(img => (
              <div key={img.id} className="pending-img-thumb">
                <img src={img.preview} alt="pending" />
                <button className="remove-pending-img" onClick={() => removeImg(img.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
        {messages.length === 0 && pendingImgs.length === 0 && (
          <div className="suggestions-row">
            {suggestions.slice(0, 2).map((q, i) => (
              <button key={i} className="suggestion-chip" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>
        )}
        <div className="input-wrapper">
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={pickImages} />
          <button className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Đính kèm ảnh">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="4"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImgs.length > 0 ? 'Thêm mô tả cho ảnh...' : 'Hỏi về thai kỳ, chăm sóc bé, Montessori...'}
            rows={1}
            disabled={isLoading}
          />
          <button className={`send-btn ${canSend ? 'ready' : ''}`} onClick={() => sendMessage()} disabled={!canSend}>
            {(isLoading || uploadingImg) ? (
              <span className="send-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="input-hint">Enter gửi · Shift+Enter xuống dòng</p>
      </div>

    </div>
  );
}

/* ══════════ WELCOME ══════════ */
function WelcomeScreen({ profile, onSuggest, suggestions }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-avatar">
          <span className="welcome-icon-inner">🌿</span>
          <span className="welcome-online-ring" />
        </div>
        <div className="welcome-badge">Trợ lý AI Montessori</div>
        <h2 className="welcome-title">Xin chào, {profile.displayName}! 👋</h2>
        <p className="welcome-desc">
          Tôi sẵn sàng đồng hành cùng {profile.role} trong hành trình chăm sóc {profile.childName} 🌱
        </p>
      </div>
      <div className="suggestions-grid">
        {suggestions.map((q, i) => (
          <button key={i} className="suggestion-card" onClick={() => onSuggest(q)}>{q}</button>
        ))}
      </div>
    </div>
  );
}

/* ══════════ MESSAGE BUBBLE ══════════ */
function MessageBubble({ message, profile }) {
  const isUser  = message.role === 'user';
  const isError = message.role === 'error';
  const [expanded, setExpanded] = useState(null);

  const timeStr = message.timestamp?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const Status = () => {
    if (!isUser) return null;
    if (message.status === 'sending') return <span className="msg-status sending">⏱</span>;
    if (message.status === 'failed')  return <span className="msg-status failed">⚠️</span>;
    if (message.status === 'seen')    return <span className="msg-status seen">✓✓</span>;
    return <span className="msg-status sent">✓</span>;
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}>
      {!isUser && <div className="msg-avatar ai-msg-avatar">🌿</div>}

      <div className={`bubble-group ${isUser ? 'user-group' : 'ai-group'}`}>
        {/* Image grid */}
        {message.images && message.images.length > 0 && (
          <div className={`bubble img-bubble ${isUser ? 'user-img-bubble' : 'ai-img-bubble'}`}>
            <div className={`img-grid img-grid-${Math.min(message.images.length, 4)}`}>
              {message.images.map((url, i) => (
                <img key={i} src={url} alt={`img-${i}`} className="chat-img" onClick={() => setExpanded(url)} />
              ))}
            </div>
          </div>
        )}

        {/* Text bubble */}
        {(message.content || isError) && (
          <div className={`bubble ${isUser ? 'user-bubble' : isError ? 'error-bubble' : 'ai-bubble'}`}>
            {message.role === 'assistant' ? (
              <div className="markdown-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            ) : (
              <p className="bubble-text">{message.content}</p>
            )}
          </div>
        )}

        {/* Time + status */}
        <div className={`msg-footer ${isUser ? 'msg-footer-right' : ''}`}>
          <time className="msg-time">{timeStr}</time>
          <Status />
        </div>
      </div>

      {isUser && (
        <div className="msg-avatar user-msg-avatar">
          {profile?.user?.photoURL
            ? <img src={profile.user.photoURL} alt="me" />
            : <span>{profile?.status === 'pregnant' ? '🤰' : '👩‍🍼'}</span>
          }
        </div>
      )}

      {expanded && (
        <div className="img-lightbox" onClick={() => setExpanded(null)}>
          <img src={expanded} alt="expanded" />
        </div>
      )}
    </div>
  );
}

/* ══════════ TYPING INDICATOR ══════════ */
function TypingIndicator() {
  return (
    <div className="message-row ai">
      <div className="msg-avatar ai-msg-avatar">🌿</div>
      <div className="bubble ai-bubble typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  );
}
