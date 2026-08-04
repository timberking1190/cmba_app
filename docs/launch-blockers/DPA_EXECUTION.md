# DPA Execution: per-vendor checklist

**Status: NOTHING IN THIS DOCUMENT IS EVIDENCE OF WORK PERFORMED.** No DPA below is
signed, accepted or filed. This is a set of instructions and requests. Every DPA in
`docs/PROCESSOR_REGISTER.md` is still marked REQUIRED and pending, and every DPA
column in `docs/processors.md` is still unsigned. Do not cite this file as proof of
anything except that the work was planned.

Why it matters: signed DPAs with Supabase, AWS and Vercel are a named launch blocker
in `docs/SECURITY.md` ("Required external assurance", item 4) and in
`docs/OPERATOR_ACTIONS.md`. Launch is 2026-09-01.

Owner of this checklist: the Privacy Officer designated in `docs/DECISIONS.md` (D5).
Signing authority for anything that needs a real signature:
[NAME + BOARD ROLE OF AUTHORISED SIGNATORY]. Legal entity to name on any counterpart:
[CMBA REGISTERED LEGAL ENTITY NAME], [REGISTERED ADDRESS].

## Start here

Four actions, in this order. Everything after this section is the detail behind them.

1. **Check the Vercel plan (section 3).** If it is Hobby, Vercel's DPA does not apply
   to CMBA at all. This is the only item here that fails silently, and fixing it is a
   spend decision, so find out first.
2. **Send the vendor questions (sections 1, 2, 3).** Sub-processor and region answers
   come back on the vendor's timetable, not CMBA's. Send them before you start
   collecting PDFs, not after.
3. **Name the signatory.** Sentry in particular cannot be accepted by anyone without
   an Owner or Billing role on the Sentry organization.
4. **Settle the two optional processors.** Turnstile (section 5) is still an open
   call. Sentry (section 4) has already been accepted in principle by
   `docs/adr/0004-accept-us-headquartered-processors.md`; what is left there is its
   DPA and a region choice that cannot be undone. Leaving either switched off is a
   valid answer and closes the row.

## Read this before you start

1. **The vendors do not all work the same way.** Supabase, AWS, Vercel and Cloudflare
   all incorporate their DPA by reference into terms CMBA has already accepted; only
   Sentry is a click in a product settings page. Vercel additionally has a plan
   eligibility catch. Do not assume a signature ceremony.
2. **A GDPR DPA is what is on offer; PIPEDA and Alberta PIPA are what apply to CMBA.**
   Every document below is drafted for GDPR. Whether the GDPR form satisfies CMBA's
   PIPEDA Principle 1 accountability obligation for a platform holding minors' data is
   a legal question, not an operator question. See "What CMBA cannot close alone".
3. **Region pinning is a console setting, not a contract term.** The Canadian
   residency posture in `docs/PROCESSOR_REGISTER.md` comes from configuration
   (Supabase project region, `vercel.json` `regions`, SES endpoint), not from anything
   the vendor promised in the DPA. **VERIFY** while executing: read each DPA for any
   data-location commitment. No vendor DPA was read end to end for this checklist, only
   the specific clauses quoted below, so "these DPAs do not promise Canada" is an
   assumption to check, not a finding. If it holds, record it as an accepted gap rather
   than implying the DPA guarantees residency.
4. **Screenshot everything as you go.** For click-through and incorporated-by-reference
   DPAs there is no countersigned PDF to file, so the acceptance record is the
   screenshot plus the version and date of the document you accepted.

---

## 1. Supabase (Postgres database + Storage). Most sensitive.

### What CMBA is agreeing about

Per `docs/PROCESSOR_REGISTER.md`: the primary data store for all application data plus
both object-storage buckets. Data categories: member contact data, roles, consent
records, certifications, team memberships, scores and game data, the audit log, and
the contents of uploaded files, including youth scoresheet photos and incident photos
in the private bucket. This is the most sensitive processor on the register and it
holds data about minors under the guardian consent model.

Residency: `ca-central-1` (Montreal), chosen at project creation, native backups stay
in region. Live project `cmba-connect`, ref `pdwautioosstdgbbblxl`
(`docs/PROCESSOR_REGISTER.md`, `docs/processors.md`, `CLAUDE.md`).

Also worth stating to the board: there is no Postgres RLS on this database. Payload
access functions in `src/access/` are the authorization boundary (`CLAUDE.md`). That
does not change the DPA, but it changes what a Supabase-side compromise or a mistaken
service-role key would expose.

### How the DPA is actually executed (verified)

