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

### Compliance dashboard — ✅ added (Phase 2c)
`/compliance/dashboard` (admins): lists certifications expiring within 60 days or
lapsed, with renewal links and lapsed/expiring counts. Super admins see all
members; **club admins are scoped to their own club**. Status recomputed live.
Linked from `/account`. Live-verified 5/5: creates an expiring cert → appears for
super-admin; no-session → /login; non-admin → /account.

### Remaining Phase 2
- (none essential) — club-admin scoping is handled in the dashboard; deeper
  club-admin cert-list read-scoping on the raw collection is optional polish.

---

## Phase 3 — Website CMS

Date: 2026-06-18 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- **Pages** collection: block-based `layout`, drafts + version history + autosave,
  SEO group, unique slug, and **Live Preview** (admin `livePreview.url` + a
  client `PageRenderer` using `useLivePreview` for in-iframe live updates).
- **Block library** (`src/blocks/config.ts`) → **`RenderBlocks`** (on-brand):
  hero, richText (lexical), statsGrid, faq, cta, image, embed (e.g. TeamLinkt).
- **Catch-all `/[slug]`** route renders published pages (+ draft mode for
  preview) — admins create pages **without code**. Existing static routes take
  precedence; unknown slugs 404.
- **Announcements** collection + a live homepage strip (client-fetched so the
  homepage stays static); **legal docs published as CMS pages** (markdown→lexical
  seed) with `/privacy` `/terms` `/guardian-consent` rendering the CMS version and
  falling back to the built-in static content; legal links added to the footer.
- **Globals:** SiteSettings (Privacy Officer + contact), HeaderNav, FooterNav
  (editable in admin). Seed populates site settings, nav, an announcement, the
  three legal pages, and a sample `/about` page.

### Live gate (ca-central-1) — ✅ 9/9
`/about` renders hero+stats+cta from CMS via the catch-all; `/privacy` renders the
CMS-backed legal page (with policy body); announcements API returns the published
seed; unknown slug → 404; `/rules` (static) still wins; homepage 200. Migration
applied; build / typecheck / lint / 18 unit tests green; Supabase advisors clean.

### Remaining (content migration, not engineering)
- Re-authoring the existing bespoke homepage / FAQ / contact / hub pages as CMS
  block pages is now a content task (the block library + renderer + catch-all
  exist). The complex app pages (rules engine, schedule) intentionally stay in
  code per the architecture, and can embed CMS blocks via the EmbedBlock.

---

## Production deploy — ✅ LIVE

Date: 2026-06-19 · `main` @ merge `b3c8f5f` · https://cmbaplatform.vercel.app (region `yul1`)

PR #1 merged to `main`; Vercel production deploy **READY**. Required env vars set
in Vercel (Production + Preview): `PAYLOAD_SECRET`, `DATABASE_URL` (Supabase
**session pooler** `aws-1-ca-central-1:5432` for serverless), `NEXT_PUBLIC_SERVER_URL`,
`CRON_SECRET`, `EMAIL_FROM`. (Two earlier preview builds had failed — fixed:
missing `@payloadcms/live-preview-react` in package.json, and `/athlete`+`/parent`
hitting the DB during static generation; both resolved.)

**Live prod smoke — 12/12:** `/`, `/coach/managing-the-moment`, `/leadership`,
`/spring-league`, `/summer-camps`, `/rules`, `/resources` all 200; DB-connected
(`/api/globals/policy-versions`); `/admin` reachable; unauth `/api/users` → 403;
admin login (auth + DB) works; CMS catch-all `/about` renders.

