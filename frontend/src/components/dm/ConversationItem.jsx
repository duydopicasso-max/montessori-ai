/**
 * ConversationItem.jsx
 * Renders a single conversation row in the inbox list.
 */
import '../dm/dm.css';

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
  if (diffD < 7)    return `${diffD} ngày trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, photo, size = 46 }) {
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

export default function ConversationItem({ conversation, currentUserId, onClick }) {
  const otherUid  = conversation.participantIds?.find(id => id !== currentUserId);
  const otherUser = conversation.participantData?.[otherUid] || {};
  const unread    = conversation.unreadCounts?.[currentUserId] || 0;
  const isUnread  = unread > 0;

  const name      = otherUser.name || 'Thành viên';
  const baby      = otherUser.baby;
  const topic     = conversation.topic;
  const subParts  = [baby ? `Mẹ của ${baby}` : null, topic].filter(Boolean);
  const sub       = subParts.join(' · ') || 'Cuộc trò chuyện riêng';

  const lastMsg   = conversation.lastMessage || '';
  const lastMsgDisplay = lastMsg.length > 40 ? lastMsg.slice(0, 40) + '…' : lastMsg;

  return (
    <div
      className="conversation-item"
      onClick={() => onClick(conversation)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(conversation)}
    >
      <div className="conv-avatar-wrap">
        <Avatar name={name} photo={otherUser.photo} size={46} />
        {isUnread && <div className="conv-unread-dot" />}
      </div>

      <div className="conv-body">
        <div className="conv-top">
          <span className={`conv-name ${isUnread ? 'unread' : ''}`}>{name}</span>
          <span className="conv-time">{timeAgo(conversation.lastMessageAt)}</span>
        </div>
        <p className="conv-sub">{sub}</p>
        {lastMsgDisplay && (
          <p className={`conv-last-msg ${isUnread ? 'unread' : ''}`}>
            {lastMsgDisplay || 'Bắt đầu trò chuyện'}
          </p>
        )}
      </div>

      {isUnread && (
        <div className="conv-right">
          <span className="conv-unread-badge">{unread > 9 ? '9+' : unread}</span>
        </div>
      )}
    </div>
  );
}
