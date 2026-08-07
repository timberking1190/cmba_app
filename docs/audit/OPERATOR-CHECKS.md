# Operator checks: what a person still has to do

Everything in the adversarial matrix that a machine cannot do, or that this work could not do
without credentials. Each item says what to do, what a pass looks like, and why it could not be
automated. Nothing here blocks the code that has already shipped; these are confirmations and
follow-ups.

Time estimate for the whole list: about 45 minutes, plus the two device sessions.

---

## 1. Real device pass, iPhone (about 15 minutes)

**Why not automated:** an emulator does not have a notch, a home indicator, a real Safari, or an
install-to-home-screen flow. Every safe-area and standalone-mode behaviour in Phase 2 was verified
against a rule, not against glass.

Open the site in **Safari** on an iPhone with a notch (any iPhone X or newer).

- [ ] **Bottom nav clears the home indicator.** Scroll to the very bottom of `/schedule`. The last
      row of games must be fully readable and tappable, not tucked under the nav bar or the
      indicator line.
- [ ] **No zoom on focus.** Go to `/login` and tap the email field. **The page must not zoom in.**
      This is the single most valuable check on this list. If it zooms, a control is still under
      16px and the fix in Phase 2 missed it.
- [ ] **The right keyboard appears.** Email field shows the keyboard with an `@` key. Phone field on
      `/game-report` shows a number pad. The return key says "next" rather than "go" on fields that
      have another field after them.
- [ ] **Password manager offers to fill.** On `/login`, iCloud Keychain or 1Password should offer
      the saved password. If it does not, `autoComplete` is wrong and WCAG 2.2 SC 3.3.8 fails.
- [ ] **Pinch zoom works** on `/schedule`. Try to zoom in on a game time. It must work.
- [ ] **Text size.** Settings, Accessibility, Display and Text Size, drag to maximum. Reload
      `/schedule` and `/standings`. Nothing should be cut off and nothing should scroll sideways.
- [ ] **Install to home screen.** Share, Add to Home Screen. Confirm the icon is the CMBA logo on
      black and is not squashed or clipped. Open it: it must launch without Safari's address bar,
      the content must not sit under the status bar, and the back gesture must behave sanely.
- [ ] **Rotate to landscape mid form.** Start filling in `/game-report`, type into two or three
      fields, rotate to landscape. **Nothing you typed may be lost.** *(This is the one adversarial
      matrix item that genuinely cannot be automated: Playwright's viewport resize does not
      reproduce a real orientation change.)*

## 2. Real device pass, Android (about 10 minutes)

Open in **Chrome** on a mid-range Android, ideally something in the Moto G or A-series class rather
than a flagship.

- [ ] Same bottom nav, keyboard, password manager and pinch zoom checks as above.
- [ ] **Install prompt.** Chrome should offer "Add to Home screen" or an install icon in the address
      bar. Install it and confirm the **maskable** icon renders correctly: the logo should sit
      comfortably inside whatever shape the launcher crops to, not touch the edges.
- [ ] **Shortcuts.** Long-press the installed icon. "Schedule", "My card" and "Standings" should
      appear as shortcuts and open the right pages.
- [ ] **Throttle it.** Chrome DevTools remote debugging, or just walk into a gym. Load `/schedule` on
      a genuinely weak connection and time it. Lab numbers say roughly 2.2 seconds; this is the only
      way to know what it really is.

## 3. Screen reader pass (about 15 minutes)

**Why not automated:** axe catches roughly a third of WCAG issues. It cannot judge whether alt text
is meaningful, whether the focus order makes sense, or whether an error message is understandable.

Use **VoiceOver** on iPhone (Settings, Accessibility, VoiceOver) or **TalkBack** on Android.

- [ ] **Sign in** (`/login`). Every field must announce a name, not just "text field". Submit with a
      wrong password and confirm the error is announced, not silently displayed.
- [ ] **Schedule** (`/schedule`). Swipe through a few games. Can you tell which team is home, which
      is away, and when the game is, from the announcements alone?
- [ ] **Score reporting** (`/game-report`). Work through the whole form. Confirm the required-field
      errors are announced when you submit incomplete.
- [ ] **Member card** (`/account/card`, needs a signed in account). Confirm the member number and
      name are announced and the QR code is not announced as meaningless text.
- [ ] **Headings.** Use the rotor or heading navigation. The outline should make sense and not skip
      levels. Seven routes still have known heading or contrast issues, listed on `/accessibility`.

## 4. Measure the signed-in routes (about 10 minutes)

**Why not automated here:** these all redirect to `/login` without a session, so an unauthenticated
run would silently measure the login page and report a false number. That is worse than no number.

With a test account on a **non-production** database:

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e
```

- [ ] Run axe and the mobile suite over `/account`, `/account/card`, `/manage`, `/manage/schedule`
      and `/manage/officials`. The admin console has the densest tables in the app and is completely
      unaudited for touch target size.
- [ ] Add the results to `docs/audit/BASELINE.md`.

## 5. Decisions waiting on you

- [ ] **Real user monitoring.** `docs/audit/RUM-OPTIONS.md` sets out four options and recommends a
      first-party `web-vitals` endpoint on residency grounds. Nothing was installed, because any
      such tool creates a new outbound data flow from the browsers of coaches, parents and minors.
      Until this is decided, every performance number this project reports is a lab number and is
      labelled as one.
- [ ] **Service worker.** Shipped **off**. `docs/audit/SERVICE-WORKER.md` explains what it does, what
      it deliberately refuses to cache and why, and how to kill it. Worth reading before enabling:
      the only benefit it can give this app is a branded offline page, because page documents cannot
      be cached here without caching a member's identity.
- [ ] **CI secret.** `.github/workflows/mobile-audit.yml` needs `AUDIT_DATABASE_URL` and
      `AUDIT_PAYLOAD_SECRET` pointing at a **staging or preview** database, never production. Until
      those are set, the job writes a summary explaining it skipped rather than reporting a false
      pass.

## 6. Pre-existing, unrelated to this work

- [ ] **`undici` advisory GHSA-4cwx-7wf7-3272**, high severity, cross-user information disclosure.
      `node scripts/audit-ci.mjs` fails on it, and it failed on the clean tree before this branch
      was cut (verified against a stashed checkout). It is framework-transitive and needs its own
      triage: patch it, or allowlist it in `.audit-allowlist.json` with a note in
      `docs/SECURITY.md`.
