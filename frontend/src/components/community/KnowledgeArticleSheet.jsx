import { useEffect } from 'react';
import './KnowledgeArticleSheet.css';

export default function KnowledgeArticleSheet({ article, onClose }) {
  // Lock body scroll + hide bottom-nav on iOS when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('overlay-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overlay-open');
    };
  }, []);

  if (!article) return null;

  return (
    <div className="kas-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={article.title}>
      <div className="kas-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="kas-handle-bar" />
        
        <div className="kas-header">
          <div className="kas-header-left">
            <span className="kas-badge">
              {article.librarySection 
                ? `Thư viện Montessori · ${article.librarySection === 'pregnancy' ? 'Mẹ bầu' : 'Mẹ sau sinh'}` 
                : 'Kiến thức Montessori'}
            </span>
            <h2 className="kas-title">{article.title}</h2>
          </div>
          <button className="kas-close-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="kas-body">
          {article.summary && (
            <div className="kas-summary-box">
              <p className="kas-summary-text">{article.summary}</p>
            </div>
          )}

          {article.imageUrl && (
            <div className="kas-image-box">
              <img src={article.imageUrl} alt={article.title} className="kas-image" />
            </div>
          )}

          {article.body && (
            <div className="kas-content-box">
              <p className="kas-body-text">{article.body}</p>
            </div>
          )}

          {Array.isArray(article.keyPoints) && article.keyPoints.length > 0 && (
            <div className="kas-section">
              <h3 className="kas-section-title">Điểm mấu chốt</h3>
              <ul className="kas-list">
                {article.keyPoints.map((kp, idx) => (
                  <li key={idx} className="kas-list-item">{kp}</li>
                ))}
              </ul>
            </div>
          )}

          {article.todayAction && (
            <div className="kas-section kas-action-section">
              <h3 className="kas-section-title">Hành động hôm nay</h3>
              <p className="kas-action-text">{article.todayAction}</p>
            </div>
          )}

          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="kas-tags-wrap">
              {article.tags.map((tag, idx) => (
                <span key={idx} className="kas-tag">#{tag}</span>
              ))}
            </div>
          )}

          <div className="kas-disclaimer">
            <p>
              {article.transparencyLabel === 'ai_generated'
                ? "Nội dung gợi ý từ Trợ lý Montessori, đã được admin duyệt."
                : (article.transparencyLabel || "Nội dung gợi ý từ Trợ lý Montessori, đã được admin duyệt.")}
            </p>
            <p className="kas-disclaimer-sub">Thông tin chỉ mang tính tham khảo, không thay thế tư vấn y tế/chuyên môn.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
