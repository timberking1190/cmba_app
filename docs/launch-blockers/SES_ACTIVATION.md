# Launch blocker: SES activation (make transactional email actually deliver)

**Status: NOT STARTED. Nothing in this document is a record of work performed.** It is the
plan and the request sequence. No DPA is signed, no DNS record has been requested, no test
has been run. Written 2026-08-04 against launch date 2026-09-01 (28 days).

Owner of this blocker: [NAME, ROLE]. Board sponsor: [NAME].

## Read this first

CMBA Connect composes transactional email today, but it does not deliver it. The app falls
back to nodemailer's `jsonTransport` (no network, message logged and discarded) whenever
`SES_SMTP_HOST` is unset (`src/payload.config.ts` lines 269 to 288). As of the read-only
investigation recorded on 2026-06-29, the AWS SES account was in sandbox with no verified
sending identity (`docs/SES_SETUP.md` lines 5 to 15). That reading is two months old, so
Step 0 re-checks it before anything is built on top of it.

The single hard constraint: **guardian confirmation email is on the account-creation path for
minors.** A minor's account is created with `status: 'pending'` and only activates after the
guardian clicks the link in that email (`src/collections/hooks/users.ts` lines 90 to 131,
plus `/guardian/confirm`). Public self-registration is open at the access layer
(`src/access/users.ts` line 41). So until SES delivers, every minor who registers gets a dead
account and no email explaining why. **This gates opening public registration, not just
notifications.**

Two steps in the chain are controlled by parties outside CMBA: RAMP publishing the DNS
records, and AWS reviewing the production-access request. Those two set the critical path.

**Do these five things this week, in this order:**

1. Put a real name in "Owner of this blocker" and "Board sponsor" above.
2. Confirm who holds the AWS account and get admin access (Step 0, same day).
3. Create the SES domain identity and pull the three DKIM tokens (Step 1, 15 minutes).
4. Send the RAMP DNS request and ask for a **committed date** (Step 2). This is the long pole.
   Confirm RAMP's intake channel first: it is not established in this repo.
5. Create the SMTP credentials (Step 6). Not gated on DNS, so do it the same day as Step 1.

Everything after that is waiting, verifying, and a 30-minute config change. The AWS DPA is a
separate track that does not close just because SES starts sending: see the note in Step 0.

## What stays broken until this lands

All of the following are composed, logged to the `email-send-log` collection with
`transport: json`, and then thrown away. They are not delivered:

| Flow | Where it is sent from | Consequence today |
|---|---|---|
| Guardian confirmation for a minor | `src/collections/hooks/users.ts` lines 105 to 131 | Minor accounts stay `pending` forever. Blocks registration for under-18s. |
| Certification expiry reminders | `src/app/(frontend)/api/cron/certification-reminders/route.ts` (daily cron, `vercel.json`) | Coaches and officials are not told their NCCP, Respect in Sport, Safe Sport or record check is expiring. |
| Score report requests and reminders to team reps | `emailReportRequest` in `src/lib/emailEvents.ts`, called from `src/app/(frontend)/api/cron/score-reminders/route.ts` line 32 | Scores go unreported, standings go stale. |
| New game report notice to the league inbox | `src/collections/GameReports.ts` lines 90 to 97 (sends to `EMAIL_FROM`) | Submitted game and incident reports arrive with nobody notified. |
| Contested game escalations | `src/lib/emailEvents.ts` line 54, plus the 3-day stale sweep in the score-reminders cron | Contested games sit in the queue with nobody notified. |
| Email OTP account recovery | Category `email_otp` in `src/lib/email/meta.ts`; feature flag `FEATURE_EMAIL_OTP` is off (`.env.example` lines 100 to 102) | Recovery channel cannot be turned on at all. |
| Weekly digest, recognition, assignments, announcements, schedule changes | `src/lib/emailEvents.ts` | Engagement features run but silently reach nobody (`docs/SES_SETUP.md` lines 17 to 22). |

