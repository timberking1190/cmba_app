# CMBA Connect: Privacy Impact Assessment (PIPEDA and Alberta PIPA)

Status: draft for internal review. Last updated: 2026-06-29.

This Privacy Impact Assessment (PIA) describes the personal information that CMBA Connect collects, how it is used and protected, and the privacy risks we have identified along with how we manage them. It is written for the Calgary Minor Basketball Association (CMBA) board, our Privacy Officer, and the independent reviewers who will assess the platform before public registration opens.

A note on honesty: this document marks what is built today versus what is planned. Where a control is described in our policies but not yet implemented in code, we say so. This PIA is not legal advice. Before public registration launch, a Canadian privacy professional should review it, and the open items in Section 13 should be closed.

The legal grounding for this assessment is Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) and Alberta's Personal Information Protection Act (PIPA). Because CMBA is an Alberta non-profit association handling the personal information of Alberta residents, PIPA likely applies; PIPEDA applies to commercial activity and cross-border flows. The safeguards in this assessment are designed to satisfy both. Final confirmation of which statute governs which activity should come from counsel.

---

## 1. Scope and system description

CMBA Connect is the member-facing backend and website for Calgary Minor Basketball. It is built on Next.js 15 and the Payload CMS, deployed on Vercel, with a PostgreSQL database and file storage on Supabase, and transactional email through Amazon Web Services Simple Email Service (AWS SES). The current production deployment is at cmbaplatform.vercel.app.

What CMBA Connect does:

- Account creation and sign-in for athletes, parents and guardians, coaches, officials, and volunteers.
- Member profiles (name, contact details, optional photo, club affiliation).
- Certification and development tracking (courses taken, certifications held, issue and expiry dates, uploaded certificate files such as coaching or officiating credentials, first aid, or a police information check).
- Guardian-managed accounts for athletes under 18, with server-enforced guardian consent.
- Game scheduling, score reporting, and youth-safety incident reporting for league play that CMBA runs directly.
- Admin and compliance tooling: a consent audit view, an append-only audit log, and a privileged-action record.

What is out of scope:

- Registration, payment, league play, and the official score system of record are handled by TeamLinkt, a separate platform with its own privacy policy and terms. CMBA Connect does not collect payment information and does not store a Social Insurance Number.
- CMBA Connect does not sell personal information, run advertising, or build behavioural or marketing profiles of any user, and never of children.

This PIA covers the CMBA Connect system only. Where a user follows a link to TeamLinkt, Reach360, or another outside service, that service's own terms and privacy policy apply.

### System data flow at a glance

1. A person (or, for a minor, a guardian) creates an account through the public sign-up form, which records consent against the current policy versions.
2. Profile, certification, and consent data is written to the Supabase Postgres database in ca-central-1.
3. Uploaded files (certificate documents, profile photos, scoresheet and incident photos) go to Supabase Storage in ca-central-1, in a public bucket for non-sensitive images and a private, access-controlled bucket for sensitive documents.
4. Transactional email (guardian confirmation, certification reminders, score reminders) is sent through AWS SES in ca-central-1. Email bodies link back to the portal and avoid carrying sensitive personal information.
5. Vercel functions, pinned to the Montréal yul1 region, process requests in transit and hold no durable personal data.

---

## 2. Data inventory

The table below inventories each personal-data element CMBA Connect collects, the subject it describes, why we collect it, the lawful basis or consent that supports it, its sensitivity, its retention, and where it lives. All personal data is resident in Canada (Section 9).

Lawful-basis note: under PIPEDA and PIPA we rely on consent. For most fields the basis is the consent the user or guardian gives at sign-up, recorded against a policy version (Section 6). A small number of fields are set by the system for security or accountability and are necessary to operate the account.

