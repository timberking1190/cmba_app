# Operator action items (CMBA Connect, Stage C)

The running checklist of things only you (the operator) can do. Code-side work is
tracked in `docs/VERIFICATION.md`. Items are ordered by urgency.

## Do this next (unblocks MFA enforcement)

- [ ] **Enroll a second factor as the super admin.** Sign in, go to
  `/account/security`, and add a passkey OR an authenticator app (TOTP). Save the
  recovery codes. Do this for at least two admin accounts (a backup). This MUST be
  done before MFA enforcement is turned on, so no admin can be locked out.
- [ ] **Then turn on enforcement.** Set `MFA_ENFORCE=true` in Vercel (Production +
  Preview) and redeploy. Confirm you are prompted to challenge at the next sign-in
  and can still reach `/admin` and `/manage`. `MFA_ENFORCE=false` is the instant
  kill-switch if anything looks wrong; keep it handy for the first 1 to 2 weeks.

## Provisioning (before public registration launch)

- [ ] **AWS SES (ca-central-1).** Follow `docs/SES_SETUP.md`: pick the sending
  domain, have RAMP publish the DKIM/SPF/DMARC records for `cmba.ab.ca` (their
  nameservers host it, see `docs/SES_RAMP_DNS_REQUEST.md`), create the SMTP
  credentials, set `SES_SMTP_*` + `EMAIL_FROM`, and request SES production access (it
  is in sandbox now). Until then transactional email (guardian confirmation,
  reminders, contested escalations, email-OTP) is logged but not delivered.
  - **Then verify in-app (Step 6 of SES_SETUP):** POST `/api/v1/admin/email-test`
    (super admin) to send a real test to your own inbox and confirm
    `transport: ses`; GET `/api/v1/admin/email-health` for delivery rollups. Browse
    the `EmailSendLog` collection (System group) to watch for failures. The health
    endpoint returns 503 when SES is unconfigured in production or the failure rate
    is elevated, so it can back an uptime alert.
- [ ] **Framework upgrade (BLOCKED upstream, not actionable now).** Verified
  2026-06-30: Payload 3.85.1 (latest) caps Next at `<15.5.0`, but the Next advisory
  fixes are in `15.5.15+`. Upgrading to 15.4.11 (the max Payload allows) clears none
  and adds one, so it was reverted. Action: watch for a Payload 3.x release that
  widens the Next peer range to 15.5.15+ (or plan a Next 16 major upgrade), then run
  docs/OPERATOR_RUNBOOK.md section 3 and re-run `node scripts/audit-ci.mjs`. No
  operator action clears these today.
- [ ] **Independent penetration test** (web + API) using `docs/PENTEST_READINESS.md`;
  remediate findings.
- [ ] **Third-party security review / architecture assessment.**
- [ ] **Privacy Impact Assessment** sign-off (`docs/PRIVACY_IMPACT_ASSESSMENT.md`)
  by a Canadian privacy professional; keep it current.
- [ ] **Sign DPAs** with Supabase, AWS, and Vercel; confirm sub-processors are
  Canada-resident (`docs/PROCESSOR_REGISTER.md`).
- [ ] **Fill legal-doc placeholders** (effective dates, Privacy Officer contact in
  Site Settings) and confirm the `security@cmba.ab.ca` disclosure mailbox.
  - **Partially done, checked read-only against prod on 2026-08-04.** Site Settings
    already carries a Privacy Officer contact: `CMBA Privacy Officer` /
    `privacy@cmba.ab.ca` / `(403) 804-3396`, and a `league@cmba.ab.ca` contact
    address. So the CONTACT ROUTE exists and the legal copy that points at it is
    not dangling.
  - **What is still missing is different, and is governance rather than content:**
    PIPEDA accountability (principle 1) wants a designated INDIVIDUAL who is
    accountable, not only a role mailbox. "Name the Privacy Officer" in the
    external-assurance list means recording a person. The app does not need a code
    change for that; the board needs to designate someone, and only then is the
    field a true statement of accountability rather than an alias.

## Observability (P1.5)

- [ ] **Sentry (error monitoring).** Create a Sentry project in the EU region, sign
  Sentry's DPA, and set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in Vercel (Production
  + Preview). It stays off until the DSN is set. No personal data is sent
  (`sendDefaultPii` off + `scrubEvent`); confirm this on the first captured event.
  Board decision to record: accept a US-headquartered processor for non-personal
  diagnostics.
