# Firestore Rules Tests — Montessori AI Phase 2B

Unit tests for Firestore Security Rules using `@firebase/rules-unit-testing` v3.

## Prerequisites

1. **Install Firebase Emulator** (one-time):
   ```bash
   npx firebase-tools emulators:start --only firestore
   ```

2. **Install test dependencies** (one-time):
   ```bash
   cd rules-tests
   npm install
   ```

## Running Tests

```bash
# Terminal 1 — start emulator (from project root)
npx firebase-tools emulators:start --only firestore

# Terminal 2 — run tests
cd rules-tests
npm test
```

## Test Coverage (14 cases)

### A. users/{uid} — Role Escalation Prevention
| # | Test |
|---|------|
| A1 | Unauthenticated user cannot write `users/{uid}` |
| A2 | Normal user can update safe profile fields |
| A3 | Normal user **cannot** create profile with `role` field |
| A4 | Normal user **cannot** update `role` to `admin` |
| A5 | Normal user **cannot** set any admin-like field (`isAdmin`, `admin`, `claims`, `permissions`, `plan`, `subscription`) |

### B. aiContentReviewQueue — Admin-only Access
| # | Test |
|---|------|
| B6 | Unauthenticated user cannot read queue |
| B7 | Normal user cannot read queue |
| B8 | Normal user cannot write to queue |
| B9 | Admin can read queue items |
| B10 | Admin can write valid item (`reviewStatus: pending_review`) |
| B11 | Admin **cannot** write with `reviewStatus != 'pending_review'` |
| B12 | Admin **cannot** write with `importedByUid` spoofed to another user |
| B13 | Admin **cannot** write with `authorType != 'ai_assistant'` |

### C. Public Community Isolation
| # | Test |
|---|------|
| C14 | Import flow does NOT create docs in `chatRooms` (public community) |

## Admin Setup

Admin users must have `role: 'admin'` set via **Firebase Admin SDK** (server-side only).
Regular users **cannot** set this field via client SDK — enforced by Firestore Rules.

```bash
# Set admin role via Firebase Admin SDK (Node.js example)
const admin = require('firebase-admin');
await admin.firestore().doc(`users/${uid}`).update({ role: 'admin' });
```
