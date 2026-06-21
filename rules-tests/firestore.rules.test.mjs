/**
 * firestore.rules.test.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Firestore Security Rules Unit Tests for Montessori AI — Phase 2B
 *
 * Prerequisites:
 *   1. Firebase Emulator running:
 *      npx firebase-tools emulators:start --only firestore
 *   2. Install deps:
 *      cd rules-tests && npm install
 *   3. Run tests:
 *      cd rules-tests && npm test
 *
 * Coverage (14 test cases required by Phase 2B spec):
 *
 * A. users/{uid} role escalation (tests 1-5)
 * B. aiContentReviewQueue (tests 6-13)
 * C. public community collections (test 14)
 *
 * Framework: @firebase/rules-unit-testing v3 (ESM, no Jest required)
 * ────────────────────────────────────────────────────────────────────────────
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  doc, setDoc, updateDoc, getDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '..', 'firestore.rules');
const PROJECT_ID = 'montessori-rules-test';

// ── Colour helpers for terminal output ────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0;
let failed = 0;
const failures = [];

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ${RED}✗${RESET} ${name}`);
    console.log(`    ${RED}${err.message || err}${RESET}`);
    failed++;
    failures.push({ name, error: err.message || String(err) });
  }
}

// ── Test data helpers ─────────────────────────────────────────────────────
const NORMAL_USER_UID   = 'user-normal-001';
const ADMIN_USER_UID    = 'user-admin-001';
const OTHER_USER_UID    = 'user-other-002';

/** Valid aiContentReviewQueue item */
function validQueueItem(importerUid) {
  return {
    sourcePackageId:    'pkg_test_001',
    sourceDraftId:      'draft-abc-123',
    source:             'montessori-ai-content-studio',
    sourceExportedAt:   '2026-06-20T10:00:00Z',
    title:              'Hoạt động Montessori cho bé 6 tháng',
    summary:            'Tóm tắt hoạt động giáo dục sớm',
    body:               'Nội dung chi tiết về hoạt động...',
    keyPoints:          ['Điểm 1', 'Điểm 2'],
    todayAction:        'Thực hiện hoạt động giác quan',
    category:           'Phát triển giác quan',
    targetAudience:     'Mẹ có bé 6-12 tháng',
    contentType:        'Bài viết hướng dẫn',
    tags:               ['giác quan', 'sơ sinh'],
    imagePrompt:        null,
    imageStyle:         null,
    imageUrl:           null,
    authorType:         'ai_assistant',
    authorName:         'Trợ lý Montessori',
    transparencyLabel:  'Bài viết được tạo bởi AI Montessori',
    sourceModel:        'gemini-2.0-flash',
    safetyNotes:        null,
    communityPostSuggestion: null,
    reviewStatus:       'pending_review',
    importedAt:         serverTimestamp(),
    importedByUid:      importerUid,
  };
}

