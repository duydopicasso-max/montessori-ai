/* ── Custom Tooltip component for WHO Growth Chart ── */
const CustomTooltip = ({ active, payload, label, chartTab }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.actual == null) return null; // Chỉ hiển thị tooltip cho mốc đo thực tế của bé
    const unit = chartTab === 'weight' ? 'kg' : 'cm';
    const friendlyAge = data.ageLabel || `${Math.round(data.month)} tháng tuổi`;
    const formattedDate = data.date ? fmtDate(data.date) : '';
    const labelText = chartTab === 'weight' ? 'Cân nặng:' : chartTab === 'height' ? 'Chiều cao:' : 'Chu vi đầu:';
    
    return (
      <div style={{
        background: '#FFFFFF',
        padding: '12px 14px',
        border: '1.5px solid rgba(95,175,130,0.18)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(47,107,79,0.08)',
        fontSize: '12.5px',
        fontFamily: 'inherit',
        color: '#333'
      }}>
        {formattedDate && <div style={{ color: '#888888', fontWeight: '600', marginBottom: '4px' }}>{formattedDate}</div>}
        <div style={{ color: '#2F6B4F', fontWeight: '700', marginBottom: '6px' }}>{friendlyAge}</div>
        <div style={{ fontWeight: '800', color: '#1E4A33', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{labelText}</span>
          <span style={{ color: '#5FAF82' }}>{data.actual} {unit}</span>
        </div>
      </div>
    );
  }
  return null;
};