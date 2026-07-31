# Scheduling console: design spec and review pass

Written during the scheduler overhaul (2026-07-30) for `/manage` and everything
under it, the import flow, the officials board, the bracket manager, and the
admin facing schedule and standings.

## A note on who did this

The brief asked for the **Ken King Design Pro** agent, in two passes: a spec pass
before implementing each phase, and a review pass over the implemented screens.
**That agent is not available in this environment** (the agent registry here
offers only general purpose, exploration, planning, and Claude Code guidance
agents). As the brief instructs, this is said plainly rather than skipped, and
both passes were performed directly instead. This document is the record of both.

## The bar

A brand new volunteer scheduler completes every task from the screens alone, with
no documentation. Where the lead scheduler said "I could not figure out",
confusion has to be impossible.

---

## Spec pass: the rules

These are enforced by shared components rather than by everyone remembering them,
because a rule that lives only in a document drifts.

### 1. A disabled control always says why, and what unlocks it

`ActionButton` in `src/components/manage/ui.tsx` has **no `disabled` prop**. The
only way to make it inert is `disabledReason`, a sentence, which is rendered
beside the control and wired to it with `aria-describedby`. A dead control that
does not explain itself cannot be written.

It uses `aria-disabled` rather than the `disabled` attribute, so the control stays
focusable and a screen reader user can reach it and hear the reason. A truly
disabled button is skipped by keyboard navigation, which hides the explanation
from exactly the people who most need it.

Examples now on screen:

- "Choose a .csv file first."
- "Fix the errors listed above in your spreadsheet, save it, then choose the file
  again and validate."
- "Add a reason first. Every change is recorded in the audit log."
- "Take it off the public site first. Rebuilding replaces every matchup and
  deletes the games it created."
- "You are on the last page."

### 2. One status vocabulary, everywhere

`src/components/StatusChip.tsx` is the single source. The console, the public
schedule, the team pages, and the playoff bracket all render through it, so a
parent and an admin read the same word for the same thing. The record is keyed by
`GameStatus`, so adding a status without giving it a chip is a compile error.

Draft versus published is a **separate axis** and gets its own chip, because a
published cancelled game and a draft scheduled game are different situations and
one chip cannot say both.

Each chip carries a plain-language `title` for the hover, for example: Contested
is "The two teams disagree about the score. The league office is deciding it."

### 3. Colour comes from theme tokens, never the fixed palette

`--st-ok`, `--st-warn`, `--st-danger` in `globals.css`, with separate values for
the dark and light themes, surfaced as `text-status-ok` and friends.

This fixed a real pre-existing accessibility defect: the app themes with a
`[data-theme]` attribute, but Tailwind's `dark:` variant keys off the operating
system preference, and the fixed palette shades in use (`text-green-400`,
`text-orange-400`) sit at roughly 1.7:1 on a white card. Every status colour in
the console and on the public schedule now clears WCAG AA on both surfaces.

### 4. Action hierarchy

| Variant | Used for | Looks like |
|---|---|---|
| `primary` | The one thing this screen is for | Solid CMBA red |
| `secondary` | Real but not primary | Outlined, surface fill |
| `danger` | Irreversible or destructive | Red outline, red text, never solid |
| `quiet` | Genuinely tertiary | Text only |

Irreversible actions are visually distinct **and** gated: deleting a bracket needs
a second confirming press, rebuilding one is refused while published, and bulk
cancelling is styled `danger` and warns that families may have planned around the
game.

The reported "Manage is a ghost styled toggle that reads as dead" is fixed by this
hierarchy: editing a game is now a `primary` button labelled Edit.

### 5. Times read the way people say them

12 hour with am and pm everywhere a person reads a time (`src/lib/leagueTime.ts`).
24 hour survives only in the CSV templates and in form inputs, where it is the
machine format. Every date and time is computed in the league zone, never the
UTC day.

### 6. Every message says what happened, why, and what to do next

`Callout` carries the four tones and uses `role="alert"` for errors, so a failure
is announced rather than waiting to be noticed. Messages appear **where the
scheduler is looking**: the forfeit failure that used to render at the top of a
hundred game list now renders inside the open panel.

