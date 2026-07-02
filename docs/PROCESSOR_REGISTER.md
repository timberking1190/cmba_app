# CMBA Connect - Processor Register

This register lists every third party that may process personal data on behalf of
CMBA Connect, or that supports the running service. It is the working companion to
`cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md` (the residency and PIPEDA
narrative) and to the operator notes in `docs/processors.md`.

A note on language: a "processor" handles personal data on our instructions. A
"supporting service" keeps the service running but is not designed to hold member
personal data. We list both here, and we are honest about which is which. We also
distinguish residency (data physically kept in Canada) from sovereignty (the
provider being beyond the reach of foreign legal process). Supabase, AWS, and
Vercel keep data in Canada (residency) but are US-headquartered, so they can be
subject to US legal process such as the CLOUD Act. That is recorded and accepted in
the data residency document; it is not full sovereignty.

Status of this register: all Data Processing Agreements (DPAs) below are marked
REQUIRED and are pending. None are signed yet. Signing the DPAs with Supabase, AWS,
and Vercel (and confirming each one's sub-processors are Canada-resident) is a
launch blocker, called out in `docs/SECURITY.md` under "Required external
assurance" and in the data residency document.

## Register

| Processor | Purpose | Data categories | Region / residency | DPA status | Sub-processors | Notes |
|---|---|---|---|---|---|---|
| **Supabase** (Postgres database + Storage object store) | Primary data store for all application data, and object storage for files. Two storage buckets: one PUBLIC (page and profile images), one PRIVATE (certificate files, scoresheet photos, incident photos). | Member contact data, roles, consent records, certifications, team memberships, scores and game data, audit log, and the contents of uploaded files (including youth scoresheet photos in the private bucket). The most sensitive category. | **ca-central-1 (Montreal)**, chosen at project creation; native backups stay in region. Confirmed live as project `cmba-connect` (ref `pdwautioosstdgbbblxl`). | **REQUIRED - pending.** Sign Supabase DPA before launch and confirm its sub-processors are Canada-resident. | Supabase runs on cloud infrastructure (AWS) for the ca-central-1 region; the operator must confirm the sub-processor chain stays in Canada when signing the DPA. | Connected via `@payloadcms/db-postgres` (session pooler `aws-1-ca-central-1` in serverless) and `@payloadcms/storage-s3` (path-style, `S3_REGION=ca-central-1`). Private bucket keeps Payload access control on (gated, access-checked downloads, never public). EXIF/GPS is stripped from photos on upload. Encryption at rest is provided by Supabase. |
| **AWS SES** (Simple Email Service) | Transactional email only: certification expiry reminders, score-report requests, contested-game escalations, official-assignment notices, guardian-confirmation links, and (recovery only) email one-time passcodes. | Recipient email address, and the email body. Bodies are written to contain **no PII**: they link to the portal rather than carrying personal detail. | **ca-central-1**, sent over SMTP in that region (`email-smtp.ca-central-1.amazonaws.com`). | **REQUIRED - pending.** Sign the AWS DPA before launch. | AWS internal services within the region. | **Not yet provisioned.** Until `SES_SMTP_*` is set, the app falls back to nodemailer `jsonTransport` (no network, nothing sent). Code paths, recipients, and no-PII bodies are exercised in tests; only real delivery is pending. See `docs/SES_SETUP.md`. Email OTP recovery (`FEATURE_EMAIL_OTP`) stays off until SES is live. |
| **Vercel** (hosting and serverless compute) | Runs the Next.js / Payload application: serves pages, runs API routes and cron jobs, terminates TLS. | In transit, all request and response data passes through compute, which can include personal data while a request is served. Vercel is not designed as our data store; persistence is in Supabase. Logs are scrubbed of PII by design (see notes). | **yul1 (Montreal).** Functions must be pinned to `yul1` (Vercel default is US `iad1`); pinned via `vercel.json` and project settings. Live at `cmbaplatform.vercel.app`. | **REQUIRED - pending.** Sign the Vercel DPA before launch and confirm function/region pinning is enforced. | Vercel's own edge and compute infrastructure providers; the operator must confirm region pinning so personal data is not processed outside Canada. | TLS is terminated here; HSTS is emitted in production. No personal data is placed in URLs or logs (a verification-gate check). Cron endpoints are protected by `CRON_SECRET` and fail closed when it is unset. |
| **Cloudflare Turnstile** (optional bot challenge) | Optional privacy-respecting CAPTCHA on the public game-report form, to deter automated abuse. No behavioural profiling. | The visitor's IP address is seen by Cloudflare during a challenge (standard for any CAPTCHA). No member account data is sent. The server only receives a pass/fail token to verify. | Cloudflare global edge (a challenge can be served from outside Canada). | **REQUIRED if enabled - pending.** If Turnstile is switched on, sign or rely on Cloudflare's DPA and record it here. | Cloudflare's own infrastructure. | **Off by default.** Disabled unless both `TURNSTILE_SECRET` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set. When off, rate limiting and the honeypot still apply. When on, it fails closed. Because it can see an IP and runs on global edge, treat it as a processor and confirm residency posture before enabling. |
| **HaveIBeenPwned** (HIBP, breached-password screening) | Checks a new or changed password against known breach corpora during the 800-63B password policy check, so members cannot pick a known-compromised password. | **No PII and no full password leaves the server.** Only the first 5 characters of the password's SHA-1 hash (a k-anonymity range prefix) are sent. HIBP cannot recover the password or identify the user. | HIBP global service (request can be served outside Canada). | **Not a personal-data processor** (k-anonymity prefix only). No DPA strictly required on data-processing grounds; record the dependency for completeness. | HIBP's own infrastructure (e.g. its CDN). | Implemented in `src/lib/security/hibp.ts`: 5-char SHA-1 prefix, Add-Padding header, ~2.5s timeout, **fails open** on outage so an HIBP problem never blocks a legitimate password change. Asserted in tests that the full password/hash never leaves the server. |
| **TeamLinkt** (external registration and schedule source) | The legacy league platform. CMBA Connect reads TeamLinkt's league JSON server-side to render schedule/standings in our own design (with the TeamLinkt iframe as an automatic fallback), and deep-links members to TeamLinkt for registration, score reporting, and account actions. | **Read-only public league data** (schedules, standings). We do **not** collect TeamLinkt credentials, proxy their auth, or hold member registration/payment data; that stays in TeamLinkt. | TeamLinkt's own hosting (external, not selected by us for residency). | **Not our processor.** TeamLinkt does not process personal data on our behalf; it is an upstream source and a destination we link to. No DPA owed by us as a controller-to-processor relationship; the member's relationship is with TeamLinkt directly for those actions. | TeamLinkt's own infrastructure. | Configured from env (IDs change each season; never hardcoded). `FEATURE_LEGACY_TEAMLINKT` keeps the fallback until a real season is seeded; the cutover (flag false) is an operator step. Once cut over, CMBA Connect is the source of truth and TeamLinkt is used only for the one-time CSV import and registration deep-links. |
| **Sentry** (error monitoring) | Receives diagnostic error reports so faults can be found and fixed. Not a data store and not a behavioural tracker. | **Diagnostic error events, configured to exclude personal data.** `sendDefaultPii` is off and `scrubEvent` removes the user object (including IP), cookies, authorization headers, request bodies, and query strings before send. No names, emails, accounts, or child data. | Sentry region is chosen at project creation; **create it in the EU region.** Sentry is US-headquartered, so diagnostics may be processed outside Canada and can be subject to US legal process. They carry no personal data. | **REQUIRED if enabled - pending.** Sign Sentry's DPA before turning it on. | Sentry's own infrastructure. | **Off by default.** Disabled unless `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set. No session replay. Init in `src/instrumentation.ts` and `src/components/Observability.tsx`; scrubbing in `src/lib/observability/sentry.ts`. Disclosed in the privacy policy. |
| **Vercel Web Analytics + Speed Insights** (usage analytics + Web Vitals) | Aggregate page-view and Web Vitals measurement, plus a few named engagement event counts (challenge submitted, quiz completed) to measure use of the member-value features. | **No personal data.** Cookieless and aggregate, no user identifier attached, no cross-site tracking, no advertising. Events carry only non-personal enums. IP is not stored by us. | Vercel processes analytics in the US; the data is aggregate and non-identifying. | **Covered by the Vercel DPA (same provider) - pending.** | Vercel's own infrastructure. | Enabled in the Vercel dashboard (no key). No-op off Vercel and in local dev. Mounted in `src/components/Observability.tsx`; events in `src/lib/observability/events.ts`. Children are never profiled. Disclosed in the privacy policy. |

## DPA checklist (launch blocker)

Complete before any public registration launch. Mirrors `docs/SECURITY.md`
("Required external assurance") and the data residency document.

- [ ] **Supabase DPA signed** (database + storage). Confirm sub-processors are
  Canada-resident; confirm ca-central-1 region for data and backups.
- [ ] **AWS DPA signed** (SES). Provision SES in ca-central-1, verify the
  `EMAIL_FROM` domain, then set `SES_SMTP_*`. See `docs/SES_SETUP.md`.
- [ ] **Vercel DPA signed** (hosting/compute). Confirm functions are pinned to
  `yul1` and that no function processes personal data outside Canada.
- [ ] **Cloudflare Turnstile**: only if it is enabled, record/sign Cloudflare's DPA
  and confirm the residency posture of an IP-bearing challenge.
- [ ] **HaveIBeenPwned**: record the dependency. No DPA required on data-processing
  grounds (k-anonymity prefix only, no PII), but note it in the register.
- [ ] **Sentry** (if enabled): sign Sentry's DPA, create the project in the EU
  region, and confirm no personal data is sent (sendDefaultPii off + scrubEvent).
  Board decision on a US-headquartered processor for non-personal diagnostics.
- [ ] **Vercel Web Analytics + Speed Insights**: confirmed cookieless and aggregate,
  covered by the Vercel DPA. Confirm no user identifier is attached and children are
  not profiled (aggregate event counts only).
- [ ] **TeamLinkt**: confirm it is documented as an upstream source / deep-link
  destination, **not** our processor. Note that members transact with TeamLinkt
  directly for registration, payment, and score reporting until cutover.
- [ ] **Sub-processor confirmation**: for each signed DPA, obtain and file the
  provider's current sub-processor list and confirm Canada residency for personal
  data, or record any accepted exception explicitly.
- [ ] **Keep this register current**: review on each new processor, each provider
  sub-processor change, and at least annually. Tie review to the Privacy Officer
  role named in Site Settings.

> Honesty note: residency is satisfied (data physically in Canada) but full
> sovereignty is not, because Supabase, AWS, and Vercel are US-headquartered and
> can be subject to US legal process. This is recorded and accepted in
> `cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md`. If the board later
> requires sovereignty, that is a separate decision to move to Canadian-owned
> providers.
