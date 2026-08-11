# DECISION-LOG.md

Every choice made on the road to Sept 1 2026, with the reasoning that produced it.
Append only. When a decision is reversed, add a new entry rather than editing the old
one, so the record shows what was believed at the time.

Copy rule: no em or en dashes anywhere.

Format: ID, date, decision, why, alternatives rejected, who decided.

---

## D-001 (2026-08-10) The launch plan's premise was wrong, so the plan changed

**Decision.** Abandon the "integrate, migrate, deploy dark, flip on Sept 1" sequence.
Replace it with "the platform is already live, so make it safe to receive a minor's
registration, then open registration on Sept 1".

**Why.** Discovery contradicted the brief on every material point.
`feat/launch-readiness` was already merged (PR #44, 2026-08-04) and sits zero commits
ahead of `main`. All 31 migrations including the two reported as pending are applied to
production (batch 24, 2026-08-04 16:22 UTC). Production has served that code since
2026-08-05. `https://cmbaplatform.vercel.app` returns 200 to anonymous requests, and
`/signup` is publicly reachable. There was nothing left to integrate, nothing to
migrate, and nothing that could be kept dark, because it was already light.

**Alternatives rejected.** Executing the original phases anyway. Phases 2, 3 and 4 had
no work left in them; running them would have produced a confident report about
finished work and burned days that the real blockers need.

**Decided by.** ENG discovery, confirmed by OPERATOR.

---

## D-002 (2026-08-10) Use the existing REGISTRATION_MODE as the launch gate, do not build a new one

**Decision.** The Sept 1 flip is `REGISTRATION_MODE=closed` becoming `open` in Vercel
Production, followed by a redeploy. No new flag system is built.

**Why.** `registrationGate` in `src/collections/hooks/registration.ts` already enforces
this server side, as a `beforeValidate` hook on user creation, returning a clean 403 to
anonymous callers while leaving admin created accounts working. It is unit tested in
`src/lib/registration/__tests__/policy.test.ts`. It gates precisely the thing Sept 1 is
about, which is public self registration.

This reverses ENG's own earlier recommendation, recorded here deliberately. The first
recommendation was to build a database backed flag on the Payload `SiteSettings` global
so the flip would be instant with no deploy. Reading the existing hook changed the
answer. A database backed flag would buy instantaneous flipping at the cost of a
migration, new code on the account creation path, and a new failure mode, which is a
database read standing between a family and their registration. The flip happens once,
deliberately, on a chosen Tuesday. A redeploy of roughly two minutes is an acceptable
cost for that, and the rollback is the same operation in reverse.

**Alternatives rejected.** (a) The database backed flag, for the reasons above. (b)
Treating Sept 1 as pure announcement with no gate at all, rejected because guardian
consent email does not currently deliver, so an ungated registration path is actively
unsafe. (c) Vercel deployment protection as the gate, rejected because it is an all or
nothing wall in front of the whole site, including pages that should stay public.

**Known limitation, stated rather than hidden.** Vercel applies environment variable
changes only to a new deployment. This is not a theoretical concern: commit `5d5b017`
in this repository exists solely because of it. So the flip is not instantaneous. It is
a redeploy. Anyone reading "flip a flag" in the original plan and expecting a zero
downtime instant toggle should read this entry instead.

**Decided by.** OPERATOR, on ENG's revised recommendation.

---

## D-003 (2026-08-10) Close public registration until SES delivers guardian email

**Decision.** Set `REGISTRATION_MODE=closed` in Vercel Production now, ahead of Sept 1.

**Why.** Public self registration is open today, and AWS SES is still sandboxed, so
guardian confirmation email is logged but never delivered. Guardian confirmation sits on
the registration path for a minor. The practical effect is that a family can register a
child right now and the consent artefact never reaches the guardian. `consent_records`
holds 1 row against 5 users, which is consistent with that gap. This is a live
compliance exposure under PIPEDA and Alberta PIPA, not a Sept 1 concern.

Closing it costs almost nothing: 5 users exist, sign in and every hub are unaffected,
and admin created accounts still work so people can be onboarded deliberately.
Reopening is the Sept 1 launch flip, which means the gate is exercised in the safe
direction first.

**Alternatives rejected.** Leaving registration open and accepting the gap for three
weeks. Volume is low, but every minor registered in that window would carry no delivered
consent record, and that artefact is exactly what a privacy review asks to see.

**Decided by.** OPERATOR.

---

## D-004 (2026-08-10) Fix nanoid, accept both image-size advisories in writing

**Decision.** Fix `nanoid` GHSA-2v37-7h3g-55p8 with an `overrides` entry. Add both
`image-size` advisories, GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq, to
`.audit-allowlist.json` with a note, an owner and a date. Shipped in PR #54, merged as
`caca843`.

**Why.** The scheduled weekly Security scan failed on 2026-08-10, which blocked
everything under the never merge on red rule. `nanoid` had a clean patch at 3.3.17 and
the fix cost exactly one line in the lockfile.

`image-size` had no patch at all. The latest published version is 2.0.2 and both
advisories cover `<=2.0.2`. It enters the tree only through `payload@3.85.1`, and the
upstream fix, `payload@3.87.1`, drops the dependency entirely. Taking it forces a full
lockfile regeneration, because every `@payloadcms` package peer pins its exact sibling
version, so they cannot be upgraded in place.

That regeneration was measured rather than assumed. It changes 338 packages, adds 162,
removes 113, and carries `nodemailer` from 8.0.11 to 9.0.5, a major version bump sitting
directly on the SES path that is already the critical path launch blocker. It also
carries `next` from 16.2.12 to 16.3.0 and `lucide-react` from 1.7.0 to 1.31.0, and it
breaks `npm run lint`, because `eslint-config-next` floats to a version with a rule the
current source violates. Twenty two days before launch that trades a bounded
availability risk for a broad and untested one.

**Exposure, stated plainly rather than minimised.** Impact is denial of service only,
with no data exposure and no path to personal data. It is reachable by any authenticated
user, because `Media.access.create` is `authenticated` and `upload.mimeTypes` is
`image/*`. Narrowing the mime types would not be a real mitigation, because image-size
dispatches on magic bytes rather than the declared content type. The practical bound is
that this runs in a Vercel serverless function, so a looping parser is terminated at the
function timeout rather than hanging a shared server.

**Alternatives rejected.** (a) Taking the Payload upgrade now, for the reasons above.
(b) Allowlisting nanoid too, rejected because a clean patch existed and accepting a fix
you could simply take is how allowlists rot.

**Remediation owner.** ENG, during the Aug 11 to Aug 31 soak, as a standalone Payload
3.85.1 to 3.87.1 upgrade verified on its own, after which both entries are deleted.

**Decided by.** ENG, approved by OPERATOR.

---

## D-005 (2026-08-10) Push feat/mobile-audit to origin as a backup, do not merge it

**Decision.** Push the branch to `origin` so it is no longer only on one laptop. Defer
the merge decision.

**Why.** 7 commits, 124 files and 10,752 insertions of accessibility, mobile and PWA
work existed nowhere but a local working copy. That is a single disk failure away from
being lost, and backing it up is not a merge. `gitleaks` scanned the commit range under
the repository's own config and found no leaks before the push.

The merge itself is a genuine decision, deferred because the branch conflicts with
`main` in 28 places. It branched before `feat/launch-readiness` landed and independently
reimplemented work that `main` now already has, including route error and loading
boundaries, robots and sitemap, and the service worker. Merging it wholesale would
resolve 28 conflicts in favour of one of two parallel implementations of the same
features, which is a good way to silently lose the better one.

**Recommendation for the deferred decision.** Cherry pick the genuinely new value,
which is the accessibility work that took axe violations from 36 to 7, rather than
merging the branch. For a public youth platform, accessibility is a launch relevant
obligation and not polish.

**Decided by.** OPERATOR approved the push. The merge decision remains open.

---

## D-006 (2026-08-10) No ad hoc production database dump was taken

**Decision.** Do not satisfy the "fresh backup before every deploy" rule by dumping
production to local disk.

**Why.** The tooling available in this environment offers no Supabase backup trigger and
no `pg_dump`. The only way to produce a backup here would have been to connect with the
production credentials in `.env` and write a dump containing the personal data of
minors onto a laptop. That creates a new, unencrypted, uninventoried copy of exactly the
data the rule exists to protect, which is worse than the risk it mitigates for a change
that touches no schema and no data.

Both changes made on 2026-08-10 are dependency and configuration only. Neither writes to
the database.

**Consequence, recorded as a gap rather than resolved.** Before any future migration,
confirming a fresh backup and a tested restore becomes a hard gate, and it is an
OPERATOR action in the Supabase dashboard. This appears as H3 in LAUNCH-ACCEPTANCE.md.

**Decided by.** ENG, disclosed to OPERATOR.