// ── Main test runner ──────────────────────────────────────────────────────
async function main() {
  console.log(`\n${BOLD}Montessori AI — Firestore Rules Tests (Phase 2B)${RESET}`);
  console.log(`Rules file: ${RULES_PATH}\n`);

  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  } catch (err) {
    console.error(`${RED}✗ Cannot connect to Firestore Emulator at localhost:8080${RESET}`);
    console.error(`${YELLOW}  → Start emulator first:${RESET} npx firebase-tools emulators:start --only firestore`);
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }

  // ── Helpers to get authenticated/unauthenticated Firestore handles ──────
  const unauthDb = testEnv.unauthenticatedContext().firestore();

  const normalUserDb = testEnv
    .authenticatedContext(NORMAL_USER_UID, { email: 'normal@test.com' })
    .firestore();

  // Admin user has role: 'admin' in their Firestore document
  const adminUserDb = testEnv
    .authenticatedContext(ADMIN_USER_UID, { email: 'admin@test.com' })
    .firestore();

  // Seed: create admin user document with role: 'admin' via withSecurityRulesDisabled
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ADMIN_USER_UID), {
      momName: 'Admin',
      status: 'born',
      role: 'admin',
    });
    // Normal user has no role field
    await setDoc(doc(db, 'users', NORMAL_USER_UID), {
      momName: 'Bình thường',
      status: 'pregnant',
    });
    await setDoc(doc(db, 'users', OTHER_USER_UID), {
      momName: 'Khác',
      status: 'born',
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION A: users/{uid} — Role escalation prevention
  // ══════════════════════════════════════════════════════════════════════
  console.log(`${BOLD}Section A: users/{uid} — Role Escalation${RESET}`);

  await it('A1: Unauthenticated user cannot write to users/{uid}', async () => {
    await assertFails(
      setDoc(doc(unauthDb, 'users', 'any-uid'), { momName: 'Hack' })
    );
  });

  await it('A2: Normal user can update safe profile fields', async () => {
    await assertSucceeds(
      updateDoc(doc(normalUserDb, 'users', NORMAL_USER_UID), {
        momName: 'Cập nhật tên',
        status:  'pregnant',
        weeksPregnant: 20,
      })
    );
  });

  await it('A3: Normal user CANNOT create profile with "role" field', async () => {
    await assertFails(
      setDoc(doc(normalUserDb, 'users', NORMAL_USER_UID), {
        momName: 'Hack',
        role:    'admin',   // 🔒 must be rejected
      })
    );
  });

  await it('A4: Normal user CANNOT update users/{uid}.role', async () => {
    await assertFails(
      updateDoc(doc(normalUserDb, 'users', NORMAL_USER_UID), {
        role: 'admin',      // 🔒 must be rejected
      })
    );
  });

  await it('A5: Normal user CANNOT set any admin-like field (isAdmin, admin, claims, permissions, plan, subscription)', async () => {
    const adminLikeFields = [
      { isAdmin: true },
      { admin: true },
      { claims: { admin: true } },
      { permissions: ['admin'] },
      { plan: 'enterprise' },
      { subscription: 'premium_admin' },
    ];
    for (const field of adminLikeFields) {
      await assertFails(
        updateDoc(doc(normalUserDb, 'users', NORMAL_USER_UID), field),
        // Each one must fail
      );
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION B: aiContentReviewQueue — Admin-only access
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}Section B: aiContentReviewQueue — Access Control${RESET}`);

  await it('B6: Unauthenticated user cannot read aiContentReviewQueue', async () => {
    await assertFails(
      getDoc(doc(unauthDb, 'aiContentReviewQueue', 'any-item'))
    );
  });

  await it('B7: Normal user cannot read aiContentReviewQueue', async () => {
    await assertFails(
      getDoc(doc(normalUserDb, 'aiContentReviewQueue', 'any-item'))
    );
  });

  await it('B8: Normal user cannot write to aiContentReviewQueue', async () => {
    await assertFails(
      setDoc(
        doc(normalUserDb, 'aiContentReviewQueue', 'hack-item'),
        validQueueItem(NORMAL_USER_UID),
      )
    );
  });

  await it('B9: Admin can read from aiContentReviewQueue', async () => {
    // Seed a document first via rules-disabled context
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), 'aiContentReviewQueue', 'seeded-item-001'),
        validQueueItem(ADMIN_USER_UID),
      );
    });
    await assertSucceeds(
      getDoc(doc(adminUserDb, 'aiContentReviewQueue', 'seeded-item-001'))
    );
  });

  await it('B10: Admin can write a valid item (reviewStatus: pending_review)', async () => {
    await assertSucceeds(
      setDoc(
        doc(adminUserDb, 'aiContentReviewQueue', 'admin-import-001'),
        validQueueItem(ADMIN_USER_UID),
      )
    );
  });

  await it('B11: Admin CANNOT write item with reviewStatus != "pending_review"', async () => {
    const invalidItem = { ...validQueueItem(ADMIN_USER_UID), reviewStatus: 'published' };
    await assertFails(
      setDoc(
        doc(adminUserDb, 'aiContentReviewQueue', 'bad-status-item'),
        invalidItem,
      )
    );
  });

  await it('B12: Admin CANNOT write item with importedByUid != own uid', async () => {
    const spoofedItem = { ...validQueueItem(NORMAL_USER_UID) };
    // importedByUid is NORMAL_USER_UID but auth is ADMIN_USER_UID → must fail
    await assertFails(
      setDoc(
        doc(adminUserDb, 'aiContentReviewQueue', 'spoofed-uid-item'),
        spoofedItem,
      )
    );
  });

  await it('B13: Admin CANNOT write item with authorType != "ai_assistant"', async () => {
    const wrongAuthor = { ...validQueueItem(ADMIN_USER_UID), authorType: 'human' };
    await assertFails(
      setDoc(
        doc(adminUserDb, 'aiContentReviewQueue', 'wrong-author-item'),
        wrongAuthor,
      )
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION C: Import does NOT create public community posts
  // ══════════════════════════════════════════════════════════════════════
  console.log(`\n${BOLD}Section C: Import does NOT touch public community collections${RESET}`);

  await it('C14: Admin import does NOT create docs in chatRooms (public community)', async () => {
    // Simulate what an import would do if it accidentally wrote to chatRooms
    // chatRooms/{roomId}/messages/{msgId} requires senderId == auth.uid + text field
    // But the import schema uses 'body', 'title' — not 'senderId'/'text', so it would fail anyway.
    // This test confirms the rule itself blocks any non-message write.
    await assertFails(
      setDoc(
        doc(adminUserDb, 'chatRooms', 'goc-me-bau', 'messages', 'import-msg-001'),
        // Missing required 'text' and 'senderId' — rule will reject
        { title: 'Bài import', body: 'Nội dung import', importedByUid: ADMIN_USER_UID }
      )
    );
  });

  // ── Cleanup & summary ─────────────────────────────────────────────────
  await testEnv.cleanup();

  console.log('\n' + '─'.repeat(56));
  console.log(`${BOLD}Results:${RESET} ${GREEN}${passed} passed${RESET}  ${failed > 0 ? RED : ''}${failed} failed${RESET}`);
  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}Failed tests:${RESET}`);
    failures.forEach(f => console.log(`  ${RED}✗ ${f.name}${RESET}\n    ${f.error}`));
  }
  console.log('─'.repeat(56) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Unexpected error: ${err.message}${RESET}`);
  process.exit(1);
});
