/* ─── Onboarding Screen — Multi-step Registration ─────────── */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase.js';
import AppDatePicker from '../components/AppDatePicker.jsx';
import './OnboardingScreen.css';

const fmtDisplay = (iso) => {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
};

/* ── Step names ── */
const STEPS = ['login', 'mom', 'status', 'babies', 'review'];

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep]           = useState('login');
  const [user, setUser]           = useState(null);   // Firebase user
  const [momName, setMomName]     = useState('');
  const [status, setStatus]       = useState('');     // 'pregnant' | 'born'
  const [numBabies, setNumBabies] = useState(1);
  const [pregnancyInfo, setPregnancyInfo] = useState({
    weeks: '', days: '', dueDate: ''
  });
  const [babies, setBabies]       = useState([createEmptyBaby()]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [showDueDateCalendar, setShowDueDateCalendar] = useState(false);
  const [activeDobCalendarIdx, setActiveDobCalendarIdx] = useState(null);

  function createEmptyBaby(label = 'Bé') {
    return {
      label,
      name: '',
      gender: '',
      // Pregnant fields
      currentWeight: '', headCircumference: '', currentLength: '',
      // Born extra fields
      dob: '', birthWeight: '', birthLength: '',
      currentWeightBorn: '', currentLengthBorn: '',
    };
  }

  /* ── Handle num babies change ── */
  function handleNumBabies(n) {
    setNumBabies(n);
    const labels = n === 1 ? [''] : n === 2 ? [' A', ' B'] : [' A', ' B', ' C'];
    setBabies(Array.from({ length: n }, (_, i) => createEmptyBaby(`Bé${labels[i]}`)));
  }

  /* ── Update a specific baby's field ── */
  function updateBaby(idx, field, value) {
    setBabies(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  }

  /* ── Google Sign-in ── */
  async function handleGoogleLogin() {
    try {
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setMomName(result.user.displayName?.split(' ')[0] || '');
      setStep('mom');
    } catch (e) {
      setError('Đăng nhập thất bại. Vui lòng thử lại!');
    }
  }

  /* ── Save to Firestore ── */
  async function handleSave() {
    setSaving(true);
    try {
      const profileData = {
        momName,
        status,
        numBabies,
        babies: babies.map(b => ({ ...b })),
        ...(status === 'pregnant' ? { pregnancyInfo } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), {
        momName,
        status,
        numBabies,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      });

      for (const baby of babies) {
        const babyId = baby.name.toLowerCase().replace(/\s+/g, '-') || `baby-${Date.now()}`;
        await setDoc(doc(db, 'users', user.uid, 'babies', babyId), {
          ...baby,
          ...(status === 'pregnant' ? { pregnancyInfo } : {}),
          createdAt: serverTimestamp(),
        });
      }

      onComplete({ user, momName, status, numBabies, babies, pregnancyInfo });
    } catch (e) {
      setError('Lưu thất bại: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  /* ── Progress bar % ── */
  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round((stepIdx / (STEPS.length - 1)) * 100);

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-logo">🌿</div>

        {/* Progress */}
        {step !== 'login' && (
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* ── STEP: LOGIN ── */}
        {step === 'login' && (
          <div className="step-content">
            <h1 className="onboarding-title">Chào mừng bạn! 🌸</h1>
            <p className="onboarding-subtitle">Đăng nhập để bắt đầu hành trình chăm sóc bé yêu theo phương pháp Montessori</p>
            {error && <p className="error-msg">{error}</p>}
            <button className="google-btn" onClick={handleGoogleLogin}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Tiếp tục với Google
            </button>
          </div>
        )}

        {/* ── STEP: MOM NAME ── */}
        {step === 'mom' && (
          <div className="step-content">
            <h2 className="step-title">Tên của mẹ là gì? 👩‍🍼</h2>
            <p className="step-sub">Chúng tôi sẽ dùng tên này để gọi bạn trong suốt hành trình.</p>
            <input
              className="text-input"
              placeholder="Ví dụ: Hà, Lan, Ngọc..."
              value={momName}
              onChange={e => setMomName(e.target.value)}
              autoFocus
            />
            <button className="next-btn" disabled={!momName.trim()} onClick={() => setStep('status')}>
              Tiếp theo →
            </button>
          </div>
        )}

        {/* ── STEP: STATUS ── */}
        {step === 'status' && (
          <div className="step-content">
            <h2 className="step-title">Chào {momName}! Bạn đang ở giai đoạn nào? 🌸</h2>
            <div className="big-choice-grid">
              <button
                className={`big-choice-btn ${status === 'pregnant' ? 'active' : ''}`}
                onClick={() => setStatus('pregnant')}
              >
                <span className="big-choice-icon">🤰</span>
                <span className="big-choice-label">Đang mang thai</span>
              </button>
              <button
                className={`big-choice-btn ${status === 'born' ? 'active' : ''}`}
                onClick={() => setStatus('born')}
              >
                <span className="big-choice-icon">👶</span>
                <span className="big-choice-label">Bé đã chào đời</span>
              </button>
            </div>
            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep('mom')}>← Quay lại</button>
              <button className="next-btn" disabled={!status} onClick={() => setStep('babies')}>Tiếp theo →</button>
            </div>
          </div>
        )}

        {/* ── STEP: BABIES ── */}
        {step === 'babies' && (
          <div className="step-content">
            <h2 className="step-title">
              {status === 'pregnant' ? '🤰 Thông tin thai kỳ' : '👶 Thông tin em bé'}
            </h2>

            {/* Số lượng bé */}
            <div className="input-group">
              <label className="input-label">Mẹ mang thai / sinh bao nhiêu bé?</label>
              <div className="num-selector">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`num-btn ${numBabies === n ? 'active' : ''}`}
                    onClick={() => handleNumBabies(n)}
                  >
                    {n === 1 ? '1 bé' : n === 2 ? 'Sinh đôi' : 'Sinh ba'}
                  </button>
                ))}
              </div>
            </div>

            {/* Thông tin thai kỳ */}
            {status === 'pregnant' && (
              <div className="pregnancy-section">
                <div className="input-group">
                  <label className="input-label">Thai được bao lâu?</label>
                  <div className="preg-age-row">
                    <div className="number-input-group">
                      <input type="number" className="number-input" placeholder="0" min="1" max="42"
                        value={pregnancyInfo.weeks}
                        onChange={e => setPregnancyInfo(p => ({ ...p, weeks: e.target.value }))} />
                      <span className="unit-label">Tuần</span>
                    </div>
                    <div className="number-input-group">
                      <input type="number" className="number-input" placeholder="0" min="0" max="6"
                        value={pregnancyInfo.days}
                        onChange={e => setPregnancyInfo(p => ({ ...p, days: e.target.value }))} />
                      <span className="unit-label">Ngày</span>
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Ngày sinh dự kiến</label>
                  <button
                    type="button"
                    className="cs-date-trigger-btn"
                    onClick={() => setShowDueDateCalendar(true)}
                  >
                    <span style={{ fontSize: '15px' }}>📅</span> {fmtDisplay(pregnancyInfo.dueDate) || 'Chọn ngày sinh dự kiến'}
                  </button>
                </div>
              </div>
            )}

            {/* Thông tin từng bé */}
            <div className="babies-list">
              {babies.map((baby, idx) => (
                <div key={idx} className="baby-card">
                  <div className="baby-card-header">
                    {numBabies === 1 ? '👶 Thông tin bé' : `👶 ${baby.label}`}
                  </div>

                  {status === 'born' && (
                    <>
                      <div className="input-group">
                        <label className="input-label">Tên ở nhà của bé</label>
                        <input className="text-input" placeholder="Bơ, Cốm, Gạo..."
                          value={baby.name} onChange={e => updateBaby(idx, 'name', e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Giới tính</label>
                        <div className="gender-row">
                          <button type="button" className={`gender-btn ${baby.gender === 'girl' ? 'active' : ''}`}
                            onClick={() => updateBaby(idx, 'gender', 'girl')}>👧 Con gái</button>
                          <button type="button" className={`gender-btn ${baby.gender === 'boy' ? 'active' : ''}`}
                            onClick={() => updateBaby(idx, 'gender', 'boy')}>👦 Con trai</button>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Ngày sinh</label>
                        <button
                          type="button"
                          className="cs-date-trigger-btn"
                          onClick={() => setActiveDobCalendarIdx(idx)}
                        >
                          <span style={{ fontSize: '15px' }}>📅</span> {fmtDisplay(baby.dob) || 'Chọn ngày sinh của bé'}
                        </button>
                      </div>
                      <div className="metrics-grid">
                        <div className="metric-group">
                          <label className="input-label">Cân nặng khi sinh (kg)</label>
                          <input type="number" step="0.01" className="text-input" placeholder="3.2"
                            value={baby.birthWeight} onChange={e => updateBaby(idx, 'birthWeight', e.target.value)} />
                        </div>
                        <div className="metric-group">
                          <label className="input-label">Cân nặng hiện tại (kg)</label>
                          <input type="number" step="0.01" className="text-input" placeholder="5.0"
                            value={baby.currentWeightBorn} onChange={e => updateBaby(idx, 'currentWeightBorn', e.target.value)} />
                        </div>
                        <div className="metric-group">
                          <label className="input-label">Chiều dài khi sinh (cm)</label>
                          <input type="number" step="0.1" className="text-input" placeholder="50"
                            value={baby.birthLength} onChange={e => updateBaby(idx, 'birthLength', e.target.value)} />
                        </div>
                        <div className="metric-group">
                          <label className="input-label">Chiều dài hiện tại (cm)</label>
                          <input type="number" step="0.1" className="text-input" placeholder="60"
                            value={baby.currentLengthBorn} onChange={e => updateBaby(idx, 'currentLengthBorn', e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}

                  {status === 'pregnant' && (
                    <>
                      {numBabies > 1 && (
                        <div className="input-group">
                          <label className="input-label">Tên dự kiến của bé</label>
                          <input className="text-input" placeholder="Tuỳ chọn..."
                            value={baby.name} onChange={e => updateBaby(idx, 'name', e.target.value)} />
                        </div>
                      )}
                      <div className="metrics-grid">
                        <div className="metric-group">
                          <label className="input-label">Cân nặng hiện tại (g)</label>
                          <input type="number" className="text-input" placeholder="1200"
                            value={baby.currentWeight} onChange={e => updateBaby(idx, 'currentWeight', e.target.value)} />
                        </div>
                        <div className="metric-group">
                          <label className="input-label">Chiều dài (mm)</label>
                          <input type="number" className="text-input" placeholder="350"
                            value={baby.currentLength} onChange={e => updateBaby(idx, 'currentLength', e.target.value)} />
                        </div>
                        <div className="metric-group">
                          <label className="input-label">Chu vi đầu (mm)</label>
                          <input type="number" className="text-input" placeholder="220"
                            value={baby.headCircumference} onChange={e => updateBaby(idx, 'headCircumference', e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep('status')}>← Quay lại</button>
              <button className="next-btn" onClick={() => setStep('review')}>Xem lại →</button>
            </div>
          </div>
        )}

        {/* ── STEP: REVIEW ── */}
        {step === 'review' && (
          <div className="step-content">
            <h2 className="step-title">✅ Xem lại thông tin</h2>
            <div className="review-card">
              <div className="review-row"><span>👩‍🍼 Tên mẹ</span><strong>{momName}</strong></div>
              <div className="review-row">
                <span>📋 Trạng thái</span>
                <strong>{status === 'pregnant' ? '🤰 Đang mang thai' : '👶 Đã sinh'}</strong>
              </div>
              <div className="review-row"><span>👶 Số bé</span><strong>{numBabies === 1 ? '1 bé' : numBabies === 2 ? 'Sinh đôi' : 'Sinh ba'}</strong></div>
              {status === 'pregnant' && pregnancyInfo.weeks && (
                <div className="review-row">
                  <span>🗓️ Thai kỳ</span>
                  <strong>{pregnancyInfo.weeks} tuần {pregnancyInfo.days ? pregnancyInfo.days + ' ngày' : ''}</strong>
                </div>
              )}
              {babies.map((b, i) => (
                <div key={i} className="review-baby">
                  <div className="review-baby-title">{numBabies > 1 ? b.label : 'Bé'} {b.name && `— ${b.name}`}</div>
                  {b.dob && <div className="review-row"><span>📅 Ngày sinh</span><strong>{b.dob}</strong></div>}
                  {b.birthWeight && <div className="review-row"><span>⚖️ Khi sinh</span><strong>{b.birthWeight} kg</strong></div>}
                  {b.currentWeightBorn && <div className="review-row"><span>⚖️ Hiện tại</span><strong>{b.currentWeightBorn} kg</strong></div>}
                </div>
              ))}
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep('babies')}>← Sửa lại</button>
              <button className="submit-btn" disabled={saving} onClick={handleSave}>
                {saving ? '⏳ Đang lưu...' : 'Bắt đầu ngay ✨'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showDueDateCalendar && createPortal(
        <AppDatePicker
          value={pregnancyInfo.dueDate}
          onConfirm={(dateStr) => {
            setPregnancyInfo(p => ({ ...p, dueDate: dateStr }));
            setShowDueDateCalendar(false);
          }}
          onCancel={() => setShowDueDateCalendar(false)}
          dateType="dueDate"
        />,
        document.body
      )}

      {activeDobCalendarIdx !== null && createPortal(
        <AppDatePicker
          value={babies[activeDobCalendarIdx]?.dob || ''}
          onConfirm={(dateStr) => {
            updateBaby(activeDobCalendarIdx, 'dob', dateStr);
            setActiveDobCalendarIdx(null);
          }}
          onCancel={() => setActiveDobCalendarIdx(null)}
          dateType="birthDate"
        />,
        document.body
      )}
    </div>
  );
}
