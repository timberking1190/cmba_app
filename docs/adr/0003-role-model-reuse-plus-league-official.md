# ADR 0003 — Role model: reuse the existing 5 roles, add `league_official`

- Status: Accepted (2026-07-02)
- Deciders: Ken (operator), coding agent

## Context

The spec's role vocabulary is `coach | referee | player | parent | volunteer | scorekeeper` (plus
`admin | commissioner | league_official` for auth tiers). The repo's real vocabulary is
`participant | coach | official | club_admin | super_admin`, and **guardians are not a role** — a minor
is a `users` record with `isMinor` (derived from `dateOfBirth`) and a `guardian` group, with a
guardian-confirmation + consent-logging flow.

## Decision

Reuse the existing 5 roles and add exactly one new role, `league_official` (the scanner login tier, D23).

Mapping:

| Spec role | This repo |
|---|---|
| coach | `coach` |
| referee | `official` |
| player / athlete | `participant` |
| parent / guardian | **not a role** — the existing guardian/minor model on `users` |
| admin / commissioner | `super_admin` / `club_admin` (both = `isAnyAdmin`) |
| league_official | **new** `league_official` |
| scorekeeper / volunteer | folded into `participant` unless a concrete need makes them distinct |

Access helpers added in `src/access/index.ts`: `isLeagueOfficial`, `canScan`
(= `official | league_official | any admin`, D23), `isVerificationAdmin`
(= `league_official | any admin`, D24). Credential review / imports / requirement-matrix edits remain
`isAnyAdmin`-only (D16).

## Consequences

- `Role` union + `ROLES` array updated (done). `league_official` is **not** force-MFA'd (matches
  referees who also scan); revisit if scanner access is deemed to warrant AAL2.
- Adding the value to the persisted Postgres enum for `users.roles` (and the `certification-types` role
  fields) requires a **deliberately generated** Payload migration (`ALTER TYPE … ADD VALUE`) applied on
  a preview branch first — **not** run against prod ad hoc. Source-level addition is non-breaking until
  a user is actually assigned the role.
- "Scannable role" (D14/D20) is derived from the requirement matrix (`certification-types` with
  `requiredForRoles` + `isRequired`), seeded so only `coach` is scannable. No enum churn needed to make
  another role scannable later.
- If scorekeeper/volunteer must be distinguished for card visuals or reporting, that is a follow-up
  decision, not a blocker.
