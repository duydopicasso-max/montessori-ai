import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import './ChatScreen.css';

// Production: VITE_API_URL=https://your-railway-app.up.railway.app/api
// Development: Vite proxy → localhost:3001/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';


const QUESTION_POOL = {
  pregnant: [
    '🤰 Chế độ dinh dưỡng tốt nhất cho mẹ bầu là gì?',
    '🧘 Các bài tập vận động nhẹ nhàng cho mẹ bầu?',
    '💤 Làm sao để mẹ bầu ngủ ngon hơn ở tam cá nguyệt này?',
    '🏥 Những mốc khám thai quan trọng cần lưu ý?',
    '🍼 Cần chuẩn bị những gì trước khi sinh bé?',
    '🌱 Áp dụng Montessori cho bé ngay từ trong bụng mẹ?'
  ],
  newborn: [
    '🤱 Cách thiết lập lịch sinh hoạt EASY cho bé sơ sinh?',
    '😴 Mẹo giúp bé phân biệt ngày đêm và ngủ sâu giấc?',
    '👐 Các hoạt động kích thích giác quan cho bé dưới 6 tháng?',
    '🧴 Chăm sóc da và vệ sinh cho bé sơ sinh đúng cách?',
    '🧩 Những đồ chơi Montessori đầu đời cho bé là gì?',
    '🤱 Chế độ ăn uống cho mẹ để có sữa tốt cho bé?'
  ],
  infant: [
    '🍎 Bé 6 tháng bắt đầu ăn dặm như thế nào là tốt nhất?',
    '🥦 Thực đơn ăn dặm kiểu Nhật/BLW cho bé?',
    '🚶 Dấu hiệu bé sắp biết bò/biết đi và cách hỗ trợ?',
    '🦷 Bé mọc răng quấy khóc, Ba/Mẹ nên làm gì?',
    '📦 Cách sắp xếp môi trường Montessori cho bé tập bò?',
    '🗣️ Kích thích ngôn ngữ cho bé giai đoạn bập bẹ?'
  ],
  toddler: [
    '🧠 Cách kích thích phát triển trí não cho bé 1-3 tuổi?',
    '🎨 Các hoạt động Montessori tại nhà cho bé tập làm?',
    '😤 Xử lý cơn hờn dỗi (tantrums) của bé như thế nào?',
    '🚽 Khi nào và làm sao để tập cho bé đi vệ sinh (potty training)?',
    '🥗 Làm sao để bé không bị biếng ăn giai đoạn này?',
    '📖 Những cuốn sách hay cho bé 2 tuổi phát triển ngôn ngữ?'
  ],
  preschool: [
    '🤝 Cách dạy bé kỹ năng giao tiếp và chia sẻ với bạn bè?',
    '🧮 Hoạt động Montessori giúp bé làm quen với toán học?',
    '📝 Chuẩn bị tâm lý và kỹ năng cho bé trước khi đi học?',
    '🏃 Các trò chơi vận động ngoài trời cho bé 3-6 tuổi?',
    '🎨 Phát triển tính sáng tạo qua hội họa và âm nhạc?',
    '🧹 Dạy bé làm việc nhà theo tinh thần Montessori?'
  ]
};

const getSuggestedQuestions = (profile) => {
  if (profile.status === 'pregnant') return QUESTION_POOL.pregnant;
  
  const months = parseInt(profile.ageInfo?.months || 0);
  const years = parseInt(profile.ageInfo?.years || 0) || Math.floor(months / 12);
  
  if (months < 6) return QUESTION_POOL.newborn;
  if (months < 12) return QUESTION_POOL.infant;
  if (years < 3) return QUESTION_POOL.toddler;
  return QUESTION_POOL.preschool;
};

export default function ChatScreen({ profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId]             = useState(() => uuidv4());
  const [history, setHistory]   = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  const dynamicSuggestions = getSuggestedQuestions(profile);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || isLoading) return;

    const userMsg = { id: uuidv4(), role: 'user', content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Construct a contextual prompt that includes user profile for better "xưng hô"
      const profileContext = `[User Profile: Name: ${profile.displayName}, Role: ${profile.role}, Child: ${profile.childName}, Status: ${profile.status === 'born' ? 'Born' : 'Pregnant'}] `;
      
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: profileContext + question, 
          sessionId, 
          history 
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const aiMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        contextUsed: data.contextUsed || 0,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(prev => [...prev, { userMessage: question, aiMessage: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'error',
        content: '❌ Có lỗi kết nối. Vui lòng kiểm tra backend và thử lại.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, history]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    fetch(`${API_BASE}/chat/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="chat-screen">
      {/* ── Header ── */}
      <header className="chat-header">
        <div className="header-info">
          <div className="header-avatar">🌿</div>
          <div>
            <h1 className="header-title">Trợ lý Montessori AI</h1>
            <p className="header-subtitle">Tư vấn mẹ & bé · Thai kỳ · Giáo dục Montessori</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="status-dot" title="Đang hoạt động" />
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat} title="Xóa cuộc trò chuyện">
              🗑️
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <WelcomeScreen 
            profile={profile} 
            onSuggest={sendMessage} 
            dynamicSuggestions={dynamicSuggestions} 
          />
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

      {/* ── Input Area ── */}
      <div className="input-area">
        {messages.length === 0 && (
          <div className="suggestions-row">
            {dynamicSuggestions.slice(0, 3).map((q, i) => (
              <button key={i} className="suggestion-chip" onClick={() => sendMessage(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về thai kỳ, chăm sóc bé, phương pháp Montessori..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className={`send-btn ${isLoading || !input.trim() ? 'disabled' : ''}`}
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <span className="send-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        <p className="input-hint">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  );
}

/* ── Welcome Screen ────────────────────────────────────────── */
function WelcomeScreen({ profile, onSuggest, dynamicSuggestions }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-orb" />
        <div className="welcome-icon">🌿</div>
        <h2 className="welcome-title">Xin chào, {profile.displayName}!</h2>
        <p className="welcome-desc">
          Tôi là trợ lý AI Montessori. Tôi đã sẵn sàng đồng hành cùng {profile.role} trong hành trình chăm sóc {profile.childName} rồi đây!
        </p>
      </div>

      <div className="suggestions-grid">
        {dynamicSuggestions.map((q, i) => (
          <button key={i} className="suggestion-card" onClick={() => onSuggest(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────── */
function MessageBubble({ message, profile }) {
  const isUser      = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError     = message.role === 'error';

  return (
    <div className={`message-row ${isUser ? 'user' : 'ai'}`}
         style={{ animation: 'fadeInUp 0.3s ease forwards' }}>
      {!isUser && (
        <div className="avatar ai-avatar">🌿</div>
      )}
      <div className={`bubble ${isUser ? 'user-bubble' : isError ? 'error-bubble' : 'ai-bubble'}`}>
        {isAssistant ? (
          <div className="markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p>{message.content}</p>
        )}


        <time className="message-time">
          {message.timestamp?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
      {isUser && (
        <div className="avatar user-avatar" style={{ fontSize: '1.2rem' }}>
          {profile?.avatar || '👤'}
        </div>
      )}
    </div>
  );
}

/* ── Typing Indicator ──────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="message-row ai" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="avatar ai-avatar">🌿</div>
      <div className="bubble ai-bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
