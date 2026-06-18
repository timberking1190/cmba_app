# CMBA Connect — Verification Log

Results of the Verification Gate after each phase. Honest record: what passed,
what is paused, and residual risks.

---

## Phase 0 — Foundation

Date: 2026-06-18 · Branch: `feat/backend`

### 1. Static checks — ✅ ALL GREEN
| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | ✅ Compiles; 26 routes incl. `/admin/[[...segments]]`, `/api/[...slug]`, `/api/graphql`, `/resources`; all public pages intact |
| Typecheck | `npx tsc --noEmit` | ✅ Clean |
| Lint | `npm run lint` | ✅ No ESLint warnings or errors |
| Payload types current | `npm run generate:types` | ✅ No diff (in sync) |

### 2. Automated tests — ⏳ harness lands in Phase 1
The Vitest + Payload integration + Playwright e2e harness is introduced in
Phase 1 alongside the profile/auth features it covers. For Phase 0 the live API
was exercised manually against the ca-central-1 DB (see §3) — login, token-auth,
and default-deny access control all verified.

### 3. Smoke & migrate & first-admin — ✅ GREEN (live ca-central-1 DB)
Ran against the provisioned Supabase project `cmba-connect` (ca-central-1):
| Step | Result |
|---|---|
| `npm run migrate` (initial) | ✅ Applied; 11 tables created (users, users_roles, users_sessions, media, certificate_files, payload_*) |
| `npm run create-admin` | ✅ Created `admin@cmba.ab.ca` as `super_admin`, status active |
| `GET /` , `/resources`, `/coach/pathway`, `/login` | ✅ 200 |
| `GET /admin` (Payload panel) | ✅ 200 |
| `GET /api/users` (unauthenticated) | ✅ **403** "not allowed" — default deny works |
| `POST /api/users/login` (admin) | ✅ 200, JWT issued, roles `["super_admin"]` |
| `GET /api/users` (with token) | ✅ 200, returns the admin |
| dev server log | ✅ no errors/warnings during smoke |
| Supabase security advisors | ✅ no lints |

### 4. Self-review — ✅
- **Committed secrets:** none. Scan of `src/`, `scripts/`, `next.config.mjs`,
  `vercel.json` found only an example password string inside a usage comment in
  `scripts/create-admin.ts`. `.env` is gitignored and untracked; `.env.example`
  holds placeholders only.
- **Default-deny access control:** Users (self/club-scoped read, admin-only
  roles/verification fields, super-admin create/delete), Media (public read by
  design — images only), CertificateFiles (owner-or-super-admin read; Payload
  access control kept ON; private bucket; `disableLocalStorage`).
- **Canadian region:** Postgres + Storage (two buckets) → Supabase ca-central-1;
  email → SES ca-central-1; compute → Vercel `yul1`. No processor outside Canada
  for personal data. (Region confirmation in provider consoles is an operator
  step — tracked in `docs/processors.md`.)
- **Public certificate exposure:** none — certificate files live in the private
  bucket with Payload access control; never served from a public URL.
- **Wired pages importing static mock progress:** N/A in Phase 0 (page rewiring
  is Phase 1). Public site verified unaffected by the build.

### Database — provisioned via Supabase MCP
Resolved the earlier credential pause: a dedicated **`cmba-connect`** project was
created in **ca-central-1** (ref `pdwautioosstdgbbblxl`) with a least-privilege
`payload_app` DB role. Migrations, first-admin, and the smoke test all ran
against it (§3). Details in `docs/BACKEND_NOTES.md`.

### Residual risks / follow-ups
- Node 24 is newer than Payload's supported runtime; CLI works via ESM but Node
  22 LTS is the safer choice (installed as fallback). See `docs/BACKEND_NOTES.md`.
- Gotcha #2 (`/login` real auth) intentionally deferred to Phase 1.
- **Storage + email creds pending (operator):** Supabase S3 access keys + the two
  buckets, and SES SMTP — uploads and real email won't work until set. Not needed
  for the Phase 0 gate.
- The full Vitest/Playwright **test harness lands in Phase 1**; Phase 0 auth +
  access control were verified manually against the live DB.

### Phase 0 verdict: ✅ GREEN
Static gate (build/typecheck/lint/types) + live-DB gate (migrate, first-admin,
smoke, auth, access control, advisors) all pass. Ready to start Phase 1.

---

## Phase 1 — Profiles, certifications & front-end wiring

Date: 2026-06-18 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### 1. Static checks — ✅ GREEN
`npm run build` (compiles; `/account`, `/coach/pathway`, `/guardian/confirm`,
`/api/account/export` dynamic; `/privacy` `/terms` `/guardian-consent` static;
middleware active), `tsc --noEmit` clean, `npm run lint` clean, payload types
current, Phase 1 migration applied to the live DB.

### 2. Live end-to-end gate — ✅ 22/22 PASS (against ca-central-1 DB)
Ran a scripted suite against the running app + live DB:

