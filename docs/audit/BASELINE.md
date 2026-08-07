# Mobile audit baseline

Captured 2026-08-07 on branch `feat/mobile-audit`, before any product change.

Everything in this file is a **lab measurement**. This app has no analytics and no real user
monitoring, so no number here is a field measurement and none of it supports a claim about the
75th percentile of real users. See "Field metrics" below.

## How this was captured

| | |
|---|---|
| Build | `npm run build` then `npm start`, local production server on port 3000 |
| Database | the live ca-central-1 Supabase project, read only. No writes, no migrations. Only publicly readable routes were walked, so no personal data was exercised. |
| Device profile | Pixel 5 viewport (393x851, DPR 2.75), mobile user agent, touch enabled |
| Lighthouse | v12 via `@lhci/cli`, 3 runs per route, median reported. Simulated throttling: 150ms RTT, 1.6 Mbps down, 4x CPU slowdown |
| Transfer capture | Playwright, `scripts/audit/capture-baseline.mjs`, unthrottled localhost |

Regenerate with:

```bash
npm run build && npm start &
npm run audit:baseline        # transfer + axe, writes docs/audit/baseline.json
npm run audit:lighthouse      # Lighthouse, writes docs/audit/lighthouse-baseline.json
```

## Core Web Vitals, lab, mobile throttled

Median of 3 runs. Budget targets: LCP 2500ms, CLS 0.1. Alert thresholds (80 percent of target):
LCP 2000ms, CLS 0.08. TBT stands in for INP at a 160ms alert, because INP cannot be measured
without field data.

| Route | Perf | A11y | Best prac. | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | 86 | 96 | 100 | 91 | **3365ms** | 1222ms | **230ms** | 0.046 |
| `/schedule` | 90 | 96 | 100 | 100 | **3284ms** | 946ms | 27ms | 0.002 |
| `/standings` | 91 | 100 | 93 | 100 | **3146ms** | 923ms | 20ms | 0.002 |
| `/rules` | 91 | 94 | 100 | 100 | **3288ms** | 1078ms | 20ms | 0.002 |
| `/login` | 85 | 98 | 100 | 100 | **4081ms** | 929ms | 35ms | 0.002 |

Bold marks a value outside budget.

**Every route fails the LCP target.** Nothing passes even the 2500ms target, let alone the 2000ms
alert threshold. CLS passes everywhere. TBT passes everywhere except the homepage.

`/account` is not measured. The proxy redirects it to `/login` without a session cookie, so an
unauthenticated Lighthouse run would silently measure the login page instead and report a false
number. `/login` is measured in its place and is the honest proxy for the signed out entry path.
Measuring the signed in routes needs a reviewer style test account and is listed as an operator
task in `docs/audit/OPERATOR-CHECKS.md`.

### Where the LCP time actually goes

The LCP element is **text on every route**, not an image. Load delay and load time are 0ms in all
five cases. The time is render delay:

| Route | TTFB share | Render delay share | Server response |
|---|---|---|---|
| `/` | 461ms (10%) | 4203ms (90%) | 15ms |
| `/schedule` | 1025ms (27%) | 2772ms (73%) | 491ms |
| `/standings` | 462ms (15%) | 2685ms (85%) | 113ms |
| `/rules` | 459ms (14%) | 2829ms (86%) | 13ms |
| `/login` | 460ms (11%) | 3626ms (89%) | 14ms |

Server response time is healthy. The problem is between first paint (roughly 0.9 to 1.2s) and the
largest text block painting (roughly 3.1 to 4.1s), on a main thread busy parsing and running
JavaScript under a 4x CPU slowdown.

**A hypothesis that was tested and rejected.** The obvious suspects were the full screen `.intro`
counter overlay in `GlobalFX` and `.reveal { opacity: 0 }` in `globals.css`, both of which hide
content until JavaScript runs. A control run with `--force-prefers-reduced-motion`, which skips the
intro and forces every reveal visible, produced **LCP 3630ms against the 3365ms baseline**: no
improvement. The intro and the reveal animations are not the cause. This is recorded so Phase 3
does not spend effort on the wrong target.

## JavaScript and transfer weight

Compressed bytes actually received, unthrottled localhost, 29 public routes walked.

| | Min | Median | Max |
|---|---|---|---|
| Script | 557.2 kB | 572.4 kB | 688.2 kB (`/rules`) |
| Total page | 804.8 kB | 933.7 kB | 1158.6 kB (`/coach`) |