**Still operator-only (don't function until set):** Supabase **S3 keys + buckets**
(uploads) and **AWS SES** creds (real email). Everything else is live.

## Old-site link recreation — ✅ no `cmba.ab.ca` content/form links remain
Recreated natively: `/coach/managing-the-moment`, `/leadership` (board), and CMS
pages `/spring-league`, `/summer-camps`, `/women-in-coaching`, `/key-dates`,
`/meeting-minutes`. Repointed forfeit/SCC code/SCC report DB → `/rules` (native),
board/calendar/minutes → native pages, and `/game-report` is now a **native form**
(GameReports collection). Remaining `cmba.ab.ca` refs are only the league email,
a Google-Sites drills link, and RAMP document hosts (not the old CMS).

---

# Stage B - Scheduling, Scores, Standings, Officials

Authoritative build blueprint: `docs/SCHEDULING_BUILD_PLAN.md` (synthesized from a
multi-lens design pass and folding in all 41 adversarial red-team findings).
Feature comparison: `docs/FEATURE_GAP_ANALYSIS.md`.

## Phase B0 - Foundations + auth + idempotency

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- 12 new collections with explicit default-deny access and field-level locks:
  Seasons (standingsConfig + immutable seasonSeed, both super-admin locked),
  Divisions (canonical fullPath + displayLabel), Teams (club-admin scoped, club
  and division update-locked), Venues, Courts (separate so conflict checks key on
  a stable court id), TeamMemberships (the verified-rep gate: self-claim lands
  unverified, verified/role/user admin-locked), StandingsCache (derived, user
  write denied), ImportBatches, AuditLog (append-only), IdempotencyKeys,
  RefreshTokens, RateLimitHits (the last three fully sealed, system-only).
- SiteSettings gains a schedulingAdmin group (the unsuppressable contested
  escalation address; update stays super-admin only). Users gains a
  notificationPrefs.gameReminders opt-out.
- Front end (one PR): GameStatus extended to the full 7-state union; StatusChip
  rewritten as an exhaustive switch with a `never` guard so a missing chip is a
  compile error; filterUpcoming/filterResults updated to categorize all 7 states;
  StandingRow gains a server-assigned `rank`.
- Service infrastructure: src/lib/api/idempotency.ts (pure decide + stable hash +
  server withIdempotency, fail-closed 503), src/lib/api/auth.ts (token auth +
  net-new rotate-on-use refresh with reuse-detection family revoke), and
  src/lib/rateLimit.ts (durable, serverless-safe, fail-open).

### 1. Static checks - GREEN
| Check | Result |
|---|---|
| `npm run build` | Compiles; all existing routes intact; public site unaffected |
| `npx tsc --noEmit` | Clean |
| `npm run lint` | No ESLint warnings or errors |
| `npm run generate:types` | Regenerated; all 12 collections valid |

### 2. Automated tests - 68/68 PASS (50 new)
- Authorization-contract layer (build plan section 12): every B0 collection access
  fn and field-lock asserted per role. Proven: a participant cannot read another
  user's membership (scoped Where), cannot self-verify (verified/role/user locked),
  cannot write Seasons/Divisions/Venues/Courts; a club admin is scoped to their own
  club for Teams and cannot move a team's division/club; the three system
  collections deny all four ops to everyone; AuditLog denies create/update/delete to
  all and its hooks THROW on update and delete even via overrideAccess; a structural
  test asserts all four access ops are defined on every new collection.
- idempotency: run/replay/403-different-user/409-different-body; hash is
  key-order-independent and path/body-sensitive.
- auth refresh: rotate/reuse-detected/expired/invalid; hashToken never returns
  plaintext; tokens are unique.
- rate limit threshold; schedule status partition (all 7 statuses land in exactly
  one of upcoming/results/neither, cancelled in neither).

### 3. Migration + composite-index inspection - GREEN
- `migrate:create` then `migrate` applied `20260625_063707_stageb0_scheduling_foundation`
  to the live ca-central-1 DB (269ms). Purely additive: 14 new tables, plus fast
  nullable/defaulted columns on users and site_settings; no drops in up().
- SQL inspection confirmed all 7 unique indexes are real `CREATE UNIQUE INDEX`:
  divisions(season,fullPath), teams(division,name), venues(name), courts(venue,name),
  team_memberships(user,team), standings_cache(division), idempotency_keys(key,scope).
- Verified on the live DB via Supabase: 12 tables present, 6 named composite/unique
  indexes unique, site_settings + users columns added.

### 4. Live smoke (built app, ca-central-1) - GREEN
`/`, `/standings`, `/admin` -> 200 (public site intact); `/api/seasons`,
`/api/teams` -> 200 (public reference reads); `/api/team-memberships`,
`/api/idempotency-keys`, `/api/audit-log` -> 403 (default-deny / sealed / admin-only
hold over real HTTP). No server errors.

### Residual / follow-ups
- The full report/confirm/standings flows, the private-photo EXIF strip, and the
  /api/v1 routes land in B1 and B2 with their adversarial integration tests.
- SES SMTP still not provisioned: contested and assignment emails will use the dev
  jsonTransport (no real send) until SES_SMTP_* is set. Tracked for the operator.

### Phase B0 verdict: GREEN
Static + 68 tests + additive migration on live ca-central-1 + live default-deny
smoke all pass. Public site unaffected. Ready for B1.

## Phase B1 - Pure core, Games, state machine, standings

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- Pure, I/O-free, fully unit-tested core (all in src/lib, injectable inputs):
  - gameStateMachine: canTransition table, isFinalized, effectsOf (recompute on
    entering AND leaving final), nextStatusForReport (dual entry), and the
    security checks checkActorMayReport / checkActorMayConfirm (opposing-derived,
    not-own-report, not-dual-membership).
  - standings/computeStandings: mercy/diff cap, forfeit W/L/GP accounting incl
    double_forfeit and no_contest, includeForfeits=false, byes, head-to-head with
    the precise "every pair played AND strictly distinct or skip" rule, the
    absolute (seasonSeed, teamId) final tiebreaker, streak/lastFive, and a stable
    inputs hash. Output rows carry a server-assigned integer rank.
  - conflicts/detect: venue+court / team / official double-booking (blocking) and
    official over-max / ramp-below (warnings); byes excluded; deterministic order.
  - roundRobin/generate: circle method with a bye sentinel filtered before any
    swap, single and double, plus blackout-aware slot assignment.
  - csvImport/parse + validate: header-exact CSV with quoted commas and a BOM,
    and per-kind validators (errors and warnings) using injected lookup maps.
- Games collection: the central entity with the intentional public-read exception
  (anonymous sees published only; a verified rep additionally sees their team's
  drafts; resolved async from verified memberships), the 7-state status + draft or
  published axis, version (optimistic lock), append-only changeLog, the forfeit
  group with outcome, and field locks where a finalized game's scores and status
  are super-admin only.
- games/service: the only writer of game status and scores. transitionGame is a
  conditional update guarded on version AND status (the single finalize
  serialization point); adminOverride, applyForfeit, setPublishState all write the
  AuditLog and recompute on the final edge.
- standings/index: recomputeDivision (published final and forfeit games only,
  pinned sort, no-op when the inputs hash is unchanged) and getDivision/League
  standings.
- cmbaSchedule replaces the teamlinkt data layer (same Game and StandingRow shapes)
  with a FEATURE_LEGACY_TEAMLINKT fallback so the public pages never go blank
  before a season is seeded. StatusChip is exhaustive; StandingsTable renders the
  server rank via orderStandingsForDisplay (sortStandings kept only for legacy
  rows). /schedule and /standings now read our data first.

### 1. Static checks - GREEN
build, `tsc --noEmit`, lint, and `generate:types` all clean.

### 2. Automated tests - 134/134 PASS (66 new this phase)
state machine (transitions, dual entry, the three actor checks); standings
(mercy cap, forfeit + double_forfeit + no_contest + includeForfeits=false, byes,
the rock-paper-scissors H2H cycle falls through without looping, the unbalanced
H2H skip, idempotency under shuffled input with identical rows + streak + hash,
winPct never NaN, the deterministic seed tiebreaker); conflicts (each
double-booking kind, buffer window, byes excluded, candidate-vs-published);
generator (even N, odd N double has no sentinel leak and exactly 2 byes per team,
blackout avoidance); CSV (quoted commas, kind detection, every games and teams
error and warning); standings display ordering preserves server rank.

### 3. Migration - GREEN (additive on live ca-central-1)
`20260625_070400_stageb1_games` applied (146ms): games + games_change_log +
games_period_scores, with the 7-value status enum; no drops in up().

### 4. Live integration smoke (Local API, ca-central-1) - 6/6 GREEN
scripts/smoke-b1.ts (npm run smoke:b1) creates a transient active season, two
teams, and two published final games, runs recomputeDivision, and asserts: the
season seed is auto-assigned; the cache has two ranked rows; the team that won
twice is rank 1 with 4 points; the other is rank 2 with 0; the published-games
query returns both; and after an admin cancels one final game and recomputes, the
game DROPS from standings (recompute on LEAVING the final set, red-team finding
14). All temporary records are deleted afterward, so production stays clean.

### 5. Live HTTP smoke (built app) - GREEN
`/`, `/calendar`, `/standings`, `/admin` -> 200 (public site intact, now reading
cmbaSchedule with the legacy fallback); `/api/games` (anon) -> 200 with zero docs
(published-only, no draft leakage); `/api/standings-cache` -> 200. No server errors.

### Note on server-only
standings/index and games/service dropped the `server-only` guard so operator
scripts (seed, smoke) can call them via the Local API; they are internal server
modules imported only by routes, crons, and scripts, never by a client component.
The page-facing data layer (cmbaSchedule, teamlinkt) keeps `server-only`.

### Residual / follow-ups
- recomputeDivision is exercised live by the smoke; the full rep report -> opposing
  confirm -> final -> recompute -> standings path lands in B2 with its adversarial
  integration tests.
- The public pages still show the TeamLinkt fallback until a season is seeded; the
  cutover (FEATURE_LEGACY_TEAMLINKT=false) and the non-blank gate are in B4.

### Phase B1 verdict: GREEN
Static + 134 tests + additive Games migration on live ca-central-1 + a 6-check
live recompute integration smoke + HTTP smoke all pass. Public site unaffected.
Ready for B2.

## Phase B2 - Verified reporting, confirmation, contested flow, private photos

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- Collections: ScoreReports (verified-rep gate in beforeChange), Confirmations
  (four-rule opposing-rep gate), Disputes (contested + unsuppressable escalation),
  ScoresheetFiles (private youth photos), IncidentFiles (admin-only private). Both
  photo collections are in the private bucket with Payload access ON.
- Orchestration: src/lib/games/reporting.ts (reconcile-with-retry dual entry,
  finalize-on-confirm, dispute-on-mismatch), all threading the hook req so nested
  writes join the parent transaction; emailEvents (report request, contested,
  schedule change, assignment) with NO PII.
- API: /api/v1/games/:id/report, /confirm, /dispute, and the shared multipart
  /api/v1/uploads/scoresheet, with token auth, Idempotency-Key, rate limiting, and
  safe error mapping. Account erasure now also cascades scoresheet + incident files.

### 1. Static checks - GREEN
build, `tsc --noEmit`, lint, `generate:types` clean.

### 2. Automated tests - 138/138 PASS (4 new: EXIF strip + rejections)

### 3. Migrations - GREEN (additive on live ca-central-1)
`stageb2_reporting` (6 tables: confirmations, disputes, incident_files,
score_reports + period_scores, scoresheet_files; both composite uniques) and
`stageb2_fixes` (scoresheet game NOT NULL).

### 4. Adversarial integration smoke - 24/24 GREEN (npm run smoke:b2)
Builds a season with two teams and six users (two reps, a stranger, a
dual-membership user, a club admin, a super admin) and asserts at runtime against
the live DB: non-rep rejected by the hook even on a direct create; rep cannot
report for the wrong team; a side cannot stack a second report (unique index); the
reporter cannot self-confirm; a dual-membership user is routed to an admin; a
stranger cannot confirm; opposing confirm finalizes and recomputes standings; a
report on a finalized game is rejected (status gate); a club admin with no
membership cannot report (no admin bypass); dual-entry mismatch goes contested with
a dispute and the scheduling-admin snapshot; dual-entry match auto-finalizes; a
club admin cannot change a finalized score but a super admin can; the STORED
scoresheet bytes (read back from the S3 bucket) have NO EXIF; a stranger cannot read
a scoresheet photo but the opposing rep can; a rep cannot attach a scoresheet to a
game they are not on; the audit log is append-only even via overrideAccess.

### 5. Red-team pass - 13 findings, all material ones fixed
A four-lens adversarial workflow reviewed the diff and found 1 critical, 4 high, 5
medium, 3 low. Fixed and re-verified:
- CRITICAL: EXIF strip ran in beforeChange, AFTER Payload's generateFileData
  captured the stored buffer, so it never reached the bucket. Moved to a
  beforeOperation hook (runs before the buffer is captured) plus a guaranteed strip
  in the upload route; proven by reading the stored S3 bytes in the smoke.
- HIGH: club_admin bypassed the rep gate on any league game (admin branch used
  isAnyAdmin). Restricted the bypass to super_admin; club admins use the override
  route (B4), scoped to their club.
- HIGH: dual-entry write-skew left a game stuck at reported with a hidden mismatch.
  Rewrote reporting as a reconcile-with-retry over committed state via the
  conditional version+status transition.
- HIGH: a dispute could revert a finalized game (unconditional update). Made the
  contested transition a conditional update guarded on version + status in
  (scheduled, reported); the escalation still always sends.
- MEDIUM/LOW: forced identity fields (submittedBy/raisedBy/confirmingUser) always;
  added game-status preconditions on report/confirm/dispute; validated a referenced
  scoresheet belongs to the same game; required the scoresheet game backref;
  deduped open disputes per game; Content-Length DoS guard on the upload route;
  safe client error mapping (only intentional APIError messages pass through).
- Accepted residuals (documented): idempotency-key write is not in the same
  transaction as the work, but the composite unique indexes are the authoritative
  double-count backstop for report and confirm, and disputes are deduped; the rate
  limiter fails open on an infra blip (a soft DoS guard; the security-critical
  actions are backstopped by the unique indexes and auth).

### Note on SES
SES is still not provisioned, so report-request and contested-escalation emails use
the dev jsonTransport (no real delivery) until SES_SMTP_* is set. The code path,
recipients, and no-PII bodies are exercised; only delivery is pending the operator.

### Phase B2 verdict: GREEN
Static + 138 tests + two additive migrations on live ca-central-1 + a 24-check
adversarial integration smoke + a folded-in red-team pass all green. Public site
unaffected. Ready for B3.

## Phase B3 - CSV import, schedule generator, officials, admin consoles

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- Collections: Officials (admin-managed, linked-user readable), GameOfficials
  (own-assignment readable, audited + emailed, unique game+official).
- Import service: pure validators (B1) + a DB lookup builder, a dry-run preview
  (validate + conflict detection), and a pending-first, single-transaction commit
  with an undo window. CSV date+time are converted from America/Edmonton to UTC
  (DST handled and unit-tested).
- API: /api/v1/import/validate, /import/commit (Idempotency-Key), /import/:id/undo;
  /api/v1/admin/schedule/generate (round robin + slot assignment + conflict
  preview, optional commit); /api/v1/admin/games/:id/officials (assign with
  double-booking block and over-max / ramp warnings, emails the official);
  /api/v1/admin/games/:id/override (the only finalized-game edit path; super admin
  for finalized games, club admin scoped to their own club, reason required).
- Admin consoles under /manage (kept off /admin, the Payload SPA): /manage hub,
  /manage/import (the three-step screen with template downloads, validate, the
  errors/warnings/conflicts preview, the acknowledge gate, draft-or-publish, and
  undo), /manage/schedule (publish + override), /manage/contested (the contested
  queue + awaiting-confirmation list), /manage/officials (the assigning screen).
  All gated by middleware + an in-page isAnyAdmin check.

### 1. Static + tests - GREEN
build, typecheck, lint, types clean; 141 unit tests pass (3 new: the Edmonton to
UTC conversion in winter MST and summer MDT).

### 2. Migration - GREEN (additive on live ca-central-1)
`stageb3_officials` (officials, game_officials; composite unique game+official).

### 3. Integration smoke - 14/14 GREEN (npm run smoke:b3)
Imports the four REAL shipped templates (public/templates) end to end against the
live DB: Teams (4 + clubs created on approval), Venues (venues + auto courts),
Officials (3), Games (3, with the past-date warnings acknowledged, draft, plus the
referee assignments from the optional columns). Then: the draft games are not
public; undo removes the whole games batch; a published re-import makes them
public; an admin override finalizes a game with a score and recomputes standings.

### Notes
- Admin scheduling consoles live under /manage, not /admin/import, to avoid the
  Payload admin SPA route collision (the BUILD_PROMPT gotcha 1).
- The generator and officials emails use the dev jsonTransport until SES is set.

### Phase B3 verdict: GREEN
Static + 141 tests + an additive migration on live ca-central-1 + a 14-check
import/generator/override integration smoke all green. Public site unaffected.
Ready for B4.

## Phase B4 - Public/rep front end and the /api/v1 surface

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- Token auth for the native apps: /api/v1/auth/login (issues an access JWT + a
  rotating refresh token), /auth/refresh (rotates with reuse detection and mints a
  fresh session-bound access token), /auth/logout (revokes the family). Users gain
  a pushDevices array and /api/v1/devices to register tokens.
- Read API: /api/v1/config (soft min-version, no PII), /api/v1/games (cursor
  paginated, published for anonymous, team drafts for a verified rep),
  /api/v1/games/:id (404 not 403 for a non-participant draft), /api/v1/standings
  (precomputed cache + legend), /api/v1/me/dashboard, /api/v1/me/assignments.
- Web: a rep dashboard at /rep (report scores, confirm the opposing report with the
  photo, request a review) fed by the same data function as the native endpoint;
  /score-login now routes a signed-in user to /rep and a signed-out user to sign in
  (the TeamLinkt deep-link is gone); a plain-language standings legend on /standings.
- docs/API.md documents the full v1 surface, the token + Idempotency-Key contract,
  the error ladder, and cursor pagination.

### 1. Static + tests - GREEN
build, typecheck, lint, types clean; 141 tests still pass.

### 2. Migration - GREEN (additive on live ca-central-1)
`stageb4_push_devices` (users_push_devices). The session model was kept ON (no
destructive sessions drop); the refresh route creates a session and mints a
session-bound token.

### 3. HTTP token-lifecycle smoke - 8/8 GREEN (built app)
login returns an access + refresh token; the JWT authenticates /me/dashboard (200);
no auth is 401; /config, /games, /standings are public 200; refresh returns a NEW
access token AND a rotated refresh token; the new access token authenticates 200
(proving the mint-with-session path); reusing the OLD refresh token is 401 (reuse
detection revokes the family). No server errors.

### Note on the public cutover
The public /schedule and /standings already read our data (B1) with the
FEATURE_LEGACY_TEAMLINKT fallback, so they never go blank pre-seed. Flipping the
flag to false (the full cutover) is an operator step once a real season is imported.

### Phase B4 verdict: GREEN
Static + 141 tests + an additive migration + an 8-check token-lifecycle HTTP smoke
all green. Public site unaffected. Ready for B5.

## Phase B5 - Brackets, ICS, announcements, incidents, scaffolds, crons

Date: 2026-06-25 · Branch: `feat/backend` · DB: `cmba-connect` (ca-central-1)

### Delivered
- Playoff brackets: PlayoffBrackets + BracketSeries, a pure single-elimination
  generator (seeded by rank, byes for the top seeds, unit-tested), a seed service
  that freezes the standings order, advancement that sets the winner and wires it
  forward when a bracket game finals, the seed + read API, and a public
  /bracket/[divisionId] page.
- ICS calendar feeds: a pure builder (RFC 5545 with DTSTAMP + embedded VTIMEZONE)
  and an unguessable HMAC capability token; /api/v1/ics/:scope/:token.ics serves
  division and league feeds live, team feeds behind FEATURE_TEAM_ICS.
- Targeted announcements: /api/v1/announcements/targeted sends one single-recipient
  email per verified rep of a division or team, suppressing the general-updates
  opt-out and deduping by email.
- GameIncidents (admin-only, the filer must be a verified rep, assigned official,
  or admin; attachment in the admin-only IncidentFiles bucket).
- Scaffolds (model only, admin-only read, feature-gated per the youth-leak note):
  Sanctions, Availability, PlayerStats.
- Crons (vercel.json, yul1): score-reminders (report nudge, confirm nudge,
  contested escalation to super admins), standings-nightly (self-heals the cache on
  drift), ttl-sweep (idempotency + rate-limit rows over 24h). Bracket advancement is
  wired into the finalize path.

### 1. Static + tests - GREEN
build, typecheck, lint, types clean; 146 unit tests (5 new: the bracket generator
and the ICS builder + token).

### 2. Migration - GREEN (additive on live ca-central-1)
`stageb5_brackets_incidents_scaffolds` (playoff_brackets, bracket_series,
game_incidents, sanctions, availability + composite unique, player_stats).

### 3. Integration smoke - 8/8 GREEN (npm run smoke:b5)
Four-team division with final games -> ranked standings -> seed a single-elim
bracket (2 round-1 series + a final, seeded by rank) -> finalize a round-1 game ->
the winner advances and is wired into the final -> a stranger cannot file a game
incident but an admin can.

## Stage B final gate - GREEN

Re-ran the whole module to confirm no regressions:
- 146 unit tests pass.
- All four live integration smokes pass with 52 adversarial checks total:
  smoke:b1 (6, recompute both directions), smoke:b2 (24, the full reporting and
  private-photo attack matrix including the stored-bytes EXIF proof), smoke:b3 (14,
  the import and override pipeline on the real templates), smoke:b5 (8, brackets and
  incidents).
- build, typecheck, lint clean; five additive migrations applied to live
  ca-central-1; the public site is unaffected throughout.

## Definition of Done (Stage B)

- The scheduling, scores, standings, and officials module is built and connected:
  this app is the source of truth, with TeamLinkt kept only for the one-time CSV
  import and registration deep-links (behind FEATURE_LEGACY_TEAMLINKT so the public
  pages never go blank pre-seed).
- A working CSV import path (four real templates) with a dry-run preview, conflict
  detection, an acknowledge gate, a single-transaction commit, and undo; plus a
  round-robin generator.
- Verified team-rep score reporting with a safe, private, EXIF-stripped scoresheet
  photo; opposing confirmation; dual-entry match and mismatch; the contested flow
  that emails the scheduling admin; auto-updating standings with configurable
  tiebreakers and the mercy cap; team stats; and the officials roster + assigning.
- The adversarial matrix passes as live integration tests (the red-team findings,
  including the critical EXIF leak, were fixed and proven).
- API-first: /api/v1 is documented (docs/API.md) with token auth (Authorization:
  JWT), a refresh flow with reuse detection, and Idempotency-Key on writes; logic is
  in services and pure libs; shared types are generated; a device push-token field
  exists; media upload is one shared endpoint.
- Youth data is private and Canadian resident (Supabase Postgres + Storage
  ca-central-1, SES ca-central-1, Vercel yul1); every account still has a recorded,
  server-enforced consent sign-off (Stage A); append-only AuditLog.
- Docs: docs/SCHEDULING_BUILD_PLAN.md, docs/FEATURE_GAP_ANALYSIS.md, docs/API.md,
  docs/SEASON_GUIDE.md, and this verification log.

### What the operator must still provision
- AWS SES (ca-central-1) SMTP: SES_SMTP_HOST/PORT/USER/PASS and a verified
  EMAIL_FROM. Until then, report requests, contested escalations, and official
  assignment emails are logged but not delivered (dev jsonTransport).
- Set the scheduling admin email in Site Settings (the contested escalation target).
- Decide FEATURE_TEAM_ICS (team-level calendar feeds) and the source-of-truth
  cutover (FEATURE_LEGACY_TEAMLINKT=false) once a real season is imported.
- Storage and DB are already provisioned (ca-central-1); CRON_SECRET is set so the
  new crons run.

### Phase B5 verdict: GREEN. Stage B complete.

---

# Stage C — Security hardening

## Verification pass (ratify Stage A + B against spec; no rebuild)

Run 2026-06-29 on branch feat/backend before any Stage C work:

- Unit + integration tests: 146/146 passing (17 files) via `npm test`.
- Typecheck: `npx tsc --noEmit` clean.
- Lint: `npm run lint` clean.
- Production build: `npm run build` exit 0 (static + dynamic routes generate).

Gotchas confirmed handled: /admin is Payload (src/app/(payload)/admin) with the old
static directory moved to /resources; /login is real Payload email/password auth
with consent-gated registration and login hardening. Source-of-truth decision is
implemented (native pipeline queried first; FEATURE_LEGACY_TEAMLINKT defaults on
until a season is seeded). FEATURE_GAP_ANALYSIS.md already benchmarks all five
competitors. Verdict: Stage A + Stage B RATIFIED.

## Phase S0 — Baseline hardening

### 1. Static checks
- Tests: 165/165 passing (added headers + botChallenge suites). `npm test`.
- Typecheck clean; lint clean; production build exit 0.
- Secret scanning: gitleaks configured in CI (.github/workflows/security.yml,
  .gitleaks.toml). `.env` is gitignored and untracked; only `.env.example` is in
  the repo (verified `git ls-files`). Dependency audit + Semgrep SAST gate in CI.

### 2. Security tests + real-response header checks
Server started from the production build; headers observed with curl:
- CSP present on every HTML route with the locked directives: `default-src 'self'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'self'` (self required for Payload Live Preview; cross-origin
  framing denied), allowlisted img/connect/font/media (Supabase ca-central-1 only)
  and frame-src (TeamLinkt + YouTube + Google Docs/Drive + RAMP only), report-uri
  /api/csp-report, upgrade-insecure-requests.
- script-src strategy = compatible (`'self' 'unsafe-inline'`) by default. The gate
  caught that a nonce + strict-dynamic policy would block Next's un-nonced inline
  bootstrap scripts on statically rendered pages; the strict-nonce strategy is
  implemented and gated behind CSP_STRICT_SCRIPTS for the S2 dynamic-rendering
  upgrade (see docs/SECURITY.md). Documented residual.
- Enforced on all routes: HSTS (max-age 63072000; includeSubDomains; preload),
  X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy
  strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo/usb/etc.
  disabled), Cross-Origin-Opener-Policy same-origin.