No internal id appears where a name exists.

### 7. Every screen has an empty, a loading, and an error state

| Screen | Empty | Loading | Error |
|---|---|---|---|
| `/manage` | "Nothing is waiting on you" with what to do next | Server rendered | Counts degrade to zero |
| `/manage/schedule` | Filtered vs never imported, different copy and action | Per-action busy state | Inline per row and per panel |
| `/manage/officials` | "No games match those filters" plus a way back | Busy state on both actions | Inline, per official, named |
| `/manage/import` | "No file chosen yet" | "Checking", "Importing" | Callout with the next step |
| `/manage/brackets` | First run walkthrough | Server rendered | Callout |
| `/manage/brackets/new` | Division with too few teams explains itself | "Building" | Callout |
| `/manage/contested` | "Nothing is contested right now" | Per-action | Inline |

### 8. Information dense, but calm, and it survives a gym table

- The schedule and officials screens go to `max-w-[1400px]`, because a scheduler
  on a laptop wants the width.
- The officials board is a real table with a `<caption>` and `scope` on every
  header, and scrolls horizontally inside its own container so the page body
  never scrolls sideways.
- The bracket scrolls horizontally by round, which is how a bracket reads.
- Touch targets are at least 44px on small screens (`min-h-[44px]`), relaxing on
  desktop where a pointer is precise.
- Focus rings are explicit (`focus-visible:outline`) on every button, link, and
  input, because the design removes default outlines elsewhere.
- Animations respect `motion-reduce`.

### 9. Scale is a design constraint, not an afterthought

The schedule console never loads the season. Filter and page live in the URL, the
query runs on the server, and the resulting address can be sent to someone else.
The officials board loads one slate. The dashboard counts rather than fetches.

---

## Review pass: what the pass found and changed

Run over the implemented screens after each phase.

| Finding | Severity | Resolution |
|---|---|---|
| Public `StatusChip` duplicated the console's vocabulary and used fixed palette colours that fail contrast on the light theme | Accessibility | Consolidated into `src/components/StatusChip.tsx`, moved onto theme tokens. Both surfaces now import one component. |
| `text-green-400` and friends throughout the manage area | Accessibility | Replaced with `status-ok` / `status-warn` / `status-danger` tokens. |
| The officials picker placeholder read "Not assigned", the same words as the outcome label "Not assigned" in the results list | Copy collision | Placeholder is now "No one chosen yet". Caught by a component test that could not tell the two apart. |
| Two "Start over" controls on the import screen | Considered, kept | One at the top of the upload step and one under the preview. A volunteer should not have to scroll to start again. |
| `aria-disabled` controls stay focusable but still receive click events | Considered, correct | The handler is removed, so the click does nothing. This is deliberate: focusable means the reason is reachable. |
| The bracket manager linked to `/brackets/:id` | Broken link | The public bracket page is `/bracket/:divisionId`. Fixed. |
| Bulk cancel had the same weight as bulk publish | Hierarchy | Cancel is `danger`, and its preview says families may have planned around the game. |
| Round labels read "Round 3" | Plain language | `roundName()` gives Final, Semi finals, Quarter finals, counted back from the last round, on both the admin and the public bracket. |
| A subscribed calendar showed a forfeit exactly like a normal game | Parent facing | The event title now carries Cancelled, Postponed, or Forfeit, a postponement is `TENTATIVE`, and the description says who forfeited. |

### Still open

- **Keyboard and screen reader testing on real assistive technology.** The
  markup rules above are implemented and reviewed by reading, and the component
  tests query by role and label throughout, which catches missing accessible
  names. A pass with VoiceOver and a keyboard against the running app has not
  been done, because that needs a running app against a non production database.
  See `docs/VERIFICATION.md`.
- **Drag and drop assignment.** The brief mentions "drag or multi select
  assignment". Multi select is implemented (the whole slate, all roles, one
  submit). Drag and drop is not, deliberately: it is the harder pattern to make
  keyboard accessible, and multi select solves the reported problem, which was
  staffing a weekend without a page reload between every game.
