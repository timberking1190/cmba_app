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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
