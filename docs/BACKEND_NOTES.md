# CMBA Connect — Backend Notes (decisions log)

Living record of backend decisions for the Payload CMS 3 build. Newest phase at
the bottom. The source-of-truth specs live in `cmba-backend-build/docs/`.

---

## Phase 0 — Foundation (in progress)

### Framework upgrade (required by Payload 3)
- Payload 3.85.1 peer-requires **Next.js ≥ 15.2.9 + React 19**. The repo was on
  Next 14.2 / React 18, so the build began by upgrading to **Next 15.3.9 +
  React 19.2** (and `eslint-config-next` 15.3.9, `@types/react`/`-dom` 19).
- The public "Off+Brand" site was re-verified after the upgrade: `npm run build`
  is green and all public routes render. No app code changes were needed for the
  upgrade itself (no usage of the now-async `cookies()/headers()/params`).

### `"type": "module"` + Node version gotcha
- The project is now an **ESM package** (`"type": "module"` in package.json),
  matching the Payload 3 template. Without it the `payload` CLI's tsx loader
  fails on Payload's top-level await.
- **Node 24 is newer than Payload's supported runtime.** The `payload` CLI
  (generate:types, generate:importmap, migrate, seed) works under Node 24 **only
  with `"type": "module"`**. Node 22 LTS is installed via Homebrew
  (`/opt/homebrew/opt/node@22`) as a fallback if any CLI command misbehaves on
  24. The Next dev server / `next build` use the system Node (24) fine.
- `@swc-node/register` + `@swc/core` are present as a `--use-swc` loader fallback
  for the Payload CLI.

### App structure — route groups
- `src/app` was split into two **route groups** so the admin panel does not
  inherit the public-site chrome:
  - `src/app/(frontend)/…` — all existing public pages + the site layout
    (Header/Footer/MobileNav, globals.css). This is a root layout (own html/body).
  - `src/app/(payload)/…` — Payload admin (`/admin/[[...segments]]`), REST API
    (`/api/[...slug]`), GraphQL (`/api/graphql`, `/api/graphql-playground`), and
    Payload's own root layout.
