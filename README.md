This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## TeamLinkt integration (hybrid: native render + iframe fallback)

The schedule page (`/calendar`, also aliased at `/schedule`) and `/standings`
read TeamLinkt's league JSON endpoints **server-side** and render them in the
app's own design. If those endpoints change or return nothing, the pages
automatically fall back to TeamLinkt's official iframe, so users never see a
blank page. TeamLinkt stays the source of truth for scores, standings, and
account actions; login / score reporting / account deep-link to
`app.teamlinkt.com` (we never proxy or replicate TeamLinkt auth, and never invent
scores/standings).

Note: the JSON endpoints are undocumented/private and may change without notice;
the iframe fallback is what keeps these pages working if they do. They must be
called server-side (CORS blocks browser calls).

Copy `.env.example` to `.env.local` and set (IDs change each season, so they live
in env, never in components):

- **`TEAMLINKT_LEAGUE_BASE`**: e.g. `https://leagues.teamlinkt.com`
- **`TEAMLINKT_ASSOC_ID`**: CMBA association id (e.g. `34176`)
- **`TEAMLINKT_SEASON_ID`**: current season/league id (e.g. `50938`)
- **`TEAMLINKT_LEAGUE_SLUG`**: e.g. `calgaryminorbasketballassociation`
- **`NEXT_PUBLIC_TEAMLINKT_APP_URL`**: base URL for deep-links
  (default `https://app.teamlinkt.com`)

Endpoint responses are cached for an hour (`revalidate: 3600`), with an 8s
timeout; any failure returns an empty result and triggers the iframe fallback.

## CMBA Connect backend (Payload CMS 3)