No code change is needed for any of them. They start delivering the moment the environment
variables are set and a deploy goes out.

## The dependency chain

```
[0] AWS account access
     |
     v
[1] Create SES domain identity in ca-central-1  ->  produces the 3 DKIM tokens
     |                                                    |
     |                                                    v
     |                                          [2] Fill tokens into the RAMP request
     |                                                    |
     |                                                    v
     |                                          [3] RAMP publishes records   <-- EXTERNAL
     |                                                    |
     |                                                    v
     |                                          [4] Propagation + SES says verified
     |                                                    |
     |                                                    v
     |                                          [5] SES production access    <-- EXTERNAL
     |                                                    |
[6] SMTP credentials  ------------------------------------+
                                                          |
                                                          v
                                              [7] Set SES_SMTP_* + EMAIL_FROM, redeploy
                                                          |
                                                          v
                                              [8] In-app verification (email-test / health)
```

Steps 1 and 6 can run the same day. Step 6 is not gated on DNS. Only the *use* of the
credentials is gated.

## Steps

### Step 0. Confirm who owns the AWS account and get admin access

- **Owner:** [AWS ACCOUNT OWNER]
- **Elapsed:** 15 minutes if credentials are in hand. If the account has to be recovered or a
  new one opened, the elapsed time is set by AWS support and is not established here.
  **VERIFY:** confirm the recovery or new-account path with AWS Support before assuming it
  fits inside this schedule. No timeline for it is asserted here.
- **Blocks:** everything.
- **Do:** confirm the AWS account ID [AWS ACCOUNT ID] and that it is held by
  [LEGAL ENTITY NAME] and not by a vendor or an individual volunteer. `docs/SES_SETUP.md`
  records a read-only investigation of an existing account on 2026-06-29, so an account
  exists; who holds it is not recorded in this repo and must be confirmed.
- **Verify:** `aws sts get-caller-identity` returns the expected account ID, and
  `aws sesv2 get-account --region ca-central-1` shows `ProductionAccessEnabled: false`
  (matching what `docs/SES_SETUP.md` line 5 recorded). If it already shows `true`, stop and
  re-read: the sandbox assumption in this document no longer holds.
- **Governance note, parallel not blocking:** the AWS DPA is listed as REQUIRED and NOT
  SIGNED in `docs/PROCESSOR_REGISTER.md` lines 41 and 56. Signing is a separate track owned
  by [BOARD SIGNATORY] and must complete before real guardian email flows, since these are
  minors' contact details under PIPEDA and Alberta PIPA. Do not treat SES going live as
  closing the DPA item.

### Step 1. Create the SES domain identity and read the DKIM tokens

- **Owner:** [PLATFORM OPERATOR]
- **Elapsed:** 15 minutes.
- **Blocked by:** Step 0. **Blocks:** Step 2 (the RAMP request cannot be sent without these
  three tokens).
- **Do:** run the commands already written in `docs/SES_RAMP_DNS_REQUEST.md` lines 21 to 26
  (`aws sesv2 create-email-identity` then `get-email-identity` for
  `DkimAttributes.Tokens`). Sending domain is `cmba.ab.ca`, which is Decision 0 in
  `docs/SES_SETUP.md` lines 27 to 37.
- **Gotcha, check this before you send the request:** AWS documents that each DKIM CNAME
  value is the token followed by a hosted zone that **varies by Region and cell**, and that
  the authoritative value is the `SigningHostedZone` field in the `CreateEmailIdentity` and
  `GetEmailIdentity` responses
  (https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html). The record shapes in
  `docs/SES_RAMP_DNS_REQUEST.md` assume `<token>.dkim.amazonses.com`. The DKIM domains table at
  https://docs.aws.amazon.com/general/latest/gr/ses.html does not list ca-central-1 by name; it
  falls under that table's "All other regions" row, whose value is `dkim.amazonses.com`. So the
  assumed shape is consistent with the docs, but read `SigningHostedZone` from your actual API
  response and use that. A wrong target here costs a full RAMP round trip.
