/**
 * rules-static-analysis.mjs  (v4 — Phase 2B + 2C.1 + 2C.2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Static analysis of Firestore Rules — Phase 2B + 2C.1 + 2C.2 security checks.
 * Runs WITHOUT Firebase Emulator or Java.
 *
 * Run:  node rules-static-analysis.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dir, '..', 'firestore.rules');

const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m';
const RESET = '\x1b[0m'; const BOLD = '\x1b[1m'; const DIM = '\x1b[2m';

let passed = 0; let failed = 0; const failures = [];

function check(name, ok, detail = '') {
  if (ok) { console.log(`  ${G}✓${RESET} ${name}`); passed++; }
  else {
    console.log(`  ${R}✗${RESET} ${name}`);
    if (detail) console.log(`    ${DIM}→ ${detail}${RESET}`);
    failed++; failures.push({ name, detail });
  }
}

const raw   = readFileSync(RULES_PATH, 'utf8');
const lines = raw.split('\n');

function slice(startMarker, endMarker) {
  const s = lines.findIndex(l => l.includes(startMarker));
  if (s === -1) return '';
  const e = lines.findIndex((l, i) => i > s && l.includes(endMarker));
  return lines.slice(s, e === -1 ? lines.length : e + 1).join('\n');
}

const has = (s) => raw.includes(s);

const usersSection = slice('match /users/{userId}',               'match /blockedUsers');
const queueSection = slice('match /aiContentReviewQueue/{itemId}', 'CATCH-ALL');
const chatSection  = slice('match /chatRooms/{roomId}',            '// CUSTOM ROOMS');
const publishSection = slice('// PUBLISH LOGIC',                   '// AI POST LOGIC');
const updateBlock  = slice('Admins can update review metadata',    'Hard deletes allowed');

console.log(`\n${BOLD}Montessori AI — Firestore Rules Static Analysis v4 (Phase 2B + 2C.1 + 2C.2)${RESET}`);
console.log(`${DIM}File: ${RULES_PATH}${RESET}`);
console.log(`${Y}ℹ  Static mode — no Java/emulator required.${RESET}`);
console.log(`${DIM}   Full integration tests: install Java then run: npm test${RESET}\n`);

// ── A: users/{uid} Role Escalation ────────────────────────────────────────
console.log(`${BOLD}Section A: users/{uid} — Role Escalation Prevention${RESET}`);

check('A1: No bare "allow write" in users/{uid} block',
  !usersSection.match(/allow\s+write\s*:/),
  '"allow write:" found — must be split into create/update/delete');

check('A2: users block has "allow create" rule',
  usersSection.includes('allow create'));

check('A3: "role" blocked on create (.keys().hasAny)',
  usersSection.includes("keys().hasAny") && usersSection.includes("'role'"));

check('A4: "role" blocked on update (keys().hasAny or affectedKeys().hasAny)',
  (usersSection.includes('keys().hasAny') || usersSection.includes('affectedKeys().hasAny'))
  && usersSection.includes("'role'"));

const adminFields = ['isAdmin', 'admin', 'claims', 'permissions', 'plan', 'subscription'];
const missingFields = adminFields.filter(f => !usersSection.includes(`'${f}'`));
check(`A5: All admin-like fields blocked (${adminFields.join(', ')})`,
  missingFields.length === 0,
  `Missing: ${missingFields.join(', ')}`);

// ── B: aiContentReviewQueue Access Control (Phase 2B) ─────────────────────
console.log(`\n${BOLD}Section B: aiContentReviewQueue — Access Control (Phase 2B)${RESET}`);

check('B6/B7: queue read gated by isAdmin()',
  queueSection.includes('allow read') && queueSection.includes('isAdmin()'));

check('B8: queue write NOT accessible without isAdmin()',
  !queueSection.match(/allow\s+(write|create|update|delete)\s*:(?!\s*if\s+isAdmin)/));

check('B9: Admin can read queue',
  /allow\s+read\s*:\s*if\s+isAdmin\(\)/.test(queueSection));

check('B10: Admin can create queue item',
  /allow\s+create\s*:\s*if\s+isAdmin\(\)/.test(queueSection));

check('B11: reviewStatus == "pending_review" enforced on create',
  queueSection.includes("reviewStatus  == 'pending_review'") ||
  queueSection.includes("reviewStatus == 'pending_review'"),
  'reviewStatus = pending_review create constraint missing');

check('B12: importedByUid == request.auth.uid enforced',
  queueSection.includes('importedByUid == request.auth.uid'));

check('B13: authorType == "ai_assistant" enforced',
  queueSection.includes("authorType    == 'ai_assistant'") ||
  queueSection.includes("authorType == 'ai_assistant'"),
  'authorType = ai_assistant create constraint missing');

check("B14: isAdmin() reads users/{uid}.role from Firestore",
  raw.includes("data.role == 'admin'") && raw.includes('function isAdmin()'));

// ── C: Import Isolation ────────────────────────────────────────────────────
console.log(`\n${BOLD}Section C: Import Isolation from Public Collections${RESET}`);

check('C14a: chatRooms write requires .text field',
  raw.includes('request.resource.data.text is string'));

check('C14b: chatRooms write requires senderId == auth.uid',
  raw.includes('request.resource.data.senderId == request.auth.uid'));

check('C14c: Catch-all deny rule present',
  raw.includes('allow read, write: if false'));

check('C14d: No cross-reference: aiContentReviewQueue in chatRooms',
  !chatSection.includes('aiContentReviewQueue'));

// ── D: aiContentReviewQueue Update Rule (Phase 2C.1 + 2C.2) ─────────────────
console.log(`\n${BOLD}Section D: aiContentReviewQueue — Update Rule (Phase 2C.1 + 2C.2)${RESET}`);

check('D1: Update rule gated by isAdmin()',
  /allow\s+update\s*:\s*if\s+isAdmin\(\)/.test(queueSection));

const allowedReviewFields = ['reviewStatus', 'reviewedAt', 'reviewedByUid', 'reviewNotes', 'updatedAt'];
const missingReviewFields = allowedReviewFields.filter(f => !queueSection.includes(`'${f}'`));
check(`D2: Update allowlist has required review metadata fields`,
  missingReviewFields.length === 0,
  `Missing: ${missingReviewFields.join(', ')}`);

const allowedPublishFields = ['publishStatus', 'publishedAt', 'publishedByUid', 'publishedPostId'];
const missingPublishFields = allowedPublishFields.filter(f => !queueSection.includes(`'${f}'`));
check(`D2b: Update allowlist has required publish fields (Phase 2C.2)`,
  missingPublishFields.length === 0,
  `Missing: ${missingPublishFields.join(', ')}`);

check("D3: reviewStatus enum includes 'approved_for_publish'",
  queueSection.includes("'approved_for_publish'"));

check("D4: reviewStatus enum includes 'needs_edit'",
  queueSection.includes("'needs_edit'"));

check("D5: reviewStatus enum includes 'rejected'",
  queueSection.includes("'rejected'"));

check('D6: reviewStatus uses "in [...]" enum validation',
  queueSection.includes('reviewStatus in ['));

check('D7: Immutable "importedByUid" NOT in update allowlist',
  !updateBlock.includes("'importedByUid'"));

check('D8: Immutable "importedAt" NOT in update allowlist',
  !updateBlock.includes("'importedAt'"));

check('D9: Immutable "authorType" NOT in update allowlist',
  !updateBlock.includes("'authorType'"));

check('D10: reviewedByUid ownership enforced (== request.auth.uid)',
  queueSection.includes('reviewedByUid == request.auth.uid'));

check('D11: publishStatus enum validated (published|unpublished)',
  queueSection.includes("publishStatus in ['published', 'unpublished']"));

check('D12: publishedByUid ownership enforced (== request.auth.uid)',
  queueSection.includes('publishedByUid == request.auth.uid'));

check('D13: publishedPostId is string when set',
  queueSection.includes('publishedPostId is string'));

check("D14: Update allowlist has imageUrl field (Phase 2C.3B)",
  queueSection.includes("'imageUrl'"));

check("D15: imageUrl validated using matches('^https://.*')",
  queueSection.includes("imageUrl.matches('^https://.*')"));

check("D16: imageUrl validated for empty string (== '')",
  queueSection.includes('imageUrl == ""') || queueSection.includes("imageUrl == ''"));

check("D17: imageUrl matches hasAny(['imageUrl']) check",
  queueSection.includes("affectedKeys().hasAny(['imageUrl'])"));

// ── E: Publish Action — chatRooms AI Post Rule (Phase 2C.2) ──────────────
console.log(`\n${BOLD}Section E: chatRooms — AI Post Publish Rule (Phase 2C.2)${RESET}`);

check('E1: Admin AI post rule exists in chatRooms (isAdmin() + authorType)',
  chatSection.includes('isAdmin()') && chatSection.includes("authorType     == 'ai_assistant'"));

check('E2: Room whitelist enforced for AI posts (roomId in [...])',
  chatSection.includes("roomId in ['pregnancy', 'weaning', 'sleep', 'health', 'family']"));

check('E3: AI post senderId must == request.auth.uid',
  chatSection.includes('request.resource.data.senderId       == request.auth.uid'));

check('E4: AI post text.size() <= 5000 (higher limit than user posts)',
  chatSection.includes('text.size()    <= 5000'));

check('E5: AI post text.size() > 0 (non-empty)',
  chatSection.includes('text.size()    >  0'));

check('E6: AI post requires sourceQueueId is string (traceability)',
  chatSection.includes('sourceQueueId  is string'));

check('E7: AI post requires transparencyLabel is string',
  chatSection.includes('transparencyLabel is string'));

check('E8: AI post requires likes == 0 (no initial faking)',
  chatSection.includes('likes          == 0'));

check('E9: AI post requires replies == 0',
  chatSection.includes('replies        == 0'));

check('E10: Regular user post blocked if authorType present (! in check)',
  chatSection.includes("!('authorType' in request.resource.data)"));

check('E10b: Regular user post text still limited to 2000',
  chatSection.includes('text.size() <= 2000'));

check("E11: chatRooms AI post images size limited to <= 1",
  chatSection.includes("images.size()  <= 1") || chatSection.includes("images.size() <= 1"));

check("E12: chatRooms AI post images[0] requires matches('^https://.*')",
  chatSection.includes("images[0].matches('^https://.*')"));

// ── S: Structural Integrity ────────────────────────────────────────────────
console.log(`\n${BOLD}Bonus: Structural Integrity${RESET}`);

check("S1: rules_version = '2'", has("rules_version = '2'"));
check('S2: isAdmin() defined',    has('function isAdmin()'));
check('S3: isSignedIn() defined', has('function isSignedIn()'));
check('S4: No open rules (if true)', !raw.includes('if true'));
check('S5: aiContentReviewQueue collection exists', has('aiContentReviewQueue'));

// ── Summary ────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log('\n' + '─'.repeat(62));
console.log(`${BOLD}Results: ${G}${passed}/${total} passed${RESET}${failed > 0 ? `  ${R}${failed} failed${RESET}` : ''}`);
if (failures.length > 0) {
  console.log(`\n${R}${BOLD}Failed:${RESET}`);
  failures.forEach(f => {
    console.log(`  ${R}✗ ${f.name}${RESET}`);
    if (f.detail) console.log(`    ${DIM}${f.detail}${RESET}`);
  });
}
if (failed === 0) {
  console.log(`\n${G}${BOLD}✅ All static checks PASSED.${RESET}`);
  console.log(`${DIM}   Install Java for full emulator runtime tests.${RESET}`);
}
console.log('─'.repeat(62) + '\n');
process.exit(failed > 0 ? 1 : 0);
