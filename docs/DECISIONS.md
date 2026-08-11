# Decisions log

Recorded decisions and deliberately deferred choices from the launch-readiness work,
so nothing is silently skipped. Each entry has a status and an owner.

Copy rule: no em or en dashes anywhere.

## D1. Schedule and standings library consolidation (P2.10) - STAGED

Status: staged, gated on the TeamLinkt cutover. Owner: engineering, after the operator
flips the flag.

Current architecture is already single-path:
- `src/lib/cmbaSchedule.ts` is THE data layer for schedule and standings. Pages call
  `getEventsWithSource` / `getStandingsWithSource`.
- `src/lib/standings/` is the pure standings engine (computeStandings) plus the
  orchestrator (recomputeDivision, getDivisionStandings, getLeagueStandings).
- `src/lib/teamlinkt.ts` provides `getTeamLinktConfig` (in use) and the legacy
  `getEvents` / `getStandings` (fallback only, reached solely via cmbaSchedule while
  `FEATURE_LEGACY_TEAMLINKT` is true).

Why not now: removing the legacy getters or the fallback branch today would break the
graceful TeamLinkt fallback that is still active before a season is imported.

Deferred steps (do after `FEATURE_LEGACY_TEAMLINKT=false` is live and verified, per
the cutover runbook in `docs/OPERATOR_ACTIONS.md`):
1. Delete `getEvents` and `getStandings` from `src/lib/teamlinkt.ts` (keep
   `getTeamLinktConfig`).
2. Remove the `LEGACY` fallback branches in `getEventsWithSource` /
   `getStandingsWithSource` in `src/lib/cmbaSchedule.ts` (source becomes own or empty).
3. Optionally retire the `TeamLinktEmbed` fallback rendering on the schedule and
   standings pages.
4. Run the verification gate; confirm `/schedule` and `/standings` still render from
   our own data only.

## D2. Registration and payments: in house versus TeamLinkt - DECIDED

Status: **DECIDED 2026-08-04. Keep registration and payments in TeamLinkt for the
2026-09-01 launch, and deep-link to it.** Decided by Ken (operator, acting with CMBA
authority). The recommendation below was ratified as written, so nothing in the Sept 1
scope changes: the app already deep-links and holds no payment data.

Revisit bringing it in house as a later phase, once the platform has a track record.
When that is revisited, the costs recorded below still apply: a payment processor, a new
PCI and privacy scope, a new entry in the processor register, and a registration data
model.

Original context and recommendation, kept for the record:

Registration, payments, and the roster of record currently live in TeamLinkt. This is
the money and the official roster, so the choice is a business decision, not just a
technical one. Recommendation for launch: keep registration and payments in TeamLinkt
and deep-link to it (the app already does this and holds no payment data), then revisit
bringing it in house as a later phase once the platform has a track record. Bringing it
in house would add a payment processor (a new PCI and privacy scope, a new processor in
the register) and a registration data model. Record the board's decision here when made.

## D3. Push notifications with the native apps - DEFERRED

Status: deferred to the native app phase. Owner: engineering + product.

The notification layer is already push-ready: `src/lib/notify.ts` is the single fan-out
point and the data model has a push-devices concept behind `FEATURE_TEAM_ICS`-style
gating. When the native apps ship, add push here alongside the existing PII-free email
payloads. No web-only work is needed now.

## D4. Bilingual content (English and French) - DEFERRED

Status: deferred, noted for the Alberta and Canada context. Owner: product.

Given the Canadian context, French language support is worth planning. It is a
non-trivial content and i18n effort (route localization, translated CMS content and
legal documents, language toggle). Deferred as a post-launch enhancement; recorded so
it is a deliberate choice, not an oversight.

## D5. Privacy Officer designation - DECIDED

Status: **DECIDED 2026-08-04. Ken is designated as CMBA's Privacy Officer**, the
individual accountable for personal information under PIPEDA principle 1
(Accountability) and the equivalent obligation in Alberta PIPA. Decided by Ken
(operator, acting with CMBA authority).

Why this needed recording at all. `SiteSettings` already carried a Privacy Officer
contact and had done for some time (`CMBA Privacy Officer`, `privacy@cmba.ab.ca`,
`(403) 804-3396`), so the member-facing contact route was live and the legal copy that
points at it was never dangling. That made the gap easy to misread as closed. It was
not: PIPEDA asks for a designated **individual** who is accountable, and a role mailbox
is an alias, not a person. This entry records the person.

The role alias stays as the published contact route. That is deliberate and normal: it
survives a change of officer, and members should not be routed at a personal address.

Two follow-ups this decision does NOT complete:

1. **Enter the exact legal name and title in `SiteSettings`.** This entry records the
   designation; it deliberately does not guess a full legal name or a formal title from
   a git identity. Set them in the admin (System group, Site Settings) so the record and
   the running app agree.
2. **Confirm CMBA's own governance recognises the designation** (board minute or
   equivalent), so the accountability is the organisation's and not only the platform's.
   The independent privacy reviewer will reasonably ask for this.

Related: `docs/adr/0004-accept-us-headquartered-processors.md` records the processor
posture the Privacy Officer is accountable for, and
`docs/launch-blockers/PRIVACY_REVIEW_BRIEF.md` is the brief for the external review.
