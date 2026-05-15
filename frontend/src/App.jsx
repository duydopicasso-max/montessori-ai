import { useState } from 'react';
import ChatScreen from './pages/ChatScreen.jsx';
import IngestScreen from './pages/IngestScreen.jsx';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🌿</div>
          <div>
            <div className="brand-name">Montessori AI</div>
            <div className="brand-sub">Trợ lý mẹ & bé</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span className="nav-icon">💬</span>
            <span>Trợ lý AI</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingest')}
          >
            <span className="nav-icon">📚</span>
            <span>Thêm tài liệu</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-badge">
            <span>🤖</span>
            <span>Gemini 2.0 Flash + RAG</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {activeTab === 'chat'   && <ChatScreen />}
        {activeTab === 'ingest' && <IngestScreen />}
      </main>
    </div>
  );
}