**Incorporated by reference. There is no separate signature.** The Supabase DPA at
https://supabase.com/legal/dpa opens: "This Data Processing Addendum (the 'DPA')
supplements and forms part of the Supabase Terms of Service available at
https://supabase.com/terms, or such other agreement entered into between the Customer
and Supabase Pte. Ltd", and is "effective as of the Effective Date of the Agreement".
On the SCCs it states at 12.2: "The Parties agree that acceptance of the Agreement
shall have the same effect as signing the SCCs". Source fetched:
https://supabase.com/legal/dpa

Supabase's own security page describes it as self-service: "A Data Processing
Agreement (DPA) is available for customers who need a formal GDPR data processing
contract. Request or view the DPA." Source fetched: https://supabase.com/security

**VERIFY:** third-party summaries claim a signed copy must be returned to
`privacy@supabase.com`. That instruction does **not** appear on any Supabase page
fetched for this checklist. Do not act on it without confirmation. If the board wants
a countersigned artifact rather than incorporation by reference, ask Supabase support
directly (dashboard support ticket) and quote the request in
`docs/PROCESSOR_REGISTER.md` rather than assuming.

### Exactly what to do

1. Open the Supabase dashboard, organization that owns project `pdwautioosstdgbbblxl`.
2. Go to Organization settings. Supabase documents an org documents page at
   `dashboard/org/_/documents` and a security page at `dashboard/org/_/security`;
   the documents page is described as where "Enterprise and Team customers can access
   our ISO 27001 certificate" (source fetched:
   https://supabase.com/docs/guides/security). Expect the compliance documents there
   to be plan-gated. Capture whatever CMBA's tier can actually see.
3. Save https://supabase.com/legal/dpa as PDF, with the version or last-updated string
   visible, on [DATE].
4. Subscribe to sub-processor change notifications at
   https://supabase.com/legal/customer-resources/subprocessor-list (the page carries a
   "Subscribe to updates. Receive an email notification when Supabase updates its
   sub-processors" form taking first name, last name and email). Use a role address,
   not a personal one: [privacy@cmba.ab.ca OR CHOSEN ROLE ADDRESS]. Source fetched:
   https://supabase.com/legal/customer-resources/subprocessor-list
5. Raise a support ticket asking the two questions in the next section in writing.
   A dashboard answer is not a record; an email or ticket reply is.

### Confirm while executing

- **Sub-processor list and Canada.** Download the current sub-processor PDF linked
  from the subprocessor-list page. The list is delivered as a PDF and no sub-processors
  are named on the page itself, so the names and regions must be read out of the PDF.
  The link at the time of drafting was labelled "Subprocessor List - Updated June 1,
  2026"; check whether a newer one is posted. `docs/PROCESSOR_REGISTER.md`
  already records that Supabase runs on AWS for `ca-central-1`. Confirm in writing
  **which sub-processors touch data for a `ca-central-1` project specifically**, and
  which, if any, are outside Canada. Support, telemetry and logging sub-processors are
  the usual ones that are not.
- **Region and backups.** Confirm the project region is `ca-central-1` and that
  automated backups, PITR and any read replicas stay in region. `docs/processors.md`
  records region confirmed in console on 2026-06-18 and buckets on 2026-06-19;
  re-confirm at execution time rather than relying on that date.
- **Counterparty.** The DPA names **Supabase Pte. Ltd**. Confirm that is the entity
  CMBA actually contracts with on its plan, since it affects which jurisdiction's
  courts and which transfer mechanism apply.
- **Both buckets.** `cmba-public` and `cmba-private` are covered by the same agreement;
  confirm nothing about the private bucket sits outside it.

### Evidence to file

- PDF of https://supabase.com/legal/dpa with the version and the date captured.
- PDF of the sub-processor list as at [DATE], plus the subscription confirmation email.
- The support ticket thread answering the `ca-central-1` sub-processor question.
- Screenshot of the project's region setting.

File to: [CMBA SHARED DRIVE PATH]/compliance/dpa/supabase/. Then update the Supabase
row in `docs/PROCESSOR_REGISTER.md` and `docs/processors.md` with the mechanism
("incorporated by reference into Supabase ToS"), the DPA version, the date, and who
confirmed it. Do not mark it signed; mark it accepted by incorporation.

---

## 2. AWS (SES)

### What CMBA is agreeing about

Per `docs/PROCESSOR_REGISTER.md`: transactional email only. Certification expiry
reminders, score-report requests, contested-game escalations, official-assignment
notices, guardian-confirmation links, and email one-time passcodes for recovery.
Data: recipient email address and the message body. Bodies are written to contain no
PII and link to the portal instead. `docs/processors.md` additionally notes recipient
name in headers.

