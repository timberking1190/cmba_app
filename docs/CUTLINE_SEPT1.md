# Sept 1 launch cut line

DRAFT for operator review. Not committed. Generated 2026-08-04 from the
`feat/launch-readiness` closing summary (`docs/VERIFICATION.md`), `docs/DECISIONS.md`,
`docs/OPERATOR_ACTIONS.md`, `docs/PROCESSOR_REGISTER.md`, and the phase state recorded
in `CLAUDE.md`.

Copy rule: no em or en dashes anywhere.

Target date: **2026-09-01** (public registration launch). Today: 2026-08-04, so four
weeks of runway.

Nothing in this document is a new commitment. Every line is traceable to an existing
doc; where a date is derived rather than quoted, it is marked DERIVED.

## A. Ships Sept 1

Code that exists and is green, but is not yet on `main`. All of it needs a merge, a
deploy, and in two cases a migration applied.

| Item | Where it lives | Still needed |
|---|---|---|
| P0.1 route-level error, loading, not-found, empty states + global error boundary | `feat/launch-readiness` (e986aa4) | merge + deploy |
| P0.2 admin email-health surface + never-silent failure logging | `feat/launch-readiness` (27abc2c) | merge + deploy + apply `20260702_054408_add_email_send_log` |
| P0.3 CSP strict-nonce | already on `main` | nothing; verified, no change was needed |
| P0.4 ASVS 5.0 + NIST 800-63B-4 crosswalks, DFD, ZAP config, assessor scope | `feat/launch-readiness` (8ebd289) | merge; hand the assessor scope to the pentest vendor |
| P1.5 Sentry + Vercel Analytics + Web Vitals | `feat/launch-readiness` (07bc247) | merge + deploy + DSN set + Sentry DPA signed |
| P1.6 own schedule and standings source-awareness, fresh recompute, cutover | `feat/launch-readiness` (4a6c8df) | merge + deploy + the season import and flag flip |
| P1.7 Playwright + axe + Lighthouse CI harness | `feat/launch-readiness` (0dd5707) | merge; activates once `E2E_BASE_URL` points at a preview |
| P2.8 robots, sitemap, structured data, OG image, manifest, offline SW | `feat/launch-readiness` (8529144) | merge + deploy |
| P2.9 site-wide search + season survey with visible results | `feat/launch-readiness` (6f8d68e) | merge + deploy + apply `20260702_063142_add_season_surveys` |
| Communities terminology for the 11 member orgs | `feat/communities-wording` (2ac0346) | merge + deploy |
| Next 16 followups: `middleware.ts` to `proxy.ts`, ESLint 9 flat config | `chore/next16-followups` (ea48cd3) | merge + deploy |
| Member Cards Phase 0 and Phase 1 (10 collections, token mint/verify, issuance hook, verify routes) | already on `main` | signing keys set; requirements seed decision |
| Scheduler overhaul | already on `main` | nothing |

**Gate status of the unmerged work, re-run 2026-08-04** against
`feat/launch-readiness` in a clean worktree with a fresh `npm ci`:
lint clean, `tsc --noEmit` clean, 346/346 unit and integration tests pass across 48
files. No test requires a database.

## B. Explicitly post-launch

Recorded as deliberate, not as oversights.

| Item | Source | Why it waits |
|---|---|---|
| P2.10 schedule and standings library consolidation (delete the legacy TeamLinkt getters and fallback branches) | D1 in `docs/DECISIONS.md` | Gated on `FEATURE_LEGACY_TEAMLINKT=false` being live and stable. Removing the fallback before cutover would break the graceful path that is still active. |
| Member Cards Phase 2 (wallet issuance: Apple `.pkpass`, PassKit web service, APNs, Google Wallet class/object) | `CLAUDE.md` build order | Gated on operator tasks 2 and 3 (Apple and Google developer accounts). |
| Member Cards Phase 3 (full card UI) and Phase 4 (`/scan` PWA) | `CLAUDE.md` build order | A Phase 3/4 preview is already on `main` via `feat/member-cards-ui`; the full build follows Phase 2. |
| Member Cards Phase 5 (admin, analytics, imports) and Phase 6 (hardening) | `CLAUDE.md` build order | Sequenced after Phase 2 through 4. |
| Follow-up migration: append-only DB trigger on `scans`, composite unique index on `import-field-mappings` | `CLAUDE.md` | Raw SQL not expressible in collection config; app-layer `denyAll` already enforces the append-only rule. |
| Push notifications | D3 | Deferred to the native app phase. `src/lib/notify.ts` is already the single fan-out point, so no web-only work is needed now. |
| Bilingual English and French content | D4 | Non-trivial i18n effort (route localization, translated CMS and legal content, language toggle). Deferred as a post-launch enhancement. |
| Framework upgrade past Next 15.3.9 | `docs/OPERATOR_ACTIONS.md` | Blocked upstream. Payload 3.85.1 caps Next below 15.5.0 while the advisory fixes land in 15.5.15+. No operator action clears this today. Note that the dependabot `next-16.2.9` branch and `chore/next16-followups` are the beginning of the escape route; see the merge-order note. |

## C. Already-recorded Later decisions

| ID | Decision | Status | Owner |
|---|---|---|---|
| D1 | Schedule and standings library consolidation | STAGED, gated on the TeamLinkt cutover | engineering, after the operator flips the flag |
| D2 | Registration and payments: in house versus TeamLinkt | DECISION PENDING | CMBA board |
| D3 | Push notifications with the native apps | DEFERRED to the native app phase | engineering + product |
| D4 | Bilingual content | DEFERRED, post-launch | product |