- **Verify:** `aws sesv2 get-email-identity --email-identity cmba.ab.ca --region ca-central-1`
  returns three tokens and a `SigningHostedZone`. DKIM status will read pending. That is
  expected until Step 4.

### Step 2. Send the DNS request to RAMP

- **Owner:** [CMBA STAFF CONTACT WHO HOLDS THE RAMP RELATIONSHIP]
- **Elapsed:** 30 minutes to prepare and send.
- **Blocked by:** Step 1. **Blocks:** Step 3.
- **Do:** the request is already written. Use `docs/SES_RAMP_DNS_REQUEST.md`, substitute the
  three real tokens for `TOKEN1/TOKEN2/TOKEN3`, and send the ready-to-send note at the bottom
  of that file (lines 72 to 94). Do not rewrite it. Ask RAMP for a **committed date** in the
  reply, not just an acknowledgement, and record it here: RAMP committed date
  [DATE RAMP COMMITS TO].
- **The one thing to warn RAMP about twice:** the SPF change edits CMBA's existing live mail
  record for Google and Outlook. A domain may have only one SPF TXT record. If RAMP adds a
  second SPF record instead of merging, CMBA staff email starts failing SPF. This is called
  out in `docs/SES_RAMP_DNS_REQUEST.md` lines 42 to 53. Say it in the covering message too.
- **VERIFY:** RAMP's support intake channel and turnaround are not confirmed. The support
  page at https://www.rampinteractive.com/support/ returned HTTP 403 to an automated fetch on
  2026-08-04, so nothing about their process is asserted here. Before sending, confirm from
  RAMP directly: the correct intake channel for a DNS change (ticket, email, phone), whether
  they require the request from an authorized account contact, and their stated turnaround.
  Record it here once confirmed: [RAMP INTAKE CHANNEL], [RAMP STATED TURNAROUND].

### Step 3. RAMP publishes the records. EXTERNAL, START EARLY

- **Owner:** RAMP, chased by [CMBA STAFF CONTACT]
- **Elapsed:** unknown. **VERIFY with RAMP.** For planning only, budget 5 to 10 business
  days and replace this with their committed date as soon as you have it.
- **Blocked by:** Step 2. **Blocks:** Steps 4, 5, 7, 8, and launch.
- **Verify, do not take "done" on trust:** query the authoritative nameservers directly as
  well as public resolvers, because a change can be live at RAMP before it has propagated:
  ```bash
  # authoritative (RAMP), then two public resolvers
  dig +short @ns1.rampinteractive.com <TOKEN1>._domainkey.cmba.ab.ca CNAME
  dig +short @8.8.8.8               <TOKEN1>._domainkey.cmba.ab.ca CNAME
  dig +short @1.1.1.1               <TOKEN1>._domainkey.cmba.ab.ca CNAME
  # repeat for TOKEN2 and TOKEN3
  dig +short cmba.ab.ca TXT | grep spf1        # must return EXACTLY ONE spf1 record
  dig +short _dmarc.cmba.ab.ca TXT
  ```
  The SPF check is the one that protects existing staff email. If two `v=spf1` records come
  back, tell RAMP immediately and do not proceed.

### Step 4. Confirm SES sees the records and marks the identity verified

- **Owner:** [PLATFORM OPERATOR]
- **Elapsed:** minutes to 72 hours after the records are live. AWS states "It can take up to
  72 hours for changes to DNS settings to propagate" and that verification completes as soon
  as SES detects all required DKIM records
  (https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html). The same page's
  troubleshooting section is what to read if it is still unverified after 72 hours.
- **Blocked by:** Step 3. **Blocks:** Step 7, and it is the recommended predecessor for
  Step 5.
