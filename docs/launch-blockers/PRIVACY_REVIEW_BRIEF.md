# Privacy review brief: independent review and sign-off of the CMBA Connect PIA

**Status: REQUEST, not a record.** Nothing in this document reports work that has been
done. No reviewer has been contacted, no engagement has been signed, no opinion has been
given, and no finding below should be read as a conclusion. This is the brief CMBA would
send to a privacy professional in order to start that work.

| | |
|---|---|
| Prepared by | [NAME, ROLE] |
| For | CMBA board: approval of the engagement and the budget |
| Legal entity contracting | [CMBA LEGAL ENTITY NAME] |
| Signatory | [BOARD SIGNATORY NAME AND TITLE] |
| Target public registration launch | 2026-09-01 |
| Budget authority requested | [AMOUNT] |
| Date prepared | [DATE] |

**Three things are being asked of the board, and they are all in this document:**

1. **Approve the engagement and the budget** (section 10) so a reviewer can be approached.
2. **Pick the scope option in section 6** (a, b or c). It changes the price and it cannot be
   handed to the reviewer to decide.
3. **Name an owner** for the two supply gaps in section 7 and for finding candidates
   (section 11).

Everything else below is the detail that owner will need. It is not a decision for the room.

---

## 1. What we are asking for, in one paragraph