The people-development + website-CMS backend runs **inside this same Next.js app**
via [Payload CMS 3](https://payloadcms.com). Payload owns the admin panel
(`/admin`), auth, the REST/GraphQL API (`/api/*`), and the content/profile data
model. **All personal data stays in Canada** (Supabase ca-central-1, Supabase
Storage ca-central-1, AWS SES ca-central-1, Vercel `yul1`). TeamLinkt remains the
league system of record for registration, schedule, and scores.

> The full specs live in `cmba-backend-build/docs/` and decisions are logged in
> [`docs/BACKEND_NOTES.md`](docs/BACKEND_NOTES.md). Verification results are in
> [`docs/VERIFICATION.md`](docs/VERIFICATION.md); the processor/residency register
> is [`docs/processors.md`](docs/processors.md).

### App structure
- `src/app/(frontend)/` — the public "Off+Brand" site (its own root layout).
- `src/app/(payload)/` — Payload admin (`/admin`), REST (`/api/[...slug]`),
  GraphQL (`/api/graphql`).
- `src/payload.config.ts` — Payload config; `src/collections/` — collections;
  `src/access/` — access-control helpers (default deny). `src/payload-types.ts` is
  generated — run `npm run generate:types` after changing collections.
- The static "league resources" page moved from `/admin` → **`/resources`**
  (Payload now owns `/admin`).

### Requirements
- **Node 20 or 22 LTS recommended.** Node 24 works for the app and `next build`,
  and for the Payload CLI **only because the project is ESM** (`"type": "module"`).
  Node 22 LTS is the safe choice for CLI commands (`generate:types`, `migrate`,
  `seed`).

### Setup
1. Provision the Canadian infrastructure per
   `cmba-backend-build/docs/PROVISIONING_CHECKLIST.md` (Supabase project +
   public/private buckets, AWS SES, Vercel region `yul1`).
2. Copy `.env.example` → `.env` and fill in `PAYLOAD_SECRET`, `DATABASE_URL`,
   the `S3_*` storage vars (incl. `S3_BUCKET_PUBLIC` / `S3_BUCKET_PRIVATE`), and
   the `SES_*` email vars. Generate a secret with `openssl rand -base64 32`.
3. `npm install`
4. Apply the schema: `npm run migrate` (migrations are the single source of
   truth — dev push is off). After changing collections, run
   `npm run migrate:create <name>` then `npm run migrate`. Then `npm run dev`.

> **Connection strings (Supabase):** use the **direct** connection
> (`db.<ref>.supabase.co:5432`) for local dev/migrations, and the **session
> pooler** (`postgresql://<role>.<ref>:<pw>@aws-1-ca-central-1.pooler.supabase.com:5432/postgres`)
> for Vercel serverless. Use a **least-privilege** DB role (not the `postgres`
> superuser) — see `docs/BACKEND_NOTES.md`.

### Create the first super-admin
After `DATABASE_URL` + `PAYLOAD_SECRET` are set:

```bash
CREATE_ADMIN_EMAIL=you@cmba.ab.ca \
CREATE_ADMIN_PASSWORD='a-strong-unique-password' \
CREATE_ADMIN_NAME='Your Name' \
npm run create-admin
```

This creates (or promotes) a `super_admin` via Payload's Local API. Alternatively,
visit `/admin` on a fresh database — Payload prompts to create the first user —
then promote it to `super_admin` by re-running the command above with the same
email. Use a strong, unique password and enable 2FA when available.

### Useful scripts
- `npm run generate:types` — regenerate `src/payload-types.ts` from the config.
- `npm run generate:importmap` — refresh the admin import map after adding custom
  components.
- `npm run migrate:create` / `npm run migrate` — create / apply DB migrations.
- `npm run seed` — seed catalog data (Clubs, CertificationTypes, Courses,
  Pathways — populated in Phase 1).

### Background jobs (Vercel Cron)

Two protected cron routes (declared in `vercel.json`, region `yul1`). Both require
`Authorization: Bearer $CRON_SECRET` and **fail closed** if `CRON_SECRET` is unset.

- `GET /api/cron/certification-reminders` (daily): refreshes each certification's
  cached status from its expiry, and emails the owner at 60 / 30 / 7 days before
  expiry and on lapse. Emails contain **no PII** — just a portal link.
- `GET /api/cron/retention-review` (weekly): flags (does not delete) accounts
  inactive beyond the retention window for Privacy-Officer review.

### Right to erasure

`POST /api/admin/erase-user` (super-admin only) with `{ "userId": <id> }` removes
a member's certifications, **private certificate files (DB + Supabase Storage)**,
and consent records, then the account — unless the account is under a **legal
hold** (`legalHold` on the user), in which case it returns 409. Members can export
their own data anytime from `/account` (`/api/account/export`).

### Breach / incident runbook (PIPEDA)

Log **every** privacy/security incident in the **Incident Log** (`/admin` →
Incident Log; super-admin only), whether or not it requires notification.

1. **Contain** the incident; record it in the Incident Log (severity, what
   happened, when discovered).
2. **Assess** whether it poses a *real risk of significant harm* (RROSH). If yes,
   set `realRiskOfSignificantHarm`.
3. **Notify** (when RROSH): the **Office of the Privacy Commissioner of Canada**
   and affected individuals as soon as feasible; record `opcNotifiedAt` /
   `individualsNotifiedAt` and `affectedCount`. Alberta's OIPC where applicable.
4. **Remediate** and record the fix; move status to Contained → Closed.
5. **Retain** the record — PIPEDA requires keeping a log of all breaches.

The **Privacy Officer** contact lives in Site Settings (`/admin` → Site Settings)
and is surfaced in the Privacy Policy.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Stage B: Scheduling, Scores, Standings, Officials

CMBA Connect is the source of truth for the schedule, scores, standings, and
officials. See `docs/SCHEDULING_BUILD_PLAN.md` (the build blueprint),
`docs/FEATURE_GAP_ANALYSIS.md`, `docs/API.md` (the `/api/v1` contract),
`docs/SEASON_GUIDE.md` (how to run a season), and `docs/VERIFICATION.md`.

Admin scheduling consoles live under `/manage` (import, schedule, contested,
officials); team reps report and confirm scores at `/rep`. The native apps use the
versioned `/api/v1` with `Authorization: JWT` token auth and an `Idempotency-Key`
header on writes.

Operator scripts:

- `npm run smoke:b1` ... `npm run smoke:b5` run live integration smokes against the
  ca-central-1 DB (they create and clean up their own test data).
- New env: `FEATURE_LEGACY_TEAMLINKT` (keep the TeamLinkt fallback until a season is
  seeded), `FEATURE_TEAM_ICS` (team calendar feeds), `MIN_SUPPORTED_APP_VERSION`,
  and the SES_SMTP_* values for real email delivery. See `.env.example`.
