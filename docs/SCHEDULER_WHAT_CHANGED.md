# What changed, for the lead scheduler

Written for the person who reported these, so each item can be retested on its
own. Your original list, in your order, with what was wrong and what to try.

---

## 1. "Forfeit does not submit and shows no label"

**What was wrong.** The forfeit button always told the server that the *home*
team forfeited, and never said *which* team that was. The server correctly
refused an incomplete forfeit, and the refusal message was printed at the very
top of the game list, so on a screen of a hundred games you never saw it. Nothing
appeared to happen. There was also no forfeit label anywhere on the console.

**What to try now.** Open Schedule, select **Edit** on any game, set Status to
Forfeit. A new box appears: **Who forfeited**, listing both teams by name, plus
Both teams forfeited and No contest. Pick one, type a reason, and select **Record
the forfeit**.

- The result appears in the panel you are looking at, not at the top of the page.
- The row updates immediately to a red **FORFEIT** chip, with no refresh.
- Underneath it says who forfeited and who takes the win, in words.
- The standings recalculate.
- The same FORFEIT label now appears on the public schedule, and a family
  subscribed to the calendar sees "Forfeit:" in the event title and who forfeited
  in the notes.

---

## 2. "No way to edit games after import"

**What was wrong.** Two things. The "Manage" control was styled like faint grey
text, so it read as decoration rather than a button; and even when you found it,
it only let you change the status. There was no way to change a date, a time, a
venue, a court, or the teams anywhere in the product.

**What to try now.** Every game row has a red **Edit** button. It opens a panel
that edits:

- date and time
- venue, and the court list narrows to that venue's courts
- home team and away team
- status and score

As you change the date, the time, or the venue, the system checks the rest of the
schedule **while you are still looking at the field** and tells you in plain words
if it clashes, naming the other game. For example: "Trico Centre, Court 1 is
already booked at that time by Okotoks GU13-2 vs DMS U13 on Sat, Jan 17, 6:00 PM."

If you really do want to save over a clash, there is a separate, red **Save
anyway** button. It is recorded in the audit log along with what you overrode.

Every change needs a reason. If the reason box is empty, the Save button tells you
so instead of doing nothing.

---

## 3. "Sign in takes multiple attempts to reach the admin side"

**What was wrong.** After you signed in, the app tried to move you using a page it
had already stored from *before* you signed in. For an admin page that stored copy
was "you are not signed in, go back to login", so it sent you back. The second or
third try worked because the stored copy had been replaced by then.

**What to try now.** Sign in once. The button says "Signing you in" and stays that
way until you arrive. You land on the admin side first time. If something is
genuinely wrong you get a specific message: wrong password, too many attempts, or
cookies blocked, rather than a silent bounce.

Two related things also changed:

- The header now shows your name and account menu as soon as the page loads, with
  no flash of "Sign In" first. It used to disagree with the page underneath it.
- You stay signed in for seven days instead of two hours, so you no longer get
  signed out partway through a scheduling session.

---

## 4. "CSV times only accept 24 hour and spreadsheets mangle 08:00"

**What was wrong.** The importer accepted `08:00` and nothing else. Excel rewrites
that as `8:00` or `8:00 AM`, and if the cell format is General it writes a raw
number like `0.3333333333`. All of those were rejected, row by row, on a schedule
that was actually correct.

**What to try now.** All of these import, and mean the same thing:

`08:00` `8:00` `8:00 AM` `8:00AM` `8:00 a.m.` `20:00` `8:00 PM` `08:00:00` `0800`
and the raw number your spreadsheet produces.

Dates are more forgiving too: `2026-12-10`, `10 Dec 2026`, `Dec 10, 2026`, and
Excel's date numbers all work.

**One thing is still refused on purpose.** A date like `04/11/2026` is April 11 to
some people and November 4 to others. Rather than guess and move a real game, the
importer refuses it and tells you to use the year first, like `2026-12-10`.

**And you can check what it understood.** The preview now has a section, "What the
system read", showing the exact date and 12 hour time it took from every row,
before anything is saved. The games template has an example of each style.

Everywhere else in the console, times now read as 6:30 PM rather than 18:30.

---

## 5. "Must refresh before revalidating a corrected file"

**What was wrong.** Two causes. The file box kept the name of the file you picked
last time, and a browser will not react when you choose a file with the same name
again, so nothing at all happened. And the previous error message stayed on screen
next to the new file, so even when it did work you could not tell.