- Page serving unaffected: /, /game-report, /standings, /schedule, /rules, /faq,
  /admin, /.well-known/security.txt all return 200 with the policy in place.
- /api/csp-report returns 204 and logs a scrubbed summary; security.txt served as
  text/plain.
- Form abuse defense (game-report): honeypot + per-IP (5/10min) + global (60/10min)
  durable rate limit + optional Cloudflare Turnstile (fail-closed when enabled),
  with IP stored only as an HMAC hash. Unit-tested in
  src/lib/security/__tests__/botChallenge.test.ts.
- CORS + CSRF locked to known origins in src/payload.config.ts (no wildcard with
  credentials; native apps use bearer tokens).

### 3. Dynamic scan
Deferred to the operator preview deploy (run an automated scanner, e.g. OWASP ZAP,
against a Vercel preview; record results here). The first preview should run with
CSP_REPORT_ONLY=true to confirm zero violations before enforcing.

### 4. Standards mapping
docs/SECURITY.md updated with the S0 control matrix (each control -> file + test).

### 5. Self review / red team (S0 scope)
- CSP enforced would have broken static script execution -> caught and resolved by
  the compatible strategy; strict-nonce upgrade path recorded.
- No raw IP persisted by the limiter (hashed). No secrets in repo. Error responses
  remain generic (safeClientError). frame-ancestors keeps Live Preview working.

