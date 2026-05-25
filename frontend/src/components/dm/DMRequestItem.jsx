/**
 * DMRequestItem.jsx
 * Renders a single DM request (lời mời nhắn tin) with accept/decline actions.
 */
import { useState } from 'react';
import '../dm/dm.css';

const TOPIC_ICONS = {
  'Ăn dặm':   '🌿',
  'Giấc ngủ': '🌙',
  'Sức khỏe': '💚',
  'Thai kỳ':  '🤱',
  'Sau sinh': '🌸',
  'Tâm sự':   '💬',
  'Khác':     '✨',
};

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMs  = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  return diffD < 7 ? `${diffD} ngày trước` : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, photo, size = 48 }) {
  const initials = (name || '?').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#A8D5B5', '#D5C5A8', '#B5D5C5', '#C5B5D5', '#D5B5B5'];
  const bg = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden', fontSize: size * 0.38,
      fontWeight: 800, color: '#2F6B4F', fontFamily: "'Nunito', sans-serif",
    }}>
      {photo
        ? <img src={photo} alt={name || '?'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : initials}
    </div>
  );
}

export default function DMRequestItem({ request, onAccept, onDecline }) {
  const [loading, setLoading] = useState(false);

  const name  = request.fromUserData?.name || 'Thành viên';
  const photo = request.fromUserData?.photo || '';
  const baby  = request.fromUserData?.baby;
  const week  = request.fromUserData?.pregnancyWeek;
  const sub   = baby
    ? `Mẹ của ${baby}`
    : week ? `Mẹ bầu tuần ${week}` : 'Thành viên cộng đồng';

  const topicIcon = TOPIC_ICONS[request.topic] || '✨';

  const handleAccept = async () => {
    setLoading(true);
    try { await onAccept(request); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDecline = async () => {
    setLoading(true);
    try { await onDecline(request.id); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="dm-request-item">
      {/* Sender info */}
      <div className="dm-req-header">
        <Avatar name={name} photo={photo} size={48} />
        <div className="dm-req-info">
          <h4 className="dm-req-name">{name}</h4>
          <p className="dm-req-sub">{sub}</p>
          <span className="dm-req-time">{timeAgo(request.createdAt)}</span>
        </div>
      </div>

      {/* Topic chip */}
      {request.topic && (
        <div className="dm-req-topic-chip">
          <span aria-hidden="true">{topicIcon}</span>
          {request.topic}
        </div>
      )}

      {/* Intro message */}
      {request.introMessage && (
        <p className="dm-req-message">"{request.introMessage}"</p>
      )}

      {/* Actions */}
      <div className="dm-req-actions">
        <button
          className="dm-req-btn decline"
          onClick={handleDecline}
          disabled={loading}
          aria-label="Từ chối lời mời"
        >
          Từ chối
        </button>
        <button
          className="dm-req-btn accept"
          onClick={handleAccept}
          disabled={loading}
          aria-label="Chấp nhận lời mời"
        >
          {loading ? 'Đang xử lý…' : 'Chấp nhận'}
        </button>
      </div>
    </div>
  );
}
