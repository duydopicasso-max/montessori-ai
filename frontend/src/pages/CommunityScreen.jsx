/**
 * CommunityScreen.jsx
 * Cộng đồng mẹ & bé — Realtime feed, posts, reactions, comments
 * Firebase Firestore (onSnapshot) + Cloudinary image upload
 */
import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, increment, arrayUnion, arrayRemove,
  serverTimestamp, getDoc, limit
} from 'firebase/firestore';
import { db } from '../firebase.js';
import './CommunityScreen.css';

/* ── Constants ── */
const TAGS = [
  { id: 'all',        emoji: '🌿', label: 'Tất cả' },
  { id: 'breastfeed', emoji: '🍼', label: 'Cho con bú' },
  { id: 'weaning',    emoji: '🥣', label: 'Ăn dặm' },
  { id: 'sleep',      emoji: '💤', label: 'Giấc ngủ' },
  { id: 'health',     emoji: '🏥', label: 'Sức khỏe' },
  { id: 'play',       emoji: '🎮', label: 'Vui chơi' },
  { id: 'develop',    emoji: '📈', label: 'Phát triển' },
  { id: 'pregnant',   emoji: '🤰', label: 'Mẹ bầu' },
  { id: 'montessori', emoji: '🌱', label: 'Montessori' },
  { id: 'tips',       emoji: '💡', label: 'Mẹo hay' },
];

const REACTIONS = ['❤️', '👍', '😍', '💪', '😢', '🎉'];

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* ── Time helper ── */
function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400)return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/* ── Upload to Cloudinary ── */
async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'montessori/community');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: fd,
  });
  const data = await res.json();
  return data.secure_url;
}

