import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import './ChatScreen.css';

// Production: VITE_API_URL=https://your-railway-app.up.railway.app/api
// Development: Vite proxy → localhost:3001/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';


const SUGGESTED_QUESTIONS = [
  '🤰 Tôi đang mang thai 3 tháng, cần chú ý những gì?',
  '🍼 Trẻ 6 tháng tuổi nên ăn dặm như thế nào?',
  '🌱 Phương pháp Montessori phù hợp với trẻ mấy tuổi?',
  '😴 Làm sao để bé ngủ ngon giấc hơn?',
  '🧠 Cách kích thích phát triển trí não cho bé 1 tuổi?',
  '🌡️ Bé bị sốt nhẹ thì xử lý thế nào tại nhà?',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId]             = useState(() => uuidv4());
  const [history, setHistory]   = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

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
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, sessionId, history }),
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
          <WelcomeScreen onSuggest={sendMessage} />
        ) : (
          <div className="messages-list">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
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
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
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
function WelcomeScreen({ onSuggest }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-hero">
        <div className="welcome-orb" />
        <div className="welcome-icon">🌿</div>
        <h2 className="welcome-title">Xin chào, Mẹ ơi!</h2>
        <p className="welcome-desc">
          Tôi là trợ lý AI được đào tạo từ tài liệu thai kỳ và giáo trình Montessori.
          Hãy hỏi tôi bất kỳ điều gì về hành trình làm mẹ của bạn nhé!
        </p>
      </div>

      <div className="suggestions-grid">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button key={i} className="suggestion-card" onClick={() => onSuggest(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────── */
function MessageBubble({ message }) {
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
        <div className="avatar user-avatar">👤</div>
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
