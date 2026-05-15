import { useState, useRef } from 'react';
import './IngestScreen.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';


export default function IngestScreen() {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText]           = useState('');
  const [sourceName, setSourceName] = useState('');
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState(null); // { type: 'success'|'error', message }
  const [loading, setLoading]     = useState(false);
  const [stats, setStats]         = useState(null);
  const fileInputRef = useRef(null);

  const handleTextIngest = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/ingest/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceName: sourceName || 'Tài liệu thủ công' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: 'success', message: data.message });
      setText(''); setSourceName('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileIngest = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setStatus(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/ingest/file`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: 'success', message: data.message });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/ingest/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStats({ error: err.message });
    }
  };

  return (
    <div className="ingest-screen">
      <div className="ingest-header">
        <div className="ingest-icon">📚</div>
        <div>
          <h1 className="ingest-title">Thêm tài liệu kiến thức</h1>
          <p className="ingest-subtitle">Upload tài liệu thai kỳ, Montessori để AI học và tham khảo</p>
        </div>
      </div>

      <div className="ingest-card">
        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
            ✏️ Nhập văn bản
          </button>
          <button className={`tab ${activeTab === 'file' ? 'active' : ''}`} onClick={() => setActiveTab('file')}>
            📄 Upload file PDF/TXT
          </button>
        </div>

        {/* Text Tab */}
        {activeTab === 'text' && (
          <form className="ingest-form" onSubmit={handleTextIngest}>
            <div className="form-group">
              <label>Tên tài liệu</label>
              <input
                type="text"
                value={sourceName}
                onChange={e => setSourceName(e.target.value)}
                placeholder="Ví dụ: Hướng dẫn thai kỳ tam cá nguyệt 1"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Nội dung tài liệu <span className="required">*</span></label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Dán nội dung tài liệu thai kỳ hoặc Montessori vào đây..."
                className="form-textarea"
                rows={10}
              />
              <span className="char-count">{text.length} ký tự</span>
            </div>
            <button type="submit" className="submit-btn" disabled={loading || text.length < 50}>
              {loading ? <><span className="btn-spinner" /> Đang xử lý...</> : '🚀 Nhập vào cơ sở kiến thức'}
            </button>
          </form>
        )}

        {/* File Tab */}
        {activeTab === 'file' && (
          <form className="ingest-form" onSubmit={handleFileIngest}>
            <div
              className={`file-drop-zone ${file ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0] || null)}
              />
              {file ? (
                <div className="file-info">
                  <span className="file-icon">{file.name.endsWith('.pdf') ? '📕' : '📄'}</span>
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" className="file-remove" onClick={e => { e.stopPropagation(); setFile(null); }}>✕</button>
                </div>
              ) : (
                <>
                  <div className="drop-icon">☁️</div>
                  <p className="drop-text">Kéo thả file hoặc <span>nhấn để chọn</span></p>
                  <p className="drop-hint">Hỗ trợ: PDF, TXT (tối đa 100MB)</p>
                </>
              )}
            </div>
            <button type="submit" className="submit-btn" disabled={loading || !file}>
              {loading ? <><span className="btn-spinner" /> Đang xử lý...</> : '🚀 Upload và nhập tài liệu'}
            </button>
          </form>
        )}

        {/* Status */}
        {status && (
          <div className={`status-banner ${status.type}`}>
            {status.type === 'success' ? '✅' : '❌'} {status.message}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-card">
        <div className="stats-header">
          <h2>📊 Thống kê Pinecone</h2>
          <button className="refresh-btn" onClick={fetchStats}>🔄 Kiểm tra</button>
        </div>
        {stats ? (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.totalVectorCount ?? stats.error ?? 'N/A'}</span>
              <span className="stat-label">Tổng vectors</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.dimension ?? '768'}</span>
              <span className="stat-label">Dimensions</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{Object.keys(stats.namespaces || {}).length}</span>
              <span className="stat-label">Namespaces</span>
            </div>
          </div>
        ) : (
          <p className="stats-empty">Nhấn "Kiểm tra" để xem thông tin cơ sở dữ liệu</p>
        )}
      </div>
    </div>
  );
}
