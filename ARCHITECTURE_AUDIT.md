# MyLedger — Architectural Audit Report

**Date:** February 22, 2026  
**Auditor:** GitHub Copilot  
**Scope:** Full-stack architectural review — production-grade banking application standard  
**Application:** MyLedger — Personal Bank Statement Management  
**Stack:** Next.js 16.1.6, React 19, SQLite (better-sqlite3), WebAuthn, AES-256-GCM encryption

---

## Executive Summary

MyLedger is a personal banking/ledger application that allows users to upload bank statements (CSV/Excel), view spending reports, and manage budgets. The application uses WebAuthn for passwordless authentication and encrypts sensitive data at rest.

While the application demonstrates good foundational practices (WebAuthn auth, AES-256-GCM encryption, session-based auth), **it is NOT production-ready for a banking-grade application**. There are critical, high, and medium severity findings across security, architecture, data integrity, observability, and operational readiness dimensions.

### Overall Risk Rating: **HIGH**

| Domain | Rating | Severity |
|--------|--------|----------|
| Authentication & Session Management | Moderate | Medium |
| Encryption & Key Management | Weak | Critical |
| Database Architecture | Weak | Critical |
| API Security | Weak | High |
| Input Validation | Weak | High |
| Error Handling & Observability | Weak | High |
| File Upload Security | Weak | High |
| Frontend Security | Moderate | Medium |
| Testing & Quality Assurance | Absent | Critical |
| Deployment & Operations | Absent | Critical |

---

## 1. CRITICAL Findings

### 1.1 SQLite as Production Database

**File:** `src/utils/db.ts`  
**Severity:** CRITICAL  
**Category:** Data Integrity, Scalability, Reliability

SQLite is used as the sole data store for a banking application.

**Issues:**
- **No ACID guarantees at scale** — SQLite uses file-level locking; concurrent writes from multiple server instances will cause `SQLITE_BUSY` errors
- **No replication or failover** — a single `.db` file is a single point of failure
- **No backup strategy** — no automated backup, point-in-time recovery, or WAL archiving
- **Data lives on local disk** — if the server disk fails, all financial data is permanently lost
- **No connection pooling** — the singleton `db` instance is created at module load time
- **Schema migrations are ad-hoc** — `safeAddColumn()` with try/catch on duplicate column errors is fragile; no migration tracking table, no rollback capability

**Banking standard requires:**
- PostgreSQL, MySQL, or a managed cloud database with automatic backups
- Point-in-time recovery (PITR) capability
- Read replicas for reporting queries
- Proper migration tooling (Prisma, Drizzle, Knex, or Flyway)
- Connection pooling with health checks

### 1.2 Encryption Key Management

**File:** `src/utils/serverEncryption.ts`  
**Severity:** CRITICAL  
**Category:** Cryptography, Secrets Management

```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
// ...
function getKey(): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY || '');
  return hash.digest();
}
```

**Issues:**
- **Single master key for all data** — if `ENCRYPTION_KEY` is compromised, ALL data across ALL users is exposed
- **No key rotation mechanism** — changing the key requires re-encrypting every record; no versioned keys or key IDs stored with ciphertext
- **Key derivation uses SHA-256 directly** — not a KDF. Should use PBKDF2, scrypt, or HKDF for proper key derivation
- **Encryption errors return `null` silently** — `encryptString()` catches errors and returns `null`, potentially causing plaintext to be stored or data loss
- **Per-user keys are encrypted with the master key** — but the per-user key (`encryption_key` column in `users` table) is never actually used for encrypting transaction data. All transactions use the single master key
- **No envelope encryption** — banking standard requires envelope encryption (data key encrypted by master key, master key in HSM/KMS)
- **No `.env` file exists** — there is no `.env` or `.env.local` file in the project, meaning the `ENCRYPTION_KEY` must be set externally; if not set, the application crashes at import time

