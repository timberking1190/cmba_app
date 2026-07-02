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
| S0 | Baseline hardening of the current site | Implemented (CSP now on the strict-nonce profile by default) |
| S1 | Identity and authentication (passkeys, TOTP, OTP, MFA, sessions) | Implemented; email-OTP recovery delivery pending SES |
| S2 | Authorization, data protection, application hardening | Implemented; optional upload malware scan is an operator add-on |
| S3 | API security, monitoring, incident readiness | Implemented; email health surface added; centralized log shipping + anomaly alerting pending the observability phase |
| S4 | Children's data, registration readiness, evidence | Implemented; sign-up email verification pending SES; invite-only self-serve flow planned |

Last reviewed 2026-07-01 (launch-readiness pass). The ASVS 5.0 and NIST SP
800-63B-4 crosswalks below map each standard chapter to the concrete control and its
status, so an external assessor can start from the standard rather than our phases.

---

## OWASP ASVS 5.0 chapter crosswalk

ASVS 5.0 (May 2025) organizes requirements into 17 chapters. Target is Level 2
across the app, Level 3 for admin, children's data, certification documents, and
score reporting. This maps each chapter to where it is met. "N/A" means the feature
class is not present in the app (recorded, not skipped).

| ASVS 5.0 chapter | Target | Where met | Status |
| --- | --- | --- | --- |
| V1 Encoding and Sanitization | L2 | React auto-escaping; no `dangerouslySetInnerHTML` in app code; upload byte sniffing and image re-encode (`src/lib/uploads/sniff.ts`, `exif.ts`) | Met |
| V2 Validation and Business Logic | L2 | Game state machine (`src/lib/gameStateMachine.ts`), conflict detection, idempotency (`src/lib/api/idempotency.ts`), server-enforced versioned consent, registration gate | Met |
| V3 Web Frontend Security | L2/L3 | Strict-nonce CSP + `strict-dynamic`, security headers, `frame-ancestors 'self'`, `X-Frame-Options`, Permissions-Policy (`src/lib/security/headers.ts`, `src/middleware.ts`) | Met |
| V4 API and Web Service | L2 | Per-endpoint auth + durable rate limit, CORS/CSRF allowlist, idempotent writes, safe errors (`src/lib/api/*`) | Met |
| V5 File Handling | L2/L3 | Magic-number validation + size caps + sharp re-encode; EXIF/GPS stripped; private buckets keep Payload access control on (`src/lib/uploads/*`, `payload.config.ts`) | Met |
| V6 Authentication | L2/L3 | 800-63B-4 password policy + HIBP screening; WebAuthn passkeys (phishing-resistant); TOTP; recovery codes; MFA enforcement (`src/lib/mfa/*`) | Met; OTP delivery pending SES |
| V7 Session Management | L2/L3 | Payload sessions bound by `sid`; per-session AAL; device list + revoke; sign-out-everywhere; invalidation on password change; httpOnly SameSite cookies + bearer for native (`src/lib/mfa/session.ts`, `sessionInvalidation.ts`) | Met |
| V8 Authorization | L2/L3 | Default-deny access, owner-scoped `Where`, role helpers, adversarial IDOR tests, mass-assignment field locks, access-checked private downloads (`src/access/*`) | Met |
| V9 Self-contained Tokens | L2 | HS256 access JWT bound to a server session, short TTL; refresh rotation with reuse detection + family revoke; tokens hashed at rest (`src/lib/api/auth.ts`) | Met |
| V10 OAuth and OIDC | n/a | No OAuth/OIDC provider or relying party; local password + WebAuthn/TOTP only | N/A |
| V11 Cryptography | L2 | AES-256-GCM for TOTP secrets; PBKDF2 for passwords + recovery codes; salted/HMAC hashes for IP and email recipients; `TOTP_ENC_KEY` separate from `PAYLOAD_SECRET` (`src/lib/mfa/crypto.ts`) | Met |
| V12 Secure Communication | L2 | TLS at Vercel; HSTS preload in production; `requireTLS` SMTP to SES; all processors ca-central-1 | Met |
| V13 Configuration | L2 | Secrets out of repo + gitleaks; dependency-audit gate + Semgrep SAST in CI; minimal Permissions-Policy; CSP report-only rollout switch | Met |
| V14 Data Protection | L2/L3 | PIPEDA/PIPA data minimization; PII-free logs and emails; retention TTL sweep; DSAR export + erase; residency ca-central-1 (`docs/PRIVACY_IMPACT_ASSESSMENT.md`) | Met |
| V15 Secure Coding and Architecture | L2 | Default-deny posture; migrations as source of truth; tamper-evident audit log; typed access layer; no raw SQL; CI SAST + dependency gates | Met |
| V16 Security Logging and Error Handling | L2 | Append-only, HMAC tamper-evident AuditLog; `safeClientError` (no leakage); CSP violation reporting; email health + never-silent failure logging; incident runbook | Met; centralized shipping + anomaly alerting is an operator add-on / observability phase |
| V17 WebRTC | n/a | No WebRTC in the app | N/A |

