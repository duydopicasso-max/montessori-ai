import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';
import { getAgeInMonths } from '../data/whoData.js';
import './BabyProfileScreen.css';
import { ClipboardIcon, PencilIcon, CalendarIcon } from '../icons.jsx';

/* ── Gợi ý trò chơi theo nhóm tuổi ── */
const PLAY_DATA = {
  '0-3 tháng': [
    { icon: '👁️', name: 'Nhìn theo đồ vật', desc: 'Di chuyển đồ vật màu sắc tươi sáng trước mắt bé để kích thích thị giác.' },
    { icon: '🎵', name: 'Nghe nhạc nhẹ', desc: 'Mở nhạc nhẹ, nhạc cổ điển để phát triển thính giác và cảm xúc.' },
    { icon: '🤱', name: 'Massage tay chân', desc: 'Massage nhẹ nhàng tay chân bé, giúp phát triển xúc giác và gắn kết mẹ bé.' },
    { icon: '🪞', name: 'Gương thần kỳ', desc: 'Cho bé nhìn vào gương, kích thích nhận thức về bản thân.' },
  ],
  '3-6 tháng': [
    { icon: '🧸', name: 'Lắc lục lạc', desc: 'Cho bé cầm và lắc lục lạc màu sắc để phát triển phối hợp tay-mắt.' },
    { icon: '🤲', name: 'Tummy time', desc: 'Đặt bé nằm sấp 3-5 phút mỗi lần, giúp phát triển cơ cổ và lưng.' },
    { icon: '🎈', name: 'Bong bóng màu sắc', desc: 'Thả bong bóng trước mặt bé, khuyến khích bé với tay theo.' },
    { icon: '🗣️', name: 'Bắt chước âm thanh', desc: 'Bắt chước âm bập bẹ của bé để khuyến khích giao tiếp.' },
  ],
  '6-12 tháng': [
    { icon: '📦', name: 'Khám phá hộp', desc: 'Cho bé khám phá hộp giấy, lấy và bỏ đồ vật vào để học nguyên nhân-kết quả.' },
    { icon: '🥄', name: 'Ăn dặm tự lập (BLW)', desc: 'Cho bé cầm thức ăn mềm, phát triển vận động tinh và tự lập.' },
    { icon: '🚜', name: 'Xe đẩy đồ chơi', desc: 'Xe đẩy giúp bé đứng vịn và tập đi, phát triển vận động thô.' },
    { icon: '🎭', name: 'Ú òa', desc: 'Chơi ú òa giúp bé hiểu về tính bền vững của đối tượng.' },
  ],
  '12-24 tháng': [
    { icon: '🎨', name: 'Vẽ bằng tay', desc: 'Cho bé bôi màu bằng tay lên giấy lớn - phát triển sáng tạo và xúc giác.' },
    { icon: '🧱', name: 'Xếp khối', desc: 'Xếp và đổ khối, phát triển nhận thức không gian và kiên nhẫn.' },
    { icon: '🪣', name: 'Chơi cát/nước', desc: 'Đổ nước từ cốc sang cốc, khám phá thể tích - Montessori sensorial.' },
    { icon: '📖', name: 'Đọc sách cùng bé', desc: 'Sách bìa cứng với hình ảnh lớn, chỉ vào hình và gọi tên.' },
    { icon: '🎵', name: 'Nhảy theo nhạc', desc: 'Vỗ tay và lắc lư theo nhịp nhạc - phát triển cảm nhận âm nhạc.' },
  ],
  '2-3 tuổi': [
    { icon: '🎭', name: 'Đóng vai', desc: 'Chơi bán hàng, nấu ăn giả vờ - phát triển tư duy sáng tạo và ngôn ngữ.' },
    { icon: '🧩', name: 'Ghép hình puzzle', desc: 'Puzzle 4-8 mảnh giúp phát triển tư duy logic và kiên nhẫn.' },
    { icon: '🌱', name: 'Trồng cây cùng bé', desc: 'Cho bé gieo hạt, tưới nước mỗi ngày - kết nối với thiên nhiên Montessori.' },
    { icon: '🎨', name: 'Tô màu và vẽ', desc: 'Bút sáp lớn, giấy trắng - tự do sáng tạo không giới hạn.' },
    { icon: '🏃', name: 'Chạy nhảy ngoài trời', desc: 'Tối thiểu 60 phút vận động ngoài trời mỗi ngày.' },
  ],
  '3-6 tuổi': [
    { icon: '🔢', name: 'Đếm đồ vật', desc: 'Đếm các đồ vật xung quanh nhà, nền tảng toán học Montessori.' },
    { icon: '✂️', name: 'Cắt dán', desc: 'Kéo tù đầu, giấy màu - phát triển vận động tinh và sáng tạo.' },
    { icon: '🧹', name: 'Việc nhà cùng mẹ', desc: 'Lau bàn, sắp xếp đồ chơi - xây dựng tính tự lập và trách nhiệm.' },
    { icon: '📚', name: 'Kể chuyện sáng tạo', desc: 'Bé tự bịa câu chuyện từ tranh ảnh - phát triển ngôn ngữ và tưởng tượng.' },
    { icon: '🎨', name: 'Nghệ thuật tự do', desc: 'Đất nặn, hội họa, xây lắp - phát triển toàn diện sáng tạo.' },
  ],
};

