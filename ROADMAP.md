# MyLedger — Product & Security Roadmap

> **Date:** February 21, 2026  
> **Status:** Planning Document — No implementation yet  
> **Author:** Analysis based on full codebase audit

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Critical Bugs to Fix First](#2-critical-bugs-to-fix-first)
3. [Security Roadmap (WebAuthn + Network Security)](#3-security-roadmap)
4. [Product Feature Roadmap (Tags, Config UI)](#4-product-feature-roadmap)
5. [Implementation Phases](#5-implementation-phases)
6. [Technical Decisions & Trade-offs](#6-technical-decisions--trade-offs)

---

## 1. Current State Audit

### What Works
- CSV/Excel upload and parsing (HDFC format)
- Server-side AES-256-GCM encryption of description & reference_number
- Transaction categorization, type detection, tag extraction
- Spending report with charts (Pie, Bar, Line) and filters
- Budget tracking with status cards
- Pagination (50/page) on transaction table
- Fullscreen chart expansion
- Two-page layout (Dashboard + Upload)

### What's Broken or Dead Code
| Issue | File | Severity |
|---|---|---|
| `/api/upload-encrypted` references non-existent DB columns (`encrypted_description`, `encrypted_description_iv`, etc.) — will crash at runtime | `src/app/api/upload-encrypted/route.ts` | **HIGH** — delete this file |
| `/api/transactions-encrypted` references non-existent columns — will crash | `src/app/api/transactions-encrypted/route.ts` | **HIGH** — delete this file |
| `EncryptionKeyManager.tsx` is never rendered anywhere | `src/components/EncryptionKeyManager.tsx` | MEDIUM — dead code |
| `DashboardClient.tsx` is never rendered (replaced by HomeDashboard.tsx) | `src/components/DashboardClient.tsx` | MEDIUM — dead code |
| `PDFUpload.tsx` is a stub with no backend | `src/components/PDFUpload.tsx` | LOW — stub |
| `encryption.ts` (browser-side WebCrypto) is unused | `src/utils/encryption.ts` | MEDIUM — dead code |
| `saveParsedJSON()` writes **plaintext** to `parsed_files/` — defeats encryption | `src/utils/importer.ts` | **HIGH** — security leak |
| Budget status math is wrong — expenses are negative so `remaining = budget - (-spent)` is always inflated | `src/utils/budgetStatus.ts` | **HIGH** — wrong data |
| `isEncrypted()` heuristic (base64 + length > 50) is fragile | `src/app/api/transactions/route.ts` | MEDIUM — could misidentify data |

### Security Vulnerabilities
| Vulnerability | Risk | Location |
|---|---|---|
| **No authentication** — all APIs are publicly accessible | CRITICAL | All API routes |
| **No CSRF protection** — DELETE endpoint callable from any origin | HIGH | `/api/delete-all` |
| **Hardcoded default encryption key** | HIGH | `serverEncryption.ts` line 8 |
| **No `.env` file** — encryption key falls back to insecure default | HIGH | Project root |
| **No file upload limits** — can fill disk | MEDIUM | `/api/upload` |
| **No rate limiting** | MEDIUM | All API routes |
| **Plaintext JSON files** on disk bypass DB encryption | HIGH | `parsed_files/` directory |
| **No HTTPS enforcement** | HIGH | Network layer |

---

## 2. Critical Bugs to Fix First

These should be fixed **before** any new features, regardless of the roadmap phase chosen.

### Bug 1: Budget Status Calculation is Wrong
**File:** `src/utils/budgetStatus.ts`  
**Problem:** `SUM(amount)` returns negative for expenses. `remaining = budget - spent` becomes `budget - (-X) = budget + X`.  
**Fix:** Change to `SUM(ABS(amount))` for expense categories, or `remaining = budget + spent` (since spent is already negative).

### Bug 2: Plaintext JSON Files Leak Encrypted Data
**File:** `src/utils/importer.ts` → `saveParsedJSON()`  
**Problem:** After encrypting data for DB, it writes the original plaintext transactions to `parsed_files/`. Anyone with disk access sees everything.  
**Fix:** Either encrypt the JSON output, or stop writing parsed JSON files, or write them with only non-sensitive fields.

### Bug 3: Dead API Routes Will Crash
**Files:** `src/app/api/upload-encrypted/route.ts`, `src/app/api/transactions-encrypted/route.ts`  
**Problem:** Reference DB columns that don't exist.  
**Fix:** Delete both files. They are artifacts of the previous browser-side encryption approach.

### Bug 4: Clean Up Dead Code
**Files to delete:**
- `src/components/EncryptionKeyManager.tsx`
- `src/components/DashboardClient.tsx`
- `src/utils/encryption.ts`
- `src/app/api/upload-encrypted/route.ts`
- `src/app/api/transactions-encrypted/route.ts`

---

## 3. Security Roadmap

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│                                                     │
│  ┌─────────────┐   ┌────────────────────────────┐  │
│  │  WebAuthn    │   │   Application UI            │  │
│  │  Credential  │   │   (React Components)        │  │
│  │  (Biometric/ │   │                             │  │
│  │   Security   │   │   - Dashboard               │  │
│  │   Key)       │   │   - Upload                  │  │
│  └──────┬───────┘   │   - Settings                │  │
│         │           └─────────────┬───────────────┘  │
│         │                         │                  │
│         └─────────┬───────────────┘                  │
│                   │ HTTPS Only                       │
└───────────────────┼──────────────────────────────────┘
                    │
┌───────────────────┼──────────────────────────────────┐
│                   │  SERVER                          │
│                   ▼                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │  Auth Middleware                              │    │
│  │  - Validate session token                     │    │
│  │  - Rate limiting                              │    │
│  │  - CSRF protection                            │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐    │
│  │  API Routes (all require auth)               │    │
│  │  /api/auth/register, /api/auth/login         │    │
│  │  /api/transactions, /api/upload, etc.        │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐    │
│  │  Encryption Layer (serverEncryption.ts)       │    │
│  │  AES-256-GCM with per-user key               │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐    │
│  │  SQLite Database (myledger.db)                │    │
│  │  All sensitive fields encrypted at rest       │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 3.2 WebAuthn Implementation Plan

#### What is WebAuthn?
WebAuthn allows passwordless login using biometrics (fingerprint, face) or hardware security keys (YubiKey). The private key never leaves the user's device. No passwords to steal.

#### Database Schema Changes

```sql
-- New table: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                  -- UUID
  username TEXT NOT NULL UNIQUE,        -- Display name / identifier
  created_at TEXT NOT NULL,             -- ISO timestamp
  encryption_key TEXT NOT NULL          -- Per-user encryption key (encrypted with master key)
);

-- New table: webauthn_credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,                  -- Credential ID (base64url)
  user_id TEXT NOT NULL,                -- FK to users
  public_key TEXT NOT NULL,             -- COSE public key (base64url)
  counter INTEGER NOT NULL DEFAULT 0,   -- Signature counter (replay protection)
  device_type TEXT,                     -- 'platform' or 'cross-platform'
  backed_up INTEGER DEFAULT 0,          -- Whether credential is backed up
  transports TEXT,                      -- JSON array of transports
  created_at TEXT NOT NULL,             -- ISO timestamp
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- New table: sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                  -- Session token (random 256-bit)
  user_id TEXT NOT NULL,                -- FK to users
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,             -- Session expiry
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Modify transactions table
ALTER TABLE transactions ADD COLUMN user_id TEXT;
-- Modify budgets table
ALTER TABLE budgets ADD COLUMN user_id TEXT;
```

#### WebAuthn Flow

**Registration (First-time setup):**
```
1. User visits /register
2. User enters a username
3. Server generates a challenge (random bytes) → sends to browser
4. Browser calls navigator.credentials.create() with challenge
5. User authenticates with biometric/security key
6. Browser returns attestation object (public key + signed challenge)
7. Server verifies signature, stores public key in webauthn_credentials
8. Server creates user record with generated per-user encryption key
9. Server creates session, returns session cookie (HttpOnly, Secure, SameSite=Strict)
```

**Login:**
```
1. User visits /login
2. User enters username
3. Server generates challenge, sends with credential IDs for that user
4. Browser calls navigator.credentials.get()
5. User authenticates with biometric/security key
6. Browser returns assertion (signed challenge)
7. Server verifies signature against stored public key
8. Server checks counter (must be > stored counter, prevents replay)
9. Server creates session, returns session cookie
```

**Key loss = data loss:** This is by design (user's requirement). No password recovery, no email reset. The private key on their device IS the only way in.

#### Recommended Library
**`@simplewebauthn/server`** + **`@simplewebauthn/browser`**
- Well-maintained, TypeScript, works with Next.js
- Handles all the CBOR/COSE complexity
- ~50KB browser bundle

```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

#### New API Routes Needed

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/register/options` | POST | Generate registration challenge |
| `/api/auth/register/verify` | POST | Verify attestation, create user |
| `/api/auth/login/options` | POST | Generate authentication challenge |
| `/api/auth/login/verify` | POST | Verify assertion, create session |
| `/api/auth/logout` | POST | Destroy session |
| `/api/auth/status` | GET | Check current auth status |

#### New Pages Needed

| Page | Path | Purpose |
|---|---|---|
| Login | `/login` | Username input + WebAuthn prompt |
| Register | `/register` | Username input + WebAuthn credential creation |

#### Session Management
- Session token stored in **HttpOnly, Secure, SameSite=Strict** cookie
- Default expiry: 24 hours (configurable)
- Session validated on every API request via middleware
- Expired sessions automatically cleaned up

### 3.3 Auth Middleware

Create a middleware that wraps all `/api/*` routes (except `/api/auth/*`):

```
src/middleware.ts  →  Next.js middleware
  - Check for session cookie
  - Validate session against DB
  - If invalid → 401 Unauthorized
  - If valid → attach user_id to request
  - Rate limiting: max 100 requests/minute per session
```

### 3.4 Network Security Checklist

| Item | Implementation | Priority |
|---|---|---|
| HTTPS enforcement | Next.js middleware: redirect HTTP → HTTPS | P0 |
| HSTS header | `Strict-Transport-Security: max-age=31536000; includeSubDomains` | P0 |
| Content Security Policy | Restrict script-src, style-src, connect-src | P1 |
| X-Frame-Options | `DENY` (prevent clickjacking) | P1 |
| X-Content-Type-Options | `nosniff` | P1 |
| Referrer-Policy | `strict-origin-when-cross-origin` | P1 |
| CORS | Restrict to same origin only | P0 |
| Cookie security | `HttpOnly; Secure; SameSite=Strict; Path=/` | P0 |
| File upload limit | Max 10MB per file | P1 |
| Rate limiting | 100 req/min per session, 10 uploads/hour | P1 |
| Input sanitization | Validate file types server-side (magic bytes, not just extension) | P1 |

### 3.5 Encryption Improvements

| Item | Current | Proposed |
|---|---|---|
| Encryption key | Hardcoded default fallback | Per-user key derived during registration, stored encrypted with master key |
| Key storage | Env var with insecure default | `.env.local` with strong random key, validated at startup |
| Encrypted fields | description, reference_number | description, reference_number, tags |
| Plaintext JSON files | Written to disk after every upload | Stop writing or encrypt them too |
| `isEncrypted()` heuristic | Fragile regex check | Remove — always encrypt, always decrypt |

---

## 4. Product Feature Roadmap

### 4.1 Configurable Category Rules (UI-based)

**Goal:** Move hardcoded category keywords from code to a database-backed UI.

#### Database Schema

```sql
CREATE TABLE IF NOT EXISTS category_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,         -- e.g., "Food"
  keyword TEXT NOT NULL,          -- e.g., "restaurant"
  match_type TEXT DEFAULT 'contains',  -- 'contains', 'startsWith', 'exact', 'regex'
  priority INTEGER DEFAULT 0,    -- Higher = checked first
  color TEXT,                     -- Hex color for charts
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### UI Design
- New page: `/settings/categories`
- Table showing all category rules with keyword, match type, priority
- Add/edit/delete rules
- Drag-to-reorder priority
- Color picker for each category
- "Import defaults" button to load the current hardcoded rules
- Preview: show sample transactions and how they'd be categorized

#### Processing Flow Change
```
Current:  hardcoded keywords in transactionExtractor.ts
Proposed: load rules from DB → sort by priority → match against description
Fallback: if no rules exist, use built-in defaults (for new users)
```

### 4.2 Configurable Transaction Type Patterns

Same approach as categories:

```sql
CREATE TABLE IF NOT EXISTS type_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type_name TEXT NOT NULL,        -- e.g., "UPI"
  pattern TEXT NOT NULL,          -- e.g., "upi-"
  match_type TEXT DEFAULT 'contains',
  priority INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4.3 Custom Tags (User-defined + Auto-tags)

**Goal:** Let users add custom tags to transactions + configure auto-tag rules.

#### Database Changes

```sql
-- Auto-tag rules (like current hardcoded ones)
CREATE TABLE IF NOT EXISTS tag_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,         -- e.g., "GROWW"
  pattern TEXT NOT NULL,          -- e.g., "groww"
  match_type TEXT DEFAULT 'contains',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Manual tags on individual transactions
CREATE TABLE IF NOT EXISTS transaction_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(transaction_id, tag)
);
```

#### UI Features
- **On each transaction row:** Click to add/remove tags (inline tag editor)
- **Auto-tag rules page:** `/settings/tags` — configure patterns for auto-tagging
- **Tag management:** View all tags, rename, merge, delete
- **Filter by tags:** Already partly works in SpendingReport, just needs to use the new source

### 4.4 Transaction Editing

Allow users to edit individual transactions:

| Feature | API | UI |
|---|---|---|
| Edit category | `PATCH /api/transactions/:id` | Dropdown on transaction row |
| Edit description | `PATCH /api/transactions/:id` | Inline edit |
| Add/remove tags | `POST/DELETE /api/transactions/:id/tags` | Tag chips with X button |
| Split transaction | `POST /api/transactions/:id/split` | Modal to split into 2+ |
| Add notes | `PATCH /api/transactions/:id` | Text field per transaction |

### 4.5 Settings Page

New page: `/settings` with tabs:

| Tab | Content |
|---|---|
| Categories | Category rules table + add/edit/delete |
| Tags | Auto-tag rules + tag management |
| Transaction Types | Type pattern rules |
| Bank Format | Column mapping for different banks (not just HDFC) |
| Security | WebAuthn credential management, add extra keys |
| Data | Export encrypted backup, import backup |

### 4.6 Multi-Bank Support

**Goal:** Support bank statements beyond HDFC.

```sql
CREATE TABLE IF NOT EXISTS bank_formats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,            -- e.g., "HDFC", "SBI", "ICICI"
  date_column TEXT NOT NULL,          -- e.g., "Date"
  description_column TEXT NOT NULL,   -- e.g., "Narration"
  withdrawal_column TEXT,             -- e.g., "Withdrawal Amt."
  deposit_column TEXT,                -- e.g., "Deposit Amt."
  amount_column TEXT,                 -- For banks with single amount column
  reference_column TEXT,              -- e.g., "Chq./Ref.No."
  date_format TEXT DEFAULT 'DD/MM/YY', -- Date parsing format
  skip_rows INTEGER DEFAULT 0,       -- Rows to skip before header
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### UI
- Settings → Bank Format tab
- Create bank format profiles
- When uploading, select which bank format to use (or auto-detect)
- Column mapper: drag-and-drop column assignment

### 4.7 Data Export & Backup

| Feature | Description |
|---|---|
| Export CSV | Download filtered transactions as CSV |
| Export JSON | Download all data as encrypted JSON backup |
| Import backup | Upload encrypted JSON to restore data |

---

## 5. Implementation Phases

### Phase 0: Bug Fixes & Cleanup (1-2 days)
> **Do this first, regardless of which features you pick next.**

- [X] Fix budget status calculation bug
- [X] Delete dead code files (5 files)
- [X] Stop writing plaintext JSON files (or encrypt them)
- [X] Remove `isEncrypted()` heuristic — always decrypt
- [X] Add `.env.local` with strong `ENCRYPTION_KEY`
- [X] Add `.env.local` to `.gitignore`

### Phase 1: WebAuthn Authentication (3-5 days)
> **Must be done before exposing to internet.**

- [X] Install `@simplewebauthn/server` and `@simplewebauthn/browser`
- [X] Create `users`, `webauthn_credentials`, `sessions` tables
- [X] Build registration flow (API + UI)
- [X] Build login flow (API + UI)
- [X] Create auth middleware for all API routes
- [X] Add `user_id` to transactions and budgets tables
- [X] Add session management with cookie-based tokens
- [X] Create login/register pages

### Phase 2: Network Security Hardening (1-2 days)
> **Must be done before exposing to internet.**

- [ ] Add security headers middleware (HSTS, CSP, X-Frame-Options, etc.)
- [ ] HTTPS enforcement
- [ ] CORS restriction (same-origin only)
- [ ] File upload size limit (10MB)
- [ ] Rate limiting middleware
- [ ] File type validation (magic bytes)
- [ ] CSRF token for destructive operations

### Phase 3: Configurable Categories & Tags (3-4 days)
> **First product improvement — highest impact.**

- [ ] Create `category_rules` table
- [ ] Create `tag_rules` table
- [ ] Create `transaction_tags` table
- [ ] Build Settings page with Categories tab
- [ ] Build Settings page with Tags tab
- [ ] Migrate hardcoded rules to DB (seed defaults)
- [ ] Update `transactionExtractor.ts` to load rules from DB
- [ ] Add inline tag editing on transaction rows
- [ ] Add tag filter improvements

### Phase 4: Transaction Editing (2-3 days)
- [ ] Add `PATCH /api/transactions/:id` endpoint
- [ ] Add `notes` column to transactions
- [ ] Build inline edit UI for category, description, tags
- [ ] Add transaction detail modal/page

### Phase 5: Multi-Bank Support (2-3 days)
- [ ] Create `bank_formats` table
- [ ] Build bank format configuration UI
- [ ] Update parser to use configurable column mapping
- [ ] Auto-detect bank format from headers
- [ ] Add bank selector to upload page

### Phase 6: Data Management (1-2 days)
- [ ] CSV export with filters
- [ ] Encrypted JSON backup export
- [ ] Encrypted JSON backup import
- [ ] Data cleanup tools (merge duplicates, bulk re-categorize)

---

## 6. Technical Decisions & Trade-offs

### WebAuthn: Key Loss = Data Loss
**Decision:** If user loses their authenticator device (phone, security key), their data is permanently inaccessible.  
**Rationale:** This is the user's explicit requirement. Maximum security over convenience.  
**Mitigation:** Allow registering multiple credentials (e.g., phone + security key). Encourage backup keys.  
**Future option:** Encrypted recovery codes (printed paper backup).

### SQLite vs PostgreSQL
**Decision:** Stay with SQLite for now.  
**Rationale:** Single-user personal tool. SQLite is simpler, zero-config, file-based backup.  
**When to migrate:** If you need concurrent users, full-text search, or deploy to serverless (Vercel).

### Per-User Encryption Keys
**Decision:** Each user gets their own encryption key, stored in the DB encrypted with a master key.  
**Rationale:** If multi-user is ever added, user A can't decrypt user B's data even with DB access.  
**Trade-off:** Slightly more complex key management.

### Server-Side vs Client-Side Encryption
**Decision:** Keep server-side encryption (current approach).  
**Rationale:** Simpler, doesn't require browser key management, works with any device. The server is trusted since it's your own machine.  
**Trade-off:** Server can theoretically read data. For a personal self-hosted tool, this is acceptable. If deployed to a shared server, consider adding client-side encryption layer on top.

### Hardcoded Defaults as Seed Data
**Decision:** Keep current hardcoded rules as default seed data for new users.  
**Rationale:** New users get sensible defaults immediately. They can customize later via UI.  
**Implementation:** On first login / user creation, insert default category rules, tag rules, and type patterns into the user's config.

---

## Appendix: Current Hardcoded Rules to Migrate

### Category Keywords (to become `category_rules`)
```
Investments  → groww, stocks, mutual, share, mf
Coffee       → coffee, cothas
Food         → food, cafe, restaurant, bakery, snacks, apollo pharmacy, pharmacy, grocery
Shopping     → shopping, malai, sports, shuttle, gyftr
Utilities    → billpay, bill, electricity, water
Salary       → salary, neft cr, rently
Transfers    → upi, neft, imps, ft-
Entertainment→ games, movie, show
Personal     → loan, emi
```

### Type Patterns (to become `type_rules`)
```
UPI          → upi-
Bill Payment → billpay, ib billpay
Transfer     → neft, imps, ft-
POS          → pos 
Check        → chq
```

### Auto-Tag Patterns (to become `tag_rules`)
```
GROWW        → groww
AUTOPAY      → autopay
BILLPAY      → billpay
SALARY       → salary, rently
NEFT         → neft cr, neft
COTHAS       → cothas
APOLLO       → apollo
SHOPPING     → shopping
SPORTS       → shuttle
GYFTR        → gyftr
JEWELRY      → gold
```

### Category Colors (to become part of `category_rules.color`)
```
Coffee:        #8B4513
Food:          #FF6347
Shopping:      #FF69B4
Transfers:     #4169E1
Investments:   #DAA520
Utilities:     #DC143C
Salary:        #228B22
Entertainment: #FF1493
Personal:      #696969
Uncategorized: #A9A9A9
```
