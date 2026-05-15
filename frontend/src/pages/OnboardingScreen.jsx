import { useState } from 'react';
import './OnboardingScreen.css';

export default function OnboardingScreen({ onComplete }) {
  const [childName, setChildName] = useState('');
  const [role, setRole] = useState('Mẹ'); // 'Mẹ' or 'Ba'
  const [status, setStatus] = useState('born'); // 'born' or 'pregnant'
  
  // Born state
  const [months, setMonths] = useState('');
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('');

  // Pregnant state
  const [pregMonths, setPregMonths] = useState('');
  const [pregWeeks, setPregWeeks] = useState('');
  const [pregDays, setPregDays] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const ageInfo = status === 'born' 
      ? { months, weeks, days } 
      : { pregMonths, pregWeeks, pregDays };

    const ageDisplay = status === 'born'
      ? `${months ? months + ' tháng ' : ''}${weeks ? weeks + ' tuần ' : ''}${days ? days + ' ngày' : ''}`.trim()
      : `${pregMonths ? pregMonths + ' tháng ' : ''}${pregWeeks ? pregWeeks + ' tuần ' : ''}${pregDays ? pregDays + ' ngày' : ''}`.trim();

    const profile = {
      childName,
      role,
      status,
      ageInfo,
      ageDisplay: ageDisplay || 'Chưa xác định',
      displayName: `${role} ${childName}`,
      avatar: role === 'Mẹ' ? '👩‍🍼' : '👨‍🍼',
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('montessori_user_profile', JSON.stringify(profile));
    onComplete(profile);
  };

  const isFormValid = childName.trim().length > 0 && 
    (status === 'born' 
      ? (months !== '' || weeks !== '' || days !== '')
      : (pregMonths !== '' || pregWeeks !== '' || pregDays !== '')
    );

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-logo">🌿</div>
        <h1 className="onboarding-title">Chào mừng bạn!</h1>
        <p className="onboarding-subtitle">
          Hãy chia sẻ một chút về bé để chúng tôi có thể đồng hành cùng bạn tốt nhất.
        </p>

        <form className="form-step" onSubmit={handleSubmit}>
          {/* Tên bé */}
          <div className="input-group">
            <label className="input-label">Tên ở nhà của bé</label>
            <input 
              className="text-input"
              placeholder="Ví dụ: Bơ, Cốm, Gạo..."
              value={childName}
              onChange={e => setChildName(e.target.value)}
              required
            />
          </div>

          {/* Vai trò */}
          <div className="input-group">
            <label className="input-label">Bạn là ai?</label>
            <div className="role-selector">
              <button 
                type="button"
                className={`choice-btn ${role === 'Mẹ' ? 'active' : ''}`}
                onClick={() => setRole('Mẹ')}
              >
                👩‍🍼 Mẹ {childName || '...'}
              </button>
              <button 
                type="button"
                className={`choice-btn ${role === 'Ba' ? 'active' : ''}`}
                onClick={() => setRole('Ba')}
              >
                👨‍🍼 Ba {childName || '...'}
              </button>
            </div>
          </div>

          {/* Tình trạng */}
          <div className="input-group">
            <label className="input-label">Bé đang ở giai đoạn nào?</label>
            <div className="status-selector">
              <button 
                type="button"
                className={`choice-btn ${status === 'born' ? 'active' : ''}`}
                onClick={() => setStatus('born')}
              >
                👶 Đã chào đời
              </button>
              <button 
                type="button"
                className={`choice-btn ${status === 'pregnant' ? 'active' : ''}`}
                onClick={() => setStatus('pregnant')}
              >
                🤰 Đang mang thai
              </button>
            </div>
          </div>

          {/* Tuổi / Giai đoạn thai kỳ */}
          <div className="input-group">
            <label className="input-label">
              {status === 'born' ? 'Bé được bao nhiêu rồi?' : 'Bạn mang bầu tuần thứ mấy?'}
            </label>
            
            {status === 'born' ? (
              <div className="age-inputs">
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" value={months} onChange={e => setMonths(e.target.value)} />
                  <span className="unit-label">Tháng</span>
                </div>
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" max="4" value={weeks} onChange={e => setWeeks(e.target.value)} />
                  <span className="unit-label">Tuần</span>
                </div>
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" max="7" value={days} onChange={e => setDays(e.target.value)} />
                  <span className="unit-label">Ngày</span>
                </div>
              </div>
            ) : (
              <div className="age-inputs">
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" max="9" value={pregMonths} onChange={e => setPregMonths(e.target.value)} />
                  <span className="unit-label">Tháng</span>
                </div>
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" max="4" value={pregWeeks} onChange={e => setPregWeeks(e.target.value)} />
                  <span className="unit-label">Tuần</span>
                </div>
                <div className="number-input-group">
                  <input type="number" className="number-input" placeholder="0" min="0" max="7" value={pregDays} onChange={e => setPregDays(e.target.value)} />
                  <span className="unit-label">Ngày</span>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={!isFormValid}
          >
            Bắt đầu ngay ✨
          </button>
        </form>
      </div>
    </div>
  );
}
