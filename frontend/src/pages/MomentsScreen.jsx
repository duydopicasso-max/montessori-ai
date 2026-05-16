/**
 * MomentsScreen.jsx — Album ảnh dùng Cloudinary (không cần Firebase Storage)
 * Upload ảnh → Cloudinary unsigned upload → lưu URL vào Firestore
 */
import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './MomentsScreen.css';

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const TAGS = ['🌟 Đặc biệt', '🎂 Sinh nhật', '🏥 Khám bệnh', '🌱 Cột mốc', '😂 Hài hước', '❤️ Yêu thương', '🎮 Vui chơi', '🍎 Ăn dặm'];

async function uploadToCloudinary(file, folder, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(xhr.responseText));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(fd);
  });
}

export default function MomentsScreen({ profile }) {
  const babies  = profile?.babies || [];
  const userId  = profile?.user?.uid;

  const [selectedBaby, setSelectedBaby] = useState(0);
  const [photos, setPhotos]             = useState([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadPct, setUploadPct]       = useState(0);
  const [lightbox, setLightbox]         = useState(null);
  const [filterTag, setFilterTag]       = useState('');
  const [caption, setCaption]           = useState('');
  const [selectedTag, setSelectedTag]   = useState('');
  const [error, setError]               = useState('');
  const fileRef = useRef();

  const baby   = babies[selectedBaby] || {};
  const babyId = (baby.name || `baby-${selectedBaby}`).toLowerCase().replace(/\s+/g, '-');
  const folder = `montessori/${userId}/${babyId}`;

  /* ── Load photos from Firestore ── */
  useEffect(() => {
    if (!userId || !babyId) return;
    setPhotos([]);
    getDocs(query(
      collection(db, 'users', userId, 'babies', babyId, 'moments'),
      orderBy('createdAt', 'desc')
    )).then(snap => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userId, babyId, selectedBaby]);

  /* ── Upload via Cloudinary ── */
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Chưa cấu hình Cloudinary. Vui lòng thêm VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET vào file .env');
      return;
    }
    setError('');
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadToCloudinary(file, folder, (pct) => {
          setUploadPct(Math.round(((i / files.length) + pct / 100 / files.length) * 100));
        });
        const photoData = {
          url:        result.secure_url,
          publicId:   result.public_id,
          caption:    caption || '',
          tag:        selectedTag || '',
          fileName:   file.name,
          width:      result.width,
          height:     result.height,
          createdAt:  serverTimestamp(),
        };
        const ref = await addDoc(
          collection(db, 'users', userId, 'babies', babyId, 'moments'),
          photoData
        );
        setPhotos(prev => [{ id: ref.id, ...photoData }, ...prev]);
      } catch (err) {
        setError(`Lỗi upload: ${err.message}`);
      }
    }

    setCaption('');
    setSelectedTag('');
    setUploadPct(0);
    setUploading(false);
    e.target.value = '';
  };

  /* ── Delete (Firestore only — Cloudinary free tier keeps files) ── */
  const handleDelete = async (photo) => {
    if (!window.confirm('Xoá ảnh này khỏi album?')) return;
    await deleteDoc(doc(db, 'users', userId, 'babies', babyId, 'moments', photo.id));
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
  };

  const filtered = filterTag ? photos.filter(p => p.tag === filterTag) : photos;

  return (
    <div className="moments-screen">
      {/* Header */}
      <header className="moments-header">
        <div>
          <h1 className="moments-title">📸 Khoảnh khắc bé yêu</h1>
          <p className="moments-subtitle">Album ảnh · Lưu giữ từng kỷ niệm quý giá</p>
        </div>
        <button className="upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? `⏳ ${uploadPct}%` : '+ Thêm ảnh'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
      </header>

      {/* Baby tabs */}
      {babies.length > 1 && (
        <div className="baby-tabs">
          {babies.map((b, i) => (
            <button key={i} className={`baby-tab ${selectedBaby === i ? 'active' : ''}`} onClick={() => setSelectedBaby(i)}>
              {b.gender === 'boy' ? '👦' : '👧'} {b.name || `Bé ${String.fromCharCode(65+i)}`}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <div className="upload-error">⚠️ {error}</div>}

      {/* Upload options */}
      {!uploading && (
        <div className="upload-options">
          <input
            className="caption-input"
            placeholder="✍️ Ghi chú cho ảnh (tuỳ chọn)..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
          <div className="tag-list">
            {TAGS.map(t => (
              <button key={t} className={`tag-btn ${selectedTag === t ? 'active' : ''}`}
                onClick={() => setSelectedTag(prev => prev === t ? '' : t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="progress-wrap">
          <div className="progress-bar-inner" style={{ width: `${uploadPct}%` }} />
          <span className="progress-label">Đang tải lên {uploadPct}%...</span>
        </div>
      )}

      {/* Filter bar */}
      {photos.length > 0 && (
        <div className="filter-bar">
          <button className={`filter-tag ${!filterTag ? 'active' : ''}`} onClick={() => setFilterTag('')}>
            🖼️ Tất cả ({photos.length})
          </button>
          {[...new Set(photos.map(p => p.tag).filter(Boolean))].map(t => (
            <button key={t} className={`filter-tag ${filterTag === t ? 'active' : ''}`} onClick={() => setFilterTag(t)}>
              {t} ({photos.filter(p => p.tag === t).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="moments-content">
        {filtered.length === 0 ? (
          <div className="empty-moments">
            <div className="empty-camera">📷</div>
            <h3>Chưa có ảnh nào</h3>
            <p>Nhấn <strong>"+ Thêm ảnh"</strong> để lưu những khoảnh khắc đáng nhớ của bé</p>
            <button className="upload-btn-empty" onClick={() => fileRef.current?.click()}>
              📸 Thêm ảnh đầu tiên
            </button>
          </div>
        ) : (
          <div className="photo-grid">
            {filtered.map(photo => (
              <div key={photo.id} className="photo-item" onClick={() => setLightbox(photo)}>
                <img src={photo.url} alt={photo.caption || 'Ảnh bé'} loading="lazy" />
                <div className="photo-overlay">
                  {photo.tag     && <span className="photo-tag">{photo.tag}</span>}
                  {photo.caption && <p className="photo-caption">{photo.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="lightbox-img" />
            <div className="lightbox-info">
              {lightbox.tag     && <span className="lightbox-tag">{lightbox.tag}</span>}
              {lightbox.caption && <p className="lightbox-caption">{lightbox.caption}</p>}
              <div className="lightbox-actions">
                <a href={lightbox.url} target="_blank" rel="noreferrer" className="lb-btn download-btn">
                  ⬇️ Xem gốc
                </a>
                <button className="lb-btn delete-lb-btn" onClick={() => handleDelete(lightbox)}>
                  🗑️ Xoá ảnh
                </button>
                <button className="lb-btn close-lb-btn" onClick={() => setLightbox(null)}>
                  ✕ Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