### Phase S0 verdict: GREEN (code-level). Residuals: script-src compatible strategy
(upgrade scheduled S2), and the operator dynamic scan on preview. S1 next.

## Phase S1 (a) — CSP strict-nonce upgrade (gold standard)

Decision: do the strict-nonce CSP now (not deferred). The public root layout reads
the per-request nonce, forcing dynamic rendering so Next stamps the nonce onto every
script. TeamLinkt schedule/standings data was already wrapped in unstable_cache (1h)
so removing page-level ISR did not increase upstream load.

Verified on the production build (real responses):
- script-src is now `'self' 'nonce-…' 'strict-dynamic'` (no 'unsafe-inline' in
  script-src). Homepage: 0 inline scripts without a nonce (was 8 un-nonced before).
- /admin (Payload): 200, all admin scripts carry the nonce.
- All public pages + /login + /admin return 200; rendering is dynamic (ƒ).
- 165/165 tests, tsc + lint clean, build exit 0.

`CSP_COMPAT_SCRIPTS=true` remains as a documented fallback. The S2 residual for
script-src is therefore CLOSED at S1.

## Phase S1 — Identity and authentication (incremental build)

Build order (safe, additive; enforcement only at I7 behind MFA_ENFORCE kill-switch):
I0 deps+env · I1 password policy+HIBP · I2 schema · I3 session-meta · I4 TOTP+recovery
· I5 passkeys · I6 challenge/step-up/sessions (flag off) · I7 force-enrollment enforce
· I8 email-OTP (after SES). Design recorded from the Payload-3.85-grounded research.