- **Verify:** `aws sesv2 get-email-identity --email-identity cmba.ab.ca --region ca-central-1`
  shows `VerifiedForSendingStatus: true` and DKIM status `SUCCESS`
  (`docs/SES_SETUP.md` lines 66 to 68). Do not proceed on a partial result: all three CNAMEs
  must be detected.
- **Keep the records published.** DKIM signing depends on them continuing to resolve. If RAMP
  ever rebuilds the zone, this breaks silently.

### Step 5. Request SES production access. EXTERNAL, START EARLY

- **Owner:** [PLATFORM OPERATOR], with [BOARD SPONSOR] available to answer follow-up
  questions from AWS.
- **Elapsed:** AWS states the Support team provides an initial response within 24 hours, that
  it will grant the request within that period if it can, and that it "might take longer" if
  AWS needs more information from you
  (https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). Budget 1 to 5
  business days and assume at least one round of questions.
- **Blocked by:** best submitted after Step 4. AWS says verifying your domain before
  requesting production access "helps to get your production access request approved faster"
  (same URL). If RAMP slips, see the fallback section: submitting early without a verified
  domain is allowed, it just raises the odds of a follow-up round.
- **Do:** the exact `aws sesv2 put-account-details` invocation is already written in
  `docs/SES_SETUP.md` lines 90 to 98, and the console path is the equivalent (Account
  dashboard, then "View Get set up page", then "Request production access", per the URL
  above). Confirm the
  `--additional-contact-email-addresses` value before sending: the repo currently has
  `ken@boostinnovation.ca`, which should probably be a CMBA address or include one. Set it to
  [CONTACT EMAIL FOR AWS CORRESPONDENCE].
- **Be ready for the acknowledgement.** The console form makes you tick a box agreeing that
  you only send email to people who explicitly requested it, and confirming that you have a
  process in place for handling bounce and complaint notifications (same URL). The board
  should know what is being attested to. **Truthful answer today:** this
  repo has no bounce or complaint webhook and no SNS handling. There is no such endpoint in
  `src/`. The stated position in `docs/SES_SETUP.md` line 95 is that bounces and complaints
  are handled by SES account-level suppression, plus the app's own `email-send-log` collection
  which records every send with status and error code (`src/lib/email/adapter.ts`). Note that
  AWS disables account-level suppression bulk actions and suppression-management API calls
  while an account is in the sandbox
  (https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html), so that control
  only becomes fully usable after this step is granted. Decide before submitting whether that
  answer is good enough for the board: [DECISION].
- **Verify:** `aws sesv2 get-account --region ca-central-1` shows
  `ProductionAccessEnabled: true`. Until then, sandbox rules apply: send only to verified
  addresses or the SES mailbox simulator, maximum 200 messages per 24 hours, maximum 1 message
  per second (same URL).

### Step 6. Create the SMTP credentials

- **Owner:** [PLATFORM OPERATOR]
- **Elapsed:** 30 minutes. **Can be done on day one, in parallel with Steps 2 to 5.**
- **Blocked by:** Step 0 only. **Blocks:** Step 7.
- **Do:** `docs/SES_SETUP.md` lines 69 to 86. Create a dedicated IAM user, attach send-only
  permissions, create an access key, and derive the SMTP password with the bundled
  `scripts/ses-smtp-password.mjs` for region `ca-central-1`. AWS confirms the SMTP username is
  the access key ID and the password is derived from the secret access key by the documented
  algorithm, and recommends a separate IAM user for this purpose
  (https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html).
- **Verify:** you captured the secret access key. AWS shows it once. If it is lost, delete the
  key and make a new one. Do not paste it into a chat, a shared doc, or this repo. Store it in
  [SECRET STORAGE LOCATION].
- **Note:** the SES SMTP host for this region is `email-smtp.ca-central-1.amazonaws.com` and
  port 587 uses STARTTLS, which is exactly what the app config already expects
  (`.env.example` lines 44 to 49, `src/payload.config.ts` lines 275 to 286). Endpoint per
  https://docs.aws.amazon.com/general/latest/gr/ses.html, port and TLS mode per
  https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html.

