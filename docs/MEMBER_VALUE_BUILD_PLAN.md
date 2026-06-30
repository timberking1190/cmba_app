# CMBA Connect - Member-Value Build Plan

A codebase-grounded build specification for the Member-Value feature program, mapped onto the live CMBA Connect repo (Next.js 15 App Router + Payload CMS 3 + Postgres on Supabase ca-central-1 + dual-bucket S3 + nodemailer/SES). This is a `docs/` spec only; it changes no code. Its purpose is to turn the Member-Value roadmap into concrete, reviewable engineering work where every feature maps to specific Payload collections, reused existing modules (cited by file path), routes, access control plus minor-safety rules, effort, and dependencies. The first and deepest slice is the cross-cutting foundation (unified gamification, recognition, notifications/digest); the per-audience features are deliberately held at plan altitude because they all hang off that foundation.

How to read this document. Section 2 grounds the plan in what already exists. Section 3 is the contract every new collection must satisfy. Section 4 is the deep treatment of the foundation and is the largest section by design; read it before any per-audience section. Sections 5.x are per-audience feature tables at plan altitude (Feature, Tier, collections, reuses, routes, access/minor-safety, effort, deps). Section 6 is the consolidated master list of new collections. Section 7 folds in the critic findings and operator gaps. Section 8 is the sequenced Now/Next/Later roadmap with explicit foundation dependencies so the build order is unambiguous: foundation first.

Program rules that bind this plan: docs-only deliverable; no em or en dashes anywhere; default-deny access on every collection; migrations-only (`push:false`); Canadian residency (Postgres + buckets + SES all ca-central-1, compute yul1); no PII in any email or push payload; minors are the highest-sensitivity surface and inherit the existing consent/guardian/EXIF-strip posture.

---

## 2. What already exists (grounding)

The security and compliance scaffolding the foundation must inherit is mature and directly reusable. The gamification persistence is essentially greenfield. The table below lists the existing modules this plan builds on.

| Module / file | What it gives us | How the plan uses it |
| --- | --- | --- |
| [gamification.ts](src/lib/gamification.ts) | `XP_LEVELS` (6 tiers Rookie to Hall of Fame), `getLevelForXP()`, `XP_REWARDS`, static `COACH_BADGES`/`REF_BADGES` arrays, `Badge` type. Client-safe constants/math, no DB. | Keep `XP_LEVELS`/`getLevelForXP`/`XP_REWARDS` verbatim as the unified level ladder for all four audiences. Demote `COACH_BADGES`/`REF_BADGES` to a seed-only export for the new Badges collection. Add a shared `AUDIENCE` list. |
| [compliance.ts](src/lib/compliance.ts) | `getUserProgress`, `getPathwayProgress`, `getComplianceForUser`. Computes XP/level/badges at read time from valid Certifications (coach/official only). Badges awarded positionally by `COACH_BADGES.slice(0, completedStages)`. | The compute-on-read precedent. Consolidate its XP/badge logic plus the two inline duplicates into one progress service. Coach/official pathway XP stays cert-derived; ledger XP is added on top. |
| [Pathways.ts](src/collections/Pathways.ts) | Stage model: ordered `stages[]` (name, order, `xpReward`, `requiredCertificationTypes`), `audience` enum (coach\|official only). Public read, `superAdminOnly` write. | Extend the audience enum and add a non-certification requirement type for athlete skill pathways, or build a parallel SkillPathways sharing the shape. Do not rewrite the cert-driven path. |
| [rulesData.ts](src/lib/rulesData.ts) / [rulesQA.ts](src/lib/rulesQA.ts) | 36 rule docs + `searchRules()`; 52 hand-authored Q&A entries with correct answer + `ruleRef` + division (no prompts, no distractors). | Seed source for Basketball IQ quizzes (answer keys) and the rules-explain panel. Distractor + prompt authoring is the net-new content cost. |
| [reach360CourseData.ts](src/lib/reach360CourseData.ts) / [Courses.ts](src/collections/Courses.ts) / [CertificationTypes.ts](src/collections/CertificationTypes.ts) / [Certifications.ts](src/collections/Certifications.ts) | Live verified-completion pipeline: Courses catalog (public read, `superAdminOnly` write, `externalId` sync), per-user Certifications (owner-scoped Where, `beforeChange` forces `user=req.user.id`, status auto-computed, `verifiedBy`/`verifiedAt` are `superAdminFieldOnly`). | `Courses.ts` is the copy-from template for Drills/Challenges/Quizzes/Surveys. `Certifications.ts` is the turnkey verified-vs-self-reported, owner-scoped template for every user-owned progress collection. Spectator-course completion is just seed data. |
| Scheduling/Officials/Availability collections | [Games.ts](src/collections/Games.ts), [Venues.ts](src/collections/Venues.ts), [Courts.ts](src/collections/Courts.ts), [StandingsCache.ts](src/collections/StandingsCache.ts), [Officials.ts](src/collections/Officials.ts), [GameOfficials.ts](src/collections/GameOfficials.ts) (own-read-scope via `officialUserId`, `emailAssignment`+`writeAudit` afterChange), [Availability.ts](src/collections/Availability.ts) (per-membership minor-data scaffold, admin-locked), [PlayerStats.ts](src/collections/PlayerStats.ts) (`enabled=false` minor-data gate). | Game-day views, family calendar, predict-the-week read live Games/StandingsCache. Officials assignment dashboard extends GameOfficials. Attendance/EPT/availability extend Availability/PlayerStats, never clone them. |
| Email / cron infra | [emailEvents.ts](src/lib/emailEvents.ts) (PII-free, single-recipient, `PORTAL_NOTE`, try/catch-never-throw), [reminders.ts](src/lib/reminders.ts) (stateless exact-day buckets), [cron.ts](src/lib/cron.ts) (`checkCronAuth`, fail-closed), [certification-reminders/route.ts](src/app/(frontend)/api/cron/certification-reminders/route.ts) and [score-reminders/route.ts](src/app/(frontend)/api/cron/score-reminders/route.ts) (skeleton + dedupe-by-email Set), [vercel.json](vercel.json) (yul1, 5 crons). | New `weekly-digest` and `streak-rollup` crons copy this skeleton verbatim and register in `vercel.json`. Digest/recognition composers extend `emailEvents.ts`. |
| Consent / age / compliance | [Users.ts](src/collections/Users.ts) (`isMinor` derived readOnly, `guardian` group, `consents` group with `photoOptIn`/`marketingOptIn`, `notificationPrefs`, `pushDevices`), [hooks/users.ts](src/collections/hooks/users.ts) (`deriveIsMinor`, `enforceConsent`, `guardianFlow`, `logConsentRecord`), [age.ts](src/lib/age.ts) (`isUnder18`), [ConsentRecords.ts](src/collections/ConsentRecords.ts) (append-only, system-write), [AuditLog.ts](src/collections/AuditLog.ts) (append-only, HMAC, deny-all + throw). | Minor detection, consent versioning, guardian flow, append-only award/recognition records, and `writeAudit` all reused wholesale. New minor consent kinds extend `Users.consents` + `ConsentRecords`, never a parallel system. |
| Access + role routing | [access/index.ts](src/access/index.ts) (Role union, `hasRole`/`isSuperAdmin`/`isAnyAdmin`/`clubIdOf`, `superAdminOnly`/`authenticated`/`publishedOrAdmin`/`superAdminFieldOnly`), [teamAccess.ts](src/lib/teamAccess.ts) (`getVerifiedTeamIds`/`getVerifiedGameIds`, async, overrideAccess), [auth.ts](src/lib/auth.ts) (`getCurrentUser`/`getPayloadClient`), [TeamMemberships.ts](src/collections/TeamMemberships.ts) (self-claim-then-admin-verify gate), [Confirmations.ts](src/collections/Confirmations.ts) (moderate-by-server-derivation), [mfa/enforce.ts](src/lib/mfa/enforce.ts), [middleware.ts](src/middleware.ts) (`PROTECTED_PREFIXES`). | Compose access from these helpers. `ref/page.tsx` + `account/page.tsx` are the server-page-to-client-View template for every role home. Verified-team scoping is done in async collection-level access or a route handler, never field access (see Section 4). |
| Private uploads | [CertificateFiles.ts](src/collections/CertificateFiles.ts) / [ScoresheetFiles.ts](src/collections/ScoresheetFiles.ts) / [IncidentFiles.ts](src/collections/IncidentFiles.ts) (private bucket, `disableLocalStorage`, owner-forced+locked, 8MB cap, [exif.ts](src/lib/uploads/exif.ts) strip), [Media.ts](src/collections/Media.ts) (public, never for minors). | Any minor clip/photo upload (challenge clips, gallery photos) goes through the private-bucket EXIF-strip precedent, gated on `consents.photoOptIn`. Never `Media`. |

Bottom line: Stage A (foundation/auth/consent/CMS) and Stage B (scheduling/scores/officials) are live in production; Stage C security is mostly in place. The Member-Value foundation is an extension of a mature, compliance-heavy codebase, not a greenfield. The single biggest functional gap is that today's gamification is fake (static, coach/official-only, self-awarded, positional badges, no persistence). The single biggest operational dependency is that SES is unprovisioned, so digests log but do not deliver.

---

## 3. Conventions every new feature must follow

These are distilled from `SCHEDULING_BUILD_PLAN.md` section 0, the survey, and the existing collections. Treat them as acceptance criteria, not suggestions.

1. **Collection authoring.** One PascalCase file per collection in `src/collections/`, exporting `const X: CollectionConfig = { slug, access, admin, hooks?, fields, indexes? }`. `slug` is kebab-plural matching the `relationTo` string. Open every file with a block comment stating purpose and trust boundary. Register alphabetically in [payload.config.ts](src/payload.config.ts) `collections[]` and set an `admin.group`.

2. **Default-deny access.** Declare all four access keys (`read`/`create`/`update`/`delete`) explicitly; each returns `false` unless a positive role or `Where` condition matches. Compose from [access/index.ts](src/access/index.ts) helpers; never inline role-string checks. Scoped reads return a `Where`, not a boolean. The only documented public-read exceptions are `publishedOrAdmin`, `Games.read`, and `StandingsCache.read`; new public reads must justify themselves the same way.

3. **System-only-write / append-only.** Award/verification/ledger records use `create/update/delete: () => false` and are written ONLY via `payload.create({ overrideAccess: true, req })` from the engine or an authorized route. Append-only logs add `beforeChange` (throw on update) + `beforeDelete` (throw), mirroring [AuditLog.ts](src/collections/AuditLog.ts) and [ConsentRecords.ts](src/collections/ConsentRecords.ts).