### I0 — Dependencies + env (no behavior change)
- Added @simplewebauthn/server@13.3.2, @simplewebauthn/browser@13.3.0, otpauth@9.5.1
  (TOTP; the research's otplib@13.4.1 does not exist — used otpauth and will adapt to
  its real API), qrcode@1.5.4, @types/qrcode (dev).
- New env (documented in .env.example): TOTP_ENC_KEY, WEBAUTHN_RP_ID, WEBAUTHN_ORIGINS,
  MFA_ENFORCE=false, FEATURE_EMAIL_OTP=false.
- Dependency-audit gate reconciled: all current high/critical advisories are
  framework-transitive (next/nodemailer/undici via Payload+Next). Triaged into
  .audit-allowlist.json (11 IDs) with a dependency-free gate scripts/audit-ci.mjs that
  fails CI on any NEW un-allowlisted high/critical. Documented in docs/SECURITY.md;
  remediation (framework upgrade) flagged as operator action + pentest input.

### I1 — Password policy + breached-password screening
- validatePassword beforeValidate hook on Users (runs first; no-op unless a password
  is present, so existing accounts are unaffected until next change): min 12, max 128,
  all characters allowed, no composition/rotation/hints, contextual blocklist
  (password != email/name), and HIBP breach screening.
- src/lib/security/hibp.ts: k-anonymity (5-char SHA-1 prefix, Add-Padding), 2.5s
  timeout, fails OPEN on outage. Full password/hash never leaves the server (asserted
  in tests).