CMBA Connect already has a written Privacy Impact Assessment. It is
`docs/PRIVACY_IMPACT_ASSESSMENT.md`, and its own header says "Status: draft for internal
review. Last updated: 2026-06-29." **We are not asking anyone to write a PIA. We are
asking a Canadian privacy practitioner to review the one we already have**: to read it
against PIPEDA and Alberta PIPA, test it against how the platform actually behaves, tell
us plainly where it is wrong, thin, or overstated, and give us a written opinion plus a
sign-off statement CMBA can hold on file. Two of our own documents already name this
review as a launch blocker: `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 13 item 2, and
`docs/SECURITY.md` under "Required external assurance."

## 2. The reviewer is independent, and the conclusion is theirs

This is the part the board should read twice. CMBA is asking to be marked, not to be
agreed with.

- The reviewer's opinion is the reviewer's. Nothing in this brief is a proposed finding,
  a suggested rating, or a conclusion for them to countersign. The questions in section 5
  are open questions, deliberately phrased so that "no, this is not adequate" is a full
  and expected answer.
- The reviewer must be free to say the platform is not ready to open public registration
  on 2026-09-01, and CMBA must be prepared to hear it. If the answer is "delay," that is a
  successful engagement, not a failed one.
- CMBA will not ask for changes to a finding's substance. We will ask for factual
  corrections only where we can point at code or a document that shows the fact is wrong,
  and the reviewer decides whether the correction lands.
- The reviewer should have no other paid relationship with CMBA, and should not have
  authored any part of the material they are reviewing. Our own PIA carries the honest
  caveat that it "is not legal advice" (`docs/PRIVACY_IMPACT_ASSESSMENT.md`, opening
  note); the whole point of this engagement is to put a qualified independent name against
  it.

## 3. Reviewer profile

We are looking for a Canadian privacy practitioner, not a general IT auditor and not a
generalist commercial lawyer.

Required:

- Working knowledge of **PIPEDA** and **Alberta PIPA**, including how the two interact for
  an Alberta non-profit association. Our PIA currently says PIPA "likely applies" and that
  "final confirmation of which statute governs which activity should come from counsel"
  (`docs/PRIVACY_IMPACT_ASSESSMENT.md`, opening preamble, before section 1). We need that
  resolved or explicitly scoped out.
- Demonstrated experience with **children's and minors' personal information**. This is
  not a nice-to-have. The platform exists to serve youth basketball, most participants are
  under 18, and the PIA itself calls children's data "the highest-sensitivity area of this
  assessment" (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 4). A reviewer without minors
  experience cannot answer question 5.1.
- Comfort reading a technical system description. The reviewer does not need to read
  TypeScript, but they will be assessing claims about server-enforced hooks, access
  functions, and cron jobs, and they need to be able to ask a developer the right question.
- Professional liability insurance, or a clear statement that they carry none.

Useful, not required:

- A Canadian privacy credential. The IAPP offers a Canada concentration, CIPP/C, described
  as being "for privacy professionals who manage or work within Canadian compliance
  frameworks" (https://iapp.org/certify/cipp/, fetched 2026-08-04). Credentials are a
  signal, not a substitute for minors experience.
- Prior work with amateur sport, Safe Sport, schools, or another volunteer-run
  organization that handles youth data on a small budget.

Explicitly not required: a security testing capability. The penetration test is a separate
engagement and a separate line item (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 13 item
1; `docs/EXTERNAL_ASSESSMENT_SCOPE.md`; the request packet for it is
`docs/launch-blockers/PENTEST_RFP.md`).

## 4. The system in 30 seconds

All from the repo, so the reviewer can check every line:

- Payload CMS 3.x on Next.js, hosted on Vercel with functions pinned to Montreal `yul1`
  (`CLAUDE.md` for the versions; `docs/PRIVACY_IMPACT_ASSESSMENT.md` sections 1 and 9;
  `docs/PROCESSOR_REGISTER.md`).
- Postgres and object storage on Supabase `ca-central-1`; transactional email on AWS SES
  `ca-central-1` (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 9;
  `docs/PROCESSOR_REGISTER.md`).
- **Payload access functions are the authorization boundary. There is no Postgres RLS.**
  `CLAUDE.md` states this directly: access functions in `src/access/` are "the security
  boundary for this app (equivalent to RLS)," default posture DENY. The PIA makes the same
  point in section 3: "Access enforcement is implemented in code, not only in policy."
- Accounts for participants under 18 are guardian-managed, with consent enforced
  server-side and the account held pending until the guardian confirms by email
  (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 4).
- **Transactional email does not deliver yet, and the reviewer must be told so in writing.**
  AWS SES is not provisioned; until `SES_SMTP_*` is set the app falls back to a no-network
  transport that logs the message and discards it (`docs/PROCESSOR_REGISTER.md`, AWS SES
  row; `docs/launch-blockers/SES_ACTIVATION.md`). The guardian confirmation email sits on
  the minor account-creation path, so the consent flow in question 5.1 is complete in code
  and not yet complete end to end.
- No payment data and no SIN are collected. Registration and payment stay in TeamLinkt,
  which the register classifies as an upstream source and deep-link destination, not our
  processor (`docs/PRIVACY_IMPACT_ASSESSMENT.md` sections 1 and 2;
  `docs/PROCESSOR_REGISTER.md`).
- **No DPA with any processor is signed.** The processor register states: "all Data
  Processing Agreements (DPAs) below are marked REQUIRED and are pending. None are signed
  yet" (`docs/PROCESSOR_REGISTER.md`).

## 5. The questions the review must answer

These are the five that actually carry risk here. Each is a genuine question. We do not
have a preferred answer to any of them.

### 5.1 Is the guardian consent model for minors adequate?

What exists, per `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 4 and section 6: date of
birth collected first; a `deriveIsMinor` hook computing under-18 status on every save; an
`enforceConsent` hook that rejects account creation server-side when consent fields are
missing or do not match the current policy versions, and additionally requires a guardian
consent version for a minor; a `guardianFlow` hook that sets a new minor account to
pending; a confirmation email to the guardian, with the account staying pending until the
guardian confirms; an append-only `ConsentRecords` history; and re-consent when a policy
version is bumped.

Open questions for the reviewer:

- Is an emailed confirmation link to a guardian address supplied by the account creator a
  sufficient method of obtaining and verifying guardian consent under PIPEDA and PIPA, for
  the sensitivity of data we hold? If not, what would be?
- Guardian confirmation email does not deliver today (section 4). Is any part of your
  answer conditional on SES being live and that path tested first?