Residency: `ca-central-1`, sent over `email-smtp.ca-central-1.amazonaws.com`
(`docs/PROCESSOR_REGISTER.md`, `docs/SES_SETUP.md`).

Current state: **not yet provisioned.** `docs/SES_SETUP.md` records SES enabled in
`ca-central-1` but still in sandbox (`ProductionAccessEnabled: false`). Until
`SES_SMTP_*` is set the app falls back to nodemailer `jsonTransport` and sends nothing.
So today AWS processes no CMBA personal data at all. That is the honest status and it
should be stated that way in the register until real delivery starts.

### How the DPA is actually executed (verified)

**Already in the AWS Service Terms. Nothing to sign.** The AWS GDPR Center states:
"The AWS Service Terms include the SCCs adopted by the European Commission (EC) in
June 2021, and the AWS DPA confirms that the SCCs will apply automatically whenever an
AWS customer uses AWS services to transfer customer data to countries outside of the
European Economic Area that have not received an adequacy decision from the EC (third
countries)." Source fetched: https://aws.amazon.com/compliance/gdpr-center/

Read that qualifier before quoting it to anyone. It is a statement about EU transfer
mechanics, and it is conditioned on the destination lacking an EC adequacy decision.
Whether it engages at all for a Canada-resident deployment, and whether it does any
work for CMBA's actual PIPEDA and Alberta PIPA obligations, is a question for
[PRIVACY COUNSEL], not something to settle from this page.

AWS Artifact is where account-level agreements are accepted, reviewed and confirmed:
"In the AWS Artifact console, you can review and accept such agreements", and it can
be used "to confirm that your AWS account or organization has accepted an agreement".
The only agreement that page uses as an example is the HIPAA BAA; it does not say a
GDPR DPA is available to accept there. Source fetched:
https://docs.aws.amazon.com/artifact/latest/ug/managingagreements.html

**VERIFY:** open AWS Artifact > Agreements for CMBA's account and check whether any
data-processing agreement is listed as available to accept. Based on the GDPR Center
wording it should already be live via the Service Terms with nothing to click, but
confirm rather than assume, and screenshot whatever the Agreements tab actually shows
for this account.

### Exactly what to do

1. Sign in to the AWS console as the account root or an admin for the CMBA account.
2. Open **AWS Artifact > Agreements**. Screenshot the list. Accept nothing you do not
   understand; if a DPA-style agreement is offered, read it before accepting and route
   it to [AUTHORISED SIGNATORY] if it needs authority to bind CMBA.
3. Save the AWS Service Terms as PDF on [DATE], with the DPA section visible.
4. Subscribe for sub-processor change notifications using the subscribe link on
   https://aws.amazon.com/compliance/sub-processors/ (that page links onward to
   https://pages.awscloud.com/sub-processors.html to subscribe). The page states:
   "AWS will update this page at least 30 days before engaging a new sub-processor,
   and if you subscribe for updates, AWS will notify you by email of changes to this
   page." Source fetched: https://aws.amazon.com/compliance/sub-processors/
5. Separately, and not part of the DPA: finish the SES provisioning steps in
   `docs/SES_SETUP.md` (production access out of sandbox, verify the `EMAIL_FROM`
   domain, set `SES_SMTP_*`). Do not set `FEATURE_EMAIL_OTP` until SES is live.

### Confirm while executing

- **Sub-processor list and Canada.** The AWS sub-processors page names entities with
  their processing locations by AWS region (for example "Amazon Data Services, Inc."
  against a list of US regions). Read the entries that apply to `ca-central-1` and to
  SES specifically. Record any sub-processor that would process CMBA email outside
  Canada, including support and abuse-handling functions.
- **Region pinning.** SES is a regional service. Confirm the SES identity, configuration
  set and SMTP endpoint are all `ca-central-1` and that no other region is configured.
  `docs/SES_SETUP.md` is the runbook.
- **No PII in bodies.** This is a CMBA-side control, not an AWS one, but confirm it
  still holds before go-live so the register's claim stays true.
- **Suppression list and logs.** Ask where SES stores the account-level suppression
  list and any event-destination logs, since those contain recipient addresses.

### Evidence to file

- Screenshot of AWS Artifact > Agreements showing the state of CMBA's account on [DATE].
- PDF of the AWS Service Terms as at [DATE].
- PDF of the sub-processors page and the subscription confirmation email.
- Screenshot of the SES identity showing region `ca-central-1`.

File to: [CMBA SHARED DRIVE PATH]/compliance/dpa/aws/. Update `docs/PROCESSOR_REGISTER.md`
to say "covered by AWS Service Terms (DPA incorporated)" with the date checked, not
"signed".

