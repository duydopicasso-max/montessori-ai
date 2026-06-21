/**
 * AdminImportScreen.jsx
 * Admin-only screen: Import "Montessori Publish Package" JSON into
 * the aiContentReviewQueue Firestore collection (pending_review only).
 *
 * SAFETY CONTRACT:
 * - Never writes to chatRooms, customRooms, communityPosts or any public collection.
 * - Only users where users/{uid}.role === 'admin' can use this screen.
 * - All writes go to aiContentReviewQueue/{importId} with reviewStatus: 'pending_review'.
 * - Duplicate detection via deterministic importId (sourceDraftId + exportedAt).
 */
import { useState, useRef, useCallback } from 'react';
import {
  collection, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { validateImportPackage, generateImportId } from '../utils/validateImportPackage.js';
import './AdminImportScreen.css';

// ── Admin guard: read users/{uid}.role from Firestore ─────────────────────
// This hook is intentionally light — no extra subscription, single getDoc.
async function checkIsAdmin(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    return snap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

// ── Status badge helper ────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    approved:         { label: 'Đã duyệt',         color: '#2f6b4f' },
    ready_to_publish: { label: 'Sẵn sàng đăng',    color: '#1d7fa8' },
  };
  const s = map[status] || { label: status, color: '#888' };
  return (
    <span className="ais-badge" style={{ background: s.color }}>{s.label}</span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminImportScreen({ authUser }) {
  const [adminChecked, setAdminChecked]   = useState(false);  // has check run
  const [isAdmin, setIsAdmin]             = useState(false);
  const [checking, setChecking]           = useState(true);

  const [pkg, setPkg]                     = useState(null);   // parsed JSON
  const [fileName, setFileName]           = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [dragOver, setDragOver]           = useState(false);

  const [importState, setImportState]     = useState('idle'); // idle|confirming|importing|done|error
  const [importResult, setImportResult]   = useState(null);   // { imported, skipped, errors }

  const fileRef = useRef(null);

  // ── Check admin on mount ──────────────────────────────────────────────────
  useState(() => {
    (async () => {
      const ok = await checkIsAdmin(authUser?.uid);
      setIsAdmin(ok);
      setAdminChecked(true);
      setChecking(false);
    })();
  });

  // ── Parse & validate JSON file ────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setValidationErrors(['Chỉ chấp nhận file có định dạng .json.']);
      setPkg(null);
      return;
    }
    setFileName(file.name);
    setPkg(null);
    setValidationErrors([]);
    setImportState('idle');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const { valid, errors } = validateImportPackage(parsed);
        if (!valid) {
          setValidationErrors(errors);
          setPkg(null);
        } else {
          setValidationErrors([]);
          setPkg(parsed);
        }
      } catch {
        setValidationErrors(['Không thể đọc file JSON. Hãy kiểm tra định dạng file.']);
        setPkg(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleFileChange = (e) => processFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportConfirm = async () => {
    if (!pkg || !authUser?.uid) return;
    setImportState('importing');

    const packageId  = `pkg_${Date.now()}`;
    const imported   = [];
    const skipped    = [];
    const errors     = [];

    for (const item of pkg.items) {
      const importId = generateImportId(
        item.sourceDraftId || 'unknown',
        item.exportedAt    || pkg.exportedAt || '',
      );
      try {
        // ── Duplicate check ──────────────────────────────────────────
        const existingRef = doc(db, 'aiContentReviewQueue', importId);
        const existingSnap = await getDoc(existingRef);
        if (existingSnap.exists()) {
          skipped.push({ title: item.title, reason: 'Bài này đã được import trước đó.' });
          continue;
        }

        // ── Write to aiContentReviewQueue — ONLY pending_review ──────
        await setDoc(existingRef, {
          // Source tracking
          sourcePackageId:    packageId,
          sourceDraftId:      item.sourceDraftId   ?? null,
          source:             pkg.source,
          sourceExportedAt:   item.exportedAt      ?? pkg.exportedAt ?? null,

          // Content
          title:              item.title,
          summary:            item.summary,
          body:               item.body,
          keyPoints:          Array.isArray(item.keyPoints) ? item.keyPoints : [],
          todayAction:        item.todayAction      ?? null,
          category:           item.category         ?? null,
          targetAudience:     item.targetAudience   ?? null,
          contentType:        item.contentType      ?? null,
          tags:               Array.isArray(item.tags) ? item.tags : [],

          // Image (prompt only, no generated images)
          imagePrompt:        item.imagePrompt      ?? null,
          imageStyle:         item.imageStyle       ?? null,
          imageUrl:           item.imageUrl         ?? null,

          // AI transparency
          authorType:         'ai_assistant',
          authorName:         item.authorName       ?? 'Trợ lý Montessori',
          transparencyLabel:  item.transparencyLabel,
          sourceModel:        item.sourceModel      ?? null,
          safetyNotes:        item.safetyNotes      ?? null,

          // Community suggestion (stored but NOT published)
          communityPostSuggestion: item.communityPostSuggestion ?? null,

          // Review state — ALWAYS pending_review on import
          reviewStatus:       'pending_review',
          importedAt:         serverTimestamp(),
          importedByUid:      authUser.uid,
        });

        imported.push(item.title);
      } catch (err) {
        errors.push({ title: item.title, reason: `Lỗi khi lưu: ${err.message}` });
      }
    }

    setImportResult({ imported, skipped, errors });
    setImportState('done');
  };

  // ── Guard: not checked yet ────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="ais-root">
        <div className="ais-checking">Đang kiểm tra quyền truy cập…</div>
      </div>
    );
  }

  // ── Guard: not admin ──────────────────────────────────────────────────────
  if (adminChecked && !isAdmin) {
    return (
      <div className="ais-root">
        <div className="ais-forbidden">
          <div className="ais-forbidden-icon">🔒</div>
          <h2>Không có quyền truy cập</h2>
          <p>Trang này chỉ dành cho quản trị viên.</p>
        </div>
      </div>
    );
  }

  const canImport = pkg && validationErrors.length === 0 && importState === 'idle';

  return (
    <div className="ais-root">
      {/* ── Header ── */}
      <div className="ais-header">
        <div className="ais-header-icon">📦</div>
        <div>
          <h1 className="ais-title">Nhập gói đăng Montessori</h1>
          <p className="ais-subtitle">
            Import bài đã duyệt từ Content Studio vào hàng chờ duyệt của app.
            <br />
            <strong>Chưa có bài nào được đăng tự động.</strong>
          </p>
        </div>
      </div>

      {/* ── Upload box ── */}
      {importState !== 'done' && (
        <div
          className={`ais-dropzone ${dragOver ? 'ais-dropzone--over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          aria-label="Chọn file JSON để import"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="ais-file-hidden"
            onChange={handleFileChange}
          />
          <div className="ais-dropzone-icon">📂</div>
          <p className="ais-dropzone-text">
            {fileName
              ? <><strong>{fileName}</strong> — nhấn hoặc kéo thả để chọn file khác</>
              : <>Kéo thả file <code>.json</code> vào đây, hoặc <strong>nhấn để chọn file</strong></>
            }
          </p>
        </div>
      )}

      {/* ── Validation errors ── */}
      {validationErrors.length > 0 && (
        <div className="ais-errors" role="alert">
          <div className="ais-errors-title">❌ Không thể import — phát hiện {validationErrors.length} lỗi:</div>
          <ul className="ais-errors-list">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Preview ── */}
      {pkg && validationErrors.length === 0 && importState !== 'done' && (
        <div className="ais-preview">
          <div className="ais-preview-header">
            <span className="ais-preview-count">
              📋 {pkg.itemCount} bài trong gói
            </span>
            <span className="ais-preview-meta">
              Nguồn: <code>{pkg.source}</code> · Xuất lúc: {pkg.exportedAt ? new Date(pkg.exportedAt).toLocaleString('vi-VN') : '—'}
            </span>
          </div>

          <div className="ais-item-list">
            {pkg.items.map((item, idx) => (
              <div key={idx} className="ais-item-card">
                <div className="ais-item-title">{item.title || '(Không có tiêu đề)'}</div>
                <div className="ais-item-meta">
                  <span className="ais-item-type">{item.contentType ?? '—'}</span>
                  <span className="ais-item-cat">{item.category ?? '—'}</span>
                  <StatusBadge status={item.approvedStatus} />
                  {item.contentType === 'Bài đăng hội nhóm' && item.communityPostSuggestion?.room && (
                    <span className="ais-item-room">🏠 {item.communityPostSuggestion.room}</span>
                  )}
                </div>
                {item.summary && (
                  <p className="ais-item-summary">
                    {item.summary.length > 120 ? item.summary.slice(0, 120) + '…' : item.summary}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── Import button ── */}
          {importState === 'idle' && (
            <button
              className="ais-import-btn"
              disabled={!canImport}
              onClick={() => setImportState('confirming')}
            >
              Import vào hàng chờ duyệt
            </button>
          )}

          {/* ── Confirm dialog ── */}
          {importState === 'confirming' && (
            <div className="ais-confirm-box" role="dialog" aria-modal="true">
              <p className="ais-confirm-text">
                ⚠️ Thao tác này chỉ đưa <strong>{pkg.itemCount} bài</strong> vào hàng chờ duyệt,
                chưa đăng công khai. Bạn có muốn tiếp tục không?
              </p>
              <div className="ais-confirm-btns">
                <button className="ais-btn-cancel" onClick={() => setImportState('idle')}>
                  Huỷ
                </button>
                <button className="ais-btn-confirm" onClick={handleImportConfirm}>
                  Xác nhận Import
                </button>
              </div>
            </div>
          )}

          {importState === 'importing' && (
            <div className="ais-importing">⏳ Đang import…</div>
          )}
        </div>
      )}

      {/* ── Done state ── */}
      {importState === 'done' && importResult && (
        <div className="ais-result">
          <div className="ais-result-title">✅ Đã import xong</div>

          {importResult.imported.length > 0 && (
            <div className="ais-result-section ais-result--success">
              <strong>Đã import {importResult.imported.length} bài vào hàng chờ duyệt:</strong>
              <ul>{importResult.imported.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}

          {importResult.skipped.length > 0 && (
            <div className="ais-result-section ais-result--warn">
              <strong>Bỏ qua {importResult.skipped.length} bài (đã import trước đó):</strong>
              <ul>{importResult.skipped.map((s, i) => <li key={i}>{s.title} — {s.reason}</li>)}</ul>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="ais-result-section ais-result--error">
              <strong>Lỗi khi import {importResult.errors.length} bài:</strong>
              <ul>{importResult.errors.map((e, i) => <li key={i}>{e.title} — {e.reason}</li>)}</ul>
            </div>
          )}

          <button
            className="ais-btn-reset"
            onClick={() => {
              setPkg(null); setFileName(''); setValidationErrors([]);
              setImportState('idle'); setImportResult(null);
            }}
          >
            Import gói khác
          </button>
        </div>
      )}
    </div>
  );
}