**What to try now.** Fix your file in the spreadsheet, save it with the same name,
and choose it again. It re-reads it every time. The old preview and the old
message clear the moment you pick a new file. There is also a **Start over**
button, at the top of the upload step and again under the preview, so you never
have to scroll to find it.

You can go round this loop as many times as you need without ever reloading the
page.

---

## 6. "Blocked official 7: Could not assign."

**What was wrong.** Every possible failure was collapsed into one sentence, and
the person was identified by their database number. You could not tell who was
blocked or what to do about it.

**What to try now.** Every result names the person and says exactly what happened:

- "Casey Morgan is already on Okotoks GU13-2 vs DMS U13 on Sat, Jan 10, 6:30 PM,
  which overlaps this game. Choose someone else, or tick assign anyway if they
  really can do both."
- "Riley Chen would be working 4 games that day, over their maximum of 3. They
  were still assigned."
- "Jamie Patel is level 1, and this division asks for level 3. They were still
  assigned."
- "Casey Morgan is already assigned to this game. Remove the existing assignment
  first if you want to change their role."
- "Sam Roy is marked inactive, so they cannot be assigned. Set them active on the
  officials list first."

**The important distinction:** results are now split into two labelled groups.
**Not assigned** means it did not happen. **Assigned, note** means it did happen
and here is something you should know. Only a genuine time conflict is a hard
block, and it has a tick box to override it deliberately.

---

## 7. "Only one game can be assigned at a time"

**What was wrong.** The officials screen was a single dropdown. Staffing a
weekend meant repeating the whole cycle for every game.

**What to try now.** Officials is now a board.

- Filter to the day, division, or venue you are staffing. There is a **Needs
  officials only** tick box.
- Every game on that slate is on one screen, with a picker for Referee 1,
  Referee 2, and Scorekeeper on each row.
- Every name shows how many games that person already has that day, for example
  "Casey Morgan, level 2 (2 of 3 that day)", and the count goes up as you pick
  them, so you can see someone filling up before you over commit them.
- **Check first** tells you everything that would happen across the whole weekend
  and changes nothing.
- Then one **Assign** button does the lot.
- Remove or swap anyone from the same board.

No page reloads at any point.

---

# Things you did not ask for, that came out of the same work

## Playoff brackets are now manageable

You mentioned you could not figure this out. There genuinely was no admin screen
for it. **Manage, then Brackets**:

- Pick a division and see the seeding your standings produced. Move any team up
  or down. See every matchup and every bye **before anything is created**.
- It is created as a draft. Nobody outside the league office sees it.
- **Publish** creates the real playoff games and puts them on the public
  schedule, the team pages, and the calendar feed.
- After that it advances itself. A final advances the winner. A one sided forfeit
  advances the team that did not forfeit.
- Where it *cannot* decide, it says so and waits for you: a double forfeit, a no
  contest, a tie, or a contested result. Each one has a sentence explaining it.
- If you correct a result later, the bracket corrects itself and pulls the team
  back out of the next round.
- You can set any winner by hand for a correction, and it will not be overwritten
  afterwards.
- Rebuilding or deleting is refused while a bracket is published, and tells you to
  unpublish first rather than just failing.

## A season dashboard

`/manage` now opens with what needs you today, counted live: contested results,
results waiting on a second team, upcoming games with nobody officiating them,
games not yet on the public site, and brackets still in draft. Each is one click
from the screen that fixes it. When nothing is waiting, it says so.

## Bulk changes to games

Tick any games on the Schedule screen and you can publish, unpublish, move to a
new date, move to a new venue, postpone, or cancel them all at once.

- Nothing runs until you have seen a preview: how many change, which are left
  alone and why, and which teams are affected.
- A game that already has a final result is never moved or cancelled in bulk,
  because that would quietly rewrite the standings.
- Moving a date keeps each game's time of day.
- You can undo the whole batch for an hour.

## Finding games at all

The Schedule screen filters by division, venue, status, published or draft, a date
range, and team name, and pages through the results. The web address matches what
you are looking at, so you can send someone a link to exactly the slate you mean.

## Your own login

There is now a **Scheduler** role, so you can do all of the above without being
made a full administrator. It gives you the schedule, officials, imports, and
brackets, and nothing else: no user management, no site settings. Your league
administrator assigns it.

---

# Two things to know

1. **The database changes need to be applied on the next deploy** before the
   Scheduler role and a couple of the new features work. Your administrator runs
   one command. Nothing you do is affected until then.
2. **The full click-through testing has not been run yet**, because it needs a
   copy of the site pointed at a test database rather than the live one. The
   automated tests all pass (606 of them). Details are in `docs/VERIFICATION.md`.