**Banking standard requires:**
- Hardware Security Module (HSM) or cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault)
- Envelope encryption pattern
- Key rotation with key versioning
- Per-user encryption using the already-generated per-user keys
- Audit log for key access

### 1.3 Zero Test Coverage

**Severity:** CRITICAL  
**Category:** Quality Assurance

There are **no test files** in the entire project — no unit tests, integration tests, or end-to-end tests.

**Missing:**
- No test framework installed (no Jest, Vitest, Playwright, Cypress)
- No CI/CD pipeline
- No test scripts in `package.json`
- No test directories or spec files

**Banking standard requires:**
- >90% code coverage for business logic
- Unit tests for all encryption, date parsing, transaction extraction
- Integration tests for all API routes
- E2E tests for critical user flows (register, login, upload, view transactions)
- Security-focused test cases (SQL injection, XSS, path traversal, file upload abuse)
- Mutation testing for critical paths

### 1.4 No Audit Logging

**Severity:** CRITICAL  
**Category:** Compliance, Observability

There is zero audit trail for any user action. For a banking application, this is a regulatory non-compliance issue.

**Missing:**
- No login/logout event logging
- No transaction data access logging
- No data modification audit trail
- No file upload history (files are deleted after processing)
- No admin access or data export logging
- No failed authentication attempt tracking

**Banking standard requires:**
- Immutable audit log with timestamps, user IDs, IP addresses, action types
- Tamper-evident logging (signed log entries or append-only storage)
- Log retention policy (typically 7 years for financial data)
- Real-time alerting on suspicious activity

---

## 2. HIGH Severity Findings

### 2.1 No Rate Limiting

**Files:** All API routes  
**Severity:** HIGH  
**Category:** Security, Availability

No rate limiting exists on any endpoint. This exposes the application to:
- **Brute-force attacks** on the login endpoint (username enumeration + credential stuffing)
- **Denial-of-service** via file upload flooding
- **Resource exhaustion** via repeated large queries on `/api/transactions`

**Recommendation:**
- Implement middleware-based rate limiting (e.g., `next-rate-limit` or custom token bucket)
- Auth endpoints: 5 requests/minute per IP
- Upload endpoint: 10 uploads/hour per user
- General API: 100 requests/minute per session

### 2.2 No CSRF Protection

**File:** `src/app/api/delete-all/route.ts`  
**Severity:** HIGH  
**Category:** Security

The `DELETE /api/delete-all` endpoint permanently deletes all user data. While `SameSite=strict` cookies provide some protection, there is no CSRF token validation.

**Issues:**
- No CSRF token in any state-changing request (POST, DELETE)
- `SameSite=strict` breaks in some cross-origin redirect scenarios
- No double-submit cookie pattern or synchronizer token

**Recommendation:**
- Implement CSRF tokens for all state-changing operations
- Consider requiring re-authentication for destructive actions like `delete-all`

### 2.3 No Security Headers

**Severity:** HIGH  
**Category:** Security

There is no Next.js middleware file (`middleware.ts`) and no security headers are configured.

**Missing headers:**
| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Prevent XSS, injection attacks |
| `X-Frame-Options: DENY` | Prevent clickjacking |
| `X-Content-Type-Options: nosniff` | Prevent MIME sniffing |
| `Strict-Transport-Security` | Enforce HTTPS |
| `Referrer-Policy` | Control referrer leakage |
| `Permissions-Policy` | Restrict browser features |
| `X-XSS-Protection` | Legacy XSS protection |

### 2.4 File Upload Vulnerabilities

**File:** `src/app/api/upload/route.ts`  
**Severity:** HIGH  
**Category:** Security

```typescript
const ext = file.name.split('.').pop()?.toLowerCase();
const tempPath = path.join(uploadsDir, `${Date.now()}_${file.name}`);
fs.writeFileSync(tempPath, buffer);
```

