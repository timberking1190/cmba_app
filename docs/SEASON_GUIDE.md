# Running a Season in CMBA Connect

A plain-language guide for the league administrator. CMBA Connect is now the source
of truth for the schedule, scores, standings, and officials. TeamLinkt stays for
registration and as a one time import path.

## 1. Set up the season

1. Sign in and open the management panel at `/admin` (Payload).
2. Create a Season: name, start and end dates, and the standings configuration
   (points for a win, loss, and tie; the tiebreaker order; the mercy cap; how a
   forfeit scores). The defaults match a typical rec league.
3. Create the Divisions under that season. The `fullPath` is the exact name the
   import files use, for example `Weekend Rec League / U13 Boys / A`. Set a short
   `displayLabel` (for example `U13 Boys A`) for the chips and dropdowns.

## 2. Import teams, venues, officials, and games

1. Open the scheduling console at `/manage` then `Import`.
2. Download the four templates (Teams, Venues, Officials, Games), fill them in, and
   upload them in this order: Teams and Venues and Officials first, then Games.
3. Use `Validate file` first. The preview shows rows that are ready, warnings (for
   example a past date or an unknown club), and errors (for example a division that
   does not match). Errors must be fixed and re-uploaded; warnings and conflicts
   must be acknowledged with the checkbox.
4. For the Games file, choose `Draft` (not shown publicly yet) or `Publish`. Then
   `Import now`. Each import can be undone within 60 minutes from the success panel.

You can also generate a round robin instead of a CSV: pick a division and time
slots and let the system create the schedule, then review the same conflict preview.

## 3. Publish and run the schedule

- In `/manage/schedule` you can publish or unpublish any game and use `Manage` to
  finalize, postpone, cancel, or forfeit a game. Every change records a reason in
  the audit log, and a published game changing time or venue notifies the teams.
- Verify your team representatives in `/admin` (TeamMemberships): set `verified` on
  each rep. Only a verified rep can report a score for that team.

## 4. Scores during the season

- Reps report their game scores at `/rep` (or by signing in from `/score-login`).
  One rep reports; the other team confirms. If both report and the scores match, the
  game finalizes automatically; if they disagree, it goes to the contested queue and
  the scheduling admin is emailed.
- Resolve contested games in `/manage/contested` with a corrected final score, a
  forfeit, or a cancellation.
- Standings update automatically the moment a game becomes final.

## 5. Officials

- Assign officials in `/manage/officials`. Double-booking is blocked unless you
  override it, and the screen warns when an official is over their games-per-day or
  below the division ramp level. Each assignment emails the official.

## 6. Playoffs

- When the regular season is done, seed a single-elimination bracket from a
  division standings (the bracket seeding endpoint, or a future button on the
  schedule console). The bracket is seeded by rank, top seed versus lowest seed,
  with byes for the top seeds when the field is not a power of two.
- Finalizing a bracket game advances the winner to the next round automatically.

## 7. Calendar feeds

- Division and league schedules are available as calendar subscriptions (ICS) that
  families can add to their phone calendar. Team-level feeds are off by default and
  can be enabled with `FEATURE_TEAM_ICS=true` if the board approves sharing team
  schedules publicly.

## Notes
- Set the scheduling admin email in Site Settings so contested escalations have a
  destination.
- Email (report requests, contested escalations, assignment notices) requires AWS
  SES to be provisioned; until then those messages are logged but not delivered.