### Step 6b. Optional but recommended: prove the pipe while still in sandbox

- **Owner:** [PLATFORM OPERATOR]
- **Elapsed:** 30 minutes. Do this as soon as Steps 1 and 6 are done. It de-risks the last
  week by finding credential and TLS problems early instead of on 2026-08-25.
- **Do:** AWS allows sandbox sending to verified addresses and to the SES mailbox simulator
  (https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). So: verify
  [OPERATOR EMAIL ADDRESS] as an email-address identity in SES, then send one message through
  SMTP with the Step 6 credentials to `success@simulator.amazonses.com` and one to that
  verified address.
- **Verify:** SMTP AUTH succeeds and the verified address receives the message. A failure here
  is a credentials or region problem, not a DNS problem, and it is fixable immediately.
- **Sandbox trap that will bite you in Step 8:** `/api/v1/admin/email-test` sends only to the
  signed-in super admin's own account email, by design so it cannot be used as a relay
  (`src/app/(frontend)/api/v1/admin/email-test/route.ts`). In sandbox that address must itself
  be a verified SES identity or the send fails. Verify the admin address now.

### Step 7. Set the environment variables and redeploy

- **Owner:** [PLATFORM OPERATOR]
- **Elapsed:** 30 minutes plus deploy time.
- **Blocked by:** Steps 4 and 6. Real delivery to guardians additionally needs Step 5.
- **Do:** set `SES_SMTP_HOST`, `SES_SMTP_PORT`, `SES_SMTP_USER`, `SES_SMTP_PASS` and
  `EMAIL_FROM=no-reply@cmba.ab.ca` in Vercel for Production and Preview
  (`docs/SES_SETUP.md` lines 102 to 114). Leave `FEATURE_EMAIL_OTP=false` for now; turn it on
  only after Step 8 passes (`.env.example` lines 100 to 102).
- **Then redeploy. This is not optional.** Vercel documents that "Any change you make to
  environment variables are not applied to previous deployments, they only apply to new
  deployments" (https://vercel.com/docs/environment-variables). Setting the variables without
  a new deployment changes nothing, and the app will keep logging to `jsonTransport`.
- **Verify:** after the deploy, Step 8. Do not assume.

### Step 8. Verify from inside the app

- **Owner:** [PLATFORM OPERATOR], with [BOARD SPONSOR] told the result.
- **Elapsed:** 1 hour, plus a day of watching.
- **Blocked by:** Step 7.
- **Do, in this order:**
  1. `POST /api/v1/admin/email-test` as a super admin
     (`docs/SES_SETUP.md` lines 129 to 145). **Pass condition:** the response is
     `"transport":"ses","delivered":true` AND the message actually arrives in the inbox.
     Both halves are required: in the route, `delivered` is just `Boolean(SES_SMTP_HOST)`,
     so it reports that SES is configured, not that anything landed
     (`src/app/(frontend)/api/v1/admin/email-test/route.ts`). Inbox arrival is the only
     real proof. `"transport":"json"` means the environment variables did not reach the
     running deployment, so go back to Step 7.
  2. `GET /api/v1/admin/email-health` as a super admin. **Pass condition:** HTTP 200 with
     `configured: true`. The endpoint deliberately returns HTTP 503 when SES is unconfigured
     in production or when the 24-hour failure rate is elevated
     (`src/lib/email/health.ts` lines 62 to 81,
     `src/app/(frontend)/api/v1/admin/email-health/route.ts`), so a 503 here is a real
     failure, not a quirk. Point an uptime check at it.
  3. **The flow that actually gates launch:** create a test minor account using a guardian
     email address you control, then confirm the guardian email arrives, the
     `/guardian/confirm` link works, and the account flips from `pending` to active. Nothing
     else in this list proves registration works.
  4. Exercise password reset, and a reminder cron, and confirm each appears in the
     `EmailSendLog` collection (admin panel, System group) with `status: sent` and
     `transport: ses`.
  5. Watch `email-health` daily through launch week. Every failed send is also logged at
     error level (`src/lib/email/adapter.ts` lines 70 to 81).
