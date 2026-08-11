# LAUNCH-ACCEPTANCE.md

The Sept 1 2026 definition of done for CMBA+. This is the contract. Phase 8 scores
every line in it as DONE, IN PROGRESS or AT RISK, with a named blocker and a named
owner. Nothing here is aspirational: each item is written so that it can be checked by
observing the running system rather than by trusting that someone clicked a toggle.

Copy rule: no em or en dashes anywhere.

Written 2026-08-10. Owner column is either OPERATOR (Ken) or ENG (Claude Code).

## The correction this document is built on

The original launch plan assumed CMBA+ was unreleased code waiting to be merged,
migrated and deployed dark, with Sept 1 as the day it first met the public. That is not
the state of the system. Verified on 2026-08-10:

- `feat/launch-readiness` merged to `main` on 2026-08-04 (PR #44). It is zero commits
  ahead of `main`.
- All 31 migrations are applied to production, including the two described as pending
  (`add_email_send_log`, `add_season_surveys`, both batch 24, 2026-08-04 16:22 UTC).
- Production has been serving that code since 2026-08-05.
- `https://cmbaplatform.vercel.app` answers HTTP 200 to anonymous requests. `/signup`,
  `/login`, `/schedule` and `/standings` are all publicly reachable.

So CMBA+ is already launched in the only sense that matters technically. Sept 1 is not
the day the code ships. It is the day CMBA invites families in, and the honest gate on
that is whether the platform can safely receive a minor's registration. That is what
this document scores.

## A. The gate itself

| # | Condition | How it is checked | Owner |
|---|---|---|---|
| A1 | `REGISTRATION_MODE` is set to `closed` in Vercel Production until launch day | An anonymous POST to create a user is refused with 403 and the copy "Public sign-up is currently closed" | OPERATOR |
| A2 | The flip to `open` has been rehearsed at least once on a preview deployment, not first attempted in production | A preview with `REGISTRATION_MODE=open` accepts a test registration; the same preview with `closed` refuses it | ENG |
| A3 | Reopening is a single env change plus redeploy, documented in LAUNCH-DAY-RUNBOOK.md with its rollback | The runbook exists and names the exact variable, scope and redeploy step | ENG |

## B. Guardian consent and email, the real blocker

Guardian confirmation is on the registration path for a minor. Until email is
delivered, a child can be registered and the consent artefact never reaches the
guardian. This is the single condition that most deserves to block Sept 1.

| # | Condition | How it is checked | Owner |
|---|---|---|---|
| B1 | AWS SES is out of sandbox and holds production sending access for `cmba.ab.ca` | AWS console shows production access granted | OPERATOR |
| B2 | DKIM, SPF and DMARC are published on `cmba.ab.ca` by RAMP Interactive | Public DNS lookup returns the three CNAME tokens | OPERATOR, blocked on RAMP |
| B3 | A real transactional email arrives in a real inbox | `POST /api/v1/admin/email-test` reports `transport: ses`, then the message is observed in the inbox | OPERATOR |
| B4 | `email_send_log` records delivery, not just attempts | Row count increases and rows carry a delivered state | ENG verifies |
| B5 | A full guardian consent round trip completes end to end | A test minor registration produces a delivered guardian email, the guardian acts on it, and a row lands in `consent_records` | ENG + OPERATOR |

As of 2026-08-10: SES is sandboxed, `email_send_log` holds 12 rows, `consent_records`
holds 1 row against 5 users. B5 has never been demonstrated end to end.

## C. Observability, so a failure is visible

A three week soak with no error reporting is not a soak, it is a hope. Production HTML
on 2026-08-10 contains zero references to Sentry, Vercel Analytics or Speed Insights.

| # | Condition | How it is checked | Owner |
|---|---|---|---|
| C1 | Vercel Web Analytics and Speed Insights are live | Production HTML contains a `/_vercel/insights` reference | OPERATOR |
| C2 | Sentry DPA is executed, then Sentry is enabled in an EU project | An event appears in the Sentry project | OPERATOR |
| C3 | The first captured Sentry event is confirmed to carry no personal data | The event is inspected by hand: no user object, IP, cookies, auth headers, body or query string | ENG |
| C4 | A deliberately induced error is observed arriving in the tool within minutes | A test error is thrown on a preview and seen in Sentry | ENG |
| C5 | Someone is actually alerted. An unwatched dashboard is not monitoring | An alert rule delivers to a channel a human reads | OPERATOR |

C5 matters more than C2. Sentry that nobody looks at on a Saturday during registration
week is decoration.

## D. The launch critical journeys

Each must pass on production, on both mobile and desktop, by a human or a browser
agent. Unit tests do not satisfy this row: all 643 of them run without a database.

| # | Journey | Owner |
|---|---|---|
| D1 | A parent registers a child, and the guardian consent artefact is produced and delivered | ENG + OPERATOR |
| D2 | A returning member signs in, including the MFA challenge path | ENG |
| D3 | An athlete reaches their hub and completes one real task | ENG |
| D4 | A coach reaches their hub and completes one real task | ENG |
| D5 | A referee or official reaches their hub and completes one real task | ENG |
| D6 | A parent reaches their hub and completes one real task | ENG |
| D7 | `/schedule` and `/standings` both render from CMBA Connect data, not the TeamLinkt fallback | ENG |
| D8 | The branded 404 and the route error boundaries behave on a real failure | ENG |

There is no payment journey. Decision D2 in `docs/DECISIONS.md` is ratified: registration
and payments stay in TeamLinkt for launch and are deep-linked, so CMBA+ holds no payment
data and no PCI scope.

## E. Test and CI health

| # | Condition | How it is checked | Owner |
|---|---|---|---|
| E1 | CI is green on `main`, all three workflows | GitHub Actions shows CI, Security and Mobile audit passing | ENG |
| E2 | The `audit-ci` gate passes with every accepted advisory carrying a written justification, owner and date | `node scripts/audit-ci.mjs` exits 0 and `.audit-allowlist.json` entries all have notes | ENG |
| E3 | The Playwright, axe and Lighthouse job runs for real rather than skipping | The job takes minutes, not about 6 seconds, and reports real spec results | ENG + OPERATOR |
| E4 | E2E covers the launch critical journeys in section D, not only sign-in and quiz | Specs exist and pass for registration, guardian consent, and one task per hub | ENG |
| E5 | The Payload 3.85.1 to 3.87.1 upgrade is completed, clearing both accepted image-size advisories | The allowlist entries are deleted and the gate still passes | ENG |

As of 2026-08-10: E1 and E2 are met. E3 is a false green, the job finishes in about six
seconds because `E2E_BASE_URL` is unset. E4 is the largest testing gap. E5 is scheduled
into the soak window.

## F. Privacy and minors' data

| # | Condition | How it is checked | Owner |
|---|---|---|---|
| F1 | Consent is captured at the right point for every minor, and the record is durable | `consent_records` grows in step with minor registrations | ENG |
| F2 | The `PolicyVersions` global matches the shipped policy copy | The global reads `2026-07-01`, matching `src/content/legal.ts` | OPERATOR |
| F3 | No personal data reaches logs or error payloads | Vercel runtime logs and the first Sentry events are inspected by hand | ENG |
| F4 | Every table holding personal data is unreachable by the public Supabase keys | `anon` and `authenticated` hold no grants on those tables; re-verified after any migration | ENG |
| F5 | A retention answer exists and is implemented or scheduled | The retention cron and the documented policy agree | OPERATOR + ENG |
| F6 | Supabase, AWS and Vercel DPAs are executed | Signed copies exist | OPERATOR |
| F7 | The Privacy Officer is named | Recorded in the privacy policy and the register | OPERATOR |
| F8 | The independent penetration test and privacy review are complete, with findings remediated or accepted in writing | Report delivered and triaged | OPERATOR, vendor |

On F2, do this before reopening registration, not after. Bumping the policy version
re-prompts every user to accept. With 5 users that costs nothing. With the full
membership it is a mass re-consent event.

On F4, verified 2026-08-10: 107 of 125 tables have RLS enabled with no policies, which
denies by default, and the 18 without RLS grant nothing to `anon` or `authenticated`.
Supabase security advisors report 0 ERROR and 0 WARN. Enabling RLS on the remaining 18
is defence in depth and belongs in the soak window, not on the critical path.

## G. Capacity

589 teams' families arriving in a short window is the load event this platform has
never seen. Its largest observed table today is 125 tables holding 5 users.

| # | Condition | Owner |
|---|---|---|
| G1 | A realistic concurrency estimate for registration day is written down | ENG |
| G2 | The Postgres connection pool ceiling is known and `DATABASE_POOL_MAX` is set deliberately | ENG |
| G3 | The registration rate limits are set to survive a legitimate spike, not just an attack. Current limits are 5 per IP per hour and 50 globally per hour | ENG + OPERATOR |
| G4 | Hub landing pages are checked for N+1 queries under load | ENG |
| G5 | A load test against a non-production database has been run and its numbers recorded | ENG |

G3 deserves attention before launch. A global cap of 50 registrations per hour will
throttle a real launch day for an association this size, and it fails closed, which
means legitimate families see an error.

## H. Rollback

| # | Condition | Owner |
|---|---|---|
| H1 | Reverting the launch is a single documented action, rehearsed at least once | ENG |
| H2 | Vercel Instant Rollback has been exercised at least once, so the first attempt is not during an incident | ENG + OPERATOR |
| H3 | A current database backup exists and its restore has been tested, not merely assumed | OPERATOR |

H3 is unverified as of 2026-08-10 and is called out honestly: no backup was taken or
confirmed today, because no change touched schema or data and because taking an ad hoc
dump would have written minors' personal data onto a laptop. Before any future
migration this becomes a hard gate.

## Scoring

Phase 8 marks each item DONE, IN PROGRESS or AT RISK. An item is DONE only when it was
observed true on the running system. A dashboard toggle, a merged pull request or a
passing unit test does not by itself make any line in this document DONE.
