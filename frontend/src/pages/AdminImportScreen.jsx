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
 * - Duplicate items are SKIPPED. Never overwritten.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { validateImportPackage, generateImportId } from '../utils/validateImportPackage.js';
import { isLocalDevMode } from '../utils/devMode.js';
import './AdminImportScreen.css';

// ── Admin guard: read users/{uid}.role from Firestore ─────────────────────
async function checkIsAdmin(uid) {
  if (isLocalDevMode) return true;
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

// ── Item preview card component with collapsible details ───────────────────
function ItemPreviewCard({ index, itemVal, isDuplicate, duplicateChecking }) {
  const [expanded, setExpanded] = useState(false);
  const { item, errors, warnings, status } = itemVal;

  let displayStatus = 'valid';
  let statusText = 'Sẵn sàng nhập';
  let statusColor = '#2f6b4f';
  let statusBg = '#e8f5ee';

  if (errors.length > 0) {
    displayStatus = 'error';
    statusText = 'Có lỗi cần sửa';
    statusColor = '#c0392b';
    statusBg = '#fdecea';
  } else if (isDuplicate) {
    displayStatus = 'duplicate';
    statusText = 'Trùng lặp — sẽ bỏ qua';
    statusColor = '#d35400';
    statusBg = '#fdebd0';
  } else if (warnings.length > 0) {
    displayStatus = 'warning';
    statusText = 'Có cảnh báo';
    statusColor = '#d4ac0d';
    statusBg = '#fef9e7';
  }

  const hasImage = item.imageUrl && String(item.imageUrl).trim() !== '';
  let imageText = 'Không kèm ảnh';
  let imageColor = '#7f8c8d';

  if (hasImage) {
    const isHttps = String(item.imageUrl).trim().startsWith('https://');
    if (isHttps) {
      imageText = 'Ảnh HTTPS hợp lệ';
      imageColor = '#27ae60';
    } else {
      imageText = 'Ảnh không bảo mật (HTTP)';
      imageColor = '#c0392b';
    }
  }

  return (
    <div className={`ais-item-card-upgraded status-${displayStatus}`} style={{
      background: '#fff',
      border: `1.5px solid ${displayStatus === 'error' ? '#f5b7b1' : displayStatus === 'duplicate' ? '#f5cba7' : displayStatus === 'warning' ? '#f9e79f' : '#d5dbdb'}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#7f8c8d', fontWeight: 'bold', marginRight: '6px' }}>#{index}</span>
          <strong style={{ fontSize: '0.95rem', color: '#2c3e50' }}>{item.title || '(Không có tiêu đề)'}</strong>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 'bold',
          color: statusColor,
          background: statusBg,
          padding: '4px 10px',
          borderRadius: '12px',
          display: 'inline-block'
        }}>
          {duplicateChecking ? 'Đang kiểm tra trùng...' : statusText}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
        <span className="ais-meta-badge">{item.contentType || 'Hội nhóm'}</span>
        <span className="ais-meta-badge">{item.category || 'Mẹ & Bé'}</span>
        {item.communityPostSuggestion?.room && (
          <span className="ais-meta-badge" style={{ background: '#f5f7f8' }}>🏠 {item.communityPostSuggestion.room}</span>
        )}
        <span className="ais-meta-badge" style={{ color: imageColor }}>🖼️ {imageText}</span>
      </div>

      {/* Errors & Warnings List */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div style={{ marginTop: '12px', background: '#fafbfc', borderRadius: '8px', padding: '10px 14px' }}>
          {errors.map((e, idx) => (
            <div key={`err-${idx}`} style={{ color: '#c0392b', fontSize: '0.82rem', display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <span>❌</span> <span>{e}</span>
            </div>
          ))}
          {warnings.map((w, idx) => (
            <div key={`warn-${idx}`} style={{ color: '#b7950b', fontSize: '0.82rem', display: 'flex', gap: '6px', marginBottom: '4px' }}>
              <span>⚠️</span> <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Accordion toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2f6b4f',
            fontWeight: '600',
            fontSize: '0.82rem',
            cursor: 'pointer',
            padding: '2px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {expanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
        </button>
      </div>

      {/* Collapsed content */}
      {expanded && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #ebedef',
          fontSize: '0.84rem',
          color: '#34495e',
          lineHeight: '1.6'
        }}>
          {item.summary && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ display: 'block', color: '#7f8c8d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tóm tắt bài viết</strong>
              <p style={{ margin: '4px 0 0' }}>{item.summary}</p>
            </div>
          )}
          {item.body && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ display: 'block', color: '#7f8c8d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Nội dung chính</strong>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{item.body}</p>
            </div>
          )}
          {item.todayAction && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ display: 'block', color: '#7f8c8d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Hành động hôm nay</strong>
              <p style={{ margin: '4px 0 0' }}>{item.todayAction}</p>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ display: 'block', color: '#7f8c8d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tags</strong>
              <p style={{ margin: '4px 0 0', color: '#7f8c8d' }}>{item.tags.map(t => `#${t}`).join(', ')}</p>
            </div>
          )}
          {item.communityPostSuggestion && (
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
              <strong style={{ display: 'block', color: '#2f6b4f', fontSize: '0.8rem', marginBottom: '6px' }}>📌 Nội dung đăng hội nhóm</strong>
              <p style={{ margin: '0 0 6px' }}><b>Tiêu đề:</b> {item.communityPostSuggestion.postTitle}</p>
              <p style={{ margin: '0 0 6px' }}><b>Nội dung:</b> {item.communityPostSuggestion.postBody}</p>
              <p style={{ margin: '0' }}><b>Câu hỏi gợi mở:</b> {item.communityPostSuggestion.engagementQuestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminImportScreen({ authUser, setActiveTab }) {
  const [adminChecked, setAdminChecked]   = useState(false);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [checking, setChecking]           = useState(true);

  const [pkg, setPkg]                     = useState(null);   // parsed & validated package
  const [fileName, setFileName]           = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [dragOver, setDragOver]           = useState(false);

  const [duplicateMap, setDuplicateMap]   = useState({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showAllItems, setShowAllItems]   = useState(false);

  const [importState, setImportState]     = useState('idle'); // idle|confirming|importing|done|error
  const [importResult, setImportResult]   = useState(null);   // { imported, skipped, errors }

  // LocalStorage history logs
  const [history, setHistory]             = useState(() => {
    try {
      const data = localStorage.getItem('montessori_admin_import_history_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const fileRef = useRef(null);

  // ── Check admin on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkIsAdmin(authUser?.uid);
      if (!cancelled) {
        setIsAdmin(ok);
        setAdminChecked(true);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser?.uid]);

  // ── Check duplicates when package is loaded ───────────────────────────────
  useEffect(() => {
    if (!pkg || !isAdmin) return;
    let cancelled = false;
    (async () => {
      setCheckingDuplicates(true);
      const dupMap = {};
      try {
        await Promise.all(
          pkg.items.map(async (it) => {
            const importId = generateImportId(
              it.item.sourceDraftId || 'unknown',
              it.item.exportedAt || pkg.exportedAt || '',
            );
            if (isLocalDevMode && !authUser?.uid) {
              const mockImported = JSON.parse(sessionStorage.getItem('mock_imported_drafts') || '[]');
              dupMap[it.item.sourceDraftId] = mockImported.includes(importId);
            } else {
              const snap = await getDoc(doc(db, 'aiContentReviewQueue', importId));
              if (!cancelled) {
                dupMap[it.item.sourceDraftId] = snap.exists();
              }
            }
          }),
        );
      } catch (err) {
        console.error('Lỗi khi kiểm tra trùng lặp:', err);
      } finally {
        if (!cancelled) {
          setDuplicateMap(dupMap);
          setCheckingDuplicates(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pkg, isAdmin, authUser?.uid]);

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
    setShowAllItems(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const res = validateImportPackage(parsed);
        if (res.errors && res.errors.length > 0) {
          setValidationErrors(res.errors);
          setPkg(null);
        } else {
          setValidationErrors([]);
          setPkg(res);
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

  // ── Save import batch to LocalStorage history ──────────────────────────────
  const saveToHistory = (importedCount, skippedCount, failedCount, warningCount) => {
    if (!pkg) return;
    const entry = {
      batchId: `batch_${Date.now()}`,
      importedAt: new Date().toISOString(),
      adminEmail: authUser?.email || authUser?.uid || 'Admin',
      fileName: fileName || 'package.json',
      packageSchemaVersion: pkg.packageSchemaVersion || '1.0',
      packageType: pkg.packageType || 'montessori_publish_package',
      itemCount: pkg.items.length,
      importedCount,
      skippedDuplicateCount: skippedCount,
      failedCount,
      warningCount,
      source: pkg.source || 'montessori-ai-content-studio',
    };

    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20); // Keep max 20 entries
      localStorage.setItem('montessori_admin_import_history_v1', JSON.stringify(next));
      return next;
    });
  };

  const handleClearHistory = () => {
    if (window.confirm('Bạn có muốn xóa toàn bộ lịch sử import cục bộ trên trình duyệt này không?')) {
      localStorage.removeItem('montessori_admin_import_history_v1');
      setHistory([]);
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportConfirm = async () => {
    if (!isAdmin) {
      alert('Bạn không có quyền thực hiện thao tác này.');
      return;
    }
    if (!pkg || (!isLocalDevMode && !authUser?.uid)) return;
    setImportState('importing');

    const packageId  = `pkg_${Date.now()}`;
    const imported   = [];
    const skipped    = [];
    const errors     = [];

    for (const valItem of pkg.items) {
      const item = valItem.item;
      const isErr = valItem.errors.length > 0;
      
      const importId = generateImportId(
        item.sourceDraftId || 'unknown',
        item.exportedAt    || pkg.exportedAt || '',
      );

      // Skip hard error items
      if (isErr) {
        errors.push({ title: item.title, reason: 'Chặn import do có lỗi cấu trúc dữ liệu.' });
        continue;
      }

      // ── Duplicate check — Skip only, no overwrite ──
      const isDuplicate = duplicateMap[item.sourceDraftId] === true;
      if (isDuplicate) {
        skipped.push({ title: item.title, reason: 'Bài này đã được import trước đó.' });
        continue;
      }

      try {
        if (isLocalDevMode && !authUser?.uid) {
          console.log('[MOCK DEV IMPORT]', importId, item.title);
          const mockImported = JSON.parse(sessionStorage.getItem('mock_imported_drafts') || '[]');
          if (!mockImported.includes(importId)) {
            mockImported.push(importId);
            sessionStorage.setItem('mock_imported_drafts', JSON.stringify(mockImported));
          }
        } else {
          // Write to aiContentReviewQueue — ALWAYS pending_review on import
          await setDoc(doc(db, 'aiContentReviewQueue', importId), {
            // Source tracking
            sourcePackageId:    packageId,
            sourceDraftId:      item.sourceDraftId   ?? null,
            source:             pkg.source           ?? 'montessori-ai-content-studio',
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

            // Image (prompt & external url, no Storage upload)
            imagePrompt:        item.imagePrompt      ?? null,
            imageStyle:         item.imageStyle       ?? null,
            imageUrl:           item.imageUrl         ?? null,

            // AI transparency
            authorType:         'ai_assistant',
            authorName:         item.authorName       ?? 'Trợ lý Montessori',
            transparencyLabel:  item.transparencyLabel || '',
            sourceModel:        item.sourceModel      ?? null,
            safetyNotes:        item.safetyNotes      ?? null,

            // Community suggestion (stored but NOT published)
            communityPostSuggestion: item.communityPostSuggestion ?? null,

            // Review state
            reviewStatus:       'pending_review',
            importedAt:         serverTimestamp(),
            importedByUid:      authUser.uid,
          });
        }

        imported.push(item.title);
      } catch (err) {
        errors.push({ title: item.title, reason: `Lỗi khi lưu: ${err.message}` });
      }
    }

    setImportResult({ imported, skipped, errors });
    
    // Calculate total warnings for warningCount in history log
    const warningsCount = pkg.items.reduce((acc, it) => acc + it.warnings.length, 0);
    saveToHistory(imported.length, skipped.length, errors.length, warningsCount);
    
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

  // Derived metrics
  let totalItemsCount = 0;
  let totalErrorsCount = 0;
  let totalWarningsCount = 0;
  let totalDuplicatesCount = 0;
  let totalReadyCount = 0;

  if (pkg) {
    totalItemsCount = pkg.items.length;
    pkg.items.forEach((it) => {
      const isDup = duplicateMap[it.item.sourceDraftId] === true;
      if (it.errors.length > 0) {
        totalErrorsCount++;
      } else if (isDup) {
        totalDuplicatesCount++;
      } else {
        totalReadyCount++;
        if (it.warnings.length > 0) {
          totalWarningsCount++;
        }
      }
    });
  }

  const hasHardErrors = pkg && (validationErrors.length > 0 || totalErrorsCount > 0);
  const canImport = pkg && !hasHardErrors && totalReadyCount > 0 && importState === 'idle' && !checkingDuplicates;

  return (
    <div className="ais-root" style={{ maxWidth: '800px', padding: '24px 16px 60px' }}>
      
      {/* CSS Helper class injection for metadata badge */}
      <style>{`
        .ais-meta-badge {
          font-size: 0.74rem;
          background: #f0f3f4;
          color: #4f5f6f;
          padding: 3px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .ais-summary-card {
          flex: 1;
          background: #fafbfc;
          border: 1px solid #ebedef;
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="ais-header">
        <div className="ais-header-icon">📦</div>
        <div>
          <h1 className="ais-title">Nhập gói đăng Montessori</h1>
          <p className="ais-subtitle">
            Nhập bài đăng đã xuất từ Content Studio vào hàng chờ duyệt của App chính.
            <br />
            <strong>Các bài viết cần admin phê duyệt mới xuất bản lên cộng đồng.</strong>
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

      {/* ── Package Header Errors ── */}
      {validationErrors.length > 0 && (
        <div className="ais-errors" role="alert">
          <div className="ais-errors-title">❌ Lỗi tệp tin — không thể import gói:</div>
          <ul className="ais-errors-list">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Preview & Validation Report ── */}
      {pkg && validationErrors.length === 0 && importState !== 'done' && (
        <div className="ais-preview" style={{ padding: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f2f4f4', paddingBottom: '14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#1a3a28' }}>
              📋 Xem trước gói nhập
            </span>
            <span className="ais-preview-meta" style={{ fontSize: '0.8rem' }}>
              Nguồn: <code>{pkg.source || 'montessori-ai-content-studio'}</code> · Phiên bản: <code>{pkg.packageSchemaVersion}</code>
            </span>
          </div>

          {/* Validation Metrics dashboard */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div className="ais-summary-card">
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2c3e50' }}>{totalItemsCount}</div>
              <div style={{ fontSize: '0.74rem', color: '#7f8c8d', marginTop: '2px' }}>Tổng số bài</div>
            </div>
            <div className="ais-summary-card" style={{ borderLeft: '3px solid #27ae60' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#27ae60' }}>{totalReadyCount}</div>
              <div style={{ fontSize: '0.74rem', color: '#27ae60', marginTop: '2px' }}>Sẵn sàng nhập</div>
            </div>
            <div className="ais-summary-card" style={{ borderLeft: '3px solid #d35400' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d35400' }}>{totalDuplicatesCount}</div>
              <div style={{ fontSize: '0.74rem', color: '#d35400', marginTop: '2px' }}>Trùng lặp (Bỏ qua)</div>
            </div>
            <div className="ais-summary-card" style={{ borderLeft: '3px solid #c0392b' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#c0392b' }}>{totalErrorsCount}</div>
              <div style={{ fontSize: '0.74rem', color: '#c0392b', marginTop: '2px' }}>Lỗi cấu trúc</div>
            </div>
          </div>

          {checkingDuplicates && (
            <div style={{ textAlign: 'center', padding: '10px', color: '#d35400', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ⏳ Đang đối chiếu các bài viết đã có trên cơ sở dữ liệu...
            </div>
          )}

          {/* Items Accordion list */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', color: '#34495e', marginBottom: '10px', fontWeight: 'bold' }}>Danh sách bài viết trong gói:</h3>
            <div className="ais-item-list">
              {pkg.items.slice(0, showAllItems ? pkg.items.length : 20).map((valItem, idx) => (
                <ItemPreviewCard
                  key={idx}
                  index={idx + 1}
                  itemVal={valItem}
                  isDuplicate={duplicateMap[valItem.item.sourceDraftId] === true}
                  duplicateChecking={checkingDuplicates}
                />
              ))}
            </div>
            {!showAllItems && pkg.items.length > 20 && (
              <div style={{ textAlign: 'center', marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '10px', border: '1px dashed #d5dbdb' }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#7f8c8d' }}>
                  Còn {pkg.items.length - 20} bài viết khác chưa hiển thị.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllItems(true)}
                  style={{
                    background: '#2f6b4f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#27563f'}
                  onMouseOut={(e) => e.target.style.background = '#2f6b4f'}
                >
                  Hiển thị tất cả ({pkg.items.length} bài)
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {importState === 'idle' && (
            <div>
              {hasHardErrors && (
                <div style={{
                  background: '#fdecea',
                  border: '1.5px solid #f5b7b1',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  color: '#c0392b',
                  fontSize: '0.88rem',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>
                  ⚠️ <strong>Không thể nhập gói này:</strong> Phát hiện lỗi nghiêm trọng (Hard error) trong gói. Admin cần sửa hết các lỗi cấu trúc được đánh dấu màu đỏ dưới đây trước khi thực hiện Nhập.
                </div>
              )}
              <button
                className="ais-import-btn"
                disabled={!canImport}
                onClick={() => setImportState('confirming')}
                style={{
                  background: canImport ? '#2f6b4f' : '#bdc3c7',
                  cursor: canImport ? 'pointer' : 'not-allowed'
                }}
              >
                Import {totalReadyCount} bài viết hợp lệ vào hàng chờ duyệt
              </button>
            </div>
          )}

          {/* Confirm overlay dialog */}
          {importState === 'confirming' && (
            <div className="ais-confirm-box" style={{ background: '#fef9e7', border: '1.5px solid #f39c12' }}>
              <p className="ais-confirm-text" style={{ color: '#7e5109', fontWeight: '500' }}>
                ⚠️ Xác nhận nhập <strong>{totalReadyCount} bài viết hợp lệ</strong> vào hàng chờ duyệt.
                <br />
                {totalDuplicatesCount > 0 && `(Bỏ qua ${totalDuplicatesCount} bài trùng lặp đã tồn tại. `}
                {totalErrorsCount > 0 && `Bỏ qua ${totalErrorsCount} bài bị lỗi cấu trúc). `}
                Các bài viết này chỉ nằm trong hàng chờ và chưa được đăng công khai lên cộng đồng. Bạn có muốn tiếp tục?
              </p>
              <div className="ais-confirm-btns">
                <button className="ais-btn-cancel" onClick={() => setImportState('idle')}>
                  Huỷ
                </button>
                <button className="ais-btn-confirm" style={{ background: '#2f6b4f' }} onClick={handleImportConfirm}>
                  Xác nhận Import
                </button>
              </div>
            </div>
          )}

          {importState === 'importing' && (
            <div className="ais-importing">⏳ Đang thực hiện nhập dữ liệu...</div>
          )}
        </div>
      )}

      {/* ── Done state & Import Results Summary ── */}
      {importState === 'done' && importResult && (
        <div className="ais-result" style={{ padding: '24px' }}>
          <div className="ais-result-title" style={{ fontSize: '1.15rem', color: '#2f6b4f' }}>
            🎉 Đã nhập dữ liệu xong
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="ais-summary-card" style={{ background: '#f0faf4', border: '1px solid #b0dcc0' }}>
              <strong style={{ fontSize: '1.2rem', color: '#27ae60' }}>{importResult.imported.length}</strong>
              <div style={{ fontSize: '0.74rem', color: '#27ae60', marginTop: '2px' }}>Đã nhập thành công</div>
            </div>
            <div className="ais-summary-card" style={{ background: '#fffbeb', border: '1px solid #e0c84a' }}>
              <strong style={{ fontSize: '1.2rem', color: '#d35400' }}>{importResult.skipped.length}</strong>
              <div style={{ fontSize: '0.74rem', color: '#d35400', marginTop: '2px' }}>Trùng lặp (Bỏ qua)</div>
            </div>
            <div className="ais-summary-card" style={{ background: '#fff5f5', border: '1px solid #f0a0a0' }}>
              <strong style={{ fontSize: '1.2rem', color: '#c0392b' }}>{importResult.errors.length}</strong>
              <div style={{ fontSize: '0.74rem', color: '#c0392b', marginTop: '2px' }}>Bị lỗi thất bại</div>
            </div>
          </div>

          {importResult.imported.length > 0 && (
            <div className="ais-result-section ais-result--success" style={{ padding: '12px 16px' }}>
              <strong>Danh sách bài đăng nhập thành công vào hàng chờ duyệt:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {importResult.imported.map((title, i) => <li key={i}>{title}</li>)}
              </ul>
            </div>
          )}

          {importResult.skipped.length > 0 && (
            <div className="ais-result-section ais-result--warn" style={{ padding: '12px 16px' }}>
              <strong>Danh sách bài đăng bị bỏ qua (đã tồn tại):</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {importResult.skipped.map((s, i) => <li key={i}>{s.title}</li>)}
              </ul>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="ais-result-section ais-result--error" style={{ padding: '12px 16px' }}>
              <strong>Danh sách bài đăng gặp lỗi:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {importResult.errors.map((e, i) => <li key={i}>{e.title} — {e.reason}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="ais-btn-reset"
              onClick={() => {
                setPkg(null); setFileName(''); setValidationErrors([]);
                setImportState('idle'); setImportResult(null);
              }}
              style={{ margin: 0 }}
            >
              Nhập gói khác
            </button>
            
            {setActiveTab && (
              <button
                type="button"
                className="ais-btn-confirm"
                onClick={() => setActiveTab('admin-review')}
                style={{
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                Mở Hàng chờ duyệt →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Import History section (LocalStorage-based) ── */}
      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1.5px solid #ebedef' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1a3a28', margin: 0 }}>
            🗂️ Lịch sử nhập gói cục bộ
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: 'none',
                border: 'none',
                color: '#c0392b',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Xóa lịch sử cục bộ
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#7f8c8d', margin: '0 0 16px 0', lineHeight: '1.4' }}>
          Lịch sử này chỉ lưu cục bộ trên trình duyệt admin hiện tại. Nếu xóa cache hoặc đổi trình duyệt/thiết bị khác, lịch sử này sẽ mất.
        </p>
        
        {history.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#7f8c8d', fontStyle: 'italic', margin: 0 }}>
            Chưa có đợt nhập gói nào được ghi lại trên trình duyệt này.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.slice(0, 5).map((h, idx) => (
              <div key={h.batchId} style={{
                background: '#fff',
                border: '1px solid #e2e4e6',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#556'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
                  <span>📦 {h.fileName}</span>
                  <span style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>
                    {new Date(h.importedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', color: '#7f8c8d', fontSize: '0.78rem' }}>
                  <span>Tài khoản: <code>{h.adminEmail}</code></span>
                  <span>Tổng số: <b>{h.itemCount}</b> | Nhập: <b style={{ color: '#27ae60' }}>{h.importedCount}</b> | Trùng: <b style={{ color: '#d35400' }}>{h.skippedDuplicateCount}</b> | Lỗi: <b style={{ color: '#c0392b' }}>{h.failedCount}</b></span>
                </div>
              </div>
            ))}
            {history.length > 5 && (
              <p style={{ fontSize: '0.76rem', color: '#7f8c8d', margin: '4px 0 0', fontStyle: 'italic', textAlign: 'center' }}>
                * Chỉ hiển thị 5 đợt import gần nhất (Tổng lịch sử lưu trữ: {history.length}/20).
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
