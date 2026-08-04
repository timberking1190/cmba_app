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

## D2. Registration and payments: in house versus TeamLinkt - DECISION PENDING

Status: decision pending. Owner: CMBA board.

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
