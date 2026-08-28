# Manual device check, one real iPhone and one real Android

Roughly 12 minutes per device. The automated suite covers emulated iPhone 13 and
Pixel 5, but emulation cannot reproduce real touch targets, real font rendering, the
real address bar collapsing on scroll, or a real gym network. That is what this is for.

Copy rule: no em or en dashes.

## Before you start

- Use the URL under test. Production is `https://cmbaplatform.vercel.app`.
- Use a **private or incognito** window on both devices. The site stores a
  `cmba_intro` flag in sessionStorage that suppresses the percentage intro screen, so
  a normal window will not show you what a first time visitor sees.
- Do the first pass on **cellular, not wifi**. Most of these pages get opened in a gym.
- If you can, turn on Settings > Accessibility > Motion > Reduce Motion for step 8.

## The one thing to watch for throughout

The defect that started this was content that was present but invisible, so the page
looked blank or half empty until you scrolled. **At every step, judge the screen the
moment it settles, before you touch it.** If you have to scroll to discover that
something was there, write it down.

## Steps

**1. Sign in page, the headline case.** Open `/login`.
- Without scrolling, you should see: the CMBA logo, "CMBA+ ACCOUNT", the SIGN IN and
  CREATE ACCOUNT tabs, the Email field, the Password field, and the red SIGN IN button.
- FAIL if the page looks empty or nearly empty, if the heading is faint or ghosted, or
  if any part of the form only appears after you scroll.
- Check the red SIGN IN button text is clearly readable, not dark grey on red.

**2. Sign in page, the rest.** Scroll down. Below the form you should find the
"Reporting a game score?" link, the training and education explainer, and the four hub
cards. They may fade in as they arrive, which is intended. They must not stay invisible.

**3. Schedule.** Open `/schedule`.
- The heading should be complete, with no letters clipped along the top or bottom.
- With no season published, expect "No games scheduled yet", the date of the last
  recorded game, and two buttons: last season's results, and Check TeamLinkt.
- FAIL if you see a bare "No upcoming games right now." with no explanation.
- Tap "See last season's results" and confirm games appear.
- Tap "Check TeamLinkt" and confirm it opens a real TeamLinkt page, not a marketing
  page or an error.

**4. The old schedule URL.** Type `/calendar` in the address bar. It must land on
`/schedule`. FAIL on a 404 or a second, different looking schedule page.

**5. Standings.** Open `/standings`.
- Expect either a real standings table, or the embedded TeamLinkt view showing division
  names, or a clear panel saying the TeamLinkt view will not load with a working button.
- FAIL on a large blank grey or white rectangle, or a broken image icon.
- If the embed loads, scroll inside it and confirm it does not trap the page scroll.

**6. Game report.** Open `/game-report`.
- Without scrolling you should see the heading and both choices, Concern and Compliment.
- Tap Concern. The form should open with the description field showing its 50 character
  minimum. Do not submit.

**7. The 404.** Type a nonsense path such as `/does-not-exist-please`.
- Expect "Page not found", a plain explanation, links to Schedule, Standings, Rules,
  Resources and Contact, and a Return home button. Tap Return home.

**8. Reduced motion.** With Reduce Motion enabled, reload `/login` and `/`.
- Everything must be immediately visible with no animation.
- FAIL if any content is missing, faint, or stuck invisible. This is the exact failure
  mode being guarded against: skipping the animation must not skip the content.

**9. Sideways scrolling.** On every page above, try to swipe horizontally.
- The page must not move sideways. Wide things such as a standings table or the
  TeamLinkt embed may scroll within their own box, which is fine.

**10. Rotate.** Turn the phone landscape on `/login` and `/schedule`, then back.
- Nothing should be cut off, overlapped, or hidden behind the bottom nav bar.

**11. Tap targets.** On `/schedule` and `/login`, tap the bottom navigation, the tabs,
and the buttons. Nothing should need a careful or repeated tap.

**12. Theme.** Tap the sun or moon icon in the header to switch theme, on `/login` and
`/schedule`.
- Text must stay readable in both. Pay attention to text on red buttons.
- Reload after switching and confirm the choice sticks.

## What to send back

For anything that fails, the page, the step number, and a screenshot. A short screen
recording is better than a description for anything about fading or timing.

Note your device and OS version, for example "iPhone 14, iOS 18.5, Safari" and
"Pixel 7, Android 15, Chrome". Rendering differences between Safari and Chrome are
real and worth attributing: WebKit and Chromium already diverged once during this
work, on `upgrade-insecure-requests`.