- [ ] **Vercel Web Analytics + Speed Insights.** Enable both in the Vercel project
  dashboard (no key needed). Cookieless and aggregate; no child profiling.
- [ ] **Sync the privacy policy version.** The privacy policy now discloses Sentry
  and Vercel Analytics and is bumped to `2026-07-01` in `src/content/legal.ts`. Bump
  the `PolicyVersions` global's privacy version to match at launch so consent
  re-acceptance reflects the disclosure (safe now, before any public accounts).
  - **Confirmed drift, read-only check against prod on 2026-08-04:** the
    `PolicyVersions` global still reads `terms 2026-06-01 / privacy 2026-06-01 /
    guardian 2026-06-01`, while the shipped privacy copy is `2026-07-01`. So this
    is a one-field change in the admin (System group, Policy Versions): set privacy
    to `2026-07-01`. There were 5 user rows at the time of checking, so the
    re-consent blast radius is effectively nil, which is what "safe now, before any
    public accounts" was counting on. It gets materially harder after registration
    opens, so do it before Sept 1, not on the day.

## Migrations

- [ ] Future Payload migrations are committed but applied by you. Run
  `npm run migrate` against a Supabase branch first, then production. (The
  `add_mfa_schema` migration is already applied.)
- [x] **Apply `20260702_054408_add_email_send_log`** (adds the `email_send_log`
  table for the email health surface, P0.2). APPLIED to ca-central-1 on
  2026-08-04, batch 24, immediately before the PR #44 deploy so schema led code.
- [x] **Apply `20260702_063142_add_season_surveys`** (adds the `season_surveys` and
  `survey_responses` tables for the P2.9 season survey). APPLIED to ca-central-1 on
  2026-08-04, batch 24. To run a survey: create a SeasonSurvey in the admin panel
  (Engagement group), add questions, set status to Open, and optionally turn on
  "Show results" to publish the aggregate to members at `/survey`.
- [x] **Apply `20260804_155514_merged_schema_snapshot`** (snapshot-only, no schema
  change). Recorded in batch 24. It exists because Payload picks the
  `migrate:create` diff base by sorting snapshot FILENAMES, and merging main with
  feat/launch-readiness interleaved two chains so the highest-sorting snapshot no
  longer described the real schema. Its companion .json is the true post-merge
  schema and is now the baseline. Do not delete it.

Verified after applying: batch 23 to 24, 28 to 31 migrations recorded, 119 to 125
tables, all 6 new tables, all 5 new enums, and the 3 new
`payload_locked_documents_rels` columns present.

## Data / cutover

- [ ] Set `TOTP_ENC_KEY` in Vercel (a 32-byte base64 key, separate from
  `PAYLOAD_SECRET`; one was generated into local `.env`). Treat it as a managed key:
  rotating it invalidates existing TOTP enrollments.
- [ ] **TeamLinkt cutover runbook** (make this app the source of truth for schedule
  and standings). Do these in order:
  1. **Import the season.** Use the admin importer at `/manage/import` (or the API
     `/api/v1/import/validate` then `/commit`) to load venues, teams, officials, and
     the games CSV. Import games with `publishMode: published`. The commit now
     recomputes standings for the affected divisions automatically.
  2. **Verify own data.** Load `/schedule` and `/standings`. The source note should
     read "from CMBA Connect" (not "via TeamLinkt"), which confirms the pages are
     serving our own data. Spot-check a few games and that standings totals match the
     official TeamLinkt figures. Force a recompute if needed with
     `POST /api/v1/admin/standings/recompute` (admin; optional `{ "divisionId": N }`).
  3. **Cut over.** Set `FEATURE_LEGACY_TEAMLINKT=false` in Vercel (Production +
     Preview) and redeploy. Now `/schedule` and `/standings` read ONLY our data; the
     TeamLinkt embed is no longer used as a fallback.
  4. **Monitor for about 7 days.** Watch the pages and error monitoring. If anything
     looks wrong, set `FEATURE_LEGACY_TEAMLINKT=true` to restore the fallback instantly.
  5. **After the monitoring window,** the schedule/standings library consolidation
     (removing the legacy fallback code) can be completed (see docs/VERIFICATION.md,
     P2.10). That is a code step, gated on this cutover being stable.