- Gate: 179/179 tests (incl. 14 new), tsc + lint clean, build exit 0.

### I0+I1 verdict: GREEN. Additive only; no login behavior changed; no schema change.

### I2 — MFA data model (schema only, no enforcement)
- 5 new private collections (deny-all external access; secrets `read:()=>false`):
  webauthn-credentials, webauthn-challenges, mfa-totp, recovery-codes, email-otp.
- Users gains a `mfa` group (enrolled/methods/enrolledAt/required/lastVerifiedAt;
  enrolled+required saveToJWT) and a `sessionMeta` array (sid/aal/mfaAt/stepUpAt/
  ip/userAgent; never serialized). `enforceMfaRequired` beforeChange derives
  mfa.required from admin roles.
- Migration src/migrations/20260630_020454_add_mfa_schema.ts generated OFFLINE
  (snapshot diff, no DB connection). REVIEWED: up() is additive-only (8 CREATE
  TABLE, users ADD COLUMN all nullable/DEFAULT false, enums + indexes, zero
  destructive statements); down() cleanly reverses. Safe + reversible on the live DB.
- Gate: tsc + lint clean, 179/179 tests, build exit 0. No enforcement; logins
  unaffected; new tables not yet queried.

OPERATOR ACTION (apply when ready, branch first): the migration is committed but NOT
applied. Apply with:  `npm run migrate`  (against a Supabase branch first, then prod;
DATABASE_URL points at the target). All changes are additive/nullable so an old
binary against the new schema keeps working (zero-downtime).

### I3 — MFA decision + session-assurance read plumbing (read-only, no enforcement)
- src/lib/mfa/guard.ts: decideMfa pure function (ok / enroll-required /
  challenge-required / stepup-required) with the force-enrollment invariant and a
  stale-column-safe mfaRequired (roles OR derived flag). Step-up freshness window 5min.
- src/lib/mfa/sessionPure.ts: assuranceFor (sid -> aal, default aal1) + decodeSid
  (read sid claim from a Payload JWT). Pure, unit-tested.
- src/lib/mfa/session.ts: getCurrentUserWithAssurance reads the private sessionMeta
  with overrideAccess (read:()=>false) and attaches _mfa. No write on the login path
  (elevation to aal2 lands with the challenge routes).
