# External assessment scope and readiness (one page)

For the independent penetration testing firm and the privacy reviewer. This is the
short brief; the detailed evidence package is linked at the end.

Prepared: 2026-07-01. Owner: CMBA Connect (contact security@cmba.ab.ca).

## What the system is

CMBA Connect is the Calgary Minor Basketball platform: a Next.js 15 (App Router)
front end with a Payload CMS 3 backend, serving public content plus member areas for
coaches, referees, team reps, guardians, and admins (rules, schedule, standings,
certification tracking, game reports, challenges, quizzes). It handles personal data
including data about minors. All personal data is stored and processed in Canada.

## Environment and boundaries

- Hosting: Vercel (region yul1, Montreal). Database and file storage: Supabase
  Postgres and Storage (ca-central-1). Email: AWS SES (ca-central-1).
- Public site and member areas at the production URL; a Vercel preview can be
  provided for a non-production target on request.
- Trust boundaries and data flows: `docs/THREAT_MODEL.md` (STRIDE plus a data flow
  diagram with residency assertions at each store).

## Standards we assert

- OWASP ASVS 5.0 Level 2 across the app; Level 3 for admin, children's data,
  certification documents, and score reporting. Crosswalk in `docs/SECURITY.md`.
- NIST SP 800-63B-4 for authentication (AAL2 for members, phishing-resistant step-up
  for admins). Crosswalk in `docs/SECURITY.md`.
- PIPEDA and Alberta PIPA for privacy; Canadian data residency throughout.

## In scope

Public site, member and admin areas, the `/api/v1` and `/api/cron` surfaces, auth and
MFA (passkeys, TOTP, recovery codes, email OTP), access control and IDOR, file
upload and private document access, the game report and score flows, CSV import, and
the CSP and security headers. Full checklist: `docs/PENTEST_READINESS.md`.

## Out of scope

Third-party platforms we integrate with but do not control (TeamLinkt, Supabase, AWS,
Vercel, Cloudflare Turnstile, HIBP) beyond how we call them. No denial-of-service or
volumetric testing. Please do not access, modify, or exfiltrate real personal data;
use the provided test accounts.

## Test accounts and access

Test accounts (active and expired subscription equivalents, plus each role) and any
credentials are provided out of band on engagement start. See
`docs/PENTEST_READINESS.md` (Test accounts).

## Readiness status (what to expect)

- Implemented and self-tested: strict-nonce CSP, security headers, default-deny
  access control with adversarial tests, MFA, tamper-evident audit log, rate limiting,
  safe error handling, PII-free logging and email, DSAR export and erase, email health
  surface. 320-plus unit and integration tests pass in CI (lint, typecheck, tests,
  gitleaks, dependency audit, Semgrep).
- Known accepted residuals (please confirm, do not re-discover from scratch): a set of
  framework-transitive dependency advisories pinned by the Payload and Next peer range
  (`.audit-allowlist.json`, `docs/SECURITY.md`); `style-src 'unsafe-inline'`; deferred
  application-layer field encryption. Details and rationale in `docs/PENTEST_READINESS.md`.
- Interim automated dynamic scan: OWASP ZAP baseline is wired (`docs/DAST_ZAP.md`),
  pending a reachable preview URL.

## For the privacy reviewer

- PIA under PIPEDA and Alberta PIPA: `docs/PRIVACY_IMPACT_ASSESSMENT.md` (data
  inventory, consent, minors and guardian handling, data subject rights, retention,
  residency, risk table, open items).
- Processor register and DPA status: `docs/PROCESSOR_REGISTER.md`. DPAs with Supabase,
  AWS, and Vercel are pending signature (launch blocker). Confirm sub-processor
  Canada-residency and the CLOUD Act sovereignty note there.
- Observability processors (error monitoring and privacy-respecting analytics) are
  disclosed in the processor register and the privacy policy once wired.

## Evidence package

`docs/SECURITY.md` (control matrix + ASVS and 800-63B-4 crosswalks) ,
`docs/THREAT_MODEL.md` , `docs/PRIVACY_IMPACT_ASSESSMENT.md` ,
`docs/PROCESSOR_REGISTER.md` , `docs/PENTEST_READINESS.md` , `docs/INCIDENT_RESPONSE.md` ,
`docs/DAST_ZAP.md` , `docs/VERIFICATION.md` , `public/.well-known/security.txt`.