function getPlayGroup(ageMonths) {
  if (ageMonths < 3)  return '0-3 tháng';
  if (ageMonths < 6)  return '3-6 tháng';
  if (ageMonths < 12) return '6-12 tháng';
  if (ageMonths < 24) return '12-24 tháng';
  if (ageMonths < 36) return '2-3 tuổi';
  return '3-6 tuổi';
}

export default function BabyProfileScreen({ profile }) {
  const babies  = profile?.babies || [];
  const userId  = profile?.user?.uid;
  const [selectedBaby, setSelectedBaby] = useState(0);
  const [tab, setTab] = useState('medical');

  const baby   = babies[selectedBaby] || {};
  const babyId = (baby.name || `baby-${selectedBaby}`).toLowerCase().replace(/\s+/g, '-');
  const ageMonths = getAgeInMonths(baby.dob || '');
  const playGroup = getPlayGroup(ageMonths);

  return (
    <div className="profile-screen">
      <header className="profile-header">
        <h1 className="profile-title"><ClipboardIcon size={22} strokeWidth={1.8} /> Hồ sơ Bé yêu</h1>
        <p className="profile-subtitle">Bệnh án · Món ăn · Gợi ý trò chơi</p>
      </header>

      {babies.length > 1 && (
        <div className="baby-tabs">
          {babies.map((b, i) => (
            <button key={i} className={`baby-tab ${selectedBaby === i ? 'active' : ''}`} onClick={() => setSelectedBaby(i)}>
              {b.gender === 'boy' ? '👦' : '👧'} {b.name || `Bé ${String.fromCharCode(65+i)}`}
            </button>
          ))}
        </div>
      )}

      <div className="profile-tabs">
        {[
          { id: 'medical', icon: '🏥', label: 'Bệnh án' },
          { id: 'food',    icon: '🍎', label: 'Món ăn' },
          { id: 'play',    icon: '🎮', label: 'Trò chơi' },
        ].map(t => (
          <button key={t.id} className={`profile-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="profile-content">
        {tab === 'medical' && <MedicalTab userId={userId} babyId={babyId} />}
        {tab === 'food'    && <FoodTab    userId={userId} babyId={babyId} />}
        {tab === 'play'    && <PlayTab    ageMonths={ageMonths} playGroup={playGroup} />}
      </div>
    </div>
  );
}

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

/* ── Medical Records Tab ── */
function MedicalTab({ userId, babyId }) {
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], disease: '', medicine: '', dosage: '', duration: '', symptoms: '', recovery: '', images: [] });

  useEffect(() => {
    if (!userId || !babyId) return;
    getDocs(query(collection(db, 'users', userId, 'babies', babyId, 'medicalRecords'), orderBy('date', 'desc')))
      .then(snap => setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userId, babyId]);

  const handleSave = async () => {
    if (!form.date || !form.disease) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'users', userId, 'babies', babyId, 'medicalRecords'), { ...form, createdAt: serverTimestamp() });
      setRecords(prev => [{ id: ref.id, ...form }, ...prev]);
      setForm({ date: new Date().toISOString().split('T')[0], disease: '', medicine: '', dosage: '', duration: '', symptoms: '', recovery: '', images: [] });
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá lịch sử khám này?')) return;
    await deleteDoc(doc(db, 'users', userId, 'babies', babyId, 'medicalRecords', id));
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const folder = `montessori/${userId}/${babyId}/medical`;
      for (const file of files) {
        const result = await uploadToCloudinary(file, folder);
        setForm(f => ({ ...f, images: [...(f.images || []), result.secure_url] }));
      }
    } catch (err) {
      alert('Lỗi tải ảnh: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2 className="tab-title">🏥 Lịch sử khám bệnh</h2>
        <button className="add-btn" onClick={() => setShowForm(f => !f)}>{showForm ? '✕ Đóng' : '+ Thêm lần khám'}</button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-grid-2">
            <div className="form-group"><label>📅 Ngày khám</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></div>
            <div className="form-group"><label>🦠 Tên bệnh</label><input placeholder="Sốt, ho, tiêu chảy..." value={form.disease} onChange={e => setForm(f=>({...f,disease:e.target.value}))} /></div>
            <div className="form-group"><label>💊 Tên thuốc</label><input placeholder="Paracetamol, Amoxicillin..." value={form.medicine} onChange={e => setForm(f=>({...f,medicine:e.target.value}))} /></div>
            <div className="form-group"><label>📏 Liều dùng</label><input placeholder="5ml x 3 lần/ngày" value={form.dosage} onChange={e => setForm(f=>({...f,dosage:e.target.value}))} /></div>
            <div className="form-group"><label>⏱️ Thời gian điều trị</label><input placeholder="3 ngày, 1 tuần..." value={form.duration} onChange={e => setForm(f=>({...f,duration:e.target.value}))} /></div>
            <div className="form-group"><label>🌡️ Mức độ phục hồi</label>
              <select value={form.recovery} onChange={e => setForm(f=>({...f,recovery:e.target.value}))}>
                <option value="">Chọn...</option>
                <option value="Đã khỏi hoàn toàn">✅ Đã khỏi hoàn toàn</option>
                <option value="Đang theo dõi">⏳ Đang theo dõi</option>
                <option value="Chưa khỏi">⚠️ Chưa khỏi</option>
              </select>
            </div>
          </div>
          <div className="form-group full-width"><label>📝 Triệu chứng</label><textarea rows={2} placeholder="Mô tả chi tiết triệu chứng..." value={form.symptoms} onChange={e => setForm(f=>({...f,symptoms:e.target.value}))} /></div>
          
          <div className="form-group full-width">
            <label>📸 Đính kèm ảnh (Đơn thuốc / Vỏ thuốc)</label>
            <div className="medical-images-preview">
              {(form.images || []).map((img, i) => (
                <div key={i} className="medical-img-wrapper">
                  <img src={img} alt={`Đính kèm ${i}`} className="medical-img" />
                  <button className="remove-img-btn" onClick={() => removeImage(i)}>✕</button>
                </div>
              ))}
              <button className="upload-img-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '⏳...' : '+ Ảnh'}
              </button>
              <input type="file" multiple accept="image/*" ref={fileRef} hidden onChange={handleUpload} />
            </div>
          </div>

          <button className="save-btn" disabled={saving || !form.disease} onClick={handleSave}>{saving ? '⏳...' : '💾 Lưu bệnh án'}</button>
        </div>
      )}

      {records.length === 0 && !showForm && (
        <div className="empty-state"><div className="empty-icon">🏥</div><p>Chưa có lịch sử khám bệnh.<br/>Nhấn "+ Thêm lần khám" để ghi lại.</p></div>
      )}

      <div className="records-list">
        {records.map(r => (
          <div key={r.id} className="record-card">
            <div className="record-header">
              <div>
                <div className="record-disease">{r.disease}</div>
                <div className="record-date">{r.date}</div>
              </div>
              <div className="record-right">
                {r.recovery && <span className={`recovery-badge ${r.recovery === 'Đã khỏi hoàn toàn' ? 'ok' : r.recovery === 'Đang theo dõi' ? 'watch' : 'warn'}`}>{r.recovery}</span>}
                <button className="delete-btn" onClick={() => handleDelete(r.id)}>🗑️</button>
              </div>
            </div>
            {r.medicine  && <div className="record-row"><span>💊</span><span>{r.medicine} — {r.dosage}</span></div>}
            {r.duration  && <div className="record-row"><span>⏱️</span><span>{r.duration}</span></div>}
            {r.symptoms  && <div className="record-row"><span>📝</span><span>{r.symptoms}</span></div>}
            {r.images && r.images.length > 0 && (
              <div className="record-row-images">
                {r.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noreferrer">
                    <img src={img} alt={`Đính kèm ${i}`} className="record-attached-img" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Food Tab ── */
function FoodTab({ userId, babyId }) {
  const [foods, setFoods]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: '', recipe: '', note: '' });

  useEffect(() => {
    if (!userId || !babyId) return;
    getDocs(query(collection(db, 'users', userId, 'babies', babyId, 'foods'), orderBy('createdAt', 'desc')))
      .then(snap => setFoods(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userId, babyId]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'users', userId, 'babies', babyId, 'foods'), { ...form, createdAt: serverTimestamp() });
      setFoods(prev => [{ id: ref.id, ...form }, ...prev]);
      setForm({ name: '', recipe: '', note: '' });
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'users', userId, 'babies', babyId, 'foods', id));
    setFoods(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2 className="tab-title">🍎 Món ăn yêu thích</h2>
        <button className="add-btn" onClick={() => setShowForm(f => !f)}>{showForm ? '✕ Đóng' : '+ Thêm món ăn'}</button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-group"><label>🍽️ Tên món</label><input placeholder="Cháo gà, bún bò, phở..." value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div className="form-group"><label>📖 Cách chế biến</label><textarea rows={4} placeholder="Bước 1: ...\nBước 2: ..." value={form.recipe} onChange={e => setForm(f=>({...f,recipe:e.target.value}))} /></div>
          <div className="form-group"><label>💡 Ghi chú</label><input placeholder="Bé thích ăn nóng, không cho muối..." value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} /></div>
          <button className="save-btn" disabled={saving || !form.name} onClick={handleSave}>{saving ? '⏳...' : '💾 Lưu món ăn'}</button>
        </div>
      )}

      {foods.length === 0 && !showForm && (
        <div className="empty-state"><div className="empty-icon">🍽️</div><p>Chưa có món ăn nào.<br/>Lưu lại những món bé yêu thích nhé!</p></div>
      )}

      <div className="foods-grid">
        {foods.map(f => (
          <div key={f.id} className="food-card">
            <div className="food-header">
              <span className="food-name">🍴 {f.name}</span>
              <button className="delete-btn" onClick={() => handleDelete(f.id)}>🗑️</button>
            </div>
            {f.recipe && <div className="food-recipe">{f.recipe}</div>}
            {f.note   && <div className="food-note">💡 {f.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Play Activities Tab ── */
function PlayTab({ ageMonths, playGroup }) {
  const groups = Object.keys(PLAY_DATA);
  const [activeGroup, setActiveGroup] = useState(playGroup);
  const activities = PLAY_DATA[activeGroup] || [];

  return (
    <div className="tab-content">
      <div className="tab-header-col">
        <h2 className="tab-title">🎮 Gợi ý trò chơi theo độ tuổi</h2>
        <p className="tab-sub">Dựa trên phương pháp Montessori · Phù hợp từng giai đoạn phát triển</p>
      </div>

      <div className="age-group-tabs">
        {groups.map(g => (
          <button key={g} className={`age-tab ${activeGroup === g ? 'active' : ''} ${g === playGroup ? 'recommended' : ''}`} onClick={() => setActiveGroup(g)}>
            {g}
            {g === playGroup && <span className="rec-badge">Bé bạn</span>}
          </button>
        ))}
      </div>

      <div className="play-grid">
        {activities.map((a, i) => (
          <div key={i} className="play-card">
            <div className="play-icon">{a.icon}</div>
            <div className="play-info">
              <div className="play-name">{a.name}</div>
              <div className="play-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
