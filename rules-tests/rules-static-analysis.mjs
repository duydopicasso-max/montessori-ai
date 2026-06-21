/**
 * rules-static-analysis.mjs  (v2 — line-range based)
 * ─────────────────────────────────────────────────────────────────────────────
 * Static analysis of Firestore Rules — Phase 2B security checks.
 * Runs WITHOUT Firebase Emulator or Java.
 *
 * Strategy: instead of block-extraction (fragile), search within line ranges
 * anchored by known markers in the file.
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

// ── Load rules as both full text and line array ───────────────────────────
const raw   = readFileSync(RULES_PATH, 'utf8');
const lines = raw.split('\n');

/** Lines [startMarker … endMarker) as a single string */
function slice(startMarker, endMarker) {
  const s = lines.findIndex(l => l.includes(startMarker));
  if (s === -1) return '';
  // Find the NEXT occurrence of endMarker after s
  const e = lines.findIndex((l, i) => i > s && l.includes(endMarker));
  return lines.slice(s, e === -1 ? lines.length : e + 1).join('\n');
}

/** Does the full rules text contain s? */
const has = (s) => raw.includes(s);

// ── Build scoped sections by line ranges ─────────────────────────────────
const usersSection  = slice('match /users/{userId}',              'match /blockedUsers');
const queueSection  = slice('match /aiContentReviewQueue/{itemId}', 'CATCH-ALL');
const chatSection   = slice('match /chatRooms/{roomId}',           '// CUSTOM ROOMS');
const isAdminFn     = slice('function isAdmin()',                   'function isOwner') ||
                      slice('function isAdmin()',                   '// PUBLIC');

console.log(`\n${BOLD}Montessori AI — Firestore Rules Static Analysis v2 (Phase 2B)${RESET}`);
console.log(`${DIM}File: ${RULES_PATH}${RESET}`);
console.log(`${Y}ℹ  Static mode — no Java/emulator required.${RESET}`);
console.log(`${DIM}   Full integration tests: install Java then run: npm test${RESET}\n`);

// ═════════════════════════════════════════════════════════════════════════════
// A — users/{uid} Role Escalation Prevention
// ═════════════════════════════════════════════════════════════════════════════
console.log(`${BOLD}Section A: users/{uid} — Role Escalation Prevention${RESET}`);

check('A1: No bare "allow write" in users/{uid} block',
  !usersSection.match(/allow\s+write\s*:/),
  '"allow write:" found — must be split into create/update/delete');

check('A2: users block has "allow create" rule',
  usersSection.includes('allow create'),
  '"allow create" not found in users block');

check('A3: "role" blocked on create (.keys().hasAny)',
  usersSection.includes("keys().hasAny") && usersSection.includes("'role'"),
  'Protected fields blocklist (.keys().hasAny) not found on create');

check('A4: "role" blocked on update (.affectedKeys().hasAny)',
  usersSection.includes('affectedKeys().hasAny') && usersSection.includes("'role'"),
  '"role" not in affectedKeys().hasAny blocklist');

const adminFields = ['isAdmin', 'admin', 'claims', 'permissions', 'plan', 'subscription'];
const missingFields = adminFields.filter(f => !usersSection.includes(`'${f}'`));
check(`A5: All admin-like fields blocked in users (${adminFields.join(', ')})`,
  missingFields.length === 0,
  `Missing: ${missingFields.join(', ')}`);

// ═════════════════════════════════════════════════════════════════════════════
// B — aiContentReviewQueue
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}Section B: aiContentReviewQueue — Access Control${RESET}`);

check('B6/B7: queue read gated by isAdmin()',
  queueSection.includes('allow read') && queueSection.includes('isAdmin()'),
  '"allow read … isAdmin()" not found in queue block');

check('B8: queue write NOT accessible without isAdmin()',
  !queueSection.match(/allow\s+(write|create|update|delete)\s*:(?!\s*if\s+isAdmin)/),
  'Found write rule without isAdmin() gate');

check('B9: Admin can read queue (allow read: if isAdmin())',
  /allow\s+read\s*:\s*if\s+isAdmin\(\)/.test(queueSection),
  '"allow read: if isAdmin()" not found');

check('B10: Admin can create queue item (allow create: if isAdmin())',
  /allow\s+create\s*:\s*if\s+isAdmin\(\)/.test(queueSection),
  '"allow create: if isAdmin()" not found');

check('B11: reviewStatus == "pending_review" enforced on create',
  queueSection.includes("reviewStatus == 'pending_review'"),
  'reviewStatus constraint missing');

check('B12: importedByUid == request.auth.uid enforced',
  queueSection.includes('importedByUid == request.auth.uid'),
  'importedByUid ownership check missing');

check('B13: authorType == "ai_assistant" enforced',
  queueSection.includes("authorType == 'ai_assistant'"),
  'authorType constraint missing');

check('B14: isAdmin() reads users/{uid}.role from Firestore',
  raw.includes("data.role == 'admin'") && raw.includes('function isAdmin()'),
  'isAdmin() function malformed');

// ═════════════════════════════════════════════════════════════════════════════
// C — Import does NOT touch public community collections
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}Section C: Import Isolation from Public Collections${RESET}`);

check('C14a: chatRooms write requires .text field (blocks import schema)',
  raw.includes('request.resource.data.text is string'),
  'chatRooms text constraint not found');

check('C14b: chatRooms write requires senderId == auth.uid',
  raw.includes('request.resource.data.senderId == request.auth.uid'),
  'chatRooms senderId constraint not found');

check('C14c: Catch-all deny rule present',
  raw.includes('allow read, write: if false'),
  'Missing catch-all deny rule');

check('C14d: No cross-reference: aiContentReviewQueue in chatRooms/customRooms',
  !chatSection.includes('aiContentReviewQueue'),
  'Unexpected aiContentReviewQueue reference in public chat section');

// ═════════════════════════════════════════════════════════════════════════════
// S — Structural Integrity
// ═════════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}Bonus: Structural Integrity${RESET}`);

check("S1: rules_version = '2'", has("rules_version = '2'"));
check('S2: isAdmin() defined', has('function isAdmin()'));
check('S3: isSignedIn() defined', has('function isSignedIn()'));
check('S4: No open rules (if true)', !raw.includes('if true'));
check('S5: aiContentReviewQueue collection exists in rules', has('aiContentReviewQueue'));

// ═════════════════════════════════════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════════════════════════════════════
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