**Issues:**
- **File type validation by extension only** — no magic byte/MIME type validation; a malicious file can be renamed to `.csv`
- **No file size limit** — a user can upload arbitrarily large files, causing memory exhaustion (`arrayBuffer()` loads entire file into memory)
- **Path traversal risk** — `file.name` is user-controlled; a filename like `../../etc/passwd` could potentially write outside uploads directory (mitigated by `Date.now()_` prefix but still risky)
- **Filename sanitization missing** — no sanitization of special characters in filenames
- **Temp files may persist on crash** — if the process crashes between `writeFileSync` and `unlinkSync`, orphaned files accumulate
- **Synchronous file I/O** — `fs.writeFileSync` and `fs.readFileSync` block the event loop

**Recommendation:**
- Validate file magic bytes (CSV/Excel headers)
- Enforce file size limits (e.g., 10 MB max)
- Sanitize filenames (strip path separators, special chars)
- Use streaming I/O for large files
- Use a temp directory (`/tmp`) instead of project-relative `uploads/`
- Implement virus/malware scanning for uploaded files

### 2.5 Input Validation Gaps

**Files:** All API routes  
**Severity:** HIGH  
**Category:** Security, Data Integrity

No schema validation library is used (no Zod, Joi, Yup, etc.). Input validation is minimal and inconsistent.

**Specific issues:**
- **`POST /api/budgets`** — `amount` is not validated as a positive number; negative or zero budgets can be created. `start_date`/`end_date` are not validated as valid dates or that end > start
- **`GET /api/transactions`** — `category`, `start`, `end` query params are concatenated directly into SQL (parameterized, which is good), but not validated for format
- **`GET /api/budget-status`** — `date` parameter is not validated; could be any string
- **Username validation** — only checks for non-empty string; no length limits, no character restrictions, no profanity filter
- **Transaction import** — `parseFloat()` on user-supplied data without bounds checking

**Recommendation:**
- Adopt Zod for runtime schema validation on all API inputs
- Define strict types with validation for dates (ISO format), amounts (positive decimals), categories (allowlist)
- Maximum input lengths for all string fields

### 2.6 Error Information Leakage

**Files:** Multiple API routes  
**Severity:** HIGH  
**Category:** Security

```typescript
// upload/route.ts
error: `Failed to process file: ${(err as Error).message}`
```

Internal error messages are returned directly to the client. This can reveal:
- File system paths
- Database error details
- Stack trace information
- Internal library version info

**Recommendation:**
- Return generic error messages to clients
- Log detailed errors server-side with structured logging
- Use error codes instead of messages for client-facing errors

---

## 3. MEDIUM Severity Findings

### 3.1 Session Management Weaknesses

**File:** `src/utils/auth.ts`  
**Severity:** MEDIUM  
**Category:** Security

**Issues:**
- **No session renewal/sliding expiration** — sessions expire at a fixed time; active users get logged out
- **No concurrent session limit** — a user can have unlimited active sessions
- **No session invalidation on security events** — sessions aren't cleared on password/credential change
- **Session cleanup is passive** — expired sessions are only deleted when accessed; no background cleanup job leads to database bloat
- **Session token is a UUID** — while random, it's only 128 bits. OWASP recommends 256-bit session identifiers for high-security applications

### 3.2 WebAuthn Challenge Expiration

**Files:** `src/utils/auth.ts`, `src/app/api/auth/*/options/route.ts`  
**Severity:** MEDIUM  
**Category:** Security

Challenges stored via `storeChallenge()` have `created_at` but no TTL enforcement. A challenge issued hours or days ago remains valid.

**Recommendation:**
- Enforce a 5-minute TTL on challenges
- Clean up expired challenges periodically

### 3.3 User Enumeration

**File:** `src/app/api/auth/login/options/route.ts`  
**Severity:** MEDIUM  
**Category:** Security

```typescript
if (!user) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
```

Different error responses for "user not found" (404) vs "no credentials" (400) allow attackers to enumerate valid usernames.

**Recommendation:**
- Return identical, generic error responses for all authentication failures
- Add consistent timing delays to prevent timing attacks