- Is our under-18 line the right one? Should there be a second, lower age threshold with
  different handling, and does the answer change for a 17 year old versus a 9 year old?
- Is the consent language meaningful to the person giving it? Is the plain-language
  summary for young athletes referenced in section 4 doing real work?
- Do the engagement features (XP, badges, streaks, recognitions, challenge submissions,
  leaderboards) survive scrutiny for minors? They are described in
  `docs/PRIVACY_IMPACT_ASSESSMENT.md` sections 2, 4 and 11 as owner-and-admin read,
  surfaced only with a guardian-set consent, using a privacy-safe name, moderated before
  surfacing, and shipping behind a feature flag. Should any of them exist for a minor at
  all?
- How should we read the Canadian regulators' 2023 joint resolution "Putting best
  interests of young people at the forefront of privacy and access to personal
  information," which Alberta's OIPC signed and which asks organizations to use
  privacy-protective defaults, restrict third-party sharing, limit retention, and present
  privacy information to young people clearly
  (https://www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-and-territorial-collaboration/joint-resolutions-with-provinces-and-territories/res_231005_01/,
  fetched 2026-08-04)? It is a resolution, not binding law, and we would like the
  reviewer's view on how much weight it carries for us.
- **VERIFY with the reviewer:** the OPC has said it intends to draft a children's privacy
  code following its exploratory consultation, which closed 2025-08-05; as of the OPC
  consultation page fetched 2026-08-04 the code had not been published
  (https://www.priv.gc.ca/en/about-the-opc/what-we-do/consultations/consultation-children-code/expl_children-code/).
  Confirm the current status at the time of review and whether a draft or published code
  changes anything for us.

### 5.2 Does data minimization actually hold?

`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 2 contains a field-by-field inventory with a
stated purpose for each element. Section 3 asserts we "collect only what we need," and
section 4 asserts minimization for minors specifically.

Open questions:

- Read the inventory against the stated purposes. Is anything in there that we do not need
  in order to run youth basketball? Bio, pronouns, phone number, emergency contact, push
  device tokens, and the gamification ledgers are the places we would look first, but the
  reviewer should form their own view.
- The emergency contact field captures a **third party's** name, relationship and phone,
  supplied by our member, and the incident report free-text may describe people who never
  agreed to anything (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 2). Is our handling of
  third-party personal information defensible, and does anything need to be said to those
  people?
- Certificate files include police information checks
  (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 2, rated High sensitivity). Should we be
  storing that document at all, or only a verified-yes-or-no result and a date? This is a
  design question we would rather answer before launch than after.
- Is "consent at sign-up" the right characterization of the lawful basis for every row in
  that table, or are some of them better described as necessary to the service?

### 5.3 Is the residency-not-sovereignty position defensible, and is it properly disclosed?

This is the position we have taken, stated in both
`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 8 and `docs/PROCESSOR_REGISTER.md`: Supabase,
AWS and Vercel keep the data physically in Canada, which satisfies residency, but all
three are US-headquartered and can be subject to US legal process such as the CLOUD Act,
so this is residency and not full sovereignty.

The board has already made this call. `docs/adr/0004-accept-us-headquartered-processors.md`
(Accepted 2026-08-04) accepts the US-headquartered processors on a residency basis, accepts
Sentry for non-personal diagnostics only, and lists the conditions the acceptance depends
on, including that the DPAs are actually executed. That ADR explicitly asks this reviewer
whether the position is defensible and records that if the reviewer disagrees, their opinion
is the one that should move. Note that the PIA text is older and still describes this as a
decision the board should make; the ADR is the current position.

Open questions:

- Is that position defensible under PIPEDA and PIPA for an organization holding minors'
  data? If yes, what conditions attach. If no, say so.
- Is it adequately **disclosed**? PIPEDA transparency expectations around transfers to
  third parties for processing are the relevant test here. Does our published Privacy
  Policy say enough, in language a parent would understand, about who processes their
  child's data and what foreign legal exposure that carries?
- Does the absence of signed DPAs change the answer? Today there are none
  (`docs/PROCESSOR_REGISTER.md`; per-vendor mechanics in
  `docs/launch-blockers/DPA_EXECUTION.md`). Is a signed DPA a precondition to the
  disclosure being honest, or is disclosure a separate question? Related, and squarely a
  legal question we cannot answer ourselves: the DPA forms these vendors offer are drafted
  for GDPR, while PIPEDA and Alberta PIPA are what apply to CMBA. Does the GDPR form carry
  our accountability obligation for a platform holding minors' data?
- Three services sit outside the clean Canadian story and we want them looked at
  specifically, all per `docs/PROCESSOR_REGISTER.md`: **Sentry** (off unless a DSN is set,
  configured to scrub the user object, IP, cookies, headers, bodies and query strings, to
  be created in the EU region); **Vercel Web Analytics and Speed Insights** (US,
  cookieless, aggregate, no user identifier); and **Cloudflare Turnstile** (off by
  default, global edge, sees a visitor IP during a challenge). Are our classifications of
  these as non-personal-data or optional correct?
- **HaveIBeenPwned** is classified in the register as not a personal-data processor
  because only a 5-character SHA-1 prefix leaves the server. Is that classification right?

### 5.4 Are retention and deletion adequate?

We are being deliberately blunt about what is not built, because the reviewer will find it
anyway. Per `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 7:

- There is **no written per-category retention schedule**. It is marked planned.
- There is **no automated purge for aged-out or departed minors**. It is marked planned.
  What exists is a weekly `retention-review` cron that flags accounts inactive for more
  than 24 months for a Privacy Officer to review, and deliberately does not auto-delete.
- **Backup retention and a tested restore-then-purge procedure are not formalized.**
  Supabase native backups are in-region.
- Erasure exists as an admin-run workflow (`/api/admin/erase-user`), super-admin only,
  with a `legalHold` check that refuses to proceed; it deletes database rows and the
  backing files in Supabase Storage. **Self-serve account deletion does not exist yet**
  and is marked planned (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 5).
- Consent records and audit log entries are retained as immutable history, by design.

Open questions:

- Are those gaps launch-blocking, or can they be closed on a committed timeline after
  launch? We would like the reviewer to say which, per gap.
- What retention periods should actually go in the schedule for a youth sport
  organization: active member data, certification records, police information checks,
  incident reports involving minors, and the immutable consent and audit history?
- Is "shortest reasonable period for children" being met in practice when the purge is
  manual and the Privacy Officer is not yet named (section 13 item 4)?
- Does an immutable, never-deleted consent and audit record sit comfortably with a
  deletion request, and how should we explain that to a parent who asks us to delete
  everything?
- Deletion from backups: what is actually expected of an organization our size?

### 5.5 Is the breach-response path to the OPC and the Alberta OIPC right?

There is a concrete inconsistency in our own documents that we would like resolved.

- `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 12 commits to notifying affected individuals
  and reporting to the OPC, "and to the Office of the Information and Privacy Commissioner
  of Alberta where required."
- `docs/INCIDENT_RESPONSE.md` step 6 says to notify "the OPC, affected individuals (and
  guardians for minors), and any processor or partner implicated." Step 5 tells the Privacy
  Officer to "apply the same care under Alberta PIPA" but names no Alberta regulator, so
  **the Alberta OIPC appears nowhere in the steps**, and the Roles section assigns the
  Privacy Officer notification duty to the OPC only.
