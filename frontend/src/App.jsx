import { useState, useEffect } from 'react';
import ChatScreen from './pages/ChatScreen.jsx';
import IngestScreen from './pages/IngestScreen.jsx';
import OnboardingScreen from './pages/OnboardingScreen.jsx';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [profile, setProfile] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedProfile = localStorage.getItem('montessori_user_profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return <div className="loading-screen">🌿 Đang tải...</div>;
  }

  if (!profile) {
    return <OnboardingScreen onComplete={setProfile} />;
  }

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

        <div className="user-profile-mini">
          <div className="mini-avatar">{profile.avatar}</div>
          <div className="mini-info">
            <div className="mini-name">{profile.displayName}</div>
            <div className="mini-status">
              {profile.status === 'born' ? `Bé: ${profile.ageDisplay}` : `Thai kỳ: ${profile.ageDisplay}`}
            </div>
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
          <button className="reset-btn" onClick={() => {
            if(window.confirm('Bạn có muốn thiết lập lại thông tin người dùng?')) {
              localStorage.removeItem('montessori_user_profile');
              window.location.reload();
            }
          }}>
            ⚙️ Thiết lập lại
          </button>
          <div className="footer-badge">
            <span>🤖</span>
            <span>Gemini 2.0 Flash + RAG</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {activeTab === 'chat'   && <ChatScreen profile={profile} />}
        {activeTab === 'ingest' && <IngestScreen />}
      </main>
    </div>
  );
}