---

## 3. Vercel (hosting and compute, and Vercel Web Analytics + Speed Insights)

### What CMBA is agreeing about

Per `docs/PROCESSOR_REGISTER.md`: Vercel runs the Next.js and Payload application,
serves pages, runs API routes and cron jobs, and terminates TLS. In transit, any
request or response can contain personal data while it is being served. Vercel is not
the data store; persistence is Supabase. Logs are scrubbed of PII by design and no
personal data goes in URLs.

Vercel Web Analytics and Speed Insights are the same provider and, per the register,
are covered by the same DPA. Data: cookieless aggregate page views, Web Vitals, and a
few named non-personal engagement event counts. No user identifier, no cross-site
tracking, no advertising, children are never profiled.

Residency: `yul1` (Montreal). Confirmed in the repo: `vercel.json` contains
`"regions": ["yul1"]`. Vercel's own region table confirms `yul1` maps to
`ca-central-1`, Montreal, Canada (source fetched: https://vercel.com/docs/regions).
Note the register's own caveat: analytics is processed in the US and is aggregate and
non-identifying.

### How the DPA is actually executed (verified)

**Incorporated by reference, with a plan eligibility catch.** Vercel's terms state:
"We will process the personal information in Your Content, Account Information, and
System Data as a data controller or data processor in accordance with Vercel's Data
Processing Addendum ('DPA'), which is incorporated by reference". Source fetched:
https://vercel.com/legal/terms

The DPA itself states it "shall become legally binding upon Customer entering into the
Agreement or upon execution of this Addendum". A separate deemed-signature line covers
the transfer clauses specifically: "By entering into the Agreement, Data Exporter is
deemed to have signed these Standard Contractual Clauses incorporated herein". Source
fetched: https://vercel.com/legal/dpa

**The catch, and it is the single most important line in this document.** The Vercel
DPA's introduction states: "This Addendum applies to Vercel's Processing of Personal
Data as a Processor under the Agreement for Customers who are on Enterprise and Pro
plans." Source fetched: https://vercel.com/legal/dpa

**If CMBA's Vercel team is on the Hobby plan, there is no processor DPA in force.**
That is a hard blocker, not a paperwork detail: it would mean CMBA has no data
processing agreement with the host that terminates TLS on minors' data. Check the plan
first, before anything else in this section.

Two more plan-dependent facts from the same docs, both relevant to `yul1` pinning:
Hobby is limited to a single function region (Pro gets 5, Enterprise all), and "On the
Hobby plan, Routing Middleware runs in fewer regions". Source fetched:
https://vercel.com/docs/functions/configuring-functions/region

### Exactly what to do

1. **Check the plan.** Vercel dashboard > the team that owns `cmbaplatform.vercel.app`
   > Settings > Billing. Record the plan. If it is Hobby, upgrading to Pro is a
   prerequisite for the DPA to apply at all. Budget: [MONTHLY COST, TO BE CONFIRMED
   AGAINST VERCEL'S CURRENT PRICING PAGE AT PURCHASE TIME]. Do not quote a price from
   memory; read it off the pricing page on the day.
2. Save https://vercel.com/legal/dpa and https://vercel.com/legal/terms as PDFs on
   [DATE], with version or last-updated strings visible.
3. Open Vercel's Trust Center at https://security.vercel.com/ . Under Legal it carries
   Subprocessors, a Data Processing Agreement and Data Subject Requests, and the page
   offers "Get access" and "Bulk download" controls. Source fetched:
   https://security.vercel.com/ . **VERIFY** which of those documents CMBA can read
   without an access request; if any require one, request it for [ROLE ADDRESS].
   Download the sub-processor list either way.
4. Email `privacy@vercel.com` to subscribe to sub-processor change notifications. The
   DPA specifies this route and gives a five calendar day objection window. Source
   fetched: https://vercel.com/legal/dpa
5. Ask Vercel support the two region questions below in writing.

### Confirm while executing

- **Sub-processor list and Canada.** The Trust Center sub-processor list names
  companies including Honeycomb, Datadog, Microsoft, Google and AWS, and its recent
  updates name AI vendors including Cerebras, Baseten and Groq (source fetched:
  https://security.vercel.com/). Several of those are observability and logging
  vendors, and observability data is the most likely path for CMBA request data to
  leave Canada. Get in writing which sub-processors receive request-level data for a
  `yul1`-pinned project, and where they process it. Read the current list rather than
  relying on those names, which were what the page showed at drafting time.
- **Region pinning, and the proxy caveat.** `vercel.json` pins `"regions": ["yul1"]`.
  But Vercel's own docs say: "Vercel deploys Routing Middleware to all regions by
  default, regardless of your region settings." Source fetched:
  https://vercel.com/docs/functions/configuring-functions/region . This repo has
  `src/proxy.ts`, which runs on every non-static request and reads the `payload-token`
  cookie to gate `/account`, `/compliance`, `/manage` and `/rep`.
  **VERIFY with Vercel support:** does the all-regions default apply to a Next.js
  `proxy.ts` file, and if so, in which regions is that cookie evaluated? If the answer
  is "all regions", the register's residency claim needs an explicit, recorded
  exception for proxy execution. Do not close this item on a docs reading alone.
- **Default region is US.** Vercel documents `iad1` (Washington, D.C.) as the default
  for all new projects. Confirm in the dashboard, Settings > Functions > Function
  Regions, that the project default is `yul1` and not just the `vercel.json` value, and
  that no per-function override in `vercel.json` sets another region. Same source.
- **Failover.** Vercel documents that "In the event of regional downtime, application
  traffic is automatically rerouted to the next closest region", and that configurable
  function failover regions are an Enterprise feature (source fetched:
  https://vercel.com/docs/regions). The published failover priority table is for the
  `iad1` default and does not state where a `yul1` project fails over to. Ask in
  writing what happens to a `yul1`-pinned function during a `yul1` outage on CMBA's
  plan, and whether that can move processing to a US region. Record the answer as a
  residency exception if it can.
- **Web Analytics.** Confirm with Vercel that Web Analytics and Speed Insights are
  covered by the same DPA, since the register asserts that. Confirm the analytics data
  carries no user identifier. Do not treat US processing of aggregate analytics as a
  residency breach without confirming it is genuinely non-identifying.

### Evidence to file

- Screenshot of the billing page showing the plan on [DATE].
- PDFs of the DPA and terms with versions.
- Sub-processor list downloaded from the Trust Center, plus the access grant.
- The `privacy@vercel.com` subscription confirmation.
- Support thread answering the proxy-region, failover and analytics questions.
- Screenshot of Settings > Functions > Function Regions showing `yul1`.

File to: [CMBA SHARED DRIVE PATH]/compliance/dpa/vercel/. Update both register files
with the plan, the mechanism, the version, and any recorded residency exception.

---

## 4. Sentry (error monitoring). Only if enabled.

### Do not start this unless Sentry is being turned on

Per `docs/PROCESSOR_REGISTER.md`, Sentry is **off by default** and stays off unless
`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set. Leaving it off is still a valid
outcome; if that is the call, record it and skip this section.

The acceptance decision is already taken, so do not re-litigate it:
`docs/adr/0004-accept-us-headquartered-processors.md` (Accepted 2026-08-04) accepts
Sentry as a processor of non-personal diagnostics only, conditional on the scrubbing
staying in place, and says Sentry "can be enabled once its DPA is executed and the DSN
is set". Note that `docs/OPERATOR_ACTIONS.md` still carries an unchecked "board
decision to record" line for Sentry; ADR 0004 supersedes it. What is genuinely left
here is the DPA, the irreversible region choice, and confirming the scrubbing.

### What CMBA is agreeing about

Diagnostic error events configured to exclude personal data: `sendDefaultPii` is off
and `scrubEvent` removes the user object including IP, cookies, authorization headers,
request bodies and query strings before send. No names, emails, accounts or child data.
No session replay. Scrubbing lives in `src/lib/observability/sentry.ts`; init in
`src/instrumentation.ts` and `src/components/Observability.tsx`
(`docs/PROCESSOR_REGISTER.md`).

Residency: **there is no Canadian option.** Sentry documents exactly two regions, US
(Iowa) and EU (Frankfurt), and states "once selected, your data storage location can't
be changed". Source fetched: https://docs.sentry.io/organization/data-storage-location/
The register's instruction to create the project in the EU region is therefore a
one-shot, irreversible decision. Get it right at account creation.

### How the DPA is actually executed (verified)

**Self-serve click-through inside the product, by an Owner or Billing role, with an
optional signed counterpart.** Sentry's help article states the DPA is in the "Legal &
Compliance" section of the organization's navigation, that "All members can view this
document" but only members with an Owner or Billing role can sign or accept it, that a
pre-signed counterpart is available via a DocuSign link for customers who want one, and
that after acceptance "you can see who accepted it and when". Source fetched:
https://www.sentry.help/en/articles/13965008-how-do-i-sign-your-data-processing-addendum

The DPA text itself says it "is effective as of the date electronically agreed and
accepted by you", and names `legal@sentry.io` for DPA matters. Source fetched:
https://sentry.io/legal/dpa/

### Exactly what to do

1. Create the Sentry organization **in the EU region**. This cannot be undone.
2. Ensure [AUTHORISED SIGNATORY] holds an Owner or Billing role on the Sentry
   organization, since no one else can accept.
3. Organization Settings > Legal & Compliance. Read the DPA, then accept.
4. Screenshot the post-acceptance state showing who accepted and when.
5. If the board wants a paper counterpart, use the DocuSign link offered on the same
   page rather than emailing a document around.
6. Only then set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel production env.

### Confirm while executing

- **Sub-processor list.** Sentry's list names AWS, Anthropic PBC, Cloudflare, Google
  LLC, Intercom, OpenAI, Sinch Email (Mailgun) and Twilio (SendGrid), with EU and/or US
  processing, plus affiliates including Sentry Software Canada Inc. in Toronto. Source
  fetched: https://sentry.io/legal/subprocessors/ . Two things to note for the board:
  AI vendors appear on that list, and an EU-region organization still has US-located
  sub-processors. Neither is disqualifying given the events carry no personal data, but
  both should be recorded rather than glossed.
- **Subscribe to changes** via the RSS feed offered on the sub-processors page
  ("Subscribe to this RSS feed to be notified of Sentry subprocessor changes"). The DPA
  also commits to "thirty (30) days' prior written notice to you via email or other
  means specified on the Subprocessor Page". Sources fetched:
  https://sentry.io/legal/subprocessors/ and https://sentry.io/legal/dpa/
- **Prove the scrubbing before enabling.** The register's claim that no personal data
  reaches Sentry is a CMBA-side claim. It is only true if `scrubEvent` behaves as
  documented. Confirming that is a code and test task, not a DPA task, and it must not
  be recorded as done here.

### Evidence to file

- Screenshot of Legal & Compliance showing the accepted DPA, acceptor and timestamp.
- PDF of the DPA version accepted, plus the DocuSign counterpart if one was used.
- Screenshot of the organization's region setting showing EU.
- PDF of the sub-processors page as at [DATE].

File to: [CMBA SHARED DRIVE PATH]/compliance/dpa/sentry/. Then flip the Sentry row in
`docs/PROCESSOR_REGISTER.md` from "REQUIRED if enabled" to accepted, with date and
acceptor, and record the board decision reference.

---

## 5. Cloudflare Turnstile (bot challenge). Only if enabled.

### Do not start this unless Turnstile is being turned on

Per `docs/PROCESSOR_REGISTER.md`, Turnstile is **off by default** and disabled unless
both `TURNSTILE_SECRET` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set. When off, rate
limiting and the honeypot still protect the public game-report form. Leaving it off is
a legitimate outcome and the cheapest way to close this row.

### What CMBA is agreeing about

An optional privacy-respecting CAPTCHA on the public game-report form. No behavioural
profiling. Cloudflare sees the visitor's IP address during a challenge, which is
standard for any CAPTCHA. No member account data is sent; the server receives only a
pass/fail token to verify (`docs/PROCESSOR_REGISTER.md`).

Residency: Cloudflare global edge. A challenge can be served from outside Canada. This
is the one processor on the register with **no Canadian residency claim at all**, which
is why the register says to confirm the residency posture before enabling. An IP
address of a person submitting a youth game report is personal data.

### How the DPA is actually executed (verified)

**Incorporated by reference into the Self-Serve Subscription Agreement.** Section 6.1
of Cloudflare's self-serve terms reads: "Cloudflare will handle such Personal Data in
compliance with Cloudflare's Data Processing Addendum ('Data Processing Addendum'),
which is hereby incorporated by reference into this Agreement", pointing at
https://www.cloudflare.com/cloudflare-customer-dpa/ . Source fetched:
https://www.cloudflare.com/terms/

The DPA itself says it "forms part of the Main Agreement" and is effective from the
date "on which Customer signed or the parties otherwise agreed to this DPA", and
includes an authority warranty for anyone accepting on the customer's behalf. Source
fetched: https://www.cloudflare.com/cloudflare-customer-dpa/

**VERIFY:** confirm which Cloudflare agreement actually governs CMBA's account. The
incorporation clause quoted above is from the Self-Serve Subscription Agreement. If
Turnstile is used on a free standalone account, confirm that the Self-Serve
Subscription Agreement is the governing agreement for it. Check the account's legal
terms in the Cloudflare dashboard rather than assuming.

**VERIFY:** capture the DPA version in force on the day. The page carried "Version 6.4"
effective 2026-04-03 when this checklist was drafted; Cloudflare versions this document,
so record the version string and date from the page you actually save rather than
copying that one.

### Exactly what to do

1. Decide, at board level, whether the residency posture is acceptable. If not, do not
   enable Turnstile and record the decision. This section ends there.
2. If enabling: sign in to the Cloudflare dashboard for [CLOUDFLARE ACCOUNT], confirm
   which subscription agreement governs the account, and save it as PDF.
3. Save https://www.cloudflare.com/cloudflare-customer-dpa/ as PDF on [DATE] with the
   version visible.
4. Check the Cloudflare dashboard for any privacy or data-processing settings the
   account can set, and record what was chosen.
5. Only then set `TURNSTILE_SECRET` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

### Confirm while executing

- **Sub-processor list.** Cloudflare's sub-processor entry point is
  https://www.cloudflare.com/gdpr/subprocessors/ , which the DPA names and which
  Cloudflare commits to updating at least 30 days before a new sub-processor starts
  processing, with a 10 day objection window, after which a customer that has not
  objected is "deemed to have consented to the sub-Processor and waived its right to
  object" (source fetched: https://www.cloudflare.com/cloudflare-customer-dpa/). That
  entry point is a landing page: it names no sub-processors itself and links onward to
  "For Cloudflare services" and "For professional services" (source fetched:
  https://www.cloudflare.com/gdpr/subprocessors/). Follow the "For Cloudflare services"
  link, read the real list, and record it. Do not record a list you have not opened.
- **Residency.** Ask whether Turnstile challenges for Canadian visitors can be
  constrained to Canadian points of presence, and whether Cloudflare retains the IP
  seen during a challenge and for how long. Assume the honest answer is that challenges
  are global unless Cloudflare says otherwise in writing.
- **Notification subscription.** VERIFY whether Cloudflare offers a sub-processor change
  notification subscription; none was visible on the page fetched. If there is none,
  add a calendar reminder to re-read the list at the register's annual review.

### Evidence to file

- PDF of the governing subscription agreement and of the DPA, both with versions.
- The sub-processor list actually opened, as at [DATE].
- The board decision to enable or not enable, with the residency reasoning.

File to: [CMBA SHARED DRIVE PATH]/compliance/dpa/cloudflare/.

---

## Not on this list, and why

- **HaveIBeenPwned.** `docs/PROCESSOR_REGISTER.md` records it as not a personal-data
  processor: only a 5 character SHA-1 prefix leaves the server (k-anonymity), and it
  fails open. No DPA is owed on data-processing grounds. Record the dependency, do not
  chase a DPA.
- **TeamLinkt.** Recorded as an upstream source and deep-link destination, not CMBA's
  processor. Members transact with TeamLinkt directly for registration, payment and
  score reporting until cutover. No controller-to-processor DPA is owed by CMBA. If
  that relationship changes at cutover, revisit.

---

## What CMBA cannot close alone

These items cannot be finished by an operator clicking through dashboards. They need a
decision, a budget or an outside professional.

1. **Whether a GDPR-form DPA discharges CMBA's PIPEDA and Alberta PIPA obligations for
   minors' data.** Every DPA above is drafted for GDPR. CMBA's obligation is PIPEDA
   Principle 1 accountability plus Alberta PIPA, over a platform holding data about
   children. Needs: [PRIVACY COUNSEL], written opinion. This is the one item that could
   invalidate the whole exercise if it is skipped.
2. **The residency-versus-sovereignty acceptance. Already decided, do not redo it.**
   Supabase, AWS and Vercel keep data in Canada but are US-headquartered and can be
   subject to US legal process such as the CLOUD Act.
   `docs/adr/0004-accept-us-headquartered-processors.md` accepts this (2026-08-04), and
   `docs/PROCESSOR_REGISTER.md` records it as closed. What remains is administrative:
   confirm the acceptance is minuted in the board's own record and not only in the repo.
   Note ADR 0004 makes its own acceptance conditional on these DPAs actually being
   executed, so this checklist is a condition of that decision, not a substitute for it.
3. **Signing authority.** Anything that needs a real signature or an authority warranty
   (a Cloudflare acceptance, a Sentry DocuSign counterpart, any negotiated Supabase
   counterpart) needs a person with authority to bind [CMBA REGISTERED LEGAL ENTITY
   NAME]. Confirm who that is before starting, not mid-flow.
4. **The Vercel plan question, if it is Hobby.** Upgrading to Pro so a processor DPA
   exists at all is a spend decision. It cannot be deferred past launch.
5. **Sub-processor answers that only the vendor can give.** Which sub-processors touch
   a `ca-central-1` Supabase project; which Vercel observability vendors receive
   request-level data from a `yul1` project; whether `proxy.ts` runs outside Canada;
   what happens on a `yul1` failover. Every one of these is a written question to
   vendor support with a lead time CMBA does not control. Send them first, not last.
6. **Turnstile enable-or-not.** A board call on whether an IP-bearing global-edge
   challenge on a youth game-report form is acceptable. Defaulting to leaving it off is
   a valid answer.
7. **Sentry: the irreversible EU region choice.** The acceptance itself is already made
   (ADR 0004). What is left is whether to switch it on at all, and the one-shot region
   decision, which cannot be undone without creating a new organization.

---

## Summary table

Status column is deliberately blank. Only the operator fills it, and only after the
evidence for that row is actually filed.

| Vendor | Execution mechanism (verified) | Who signs / accepts | Evidence to keep | Status |
|---|---|---|---|---|
| **Supabase** (DB + Storage) | Incorporated by reference into the Supabase Terms of Service; no separate signature. VERIFY whether a counterpart is available on request. | Nobody signs. Confirmed by [PRIVACY OFFICER]. Counterpart, if pursued, by [AUTHORISED SIGNATORY]. | DPA PDF + version; sub-processor PDF + subscription; support answer on `ca-central-1` sub-processors; region screenshot | |
| **AWS** (SES) | Already part of the AWS Service Terms; SCCs apply automatically. VERIFY the Artifact > Agreements tab for this account. | Nobody signs, unless Artifact offers an agreement, in which case [AUTHORISED SIGNATORY]. | Artifact Agreements screenshot; Service Terms PDF; sub-processors PDF + subscription; SES region screenshot | |
| **Vercel** (hosting + Web Analytics) | Incorporated by reference into the terms; "deemed to have signed". **Applies to Pro and Enterprise plans only.** | Nobody signs, but [AUTHORISED SIGNATORY] must approve any plan upgrade. | Billing/plan screenshot; DPA + terms PDFs; Trust Center sub-processor list; `privacy@vercel.com` subscription; support answers on proxy region + failover; Function Regions screenshot | |
| **Sentry** (only if enabled) | Self-serve click-through at Organization Settings > Legal & Compliance. DocuSign counterpart available. | Sentry **Owner or Billing role** only: [AUTHORISED SIGNATORY] must hold that role. | Acceptance screenshot with acceptor + timestamp; DPA PDF; EU region screenshot; sub-processors PDF | |
| **Cloudflare Turnstile** (only if enabled) | Incorporated by reference into the Self-Serve Subscription Agreement, section 6.1. VERIFY which agreement governs CMBA's account. | Nobody signs for self-serve, but the DPA carries an authority warranty, so [AUTHORISED SIGNATORY] should approve. | Governing agreement PDF; DPA PDF + version; the sub-processor list actually opened; board decision to enable | |

---

## Sources actually fetched for this checklist

Every vendor-process statement above is traceable to one of these. Pages change:
re-check on the day you execute, and if a page no longer says what is quoted here, stop
and update this file rather than proceeding.

- https://supabase.com/legal/dpa
- https://supabase.com/security
- https://supabase.com/docs/guides/security
- https://supabase.com/legal/customer-resources/subprocessor-list
- https://aws.amazon.com/compliance/gdpr-center/
- https://aws.amazon.com/compliance/sub-processors/ (which links onward to
  https://pages.awscloud.com/sub-processors.html to subscribe; the subscribe page
  itself was not opened)
- https://docs.aws.amazon.com/artifact/latest/ug/managingagreements.html
- https://vercel.com/legal/dpa
- https://vercel.com/legal/terms
- https://security.vercel.com/
- https://vercel.com/docs/functions/configuring-functions/region
- https://vercel.com/docs/regions
- https://sentry.io/legal/dpa/
- https://sentry.io/legal/subprocessors/
- https://docs.sentry.io/organization/data-storage-location/
- https://www.sentry.help/en/articles/13965008-how-do-i-sign-your-data-processing-addendum
- https://www.cloudflare.com/terms/
- https://www.cloudflare.com/cloudflare-customer-dpa/
- https://www.cloudflare.com/gdpr/subprocessors/ (landing page only; the actual lists
  are behind onward links and were not opened)

Repo sources for the system facts: `docs/PROCESSOR_REGISTER.md`, `docs/processors.md`,
`docs/SECURITY.md`, `docs/SES_SETUP.md`, `docs/OPERATOR_ACTIONS.md`, `docs/DECISIONS.md`,
`docs/adr/0004-accept-us-headquartered-processors.md`, `CLAUDE.md`, `vercel.json`,
`src/proxy.ts`.