**Consent (server-enforced):**
- ✅ create without consent → **400 rejected** (front end bypassed)
- ✅ adult account stores `termsVersion` + `privacyVersion` + `acceptedAt`, status active
- ✅ minor (DOB < 18) requires guardian fields + `guardianConsentVersion`; minor
  without them → **400 rejected**
- ✅ minor account is `isMinor` + **pending**; guardian-confirm link **activates** it
- ✅ consent audit: `ConsentRecords` written per sign-off; not user-writable (403)

**RBAC adversarial (default deny):**
- ✅ User A cannot read User B (404); A's user list scoped to self only
- ✅ non-admin cannot self-escalate `roles` (stays `participant`)
- ✅ non-admin cannot set `verifiedBy` (admin-only field ignored)
- ✅ participant cannot read another user's certification (404)
- ✅ admin reads all users; admin verifying a cert flips status `pending → valid`

**Domain / integration:**
- ✅ certification auto-status `pending-verification` on create
- ✅ `/account` (unauth) → **307 redirect** to `/login?redirect=/account` (middleware)
- ✅ `/coach/pathway` renders **real seeded stages** ("Community Coach"), **not** the
  static 60% mock; public when signed out
- ✅ `/privacy` `/terms` `/guardian-consent` render (consent links resolve)

### 3. Self-review — ✅
- No committed secrets; `.env` gitignored. Least-privilege `payload_app` DB role.
- Default-deny access on all new collections; verification/roles fields admin-only;
  certificate files private (owner/super-admin); catalogs public-read only.
- Fixed: consent-record audit insert now joins the parent transaction (`req`),
  so the FK to the new user resolves.

### Phase 1 verdict: ✅ core GREEN — remaining wiring tracked below

**Done:** real `/login` auth + exact consent registration (adult + guardian/minor),
middleware-gated `/account` dashboard (profile edit, compliance banner, cert cards
+ private download, pathway progress, recommended courses, **self-serve data
export**), header/mobile auth state, `/coach/pathway` on real data, guardian
confirm flow, legal pages, full data model + seed.

**Phase 1 remainder — completed in 1c/1d:**
- ✅ `/coach/courses` reads the Courses collection with real completion; `/ref`
  rewired to the seeded official pathway (no DEMO/fake profile); `/athlete` +
  `/parent` signed-in strips. (`/coach`, `/coach/clinics`, `/ref/quick-ref`,
  `/ref/signals` are reference/resource pages with no mock progress.)
- ✅ Vitest domain suite (`npm test`): 18 tests — cert status transitions, date
  math, age gate, reminder selection. (Playwright browser e2e still optional —
  the live scripted suites cover the same flows.)

---

## Phase 2 — Admin & compliance automation (partial)

Date: 2026-06-18 · Branch: `feat/backend`

### Delivered + verified
- **Training/admin management** = the Payload admin panel (`/admin`):
  CertificationTypes / Courses / Pathways CRUD, user directory + filters, and
  certification verification (admin-only fields) — all live already.
- **Expiry-reminder cron** `/api/cron/certification-reminders` (daily): refreshes
  cached status + emails at 60/30/7/lapsed, **no PII** in body.
- **Retention-review cron** `/api/cron/retention-review` (weekly): flags inactive
  accounts (no auto-delete).
- **IncidentLog** collection + **breach runbook** (README) + **Privacy Officer**
  in **SiteSettings** global.
- **Admin erasure** `/api/admin/erase-user`: legal-hold check; removes certs +
  private files (DB + Storage) + consent records + the account.

**Live gate (ca-central-1):** cron rejects missing/bad secret (401) + fails closed
without `CRON_SECRET`; runs + returns a summary with the correct secret; erasure
rejects unauthenticated + non-admin (403), refuses under legal hold (409),
succeeds for super-admin and the user is gone (404). Migration applied; build /
typecheck / lint / 18 unit tests green.

### Consent audit view — ✅ added (Phase 2b)
Super-admin-gated page `/compliance/consent-audit` lists every account with its
accepted Terms/Privacy/Guardian versions + date, and flags any account missing a
**current** sign-off (outdated version or never accepted). Linked from `/account`
for admins; middleware-gated. Live-verified: no-session → /login; super-admin →
200 + renders the table; non-super → redirected to /account.

**Cookie-auth + CSRF confirmation (important):** server-side cookie auth
(`payload.auth`) was proven working — `/account` renders 200 for a signed-in
user. Payload auto-adds the serverURL to the CSRF allowlist and the cookie is
only honoured with a browser `Sec-Fetch-Site`/`Origin` (which real browsers
always send). Headless clients without those are correctly rejected — this is
CSRF protection, not a bug. Bearer (`Authorization: JWT`) auth is unaffected.

### Remaining Phase 2
- Custom admin **compliance dashboard** (expiring/lapsed rollup) — a bespoke
  Payload admin view; the data + per-user `/account` compliance banner exist.
- Club-admin certification read-scoping (RBAC final polish).