- `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 12 records that a written incident runbook
  and a durable breach log are open items. The runbook now exists
  (`docs/INCIDENT_RESPONSE.md`); the durable breach log does not. The PIA has not been
  updated to say so, which is a small live example of the currency problem in section 6.

The two regimes are not the same shape, which is exactly why this matters:

- Under PIPEDA, an organization reports a breach creating a real risk of significant harm
  to the OPC, notifies affected individuals as soon as feasible, notifies other
  organizations that can reduce the risk of harm, and **must keep a record of every breach
  of security safeguards regardless of whether it meets the real-risk threshold, for two
  years**
  (https://www.priv.gc.ca/en/privacy-topics/business-privacy/breaches-and-safeguards/privacy-breaches-at-your-business/gd_pb_201810/,
  fetched 2026-08-04).
- Under Alberta PIPA section 34.1, notice goes to the **Commissioner** without unreasonable
  delay where a reasonable person would consider there is a real risk of significant harm,
  and the **Commissioner may then issue a decision requiring the organization to notify
  affected individuals** (section 37.1), though nothing prevents an organization from
  notifying individuals on its own (section 37.1(7))
  (https://oipc.ab.ca/breach-notification/, fetched 2026-08-04).

Open questions:

- Which regime governs a CMBA Connect breach, or do both? If both, what is the single
  operational sequence a stressed volunteer should follow at 9pm on a Saturday?
- Is our incident runbook's omission of the Alberta OIPC a material defect, and what
  exactly should replace step 6?
- What does the durable breach log need to contain, and for how long, to satisfy the record
  requirement above?
- Does a breach involving minors change the risk assessment, the notification content, or
  the timing? Our runbook asserts that it raises the risk assessment; is that enough?
- Who can lawfully sign a breach report on behalf of a volunteer board, and what happens if
  the Privacy Officer is unreachable?

### 5.6 Anything else the reviewer considers material

The five above are what we think carries risk. The reviewer should raise anything else
they find, including matters we did not think to ask about. Areas we would not be
surprised to hear about: whether PIPEDA or PIPA governs which activity; whether our data
subject rights process meets the statutory response times (we have no documented service
level yet, per `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 5); whether the withdrawal of
consent path is real; and whether the published Privacy Policy, Terms of Use and Guardian
Consent notice actually match the system, given that all three still carry placeholder
dates and contact details (`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 13 item 7).

## 6. A scope decision the board must make before sending this

**The PIA may not be current with what is deployed.** The PIA is dated 2026-06-29
(`docs/PRIVACY_IMPACT_ASSESSMENT.md` header). `CLAUDE.md` records that the Member Cards
Phase 1 migration was applied to the production ca-central-1 database on 2026-07-02,
creating 11 new tables including passes, verification tokens, scans, scanner devices, and
wallet logs. **None of that appears in the PIA's data inventory in section 2.**

Read that precisely. Per the same record the tables were created empty, the signing keys
are not set, and the feature branch is not merged, so no member-card data is being
collected today. The gap is between the PIA and the schema that is already in the
production database, not evidence that undocumented personal data is being held.

The board has to pick one before the brief goes out, because it changes both scope and
price:

- **(a)** Update the PIA to inventory the member-card data first, then send. Adds
  [DAYS] of internal work.
- **(b)** Send as-is and scope member cards explicitly **out** of this review, with a
  written commitment to a follow-up review before that feature is enabled for real
  members.
- **(c)** Ask the reviewer to price both.

Recommend a decision by [DATE]. Whichever is chosen, the reviewer must be told which, in
writing, at engagement start. Handing over a document set that silently omits a data
category the production schema already carries is the fastest way to make a sign-off
worthless.

## 7. What CMBA supplies to the reviewer

Every repository document below exists today and can go over on day one. The last two rows
are not repository files: check them before promising either one.

| Document | What it is |
|---|---|
| `docs/PRIVACY_IMPACT_ASSESSMENT.md` | The PIA under review: data inventory, consent, minors and guardian handling, subject rights, retention, residency, risk table, open items |
| `docs/PROCESSOR_REGISTER.md` | Every processor and supporting service, data categories, region, DPA status (all pending), sub-processor notes |
| `docs/SECURITY.md` | Security control matrix with OWASP ASVS 5.0 and NIST SP 800-63B-4 crosswalks |
| `docs/THREAT_MODEL.md` | STRIDE threat model and textual data flow diagram with residency assertions |
| `docs/INCIDENT_RESPONSE.md` | Incident runbook, severity table, breach assessment steps |
| `docs/EXTERNAL_ASSESSMENT_SCOPE.md` | One-page scope and readiness brief, already written for this audience |
| `docs/PENTEST_READINESS.md` | Scope, architecture, test accounts, known residuals |
| `docs/adr/0004-accept-us-headquartered-processors.md` | The recorded decision to accept US-headquartered processors on a residency basis, and the conditions attached. Directly in scope for question 5.3 |
| Published legal documents | Privacy Policy, Terms of Use, Guardian Consent notice, as currently published, placeholders and all |
| Read access | A walkthrough of the running application with a CMBA developer. **Do not promise a non-production environment until someone confirms one is reachable:** `docs/DAST_ZAP.md` and `docs/SECURITY.md` both record the interim scan as still pending a reachable preview URL |

Two supply items need fixing before the pack goes out:

- **The residency document is missing from this repository.** `docs/SECURITY.md` cites
  `docs/DATA_RESIDENCY_AND_COMPLIANCE.md` and `docs/PROCESSOR_REGISTER.md` cites
  `cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md`. Neither path resolves in this
  repository. A copy exists in the `cmba-backend-build` document set, which is not part of
  this repository. Confirm which copy is authoritative, place it here, and fix the two
  cross-references before handing anything to a reviewer. This is the document the register
  and the threat model both lean on for the residency narrative, so a reviewer will ask for
  it early. Owner: [NAME]. By: [DATE].
- **The Privacy Officer is not named.** `docs/INCIDENT_RESPONSE.md` says the Privacy
  Officer is "named in Site Settings," and `docs/PRIVACY_IMPACT_ASSESSMENT.md` section 13
  item 4 lists naming them as an open item. The reviewer needs a counterpart. Owner:
  [NAME]. By: [DATE].

What we will not supply unless the reviewer asks and we agree a handling method: real
member personal data. Test accounts and synthetic data only.

## 8. Deliverables

Three things, and CMBA will not consider the engagement complete without all three.

1. **A written opinion.** The reviewer's assessment of the PIA against PIPEDA and Alberta
   PIPA, answering the questions in section 5 in their own words, in whatever order and
   with whatever caveats they think honest. Length is theirs to decide. Plain language
   preferred: the audience includes volunteer board members with no privacy background.

2. **A findings list with severity.** Each finding as its own row so we can turn it into
   work: what the issue is, which document or system behaviour it concerns, the severity
   on the reviewer's own scale, whether it blocks public registration launch in the
   reviewer's view, and what would close it. We would rather have twenty small findings
   than one paragraph of general concern. The reviewer sets the severities, not CMBA.

3. **A sign-off statement CMBA can hold on file.** A short signed statement naming the
   reviewer and their qualifications, the exact documents and versions reviewed, the date
   range, the scope and its limits, what they did and did not test, and their conclusion.
   A conditional sign-off ("adequate subject to findings 1, 4 and 9 being closed") is
   entirely acceptable and is probably the realistic outcome. **A refusal to sign is also
   an acceptable outcome and CMBA will accept it without argument.** We need this on file
   because `docs/SECURITY.md` ("Required external assurance") names this packet as the one
   that ends in a named reviewer's opinion, and the board will be asked to rely on it.

Optional, if the reviewer offers it and the budget allows: a short verbal walkthrough of
the findings with the board, and a re-review of the specific items CMBA closes.

## 9. Timeline against the 2026-09-01 launch

Working back from a 2026-09-01 public registration launch, on a brief prepared [DATE]:

| Step | Owner | Target |
|---|---|---|
| Board approves this brief, the budget, and the section 6 scope decision | Board | [DATE] |
| Fix the two supply gaps in section 7 (residency doc placed, Privacy Officer named) | [NAME] | [DATE] |
| Approach candidate reviewers, obtain quotes and availability | [NAME] | [DATE] |
| Engagement signed, document pack delivered, kickoff call | [NAME] | [DATE] |
| Reviewer works, with a named CMBA contact available for questions | Reviewer | [DATE RANGE] |
| Draft findings received; CMBA factual corrections only | Both | [DATE] |
| Final written opinion, findings list, and sign-off statement received | Reviewer | [DATE] |
| CMBA closes or accepts each finding; board records the residual risks it accepts | Board | [DATE] |

**Be honest with the board about this:** the window between now and 2026-09-01 is short,
and a qualified reviewer will have their own lead time that CMBA does not control. Three
outcomes are all realistic, and the board should decide in advance which it prefers rather
than discovering it in late August:

- The review completes and CMBA closes the blocking findings before 2026-09-01.
- The review completes, blocking findings remain open, and **launch moves**.
- No reviewer is available in time, and the board decides whether to move the launch or to
  open registration with this assurance item still outstanding, recording that decision and
  who accepted the risk.

The board should also note that this is one of several launch blockers that cannot be
satisfied by code. The others are the independent penetration test, the signed DPAs with
Supabase, AWS and Vercel, and a named Privacy Officer plus the durable breach log
(`docs/PRIVACY_IMPACT_ASSESSMENT.md` section 13; `docs/SECURITY.md`, "Required external
assurance"). Adjacent and also outside CMBA's control: SES production access and the DNS
records that make guardian confirmation email actually deliver, which gates opening public
registration for minors at all (`docs/SECURITY.md`;
`docs/launch-blockers/SES_ACTIVATION.md`). These can run in parallel, and the privacy
reviewer will ask about DPA status and about the guardian email path, so starting those
threads early helps this one.

## 10. Commercial terms to settle

- Fee basis: [FIXED FEE / DAY RATE / ESTIMATE]. Amount: [AMOUNT]. Cap: [AMOUNT].
- What the fee includes: whether the sign-off statement, a re-review of closed findings,
  and a board walkthrough are in or out.
- Confidentiality: a mutual NDA is expected. The reviewer sees system design detail; CMBA
  sees their working method.
- Ownership: CMBA owns the deliverables and may show them to the board, its insurer, and a
  regulator. Confirm whether the reviewer permits publication beyond that.
- Conflicts: the reviewer confirms in writing that they have no conflict, including no
  relationship with TeamLinkt or any processor in `docs/PROCESSOR_REGISTER.md`.
- Insurance: professional liability coverage and limit, or a written statement of none.

## 11. Finding a reviewer

**VERIFY before acting.** CMBA has not yet identified candidates, and this brief
deliberately names no firm or individual. Suggested channels, each to be checked by
whoever owns this task:

- Referrals from other Alberta amateur sport organizations, Sport Calgary, or the
  provincial sport organization, on who reviewed their privacy work.
- Alberta legal counsel with a privacy practice, for a referral rather than the review
  itself if their rate is outside budget.
- The IAPP does not appear to publish a browsable directory of CIPP/C holders you can
  filter by location. Its certification lookup page carries no search tool and says
  "Looking to verify a certification? Please email us at certification@iapp.org"
  (https://prod.iapp.org/certify/lookup/, fetched 2026-08-04). Treat that as the way to
  **check a candidate's claimed credential once you have a name**, not as a way to find
  candidates. **VERIFY** at the time you use it that this is still the process, and do not
  guess a directory URL.
- **VERIFY:** whether the Alberta OIPC or the OPC maintains or will point to any list of
  practitioners. Regulators commonly decline to recommend, so expect a no.

Ask every candidate the same three questions before choosing: how many PIAs involving
minors' data have you reviewed, what would make you refuse to sign, and what do you need
from us that is not in section 7.

---

*This document is a request and a plan. It records no completed review, no vendor
commitment, and no signed agreement. Every bracketed value is outstanding and must be
supplied by a person before the brief is sent.*