## NIST SP 800-63B-4 authentication crosswalk

Target: AAL2 for member accounts; step up to a phishing-resistant method for admins
and sensitive actions.

| 800-63B-4 area | Requirement | Where met |
| --- | --- | --- |
| Authenticator Assurance Level (§4) | AAL2 for members; phishing-resistant step-up for admins; "admin never ok while AAL1" invariant | `src/lib/mfa/guard.ts` (`decideMfa`), `src/lib/mfa/enforce.ts` |
| Memorized secrets (§5.1.1) | Min length, allow long passphrases and all characters, NO composition/rotation/hints; screen against breach corpus | `src/collections/hooks/passwordPolicy.ts`, `src/lib/security/hibp.ts` (k-anonymity, full password never leaves server) |
| Single-factor OTP / TOTP (§5.1.4/5.1.5) | Authenticator app, replay-protected | `src/lib/mfa/totp.ts` (otpauth, lastStep floor) |
| Multi-factor cryptographic / phishing-resistant (§5.1.7-5.1.9) | WebAuthn/FIDO2, origin-pinned, counter regression rejected | `src/lib/mfa/webauthn.ts` (RP ID + origin allowlist from env) |
| Look-up secrets (§5.1.2) | One-time recovery codes, salted KDF, single-use | `src/lib/mfa/recovery.ts` |
| Verifier secret storage (§5.1.1.2) | Slow hash for passwords; MFA secrets encrypted/never serialized | Payload PBKDF2; TOTP secret AES-256-GCM (`crypto.ts`); `read:()=>false` on secret fields |
| Rate limiting / throttling (§5.2.2) | Limit online guessing at the verifier | Durable per-IP + global rate limit on auth/MFA buckets, hashed IP keys (`src/lib/rateLimit.ts`) |
| Reauthentication and session (§7) | Session binding, step-up, termination | `sid`-bound JWT, device revoke, sign-out-everywhere, invalidation on password change (`src/lib/mfa/session.ts`, `sessionInvalidation.ts`) |
| Account recovery (§6.1.4) | Recovery channel that does not weaken admin MFA | Email-OTP recovery only, never satisfies admin MFA; force-enrollment, never a hard lockout (`src/collections/EmailOtp.ts`, `enforce.ts`); delivery pending SES |
| Records and audit | Authentication events recorded | Tamper-evident AuditLog (mfa.* events) |

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

- Remediation status (checked 2026-06-30): BLOCKED upstream by Payload, not a simple
  operator action. Payload 3.85.1 (already the latest) caps `@payloadcms/next` at Next
  `<15.5.0`, but the Next advisory fixes all land in `15.5.15+` (e.g. middleware bypass
  fixed in 15.5.18, SSRF in 15.5.16). Verified: upgrading to Next 15.4.11 (the highest
  Payload allows) builds + passes all 242 tests but clears zero advisories and adds one
  (>=15.4.0 only), so it was reverted. nodemailer/undici are likewise pinned through
  Payload's tree. Real fix paths: a future Payload 3.x release that widens the Next peer
  range to 15.5.15+, OR a Next 16 major upgrade (Payload supports >=16.2.6; separate
  breaking-change effort). Until then these stay accepted; mitigated by strict CSP +
  headers, CORS lockdown, and no public accounts yet. Tracked for the pentest input and
  to re-attempt on the next compatible Payload release. See docs/OPERATOR_RUNBOOK.md s3.