Script transfer is **flat at roughly 560 to 580 kB on every route**, which says most of it is a
shared bundle loaded everywhere rather than per route code. That is the single biggest lever on the
render delay above.

Full per route detail: `docs/audit/baseline.json`.

### three.js, measured

The module brief flagged `three` and `@react-three/fiber` as an unmeasured mobile risk and asked
for numbers before any decision. Here are the numbers.

| Route | Chunks | Uncompressed JS | three.js chunk loaded? |
|---|---|---|---|
| `/` | 12 | 664 kB | **no** |
| `/schedule` | 11 | 646 kB | **no** |
| `/arcade` | 14 | 1506 kB | yes, 834 kB |

Measured at network idle plus 2.5 seconds, so this is not a race that a slower load would lose.

**three.js costs the parent audience nothing.** It is already correctly isolated behind the arcade
route. The existing lazy loading is doing its job. No decision is required from the operator on
this point, and none of the options in the brief (reduced fidelity, static fallback, data saver
gating) would improve the schedule or homepage experience, because the code is not there to begin
with. This finding is carried into Phase 3 as "no action", with the measurement as the evidence.

## Accessibility

axe-core, WCAG 2.0/2.1/2.2 A and AA plus best practice rules, at a 390x844 phone viewport, across
29 public routes.

**Two violation types, 25 route instances. Nothing else.**

| Rule | Routes affected | Impact |
|---|---|---|
| `color-contrast` | 15 | serious |
| `heading-order` | 10 | moderate |

Affected routes are listed per route in `docs/audit/axe-baseline.json`, which the a11y suite reads
as its forgiven set: a violation id already in that file is reported but does not fail the build, a
new id fails immediately. That is what lets the suite go green today and still block regressions
from day one. Phase 4 removes the entries as it fixes them.

Lighthouse's own accessibility category scores 94 to 100, consistent with the above.

## Layout

Zero routes overflow horizontally at 393px. The `overflow-x-clip` on `<main>` in the frontend
layout is working. This is a genuinely clean result and Phase 2 adds a test to keep it that way at
360px, 390px and tablet widths.

## Rendering and caching

Every one of the 49 routes builds as `ƒ` (dynamic, server rendered on demand). None are static.
This is a direct consequence of `await headers()` in `src/app/(frontend)/layout.tsx`, which is
deliberate: it opts the site into dynamic rendering so Next applies the per request CSP nonce set
in `src/proxy.ts`. Without it, statically rendered pages would ship un-nonced scripts that the
strict nonce policy would block.

So the finding in the brief is confirmed: the CSP nonce does suppress static caching, site wide.
Server response time is nonetheless good (13 to 491ms), so this is not currently the bottleneck.
Phase 3 documents it rather than weakening the CSP to chase it.

## Resilience, before

- `error.tsx`: 0
- `loading.tsx`: 0
- `global-error.tsx`: 0
- `not-found.tsx`: 1, and it belongs to the Payload admin, not the site

A failed or slow fetch on any of the 49 routes renders nothing.

## Field metrics: what cannot be claimed

INP and LCP "at the 75th percentile of real users" are field metrics. They need real user
monitoring, which this app does not have. Everything above is a lab proxy:

- LCP here is Lighthouse's simulated value on one device profile, not a distribution.
- **TBT is used as an INP proxy and is not INP.** It measures main thread blocking during load;
  INP measures interaction responsiveness across the whole session. A good TBT makes a good INP
  more likely and does not guarantee it.
- CLS here covers load only, not the session accumulated value a real user experiences.

CI gates on these lab numbers and labels them as such. A RUM option is proposed for approval in
`docs/audit/RUM-OPTIONS.md` and **has not been installed**, because any such tool touches user
data and needs a residency and privacy decision first.

## Pre-existing issue, not introduced by this work

`node scripts/audit-ci.mjs` fails on the clean tree at the point this branch was cut, on one
newly disclosed high severity advisory: `undici` GHSA-4cwx-7wf7-3272, cross user information
disclosure via degenerate private cache directives. Verified pre-existing by running the gate on a
stashed clean checkout. It is framework transitive and out of scope for this module. It needs its
own triage: patch it, or allowlist it in `.audit-allowlist.json` with a note in `docs/SECURITY.md`.
