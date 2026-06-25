# Feature Gap Analysis: CMBA Connect Scheduling, Scores, and Standings

Date: 2026-06-24
Author: CMBA Connect build team (delivery lead, backend, front end, mobile and API, QA and security)
Scope: the scheduling, score reporting, standings, stats, and officials module in
MODULE_SCHEDULING_SCORES_STANDINGS_PROMPT.md. This is a pre build review. It checks
the planned feature list against five established platforms and recommends what to add
before we build, so we do not discover gaps after the fact.

This is a working document. Items marked "Add now" are folded into the Stage B build.
Items marked "Scaffold now" get a data model and a stub so they drop in later without a
migration rewrite. Items marked "Out of scope" are deliberately left to TeamLinkt or a
later phase, with the reason stated.

## How we compared

We compared against the platforms a Calgary minor basketball league would realistically
shortlist:

- SportsEngine (large North American youth sport platform; registration, scheduling,
  websites, background screening, live scoring, tournaments).
- LeagueApps (youth and adult league management; registration, payments, scheduling,
  official assigning, API and webhooks).
- LeagueRepublic (league administration; fixtures, results, configurable standings,
  disciplinary tracking, stats, public site and widgets).
- LeagueLobster (schedule generator and standings; round robin and balanced schedules,
  playoff brackets, venue and time slot management, embeddable views).
- TeamLinkt (our current registration and league app; free, scheduling, scores,
  standings, team chat, availability, push notifications). Stays our registration system.

Our north star is narrow on purpose. We are not rebuilding registration or payments.
We are building a youth safe, Canadian resident source of truth for schedule, scores,
standings, stats, and officials, with verified reporting and an admin controlled
publish flow. The comparison is scored against that goal, not against being a
full registration suite.

## Coverage of what the module prompt already specifies

These are already in the prompt and are not gaps. We list them so the comparison is honest
about what we already match.

| Capability | SportsEngine | LeagueApps | LeagueRepublic | LeagueLobster | TeamLinkt | In our prompt |
|---|---|---|---|---|---|---|
| CSV import of teams, venues, games | partial | partial | yes | yes | partial | yes, with dry run preview and conflict checks |
| Schedule generator (round robin) | yes | yes | yes | yes | yes | yes, single or double, availability, blackout dates |
| Conflict detection (venue, team, official) | yes | yes | partial | yes | partial | yes, blocks publish until resolved or acknowledged |
| Draft then publish schedule control | yes | yes | partial | partial | partial | yes, with change log and affected team notices |
| Verified score reporting | yes | yes | yes | no | yes | yes, verified rep only, server enforced |
| Opposing confirmation and contested flow | partial | partial | partial | no | partial | yes, dual entry match, contested, admin escalation |
| Auto standings with tiebreakers | yes | yes | yes | yes | yes | yes, configurable, recomputed deterministically |
| Mercy or point cap on differential | partial | partial | yes | no | partial | yes, configurable point differential cap |
| Team stats | yes | yes | yes | partial | yes | yes, plus a player stats scaffold |
| Officials roster and assigning | partial (partner) | yes | partial | no | partial | yes, roster import, assigning, conflict checks |
| Public schedule and standings pages | yes | yes | yes | yes | yes | yes, Off and Brand style, filterable |
| Mobile ready API | yes | yes | partial | no | yes | yes, /api/v1, token auth, Idempotency-Key |
| Youth data privacy and residency | partial | partial | partial | no | partial | yes, Canadian resident, private by default, guardian consent |

Read this table as "the platforms set the expectation, and our prompt already meets it,"
not as a score sheet. The point of the gap analysis is the next section.

## Gaps we found, and what we recommend

Each item says what it is, which platforms have it, why it matters for a youth basketball
league in Calgary, and our recommendation. "Add now" items are small enough to include in
Stage B without slowing it down, or important enough to correctness that we cannot skip them.

### Add now (fold into the Stage B build)

1. Playoff brackets seeded from standings.
   Who has it: SportsEngine, LeagueLobster, LeagueRepublic.
   Why: a season ends in playoffs. Without bracket support the admin builds the postseason
   by hand in a spreadsheet, which loses the verified reporting and standings we just built.
   Recommendation: a Brackets or Playoffs model (single and double elimination) that seeds
   from a division's final standings, reuses the same Games, score reporting, and conflict
   engine, and shows a public bracket view. This is the single biggest gap. Build it.

2. Forfeit and default result rules in StandingsConfig.
   Who has it: LeagueRepublic, SportsEngine.
   Why: the prompt has a forfeit game status but does not define how a forfeit scores in the
   standings. Leagues need a configured rule (for example a forfeit counts as a set score
   such as 20 to 0, awards the win points, and may dock the forfeiting team). Without this,
   forfeits are entered inconsistently and standings drift.
   Recommendation: add forfeitScoreFor, forfeitScoreAgainst, forfeitWinPoints, and an
   optional forfeitPenaltyPoints to StandingsConfig, and apply them in the standings math.

3. Bye handling in the round robin generator.
   Who has it: LeagueLobster, LeagueRepublic.
   Why: divisions with an odd number of teams need a bye each round. A generator that
   assumes even teams will either crash or double book.
   Recommendation: the generator inserts a bye team for odd counts, never schedules the bye
   on a court, and the bye does not affect standings. This is a correctness requirement, not
   a nice to have.

