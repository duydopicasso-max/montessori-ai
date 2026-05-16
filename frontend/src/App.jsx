import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import ChatScreen      from './pages/ChatScreen.jsx';
import IngestScreen    from './pages/IngestScreen.jsx';
import OnboardingScreen from './pages/OnboardingScreen.jsx';
import GrowthScreen    from './pages/GrowthScreen.jsx';
import BabyProfileScreen from './pages/BabyProfileScreen.jsx';
import MomentsScreen   from './pages/MomentsScreen.jsx';
import CommunityScreen from './pages/CommunityScreen.jsx';
import './App.css';

const NAV_TABS = [
  { id: 'chat',      icon: '💬', label: 'Trợ lý' },
  { id: 'growth',    icon: '📊', label: 'Tăng trưởng' },
  { id: 'community', icon: '👩‍👩‍👧', label: 'Cộng đồng' },
  { id: 'baby',      icon: '📋', label: 'Hồ sơ' },
  { id: 'moments',   icon: '📸', label: 'Khoảnh khắc' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [authUser, setAuthUser]   = useState(null);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let profileUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setAuthUser(firebaseUser);
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setProfile({ user: firebaseUser, ...snap.data() });
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('[App] Profile load error:', error);
          setLoading(false);
        });
      } else {
        setAuthUser(null);
        setProfile(null);
        setLoading(false);
        if (profileUnsub) profileUnsub();
      }
    });
    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const handleOnboardingComplete = (newProfile) => setProfile(newProfile);

  const handleLogout = async () => {
    if (window.confirm('Bạn có muốn đăng xuất không?')) {
      await signOut(auth);
      setProfile(null);
      setAuthUser(null);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">🌿</div>
        <div className="loading-spinner" />
        <div className="loading-text">Đang tải...</div>
      </div>
    );
  }

  /* ── Onboarding ── */
  if (!authUser || !profile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  const momName   = profile.momName || 'Mẹ';
  const babyCount = profile.numBabies || 1;
  const firstBaby = profile.babies?.[0];
  const babyLabel = firstBaby?.name || (babyCount > 1 ? `${babyCount} bé` : 'bé yêu');
  const sharedProfile = { ...profile, user: authUser, momName, childName: babyLabel };

  return (
    <div className="app-shell">

      {/* ── TOP BAR (mobile only) ── */}
      <div className="top-bar">
        <div className="top-bar-brand">
          <div className="top-bar-icon">🌿</div>
          <div>
            <div className="top-bar-name">Montessori AI</div>
            <div className="top-bar-sub">Trợ lý mẹ & bé</div>
          </div>
        </div>
        <div className="top-bar-profile">
          <div className="profile-chip">
            {authUser.photoURL
              ? <img src={authUser.photoURL} alt="avatar" className="profile-avatar" />
              : <div className="profile-avatar-emoji">{profile.status === 'pregnant' ? '🤰' : '👩‍🍼'}</div>
            }
            <div className="profile-name">Mẹ {momName}</div>
          </div>
          <button className="logout-icon-btn" onClick={handleLogout} title="Đăng xuất">🚪</button>
        </div>
      </div>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sidebar-desktop">
        <div className="sidebar-brand-desk">
          <div className="sidebar-brand-icon">🌿</div>
          <div>
            <div className="sidebar-brand-name">Montessori AI</div>
            <div className="sidebar-brand-sub">Trợ lý mẹ & bé</div>
          </div>
        </div>

        <div className="sidebar-user-desk">
          <div className="sidebar-avatar-desk">
            {authUser.photoURL
              ? <img src={authUser.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} alt="" />
              : (profile.status === 'pregnant' ? '🤰' : '👩‍🍼')
            }
          </div>
          <div className="sidebar-user-name">Mẹ {momName}</div>
          <div className="sidebar-user-status">
            {profile.status === 'pregnant' ? `🤰 Đang mang thai` : `👶 Bé ${babyLabel}`}
          </div>
        </div>

        <nav className="sidebar-nav-desk">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-item-desk ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-item-desk-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-desk">
          <button className="logout-desk-btn" onClick={handleLogout}>🚪 Đăng xuất</button>
          <div className="footer-badge-desk">🤖 Gemini 2.0 + RAG</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        {activeTab === 'chat'      && <ChatScreen    profile={{ ...sharedProfile, displayName: `Mẹ ${momName}`, role: 'Mẹ' }} />}
        {activeTab === 'growth'    && <GrowthScreen  profile={sharedProfile} />}
        {activeTab === 'community' && <CommunityScreen profile={sharedProfile} />}
        {activeTab === 'baby'      && <BabyProfileScreen profile={sharedProfile} />}
        {activeTab === 'moments'   && <MomentsScreen profile={sharedProfile} />}
        {activeTab === 'ingest'    && <IngestScreen />}
      </main>

      {/* ── BOTTOM NAVIGATION (mobile only) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
