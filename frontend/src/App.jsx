import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import ChatScreen      from './pages/ChatScreen.jsx';
import TrackerScreen   from './pages/TrackerScreen.jsx';
import IngestScreen    from './pages/IngestScreen.jsx';
import OnboardingScreen from './pages/OnboardingScreen.jsx';
import GrowthScreen    from './pages/GrowthScreen.jsx';
import BabyProfileScreen from './pages/BabyProfileScreen.jsx';
import MomentsScreen   from './pages/MomentsScreen.jsx';
import CommunityScreen from './pages/CommunityScreen.jsx';
import AdminImportScreen from './pages/AdminImportScreen.jsx';
import AdminReviewQueueScreen from './pages/AdminReviewQueueScreen.jsx';
import './App.css';

/* ══ SVG Outline Navigation Icons ══ */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const LeafIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);
const GrowthIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 17V13M12 17V8M16 17v-5"/>
  </svg>
);
const CommunityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const MomentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
/* ── Logout SVG icon — line-art, sage tone ── */
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV_TABS = [
  { id: 'chat',      IconComponent: HomeIcon,      label: 'Trang chủ' },
  { id: 'growth',    IconComponent: GrowthIcon,    label: 'Tăng trưởng' },
  { id: 'community', IconComponent: CommunityIcon, label: 'Cộng đồng' },
  { id: 'moments',   IconComponent: MomentsIcon,   label: 'Khoảnh khắc' },
  { id: 'baby',      IconComponent: ProfileIcon,   label: 'Hồ sơ' },
];