- Mitigations already in place reduce exposure of several of these: strict CSP +
  security headers (S0), CORS/CSRF lockdown, and the fact that the app has no public
  accounts yet.

## S1 — Identity and authentication (in progress, incremental)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Password policy (800-63B-4) | Min length, allow long passphrases + all chars, NO composition/rotation/hints | `validatePassword` beforeValidate hook (`src/collections/hooks/passwordPolicy.ts`), wired first in `Users.hooks.beforeValidate` | `src/collections/hooks/__tests__/passwordPolicy.test.ts` |
| Breached-password screening | k-anonymity check, full password never leaves server, fail-open | `src/lib/security/hibp.ts` (HIBP range API, 5-char SHA-1 prefix, Add-Padding) | `src/lib/security/__tests__/hibp.test.ts` |
| Password storage | Strong slow hash | Payload built-in (PBKDF2), local strategy never overridden | n/a |
| MFA decision | One enforcement function, force-enrollment invariant | `src/lib/mfa/guard.ts` (decideMfa) | `guard.test.ts` (incl. "admin never ok while aal1") |
| MFA enforcement | Gated pages + the Payload /admin SPA require enroll/challenge when MFA_ENFORCE on; no-op (zero change) when off | `src/lib/mfa/enforce.ts` wired into /account, /manage, /rep, /compliance/*; `AdminMfaGate` provider + `/api/v1/auth/mfa/status` for the admin SPA; redirect targets unenforced (force-enrollment) | `enforce.test.ts`; live: /admin 200 with provider, flag-off behavior unchanged |
| Per-session assurance | AAL per session via sessionMeta keyed by sid | `src/lib/mfa/session.ts` + `sessionPure.ts`; elevation in `server.ts` | `session.test.ts` |
| Passkeys (primary) | WebAuthn/FIDO2, phishing-resistant, origin-pinned, counter-regression rejected | `src/lib/mfa/webauthn.ts` (@simplewebauthn v13, RP ID + origin allowlist from env); routes `.../mfa/passkey/register|auth/options|verify`; `webauthn-credentials` (publicKey read:()=>false) + single-use `webauthn-challenges` | `webauthn.test.ts` (config + options); ceremony is operator/live-tested |
| TOTP second factor | Authenticator app, replay-protected | `src/lib/mfa/totp.ts` (otpauth, lastStep floor); routes `.../mfa/totp/enroll|activate`, `.../mfa/challenge` | `totp.test.ts`; live 401-gating + 403 deny-all |
| TOTP secret at rest | App-layer encryption, never serialized | `src/lib/mfa/crypto.ts` (AES-256-GCM, TOTP_ENC_KEY); `mfa-totp.secretEncrypted` read:()=>false | `crypto.test.ts` (round-trip + tamper) |
| Recovery codes | One-time, salted KDF, single-use | `src/lib/mfa/recovery.ts` (PBKDF2 + constant-time); `recovery-codes` deny-all | `recovery.test.ts` |
| Factor IDOR protection | A user cannot read another's factors | MFA collections deny-all external; owner-or-superadmin on webauthn-credentials; secrets read:()=>false | live: GET /api/{mfa-totp,recovery-codes,...} returns 403 |
| Sign-in challenge | Enrolled users complete a factor at sign-in | `/account/security/challenge` + `MfaChallenge` (passkey/TOTP/recovery), open-redirect-guarded `next` | live 307 redirect; route 401-gating |
| Session management | Device list, per-session + sign-out-everywhere; instant token invalidation | Routes `.../mfa/sessions`, `.../sessions/revoke` (removing a sid from user.sessions invalidates its JWT); `SessionsList` UI | live 401-gating |
| Security audit | Events recorded append-only | `writeAudit` to AuditLog (mfa.totp.activate, mfa.passkey.register, mfa.challenge.pass/fail, mfa.session.revoke) | code review |

Remaining S1 increments (passkeys/WebAuthn, the login challenge interstitial +
step-up + session/device management UI, force-enrollment enforcement behind
MFA_ENFORCE, email-OTP recovery after SES) land in subsequent commits per the build
order in `docs/VERIFICATION.md`; each appends its rows here.

## S2 - Authorization and data protection (in progress)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Default deny + IDOR | Non-admins scoped to their own records; no cross-user access by id tampering | `src/access/users.ts` (owner-scoped Where clauses), `src/access/index.ts` role helpers; MFA collections deny-all | `src/access/__tests__/accessControl.test.ts` (adversarial) |
| Private document downloads | Certificates / scoresheet / incident photos are access-checked, never public | Private Supabase buckets keep Payload access control ON (`payload.config.ts`); only the public Media bucket disables it | code review |
| EXIF / GPS stripping | Remove location metadata from uploaded photos | `src/lib/uploads/exif.ts` (`sharp().rotate()` bakes orientation, drops EXIF + GPS) | `src/lib/__tests__/exif.test.ts` |
| Output encoding (XSS) | No raw HTML injection | React escapes by default. The single controlled `dangerouslySetInnerHTML` is the JSON-LD structured data (`src/components/JsonLd.tsx`): our own server data only, every `<` escaped so a value cannot close the tag, and nonce-stamped under the strict CSP. No user input reaches it. | code review |
| SQL injection | Parameterized access only | Payload + Drizzle ORM (no raw string SQL in app paths) | code review |
| CSRF | State-changing requests protected | Payload `csrf` allowlist (S0) + SameSite=Lax cookies (cross-site POST drops the cookie) | code review |
| Secure file upload | Verify real bytes (magic number) + size, not declared type | `src/lib/uploads/sniff.ts` (`validateUpload`/`sniffType`) on CertificateFiles; images re-encoded via sharp on all photo collections | `sniff.test.ts` |
| Session invalidation | Kill other sessions + refresh families on password change | `src/collections/hooks/sessionInvalidation.ts` (Users hooks; actor self-session kept, scoped to password-set only, loop-guarded) | `sessionInvalidation.test.ts` |
| Open redirect | `next`/`redirect` must be a same-site path | `src/lib/security/redirect.ts` (`safeInternalPath`) on /login + challenge; rejects `//`, schemes, control chars | `redirect.test.ts` |
| Mass assignment | Privileged fields write-locked | `superAdminFieldOnly` on roles/status/owner across collections (a self-registrant cannot self-assign roles) | `redirect.test.ts` |
| SSRF | No user-controlled server-side fetches | Outbound fetches are fixed-URL only (TeamLinkt from env, HIBP, Turnstile, SES SMTP); CMS embed is a client-side iframe (CSP frame-src allowlisted), not a server fetch | code review |

### Accepted decision: application-layer field encryption (deferred)

Encryption at rest for all personal data is provided by Supabase (ca-central-1).
Application-layer encryption of individual fields was assessed and deferred:
`dateOfBirth` is read in plaintext by `deriveIsMinor` (the minor-derivation that
gates the guardian flow), and `guardian.email` is read inside server hooks
(guardian confirmation), so field-level encrypt-on-write / decrypt-on-read would
break those paths without a larger rework. The AES-256-GCM primitive
(`src/lib/mfa/crypto.ts`) is in place and is already used for TOTP secrets; a
specific isolated field can adopt it later. Recorded as an accepted residual.

Remaining S2 work: an optional malware-scan integration on uploads (operator
add-on; the sniff + size + re-encode controls are in place). The Payload `/admin`
MFA enforcement gap is now closed (see the MFA enforcement row).

## S3 - API security, monitoring, incident readiness (in progress)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Per-endpoint auth + rate limit | Every /api/v1 mutation authenticates and is rate limited | `lib/api/auth.ts` + `checkRateLimit` (durable, hashed-IP) on auth/MFA/reporting/import buckets; CORS allowlist (S0) | route tests; live 401/429 |
| Idempotency | Idempotency-Key on writes | `lib/api/idempotency.ts` (keyed on key+scope, fails closed) | `idempotency.test.ts` |
| Tamper-evident audit log | Append-only + integrity detection | AuditLog deny-all create/update/delete + throw-on-update/delete hooks; HMAC per row (`lib/audit/integrity.ts`); `npm run verify-audit-log` | `integrity.test.ts`; live verifier (0 tampered) |
| Audit MFA status endpoint | Session posture for gating | `/api/v1/auth/mfa/status` | live 401-gating |
| Incident response | Runbook tied to IncidentLog + PIPEDA | `docs/INCIDENT_RESPONSE.md`; IncidentLog collection | doc + collection |
| Log hygiene | No PII / secrets in logs | `safeClientError` (no internal detail to clients); audit bodies carry no PII; rate-limit keys hashed | code review |

Remaining S3 work: centralized log shipping with anomaly alerting (operator add-on,
wired to the monitoring signals in `docs/INCIDENT_RESPONSE.md`), and per-endpoint
request-body schema validation hardening on the remaining v1 routes.

## S4 - Children's data + registration readiness (in progress)

| Control | Requirement | Implementation | Tested by |
| --- | --- | --- | --- |
| Guardian-managed minors | Under-18 accounts are guardian-managed, pending until confirmed | `deriveIsMinor` + `guardianFlow` + `sendGuardianConfirmation` (Stage A); guardian email confirm gate | existing |
| Minor document privacy | A minor's files are owner + super-admin only; club admins see status, not files | `CertificateFiles` read = owner-or-superadmin; private bucket, access-checked downloads | code review |
| Server-enforced consent | Versioned, auditable sign-off incl. guardian consent for minors | `enforceConsent` hard-reject + append-only ConsentRecords + PolicyVersions (Stage A) | existing |
| Data minimization | Collect the least, especially for minors | No SIN/payment data; guardian fields only when minor; bodies in audit/email carry no PII | code review |
| Data subject rights | Access, correction, export, erasure | self-serve export route + admin erase-user with legal-hold check (Stage A/B) | existing |
| Registration readiness | Public sign-up behind a switch + signup bot defense | `src/lib/registration/policy.ts` (REGISTRATION_MODE, default open) + `registrationGate` hook (mode + honeypot + per-IP/global rate limit + optional Turnstile) on Users create | `policy.test.ts`; live: honeypot -> 400, no user created |
| No ad/profiling trackers | No third-party advertising / child profiling | None present; only privacy-respecting Turnstile (optional, off by default) | code review |

Remaining S4 work: email verification on sign-up (Payload `auth.verify`; needs SES),
a token-based self-serve invite flow for invite-only mode, and stricter access
logging when a minor's record is read (beyond the current owner-only access). The
STRIDE threat model, data flow diagram, and PIA already exist
(`docs/THREAT_MODEL.md`, `docs/PRIVACY_IMPACT_ASSESSMENT.md`).

## Required external assurance (cannot be satisfied by code)

Before any public registration launch:

1. Independent third-party penetration test (web + API), findings remediated.
2. Third-party security review / architecture assessment.
3. Privacy Impact Assessment (PIPEDA + Alberta PIPA), kept current.
4. Signed Data Processing Agreements with Supabase, AWS, and Vercel; processor
   register current (`docs/DATA_RESIDENCY_AND_COMPLIANCE.md`).

This document, the threat model, and the data flow diagram are the evidence those
reviews consume. A one-page brief to hand an assessor is
`docs/EXTERNAL_ASSESSMENT_SCOPE.md`. An interim automated dynamic scan (OWASP ZAP
baseline) is wired in `docs/DAST_ZAP.md`, pending a reachable preview URL.

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
  blockers documented) + in-app email health verification.
- `docs/EXTERNAL_ASSESSMENT_SCOPE.md` — one-page scope and readiness brief for the
  penetration testing firm and the privacy reviewer.
- `docs/DAST_ZAP.md` — interim OWASP ZAP baseline scan config, runbook, and results
  log (pending a preview URL).
