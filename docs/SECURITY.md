# CMBA Connect — Security Control Matrix (living document)

This is the auditor-facing map from each required control to where it is
implemented and how it is tested. It is maintained as Stage C (security
hardening) is built, phase by phase. See `cmba-backend-build/MODULE_SECURITY_PROMPT.md`
and `cmba-backend-build/docs/SECURITY_CONTROLS.md` for the source requirements.

## Standards targets

- OWASP ASVS 5.0 Level 2 across the app; Level 3 for admin, children's data,
  certification documents, and score reporting.
- NIST SP 800-63B-4 for authentication. AAL2 for normal accounts; step up to a
  phishing-resistant method for admins and sensitive actions.
- OWASP Top 10 (2021) as a minimum coverage check.
- PIPEDA and Alberta PIPA, plus the residency controls in
  `docs/DATA_RESIDENCY_AND_COMPLIANCE.md`. All personal data stays in Canada.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| S0 | Baseline hardening of the current site | Implemented (this commit) |
| S1 | Identity and authentication (passkeys, TOTP, OTP, MFA, sessions) | Planned |
| S2 | Authorization, data protection, application hardening | Partly in place from Stage A/B; to be completed in S2 |
| S3 | API security, monitoring, incident readiness | Partly in place from Stage B; to be completed in S3 |
| S4 | Children's data, registration readiness, evidence | Planned |

---

## S0 — Baseline hardening (implemented)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Security headers | nosniff, frame protection, Referrer-Policy, Permissions-Policy, COOP, HSTS w/ preload | `src/lib/security/headers.ts` (`staticSecurityHeaders`), applied in `src/middleware.ts` | `src/lib/security/__tests__/headers.test.ts`; runtime header check in `docs/VERIFICATION.md` |
| Content Security Policy | Strict policy; `default-src/object-src/base-uri/form-action` locked; allowlisted img/connect/font/frame/media; report-uri | `buildCsp` in `src/lib/security/headers.ts`; per-request nonce minted in `src/middleware.ts`; violations to `src/app/(frontend)/api/csp-report/route.ts` | `headers.test.ts`; runtime curl check |
| Clickjacking | Deny cross-origin framing | CSP `frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` (self is required so Payload Live Preview works) | `headers.test.ts` |
| CORS lockdown | Allowlist known origins; no wildcard with credentials | `cors` + `csrf` allowlist in `src/payload.config.ts` (`trustedOrigins`) | Manual preflight check (recorded in VERIFICATION) |
| Form abuse defense | Rate limiting + bot challenge on public forms | Durable per-IP + global rate limit + honeypot + optional Turnstile in `src/collections/GameReports.ts` (`beforeValidate`) using `src/lib/security/botChallenge.ts` and `src/lib/rateLimit.ts`; client honeypot/timing in `src/app/(frontend)/game-report/page.tsx` | `src/lib/security/__tests__/botChallenge.test.ts`, `src/lib/__tests__/rateLimit.test.ts` |
| PII minimization in limiter | No raw IP stored | `hashIp` (HMAC-SHA256, truncated) keys rate-limit rows | `botChallenge.test.ts` |
| Safe error handling | No stack traces / internal detail to clients | `safeClientError` in `src/lib/api/handler.ts`; CSP report sink swallows errors and 204s | `idempotency`/handler tests; code review |
| Secrets out of repo | No secrets committed; scanning in CI | `.env` gitignored (only `.env.example` tracked); gitleaks in `.github/workflows/security.yml` + `.gitleaks.toml` | CI `security.yml` (secret-scan job) |
| Dependency scanning | Fail build on NEW high/critical advisories in prod deps | `scripts/audit-ci.mjs` gate in `security.yml` (allowlist `.audit-allowlist.json`); Dependabot (`.github/dependabot.yml`) | CI |
| Static analysis | SAST in CI | Semgrep (`p/owasp-top-ten`, `p/javascript`, `p/typescript`, `p/react`, `p/secrets`) in `security.yml` | CI |
| Disclosure | security.txt with contact | `public/.well-known/security.txt` (RFC 9116) | Manual fetch |
| TLS / HSTS | Enforced transport security | Vercel terminates TLS; HSTS emitted in production by middleware | Runtime header check |

### CSP script-src strategy (important)

A nonce + `strict-dynamic` policy requires per-request dynamic rendering so Next
can stamp the nonce onto its inline bootstrap scripts; on a static page those
scripts ship without a nonce and a strict policy would block them (caught during
the S0 gate). Two strategies are supported via `buildCsp`:

- `strict-nonce` (DEFAULT, gold standard): `script-src 'self' 'nonce-…'
  'strict-dynamic'`. The public root layout reads the `x-nonce` request header,
  which forces dynamic rendering so Next applies the nonce to every script.
  Verified on real responses: 0 inline scripts without a nonce on the homepage and
  on `/admin`; all pages 200. TeamLinkt schedule/standings data stays cached for an
  hour via `unstable_cache` in `lib/teamlinkt`, so dropping page-level ISR does not
  increase upstream load.
- `compatible` (fallback): `script-src 'self' 'unsafe-inline'`. Enable with
  `CSP_COMPAT_SCRIPTS=true` only if a static export without nonce propagation is
  ever reintroduced.

### CSP rollout (operator action)

The policy enforces by default. For the FIRST preview deploy, set
`CSP_REPORT_ONLY=true` so the browser receives `Content-Security-Policy-Report-Only`
(nothing is blocked) and violations are logged to `/api/csp-report`. Confirm the
public pages AND `/admin` render with no violations, then unset to enforce.

### Accepted exceptions (S0)

- `style-src 'unsafe-inline'`: React/Next and the Off+Brand UI inject inline
  styles. Inline style is a low XSS risk and removing it would require a large
  refactor of third-party and framework styling. Revisit in S2.
- `img-src`/`media-src` allow Supabase Storage hosts (ca-central-1) only, plus
  `data:`/`blob:` for framework-generated images.

---

## Triaged dependency advisories (accepted, pending framework upgrade)

`npm audit` reports high/critical advisories that are entirely in framework-transitive
packages: `next` (DoS, middleware/proxy bypass, SSRF in image optimization),
`nodemailer`, and `undici`, pulled in via Payload 3.85.1 and Next 15.3.9. They are
baselined in `.audit-allowlist.json` (11 IDs as of 2026-06-29) so a NEWLY disclosed,
un-triaged advisory still fails CI.

- Remediation owner: operator. Upgrade Next.js to the latest patched 15.x and Payload
  to a compatible release, verify on a Vercel preview, then re-run `node scripts/audit-ci.mjs`
  to shrink the allowlist. REQUIRED before public registration launch and an input to
  the independent penetration test.
- Mitigations already in place reduce exposure of several of these: strict CSP +
  security headers (S0), CORS/CSRF lockdown, and the fact that the app has no public
  accounts yet.

## S1 — Identity and authentication (in progress, incremental)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Password policy (800-63B-4) | Min length, allow long passphrases + all chars, NO composition/rotation/hints | `validatePassword` beforeValidate hook (`src/collections/hooks/passwordPolicy.ts`), wired first in `Users.hooks.beforeValidate` | `src/collections/hooks/__tests__/passwordPolicy.test.ts` |
| Breached-password screening | k-anonymity check, full password never leaves server, fail-open | `src/lib/security/hibp.ts` (HIBP range API, 5-char SHA-1 prefix, Add-Padding) | `src/lib/security/__tests__/hibp.test.ts` |
| Password storage | Strong slow hash | Payload built-in (PBKDF2) — local strategy never overridden | — |

Remaining S1 increments (passkeys, TOTP + recovery codes, email-OTP recovery,
MFA session-state + enforcement, step-up, session/device management) land in
subsequent commits per the build order in `docs/VERIFICATION.md`; each appends its
rows here.

## Required external assurance (cannot be satisfied by code)

Before any public registration launch:

1. Independent third-party penetration test (web + API), findings remediated.
2. Third-party security review / architecture assessment.
3. Privacy Impact Assessment (PIPEDA + Alberta PIPA), kept current.
4. Signed Data Processing Agreements with Supabase, AWS, and Vercel; processor
   register current (`docs/DATA_RESIDENCY_AND_COMPLIANCE.md`).

This document, the threat model, and the data flow diagram are the evidence those
reviews consume.

## Security and privacy evidence package

- `docs/THREAT_MODEL.md` — STRIDE threat model + textual data flow diagram with
  trust boundaries and Canadian-residency assertions; each STRIDE risk mapped to an
  in-place control or marked planned.
- `docs/PRIVACY_IMPACT_ASSESSMENT.md` — PIA under PIPEDA + Alberta PIPA: data
  inventory, consent, minors/guardian, data subject rights, retention, residency,
  risk table, open items before launch.
- `docs/PROCESSOR_REGISTER.md` — third-party processors + DPA register (all DPAs
  REQUIRED/pending) with residency-vs-sovereignty note.
- `docs/PENTEST_READINESS.md` — scope, architecture, test accounts, the full
  adversarial/pentest matrix as a checklist, known residuals, disclosure contact.
- `docs/SES_SETUP.md` — SES (ca-central-1) provisioning runbook (sandbox + RAMP DNS
  blockers documented).