- **Retention note for the privacy file:** `email-send-log` rows are PII free (salted
  recipient hash plus bare domain) and are swept at 90 days by the `ttl-sweep` cron
  (`EMAIL_LOG_RETENTION_DAYS` in `src/collections/EmailSendLog.ts` line 21, applied in
  `src/app/(frontend)/api/cron/ttl-sweep/route.ts` lines 21 and 39).

### Step 9. After a week of clean sending: tighten DMARC

- **Owner:** [CMBA STAFF CONTACT] via a follow-up request to RAMP.
- **Elapsed:** post-launch, roughly one to two weeks after Step 8.
- **Do:** move `_dmarc.cmba.ab.ca` from `p=none` to `p=quarantine`, then to `p=reject`,
  reading the aggregate reports at the `rua` address in between
  (`docs/SES_RAMP_DNS_REQUEST.md` lines 61 to 62). Not a launch blocker. Do not rush it: an
  early `p=reject` on a domain that also sends through Google and Outlook can break staff
  email.
- **VERIFY:** `dmarc@cmba.ab.ca` is the `rua` address in the request. Confirm that mailbox
  exists and someone reads it, otherwise the reports go nowhere.

## Backward schedule from 2026-09-01

Planning targets, not commitments. Replace the RAMP row with their committed date as soon as
you have it. Weekends included in elapsed estimates only where the work is a vendor wait.

| By | Step | Owner | Externally controlled |
|---|---|---|---|
| 2026-08-05 | 0. AWS access confirmed | [AWS ACCOUNT OWNER] | no |
| 2026-08-06 | 1. SES identity created, tokens in hand | [PLATFORM OPERATOR] | no |
| 2026-08-06 | 2. RAMP request sent, committed date requested | [CMBA STAFF CONTACT] | no |
| 2026-08-06 | 6. SMTP credentials created | [PLATFORM OPERATOR] | no |
| 2026-08-07 | 6b. Sandbox SMTP proof passes | [PLATFORM OPERATOR] | no |
| 2026-08-11 | **Go or no-go on the fallback.** If RAMP has not committed to a date by now, trigger the fallback below. | [BOARD SPONSOR] | decision |
| 2026-08-17 | 3. RAMP records live | RAMP | **YES** |
| 2026-08-20 | 4. SES identity verified, DKIM SUCCESS | [PLATFORM OPERATOR] | no |
| 2026-08-20 | 5. Production access submitted | [PLATFORM OPERATOR] | no |
| 2026-08-24 | 5. Production access granted | AWS | **YES** |
| 2026-08-25 | 7. Env set in Production and Preview, redeployed | [PLATFORM OPERATOR] | no |
| 2026-08-26 | 8. In-app verification passes, including the guardian flow | [PLATFORM OPERATOR] | no |
| 2026-08-27 | **Launch go or no-go on registration for minors** | [BOARD SPONSOR] | decision |
| 2026-08-27 to 2026-09-01 | Watch `email-health` daily | [PLATFORM OPERATOR] | no |
| after 2026-09-08 | 9. Tighten DMARC | [CMBA STAFF CONTACT] | no |

There are about 5 days of slack, all of it sitting in front of the two external steps. One
slow RAMP turnaround or two rounds of AWS questions consumes it. That is the argument for
sending the RAMP request this week rather than next.

## If RAMP slips

Escalation options, in order of preference. Each has a cost, so this is a board decision, not
an operator decision.

1. **Chase RAMP with a committed date and escalate through the account relationship.**
   Cheapest, no technical change.
2. **Submit the SES production-access request without waiting for domain verification.**
   Allowed. AWS only says a verified domain helps approval go faster
   (https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html). This takes the
   AWS wait off the critical path and leaves only RAMP on it. Low cost, small risk of an extra
   AWS round trip.
