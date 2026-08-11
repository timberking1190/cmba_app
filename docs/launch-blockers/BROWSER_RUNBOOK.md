# Browser runbook: activate the remaining launch-readiness features

Everything in `feat/launch-readiness` is deployed and live in production. Several
features are nevertheless inert, because they wait on configuration, on data, or on a
third party. None of the remaining work is code.

This runbook is written to be handed to a browser-driving agent working in an
authenticated session, or worked through by hand. The tasks are ordered and some have
hard dependencies, so do not reorder them.

Copy rule: no em or en dashes anywhere.

## Verified state as of 2026-08-04

Checked directly against production and the ca-central-1 database, so an operator does
not need to rediscover any of it:

| Thing | State |
|---|---|
| Migrations | current at batch 24 (31 recorded, 125 tables) |
| `season_surveys` | **0 rows**, so `/survey` renders but has nothing to answer |
| `email_send_log` | **0 rows**, SES still sandboxed with no SMTP credentials |
| Sentry | not enabled, 0 references in production HTML |
| Vercel Web Analytics + Speed Insights | not enabled, 0 references in production HTML |
| `E2E_BASE_URL` repo variable | unset, so the browser gate is a no-op finishing in ~6s |
| `/schedule` | serves own data, renders "from CMBA Connect" |
| `/standings` | renders "via TeamLinkt", because only 1 of 18 games is `final` so own standings are empty and the designed fallback engages. Correct behaviour, not a bug |
| `PolicyVersions` global | privacy `2026-06-01`, while shipped policy copy is `2026-07-01` |
| Vercel deployment protection | **SSO enabled, `all_except_custom_domains`**. Preview URLs 302 to `vercel.com/sso-api`. Production alias is reachable |

## Identifiers

- Repo `github.com/timberking1190/cmba_app`, production branch `main`. Pushing to
  `main` auto-deploys production.
- Vercel project `cmba_platform`, id `prj_GsGGoKMTiKOPm2PGVIMkUZjSG3sS`, team
  `team_LspUbWfh92rsJ1BMqujxZlV5`. Functions pinned to Montreal `yul1`.
- Supabase project `pdwautioosstdgbbblxl` ("cmba-connect"), `ca-central-1`.
- Production `https://cmbaplatform.vercel.app`, Payload admin at `/admin`.

## Guardrails

These are not stylistic. Each one prevents a specific, known failure:

- Never run `npm run migrate`, `migrate:create`, or any seed script.
- Never point the e2e suite at production. It contains adversarial security specs and
  seeded member journeys that mutate data.
- Never enable Sentry before its DPA is executed.
- Never set `FEATURE_LEGACY_TEAMLINKT=false` before a real season is imported AND
  `/standings` verifiably renders from own data. `true` is the instant rollback.
- Do not sign anything, and do not record any DPA, penetration test or privacy review
  as complete. Those need an authorised signatory and real third-party work.
- Verify every "done" condition by observing the running system, not by trusting that a
  dashboard toggle was clicked or a form was submitted.
- This platform holds data about minors under a guardian-consent model, and PIPEDA and
  Alberta PIPA apply. Member-visible content is real, never a test fixture.

## Task 1: sync the privacy policy version

Do this first. It gets permanently more expensive later.

In `/admin`, Compliance group, Policy Versions. Set the privacy version to
`2026-07-01` so it matches the shipped copy in `src/content/legal.ts`. Leave the terms
and guardian versions alone.

Why the ordering matters: bumping this re-prompts users to accept at next sign in.
There are currently 5 user rows, so the cost is nil today. The moment public
registration opens, the same change means re-consenting the whole membership.

Done when: the global reads `2026-07-01` and `/admin` saves without error.

## Task 2: create a season survey

In `/admin`, Engagement group, Season Surveys. Create one, add questions, set status to
Open, and optionally enable "Show results" to publish the aggregate at `/survey`.

The questions are member-facing copy for a real organisation. Do not invent placeholder
or lorem text. Draft them and get operator approval before setting status to Open.
Creating a draft unattended is fine; opening it is a publishing action.

Done when: `/survey` shows the survey, accepts a response, and a row appears in
`survey_responses`.

## Task 3: enable Vercel Web Analytics and Speed Insights

Vercel dashboard, project `cmba_platform`, enable both. No key and no code change: the
app already mounts them in `src/components/Observability.tsx` and they no-op until
enabled. Both are cookieless and aggregate, children are never profiled, and both are
already disclosed in the privacy policy.