4. **Verified-not-self-reported.** Mirror [TeamMemberships.ts](src/collections/TeamMemberships.ts) and [Certifications.ts](src/collections/Certifications.ts): a self-claim lands unverified server-side (`beforeChange` forces `verified=false`), and `verified`/`verifiedBy`/`verifiedAt` are `superAdminFieldOnly`. A meaningful badge requires a verified source. **Verified-team coach authorization is NEVER a FieldAccess** (see Section 4.3); it is done in async collection-level access or a `/api/v1` route handler, then written via `overrideAccess`.

5. **Minor-safety rules.** Gate on `Users.isMinor` (derived via [age.ts](src/lib/age.ts) `isUnder18`, never client-trusted). A minor's records are owner(guardian) + super-admin only and never public. Any non-owner display of a minor uses the new `privacySafeName` (first-name + last-initial / team handle). Photos require `consents.photoOptIn` and the private bucket + EXIF strip. No public minor full name, ever. No open minor-to-minor messaging: social flows through coach/admin moderation. No ads or behavioural profiling, ever. New individual-minor-data surfaces stay owner/guardian-only behind an `enabled` flag until the athlete-minor consent model (Section 4.2) lands, matching the deliberate `PlayerStats.enabled=false` posture.

6. **Naming.** Reuse the `ROLES`/`Role` union and the new shared `AUDIENCE` const; never redefine role/audience strings. `externalId` (indexed) is the sync/dedupe key for imported content.

7. **Hooks ordering and transactions.** `beforeValidate` for derivation/gating, `beforeChange` for pinning/enforcement (re-derive trust fields server-side, throw on violation, never trust the body), `afterChange` for side-effects (email/audit/mirror) that swallow errors via `payload.logger`. Nested writes from a hook MUST thread `req` so they join the parent transaction (the [games/service.ts](src/lib/games/service.ts) lesson); a forgotten `req` deadlocks on the parent-locked row.

8. **Residency, audit, migrations.** Personal data stays in ca-central-1 Postgres; uploads in the private ca-central-1 bucket. Every privileged/moderated/award action calls `writeAudit(payload, {...}, req)`. Composite uniqueness is a collection-level `indexes:[{fields,unique:true}]` emitting a real `CREATE UNIQUE INDEX` in a generated migration (`push:false`); never field-level `unique:true`. `/api/v1` writes require Bearer-JWT + `Idempotency-Key`.

---

## 4. Cross-cutting foundation (deep, first slice)

This is the unified gamification system (XP/points ledger, levels, badges, badge awards, streaks), the moderated recognition engine, and the notifications/digest layer. Everything in Section 5 depends on it. It is built first.

### 4.1 Design summary and what it extends (not replaces)

Today gamification is a thin compute-on-read derivation over Certifications for coaches and officials only, with static badge arrays awarded positionally and no persistence, streaks, recognition, or digest. The foundation:

- **Keeps** `XP_LEVELS`/`getLevelForXP`/`XP_REWARDS` from [gamification.ts](src/lib/gamification.ts) verbatim as the unified ladder for all four audiences (the math is role-agnostic). Existing pathway pages keep importing these client-safe constants.
- **Promotes** `COACH_BADGES`/`REF_BADGES` to a seed source for a new declarative Badges collection rather than runtime arrays.
- **Adds** five collections: Badges (catalog), BadgeAwards (immutable, verified-stamped), XpEvents (append-only ledger, single source of truth, compute-on-read), Streaks (the one materialized counter), and Recognitions (pending-by-default, moderated).
- **Consolidates** the three duplicated XP/badge computations ([compliance.ts](src/lib/compliance.ts) `getUserProgress`, [coach/pathway/page.tsx](src/app/(frontend)/coach/pathway/page.tsx), [ref/page.tsx](src/app/(frontend)/ref/page.tsx)) into one `progress.ts` service as step one, before adding athlete/parent, to remove drift risk.
- **Reuses** the cron + email infra, the verified-trust precedents (Certifications/TeamMemberships), the immutability precedents (ConsentRecords/AuditLog), the moderation precedent (Confirmations), and the minor-safety model (`Users.isMinor` + consents + private bucket).

### 4.2 New foundation collections

For each collection: key fields, access, minor-safety, hooks, and what it reuses/extends. Field locks below mean "locked against the standard REST API for non-admins"; `overrideAccess` engine writes bypass field access entirely, which is why the engine is the only mint path for verified events.

#### Badges (slug `badges`) - admin group: `Training catalog`

CMS-authored catalog of every badge definition across all four audiences. Declarative earn criteria replace the positional `slice(0,n)` hack so staff add/retire badges without code (principle 4).

- **Key fields:** `slug` (unique, indexed); `name`; `description`; `icon` (emoji or media rel); `audience` (multi-select from the shared `AUDIENCE` const: athlete\|coach\|official\|parent; a badge may target several); `tier` (bronze\|silver\|gold\|milestone); `earnKind` (xp_threshold\|streak_threshold\|verified_count\|pathway_stage\|recognition\|manual); `earnConfig` (group: `threshold:number`, `sourceKey:text` e.g. `challenge.verified`, `pathwayStage` rel); `verificationRequired` (checkbox: does an award of this badge require a verified source event to count); `active` (checkbox); `externalId` (indexed, for seed/sync).
- **Access:** read = active badges readable by any signed-in user (`authenticated` gated on `active`); inactive/draft admin-only (reuse the `publishedOrAdmin` shape with an `active` gate). create/update/delete = `superAdminOnly`. Mirrors [Courses.ts](src/collections/Courses.ts).
- **Minor-safety:** no personal data; a catalog. Badge copy must avoid implying a public ranking of minors.
- **Hooks:** none required beyond admin validation.
- **Reuses:** [Courses.ts](src/collections/Courses.ts) authoring template; [gamification.ts](src/lib/gamification.ts) badge arrays as seed; shared `AUDIENCE` const in [access/index.ts](src/access/index.ts).

#### BadgeAwards (slug `badge-awards`) - admin group: `People`

Immutable record that a user earned a badge, with the verified-vs-self-reported trust stamp. The canonical "a badge that counts" ledger.

- **Key fields:** `user` (rel, indexed, `superAdminFieldOnly`); `badge` (rel to badges, indexed); `awardedVia` (auto\|coach_verified\|admin_manual); `sourceEvent` (rel to xp-events, the triggering event when auto); `verified` (checkbox, `superAdminFieldOnly`; true only when `awardedVia in {coach_verified, admin_manual}` OR `badge.verificationRequired=false`); `awardedBy` (rel to users, null for auto, `superAdminFieldOnly`); `isMinor` (checkbox captured at award time, re-derived server-side, see below); `awardedAt` (date).
- **Access:** read = `ownerOrSuperAdmin` returning `Where {user:{equals:user.id}}` (coach/admin read scoped to verified team members deferred to a later phase). create/update/delete = `() => false`; written ONLY via `overrideAccess` inside the engine or an authorized coach/admin verify route. `beforeChange` throws on update. Composite unique index `(user, badge)` prevents duplicates.
- **Minor-safety:** `isMinor` stamped on the row and **re-derived by the engine** via [age.ts](src/lib/age.ts) `isUnder18` / `Users.isMinor` (overrideAccess read), never trusted from a client or a stale field. Never publicly displayed; surfaced only on the owner's own profile/digest and to the owner's verified coach/admin. Non-owner surfaces use `privacySafeName`.
- **Hooks:** `beforeChange` (deny update); award path runs inside the engine which stamps `isMinor`, `awardedAt`, `verified`, and calls `writeAudit` for manual/coach awards.
- **Reuses:** [ConsentRecords.ts](src/collections/ConsentRecords.ts) (system-only-write + isMinor capture), [Certifications.ts](src/collections/Certifications.ts) `verifiedBy`/`verifiedAt` field-lock, [TeamMemberships.ts](src/collections/TeamMemberships.ts) verified-stamp, `writeAudit()`, `indexes:[{fields:['user','badge'],unique:true}]`.

#### XpEvents (slug `xp-events`) - admin group: `People`

The append-only XP/points ledger and single source of truth. Every XP-bearing action is one immutable row. XP total, level, and streak are DERIVED on read by summing rows (the [compliance.ts](src/lib/compliance.ts) convention), never stored as a mutable counter.