3. **Switch to a delegated subdomain, for example `mail.cmba.ab.ca`.** Note this does NOT
   remove RAMP from the path: they still have to publish the delegation NS records
   (`docs/SES_SETUP.md` lines 32 to 33, `docs/SES_RAMP_DNS_REQUEST.md` lines 11 to 14). It
   helps only if RAMP finds a single delegation easier to action than three CNAMEs plus an SPF
   edit. Ask them which is faster for them.
4. **Send from a domain CMBA fully controls.** The only option with no RAMP dependency
   (`docs/SES_SETUP.md` lines 34 to 36). Cost: the envelope sender is off the cmba.ab.ca brand,
   guardians receive a confirmation email from an unfamiliar domain, which is exactly the wrong
   trade for a first contact about a child's account. Treat as a last resort and only with a
   clear plan to migrate back.
5. **Delay opening public registration for minors past 2026-09-01** and launch the rest.
   Adults are unaffected by the guardian flow (`src/collections/hooks/users.ts` line 88), so a
   staged opening is technically possible. Whether it is acceptable is a board call:
   [DECISION].

## Open items to verify before this document is acted on

- **VERIFY:** RAMP's intake channel, whether the request must come from an authorized account
  contact, and their turnaround. Not confirmed here (403 on
  https://www.rampinteractive.com/support/ on 2026-08-04).
- **VERIFY:** who legally holds the AWS account, and whether the AWS DPA covering it is signed.
  `docs/PROCESSOR_REGISTER.md` lines 41 and 56 record it as required and pending.
- **VERIFY:** that `dmarc@cmba.ab.ca` and `no-reply@cmba.ab.ca` behave as intended:
  `dmarc@` needs to receive and be read, `no-reply@` needs a decision on whether replies bounce
  or route somewhere. Neither is settled in this repo.
- **VERIFY:** the current SPF TXT on `cmba.ab.ca` as it stands today, so the merged value sent
  to RAMP preserves every existing mechanism rather than assuming the value in
  `docs/SES_RAMP_DNS_REQUEST.md` line 49.
- **DECIDE:** whether "bounces and complaints handled by SES suppression" is a sufficient
  answer for the board given there is no bounce webhook in the codebase, or whether a bounce
  and complaint handler is added before real guardian sending begins.

## Sources

Repo (system facts):
`docs/SES_SETUP.md`, `docs/SES_RAMP_DNS_REQUEST.md`, `docs/PROCESSOR_REGISTER.md`,
`docs/OPERATOR_ACTIONS.md`, `src/payload.config.ts`, `src/lib/email/adapter.ts`,
`src/lib/email/health.ts`, `src/lib/email/meta.ts`, `src/lib/emailEvents.ts`,
`src/collections/hooks/users.ts`, `src/collections/GameReports.ts`,
`src/collections/EmailSendLog.ts`, `src/access/users.ts`,
`src/app/(frontend)/api/v1/admin/email-test/route.ts`,
`src/app/(frontend)/api/v1/admin/email-health/route.ts`,
`src/app/(frontend)/api/cron/certification-reminders/route.ts`,
`src/app/(frontend)/api/cron/score-reminders/route.ts`, `scripts/ses-smtp-password.mjs`,
`vercel.json`, `.env.example`.

Vendor process (fetched 2026-08-04):
- Sandbox limits, production-access request path and the 24-hour initial response:
  https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- Domain and DKIM verification, the 72-hour propagation statement, and `SigningHostedZone`:
  https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- SMTP credential creation and derivation from an IAM secret access key:
  https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- SMTP endpoint for ca-central-1 and the regional DKIM domain table:
  https://docs.aws.amazon.com/general/latest/gr/ses.html
- SMTP ports and TLS modes: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- Environment variables apply only to new deployments:
  https://vercel.com/docs/environment-variables
- RAMP InterActive support page, NOT successfully fetched (HTTP 403):
  https://www.rampinteractive.com/support/