### 3.4 Duplicate Transaction Detection

**File:** `src/utils/importer.ts`  
**Severity:** MEDIUM  
**Category:** Data Integrity

```typescript
if (t.reference_number) {
  const existing = stmtCheck.get(t.reference_number);
  // ...
}
```

**Issues:**
- Duplicate detection only works if `reference_number` is present; many bank formats don't include reference numbers
- The check compares encrypted reference numbers against plaintext — the stored value is encrypted but the check uses the plaintext value. **This means duplicate detection is likely broken** because `stmtCheck.get(t.reference_number)` compares plaintext against encrypted values in the DB
- No composite key dedup (date + amount + description)

### 3.5 Frontend Lacks Loading/Error Boundaries

**Files:** `src/components/SpendingReport.tsx`, `src/components/BudgetTracker.tsx`  
**Severity:** MEDIUM  
**Category:** Reliability, UX

- No React Error Boundaries — a rendering crash in `SpendingReport` takes down the entire page
- No loading states on initial data fetch in `SpendingReport` — blank screen until data arrives
- API errors are silently swallowed (`catch(() => { /* ignore */ })` in Navigation.tsx)
- `window.location.reload()` is used instead of React state management for post-action refresh

### 3.6 No Pagination on Server Side

**File:** `src/app/api/transactions/route.ts`  
**Severity:** MEDIUM  
**Category:** Performance, Scalability

```typescript
query += ' ORDER BY date DESC';
const transactions = db.prepare(query).all(...params) as any[];
```

All transactions are fetched at once. For a user with years of banking data (thousands of transactions), this will:
- Load all records into memory
- Decrypt all records in one pass
- Send potentially megabytes of JSON to the client
- Client-side pagination exists but doesn't reduce load

**Recommendation:**
- Implement server-side pagination with `LIMIT/OFFSET` or cursor-based pagination
- Server-side filtering and aggregation for charts

### 3.7 Console Logging in Production

**Files:** Multiple files  
**Severity:** MEDIUM  
**Category:** Security, Observability

```typescript
console.log('Registration options received:', options);  // register/page.tsx
console.error('Encryption error:', err);                 // serverEncryption.ts
```

**Issues:**
- `console.log` in client code leaks WebAuthn options to browser console
- `console.error` in encryption module may log sensitive context
- No structured logging framework (Pino, Winston)
- No log levels, log correlation, or request tracing

---

## 4. LOW Severity Findings

### 4.1 Code Duplication

- `scripts/processUploads.js` duplicates the entire transaction extraction logic from `src/utils/transactionExtractor.ts` (200+ lines of identical logic in JavaScript vs TypeScript)
- `Transaction` interface is defined in both `src/utils/importer.ts` and `src/utils/transactionExtractor.ts`

### 4.2 Type Safety Gaps

**File:** `src/utils/serverEncryption.ts`

```typescript
export function encryptTransaction(transaction: any): any { ... }
export function decryptTransaction(transaction: any): any { ... }
```

- Heavy use of `any` type in encryption functions
- Database query results cast with `as` without runtime validation
- No branded types for encrypted vs. plaintext strings (easy to mix up)

### 4.3 Hardcoded HDFC Bank Format

**File:** `src/utils/transactionExtractor.ts`

- Category keywords and bank column names (e.g., `Narration`, `Withdrawal Amt.`, `Deposit Amt.`) are hardcoded for HDFC Bank format
- The fallback parser is generic but lacks robustness
- No support for multi-bank format detection

### 4.4 Date Parsing Fragility

**File:** `src/utils/dateParser.ts`

- Only supports `DD/MM/YY` format
- Returns `new Date(0)` (Jan 1, 1970) for unparsable dates — this creates misleading data rather than failing
- No timezone handling — banking dates should respect the account's timezone
- 2-digit year assumption (`year += 2000`) will break after 2099

### 4.5 Missing `credentials: 'include'` on Some Fetch Calls