Done when: production HTML contains a `/_vercel/insights` reference. Verify by loading
the site, not by trusting the toggle.

## Task 4: activate the browser gate (has a prerequisite that is easy to miss)

Setting the `E2E_BASE_URL` repo variable alone will NOT work, and this is worth reading
before spending time on it.

Vercel deployment protection is enabled in `all_except_custom_domains` mode, which was
confirmed by request: preview URLs return `302` to `https://vercel.com/sso-api`. An
anonymous Playwright run against any preview therefore hits an SSO wall and every spec
fails on a redirect rather than on anything real.

Pick one:

1. **Protection Bypass for Automation (recommended).** Generate the bypass secret in
   the Vercel project's Deployment Protection settings, store it as a GitHub Actions
   secret, and send it from the harness. This needs a small code change as well as the
   dashboard action: `playwright.config.ts` must send the bypass header on every
   request via `use.extraHTTPHeaders`. Confirm the current header name in Vercel's
   documentation before wiring it, since getting it wrong fails the same way as not
   setting it at all.
2. **Disable SSO for preview deployments.** One toggle, no code, but it exposes every
   preview publicly. Given this app renders member and minors' data in previews, prefer
   option 1.
3. **Point at production.** Do not. The suite is adversarial and mutates data.

Only after one of those: set the `E2E_BASE_URL` repo variable (Settings, Secrets and
variables, Actions, Variables) to a preview URL.

Done when: the "Playwright + axe + Lighthouse" job on a new PR runs for minutes rather
than skipping in about 6 seconds, and reports real spec results.

## Task 5: Sentry, blocked until its DPA is executed

Do not enable before then. See `docs/launch-blockers/DPA_EXECUTION.md`.

When unblocked: create the Sentry project in the **EU region**, then set `SENTRY_DSN`
and `NEXT_PUBLIC_SENTRY_DSN` in Vercel for Production and Preview. On the first
captured event, confirm visually that no personal data is present: `sendDefaultPii` is
off and `scrubEvent` strips the user object, IP, cookies, authorization headers,
request bodies and query strings.

`docs/adr/0004-accept-us-headquartered-processors.md` accepts Sentry for non-personal
diagnostics only. If that scrubbing ever stops, the acceptance no longer covers it.

Done when: an event appears in Sentry and you have confirmed it carries no PII.

## Task 6: AWS SES, the long pole

Full detail in `docs/launch-blockers/SES_ACTIVATION.md`. The chain:

1. In AWS (`ca-central-1`), create the SES email identity for `cmba.ab.ca` and read its
   three Easy-DKIM CNAME tokens.
2. Put those tokens into `docs/SES_RAMP_DNS_REQUEST.md` and send it to RAMP
   Interactive, who hold the `cmba.ab.ca` nameservers. CMBA cannot self-serve this DNS.
3. Wait for RAMP to publish, then confirm propagation.
4. Request SES production access. The account is in sandbox.
5. Only then set `SES_SMTP_*` and `EMAIL_FROM` in Vercel.
6. Verify in app: `POST /api/v1/admin/email-test` as super admin, confirm
   `transport: ses`, then `GET /api/v1/admin/email-health`.

Steps 2 and 4 depend on parties outside CMBA, so start them first. Everything else
waits on them.

Until this lands, guardian confirmation, certification reminders, score notifications,
contested escalations and email-OTP recovery are logged but never delivered. Guardian
confirmation is on the registration path for minors, so this gates public registration,
not merely convenience.

Done when: a real test email arrives and `email_send_log` has rows.

## Task 7: season import and TeamLinkt cutover

Do not attempt without a real season CSV from the operator.

Use the admin importer at `/manage/import`. Import venues, teams and officials, then
games with `publishMode: published`. The commit recomputes standings for affected
divisions automatically. Then load `/schedule` and `/standings` and confirm **both**
read "from CMBA Connect".

Only after that, set `FEATURE_LEGACY_TEAMLINKT=false` in Vercel and monitor for about
7 days. The full runbook is in `docs/OPERATOR_ACTIONS.md`.

Done when: both pages render own data, the flag is false, and a week of monitoring is
clean. The P2.10 code strip (decision D1) unblocks after that.

## Reporting

For each task: done, blocked or skipped; the evidence used to confirm it; and anything
surprising. Prefer stopping and reporting over improvising, especially where a step
touches production data or member-visible content.
