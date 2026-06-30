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
| Dependency scanning | Fail build on high-severity advisories | `npm audit --omit=dev --audit-level=high` gate in `security.yml`; Dependabot (`.github/dependabot.yml`) | CI |
| Static analysis | SAST in CI | Semgrep (`p/owasp-top-ten`, `p/javascript`, `p/typescript`, `p/react`, `p/secrets`) in `security.yml` | CI |
| Disclosure | security.txt with contact | `public/.well-known/security.txt` (RFC 9116) | Manual fetch |
| TLS / HSTS | Enforced transport security | Vercel terminates TLS; HSTS emitted in production by middleware | Runtime header check |

### CSP script-src strategy (important)

The public site is statically / ISR rendered. A nonce + `strict-dynamic` policy
requires per-request dynamic rendering so Next can stamp the nonce onto its inline
bootstrap scripts; on a static page those scripts ship without a nonce and a strict
policy would block them (verified during the S0 gate). Two strategies are therefore
supported via `buildCsp`:

- `compatible` (DEFAULT): `script-src 'self' 'unsafe-inline'`. Non-breaking on the
  current static/ISR pages. Still blocks loading scripts from foreign origins, and
  the app authors no inline scripts. This is the one residual at S0.
- `strict-nonce` (gold standard): `script-src 'self' 'nonce-…' 'strict-dynamic'`.
  Enable with `CSP_STRICT_SCRIPTS=true` AFTER the public site is moved to dynamic
  rendering (read the `x-nonce` request header in the root layout) and the
  TeamLinkt data caching on `/schedule` and `/calendar` is moved from page-level
  ISR to fetch-level caching. Scheduled as an S2 upgrade.

### CSP rollout (operator action)

The policy enforces by default. For the FIRST preview deploy, set
`CSP_REPORT_ONLY=true` so the browser receives `Content-Security-Policy-Report-Only`
(nothing is blocked) and violations are logged to `/api/csp-report`. Confirm the
public pages AND `/admin` render with no violations, then unset to enforce.

### Accepted exceptions (S0)

- `script-src 'unsafe-inline'` (compatible strategy, default): see above. Upgrade
  path to `strict-nonce` is implemented and gated behind `CSP_STRICT_SCRIPTS`.
- `style-src 'unsafe-inline'`: React/Next and the Off+Brand UI inject inline
  styles. Inline style is a low XSS risk and removing it would require a large
  refactor of third-party and framework styling. Revisit in S2.
- `img-src`/`media-src` allow Supabase Storage hosts (ca-central-1) only, plus
  `data:`/`blob:` for framework-generated images.

---

## S1–S4 (planned — filled in as each phase lands)

Each subsequent phase appends its control rows here with implementation and test
references, and updates `docs/VERIFICATION.md` with gate evidence.

## Required external assurance (cannot be satisfied by code)

Before any public registration launch:

1. Independent third-party penetration test (web + API), findings remediated.
2. Third-party security review / architecture assessment.
3. Privacy Impact Assessment (PIPEDA + Alberta PIPA), kept current.
4. Signed Data Processing Agreements with Supabase, AWS, and Vercel; processor
   register current (`docs/DATA_RESIDENCY_AND_COMPLIANCE.md`).

This document, the threat model, and the data flow diagram (added in S4) are the
evidence those reviews consume.