**Files:** `src/components/ExcelUpload.tsx`, `src/components/SpendingReport.tsx`, `src/components/BudgetTracker.tsx`

Some `fetch()` calls omit `credentials: 'include'` which may cause cookie-based auth to fail in cross-origin scenarios.

### 4.6 No Graceful Degradation for WebAuthn

If the browser doesn't support WebAuthn (e.g., older browsers), no fallback is provided and no user-friendly error is shown.

---

## 5. Architecture & Design Concerns

### 5.1 Missing Architectural Layers

The current codebase has no separation of concerns beyond file organization:

```
Current:  Route Handler → Direct DB calls → Response
Needed:   Route Handler → Middleware → Service Layer → Repository → DB
```

**Missing layers:**
- **Middleware layer** — for auth, rate limiting, security headers, request logging
- **Service layer** — business logic is embedded directly in API routes
- **Repository layer** — raw SQL is scattered across route handlers and utilities
- **DTO/ViewModel layer** — database records are returned directly to clients (leaking internal IDs, structure)

### 5.2 No API Versioning

API routes are not versioned (`/api/transactions` vs `/api/v1/transactions`). Any breaking change will affect all clients immediately.

### 5.3 No Health Check Endpoint

No `/api/health` or `/api/ready` endpoint for load balancers, container orchestration, or monitoring to verify application health.

### 5.4 No Configuration Management

- Environment variables are read directly with `process.env` throughout the codebase
- No centralized configuration module with defaults and validation
- No environment-specific configuration (dev, staging, production)
- `APP_ORIGIN` defaults to `http://localhost:3000` — secure defaults should not include HTTP

### 5.5 Database Schema Issues

| Issue | Details |
|-------|---------|
| No foreign keys enforced | SQLite foreign keys are OFF by default; `PRAGMA foreign_keys = ON` is never called |
| No indexes | No indexes on `transactions.date`, `transactions.category`, `transactions.user_id` — queries will do full table scans |
| `amount` is stored as `REAL` | Floating point for financial data causes rounding errors; should be integer (cents/paise) |
| `tags` stored as JSON string | Not queryable; should be a separate table with many-to-many relationship |
| No `updated_at` timestamps | No way to track when records were modified |
| No soft deletes | Data deletion is permanent; no recovery possible |

### 5.6 Sensitive Data in Parsed Files

**Directory:** `parsed_files/`

The `parsed_files/` directory contains unencrypted JSON files with full bank statement data (dates, transaction descriptions, amounts). While `.gitignore` excludes these, they remain on disk unencrypted.

---

## 6. Compliance & Regulatory Gaps (Banking Standard)

For a production banking application, the following are typically required:

| Requirement | Status | Notes |
|-------------|--------|-------|
| PCI DSS compliance | NOT MET | No compliant data handling |
| Data encryption at rest | PARTIAL | Only description and reference_number encrypted; dates, amounts, categories in plaintext |
| Data encryption in transit | NOT VERIFIED | No HSTS enforcement |
| Audit trail | NOT MET | Zero audit logging |
| Data retention policy | NOT MET | No data lifecycle management |
| Right to erasure (GDPR) | NOT MET | No account deletion capability |
| Access controls (RBAC) | NOT MET | No role-based access; every user has equal permissions |
| Data backup & recovery | NOT MET | No backup strategy |
| Incident response plan | NOT MET | No documentation or tooling |
| Penetration testing | NOT MET | No evidence of security testing |
| Vulnerability scanning | NOT MET | No dependency auditing (no `npm audit` in CI) |

---

## 7. Positive Findings

Despite the issues, the following aspects are well-implemented:

| Aspect | Details |
|--------|---------|
| **WebAuthn authentication** | Correct use of `@simplewebauthn/server` with proper challenge flow, credential verification, and counter updates |
| **Passwordless by design** | No password storage eliminates an entire class of vulnerabilities |
| **AES-256-GCM encryption** | Correct algorithm choice with authenticated encryption; proper IV generation and auth tag handling |
| **Session cookie security** | `httpOnly`, `sameSite: strict`, conditional `secure` flag — well configured |
| **User data isolation** | All queries filter by `user_id` — proper multi-tenant data isolation |
| **Encrypted data at rest** | Transaction descriptions and references are encrypted before storage |
| **File cleanup** | Uploaded files are deleted after processing |
| **`.gitignore` coverage** | Database files, uploads, parsed files, and env files are properly excluded |
| **TypeScript strict mode** | `strict: true` in `tsconfig.json` |
| **React Compiler enabled** | Using the latest React Compiler for optimized rendering |

---

## 8. Prioritized Remediation Roadmap

### Phase 1 — Critical Security (Week 1-2)

| # | Task | Effort |
|---|------|--------|
| 1 | Migrate to PostgreSQL with proper migrations (Prisma/Drizzle) | 3-5 days |
| 2 | Implement key management with envelope encryption and key rotation | 2-3 days |
| 3 | Add Next.js middleware for security headers | 0.5 day |
| 4 | Implement rate limiting on auth and upload endpoints | 1 day |
| 5 | Add CSRF protection for state-changing operations | 1 day |
| 6 | Fix file upload: size limits, magic byte validation, path sanitization | 1 day |

### Phase 2 — Architecture & Reliability (Week 3-4)

| # | Task | Effort |
|---|------|--------|
| 7 | Add Zod schema validation on all API inputs | 2 days |
| 8 | Implement structured logging (Pino) with audit trail | 2 days |
| 9 | Add service layer and repository pattern | 3 days |
| 10 | Server-side pagination for transactions | 1 day |
| 11 | Fix duplicate detection (compare before encryption) | 0.5 day |
| 12 | Add React Error Boundaries and loading states | 1 day |
| 13 | Store monetary amounts as integers (paise/cents) | 1 day |
| 14 | Add database indexes on frequently queried columns | 0.5 day |

### Phase 3 — Testing & Operations (Week 5-6)

| # | Task | Effort |
|---|------|--------|
| 15 | Set up Vitest + testing infrastructure | 1 day |
| 16 | Unit tests for encryption, date parsing, transaction extraction | 2 days |
| 17 | Integration tests for all API routes | 2 days |
| 18 | E2E tests with Playwright (register, login, upload, dashboard) | 2 days |
| 19 | CI/CD pipeline (GitHub Actions) | 1 day |
| 20 | Health check endpoint and monitoring | 0.5 day |
| 21 | Automated database backups | 1 day |
| 22 | Centralized configuration module | 0.5 day |

### Phase 4 — Compliance & Hardening (Week 7-8)

| # | Task | Effort |
|---|------|--------|
| 23 | Complete audit logging for all data access/mutations | 2 days |
| 24 | Account deletion / data export (GDPR) | 1 day |
| 25 | Session management hardening (sliding expiry, concurrent limits) | 1 day |
| 26 | Fix user enumeration in auth endpoints | 0.5 day |
| 27 | Encrypt all fields at rest (not just description/reference) | 1 day |
| 28 | Dependency vulnerability scanning in CI | 0.5 day |
| 29 | Security penetration testing | External |
| 30 | Documentation: runbooks, incident response, architecture diagram | 2 days |

---

## 9. Summary Metrics

| Metric | Value |
|--------|-------|
| Total findings | 30+ |
| Critical | 4 |
| High | 6 |
| Medium | 7 |
| Low | 6 |
| Test coverage | 0% |
| Security headers | 0/7 |
| API endpoints with rate limiting | 0/8 |
| API endpoints with input validation | 0/8 |
| Audit log coverage | 0% |

---

*This audit was conducted as a static code review. No dynamic testing, penetration testing, or dependency vulnerability scanning was performed. Findings are based on code analysis against banking-grade security and architectural standards (OWASP, PCI DSS, SOC 2).*