- There is intentionally **no `src/app/layout.tsx`** (Next "multiple root
  layouts"); `favicon.ico` stays at `src/app/`.
- `@payload-config` is resolved via a **tsconfig `paths`** entry (withPayload
  does not set this alias itself).

### Gotcha #1 — `/admin` route collision (RESOLVED)
- Payload's management panel now owns **`/admin`**.
- The pre-existing static "league resources / operations" page moved from
  `src/app/admin/page.tsx` → **`src/app/(frontend)/resources/page.tsx`** (served
  at `/resources`).
- In-app links updated: Header top-hat "Admin" → "Resources" (`/resources`);
  Footer "Admin Portal" → "League Operations" (`/resources`). MobileNav had no
  `/admin` link. Old `/admin` bookmarks now reach the Payload panel by design.

### Gotcha #2 — `/login` is a role chooser, not auth
- Deferred to **Phase 1**: convert `/login` to real Payload email/password auth
  while keeping the role-hub cards for signed-out users. (Phase 0 left `/login`
  as-is.)

### Data layer (Phase 0 collections)
- **Users** (auth): email/password with login hardening (max 5 attempts, 10-min
  lock, 2-hour token), `Lax`+secure cookies. Core profile fields + `roles`
  (admin-only field) + `status`. Consents/guardian/isMinor + the server-side
  consent-enforcement hook + public self-registration land in **Phase 1**.
- **Media** (PUBLIC bucket): images only, with `thumbnail/card/hero` sizes;
  `read` is public; served directly from Supabase public URLs
  (`disablePayloadAccessControl: true`).
- **CertificateFiles** (PRIVATE bucket): PDFs/images; Payload access control kept
  ON so downloads route through the access-checked endpoint (owner or super-admin
  only; never public). `disableLocalStorage: true`.

### Storage / email / residency
- **Two `s3Storage` plugin instances** point at Supabase Storage (ca-central-1):
  one for the public bucket (`S3_BUCKET_PUBLIC`), one for the private bucket
  (`S3_BUCKET_PRIVATE`). Path-style addressing (`forcePathStyle: true`).
- **Email** via `@payloadcms/email-nodemailer` → AWS SES SMTP (ca-central-1)
  when `SES_SMTP_HOST` is set; otherwise nodemailer `jsonTransport` (no network)
  so dev/build never hang or send.
- **Vercel** pinned to **`yul1`** in `vercel.json` (+ cron stubs for Phase 2).
- `next.config.mjs` allows `**.supabase.co` image hosts.

### Secret handling
- `PAYLOAD_SECRET` falls back to a clearly-labelled dev placeholder so
  config/type-gen/build work before secrets are provisioned, but the config
  **throws at production runtime** if the real secret is missing (the build phase
  is exempted via `NEXT_PHASE`).

### First super-admin
- `scripts/create-admin.ts` (`npm run create-admin`) creates/promotes a
  super-admin via the Local API (idempotent). See README. Requires
  `DATABASE_URL` + `PAYLOAD_SECRET`.

### Database — provisioned (Supabase ca-central-1)
- Project **`cmba-connect`**, ref **`pdwautioosstdgbbblxl`**, region
  **ca-central-1** (Montréal), created via the Supabase MCP on 2026-06-18. (An
  older `cmba_app` Supabase project exists in **us-east-2** — NOT used here; wrong
  region for personal data.)
- **Least-privilege DB role `payload_app`** (LOGIN; full privileges on schema
  `public` only) created via MCP `execute_sql` — Payload connects as this role,
  not the `postgres` superuser. The password lives only in the gitignored `.env`.
- **Connection strings:** local dev/migrations use the **direct** host
  (`db.pdwautioosstdgbbblxl.supabase.co:5432`, IPv6 — works from this machine).
  Vercel serverless should use the **session pooler**
  (`aws-1-ca-central-1.pooler.supabase.com:5432`, user `payload_app.<ref>`); the
  `aws-0-*` pooler host does NOT exist for this project.
- **Migrations only** (`push: false`): `src/migrations/20260618_195338_initial.ts`
  is committed and applied; `payload_migrations` records it.

### Storage / SES still pending (operator step)
- Supabase **S3 access keys** are generated in the dashboard (Storage → S3) and
  are not exposed by the MCP — `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` are
  blank in `.env`. Uploads (profile photos, certificate files) need these, plus
  the two buckets (`cmba-public`, `cmba-private`) created with the private one
  kept non-public. SES SMTP creds (ca-central-1) likewise pending; email
  currently uses nodemailer `jsonTransport` (no-op).

---

## Phases 1–3 — summary (detail in docs/VERIFICATION.md)

- **Phase 1:** full data model (Clubs, CertificationTypes, Certifications, Courses,
  Pathways, ConsentRecords + PolicyVersions global); server-enforced consent
  sign-off + guardian/minor flow; real `/login` auth + consent registration;
  middleware-gated `/account` (compliance, cert download, pathway, data export);
  `/coach/pathway`, `/coach/courses`, `/ref` on live data (no mock progress);
  athlete/parent strips; legal pages; Vitest suite. Migrations-only throughout.
- **Phase 2:** expiry-reminder + retention crons (CRON_SECRET, fail-closed);
  IncidentLog + breach runbook; SiteSettings (Privacy Officer); admin erasure
  (legal-hold, DB + Storage); consent audit view (`/compliance/consent-audit`).
- **Phase 3:** Pages CMS (blocks, drafts/versions/autosave, SEO, Live Preview);
  block library + RenderBlocks; catch-all `/[slug]`; Announcements + homepage
  strip; HeaderNav/FooterNav globals; legal docs published as CMS pages
  (markdown→lexical) with static fallback.

### Key cross-cutting decisions
- **Auth:** Bearer (`Authorization: JWT`) for API; cookie auth for browser/server
  components. Payload CSRF allowlist auto-includes the serverURL — cookie auth
  needs a browser `Sec-Fetch-Site`/`Origin` (real browsers send these); headless
  clients are rejected by design.
- **Performance:** shared layout (Header/Footer) and the homepage stay static; the
  announcements strip is client-fetched so the homepage isn't forced dynamic.
- **Migrations** are the single source of truth (4 committed): initial, phase1,
  phase2, phase3. Run `npm run migrate` after pulling.

---

## Access control decision: the `scheduler` role (2026-07-30)

**Decided with the operator during the scheduler overhaul.** Confirmed before any
role structure changed, per the module brief.

### The problem

The whole manage area required `club_admin` or `super_admin`. A lead scheduler is
a volunteer who runs the season: the schedule, the officials board, the imports,
and the playoff brackets. Making them a club admin to do that also handed them
user management, role assignment, and site settings, which is far more authority
than the job needs. Making them a super admin is worse.

### The decision

Add a seventh role, `scheduler`, plus a capability helper. Three options were put
to the operator (reuse `league_official`; a per-user `schedulingAccess` flag; a
new role) and the new role was chosen.

- `ROLES` gains `{ label: 'Scheduler', value: 'scheduler' }` in
  `src/access/index.ts`.
- `scheduler` is in `ADMIN_ASSIGNED_ROLES`, so `sanitizeSelfServiceRoles` strips
  it from any self-service update. **It can never be self-granted** at signup or
  from the account page. Only an admin can assign it.
- `canManageScheduling(user) = isAnyAdmin(user) || isScheduler(user)` gates
  `/manage` and everything under it, and the admin scheduling routes: game
  override, game officials, bulk games, bulk officials, brackets, and the CSV
  import validate/commit endpoints.
- `isLeagueWideScheduler(user) = isSuperAdmin(user) || isScheduler(user)`
  expresses "works across the whole league". A club admin stays scoped to games
  involving their own club; a scheduler is not scoped, because running a season
  means touching every division.

### What a scheduler deliberately CANNOT do

These stay on `isAnyAdmin` / `isSuperAdmin` and were verified by negative tests in
`src/access/__tests__/schedulerRole.test.ts`:

| Capability | Gate | Scheduler |
|---|---|---|
| Edit a game that already has a final result | `isSuperAdmin` | no |
| User management, role assignment | `isAnyAdmin` / `superAdminFieldOnly` | no |
| Site settings, Payload admin panel | `isAnyAdmin` | no |
| Member card scanner (`/scan`, `/verify`) | `canScan` | no |
| Scan analytics, pass and device revocation | `isVerificationAdmin` | no |
| Credential review, certification requirement matrix | `isAnyAdmin` | no |

Editing a finalized game stays super-admin-only on purpose: it rewrites the
standings. A scheduler resolves a disputed result by marking it contested and
escalating, which is the existing flow.

### Migration

`src/migrations/20260731_032821_add_scheduler_role.ts` adds `scheduler` to
`enum_users_roles` and to the four other role enums Payload derives from the same
options list (`certification_types_applies_to_roles`,
`certification_types_required_for_roles`, `courses_required_for_roles`,
`member_card_config_scannable_roles`). It is additive and backward compatible:
the source-level union change is inert until a row actually uses the value, so
the code can deploy before or after the migration is applied.

Generated offline (`payload migrate:create` diffs the config against the in-repo
snapshot and needs no database). **Not applied anywhere.** It reaches production
through the normal deploy `migrate` step, operator-driven, per the standing rule
never to run `migrate` against production ad hoc.

### Operator action

Once the migration is applied, assign `Scheduler` to the lead scheduler's user
record in the Payload admin panel. No other change is needed; the manage area
opens to them immediately and nothing else does.
