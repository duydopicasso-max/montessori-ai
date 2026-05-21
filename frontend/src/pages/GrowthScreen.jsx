/**
 * GrowthScreen.jsx — Theo dõi tăng trưởng chuẩn WHO
 * - Vòng tròn tổng quan (Chỉ số % so với trung vị WHO)
 * - Biểu đồ đường: chỉ 2 ngưỡng (đỏ/xanh) + vùng tô
 * - Tên bé và ngày sinh có thể chỉnh sửa
 */
import { useState, useEffect } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  collection, addDoc, getDocs, doc, updateDoc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  getWHOData, getAgeInMonths, calcBMI,
  getPctOfMedian, assessNutrition
} from '../data/whoData.js';
import './GrowthScreen.css';
import { BarChartIcon, PencilIcon, CalendarIcon, WeightIcon, RulerIcon, HeadCircleIcon } from '../icons.jsx';

export default function GrowthScreen({ profile }) {
  const babies        = profile?.babies || [];
  const userId        = profile?.user?.uid;

  const [selectedBaby, setSelectedBaby] = useState(0);
  const [babyOverrides, setBabyOverrides] = useState({}); // {0: {name, dob}}
  const [logs, setLogs]                   = useState([]);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '', height: '', head: ''
  });
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState(null); // null | 'name' | 'dob'
  const [editVal, setEditVal]     = useState('');

  /* ── Merged baby data (original + overrides) ── */
  const rawBaby  = babies[selectedBaby] || {};
  const override = babyOverrides[selectedBaby] || {};
  const baby     = { ...rawBaby, ...override };
  const babyId   = (rawBaby.id || rawBaby.name || `baby-${selectedBaby}`).toLowerCase().replace(/\s+/g, '-');
  const gender   = baby.gender || 'girl';
  const dob      = baby.dob || '';
  const ageMonths = getAgeInMonths(dob);

  /* ── Load logs ── */
  useEffect(() => {
    if (!userId || !babyId) return;
    const load = async () => {
      try {
        const q   = query(collection(db, 'users', userId, 'babies', babyId, 'growthLogs'), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    };
    load();
    setShowForm(false);
  }, [userId, babyId, selectedBaby]);

  /* ── Save measurement ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const entry = {
        date:   form.date,
        weight: parseFloat(form.weight) || null,
        height: parseFloat(form.height) || null,
        head:   parseFloat(form.head)   || null,
        bmi:    calcBMI(parseFloat(form.weight), parseFloat(form.height)),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'users', userId, 'babies', babyId, 'growthLogs'), entry);
      setLogs(prev => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
      setForm({ date: new Date().toISOString().split('T')[0], weight: '', height: '', head: '' });
      setShowForm(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  /* ── Inline edit ── */
  const startEdit = (field) => {
    setEditField(field);
    setEditVal(field === 'name' ? (baby.name || '') : (baby.dob || ''));
  };
  const saveEdit = async () => {
    setBabyOverrides(prev => ({ ...prev, [selectedBaby]: { ...(prev[selectedBaby] || {}), [editField]: editVal } }));
    setEditField(null);
    try {
      const newBabies = [...babies];
      newBabies[selectedBaby] = { ...newBabies[selectedBaby], ...babyOverrides[selectedBaby], [editField]: editVal };
      await updateDoc(doc(db, 'users', userId), { babies: newBabies });
    } catch (e) { console.error('Save failed', e); }
  };

  /* ── Latest values ── */
  const latestLog    = logs[logs.length - 1];
  const curWeight    = parseFloat(latestLog?.weight || baby.currentWeightBorn || 0);
  const curHeight    = parseFloat(latestLog?.height || baby.currentLengthBorn || 0);
  const curHead      = parseFloat(latestLog?.head   || baby.headCircumference  || 0);
  const curBMI       = calcBMI(curWeight, curHeight) || 0;
  const nutrition    = assessNutrition(curWeight, ageMonths, gender);

  /* ── % of WHO median for radial chart ── */
  const weightPct = getPctOfMedian(curWeight, gender, 'weight', ageMonths);
  const heightPct = getPctOfMedian(curHeight, gender, 'height', ageMonths);
  const bmiRef    = 16; // WHO BMI median ~16 for most age groups
  const bmiPct    = curBMI ? Math.round((curBMI / bmiRef) * 100) : 0;

  /* ── Build chart data for a specific metric ── */
  const buildChartData = (type) => {
    const whoRef = getWHOData(gender, type);
    return whoRef.map(ref => {
      // Find log closest to this age
      const matchLog = logs.find(l => {
        if (!l.date || !dob) return false;
        const lBirth = new Date(dob);
        const lDate  = new Date(l.date);
        const lAge   = Math.round((lDate - lBirth) / (1000 * 60 * 60 * 24 * 30.4375));
        return Math.abs(lAge - ref.month) <= 1;
      });
      const actualVal = matchLog
        ? (type === 'weight' ? matchLog.weight : type === 'height' ? matchLog.height : matchLog.head)
        : null;
      return {
        month:    ref.month,
        label:    `${ref.month}thg`,
        lower:    ref.sd_n2,
        band:     parseFloat((ref.sd_p2 - ref.sd_n2).toFixed(2)),
        actual:   actualVal,
      };
    });
  };

  const weightData = buildChartData('weight');
  const heightData = buildChartData('height');
  const headData   = buildChartData('head');

  /* ── Age display ── */
  const ageLabel = !dob ? '—'
    : ageMonths < 24 ? `${ageMonths} tháng`
    : `${Math.floor(ageMonths / 12)} tuổi ${ageMonths % 12} tháng`;

  return (
    <div className="growth-screen">
      <header className="growth-header">
        <div className="growth-header-icon-wrap"><BarChartIcon size={28} strokeWidth={1.8} /></div>
        <div>
          <h1 className="growth-title">Theo dõi Tăng trưởng</h1>
          <p className="growth-subtitle">Chuẩn WHO Việt Nam · Cân nặng · Chiều cao · Chu vi đầu</p>
        </div>
      </header>

      {/* Baby tabs */}
      {babies.length > 1 && (
        <div className="baby-tabs">
          {babies.map((b, i) => {
            const ov = babyOverrides[i] || {};
            const n  = ov.name || b.name || `Bé ${String.fromCharCode(65 + i)}`;
            return (
              <button key={i} className={`baby-tab ${selectedBaby === i ? 'active' : ''}`} onClick={() => setSelectedBaby(i)}>
                {b.gender === 'boy' ? '👦' : '👧'} {n}
              </button>
            );
          })}
        </div>
      )}

      <div className="growth-content">

        {/* ── Top: Info + Radial ── */}
        <div className="top-row">
          {/* Baby info card */}
          <div className="info-card">
            <div className="info-card-title">Thông tin bé</div>

            {/* Name */}
            <div className="info-row">
              <span className="info-label">Tên ở nhà</span>
              {editField === 'name' ? (
                <div className="edit-inline">
                  <input autoFocus className="edit-input" value={editVal} onChange={e => setEditVal(e.target.value)} />
                  <button className="edit-save" onClick={saveEdit}>✓</button>
                  <button className="edit-cancel" onClick={() => setEditField(null)}>✕</button>
                </div>
              ) : (
                <div className="info-value-row">
                  <span className="info-value">{baby.name || 'Chưa đặt tên'}</span>
                  <button className="edit-btn" onClick={() => startEdit('name')} title="Chỉnh tên"><PencilIcon size={14} strokeWidth={2} /></button>
                </div>
              )}
            </div>

            {/* DOB */}
            <div className="info-row">
              <span className="info-label">Ngày sinh</span>
              {editField === 'dob' ? (
                <div className="edit-inline">
                  <input type="date" autoFocus className="edit-input" value={editVal} onChange={e => setEditVal(e.target.value)} />
                  <button className="edit-save" onClick={saveEdit}>✓</button>
                  <button className="edit-cancel" onClick={() => setEditField(null)}>✕</button>
                </div>
              ) : (
                <div className="info-value-row">
                  <span className="info-value">{dob || '—'}</span>
                  <button className="edit-btn" onClick={() => startEdit('dob')} title="Chỉnh ngày sinh"><PencilIcon size={14} strokeWidth={2} /></button>
                </div>
              )}
            </div>

            <div className="info-row"><span className="info-label">Tuổi</span><span className="info-value">{ageLabel}</span></div>
            <div className="info-row"><span className="info-label">Giới tính</span><span className="info-value">{gender === 'boy' ? '👦 Bé trai' : '👧 Bé gái'}</span></div>
            {curWeight > 0 && <div className="info-row"><span className="info-label">Cân nặng</span><span className="info-value" style={{ color: nutrition?.color }}>{curWeight} kg — {nutrition?.label}</span></div>}
            {curHeight > 0 && <div className="info-row"><span className="info-label">Chiều cao</span><span className="info-value">{curHeight} cm</span></div>}
            {curBMI > 0 && <div className="info-row"><span className="info-label">BMI</span><span className="info-value">{curBMI}</span></div>}
          </div>

          {/* Radial % chart */}
          <div className="radial-card">
            <div className="radial-title">Chỉ số của bé</div>
            <div className="radial-chart-wrap">
              <svg viewBox="0 0 200 200" className="radial-svg">
                <RadialArc pct={weightPct} color="#2196F3" radius={85} strokeW={14} />
                <RadialArc pct={heightPct} color="#8BC34A" radius={67} strokeW={14} />
                <RadialArc pct={bmiPct}    color="#FFA726" radius={49} strokeW={14} />
                {/* Grid circles */}
                {[80, 90, 100, 110, 120].map(p => (
                  <circle key={p} cx="100" cy="100" r={p * 0.7} fill="none" stroke="#f0e8e0" strokeWidth="0.5" strokeDasharray="3 3" />
                ))}
              </svg>
              <div className="radial-labels">
                {[120, 110, 100, 90, 80].map(p => (
                  <span key={p} className="radial-pct-label"
                    style={{ bottom: `${(p - 75) * 2.5}%` }}>
                    {p}%
                  </span>
                ))}
              </div>
            </div>
            <div className="radial-legend">
              {curWeight > 0 && <div className="r-leg"><span className="r-dot" style={{ background: '#2196F3' }} /> Cân nặng ({weightPct}%)</div>}
              {curHeight > 0 && <div className="r-leg"><span className="r-dot" style={{ background: '#8BC34A' }} /> Chiều cao ({heightPct}%)</div>}
              {curBMI > 0    && <div className="r-leg"><span className="r-dot" style={{ background: '#FFA726' }} /> BMI ({bmiPct}%)</div>}
              {!curWeight && !curHeight && <div className="r-empty">Thêm số đo để xem biểu đồ</div>}
            </div>
          </div>
        </div>

        {/* ── Measurement form ── */}
        <div className="section-header">
          <h2 className="section-title">Lịch sử đo lường</h2>
          <button className="add-btn" onClick={() => setShowForm(f => !f)}>
            {showForm ? '✕ Đóng' : '+ Thêm lần đo'}
          </button>
        </div>

        {showForm && (
          <div className="measure-form">
            <div className="form-grid">
              <div className="form-group">
                <label><CalendarIcon size={14} strokeWidth={2} /> Ngày đo</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label><WeightIcon size={14} strokeWidth={2} /> Cân nặng (kg)</label>
                <input type="number" step="0.01" placeholder="5.2" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
              </div>
              <div className="form-group">
                <label><RulerIcon size={14} strokeWidth={2} /> Chiều dài/cao (cm)</label>
                <input type="number" step="0.1" placeholder="65.0" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
              </div>
              <div className="form-group">
                <label><HeadCircleIcon size={14} strokeWidth={2} /> Chu vi đầu (cm)</label>
                <input type="number" step="0.1" placeholder="42.0" value={form.head} onChange={e => setForm(f => ({ ...f, head: e.target.value }))} />
              </div>
            </div>
            <button className="save-measure-btn" disabled={saving} onClick={handleSave}>
              {saving ? 'Đang lưu...' : 'Lưu lần đo'}
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className="log-table-wrap">
            <table className="log-table">
              <thead><tr><th>Ngày</th><th>Cân nặng</th><th>Chiều dài/cao</th><th>Chu vi đầu</th><th>BMI</th></tr></thead>
              <tbody>
                {[...logs].reverse().map((l, i) => (
                  <tr key={i}>
                    <td>{l.date}</td>
                    <td>{l.weight ? `${l.weight} kg` : '—'}</td>
                    <td>{l.height ? `${l.height} cm` : '—'}</td>
                    <td>{l.head   ? `${l.head} cm`   : '—'}</td>
                    <td>{l.bmi   || (calcBMI(l.weight, l.height) ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Charts ── */}
        <WhoChart title="Cân nặng" unit="kg" data={weightData} color="#2196F3" actualColor="#2196F3" />
        <WhoChart title="Chiều cao" unit="cm" data={heightData} color="#8BC34A" actualColor="#8BC34A" />
        {ageMonths <= 12 && <WhoChart title="Chu vi đầu" unit="cm" data={headData} color="#9C27B0" actualColor="#9C27B0" showActualLabel />}

        <div className="who-note">
          Biểu đồ theo <strong>Chuẩn tăng trưởng WHO 2006</strong> — áp dụng tại Việt Nam. Chỉ mang tính tham khảo, không thay thế đánh giá của bác sĩ.
        </div>
      </div>
    </div>
  );
}

/* ── WHO Chart Component ── */
function WhoChart({ title, unit, data, color, actualColor }) {
  const hasActual = data.some(d => d.actual != null);

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 className="chart-title">{title}</h3>
        <span className="chart-badge">Chỉ số tiêu chuẩn</span>
      </div>
      <div className="chart-unit-label">{unit}</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#8C847C' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8C847C' }}
            axisLine={false}
            tickLine={false}
            unit={unit === 'kg' ? '' : ''}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 13 }}
            formatter={(v, name) => {
              const labels = { lower: 'Ngưỡng dưới', band: null, actual: title };
              if (name === 'band') return null;
              return [`${v} ${unit}`, labels[name] || name];
            }}
          />
          <Legend
            formatter={(v) => {
              if (v === 'lower') return <span style={{ color: '#e74c3c', fontSize: 12 }}>Ngưỡng dưới</span>;
              if (v === 'band')  return <span style={{ color: '#27ae60', fontSize: 12 }}>Ngưỡng trên</span>;
              if (v === 'actual') return <span style={{ color: actualColor, fontSize: 12 }}>{title}</span>;
              return v;
            }}
            wrapperStyle={{ paddingTop: 12 }}
          />
          {/* Background beige fill (below lower) */}
          <Area type="monotone" dataKey="lower" stackId="who"
            fill="#FDF5ED" stroke="#e74c3c" strokeWidth={2} dot={false} name="lower" />
          {/* Green band: sd_n2 to sd_p2 */}
          <Area type="monotone" dataKey="band" stackId="who"
            fill="rgba(107,200,120,0.15)" stroke="#27ae60" strokeWidth={2} dot={false} name="band" />
          {/* Actual baby data */}
          {hasActual && (
            <Line type="monotone" dataKey="actual"
              stroke={actualColor} strokeWidth={0}
              dot={({ cx, cy, payload }) =>
                payload.actual != null ? (
                  <g key={`dot-${cx}`}>
                    <circle cx={cx} cy={cy} r={7} fill={actualColor} opacity={0.85} />
                    <text x={cx + 10} y={cy - 4} fontSize={11} fill="#666">{payload.actual}</text>
                  </g>
                ) : <g key={`dot-${cx}`} />
              }
              name="actual"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Radial Arc SVG Component ── */
function RadialArc({ pct, color, radius, strokeW }) {
  const cx = 100, cy = 100;
  const normalizedR = radius;
  const circumference = 2 * Math.PI * normalizedR;
  // Map pct (0-130) to 0-270 degrees arc (from 135deg to 405deg)
  const maxAngle = 270;
  const angle    = Math.min((pct / 130) * maxAngle, maxAngle);
  const dashLen  = (angle / 360) * circumference;
  // Start at bottom-left (135°)
  const startAngle = 135 * (Math.PI / 180);
  const sx = cx + normalizedR * Math.cos(startAngle);
  const sy = cy + normalizedR * Math.sin(startAngle);

  return (
    <g>
      {/* Track */}
      <circle cx={cx} cy={cy} r={normalizedR}
        fill="none" stroke="#f0e8e0" strokeWidth={strokeW}
        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
        strokeDashoffset={-circumference * 0.375}
        strokeLinecap="round"
        transform={`rotate(0 ${cx} ${cy})`}
      />
      {/* Filled arc */}
      <circle cx={cx} cy={cy} r={normalizedR}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dashLen} ${circumference - dashLen}`}
        strokeDashoffset={circumference - circumference * 0.375}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </g>
  );
}
