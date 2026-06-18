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

### 2. Automated tests — ⏸️ PAUSED (needs test DB)
Vitest/Jest + Payload integration + Playwright e2e are introduced in Phase 1
alongside the profile/auth features they cover. They require a disposable
Postgres test DB, which is not available in this environment (no local
Postgres/Docker). See "Credential pause" below.

### 3. Smoke & seed — ⏸️ PAUSED (needs DATABASE_URL)
`/admin`, the API, and `npm run create-admin` cannot be exercised without a
Postgres connection. The Phase 0 seed has no catalog data yet (Phase 1).

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

### Residual risks / follow-ups
- Node 24 is newer than Payload's supported runtime; CLI works via ESM but Node
  22 LTS is the safer choice (installed as fallback). See `docs/BACKEND_NOTES.md`.
- Gotcha #2 (`/login` real auth) intentionally deferred to Phase 1.
- DB-dependent gate steps (migrate, create-admin, integration/e2e, smoke) are
  **paused pending `DATABASE_URL`**.

### ⏸️ Credential pause
There is no local Postgres or Docker in this environment, and the database is a
Canadian service the operator must provision. To run migrations, create the first
super-admin, and execute the integration/e2e tests, the build needs a
`DATABASE_URL` (Supabase `ca-central-1`) — or a decision to run a local Postgres
for dev/test only. All Phase 0 code, config, and docs are complete and the static
gate is green.