- **Key fields:** `user` (rel, indexed, `superAdminFieldOnly`); `amount` (number, may be 0 for streak-tracking events); `kind` (login\|challenge\|quiz\|drill\|clinic\|recognition\|pathway_stage\|streak_bonus\|milestone); `counts` (select: `fun_only` \| `meaningful` - `fun_only` = self-reported, feeds streaks/level-for-fun; `meaningful` = verified, feeds verificationRequired badges); `verified` (checkbox, `superAdminFieldOnly`; true only when source was coach/admin verified or cert-derived); `source` (group: `collection:text`, `docId:text`, e.g. `challenge-submissions/123` for traceability); `occurredAt` (date, indexed); `dedupeKey` (text, unique with user, for idempotency).
- **Access:** read = `ownerOrSuperAdmin` Where. create/update/delete = `() => false`; written ONLY via `overrideAccess` from the engine. `beforeChange` throws on update (append-only). Composite unique index `(user, dedupeKey)`.
- **Minor-safety:** owner + super-admin (+ later, owner's verified coach) read only. No public sum of a minor's XP; leaderboards (Next tier) read derived totals through a privacy-safe projection and only with the appear-on-leaderboard consent (Section 4.2.1).
- **Hooks:** `beforeChange` (deny update). Engine stamps `occurredAt`, `counts`, `verified`, `dedupeKey`.
- **Reuses:** AuditLog append-only triple-lock; [compliance.ts](src/lib/compliance.ts) compute-on-read; [reminders.ts](src/lib/reminders.ts) stateless-by-exact-key idea for `dedupeKey`; `indexes:[{fields:['user','dedupeKey'],unique:true}]`.

#### Streaks (slug `streaks`) - admin group: `People`

One row per user holding current/longest streak counters. **A pure materialized view of XpEvents** (critic fix): the streak is fully re-derivable from `XpEvents.occurredAt` (distinct active days), so this row is a cache, not a source of truth, and a reconcile is just a recompute from the ledger.

- **Key fields:** `user` (rel, unique, indexed, `superAdminFieldOnly`); `currentStreakDays` (number, readOnly); `longestStreakDays` (number, readOnly); `lastActiveDay` (date, day-only, readOnly); `streakKind` (login\|activity, default `activity`).
- **Access:** read = `ownerOrSuperAdmin` Where. create/update/delete = `() => false`; **written ONLY by the nightly streak-rollup cron** via `overrideAccess`. The engine writes XpEvents only; it does NOT write Streaks. This eliminates the two-writer race (critic fix): one writer (the cron), one source of truth (the ledger).
- **Minor-safety:** streaks are fun-only by design (driven by self-reported activity), never a public ranking. Owner-only display. No PII.
- **Hooks:** none on the collection; all writes come from the cron.
- **Reuses:** [Certifications.ts](src/collections/Certifications.ts) owner access + owner-pinning; `XP_REWARDS.streakBonus7/30` and the vestigial Warrior badges in [gamification.ts](src/lib/gamification.ts) (now made real); the cron skeleton for the rollup; `indexes:[{fields:['user'],unique:true}]`.

#### Recognitions (slug `recognitions`) - admin group: `People`

The moderated recognition engine: shout-outs, player/coach/parent/volunteer of the month, sportsmanship, milestones. Every recognition is created pending and must be coach/admin approved before it surfaces (principles 2 and 3; no open minor channel).

- **Key fields:** `kind` (player_of_game\|shout_out\|sportsmanship\|coach_of_month\|parent_volunteer\|milestone); `subject` (rel to users, the recognized person); `nominatedBy` (rel to users, pinned to `req.user` in `beforeChange`, `superAdminFieldOnly`); `team` (rel to teams, optional, for scoping); `message` (textarea; plaintext, escaped on render, never raw HTML); `moderationStatus` (pending\|approved\|rejected, default pending, `superAdminFieldOnly`); `moderatedBy` (rel to users, `superAdminFieldOnly`); `moderatedAt` (date, stamped when status leaves pending); `subjectIsMinor` (checkbox captured at create, re-derived server-side); `awardsBadge` (rel to badges, optional; on approval the engine writes a verified BadgeAward + XpEvent); `flagged` (checkbox) + `flagReason` (text) for the report/flag primitive (Section 4.2.2).
- **Invariant (critic fix):** any signed-in user including a minor MAY create a recognition, but nothing they create is ever visible to anyone but moderators until `moderationStatus=approved`. The moderation gate is the safety boundary. `beforeChange` forces `moderationStatus=pending` and `nominatedBy=req.user.id` (re-derived, throw on violation) per the [Confirmations.ts](src/collections/Confirmations.ts) precedent; these are hard gates, not field defaults.
- **Surfacing a minor subject (critic fix):** there is no free-floating `surfaceConsent` checkbox. Surfacing a minor recognition beyond the owner requires `moderationStatus=approved` AND a real consent: a new guardian-set consent kind `recognitionSurfacing` added to `Users.consents` (+ a `ConsentRecords` kind), mirroring `photoOptIn`. If that consent is absent, a minor-subject recognition is owner-only by construction in this phase (no team surfacing).
- **Access:** read = subject-owner + nominator + verified coach/admin of the team; NEVER public for minors. Approved non-minor recognitions may be team-readable via a `Where` scoped by `getVerifiedTeamIds`. create = `authenticated` (lands pending). update = coach/admin moderation **done via the admin SPA or a coach-verify route** (not a relaxed field lock; see 4.3). delete = admin only.
- **Minor-safety:** the no-open-minor-messaging guard. `subjectIsMinor` stamped and re-derived; display uses `privacySafeName`; `message` is plaintext with a report/flag affordance.
- **Reuses:** [Confirmations.ts](src/collections/Confirmations.ts) moderation-by-derivation, [TeamMemberships.ts](src/collections/TeamMemberships.ts) verified-stamp + `superAdminFieldOnly`, [Announcements.ts](src/collections/Announcements.ts) as the surfacing substrate, `writeAudit()` on every approve/reject, `privacySafeName`.

##### 4.2.1 Athlete-minor individual-data consent model (new foundation deliverable; critic fix)

The athlete slice's Now-tier features (skill map, drills, challenges, recognition) require displaying a minor's progress to non-owners, but no phase produced the consent model they depend on. This plan adds it explicitly as a foundation deliverable (design only, in F0/F0.5):

- New flags in `Users.consents` (guardian-set): `progressSharing` (allow a coach/teammate to see the minor's progress) and `recognitionSurfacing` (allow approved recognitions to surface beyond the owner). Add `appearOnLeaderboard` for the Next-tier leaderboard surfaces. Each mirrors `photoOptIn`: default false, opt-in, captured through the existing guardian flow, mirrored to `ConsentRecords` via `logConsentRecord`.
- New `ConsentRecords` kinds for each, so every grant/revoke is append-only auditable.
- Until these land, every minor-data surface stays owner/guardian-only behind an `enabled` flag, matching `PlayerStats.enabled=false`. State this gate in each athlete feature row.

##### 4.2.2 Report/flag moderation primitive (concrete F2 deliverable; critic fix)

A minor-facing social surface requires report/flag as a safety primitive, not an optional nicety. Specify it once and share it across Recognitions and the coach community-of-practice forum:

- A `flagged` checkbox + `flagReason` on any moderatable row, settable by any signed-in user via a `/api/v1/moderation/flag` route (Bearer-JWT + `Idempotency-Key`); the route writes the flag via `overrideAccess` and `writeAudit`, never trusting the body for the actor.
- Flagged rows surface in the admin SPA moderation queue. Approve/reject/clear all write `writeAudit`.

### 4.3 The verified-vs-self-reported model and how it is enforced

Two-tier model carried on a single `counts` field (`fun_only` \| `meaningful`) plus a `verified` boolean on every XpEvent.

- **Self-reported** actions (daily login, drill-of-the-day, self-logged challenge result, quiz completion, trivia, bingo, predict-the-week) are written by the engine with `counts='fun_only'`, `verified=false`. They accumulate toward the streak counter, the for-fun level/XP bar, and `fun_only` badges (e.g. 7-Day Warrior). They do NOT satisfy badges whose `verificationRequired=true`.
- **Verified** actions become meaningful only when a coach or admin stamps them: a ChallengeSubmission (Next tier) lands unverified like a self-claim TeamMembership; a coach/admin verifies it; the engine then writes a NEW XpEvent with `counts='meaningful'`, `verified=true` (it does not mutate the original self-reported row; append-only). Pathway-stage XP for coaches/officials is meaningful by construction because it derives from already-verified Certifications.

**Enforcement is structural, not UI:**

1. `XpEvent.verified` and `BadgeAward.verified` are `superAdminFieldOnly`, so a participant can never self-set them via the standard REST API.
2. XpEvents/BadgeAwards have `create:()=>false` and are written only via `overrideAccess` inside the engine. The only way to mint a verified event is through the engine, which marks `verified=true` only when invoked from an authorized branch (recognition approval, coach challenge verification via the `/api/v1` route, admin manual award) or from a cert-derived source.
3. `evaluateBadges()` only counts XpEvents with `verified=true` toward `verificationRequired` badges.
4. Every verified award/approval writes an `AuditLog` row via `writeAudit`, so the trust decision is non-repudiable.

**The coach-authorization correction (critic fix, high severity).** Verified-team coach authorization is asynchronous (it must query team-memberships, as `getVerifiedTeamIds` does). The repo's FieldAccess functions (`superAdminFieldOnly`, etc.) are ALL synchronous and inspect only `req.user`/`doc` in memory; team-scoped authorization is done exclusively in async collection-level access. **Therefore `coachOrAdmin` is NOT a FieldAccess helper.** Two correct mechanisms:

- For F1/F2, keep `verified`/`moderationStatus`/`status` fields locked to `superAdminFieldOnly` (admins moderate via the Payload admin SPA). This ships the foundation without coach self-service.
- Coach self-service verification (when added) routes through a dedicated `/api/v1` endpoint (Bearer-JWT + `Idempotency-Key`) whose handler does the async `getVerifiedTeamIds` check server-side, then writes via `overrideAccess` inside the engine and `writeAudit` - exactly the [Confirmations.ts](src/collections/Confirmations.ts) / targeted-announcement pattern. Because `overrideAccess` bypasses field access entirely, the engine never needs a `coachOrAdmin` FieldAccess. The only role of field locks here is to stop a participant editing via the standard REST API, for which `superAdminFieldOnly` already suffices.

The one new access helper added to [access/index.ts](src/access/index.ts) is a collection-level/route-level coach-scope helper, never a FieldAccess one. Open question 1 is resolved in favor of verified-team-scoped checks done in route/collection access. (The same correction applies to the officials GameOfficials accept/decline self-update in Section 5.4: model it as collection-level update access returning `Where {officialUserId:{equals:user.id}}` plus a `beforeChange` that forbids changing anything but `status`, not a relaxed field lock.)

### 4.4 Lib modules

| Module | New / Extend | Purpose |
| --- | --- | --- |
| [gamification.ts](src/lib/gamification.ts) | Extend in place | Keep `XP_LEVELS`/`getLevelForXP`/`XP_REWARDS` verbatim. Add the shared `AUDIENCE` list. Demote `COACH_BADGES`/`REF_BADGES` to a seed-only export. Stays client-safe so pathway pages keep importing it. |
| `src/lib/gamification/engine.ts` | New, server-only | The single write-path. `awardXp(payload, {user, kind, amount, counts, verified, source, dedupeKey}, req)` inserts an XpEvent via `overrideAccess` (idempotent on `dedupeKey`), re-derives `isMinor`, then `evaluateBadges(user)` checks active Badges' `earnConfig` against derived totals/streaks/verified counts and writes new verified BadgeAwards. `recordRecognitionApproved()` writes the verified XpEvent + BadgeAward on approval. Every privileged write calls `writeAudit`. **`req` is a non-optional parameter** (critic fix) so nested writes join the parent transaction. |
| `src/lib/gamification/progress.ts` | New, server-only | The compute-on-read service that REPLACES the three duplicated computations. `getUnifiedProgress(payload, userId)` returns `{xp, level (via getLevelForXP), badges (from BadgeAwards), streak (from Streaks), audience}`. Generalizes [compliance.ts](src/lib/compliance.ts) from "certifications held" to pluggable sources: certifications (existing) + XpEvents (new). Coach/official progress = cert-derived XP plus ledger XP; athlete progress = ledger-only. Pure reads, `overrideAccess` + caller-side scoping. |
| `src/lib/displayName.ts` | New, client-safe | `privacySafeName(user)` returns `${preferredName || firstOf(fullName)} ${lastInitial}.` and FORCES first-name + last-initial / team handle whenever `user.isMinor` is true (closes the gap that today only `PersonalizedStrip` ad-hoc splits the name). The single sanctioned display-name helper for any non-owner surface. Server pages must pass the authoritative `isMinor` from a server fetch, never a cached prop (critic minor-safety note). |
| `src/lib/audience.ts` | New, shared | `primaryAudience(user)` maps `Users.roles[]` to one home audience, centralizing the `coach?official?undefined` ternary duplicated in [account/page.tsx](src/app/(frontend)/account/page.tsx) and [compliance.ts](src/lib/compliance.ts). Adds athlete/parent branches. |
| [emailEvents.ts](src/lib/emailEvents.ts) | Extend in place | Add `emailWeeklyDigest(payload, {toEmail})` and `emailRecognition(payload, {toEmail})` following the PII-free + `PORTAL_NOTE` + single-recipient + try/catch-never-throw convention. Bodies state only what happened + a portal deep link; honor `notificationPrefs`. |
| `src/lib/notify.ts` | New, channel abstraction | `notify(payload, userId, {kind, prefKey})` resolves channels: send email now (via `emailEvents`) and, when push ships, fan out to `Users.pushDevices` with the SAME no-PII payload. Single code path so email-now/push-later is one call. Reads `notificationPrefs` to suppress optional notices; a transactional bypass flag for escalations. |
| [access/index.ts](src/access/index.ts) | Extend in place | Promote `ownerOrSuperAdmin` (currently re-implemented inline in Certifications/PlayerStats/TeamMemberships; note the exact inline copies it replaces and preserve any guardian-read semantics, critic note). Add a collection-level/route-level coach-scope helper (NOT a FieldAccess). Keep default-deny and the documented public-read exceptions list. |

### 4.5 The digest / notification pipeline on existing cron + email

Two new crons copy the [certification-reminders/route.ts](src/app/(frontend)/api/cron/certification-reminders/route.ts) skeleton (force-dynamic, runtime nodejs, maxDuration, `checkCronAuth`, `getPayloadClient`, paginate depth:1, overrideAccess, dedupe-by-lowercased-email Set, JSON summary, `payload.logger`) and register in [vercel.json](vercel.json):

- `src/app/(frontend)/api/cron/weekly-digest/route.ts` (e.g. `0 13 * * 1`). **Per-account roll-up only** (critic fix): each account gets its own digest of new BadgeAwards + approved Recognitions + this-week Announcements + upcoming games. Honors `notificationPrefs.weeklyDigest`. The guardian-aggregated family digest (across a guardian's children) is NOT in the foundation; it lives in the parent slice gated explicitly on GuardianLinks, because no guardian-to-children relation exists today.
- `src/app/(frontend)/api/cron/streak-rollup/route.ts` (e.g. `0 7 * * *`). Per active user, reads recent XpEvents, recomputes the Streaks row from distinct active days (sole writer), and awards `streakBonus7/30` XpEvents idempotently via the engine. Time-budget deadline like standings-nightly.

**Idempotency / DeliveryLog decision (critic fix).** The digest cron is STATELESS like the existing reminder crons: a single weekly schedule is natural per-week dedupe, and the dedupe-by-lowercased-email Set within a run handles multi-membership. Do NOT introduce a stateful `DeliveryLog` collection in the foundation; it contradicts the documented stateless exact-day convention. If cross-run idempotency is ever genuinely required (manual re-fire), `DeliveryLog` is added to the FOUNDATION as a shared collection with its own access/migration/retention, not as a per-slice afterthought. The parent/community slices are reconciled to this: no DeliveryLog.

`notificationPrefs` extends with `weeklyDigest` + `recognitionUpdates` booleans on the existing group (no parallel prefs system). `notify.ts` reads `pushDevices` so push-later is a no-rewrite addition.

### 4.6 Phased build order, effort, dependencies

| Phase | Items | Effort | Deps |
| --- | --- | --- | --- |
| **F0 - Consolidate** (no new behavior) | Add shared `AUDIENCE` const + `lib/audience.ts` `primaryAudience`; add `lib/displayName.ts` `privacySafeName` (force first-name + last-initial when isMinor); promote `ownerOrSuperAdmin` + add the coach-scope (collection/route) helper in `access/index.ts`; write `lib/gamification/progress.ts` `getUnifiedProgress` and refactor `compliance.ts`/`coach/pathway/page.tsx`/`ref/page.tsx` to call it (single source of truth). | ~3-4 days | none |
| **F0.5 - Minor consent model design** (critic fix) | Design (docs) the athlete-minor individual-data consent: new `Users.consents` flags (`progressSharing`, `recognitionSurfacing`, `appearOnLeaderboard`), `ConsentRecords` kinds, guardian-mediated capture flow, default-deny posture. | ~2-3 days | F0 |
| **F1 - Persisted core** | Author Badges, BadgeAwards, XpEvents, Streaks (default-deny, field-locks, system-only-write, composite unique indexes); register in `payload.config.ts` (correct admin groups); migrate (real CREATE UNIQUE INDEX); build `lib/gamification/engine.ts` (idempotent `awardXp` + `evaluateBadges` + `writeAudit`, `req`-threaded); seed Badges from `COACH_BADGES`/`REF_BADGES` + new athlete set; wire `progress.ts` to read XpEvents+BadgeAwards+Streaks on top of cert-derived XP. | ~1.5-2 weeks | F0 |
| **F2 - Recognition engine** | Author Recognitions (pending-by-default hard gate, admin-SPA moderation, `subjectIsMinor`, `recognitionSurfacing` consent, sanitized message, report/flag primitive); `engine.recordRecognitionApproved` writes verified XpEvent+BadgeAward on approval; surface approved recognitions on owner profile/account only first. | ~1-1.5 weeks | F1, F0.5 |
| **F3 - Notifications/digest** | Extend `Users.notificationPrefs` (`weeklyDigest`, `recognitionUpdates`); extend `emailEvents.ts`; add `lib/notify.ts`; add `/api/cron/weekly-digest` (per-account) + `/api/cron/streak-rollup` + `vercel.json` entries; per-account roll-up, PII-free, deduped by email, prefs honored. | ~1-1.5 weeks | F1, F2 |
| **F4 - Per-role home dispatcher** | `roles -> primaryAudience` driven `/home` (or post-login redirect) rendering an audience-specific "what do I do next" panel using `getUnifiedProgress`; reuse the `ref/account` server-page template; privacy-safe player-card stub (league-only, `privacySafeName`, photoOptIn-gated, PlayerStats stays disabled until its consent model lands). | ~1-1.5 weeks | F0, F1 |

Total ~6-8 weeks for the foundation.

### 4.7 Risks (foundation)

- **SES is unprovisioned** (sandbox, no verified domain, RAMP DNS dependency). Digest/recognition emails LOG via jsonTransport but do not deliver until the operator closes SES + DKIM/SPF/DMARC + production-access. Ship behind the existing transport switch; F3 acceptance criteria explicitly allow log-only delivery so it is not mistaken for a code defect.
- **Append-only + idempotency must be enforced in MIGRATIONS**, not field-level `unique:true`. `(user,dedupeKey)` and `(user,badge)` must emit real `CREATE UNIQUE INDEX`; a missed index lets the login/streak cron double-credit XP.
- **Transaction threading.** Engine writes fired from a hook MUST thread `req` (the games/service.ts lesson). Make `req` a non-optional signature requirement.
- **Minor-data leak surface expands.** BadgeAwards/XpEvents/Recognitions/Streaks/player-card all touch minor data and must be added to the PIA data inventory + THREAT_MODEL with automated per-category retention/purge before holding production minor data. Make this an acceptance gate, not a follow-up.
- **Recognition is a new minor-facing social surface**: positive-only + moderated + no open minor-to-minor visibility. A missed pending-default or a non-locked `moderationStatus` would breach the safety rule; force-pending in `beforeChange` and the field lock are mandatory.
- **Scope creep.** ChallengeSubmissions/Challenges/Drills are roadmap Now-tier but are audience features, not foundation. Keep them out of this slice; the engine accepts pluggable sources so they bolt on later without touching the core.

### 4.8 Open questions (foundation)

1. Coach verification scope: verified-team-scoped (recommended; resolved in 4.3 in favor of `getVerifiedTeamIds` checks in route/collection access, never field access).
2. Athlete XP source of truth: extend Pathways with `audience='athlete'` + a non-cert requirement type, or a parallel SkillPathways. Decide the requirement-type abstraction now even though source collections are Next tier.
3. One level bar or two: proposal is one displayed level bar from total XP, but `verificationRequired` badges count only verified XP. Confirm.
4. Parent audience in gamification: recognition + digest but no XP grind (roadmap implies this). Confirm.
5. Player-card minor visibility default: recommend team-only + photoOptIn + privacySafeName + `appearOnLeaderboard`/`progressSharing` consent. Confirm before F4.
6. Retention windows for XpEvents/Recognitions tied to minors: need the per-category PIA schedule before production minor data.
7. Streak cadence: keep `streakBonus7/30`; confirm whether to apply `dailyLogin` XP (currently never applied) as `fun_only`.

---

## 5. Per-audience features (plan altitude)

These tables map each roadmap feature to implementation. The foundation (Section 4) is assumed built; "FOUNDATION" in Depends-on means the relevant foundation phase. Effort: S/M/L.

### 5.1 Athletes (including Games / interactive)

| Feature | Tier | New / Existing collections | Reuses | Routes | Access & minor-safety | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Athlete personalized home | Now | none | [auth.ts](src/lib/auth.ts), [ref/page.tsx](src/app/(frontend)/ref/page.tsx) template, [account/page.tsx](src/app/(frontend)/account/page.tsx), [PersonalizedStrip.tsx](src/components/PersonalizedStrip.tsx), `getVerifiedTeamIds`, `getLevelForXP` | `src/app/(frontend)/athlete/home/page.tsx` | force-dynamic; signed-out CTA; public route; personalize only when signed in; read `isMinor`, use `privacySafeName`; scope queries to user.id via overrideAccess | M | FOUNDATION F0/F1, `primaryAudience` |
| Visual skill map (Tykes->U18 + progress) | Now | SkillPathways (or extend Pathways audience) + AthleteSkillProgress | [Pathways.ts](src/collections/Pathways.ts) stage model, athlete/page.tsx pathway[] as seed, [cmbaLinks.ts](src/lib/cmbaLinks.ts), [Certifications.ts](src/collections/Certifications.ts) owner pattern, [age.ts](src/lib/age.ts) | `src/app/(frontend)/athlete/skills/page.tsx` | SkillPathways: public read / superAdminOnly write. AthleteSkillProgress: owner(guardian)+super-admin Where; create forces user=req.user.id; completion/verify `superAdminFieldOnly`; behind athlete consent model + `enabled` flag | L | FOUNDATION F1, F0.5 consent model, Drill library |
| Drill library with progress | Now | Drills (CMS) + DrillProgress | [Courses.ts](src/collections/Courses.ts) template, [cmbaLinks.ts](src/lib/cmbaLinks.ts) seed, Certifications owner pattern, AGE_GROUPS | `athlete/drills/page.tsx`, `athlete/drills/[slug]/page.tsx` | Drills: public read / superAdminOnly write. DrillProgress: owner+guardian Where; create forces user; no self-verify of XP-bearing completion; minor data behind consent model; any clip = private bucket + EXIF strip, never Media | M | FOUNDATION F1, F0.5, skill map |
| Skill challenges (log result/clip, XP+badges, optional coach verify) | Now | Challenges (CMS) + ChallengeSubmissions | Courses template, Certifications + TeamMemberships verified pattern, private-bucket EXIF strip, `writeAudit`, [api idempotency](src/lib/api) | `athlete/challenges/page.tsx`, `[slug]/page.tsx` | Challenges: publishedOrAdmin read / superAdminOnly write. ChallengeSubmissions: owner create lands `verified=false` forced; owner+guardian+verified-coach+admin read; verify via the coach-verify `/api/v1` route (not field lock); clip uploads private + EXIF, owner-forced, 8MB cap; minor consent for shareable clip | L | FOUNDATION F1 engine, F0.5, coach-verify route, recognition |
| Skills combine (benchmarks / personal bests) | Now | CombineResults (or extend PlayerStats) | [PlayerStats.ts](src/collections/PlayerStats.ts) precedent (admin+owner read, `enabled=false`, enteredBy locked), Certifications pattern, teamAccess | `athlete/combine/page.tsx` | Strict minor data. Admin+owner(guardian) read only, `enabled=false` until consent model; enteredBy/verified `superAdminFieldOnly`; never public; no cross-athlete minor leaderboard except via privacy-safe handle + `appearOnLeaderboard` | M | F0.5 consent model (hard), FOUNDATION F1, privacySafeName |
| Player card (league-only, privacy-safe name) | Next | none new (consumes TeamMemberships + AthleteSkillProgress + BadgeAwards + CombineResults) | [TeamMemberships.ts](src/collections/TeamMemberships.ts), [Users.ts](src/collections/Users.ts) preferredName/photoOptIn/isMinor, `privacySafeName`, `getVerifiedTeamIds`, private-bucket photos | `athlete/card/[membershipId]/page.tsx` | League-only signed-in, scoped to requester's verified teams; minor name = first-name + last-initial via `privacySafeName` (forced); photo only if photoOptIn + private bucket; stats only if combine consent + enabled; force-dynamic | M | privacySafeName, F0.5, photoOptIn, FOUNDATION badge/XP |
| Game-day view | Now | none | [Games.ts](src/collections/Games.ts)/Venues/Courts, `getVerifiedGameIds`, [ics/feed.ts](src/lib/ics/feed.ts) | `athlete/gameday/page.tsx` | Signed-in athlete; scope to verified team upcoming games; no PII beyond times/venues/team-vs-team (ICS convention); force-dynamic | S | Stage B (live), athlete home |
| Basketball IQ quizzes | Next | Quizzes/QuizQuestions (or CMS block) + QuizAttempts | [rulesQA.ts](src/lib/rulesQA.ts) (answer keys), [rulesData.ts](src/lib/rulesData.ts) explain, Courses template, [blocks/config.ts](src/blocks/config.ts) + RenderBlocks (`quizEmbed`), Certifications pattern | `athlete/quizzes/page.tsx`, `[slug]/page.tsx` | Quizzes: publishedOrAdmin read / superAdminOnly write. QuizAttempts: owner read/create (forced user.id); XP-bearing score system-derived not client-trusted; no public minor score; leaderboard via privacy-safe handle | M | FOUNDATION F1, content authoring (prompts + distractors net-new) |
| Referee-signals trainer (matching) | Next | Signals (or `signalsData.ts`) + SignalsAttempts | extract `signalCategories` from [ref/signals/page.tsx](src/app/(frontend)/ref/signals/page.tsx) into `src/lib/signalsData.ts` (deduped across 3 files), Courses template, blocks | `athlete/signals/page.tsx` (shared with ref hub) | Signal reference: public read / superAdminOnly write. SignalsAttempts: owner-scoped. Real signal art (public Media fine; signals are generic) | M | FOUNDATION F1, extract signalsData.ts |
| Recognition for athletes | Now | Recognitions + Badges + BadgeAwards (foundation) | ConsentRecords/AuditLog templates, Confirmations moderation, TeamMemberships verified, `writeAudit`, Announcements, `privacySafeName` | surfaced on athlete home + player card; moderation in admin SPA | Created by coach/admin (not self, not minor-to-minor); `moderationStatus` gates surfacing; positive-only + report/flag; BadgeAwards system-written via overrideAccess; minor uses privacy-safe name + photoOptIn; audit every award | L | FOUNDATION F2 (this IS the athlete face), privacySafeName, F3 digest |
| Mindset / wellbeing micro-modules | Later | MicroModules (or Courses) + ModuleProgress | Courses template, Certifications owner pattern, FOUNDATION XP | `athlete/mindset/page.tsx`, `[slug]/page.tsx` | Modules: publishedOrAdmin read / superAdminOnly write. ModuleProgress owner-scoped; no health PII surfaced; completion private to athlete/guardian | M | FOUNDATION F1, content authoring (net-new; not in this repo) |
| Predict-the-week (no-stakes) | Next | Predictions | [Games.ts](src/collections/Games.ts), [StandingsCache.ts](src/collections/StandingsCache.ts), Certifications pattern, api idempotency, `privacySafeName` | `games/predict/page.tsx` | Owner create (forced user.id), owner read own; aggregate leaderboard via privacy-safe handle for minors; NO money/wager fields ever; scored server-side; locks at tip-off | M | Stage B, FOUNDATION F1, privacySafeName, no-gambling design |
| Drill-of-the-day + trivia + streaks + bingo (Games hub) | Now | reuses Drills + Quizzes + Streaks/XpEvents; optional Bingo CMS | Drills/Quizzes, FOUNDATION streak system, [reminders.ts](src/lib/reminders.ts) pattern, cron + vercel.json, blocks | `games/page.tsx` | Content public/published; per-user streak + bingo progress owner-scoped; minor uses privacy-safe handles; positive-only | M | FOUNDATION streak engine (vestigial today, must be built), Drills, Quizzes |

### 5.2 Parents / Guardians

| Feature | Tier | New / Existing collections | Reuses | Routes | Access & minor-safety | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Guardian->Children family linkage (hard prerequisite) | Now | GuardianLinks | [Users.ts](src/collections/Users.ts) guardian group, [hooks/users.ts](src/collections/hooks/users.ts) guardianFlow/token, TeamMemberships self-claim->verify, ConsentRecords, `writeAudit`, [age.ts](src/lib/age.ts) | `account/family` | `Users.guardian` is a FLAT group on the minor's record with NO queryable guardian->children relation; this gates the whole parent slice. GuardianLinks: read `{guardian:{equals:user.id}}` OR superAdmin; create lands `verified=false`; verified only via guardian-email token or admin; child records owner+superAdmin only; audit every link/unlink | M | none gamification; PIA data-inventory update |
| One family calendar | Now | none new (derives via GuardianLinks->TeamMemberships->Games) | [ics/feed.ts](src/lib/ics/feed.ts) (HMAC tokens, PII-free), [ics route](src/app/(frontend)/api/v1/ics/[scope]/[token]/route.ts), `getVerifiedTeamIds`, Games/Venues/Courts | `account/family/calendar`, add `family` scope to the ICS `[scope]` route | Aggregate Games for the union of the guardian's verified children's teams; reuse `FEATURE_TEAM_ICS` youth-privacy gating for a `family` scope; HMAC(family:guardianId) token, rate-limited, PII-free; directions = venue address only | M | GuardianLinks, `notify()` |
| Cancellation + weather alerts | Now | none new (stateless cron) | [score-reminders](src/app/(frontend)/api/cron/score-reminders/route.ts)/cert-reminders skeleton, [cron.ts](src/lib/cron.ts), [emailEvents.ts](src/lib/emailEvents.ts) (`emailScheduleChange` exists), Games status, notificationPrefs/pushDevices, vercel.json | `api/cron/family-alerts/route.ts` (or extend score-reminders) | Single-recipient, dedupe by email; honor prefs for weather/info, treat hard cancellations as transactional; no PII in payload; weather = no-PII external read (residency OK); fan-out to guardians via GuardianLinks, never minors | M | GuardianLinks, `notify()`, OPERATOR: SES |
| Volunteer signups | Now | VolunteerSlots | [Availability.ts](src/collections/Availability.ts) shape, TeamMemberships + `getVerifiedTeamIds`, Confirmations moderated write, [api idempotency](src/lib/api), `writeAudit` | `account/family/volunteer` | Slots readable by signed-in team members (`{team:{in:ids}}`); claim is authenticated + Idempotency-Key; `beforeChange` forces claimedBy=req.user.id, server-derives game/team; capacity enforced server-side; volunteer shown first-name + last-initial | M | GuardianLinks, optional recognition (volunteer-of-month) |
| Carpool + team directory (opt-in) | Next | DirectoryOptIn | [Users.ts](src/collections/Users.ts) consents (add directory/carpool flags), `logConsentRecord`, `getVerifiedTeamIds`, `privacySafeName` | `account/family/directory` | Strict opt-in (default false) + ConsentRecords mirror; visible only to verified same-team members; never a minor's full name/contact; adult-to-adult contact reveal; ca-central-1 | M | GuardianLinks, privacySafeName (hard sub-dep), team pages share plumbing |
| Recognition: volunteer/parent of the month | Now | Recognitions (foundation) | Confirmations + AuditLog, Announcements substrate, [targeted route](src/app/(frontend)/api/v1/announcements/targeted/route.ts), `writeAudit` | `account/family`; moderation in admin SPA | Moderated, never self-awarded; `moderationStatus=approved` before surfacing; positive-only + report/flag; adult targets so full name OK, any child mention uses privacy-safe name; audit every award | M | FOUNDATION F2 recognition, F3 family digest |
| Weekly family digest email | Now | none new (stateless cron; NO DeliveryLog per 4.5) | [emailEvents.ts](src/lib/emailEvents.ts) (`emailWeeklyDigest`), cert-reminders skeleton, [reminders.ts](src/lib/reminders.ts), Announcements, Games (per child via GuardianLinks), Recognitions, notificationPrefs, vercel.json | `api/cron/weekly-digest` (family variant gated on GuardianLinks) | One email per guardian (single-recipient, dedupe by email); PII-free (counts + portal deep link); `weeklyDigest` opt-in honored; aggregates per-guardian across linked children | L | GuardianLinks (hard), FOUNDATION F3, recognition, OPERATOR: SES |
| Understand-the-game guide (CMS) | Now | existing Pages (or a `guide` block) | [Pages.ts](src/collections/Pages.ts), [blocks/config.ts](src/blocks/config.ts) + RenderBlocks, parent/page.tsx steps as seed, rulesData/rulesQA | `parent` (extend) or `/<slug>` CMS page | Public/published, staff-authored (principle 4); no PII, no minor data | S | content engine (exists) |
| Spectator-course completion | Now | existing Courses + CertificationTypes + Certifications | [Courses.ts](src/collections/Courses.ts), [Certifications.ts](src/collections/Certifications.ts), [CertificationTypes.ts](src/collections/CertificationTypes.ts), [coach/courses/page.tsx](src/app/(frontend)/coach/courses/page.tsx) pattern, [compliance.ts](src/lib/compliance.ts), reach360CourseData | `account/family` | Owner(guardian)-scoped + superAdmin; existing verified-progress model; add a parent/spectator CertificationType + Course entry; no schema change beyond seed | S | content engine (live); optional recognition badge |

### 5.3 Coaches

| Feature | Tier | New / Existing collections | Reuses | Routes | Access & minor-safety | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Coach role-based home | Now | none | [ref/page.tsx](src/app/(frontend)/ref/page.tsx) template, [account/page.tsx](src/app/(frontend)/account/page.tsx), [auth.ts](src/lib/auth.ts), `getVerifiedTeamIds`, [compliance.ts](src/lib/compliance.ts), PersonalizedStrip, [mfa/enforce.ts](src/lib/mfa/enforce.ts) | `coach/home/page.tsx` (or convert /coach) | Signed-in coach; force-dynamic; scope team data via `getVerifiedTeamIds`; public /coach hub stays separate; no minor data beyond counts | M | `primaryAudience`, FOUNDATION unified XP read |
| Drill library with stage tagging | Now | Drills | [Courses.ts](src/collections/Courses.ts), [cmbaLinks.ts](src/lib/cmbaLinks.ts) seed, [coach/courses/page.tsx](src/app/(frontend)/coach/courses/page.tsx), AGE_GROUPS, embed block | `coach/drills/page.tsx`, `[slug]/page.tsx` | publishedOrAdmin read / superAdminOnly write; no minor data; shared content with athlete library | M | stage taxonomy (shared with athlete) |
| Ready-made practice plans + builder | Next | PracticePlans + Drills | Courses template, [Pages.ts](src/collections/Pages.ts) blocks, Pathways stages shape, [mdToLexical.ts](src/lib/mdToLexical.ts), `getVerifiedTeamIds` | `coach/practice-plans/page.tsx`, `[slug]`, `builder/page.tsx` | Staff plans: publishedOrAdmin / superAdminOnly. Coach plans: owner-scoped (Certifications idiom, beforeChange forces createdBy=req.user.id); no minor data | L | Drills |
| Attendance tracker | Now | Attendance (or extend Availability) | [Availability.ts](src/collections/Availability.ts) scaffold + named scoping, TeamMemberships, `getVerifiedTeamIds`, Games | `coach/attendance/page.tsx` | Minor data. Read/write scoped to verified coach of that team + super-admin; never public; default-deny; build the membership-aware Where before enabling | M | per-membership+verified-coach scoping, privacySafeName |
| Equal-playing-time tracker | Now | PlayerStats (scaffold) or MinutesLog | [PlayerStats.ts](src/collections/PlayerStats.ts) (`enabled=false`, minutes field, enteredBy locked), TeamMemberships, `getVerifiedTeamIds`, Games | `coach/playing-time/page.tsx` | Highest-sensitivity minor data. `enabled=false` until consent model; coach-only (verified coach + super-admin); never public/family leaderboard | M | minor consent model (F0.5), per-membership scoping |
| Roster view | Now | none | [TeamMemberships.ts](src/collections/TeamMemberships.ts), `getVerifiedTeamIds`, [rep/page.tsx](src/app/(frontend)/rep/page.tsx) + repDashboard pattern, Users preferredName/photoOptIn | `coach/roster/page.tsx` | Minor data. Verified coach + super-admin; scope `{team:{in:ids}}`; `privacySafeName`; photos gated on photoOptIn; no contact beyond consent | M | privacySafeName, per-membership scoping |
| Player availability (coach-facing) | Now | Availability (scaffold) | [Availability.ts](src/collections/Availability.ts) (model + unique index already migrated), TeamMemberships, `getVerifiedTeamIds`, Games | `coach/availability/page.tsx` | Minor data. Coach reads own verified team only; member/guardian writes own; activate read only behind named scoping | S | per-membership+verified-coach+guardian scoping |
| Team communication (moderated broadcast) | Next | Announcements (extend) or TeamMessages | [Announcements.ts](src/collections/Announcements.ts), [targeted route](src/app/(frontend)/api/v1/announcements/targeted/route.ts), [emailEvents.ts](src/lib/emailEvents.ts), `getVerifiedTeamIds`, `writeAudit` | `coach/messages/page.tsx` | Safety-critical. No open messaging between minors, no coach<->minor DMs; coach broadcasts via verified memberships, one no-PII email per recipient; moderated/auditable | M | SES, `notify()` |
| Coach certification pathway (already built; extend) | Now | Pathways/Certifications/CertificationTypes (existing) + Badges + BadgeAwards | [coach/pathway/page.tsx](src/app/(frontend)/coach/pathway/page.tsx), [CoachPathwayView.tsx](src/components/coach/CoachPathwayView.tsx), [compliance.ts](src/lib/compliance.ts), `getLevelForXP` | `coach/pathway/page.tsx` (existing) | Certifications ownerOrSuperAdmin; verify stamps superAdminFieldOnly (already enforced); no minor data | S | FOUNDATION persisted Badges/BadgeAwards |
| Coach micro-learning + clinics calendar | Next | Courses (existing) + Clinics (new) | [Courses.ts](src/collections/Courses.ts), [coach/courses/page.tsx](src/app/(frontend)/coach/courses/page.tsx), [coach/managing-the-moment/page.tsx](src/app/(frontend)/coach/managing-the-moment/page.tsx), reach360CourseData, Announcements/Pages blocks | `coach/clinics/page.tsx` (upgrade), `coach/learning/page.tsx` | publishedOrAdmin read / superAdminOnly write; clinics = dated-notice shape or small Clinics collection; no minor data | M | Courses live; clinics calendar net-new |
| Community of practice (moderated forum) | Next | CommunityPosts + CommunityReplies | [Confirmations.ts](src/collections/Confirmations.ts) moderation, AuditLog, `writeAudit`, `hasRole('coach')` | `coach/community/page.tsx`, `[id]/page.tsx` | Coaches/officials/admins only (adults); positive-only + report/flag + moderation status; admin moderation in admin SPA; audit every action | L | report/flag primitive (shared with recognition), `notify()` |
| Digital scoresheet | Next | ScoreReports/PlayerStats/ScoresheetFiles (existing) | [ScoreReports.ts](src/collections/ScoreReports.ts) (beforeChange hard gate), Confirmations, [games/reporting.ts](src/lib/games/reporting.ts), ScoresheetFiles private bucket, `getVerifiedGameIds`, Idempotency-Key | `coach/scoresheet/[gameId]/page.tsx`, rep console | Verified rep/coach of a team in the game; the ScoreReports beforeChange hook is the trust boundary (re-derive from the game); per-player stats behind minor-stat consent gate; idempotent writes | L | ScoreReports/Confirmations live, minor-stat consent if per-player, SES |
| Post-game report feeding scoring | Next | GameReports/ScoreReports/GameIncidents (existing) | [GameReports.ts](src/collections/GameReports.ts), [ScoreReports.ts](src/collections/ScoreReports.ts) + reporting.ts, [GameIncidents.ts](src/collections/GameIncidents.ts), [IncidentFiles.ts](src/collections/IncidentFiles.ts), emailEvents | `coach/post-game/[gameId]/page.tsx` | Verified rep/coach; GameReports beforeChange re-derives authority; incident content private bucket + EXIF; no-PII emails; audit | M | ScoreReports/GameReports live |
| Coach recognition (badges / coach of month / PD credit) | Now | Badges + BadgeAwards + Recognitions (foundation) | Certifications verified template, TeamMemberships admin-verify, ConsentRecords/AuditLog, `writeAudit`, gamification COACH_BADGES seed, emailEvents + cron | `coach/recognition/page.tsx`; surfaced on home/account | Verified-not-self-awarded; BadgeAwards/Recognitions written only via overrideAccess from an authorized branch; coaches cannot self-award; moderated; coach-of-month in family digest stays no-PII; audit | L | FOUNDATION (coach face of foundation), report/flag, SES |

### 5.4 Officials / Referees

Officials are adults, so minor-safety masking mostly does not apply; the controlling constraints are default-deny owner-scoping, residency, no-PII-in-email, and audit.

| Feature | Tier | New / Existing collections | Reuses | Routes | Access & minor-safety | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Assignment dashboard + accept/decline + availability | Now | OfficialAvailability (new) + GameOfficials (extend status self-update) | [GameOfficials.ts](src/collections/GameOfficials.ts) (officialUserId own-read-scope, emailAssignment + writeAudit), [Officials.ts](src/collections/Officials.ts), [/me/assignments route](src/app/(frontend)/api/v1/me/assignments/route.ts), [emailEvents.ts](src/lib/emailEvents.ts) emailAssignment, [ics/feed.ts](src/lib/ics/feed.ts), ref/page.tsx + RefHubView, `writeAudit`, [mfa/enforce.ts](src/lib/mfa/enforce.ts) | `ref/assignments/page.tsx`, `ref/availability/page.tsx` | Officials read own assignments (existing scope). Accept/decline = **collection-level update access** returning `Where {officialUserId:{equals:user.id}}` + a `beforeChange` that forbids changing anything but `status` (NOT a relaxed field lock, critic fix); assignedBy/assignedAt stay locked; OfficialAvailability owner read/write, admin read; audit every status change | M | FOUNDATION notify/digest, add `/ref` to PROTECTED_PREFIXES if gated, migration |
| Signals trainer + rules quizzes + points-of-emphasis feed | Next | Quizzes + QuizQuestions (or CMS block) + Signals (or signalsData.ts) + QuizAttempts; Announcements reused as the emphasis feed | [rulesData.ts](src/lib/rulesData.ts)/[rulesQA.ts](src/lib/rulesQA.ts) seed, `signalCategories` extracted to `src/lib/signalsData.ts`, Courses/Pages + blocks (`quizEmbed`), [Announcements.ts](src/collections/Announcements.ts), gamification REF_BADGES, Certifications pattern | `ref/quiz/page.tsx`, `ref/signals/trainer/page.tsx`, `ref/emphasis/page.tsx` | Content: publishedOrAdmin read / superAdminOnly write. QuizAttempts owner-scoped (forced user.id). Emphasis = Announcements with officials audience tag; adults, no minor gate; no PII in any feed email | L | content engine (quiz block + extract signalsData), FOUNDATION XP, distractor authoring |
| Mentorship / evaluation workflow | Later | OfficialEvaluations + MentorPairings | Confirmations moderated/server-derived, Certifications verify stamp, Officials/GameOfficials link, AuditLog + `writeAudit`, CertificateFiles private bucket (attachments), emailEvents | `ref/evaluations/page.tsx`; evaluator authoring in admin SPA | Official reads own only; evaluator/admin create + read authored; sign-off `superAdminFieldOnly` (or evaluator helper); adults so performance not minor data; default-deny, owner-scoped, audited | L | recognition engine, evaluator-role helper, migration; decision: no `evaluator` role in the union |
| Milestone recognition (officials) | Now | Recognitions + BadgeAwards + Badges + XpEvents (foundation) | gamification REF_BADGES + `getLevelForXP` verbatim, ConsentRecords/AuditLog overrideAccess template, TeamMemberships verified-stamp, `writeAudit`, ref/page.tsx + RefHubView, GameOfficials count as a milestone source | surfaced on ref hub + official profile; award UI in admin SPA | BadgeAwards/Recognitions read owner+admin (public-when-approved for non-minor officials per profile-visibility decision); create/update/delete `()=>false`, written only via overrideAccess; awardedBy/verified field-locked; moderated, coach/admin-granted not self-awarded; audit every grant | M | FOUNDATION (official face of foundation), consolidate 3 duplicated computations first |
| Wage + game tracking | Now | OfficialGameLog / GameWages + WageRates (or SiteSettings config) | [GameOfficials.ts](src/collections/GameOfficials.ts) (status=accepted = worked, source of truth), Officials rampLevel, Games, [/me/assignments route](src/app/(frontend)/api/v1/me/assignments/route.ts), Certifications owner idiom, [SiteSettings.ts](src/globals/SiteSettings.ts), `writeAudit` | `ref/earnings/page.tsx`; admin reconciliation in admin SPA | Official reads own wage/game log only; wage amounts + paid status admin-write only (field-locked, officials never self-set pay); default-deny; adults (financial not minor data); residency in ca-central-1; NO payment processing (tracking/report only, payments out of scope per FEATURE_GAP); audit wage status changes | M | assignment dashboard, decision: derive vs persist wage rows, migration |

### 5.5 Clubs / Teams / League / Community + Surveys

| Feature | Tier | New / Existing collections | Reuses | Routes | Access & minor-safety | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Team pages (roster/schedule/standings/stats) | Next | none new (reuses Teams/TeamMemberships/Games/StandingsCache/Divisions/Seasons/PlayerStats) | [Teams.ts](src/collections/Teams.ts), [StandingsCache.ts](src/collections/StandingsCache.ts), [Games.ts](src/collections/Games.ts), [TeamMemberships.ts](src/collections/TeamMemberships.ts), `getVerifiedTeamIds`, [PlayerStats.ts](src/collections/PlayerStats.ts), ref/page.tsx template | `teams/[teamId]/page.tsx`, `teams/page.tsx` | Schedule + standings already public; roster uses `privacySafeName` for any minor (never full name); per-player stats hidden until PlayerStats.enabled flips behind the minor consent model; league-only for per-player view | M | privacySafeName, minor consent model |
| Team consent-based moderated photo gallery | Next | TeamGalleryPhotos (private bucket + EXIF) | [IncidentFiles.ts](src/collections/IncidentFiles.ts) precedent, [exif.ts](src/lib/uploads/exif.ts), Users.consents.photoOptIn, TeamMemberships, `getVerifiedTeamIds`, `writeAudit`, ConsentRecords | `teams/[teamId]/gallery/page.tsx` | Default-deny; upload by verified reps/coaches only; `moderationStatus` (nothing surfaces until approved, positive-only + report/flag); displayable only if EVERY tagged minor has `photoOptIn=true` re-checked at render; EXIF stripped; league-only; never Media | L | recognition/moderation engine (report/flag), privacySafeName |
| League home (game of week, news/blog, storylines) | Now | none new (Pages + Announcements + Games; add blocks) | [Pages.ts](src/collections/Pages.ts), [blocks/config.ts](src/blocks/config.ts) + RenderBlocks (`gameOfTheWeek`/`newsCard`/`storyline`), [Announcements.ts](src/collections/Announcements.ts) + AnnouncementsStrip, Games | `page.tsx` (extend), `news/[slug]/page.tsx`, `news/page.tsx` | Public-when-published / superAdminOnly write; game-of-week references a public Game; no minor full names in editorial unless guardian-consented, lean on team handles | M | none (CMS extension) |
| League-wide skill-challenge leaderboards | Next | none new (reads BadgeAwards/ChallengeSubmissions/XpEvents) | FOUNDATION gamification, `privacySafeName`, Users.isMinor, `getLevelForXP`, Divisions/Teams scoping | `leaderboards/page.tsx`, `[challengeId]/page.tsx` | League-only signed-in; minors as first-name + last-initial or team handle only (hard rule) AND only with `appearOnLeaderboard` consent; only VERIFIED results rank; top-N friendly, no full ranking for kids | M | FOUNDATION gamification (verified flag), privacySafeName, `appearOnLeaderboard` consent |
| Spirit / sportsmanship awards | Next | Recognitions (foundation; `kind=sportsmanship`) | Recognitions, BadgeAwards, AuditLog + `writeAudit`, TeamMemberships nominator gate, ConsentRecords, privacySafeName | `recognition/page.tsx` (filter); on team pages + profiles | Default-deny; nominations by verified coaches/admins only, moderated before surfacing; positive-only; minor recipients via privacy-safe name; in digest + profile; audit | S | FOUNDATION recognition, privacySafeName, F3 digest |
| End-of-season awards | Later | Recognitions (`kind=season-award`) + SeasonAwards CMS page/block | Recognitions, [Seasons.ts](src/collections/Seasons.ts), Pages blocks, StandingsCache (champions), privacySafeName, `writeAudit` | `awards/[seasonId]/page.tsx` | Admin-curated (superAdminOnly write), public-when-published showcase; minor winners via privacy-safe names + photoOptIn-gated photos; champions from public StandingsCache | M | FOUNDATION recognition, consent photo gallery, privacySafeName |
| Alumni / where-are-they-now | Later | AlumniProfiles OR Pages blocks (recommend Pages) | [Pages.ts](src/collections/Pages.ts) + blocks, Media (adult photos with consent), publishedOrAdmin | `alumni/page.tsx` | Adult alumni only by default; each profile requires explicit publish consent; publishedOrAdmin / superAdminOnly; if former minors, only with current adult consent | S | none beyond CMS; consent capture is operational |
| Sponsor showcase | Later | Sponsors (simple CMS) OR Pages block | [Pages.ts](src/collections/Pages.ts) + blocks (`sponsorGrid`), Media (public logos), Courses shape as template, publishedOrAdmin | `sponsors/page.tsx`; strip block on home/team | Public-when-published / superAdminOnly; CRITICAL: no third-party ad networks, no behavioural profiling, no trackers; logos are static CMS assets only | S | none (CMS only) |
| Board / admin dashboards (participation/compliance/engagement) | Next | none new (aggregates existing + foundation) | [compliance.ts](src/lib/compliance.ts), [auth.ts](src/lib/auth.ts) + [mfa/enforce.ts](src/lib/mfa/enforce.ts), `isAnyAdmin`/`isClubAdmin`, admin SPA, StandingsCache/GameOfficials/Availability, AuditLog | `manage/dashboard/page.tsx` (extend /manage) or admin custom view | Admin-gated two-layer (middleware PROTECTED_PREFIXES `/manage` + in-page `isAnyAdmin` + enforceMfa); club admins see only their club (`clubIdOf` Where); derived/aggregate counts only, never raw minor records; no PII export without audit | L | compliance.ts (built), foundation collections for engagement, MFA (built) |
| Surveys + satisfaction score (NPS/CSAT) | Next | Surveys + SurveyResponses | [Courses.ts](src/collections/Courses.ts) template (Surveys), [Certifications.ts](src/collections/Certifications.ts) idiom (SurveyResponses), ConsentRecords immutability, [api idempotency](src/lib/api), `writeAudit`, notify | `surveys/[surveyId]/page.tsx`, `manage/surveys/page.tsx` (aggregate) | Surveys: publishedOrAdmin / superAdminOnly. SurveyResponses: default-deny owner-scoped read; create forces user=req.user.id; admins read AGGREGATE only, never identifiable minor responses; guardian-mediated for minors; no free-text PII surfaced; Idempotency-Key; retention in PIA | M | minor-data consent posture, FOUNDATION notify/digest |
| Predict-the-week (no-stakes, no money) | Next | Predictions | [Games.ts](src/collections/Games.ts), Certifications owner idiom, [api idempotency](src/lib/api), FOUNDATION XP, privacySafeName, StandingsCache, cron pattern | `predict/page.tsx`, `predict/leaderboard/page.tsx`, `api/cron/resolve-predictions/route.ts` | Default-deny owner-scoped; create forces user=req.user.id; predictions LOCK at tip-off (beforeChange rejects late edits, derived from Game start); resolution via cron reading final Games/StandingsCache awarding friendly XP; NO money/gambling/stakes; friendly leaderboard via privacy-safe names | M | FOUNDATION XP, privacySafeName, cron + vercel.json |

---

## 6. New Payload collections (master list)

| Collection (slug) | Admin group | Purpose | Used by |
| --- | --- | --- | --- |
| Badges (`badges`) | Training catalog | Declarative badge catalog with earn criteria | Foundation; all recognition/badge features across audiences |
| BadgeAwards (`badge-awards`) | People | Immutable verified-stamped award ledger | Foundation; athlete/coach/official recognition, leaderboards, player card |
| XpEvents (`xp-events`) | People | Append-only XP/points ledger, single source of truth | Foundation; all gamified features, streaks, digest |
| Streaks (`streaks`) | People | Materialized streak counter (view of XpEvents) | Foundation; Games hub, drill-of-the-day, digest |
| Recognitions (`recognitions`) | People | Moderated recognition (shout-outs/awards/milestones) | Foundation; all four audiences' recognition |
| GuardianLinks (`guardian-links`) | People | Queryable guardian->children relation | Parent slice: family calendar, alerts, volunteer, family digest |
| SkillPathways (`skill-pathways`) (or extend Pathways) | Training catalog | Athlete Tykes->U18 skill stages | Athlete skill map |
| AthleteSkillProgress (`athlete-skill-progress`) | People | Per-athlete stage progress (consent-gated) | Athlete skill map, player card |
| Drills (`drills`) | Training catalog | CMS drill content with stage tagging | Athlete drill library, coach drills, practice plans, Games hub |
| DrillProgress (`drill-progress`) | People | Per-user drill completion | Athlete drill library, Games hub |
| Challenges (`challenges`) | Training catalog | CMS skill-challenge content | Athlete challenges |
| ChallengeSubmissions (`challenge-submissions`) | People | Self-reported -> coach/admin-verified submissions | Athlete challenges, leaderboards |
| CombineResults (`combine-results`) (or extend PlayerStats) | People | Season benchmarks / personal bests (consent-gated) | Skills combine, player card |
| Quizzes / QuizQuestions (`quizzes`) | Training catalog | CMS quizzes (Basketball IQ / rules) | Athlete quizzes, official quizzes, Games hub |
| QuizAttempts (`quiz-attempts`) | People | Per-user quiz attempts (XP-bearing) | Athlete quizzes, official quizzes |
| Signals (`signals`) (or `signalsData.ts` lib) | Training catalog | Referee signal reference (extracted from 3 files) | Signals trainer (athlete + official) |
| SignalsAttempts (`signals-attempts`) | People | Per-user signals-trainer attempts | Signals trainer |
| MicroModules (`micro-modules`) (or Courses) | Training catalog | Mindset/wellbeing modules | Athlete mindset (Later) |
| ModuleProgress (`module-progress`) | People | Per-user module completion | Athlete mindset |
| Predictions (`predictions`) | Competition | No-stakes predict-the-week entries | Predict-the-week (athlete + community) |
| PracticePlans (`practice-plans`) | Training catalog | Staff + coach practice plans | Coach practice planning |
| Attendance (`attendance`) (or extend Availability) | People | Coach attendance records (minor data) | Coach attendance tracker |
| Clinics (`clinics`) (or extend Courses) | Training catalog | Clinics calendar | Coach micro-learning/clinics |
| CommunityPosts / CommunityReplies (`community-posts` / `community-replies`) | People | Moderated coach/official forum | Coach + official community of practice |
| OfficialAvailability (`official-availability`) | Competition | Official available/unavailable dates | Official assignment dashboard |
| OfficialEvaluations / MentorPairings (`official-evaluations` / `mentor-pairings`) | People | Official mentorship/evaluation | Official mentorship (Later) |
| OfficialGameLog / GameWages + WageRates (`official-game-log` / `wage-rates`) | Competition | Wage/game tracking (no payments) | Official wage tracking |
| VolunteerSlots (`volunteer-slots`) | Competition | Per-game volunteer signup slots | Parent volunteer signups |
| DirectoryOptIn (`directory-opt-in`) | People | Carpool/team directory opt-in | Parent carpool + directory |
| TeamGalleryPhotos (`team-gallery-photos`) | People | Consent-gated moderated team photos (private bucket) | Team photo gallery |
| Surveys / SurveyResponses (`surveys` / `survey-responses`) | Competition | Surveys + satisfaction score | Surveys feature, board dashboards |
| Sponsors (`sponsors`) (optional; recommend Pages blocks) | Content | Sponsor logos (static CMS, no ads) | Sponsor showcase |
| AlumniProfiles (`alumni-profiles`) (optional; recommend Pages blocks) | Content | Alumni profiles (adult-only) | Alumni showcase |

Admin-group note (critic fix): per-user ledgers and recognition rows go in `People` (or `Competition` for competition-operational data), not `Training catalog`; only CMS catalog content (Badges, Drills, Challenges, Quizzes, Courses) uses `Training catalog`. A dedicated `Engagement` group is an acceptable alternative for the per-user gamification ledgers if preferred for admin-SPA discoverability.

---

## 7. Risks, open questions, and operator dependencies

**Minor-safety (folds in critic findings).**
- `surfaceConsent` is replaced by a real guardian-set `recognitionSurfacing` consent kind in `Users.consents` + `ConsentRecords` (4.2.1). Do not ship a checkbox no flow populates. Until it lands, minor-subject recognitions are owner-only.
- The athlete-minor individual-data consent model (`progressSharing`, `recognitionSurfacing`, `appearOnLeaderboard`) is a named foundation deliverable (F0.5), not an unowned dependency. Until it lands, minor-data surfaces stay owner/guardian-only matching `PlayerStats.enabled=false`.
- `isMinor` is re-derived server-side in the engine (overrideAccess read via [age.ts](src/lib/age.ts)), never trusted from a client or a stale field.
- No leaderboard surfaces a minor (even first-name + last-initial) without `appearOnLeaderboard` consent; only VERIFIED results rank.
- `privacySafeName` server pages must pass the authoritative `isMinor` from a server fetch, not a cached prop.
- The report/flag primitive (4.2.2) is a concrete F2 deliverable shared with the coach forum, not optional.

**Convention mismatches (resolved).**
- `coachOrAdmin` is NOT a FieldAccess; verified-team authorization is async collection-level access or a `/api/v1` route + overrideAccess engine write (4.3). The officials accept/decline self-update uses collection-level update access + a `beforeChange` that only permits `status` (5.4).
- Admin groups corrected: catalog -> `Training catalog`; per-user ledgers/Recognitions -> `People`/`Competition`/`Engagement` (Section 6).
- DeliveryLog decision: stateless weekly cron, no DeliveryLog, foundation and parent/community slices reconciled (4.5).
- GuardianLinks is an explicit dependency of the family digest in the parent slice; the foundation F3 digest is per-account only (4.5).
- `ownerOrSuperAdmin` is genuinely new (promoted from inline copies in Certifications/PlayerStats/TeamMemberships); preserve any guardian-read semantics where they exist.

**Feasibility concerns.**
- `req`-threading is a non-optional signature requirement of `awardXp`/`evaluateBadges` (deadlock risk).
- Composite uniqueness via collection-level `indexes` + real `CREATE UNIQUE INDEX` migration; `(user,dedupeKey)` is the actual double-credit guard.
- Streaks is a materialized view; the nightly cron is the sole writer (no two-writer race).
- The engine accepts pluggable sources so ChallengeSubmissions/Drills/Quizzes bolt on later without touching the core.

**Operator dependencies (hard).**
- **SES is unprovisioned** (sandbox, no verified domain, RAMP DNS dependency for cmba.ab.ca DKIM/SPF/DMARC). Per `OPERATOR_ACTIONS.md` / `SES_SETUP.md`, all digest/recognition/alert email LOGS but does not deliver until the operator completes SES production access + domain verification. Ship behind the existing jsonTransport-vs-SES switch.
- All new minor-data collections (BadgeAwards, XpEvents, Streaks, Recognitions, GuardianLinks, AthleteSkillProgress, DrillProgress, ChallengeSubmissions, CombineResults, QuizAttempts, TeamGalleryPhotos, SurveyResponses, Predictions, Attendance) must be added to the PIA data inventory + THREAT_MODEL with a per-category retention/purge schedule **before** holding production minor data. Acceptance gate, not follow-up.
- Pre-public-registration blockers remain open (independent pentest, third-party review, PIA sign-off, signed DPAs, framework upgrade blocked upstream). Sequence member-value work so it does not open public registration ahead of these.

**Open decisions.**
- Athlete XP source: extend Pathways vs parallel SkillPathways (decide the requirement-type abstraction now).
- One level bar vs two (proposal: one bar, verificationRequired badges count verified XP only).
- Parent gamification: recognition + digest only, no XP grind (confirm).
- Player-card minor visibility default (recommend team-only + photoOptIn + privacySafeName + consent).
- Officials: no `evaluator` role in the union (reuse club_admin/super_admin or add a role).
- Wage tracking: derive-live vs persist wage rows (recommend derived summary + thin persisted paid-status).
- Sponsors/Alumni: dedicated collection vs Pages blocks (recommend Pages blocks unless structured filtering needed).

---

## 8. Sequenced roadmap (Now / Next / Later)

Each item is tagged with its foundation dependency. Foundation first; nothing in the audience tiers ships before the foundation phase it depends on.

### Foundation (build first)
- **F0** Consolidate (audience/displayName/ownerOrSuperAdmin helpers + `progress.ts` single source of truth). Deps: none.
- **F0.5** Athlete-minor individual-data consent model design. Deps: F0.
- **F1** Persisted core (Badges, BadgeAwards, XpEvents, Streaks + engine + seed + migrations). Deps: F0.
- **F2** Recognition engine (Recognitions + report/flag + moderation). Deps: F1, F0.5.
- **F3** Notifications/digest (per-account weekly-digest + streak-rollup crons + notify + prefs). Deps: F1, F2.
- **F4** Per-role home dispatcher + player-card stub. Deps: F0, F1.

### Now (after the foundation phase each depends on)
- Role-based home for all four audiences. Dep: F0 + F1 (+ F4 dispatcher).
- GuardianLinks family linkage (parent prerequisite). Dep: none gamification; PIA update.
- Drill library w/ progress + visual dev hub (athlete + coach). Dep: F1, F0.5.
- Skill challenges + skills combine (badges + streaks). Dep: F1 engine, F0.5, coach-verify route.
- Family calendar w/ reminders/directions/cancellation. Dep: GuardianLinks, notify; OPERATOR SES.
- Volunteer signups. Dep: GuardianLinks.
- Weekly digest email (per-account in F3; family-aggregated gated on GuardianLinks). Dep: F3, GuardianLinks; OPERATOR SES.
- Recognition engine surfaces (athlete/coach/official/parent). Dep: F2, F3, privacySafeName.
- Coach certification pathway extension (swap positional badges for real BadgeAwards). Dep: F1.
- Official assignment dashboard + accept/decline + availability. Dep: F3 notify; migration.
- Official milestone recognition + wage/game tracking. Dep: F2 (recognition); assignment dashboard (wages).
- League home (game of week, news, storylines). Dep: none (CMS extension).
- Spectator-course completion (parent), understand-the-game guide. Dep: content engine (live).

### Next
- Basketball IQ quizzes + signals trainer. Dep: F1 XP; content authoring (prompts/distractors, signal art).
- Practice-plan library + builder. Dep: Drills.
- Coach + official community of practice (moderated). Dep: report/flag primitive (F2), notify.
- Team pages + consent photo galleries. Dep: privacySafeName, minor consent model, recognition/moderation.
- Predict-the-week + skill leaderboards. Dep: F1 XP, privacySafeName, `appearOnLeaderboard` consent, cron.
- Surveys + satisfaction score; board/admin dashboards. Dep: foundation collections (engagement metrics), minor-data posture.
- Carpool + team directory. Dep: GuardianLinks, privacySafeName.
- Player card (league-only). Dep: privacySafeName, F0.5, photoOptIn, F1.

### Later
- Push notifications + in-app digest. Dep: F3 notify abstraction (push-ready), SES/APNs/FCM operator work.
- Mindset/wellbeing micro-modules. Dep: F1; net-new content authoring.
- Mentorship/evaluation workflows (officials). Dep: F2 recognition; evaluator-role decision.
- End-of-season awards + awards night; alumni + sponsor showcase. Dep: F2 recognition, consent photo gallery (awards); CMS only (alumni/sponsors).
- Camera/sensor shot tracking. Dep: out of current scope; future hardware integration.
