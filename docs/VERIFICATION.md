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