4. Deterministic final tiebreaker so standings never loop.
   Who has it: LeagueRepublic (configurable), SportsEngine.
   Why: a configurable tiebreaker list can still end in a true tie (two teams identical on
   every criterion). If the last step is undefined the standings are nondeterministic, which
   breaks the "recompute is deterministic and idempotent" requirement in the adversarial
   matrix.
   Recommendation: add an explicit, stable final tiebreaker (head to head result, then a
   fixed deterministic key such as team id or a stored season seed) so two recomputations of
   the same final games always produce the identical order.

5. Add to calendar and team calendar subscription (ICS feeds).
   Who has it: SportsEngine, TeamLinkt, LeagueApps.
   Why: families live in their phone calendars. A per team and per division ICS subscription
   link, plus an add to calendar button on each game, is low cost and high value, and it is
   the first thing parents ask for. It contains no sensitive data (times, venues, opponents),
   so it fits residency and youth privacy without exposing PII.
   Recommendation: serve read only ICS feeds for a team, a division, and a single game.

6. Targeted announcements to a division or team.
   Who has it: SportsEngine, TeamLinkt, LeagueApps.
   Why: we already have an Announcements collection from Stage A. Scheduling changes,
   weather cancellations, and gym closures need to reach the affected teams, not the whole
   league. The schedule change email already does this for game edits, but admins also need
   a plain broadcast to a division or team.
   Recommendation: extend Announcements with an optional audience by division or team, and a
   send by email option through SES, reusing the no PII in body rule.

7. Game incident reporting linked to a game.
   Who has it: SportsEngine, LeagueRepublic (disciplinary).
   Why: youth sport requires a way to record an on court incident (injury, conduct, ejection)
   tied to a specific game, for Safe Sport and insurance. Stage A already shipped an
   IncidentLog collection. Connecting it to Games closes the loop and uses work we have done.
   Recommendation: allow a verified rep, official, or admin to file a game incident that
   references the Game, stored private, visible to admins only.

### Scaffold now, build later (data model and a stub, no rewrite later)

8. Disciplinary and suspension tracking.
   Who has it: LeagueRepublic (core), SportsEngine.
   Why: repeated ejections or accumulated technicals can make a player or coach ineligible
   for the next game. A full system is more than Stage B needs, but the data model should
   exist so we do not migrate later.
   Recommendation: a Sanctions model (subject membership, game, type, games suspended,
   status) with a stub that an admin sets by hand for now and an eligibility check later.

9. Player availability and RSVP per game.
   Who has it: TeamLinkt (core), SportsEngine.
   Why: coaches want a headcount. This touches minor data directly, so it must be private
   and guardian aware, which is exactly why we scaffold rather than rush it.
   Recommendation: an Availability model keyed to TeamMemberships and Games, private,
   surfaced later in the rep and parent views.

10. Per player box scores and stats.
    Who has it: SportsEngine, LeagueApps.
    Why: the prompt already asks to scaffold this. We confirm it as a scaffold, not a Stage B
    deliverable, so team stats ship first and player stats follow without a schema change.
    Recommendation: keep the player stats scaffold from the prompt, model it from the
    scoresheet, and leave it behind a flag.

11. Official availability and assignment acceptance.
    Who has it: LeagueApps, SportsEngine (via partner).
    Why: the prompt assigns officials but does not let an official set availability or accept
    or decline an assignment. For a first season, admin assignment with an email notice is
    enough. The model should anticipate self serve.
    Recommendation: the Officials and GameOfficials models include a status and an optional
    linkedUser so availability and accept or decline drop in later.

### Out of scope for Stage B (stated so we are explicit)

12. Online registration and payments. Stays in TeamLinkt. We keep the TeamLinkt deep link
    for registration and the one time CSV import path. We do not collect payment data, which
    also keeps us out of a class of compliance and residency risk.
13. Background screening and Safe Sport certification intake. Already handled by the Stage A
    certifications and compliance system. Scheduling references a verified rep, it does not
    re implement screening.
14. Public website builder and general CMS. Already delivered in Stage A (Pages, blocks,
    live preview). Scheduling adds pages into that system, it does not add a second CMS.
15. Bilingual (English and French) UI. Alberta operations are primarily English. We note
    French as a later option. Not a Stage B blocker.
16. Sponsorship and fundraising tools. TeamLinkt territory. Not in our goal.

## Net additions we are recommending to the build

If you approve, Stage B will include items 1 through 7 (playoff brackets, forfeit and
default scoring rules, bye handling, a deterministic final tiebreaker, ICS calendar feeds,
targeted announcements, and game incident reporting linked to a game) on top of everything
already in the module prompt, and will scaffold items 8 through 11 (sanctions, availability,
player box scores, official availability) so they need no migration rewrite later.

Items 1, 2, 3, and 4 are not optional polish. They are correctness and completeness gaps
that would make the standings or the postseason wrong or unusable. Items 5, 6, and 7 are
high value, low cost, and reuse work already shipped in Stage A. Items 12 through 16 are
deliberately left out, with the reason recorded above.

## Open question for you (does not block writing this analysis)

The module prompt asks the importer to create a club on approval when a Teams CSV names a
club that does not exist. Stage A treats Clubs as a governed list tied to access control
and club admin scoping. We recommend that the importer flags an unknown club as a warning
and offers to create it, rather than creating it silently, so club scoped permissions are
never created by a spreadsheet without an admin seeing it. We will build it that way unless
you prefer silent creation.