- Gate: 193/193 tests (+ guard + session suites incl. the "admin is never ok while
  aal1" MFA-bypass invariant and force-enrollment safety), tsc + lint clean, build
  exit 0. No enforcement wired yet; logins unaffected.

### I4 — TOTP authenticator + recovery codes + /account/security (no enforcement)
- Libs (unit-tested, 28 MFA tests total): crypto.ts (AES-256-GCM, tamper-rejecting),
  totp.ts (otpauth, replay floor via lastStep), recovery.ts (PBKDF2 + constant-time).
- Server helpers (server.ts): getAuthWithSid, elevateSession (read-modify-write
  sessionMeta to aal2), markEnrolled, writeAudit. Safe overrideAccess updates (Users
  side-effect hooks are create-gated, confirmed by reading hooks/users.ts).
- Routes: POST .../mfa/totp/enroll (encrypted secret + QR), .../totp/activate (verify
  -> enrolled + recovery codes once + elevate), .../mfa/challenge (totp or recovery
  -> elevate). Rate-limited (mfa_enroll/mfa_verify/mfa_challenge). Audited.
- UI: /account/security + TotpSetup (QR + manual key + confirm + recovery display);
  Security link on /account.
- TOTP_ENC_KEY generated into local .env (gitignored); documented in .env.example.
- Live checks (prod build, migration applied): MFA routes return 401 unauthenticated;
  /account/security redirects to /login; all 5 private MFA collections return 403 on
  direct REST read (IDOR/access protection). Gate: 207/207 tests, tsc + lint clean,
  build exit 0.
- NOTE: full interactive "enroll with a real authenticator app" is the operator's
  live test (needs a real signed-in user); covered in docs/PENTEST_READINESS.md. No
  enforcement wired yet (MFA_ENFORCE still off); logins unaffected.

### I5 — Passkeys (WebAuthn) (no enforcement)
- src/lib/mfa/webauthn.ts: @simplewebauthn/server v13 wrapper. RP ID + origin
  allowlist from WEBAUTHN_RP_ID / WEBAUTHN_ORIGINS (preview hosts excluded unless
  listed). verifyReg/verifyAuth fail closed on error; public key stored base64url and
  never serialized; counter persisted.
- webauthn-challenges store/consume (single-use, 5min TTL) in server.ts.
- Routes (rate-limited, audited): passkey/register/options|verify (store credential,
  markEnrolled('passkey'), elevate), passkey/auth/options|verify (elevate; rejects a
  non-increasing signature counter = cloned-authenticator guard).
- UI: PasskeyEnroll (@simplewebauthn/browser startRegistration) on /account/security.
- Gate: 211/211 tests (+4 webauthn config/options), tsc + lint clean, build exit 0.
  Live: all 4 passkey routes return 401 unauthenticated.
- NOTE: the full passkey ceremony needs a real/virtual authenticator on the canonical
  origin (cmbaplatform.vercel.app); that is the operator/pentest live test
  (docs/PENTEST_READINESS.md). Config, options, origin-gating, and the counter guard
  are covered by tests + code review.

### I6 — Sign-in challenge + session/device management (no enforcement)
- Challenge: /account/security/challenge + MfaChallenge (passkey via
  startAuthentication, TOTP code, recovery code) -> elevates this session. `next` is
  open-redirect-guarded (relative same-site only).
- Sessions: GET .../mfa/sessions (Payload sessions + sessionMeta, current flagged,
  no secrets); POST .../sessions/revoke ({sid} or {all}) keeps the current session,
  removes others from user.sessions so their JWT is instantly rejected; SessionsList
  UI (per-device sign-out + sign out everywhere). Rate-limited, audited.
- Gate: 211/211 tests, tsc + lint clean, build exit 0. Live: sessions routes 401
  unauthenticated; challenge page redirects when signed out.
- DEFERRED to S2: invalidate-sessions-on-password-change hook (no in-app password
  change UI yet; manual "sign out everywhere" covers the immediate need). Noted in
  the threat model / pentest readiness.

### S1 status after I6
Both MFA factors (passkeys + TOTP), recovery codes, the sign-in challenge, and
session management are built, tested, and self-service. Enrollment is LIVE-capable
(migration applied). NOT yet wired: force-enrollment ENFORCEMENT (I7, MFA_ENFORCE) -
intentionally gated until the super admin has enrolled a factor (operator step), so
there is no lockout window. Email-OTP recovery (I8) waits on SES.

### I7 — Force-enrollment enforcement (behind MFA_ENFORCE, default OFF)
- src/lib/mfa/enforce.ts: enforceMfa(path) - no-op (no query, no redirect) when
  MFA_ENFORCE off; when on, loads per-session assurance and redirects per decideMfa
  to /account/security (enroll) or /account/security/challenge. Redirect targets are
  NOT enforced, so a required-but-unenrolled super admin always has a path in
  (force-enrollment, never a hard lockout). Pure helpers in enforcePure.ts (tested).
- Wired into the personal-data/admin pages: /account, /manage, /rep,
  /compliance/dashboard, /compliance/consent-audit (after each page's existing role
  gate).
- Gate: 215/215 tests (+4 enforce), tsc + lint clean, build exit 0. Live with the
  flag OFF: /account, /manage, /rep, /compliance/dashboard still redirect signed-out
  users to /login exactly as before; public pages 200. Zero behavior change until the
  operator flips MFA_ENFORCE.
- REMAINING I7 PIECE: the Payload /admin panel does not yet run enforceMfa (it is a
  separate SPA). Add an admin.components.afterLogin MFA slot to challenge/enroll
  inline before turning enforcement fully on for the /admin surface. Tracked in
  docs/OPERATOR_ACTIONS.md and docs/SECURITY.md.

OPERATOR (docs/OPERATOR_ACTIONS.md): enroll a factor at /account/security for the
super admin (and a backup) BEFORE setting MFA_ENFORCE=true. The flag is the instant
kill-switch.

## Phase S2 (started) - Authorization + data protection
- Adversarial access-control / IDOR tests (src/access/__tests__/accessControl.test.ts,
  8 tests): role helpers; readUsers/updateUsers scope a non-admin to their OWN record
  (cannot read/update another user by id tampering); club admin scoped to self+club;
  deleteUsers super-admin only; anonymous denied. Part of the pentest matrix.
- Verified existing data-protection controls: EXIF/GPS strip on photo upload
  (src/lib/uploads/exif.ts + test); private cert/scoresheet/incident downloads keep
  Payload access control (payload.config; only public Media disables it); React
  output-encoding (no dangerouslySetInnerHTML in app code); Payload+Drizzle ORM (no
  raw SQL); CSRF via Payload csrf allowlist + SameSite=Lax.
- Documented in docs/SECURITY.md S2 section. Gate: 223/223 tests, lint clean.
- Remaining S2 (scheduled, touches live paths): sensitive-field encryption
  (guardian/DOB), invalidate-on-password-change, secure-upload sniffing/malware scan,
  SSRF/open-redirect/mass-assignment adversarial review, Payload /admin MFA slot.

### S2 (cont.) - session invalidation, open-redirect, mass-assignment
- Invalidate-sessions-on-password-change (src/collections/hooks/sessionInvalidation.ts,
  wired into Users): when a password is set on update, all OTHER sessions + refresh
  families are killed (the actor's own self-service session is kept; admin/reset
  clears all). Tightly scoped (fires only when data.password present, so MFA/profile
  updates never trigger it) with a loop guard. Pure filters unit-tested.
- Open-redirect guard (src/lib/security/redirect.ts safeInternalPath): fixed a real
  gap in the login page (?redirect=//evil.com passed the old startsWith('/') check).
  Now rejects //, /\, schemes, control/whitespace. Used by /login and the MFA
  challenge page. Tested.
- Mass-assignment: asserted superAdminFieldOnly write-locks role/status-class fields
  (a self-registrant cannot self-assign roles). Tested.
- Gate: 232/232 tests, tsc + lint clean, build exit 0. (Note: this also fixed a tsc
  gap - the prior S2 commit's gate skipped tsc; the access-test fixture types are now
  correct.)

### S2 (cont.) - secure file upload + field-encryption decision
- Magic-byte content sniffing (src/lib/uploads/sniff.ts): CertificateFiles now
  validates real bytes (PDF %PDF, PNG/JPEG/WebP magic) + 10MB cap before storage, so
  a malicious file declared application/pdf is rejected. Image collections were
  already content-validated by the sharp re-encode (EXIF strip). Tested (sniff.test).
- Application-layer field encryption (guardian/DOB) ASSESSED + DEFERRED: DOB is read
  in plaintext by deriveIsMinor and guardian.email inside hooks, so field-level
  encrypt/decrypt would break those paths; encryption-at-rest (Supabase) covers the
  baseline. AES-256-GCM primitive ready for an isolated field later. Documented as an
  accepted residual in docs/SECURITY.md.
- Gate: 234/234 tests, tsc + lint clean, build exit 0.
- S2 remaining: Payload /admin afterLogin MFA slot; optional malware-scan add-on.

### S1/I7 (cont.) - Payload /admin MFA enforcement (closes the gap)
- GET /api/v1/auth/mfa/status returns the session posture; `decision` is forced to
  'ok' when MFA_ENFORCE is off, so clients never redirect until enforcement is on.
- AdminMfaGate provider (src/components/security/AdminMfaGate.tsx) wraps the whole
  Payload /admin SPA (registered via admin.components.providers + regenerated
  importMap). On mount it checks the status and, when enforced + not AAL2 (or
  required-but-unenrolled), redirects to enroll/challenge with ?next=/admin.
- Live (flag off): /admin returns 200 with the provider wrapping it and still ships
  nonced scripts (CSP intact); status route 401 unauthenticated. Gate: 234/234 tests,
  tsc + lint clean, build exit 0. The S1/I7 enforcement gap is now CLOSED for /admin.

## Phase S3 (started) - API security, monitoring, incident readiness
- Tamper-evident AuditLog: HMAC per row over the integrity-protected fields
  (src/lib/audit/integrity.ts), stamped in the AuditLog create hook (the log was
  already append-only 3 ways). New `integrity` column added via migration
  20260630_125952_add_audit_integrity (additive ADD COLUMN, generated + APPLIED to
  prod, verified: column present, 52 rows intact). `npm run verify-audit-log` walks
  the log (live result: 0 valid, 52 unprotected pre-integrity baseline, 0 TAMPERED,
  exit 0). Unit-tested (tamper detection, key-order + actor-shape stability).
- /api/v1/auth/mfa/status endpoint for the admin gate (401-gated).
- docs/INCIDENT_RESPONSE.md: runbook tied to IncidentLog + PIPEDA/PIPA breach duties,
  severity/timelines, monitoring signals, retention.
- Documented existing S3 controls (per-endpoint auth + rate limit, idempotency, log
  hygiene via safeClientError + hashed rate-limit keys) in docs/SECURITY.md S3.
- Gate: 238/238 tests, tsc + lint clean, build exit 0.
- Remaining S3: centralized log shipping + anomaly alerting (operator add-on);
  per-endpoint body schema-validation hardening.

## Phase S4 (started) - Children's data + registration readiness
- Registration readiness behind a flag: src/lib/registration/policy.ts
  (REGISTRATION_MODE, default 'open' = current behavior; 'closed' = admin-created
  only). registrationGate beforeValidate hook on Users create enforces (for public
  sign-up only): mode, honeypot, per-IP (hashed) + global rate limit, optional
  Turnstile. Admin-created accounts and seed/bootstrap are exempt. Default behavior
  unchanged (open, no Turnstile, generous limits). Honeypot added to the /login
  register form.
- Live: a honeypot-tripped public registration is rejected 400 ("Sign-up rejected.")
  with NO user created; normal sign-up is unaffected.
- Children's-data protections documented (existing): guardian-managed minors,
  minor-document owner-only access, server-enforced versioned consent, DSAR
  (export + erasure with legal hold). Threat model / DFD / PIA already produced.
- Gate: 242/242 tests (+4 registration policy), tsc + lint clean, build exit 0.
- Remaining S4: email verification on sign-up (needs SES), token-based invite flow,
  stricter minor-read access logging.

## Home-page retro arcade basketball shooter (2026-07-02)

Replaced the spinning 3D ball in the home BentoGrid tile with a playable early-arcade
basketball game and a shared, server-side high-score table. Branch feat/arcade-shooter,
based on main (production line). Built for review, not auto-deployed.

### What shipped
- Game: three.js (react-three-fiber, reused from the old ball) rendered low fidelity
  (flat shading, low internal resolution upscaled with image-rendering pixelated) with
  a CRT shell (scanlines, vignette, glow, pixel font Press Start 2P self-hosted by
  next/font). Aim (mouse, drag, or arrow keys), hold-to-charge power, shoot on release
  or space. Deterministic projectile physics with a scoring sphere at the rim; makes in
  a row are the score; a miss ends the run. Difficulty ramps by streak: hoop sway from
  streak 5, distance from 6, crosswind from 8.
- Shared leaderboard: ArcadeScores collection (public create + read of non-hidden rows,
  admin hide/delete), the arcade_scores table created in the production Supabase
  (ca-central-1, Canadian residency) with RLS enabled to match the rollout. Fingerprint
  is a hashed IP, never shown. A public report endpoint increments a report count and
  auto-hides at 5 reports pending admin review.
- Name safety: an authoritative, isomorphic filter runs on the SERVER (collection hook)
  and mirrored on the client for instant feedback. Normalizes (lowercase, strip accents,
  leetspeak fold, repeat collapse), blocks a maintained profanity and slur list as whole
  words and substrings, and rejects URLs, emails, phones, handles, and unsafe characters.
  Reuses the existing honeypot, durable rate limit, and Turnstile gates. Errs toward
  rejection. Honest code comments note no filter is perfect, which is why reporting and
  moderation exist.
- Accessibility and performance: keyboard playable with visible focus, an aria-live
  announcer, clear instructions, a sound toggle (default OFF, remembered), and a calm
  mode (auto for prefers-reduced-motion, plus a toggle) that removes shake and flash and
  slows spin. Lazy loaded and WebGL-gated with a static fallback (shows the live scores);
  three.js stays code-split so the home page first-load JS is unchanged at 116 kB.

### Difficulty and physics tuning (values that felt right)
Everything is in GAME_CONFIG (src/components/fx/arcade/gameConfig.ts). Tuned with a
headless physics playtest (scripts/arcade-playtest.ts) modelling two player skill levels
as noise on aim, power, and release timing, over 4000 runs each. Adjusted one group at a
time (forgiveness and power range, then the ramp).

Final values: launch angle 52 deg, gravity 9.2, power 6.6 to 9.6, makeForgiveness 0.9,
rimBand 0.32, aim yaw range 26 deg; sway from streak 5 (grow 0.14 per make, cap 1.9),
distance from streak 6 (0.45 every 2 makes, cap 3.4), wind from streak 8 (0.07 per make,
cap 0.75).

Playtest result vs targets:
- New player (loose aim and power): first-shot make 50 percent, one of first three
  88 percent (welcoming). Average streak 1, rarely reaches 5. Target met.
- Focused player (tight aim and power): median streak 8 (the 5 to 8 sweet spot), reaches
  5 in 71 percent of runs and 8 in 56 percent, but past 12 only 20 percent and past 15
  only 2.4 percent (rare and earned). Target met.
- One attempt runs a few seconds; difficulty rises smoothly across staggered ramps.
Note: this is a physics simulation. Final human feel (aim and power on mouse vs touch vs
keyboard) still wants a manual pass on a phone and a laptop before public launch.

### Gate
| Check | Result |
|---|---|
| tsc noEmit (source) | clean, 0 errors outside stale .next/types |
| npm run lint | clean |
| npm run build | exit 0; home first-load 116 kB (three.js code-split, lazy) |
| npm test (vitest) | 392 of 392 pass, 47 files |
| Name filter unit tests | 57 pass (explicit, slurs, leetspeak, spaced, accented, URL, email, phone, charset, length; allows normal names) |
| Physics unit tests | 8 pass (winnable, forgiveness is a real knob, ramp works) |
| Server-gate integration tests | 7 pass (rejects bad and leetspeak name even when client bypassed, honeypot, rate limit, Turnstile required, read filter) |
| Playwright e2e | 1 pass (start, streak of 5, game over, clean name appears on the table, bad name rejected) |
| Payload types regenerated | yes |
| Migration created and applied to prod | yes (arcade_scores, RLS enabled, owner payload_app, 0 rows) |

### Manual checklist before public launch (needs a human)
- Confirm the ball reads clearly as a basketball and the retro feel lands on real screens.
- Play on a phone (drag to aim, hold to charge) and a laptop (mouse and keyboard); confirm
  the keyboard-only path is fully playable.
- Set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET to arm the bot challenge on score
  submission (today they are unset, so the challenge is disabled by design).
- Expand the blocklist as needed; it updates on the next deploy.

### Not done by design
- Scores are client-reported (the game runs in the browser), so this is a fun leaderboard,
  not an anti-cheat system. It is guarded by a believable score ceiling, Turnstile, rate
  limits, public reporting, and admin moderation, not by trusting the client.
- Not deployed. The code is on feat/arcade-shooter for review; the prod table is ready.
