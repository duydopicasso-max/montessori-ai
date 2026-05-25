/**
 * ReportSheet.jsx
 * Bottom sheet for reporting a conversation or user.
 * Writes to Firestore `reports` collection.
 */
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase.js';
import '../dm/dm.css';

const REASONS = [
  'Spam / quảng cáo',
  'Nội dung không phù hợp',
  'Tư vấn y tế nguy hiểm',
  'Làm phiền / quấy rối',
  'Thông tin sai sự thật',
  'Khác',
];

const CloseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ReportSheet({ conversationId, reportedUserId, currentUserId, onClose }) {
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        conversationId: conversationId || null,
        reportedUserId: reportedUserId || null,
        reportedBy:     currentUserId,
        reason:         selected,
        createdAt:      serverTimestamp(),
        status:         'pending',
      });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      console.error('Report error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="sheet-header" style={{ padding: '0 0 16px' }}>
          <h3 className="report-title">Báo cáo</h3>
          <button
            className="sheet-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </div>

        {done ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, padding: '24px 0', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(95, 175, 130, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2F6B4F',
            }}>
              <CheckIcon size={24} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Đã gửi báo cáo
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Cảm ơn mẹ đã phản hồi. Chúng tôi sẽ xem xét sớm.
            </p>
          </div>
        ) : (
          <>
            <p className="report-sub">Chọn lý do báo cáo phù hợp nhất:</p>

            <div className="report-reasons">
              {REASONS.map(reason => (
                <button
                  key={reason}
                  className={`report-reason-btn ${selected === reason ? 'selected' : ''}`}
                  onClick={() => setSelected(reason)}
                >
                  {reason}
                  {selected === reason && (
                    <span style={{ color: '#2F6B4F' }}><CheckIcon size={16} /></span>
                  )}
                </button>
              ))}
            </div>

            <button
              className="report-submit-btn"
              disabled={!selected || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Đang gửi…' : 'Gửi báo cáo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
