/**
 * InboxView.jsx
 * Main Inbox (Hộp Thư) component with 2 mini tabs:
 * - "Tin nhắn": List of accepted conversations (ConversationItem)
 * - "Lời mời": List of pending DM requests (DMRequestItem)
 *
 * Safety: Privacy note banner, explicit empty states with context.
 */
import { useState } from 'react';
import ConversationItem from './ConversationItem.jsx';
import DMRequestItem from './DMRequestItem.jsx';
import './dm.css';

const LockIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const MailIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const InboxEmptyIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

export default function InboxView({
  dmRequests,
  conversations,
  currentUser,
  onAccept,
  onDecline,
  onOpenConversation,
  onSwitchToRooms,
}) {
  const [inboxTab, setInboxTab] = useState('messages');

  const pendingCount = dmRequests?.length || 0;
  const hasMessages  = conversations?.length > 0;
  const hasRequests  = pendingCount > 0;

  return (
    <div className="inbox-screen">

      {/* Privacy notice */}
      <div className="inbox-privacy-note">
        <LockIcon size={14} />
        <p>Cuộc trò chuyện riêng tư giữa các mẹ. Mẹ có thể chặn hoặc báo cáo bất kỳ lúc nào.</p>
      </div>

      {/* Mini tabs */}
      <div className="inbox-tabs">
        <button
          id="inbox-tab-messages"
          className={`inbox-tab-btn ${inboxTab === 'messages' ? 'active' : ''}`}
          onClick={() => setInboxTab('messages')}
          aria-selected={inboxTab === 'messages'}
          role="tab"
        >
          <MailIcon size={15} />
          Tin nhắn
        </button>
        <button
          id="inbox-tab-requests"
          className={`inbox-tab-btn ${inboxTab === 'requests' ? 'active' : ''}`}
          onClick={() => setInboxTab('requests')}
          aria-selected={inboxTab === 'requests'}
          role="tab"
        >
          Lời mời
          {pendingCount > 0 && (
            <span className="inbox-tab-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── Messages tab ── */}
      {inboxTab === 'messages' && (
        hasMessages ? (
          <div className="conversations-list">
            {conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUser?.uid}
                onClick={onOpenConversation}
              />
            ))}
          </div>
        ) : (
          <div className="inbox-empty">
            <div className="inbox-empty-icon">
              <InboxEmptyIcon size={28} />
            </div>
            <p className="inbox-empty-title">Chưa có cuộc trò chuyện nào</p>
            <p className="inbox-empty-sub">
              Mẹ có thể kết nối riêng với những mẹ có cùng giai đoạn hoặc cùng chủ đề quan tâm.
            </p>
            <p className="inbox-empty-note">Tin nhắn riêng chỉ bắt đầu khi cả hai bên đồng ý.</p>
            <button className="inbox-explore-btn" onClick={onSwitchToRooms}>
              Khám phá cộng đồng
            </button>
          </div>
        )
      )}

      {/* ── Requests tab ── */}
      {inboxTab === 'requests' && (
        hasRequests ? (
          <div className="dm-requests-list">
            {dmRequests.map(req => (
              <DMRequestItem
                key={req.id}
                request={req}
                onAccept={onAccept}
                onDecline={onDecline}
              />
            ))}
          </div>
        ) : (
          <div className="requests-empty">
            <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
              Không có lời mời nào
            </p>
            <p>Khi ai đó muốn nhắn riêng với mẹ, lời mời sẽ xuất hiện tại đây.</p>
          </div>
        )
      )}
    </div>
  );
}