On D2 the recorded recommendation for launch is to keep registration and payments in
TeamLinkt and deep-link to it, which is what the app already does and holds no payment
data. Bringing it in house would add a payment processor, a new PCI and privacy scope,
a new register entry, and a registration data model. If the board ratifies the
recommendation, nothing in section A changes. If the board decides otherwise, Sept 1
is not achievable for that scope.

## D. What Sept 1 actually depends on that is not code

These are the external blockers, quoted verbatim from the closing summary in
`docs/VERIFICATION.md`. None of them are checked off in `docs/OPERATOR_ACTIONS.md` or
in the `docs/PROCESSOR_REGISTER.md` DPA checklist as of 2026-08-04.

Needed-by dates are DERIVED by working back from Sept 1. No date appears in any source
document. Treat them as a proposed critical path, not as commitments anyone has made.

| # | Blocker (verbatim) | Owner | Needed by (DERIVED) | Status as stated |
|---|---|---|---|---|
| 1 | "SES: DKIM/SPF/DMARC via RAMP, production access, SMTP creds; then verify with the in-app test-send + health endpoint." | RAMP Interactive (external, holds the `cmba.ab.ca` nameservers); operator for the AWS side | request to RAMP Aug 7; records live Aug 14; production access Aug 18; in-app verify Aug 21 | Open. SES "is in sandbox now" and "Not yet provisioned". Until then transactional email is "logged but not delivered" |
| 2 | "Apply the two additive migrations (email_send_log, season_surveys)." | Operator | Aug 21, after the launch-readiness merge and deploy | Open. Both are "additive and non-destructive". Run on a Supabase branch first, then production |
| 3 | "Enable Sentry (EU project + DSN) and Vercel Analytics; sync the PolicyVersions global to the new privacy version." | Operator; Sentry for the DPA; CMBA board to accept a US-headquartered processor | Aug 21 | Open. Sentry "stays off until the DSN is set". The policy is already bumped to `2026-07-01` in `src/content/legal.ts`; the global still needs syncing |
| 4 | "Import a real season, verify /schedule and /standings read \"from CMBA Connect\", then set FEATURE_LEGACY_TEAMLINKT=false and monitor; afterward the P2.10 code strip." | Operator for the import and the flag; engineering for the strip | import Aug 17; verify Aug 19; flag flip Aug 24 so the "about 7 days" monitor closes Aug 31; the strip is post-launch | Open. `FEATURE_LEGACY_TEAMLINKT=true` is the instant rollback |
| 5 | "Enable Vercel preview deploys and set E2E_BASE_URL to activate the e2e/a11y/perf CI gate; run the interim OWASP ZAP scan against the preview and record it." | Operator | preview and `E2E_BASE_URL` Aug 11; ZAP recorded Aug 14 | Open. The P1.7 harness is written and activates on a preview URL |
| 6 | "Commission the independent penetration test and third-party privacy review; sign the Supabase, AWS, and Vercel DPAs; name the Privacy Officer; board decision on US-headquartered processors." | Pentest vendor (unnamed); Canadian privacy professional (unnamed); Supabase, AWS and Vercel as counterparties; CMBA board | pentest engaged Aug 7, report Aug 24, remediation Aug 31; DPAs signed Aug 21; Privacy Officer named Aug 14; board decision Aug 18 | Open, and the highest risk. The register states all DPAs are "REQUIRED and are pending. None are signed yet" and that signing them "is a launch blocker" |
| 7 | "Board decision on registration and payments (D2)." | CMBA board | Aug 18, the last point at which a reversal could still reshape Sept 1 scope | "DECISION PENDING". The recorded recommendation is to keep registration and payments in TeamLinkt for launch and deep-link to it |

## E. Risks to the date

1. **The penetration test and privacy review have no recorded start.** Both are
   named as launch blockers in `docs/SECURITY.md` under "Required external
   assurance". Commissioning, scheduling, executing, and remediating an independent
   test inside four weeks is the single largest threat to Sept 1.
2. **SES depends on a third party CMBA does not control.** The DKIM, SPF, and DMARC
   records for `cmba.ab.ca` sit on RAMP Interactive nameservers. Until they publish,
   no transactional email is delivered, which means no guardian confirmation, no
   reminders, and no email OTP recovery. Guardian confirmation is on the registration
   path for minors.
3. **The TeamLinkt cutover wants a 7-day monitoring window.** Working back from
   Sept 1, the flag flip has to happen in August, which means the season import and
   the "from CMBA Connect" verification have to happen before that.
4. **`feat/launch-readiness` is a month stale.** It branched from `a8e6853` on
   2026-07-02 and `main` has taken eight migrations since. The merge is not clean
   (10 conflicted files). The longer it sits, the worse that gets.
5. **Three DPAs are unsigned** (Supabase, AWS, Vercel), plus Sentry's if Sentry is
   turned on. The register calls signing them a launch blocker.

## F. Open question for the operator

The Member Cards requirements seed (`npm run seed:member-cards`) is still HELD per
`CLAUDE.md`: it adds three required-for-coach certification types that are publicly
readable and may surface in the live catalog and coach pathway before the feature
launches. Decide whether member cards are in or out of the Sept 1 scope, because that
decision changes whether the seed and the signing keys are launch blockers or
post-launch items.