/* ════════════════════════════════════════════════
   MAIN SCREEN
════════════════════════════════════════════════ */
export default function CommunityScreen({ profile }) {
  const user   = profile?.user;
  const babies = profile?.babies || [];
  const firstBaby = babies[0];
  const authorName  = profile?.momName || user?.displayName?.split(' ')[0] || 'Mẹ';
  const authorPhoto = user?.photoURL || '';
  const authorBaby  = firstBaby?.name || '';

  const [posts, setPosts]           = useState([]);
  const [activeTag, setActiveTag]   = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading]       = useState(true);

  /* ── Realtime posts ── */
  useEffect(() => {
    const q = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(40));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = activeTag === 'all' ? posts : posts.filter(p => p.tag === activeTag);

  return (
    <div className="community-screen">

      {/* Header */}
      <header className="community-header">
        <div>
          <h1 className="community-title">👩‍👩‍👧 Cộng đồng</h1>
          <p className="community-sub">Chia sẻ · Đồng hành · Chữa lành</p>
        </div>
        <button className="compose-btn" onClick={() => setShowCreate(true)}>✍️ Đăng bài</button>
      </header>

      {/* Tag filter */}
      <div className="tag-filter-wrap">
        <div className="tag-filter-row">
          {TAGS.map(t => (
            <button
              key={t.id}
              className={`tag-pill ${activeTag === t.id ? 'active' : ''}`}
              onClick={() => setActiveTag(t.id)}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="community-feed">
        {loading && (
          <div className="feed-loading">
            {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="feed-empty">
            <div className="feed-empty-icon">🌿</div>
            <h3>Chưa có bài viết nào</h3>
            <p>Hãy là người đầu tiên chia sẻ trong mục này!</p>
            <button className="btn-start-post" onClick={() => setShowCreate(true)}>
              ✍️ Đăng bài ngay
            </button>
          </div>
        )}

        {filtered.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.uid}
            currentAuthor={{ name: authorName, photo: authorPhoto, baby: authorBaby }}
          />
        ))}
      </div>

      {/* Floating compose btn (mobile) */}
      <button className="fab-compose" onClick={() => setShowCreate(true)} aria-label="Đăng bài">
        ✍️
      </button>

      {/* Create post modal */}
      {showCreate && (
        <CreatePost
          onClose={() => setShowCreate(false)}
          author={{ name: authorName, photo: authorPhoto, baby: authorBaby, uid: user?.uid }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   POST CARD
════════════════════════════════════════════════ */
function PostCard({ post, currentUserId, currentAuthor }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [loadingCmts, setLoadingCmts]   = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [sendingCmt, setSendingCmt]     = useState(false);
  const [imgExpanded, setImgExpanded]   = useState(false);

  const tagInfo = TAGS.find(t => t.id === post.tag) || TAGS[0];
  const totalReactions = Object.values(post.reactions || {}).reduce((s, v) => s + v, 0);
  const myReaction = (post.userReactions || {})[currentUserId];

  /* ── Load comments on expand ── */
  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingCmts(true);
      const q = query(
        collection(db, 'communityPosts', post.id, 'comments'),
        orderBy('createdAt', 'asc')
      );
      onSnapshot(q, snap => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingCmts(false);
      });
    }
  };

  /* ── React to post ── */
  const handleReact = async (emoji) => {
    if (!currentUserId) return;
    const ref = doc(db, 'communityPosts', post.id);
    const prev = myReaction;
    const updates = {};
    if (prev) updates[`reactions.${prev}`] = increment(-1);
    if (prev !== emoji) {
      updates[`reactions.${emoji}`] = increment(1);
      updates[`userReactions.${currentUserId}`] = emoji;
    } else {
      updates[`userReactions.${currentUserId}`] = null;
    }
    try { await updateDoc(ref, updates); } catch(e) { console.error(e); }
  };

  /* ── Add comment ── */
  const handleAddComment = async () => {
    if (!commentText.trim() || sendingCmt) return;
    setSendingCmt(true);
    try {
      await addDoc(collection(db, 'communityPosts', post.id, 'comments'), {
        authorName:  currentAuthor.name,
        authorPhoto: currentAuthor.photo,
        content:     commentText.trim(),
        createdAt:   serverTimestamp(),
      });
      await updateDoc(doc(db, 'communityPosts', post.id), { commentCount: increment(1) });
      setCommentText('');
    } finally { setSendingCmt(false); }
  };

  return (
    <article className="post-card">
      {/* Author row */}
      <div className="post-author-row">
        <Avatar name={post.authorName} photo={post.authorPhoto} size={40} />
        <div className="post-author-info">
          <span className="post-author-name">{post.authorName}</span>
          {post.authorBaby && <span className="post-baby-tag">👶 mẹ của {post.authorBaby}</span>}
          <span className="post-time">{timeAgo(post.createdAt)}</span>
        </div>
        {post.tag && (
          <span className="post-tag-badge">
            {tagInfo.emoji} {tagInfo.label}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="post-content">{post.content}</p>

      {/* Image */}
      {post.imageUrl && (
        <div className={`post-image-wrap ${imgExpanded ? 'expanded' : ''}`} onClick={() => setImgExpanded(e => !e)}>
          <img src={post.imageUrl} alt="ảnh bài viết" className="post-image" />
        </div>
      )}

      {/* Reactions */}
      <div className="post-reactions-row">
        <div className="reaction-btns">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              className={`react-btn ${myReaction === emoji ? 'active' : ''}`}
              onClick={() => handleReact(emoji)}
            >
              {emoji}
              {(post.reactions?.[emoji] || 0) > 0 && (
                <span className="react-count">{post.reactions[emoji]}</span>
              )}
            </button>
          ))}
        </div>
        <button className="comment-toggle-btn" onClick={handleToggleComments}>
          💬 {post.commentCount || 0}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="comments-section">
          {loadingCmts && <div className="cmt-loading">...</div>}
          {comments.map(c => (
            <div key={c.id} className="comment-bubble">
              <Avatar name={c.authorName} photo={c.authorPhoto} size={28} />
              <div className="comment-content">
                <span className="comment-author">{c.authorName}</span>
                <p className="comment-text">{c.content}</p>
                <span className="comment-time">{timeAgo(c.createdAt)}</span>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div className="comment-input-row">
            <Avatar name={currentAuthor.name} photo={currentAuthor.photo} size={28} />
            <div className="comment-input-wrap">
              <input
                className="comment-input"
                placeholder="Viết bình luận..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <button
                className="comment-send-btn"
                disabled={!commentText.trim() || sendingCmt}
                onClick={handleAddComment}
              >
                {sendingCmt ? '...' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ════════════════════════════════════════════════
   CREATE POST MODAL
════════════════════════════════════════════════ */
function CreatePost({ onClose, author }) {
  const [content, setContent]     = useState('');
  const [tag, setTag]             = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImage(imageFile);
        setUploading(false);
      }
      await addDoc(collection(db, 'communityPosts'), {
        authorId:    author.uid,
        authorName:  author.name,
        authorPhoto: author.photo,
        authorBaby:  author.baby,
        content:     content.trim(),
        imageUrl,
        tag:         tag || 'all',
        reactions:   {},
        userReactions: {},
        commentCount:  0,
        createdAt:   serverTimestamp(),
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-post-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 className="sheet-title">✍️ Đăng bài chia sẻ</h3>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>

        {/* Author */}
        <div className="create-author-row">
          <Avatar name={author.name} photo={author.photo} size={40} />
          <div>
            <div className="create-author-name">{author.name}</div>
            {author.baby && <div className="create-author-sub">Mẹ của {author.baby}</div>}
          </div>
        </div>

        {/* Content */}
        <textarea
          className="post-textarea"
          placeholder="Chia sẻ kinh nghiệm, câu hỏi hoặc khoảnh khắc với cộng đồng mẹ nhé... 🌿"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          autoFocus
        />

        {/* Image preview */}
        {preview && (
          <div className="create-img-preview">
            <img src={preview} alt="preview" />
            <button className="remove-img-btn" onClick={() => { setPreview(''); setImageFile(null); }}>✕</button>
          </div>
        )}

        {/* Tag selector */}
        <div className="tag-selector-wrap">
          <div className="tag-selector-label">🏷️ Chủ đề:</div>
          <div className="tag-selector-row">
            {TAGS.filter(t => t.id !== 'all').map(t => (
              <button
                key={t.id}
                className={`tag-pill small ${tag === t.id ? 'active' : ''}`}
                onClick={() => setTag(prev => prev === t.id ? '' : t.id)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="sheet-actions">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
          <button className="attach-img-btn" onClick={() => fileRef.current?.click()}>
            📷 Thêm ảnh
          </button>
          <button
            className="submit-post-btn"
            disabled={!content.trim() || submitting || uploading}
            onClick={handleSubmit}
          >
            {uploading ? '📤 Đang tải...' : submitting ? '⏳...' : '🌿 Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   AVATAR component
════════════════════════════════════════════════ */
function Avatar({ name, photo, size }) {
  const initial = name ? name[0].toUpperCase() : '?';
  const colors = ['#5C9E7A','#7DB896','#6BBF8E','#A8D5B5','#4A8566'];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];

  return photo
    ? <img src={photo} alt={name} className="avatar-img" style={{ width: size, height: size }} />
    : (
      <div className="avatar-initials" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
        {initial}
      </div>
    );
}