| Data element | Subject | Purpose | Lawful basis / consent | Sensitivity | Retention | Residency |
|---|---|---|---|---|---|---|
| Full name, preferred name, pronouns | Member or athlete | Identify the account holder; correct address in communications | Consent at sign-up | Low to moderate | While the account is active, then per retention schedule | Supabase Postgres, ca-central-1 |
| Email address | Member or guardian | Sign-in, account messages, guardian confirmation | Consent; necessary to operate the account | Moderate | While active, then per schedule | Supabase Postgres, ca-central-1 |
| Phone number | Member | Contact for program and safety purposes | Consent | Moderate | While active, then per schedule | Supabase Postgres, ca-central-1 |
| Date of birth | Athlete or member | Confirm age; branch minors into the guardian flow; place athletes in the correct development stage | Consent; necessary to determine minor status | Moderate | While active, then per schedule | Supabase Postgres, ca-central-1 |
| isMinor flag (derived) | Athlete | Drive guardian-managed flow and heightened protections | Derived; necessary | Low | While active | Supabase Postgres, ca-central-1 |
| Profile photo (optional) | Member or athlete | Optional profile personalization inside CMBA Connect | Separate opt-in consent (photoOptIn) | Moderate | While active or until removed | Supabase Storage public bucket, ca-central-1 |
| Bio (optional) | Member | Optional profile detail | Consent | Low | While active or until removed | Supabase Postgres, ca-central-1 |
| Club / team affiliation | Member or athlete | Program operations; eligibility | Consent | Low | While active | Supabase Postgres, ca-central-1 |
| Role (participant, coach, official, admin) | Member | Access control; show the right features | Consent; set by super admin only | Low | While active | Supabase Postgres, ca-central-1 |
| Emergency contact (name, relationship, phone) | Member, and a third party named by them | Participant safety | Consent | Moderate (includes a third party's data) | While active, then per schedule | Supabase Postgres, ca-central-1 |
| Guardian details (name, email, phone, relationship) | Parent or guardian of a minor | Confirm a real guardian; manage the child's account; consent record | Guardian consent | Moderate | While the child's account is active; shortest reasonable period for children | Supabase Postgres, ca-central-1 |
| Guardian confirmation token | Guardian | One-time email confirmation of the guardian | Necessary to operate the guardian flow | Moderate (security token) | Until confirmed, then no longer needed | Supabase Postgres, ca-central-1; never exposed in API reads or exports |
| Consent record (terms / privacy / guardian-consent version, acceptedAt, acceptedIp, marketingOptIn, photoOptIn, recognitionSurfacing, progressSharing, appearOnLeaderboard) | Member or guardian | Prove a valid, versioned sign-off; accountability | Necessary for accountability under PIPEDA / PIPA | Moderate | Retained as an immutable audit history | Supabase Postgres, ca-central-1 |
| Certification metadata (type, issue date, expiry date, issuing body, credential ID, status, verification) | Member (coach / official) | Track development; show what is current, expiring, or required | Consent | Moderate | Period required for league and safety purposes | Supabase Postgres, ca-central-1 |
| Certificate files (PDF / image: coaching, officiating, first aid, police information check) | Member | Verify a credential held | Consent | High (a police information check is sensitive) | Period required for league and safety purposes | Supabase Storage PRIVATE bucket, ca-central-1 (owner and super admin only) |
| Score reports (scores, period scores, submitter, scoresheet photo) | Team representative who submits; identifies the submitter | Record game results CMBA runs directly | Consent; submitter identity is server-set | Low to moderate | Per league records schedule | Supabase Postgres + private Storage, ca-central-1 |
| Game incident reports (type, description, involved team, attachment) | Filer and individuals described in the report | Youth-safety incident handling (injury, conduct, ejection) | Consent; necessary for safety and governance | High (youth-safety; may describe a minor) | Per governance and safety retention requirements | Supabase Postgres + admin-only private Storage, ca-central-1 |
| Officials roster (name, email, phone, level, notes) | Official | Assign and manage referees and officials | Consent; admin-managed | Moderate | While the official is active | Supabase Postgres, ca-central-1 |
| Notification preferences | Member or guardian | Respect communication choices | Consent | Low | While active | Supabase Postgres, ca-central-1 |
| Session cookie and session metadata (assurance level, IP, user agent, MFA timestamps) | Member | Keep the user signed in; security; MFA assurance | Necessary for security | Moderate | Session lifetime; metadata expires with the session | Supabase Postgres, ca-central-1 |
| Push device tokens (token, platform) | Member | Send native app notifications | Consent (self-managed) | Low to moderate | While the device is registered | Supabase Postgres, ca-central-1 |
| Audit log entries (actor, actor email snapshot, action, before/after, reason) | Admins and the subjects of privileged actions | Accountability for privileged actions | Necessary for accountability | Moderate | Retained as immutable history | Supabase Postgres, ca-central-1 |
| Rate-limit and idempotency state (hashed IP, keys) | Visitor | Abuse defense and request de-duplication | Necessary for security | Low (IP is HMAC-hashed, never stored raw) | Swept after 24 hours by the TTL cron | Supabase Postgres, ca-central-1 |
| Email recipient name and address in mail headers | Member or guardian | Deliver transactional email | Necessary to deliver the message | Moderate | Transient; SES does not retain the body | AWS SES, ca-central-1 |
| XP events (gamification ledger: amount, kind, verified flag, source, occurredAt) | Member or athlete | Track engagement and development progress; drive levels, streaks, and badges | Consent | Low to moderate (a minor's activity record) | While active, then per schedule | Supabase Postgres, ca-central-1 (owner and super admin read; never public) |
| Badge awards (badge, awardedVia, verified, isMinor, awardedAt) | Member or athlete | Recognize verified achievement | Consent | Low to moderate | While active, then per schedule | Supabase Postgres, ca-central-1 (owner and super admin read; non-owner display uses privacy-safe name) |
| Streak counters (current/longest streak days, last active day) | Member or athlete | Encourage consistent participation | Consent | Low | While active | Supabase Postgres, ca-central-1 (owner and super admin read) |
| Recognitions (kind, subject, nominator, free-text message, moderation status, subjectIsMinor, flag) | Recognized member (may be a minor) and the nominator | Positive, moderated recognition (shout-outs, awards, milestones) | Consent; surfacing of a minor gated on recognitionSurfacing | Moderate (may name or describe a minor; free-text) | While active, then per schedule | Supabase Postgres, ca-central-1 (subject, nominator, and admin read; nothing surfaces until coach/admin approved) |
| Challenge submissions (result, optional video clip, verification, submitter) | Athlete (may be a minor) | Skill-challenge participation and verified progress | Consent; clip upload gated on photoOptIn | Moderate to high when a clip is attached | Per league records schedule | Supabase Postgres + PRIVATE Storage bucket (EXIF stripped), ca-central-1 (owner, verified coach, and admin) |

Data we deliberately do not collect: payment information, Social Insurance Number, advertising or cross-site tracking identifiers, and any behavioural or marketing profile.

---

## 3. Collection, use, and disclosure analysis

### Collection (PIPEDA: limiting collection; PIPA: reasonable purposes)

We collect only what we need to run our programs, and the data inventory above is the full list. The sign-up form is the single collection point for account data; certifications and uploads are added by the member themselves. Date of birth is collected first because it determines whether the account is adult or guardian-managed. We do not collect sensitive identifiers (SIN, payment data) at all.

### Use (PIPEDA: limiting use; identifying purposes)

Personal information is used to create and manage accounts and sign people in; to track certifications and development and show what is current, expiring, or required; to send account messages such as guardian confirmations, password resets, and certification-expiry reminders; to support participant safety, including emergency contacts and incident handling; and to meet sport-governance and legal requirements. The purpose for each data category is recorded in the data inventory and shown to the user at collection through the sign-up consent copy. Children's information is never used for advertising or profiling.

### Disclosure (PIPEDA: limiting disclosure)

Within CMBA Connect, access is role-scoped. A participant sees only their own profile, certifications, and files. A club admin sees derived compliance status, not raw certificate files. Super admins can see records they need to administer. A minor's personal information is visible only to the guardian and to authorized CMBA administrators; it is not shown to other members and is not public.

External disclosure is limited to our processors acting on our instructions (Section 8): Supabase (database and storage), Vercel (hosting), and AWS SES (email). TeamLinkt is a separate system of record for registration and league play, not a recipient of CMBA Connect data. We do not sell or rent personal information. We would disclose to a regulator or under legal process only where required by law, and we would record any breach disclosure as described in Section 12.

Access enforcement is implemented in code, not only in policy. Each collection defines Payload `access` functions: certifications and certificate files are owner-or-super-admin; score reports are gated by a verified team membership re-derived server-side; incident reports are admin-only read; the consent and audit logs are append-only and super-admin read. This is the technical boundary behind the disclosure limits above.

---

## 4. Minors, guardian-managed accounts, and children's data protections

Many CMBA participants are under 18, so children's data is the highest-sensitivity area of this assessment. The following protections are implemented today unless marked planned.

- Age gate and guardian flow (implemented). The sign-up form asks for the participant's date of birth first. The `deriveIsMinor` hook computes minor status (under 18) on every save. If the participant is a minor, the account branches into the guardian flow.
- Server-enforced guardian consent (implemented). The `enforceConsent` beforeValidate hook on the Users collection rejects account creation on the server when the required consent fields are missing or do not match the current policy versions, even if the front end is bypassed. For a minor, the hook additionally requires the guardian consent version. A minor account cannot exist without a recorded guardian sign-off.
- Pending until confirmed (implemented). The `guardianFlow` hook sets a new minor account to `pending`. A confirmation email is sent to the guardian through AWS SES (`sendGuardianConfirmation`), and the account stays pending until the guardian confirms. The guardian confirmation token is field-locked to super admins and stripped from data exports.
- Data minimization for minors (implemented by design). For a child we collect name, date of birth, club, an emergency contact, development records, and the guardian's details. We do not collect payment data or a SIN, and we do not collect sensitive fields beyond what participation requires.
- Restricted visibility (implemented). A minor's profile, certifications, and any uploaded files are readable only by the owner (managed by the guardian) and super admins, enforced by the collection access functions. Club admins see only derived compliance status. Minor data is never public.
- Heightened safeguards and shorter retention (partly implemented; see Section 7). Children's records are stored with the same encryption and private-bucket controls as all sensitive data, and the policy commits to the shortest reasonable retention for children. The automated purge of aged-out minors is planned, not built; today the retention-review cron flags inactive accounts for a Privacy Officer to review.
- No profiling of children (implemented by design). There is no advertising, behavioural tracking, or marketing-profile logic anywhere in the system, and none for children specifically.
- Engagement features inherit the same protections (implemented by design). The gamification ledgers (XP events, badge awards, streaks), recognitions, and challenge submissions are owner-and-admin read only; a minor's records are never public. Any non-owner display of a minor uses a privacy-safe name (first name plus last initial, or a team handle), never the full name. Recognitions are created pending and surface only after coach/admin approval, and a minor recognition surfaces beyond the owner only with the guardian-set `recognitionSurfacing` consent. Leaderboards show a minor only with the `appearOnLeaderboard` consent and only via the privacy-safe name. There is no open messaging between minors: recognition and communication flow through moderated, server-enforced gates. These engagement collections ship dormant behind a feature flag and are not enabled for production data until this assessment and the threat model are updated (this revision) and the controls are reviewed.

The guardian is the account holder for a minor and can view, correct, export, and request deletion of the child's information at any time (Section 5). A short, plain-language summary for young athletes is published in the Guardian Consent notice.

---

## 5. Data subject rights

The rights below are available to every user, and a guardian may exercise them on behalf of a minor.

- Access (implemented in part, self-serve export; manual for full file review). A signed-in user can view their own profile, certifications, and consent history in the app, and download a machine-readable copy via the self-serve export endpoint (`/api/account/export`). The export returns only the requester's own profile, certifications, and consent records, and strips the internal guardian confirmation token. A complete access request that includes reviewing uploaded files is handled by the Privacy Officer.
- Correction (implemented). Users can view and correct their own profile and certification data through the app. Verification fields and roles are admin-set so a user cannot mark their own credential as verified.
- Export / portability (implemented). The self-serve JSON export above gives the user a portable copy of their own account data.
- Erasure (implemented, admin-run with a legal-hold check). The admin erasure workflow (`/api/admin/erase-user`) is super-admin only. It refuses if the account is under a legal or safety hold (`legalHold` flag). When allowed, it deletes the user's certifications, private certificate files (database and Supabase Storage), consent records, and any private scoresheet and incident photos they own, then the user, and returns a summary that is logged. A self-serve account-deletion request button that routes to this workflow is planned; today deletion is initiated by contacting the Privacy Officer.
- Withdraw consent (partly implemented). Optional consents (marketing and photo) are stored as discrete flags and can be turned off. Withdrawing core consent ends the ability to provide certain features and is handled through the Privacy Officer and the erasure path.

Response handling and a documented service-level commitment to respond within the time the law allows are a Privacy Officer process item (Section 13), supported by the tooling above.

---

## 6. Consent

- Server-enforced, versioned sign-off (implemented). Consent is not a front-end checkbox alone. The `enforceConsent` hook compares each new account's recorded consent versions to the current values in the `PolicyVersions` global and rejects creation if they are missing or stale. Adult accounts must record `termsVersion`, `privacyVersion`, and `acceptedAt`; minor accounts must additionally record `guardianConsentVersion`.
- Granular optional consent (implemented). Marketing email opt-in and profile-photo opt-in are separate, unchecked-by-default boxes stored as `marketingOptIn` and `photoOptIn`. Required boxes cannot be pre-checked and the create button stays disabled until they are all checked.
- Versions as a single source of truth (implemented). The `PolicyVersions` global holds the current Terms, Privacy, and Guardian Consent version strings (read-publicly so the sign-up form can stamp them; super-admin write).
- Immutable consent history (implemented). Every sign-off, initial and re-consent, is written to the append-only `ConsentRecords` collection by the `logConsentRecord` hook through the server-side Local API. Users cannot create or edit these records; they are super-admin read only. This preserves prior acceptances for accountability.
- Re-consent on policy change (implemented). When a policy version is bumped in the `PolicyVersions` global, the consent hook treats the user's stored version as stale and the user or guardian is re-prompted to accept at next sign-in; the new acceptance is recorded as a `reconsent` record while the old record is kept.
- Consent audit view (implemented). A compliance consent-audit page reads from the current Users consents group and the ConsentRecords history so CMBA can confirm at a glance that every account has a current sign-off.

---

## 7. Retention and disposal

- Retention principle (policy in place). We keep personal information only as long as needed for the purposes in this assessment or as required by law and sport governance, and we use the shortest reasonable period for children.
- Retention review (implemented, flag-only). A weekly `retention-review` cron flags accounts that have been `inactive` for more than 24 months so the Privacy Officer can review them for erasure. It deliberately does not auto-delete; deletion remains a considered admin action with a legal-hold check.
- Short-lived security state (implemented). A daily `ttl-sweep` cron removes idempotency keys and rate-limit hit rows older than 24 hours.
- Disposal (implemented for on-request erasure). The erasure workflow deletes both database rows and the backing files in Supabase Storage. Certificate, scoresheet, and incident files are removed from the private buckets as part of erasure.
- Backups (operational item). Supabase native backups are in-region (ca-central-1). A documented backup-retention window and a tested-restore-then-secure-purge procedure for backups are an operator and Privacy Officer item, not yet formalized.
- Per-category retention schedule (planned). A written schedule with specific periods per data type (active member data, certification records per governance, minors' minimized data) and an automated purge for aged-out minors is planned. Today the controls above provide review and on-request disposal; the fixed schedule and automated minor purge are not yet built.
- Legal hold (implemented). The `legalHold` flag, settable by super admins only, exempts an account from erasure for legal or safety reasons. The erasure route honours it and refuses to proceed.

---

## 8. Third-party processors at a glance

Each processor handles data only on CMBA's instructions. Canadian hosting regions are chosen wherever the service supports it. The authoritative register is `docs/processors.md`.

| Layer | Processor | Region (required) | Personal data handled | Region confirmed | DPA signed |
|---|---|---|---|---|---|
| Compute / hosting | Vercel | Montréal yul1 | Transient request processing; no durable data | Yes (deployed to yul1) | Not yet signed |
| Database (Postgres) | Supabase | ca-central-1 (Montréal) | Profiles, certification metadata, consents, audit | Yes | Not yet signed |
| File storage (public) | Supabase Storage `cmba-public` | ca-central-1 | Profile photos, page images | Yes | Not yet signed |
| File storage (private) | Supabase Storage `cmba-private` | ca-central-1 | Certificate, scoresheet, and incident files | Yes (upload/download verified in prod) | Not yet signed |
| Email | AWS SES | ca-central-1 | Recipient email and name in headers; no sensitive data in body | Pending credentials | Not yet signed |
| League system of record | TeamLinkt | Vendor-managed | Registration, schedule, scores; not held by CMBA Connect | Not applicable | Not applicable |
| Error monitoring (optional) | Sentry | EU region at creation | Diagnostic error events only, configured to exclude personal data (no user, IP, cookies, body) | Off unless a DSN is set | Not yet signed |
| Usage analytics + Web Vitals | Vercel Web Analytics + Speed Insights | US (aggregate) | None; cookieless, aggregate, no user identifier, no child profiling | Enabled in the Vercel dashboard | Covered by the Vercel DPA |

Residency versus sovereignty: Supabase, AWS, and Vercel keep data physically in Canada, which satisfies residency. They are US-headquartered and may be subject to US legal process such as the CLOUD Act, so this is residency, not full data sovereignty. The board should record an explicit decision on whether sovereignty is required. Signed Data Processing Agreements (DPAs) with each processor, and confirmation that each one's sub-processors are Canada-resident, are open items (Section 13). Two technical services process only non-personal data outside Canada: Sentry error monitoring (diagnostics scrubbed of personal data, off unless a DSN is set) and Vercel Web Analytics (cookieless and aggregate). Both are disclosed in the privacy policy; neither profiles children.

---

## 9. Data residency

All personal data is stored and processed in Canada:

- Database: Supabase Postgres in ca-central-1 (Montréal). Project region is fixed at creation; native backups stay in-region.
- File storage: Supabase Storage in ca-central-1, a public bucket for non-sensitive images and a private, access-controlled bucket for sensitive documents.
- Email: AWS SES in ca-central-1. Email bodies link to the portal rather than carrying sensitive personal information.
- Compute: Vercel functions pinned to Montréal yul1 in `vercel.json` and project settings (Vercel defaults to US iad1, so this pin is required and is in place).

The S0 security baseline restricts image and connection sources to Supabase Storage hosts in ca-central-1 plus framework-generated data and blob sources, which keeps file delivery in-region.

---

## 10. Safeguards

Safeguards are tracked in a control matrix in `docs/SECURITY.md`, mapped to OWASP ASVS 5.0 (Level 2 across the app; Level 3 for admin, children's data, certification documents, and score reporting) and NIST SP 800-63B-4 for authentication. The S0 baseline is implemented; later phases are in progress. Highlights:

Implemented (S0 baseline and Stage A/B carryover):

- Encryption in transit (TLS everywhere; HSTS with preload emitted in production) and at rest (Supabase Postgres and Storage encrypt at rest).
- Strict Content Security Policy with a per-request nonce and strict-dynamic, plus the standard security header set, applied in middleware.
- Certificate, scoresheet, and incident files in private buckets; every download routes through Payload's access-checked endpoint; buckets are never public.
- Role-based access control as the boundary: Payload access functions on every collection and sensitive field, least privilege, with the score-report and incident gates re-derived server-side rather than trusted from the request body.
- Append-only audit log for privileged actions and an immutable consent-records log; the audit log refuses edits and deletes even under a server override.
- PII minimization in the rate limiter: client IPs are HMAC-hashed and truncated, never stored raw; safe error handling that does not leak internal detail to clients.
- Secrets kept out of the repository with secret scanning, dependency scanning with a triaged allowlist, and static analysis in CI.
- A published security.txt disclosure contact.

In progress or planned (S1 to S4 in the matrix):

- Password policy and breached-password screening are implemented (S1); the remaining identity work (passkeys, TOTP and recovery codes, email-OTP recovery, full MFA session-state and step-up, session and device management) is landing incrementally.
- A data flow diagram and threat model are planned as S4 evidence for the external reviews.
- A set of framework-transitive dependency advisories (in Next.js and Payload) is triaged and baselined; upgrading to patched releases is an operator item required before launch and an input to the penetration test.

---

## 11. Privacy risk table

Residual ratings assume the listed mitigations are in place and the open items in Section 13 are closed before public registration.

| Risk | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|
| Exposure of a minor's personal information to another member or the public | Low | High | Guardian-managed accounts; owner-or-admin access functions; minor data never public; private buckets; restricted-visibility tests | Low |
| Disclosure of a sensitive certificate file (for example a police information check) | Low | High | Private Supabase Storage bucket; access-checked downloads; owner-and-super-admin only; never public | Low |
| Account creation without a valid or current consent | Low | Moderate | Server-enforced `enforceConsent` hook; required boxes cannot be pre-checked; versioned sign-off; immutable consent log | Low |
| Guardian flow bypass (a minor account active without guardian confirmation) | Low | High | `guardianFlow` sets pending; confirmation email required; account stays pending until confirmed | Low |
| Score report or incident filed by an unauthorized user | Low | Moderate | Server-side re-derivation of team membership and role; identity forced to the signed-in user; not trusted from the body | Low |
| Cross-border transfer of personal data outside Canada | Low | Moderate | Supabase, Vercel, and SES pinned to Canadian regions; CSP source allowlist keeps file delivery in-region | Low to moderate (residency yes, sovereignty no without further action) |
| Processor handling without a signed DPA | Medium (today) | Moderate | DPAs identified as a launch blocker; processor register maintained | Medium until DPAs are signed |
| Over-retention of inactive or aged-out accounts | Medium | Moderate | Retention-review cron flags inactive accounts; legal-hold flag; on-request erasure | Medium until the fixed schedule and automated minor purge ship |
| Exposure of a minor through an engagement feature (XP, badge, streak, recognition, challenge, leaderboard) | Low | High | Owner-and-admin access on every engagement collection; privacy-safe names for non-owner display; recognitions pending until approved; minor surfacing/leaderboard gated on guardian consent; no minor-to-minor messaging; ships behind a feature flag | Low |
| Engagement free-text (recognition message) used to harass or to embed personal data | Low | Moderate | Plaintext only (no HTML), escaped on render; created pending and moderated before surfacing; report/flag primitive; every moderation action audited | Low |
| Re-identification through emergency-contact or incident third-party data | Low | Moderate | Admin-only incident read; emergency contact visible only to owner and admins; minimization | Low |
| Breach of a processor or the application | Low to medium | High | S0 hardening; encryption; RBAC; audit log; breach reporting commitment; pentest planned | Medium until pentest and DPAs complete |
| Stale credentials or secrets | Low | High | Secrets out of repo; CI secret scanning; key-rotation commitment | Low to medium pending documented rotation |
| Dependency vulnerability in framework packages | Medium | Moderate | Triaged allowlist; Dependabot; upgrade required before launch; mitigated by CSP and no public accounts yet | Medium until the framework upgrade lands |
| Consent record loss undermining accountability | Low | Moderate | Append-only ConsentRecords written server-side; super-admin read only | Low |

---

## 12. Breach response

If a breach of security safeguards creates a real risk of significant harm, CMBA will notify the affected individuals and report to the Office of the Privacy Commissioner of Canada, and to the Office of the Information and Privacy Commissioner of Alberta where required, and will keep a record of breaches as the law requires. The intent and commitment are stated in the Privacy Policy. A written incident runbook and a durable breach log are an open item (Section 13); the append-only audit log and scrubbed application logs support investigation today.

---

## 13. Open items before public registration

These must be addressed before public registration opens. The first four cannot be satisfied by code and require external action.

1. Independent third-party penetration test (planned). Web and API penetration test by an external firm, with findings remediated. The dependency-advisory upgrade (Next.js and Payload to patched releases) is a prerequisite input.
2. Third-party security and privacy review (planned). An independent security architecture assessment, and review of this PIA by a Canadian privacy professional, with the threat model and data flow diagram as supporting evidence.
3. Signed Data Processing Agreements (planned). Execute DPAs with Supabase, AWS, and Vercel, confirm each one's sub-processors are Canada-resident, and update the processor register. Record the board's residency-versus-sovereignty decision.
4. Privacy Officer and breach runbook (planned). Name the Privacy Officer in Site Settings and the Privacy Policy, fill in the contact details still marked as placeholders in the legal documents, document the access and erasure response process and service level, and write the incident runbook and durable breach log.
5. Retention schedule and automated minor purge (planned). Publish a written per-category retention schedule and implement the automated purge for aged-out or departed minors, plus a documented backup-retention and tested-restore-then-purge procedure.
6. Self-serve account deletion and a withdraw-consent flow (planned). Add a member-facing deletion request that routes into the existing admin erasure workflow with its legal-hold check, and a clear self-serve path to withdraw optional consents.
7. Finalize the public legal documents (planned). Set effective and last-updated dates and the Privacy Officer contact in the Privacy Policy, Terms of Use, and Guardian Consent notice, and align their published versions with the `PolicyVersions` global.

---

## 14. Summary of implemented versus planned

Implemented today: Canadian residency across database, storage, email, and compute; server-enforced, versioned consent with an immutable history and re-consent on policy change; the guardian-managed minor flow with pending-until-confirmed; owner-and-admin access controls with private buckets for sensitive files; self-serve data export; admin erasure with a legal-hold check; retention-review and TTL-sweep crons; an append-only audit log; and the S0 security baseline plus the start of the S1 identity work.

Planned before public registration: the independent penetration test and third-party reviews; signed DPAs and the sovereignty decision; a named Privacy Officer, finalized legal documents, a breach runbook and durable breach log; a written retention schedule with an automated minor purge and a backup-disposal procedure; self-serve account deletion and a withdraw-consent flow; and completion of the remaining S1 to S4 security phases.

This assessment should be kept current as those items close and as the system changes.