export default function App() {
  const [activeTab, setActiveTabInternal] = useState(() => {
    return localStorage.getItem('montessori_active_tab') || 'chat';
  });
  const setActiveTab = (tab) => {
    setActiveTabInternal(tab);
    localStorage.setItem('montessori_active_tab', tab);
  };
  const [authUser, setAuthUser]   = useState(null);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [growthPendingAction, setGrowthPendingAction] = useState(null);
  // Community notification: only pending DM requests (not ongoing convs)
  const [communityNotifCount, setCommunityNotifCount] = useState(0);

  // DEV-ONLY: expose tab switcher for console testing of hidden admin tabs.
  // Usage: window.__devSetTab('admin-review') or window.__devSetTab('admin-import')
  // Admin guard inside each screen still blocks non-admin users regardless.
  useEffect(() => {
    window.__devSetTab = (tab) => {
      setActiveTab(tab);
      console.info(`[DEV] Tab switched to: ${tab}`);
    };
    return () => { delete window.__devSetTab; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Global History Stack Overlay Coordinator (LIFO)
  useEffect(() => {
    if (!window._overlayStack) {
      window._overlayStack = {
        stack: [],
        push(id, checkClose, onClose, onDiscardConfirmRequired) {
          if (this.stack.some(item => item.id === id)) return;
          this.stack.push({ id, checkClose, onClose, onDiscardConfirmRequired });
          window.history.pushState({ overlayId: id }, '');
        },
        pop(id) {
          const idx = this.stack.findIndex(item => item.id === id);
          if (idx !== -1) {
            this.stack.splice(idx, 1);
          }
        }
      };

      const showGlobalToast = (message) => {
        const existingToast = document.querySelector('.premium-global-toast');
        if (existingToast) {
          existingToast.remove();
        }
        const toast = document.createElement('div');
        toast.className = 'premium-global-toast';
        toast.innerHTML = `
          <div class="premium-global-toast-content">
            <span class="premium-global-toast-icon">⚠️</span>
            <span>${message}</span>
          </div>
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
          toast.classList.add('visible');
        });
        setTimeout(() => {
          toast.classList.remove('visible');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      };

      const handlePopState = (event) => {
        const stack = window._overlayStack.stack;
        if (!stack || stack.length === 0) return;

        const topOverlay = stack[stack.length - 1];
        
        // If the popped state's overlayId doesn't match the top of our stack,
        // the overlay was already programmatically closed (via handleCleanCloseSheet).
        // In that case, just close the top overlay cleanly.
        const poppedId = event.state?.overlayId;
        if (poppedId && !stack.some(item => item.id === poppedId)) {
          // Already handled — nothing to do
          return;
        }

        const decision = topOverlay.checkClose();

        if (decision === 'saving') {
          showGlobalToast("Đang lưu dữ liệu, mẹ chờ một chút nhé.");
          window.history.pushState({ overlayId: topOverlay.id }, '');
        } else if (decision === 'dirty') {
          topOverlay.onDiscardConfirmRequired();
          window.history.pushState({ overlayId: topOverlay.id }, '');
        } else {
          stack.pop();
          topOverlay.onClose();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  useEffect(() => {
    let profileUnsub = null;
    let babiesUnsub = null;
    // Track whether subcollection babies have been loaded at least once
    let babiesLoadedFromSubcollection = false;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setAuthUser(firebaseUser);
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile(prev => {
              // If subcollection babies have been loaded, keep them; otherwise
              // use the babies from the user doc as a temporary fallback
              const subcollectionBabies = prev?.babies || [];
              const fallbackBabies = babiesLoadedFromSubcollection
                ? subcollectionBabies
                : (data.babies || subcollectionBabies);
              // Remove 'babies' from data spread to avoid overriding subcollection data
              const { babies: _ignoredBabies, ...restData } = data;
              return {
                user: firebaseUser,
                babies: fallbackBabies,
                _userDocBabies: data.babies || [],  // Keep user doc babies as fallback for dob merge
                ...restData
              };
            });

            if (!babiesUnsub) {
              const babiesRef = collection(db, 'users', firebaseUser.uid, 'babies');
              babiesUnsub = onSnapshot(babiesRef, (babiesSnap) => {
                const babiesList = babiesSnap.docs
                  .map(d => ({ id: d.id, ...d.data() }))
                  .sort((a, b) => (a.childOrder ?? 0) - (b.childOrder ?? 0));
                babiesLoadedFromSubcollection = true;
                setProfile(prev => {
                  if (!prev) return null;
                  // Merge: if subcollection baby is missing dob, use fallback from user doc babies
                  const userDocBabies = prev._userDocBabies || [];
                  const mergedBabies = babiesList.map(subBaby => {
                    if (!subBaby.dob) {
                      const fallback = userDocBabies.find(b => b.id === subBaby.id || b.childKey === subBaby.childKey);
                      if (fallback?.dob) return { ...subBaby, dob: fallback.dob };
                    }
                    return subBaby;
                  });
                  return { ...prev, babies: mergedBabies };
                });
              }, (error) => {
                console.error('[App] Babies load error:', error);
              });
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('[App] Profile load error:', error);
          setLoading(false);
        });
      } else {
        if (import.meta.env.DEV && typeof window !== 'undefined' && localStorage.getItem('test_baby_age_days') !== null) {
          const mockUser = { uid: null, photoURL: null };
          setAuthUser(mockUser);
          setProfile({
            user: mockUser,
            momName: 'Đô',
            numBabies: 1,
            status: 'born',
            babies: [
              {
                id: 'baby-0',
                name: 'Bé Đô',
                dob: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                childOrder: 0
              }
            ]
          });
          setLoading(false);
        } else {
          setAuthUser(null);
          setProfile(null);
          babiesLoadedFromSubcollection = false;
          setLoading(false);
        }
        if (profileUnsub) profileUnsub();
        if (babiesUnsub) { babiesUnsub(); babiesUnsub = null; }
      }
    });
    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
      if (babiesUnsub) { babiesUnsub(); }
    };
  }, []);

  // ── Subscribe community notifications at App level ──
  // Always runs regardless of active tab for real-time badge updates
  useEffect(() => {
    const uid = authUser?.uid;
    if (!uid) { setCommunityNotifCount(0); return; }

    let dmCount   = 0;
    let convCount = 0;
    const update  = () => setCommunityNotifCount(dmCount + convCount);

    // 1. Pending DM requests (new invitations from new people)
    const qDm = query(
      collection(db, 'dmRequests'),
      where('toUserId', '==', uid),
      where('status', '==', 'pending'),
    );
    const unsubDm = onSnapshot(qDm, (snap) => {
      dmCount = snap.size;
      update();
    }, () => {});

    // 2. Accepted conversations with unread messages
    const qConv = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', uid),
    );
    const unsubConv = onSnapshot(qConv, (snap) => {
      convCount = snap.docs.filter(d => {
        const data = d.data();
        if (data.hiddenFor?.includes(uid)) return false;
        return (data.unreadCounts?.[uid] || 0) > 0;
      }).length;
      update();
    }, () => {});

    return () => { unsubDm(); unsubConv(); };
  }, [authUser?.uid]);

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
        <img src={`${import.meta.env.BASE_URL}icon-512.png`} className="loading-logo-img" alt="logo" />
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
    <div className="app-shell" aria-label="Montessori AI App">

      {/* ── TOP BAR (mobile only) — hiện ở các tab ngoài chat, nhưng avatar/logout chỉ ở tab baby ── */}
      {activeTab !== 'chat' && activeTab !== 'baby' && (
        <div className="top-bar">
          <div className="top-bar-brand">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} className="top-bar-logo-img" alt="logo" />
            <div>
              <div className="top-bar-name">Montessori AI</div>
              <div className="top-bar-sub">Trợ lý mẹ & bé</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sidebar-desktop">
        <div className="sidebar-brand-desk">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} className="sidebar-logo-img" alt="logo" />
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
              <span className="nav-item-desk-icon"><tab.IconComponent /></span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-desk">
          <button className="logout-desk-btn" onClick={handleLogout}>
            <LogoutIcon />
            Đăng xuất
          </button>
          <div className="footer-badge-desk">🤖 Gemini 2.0 + RAG</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main-content">
        {activeTab === 'chat'      && <ChatScreen    profile={{ ...sharedProfile, displayName: `Mẹ ${momName}`, role: 'Mẹ' }} setActiveTab={setActiveTab} setGrowthPendingAction={setGrowthPendingAction} />}
        {activeTab === 'tracker'   && <TrackerScreen profile={sharedProfile} />}
        {activeTab === 'growth'    && <GrowthScreen  profile={sharedProfile} setActiveTab={setActiveTab} pendingAction={growthPendingAction} onConsumePendingAction={() => setGrowthPendingAction(null)} />}
        {activeTab === 'community' && <CommunityScreen profile={sharedProfile} />}
        {activeTab === 'baby'      && <BabyProfileScreen profile={sharedProfile} authUser={authUser} onLogout={handleLogout} />}
        {activeTab === 'moments'   && <MomentsScreen profile={sharedProfile} />}
        {activeTab === 'ingest'       && <IngestScreen />}
        {/* Admin-only: not in NAV_TABS, not visible to regular users */}
        {activeTab === 'admin-import'  && <AdminImportScreen authUser={authUser} />}
        {activeTab === 'admin-review'  && <AdminReviewQueueScreen authUser={authUser} />}
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
              <span className="nav-tab-icon" style={{ position: 'relative' }}>
                <tab.IconComponent />
                {tab.id === 'community' && communityNotifCount > 0 && (
                  <span className="nav-community-badge">
                    {communityNotifCount > 9 ? '9+' : communityNotifCount}
                  </span>
                )}
              </span>
              <span className="nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}
