# Real user monitoring: options for a decision

**Status: proposed, nothing installed.** No dependency was added, no script was loaded, no data
leaves the app as a result of this document. This exists because the module brief asked for a
recommendation rather than an installation.

## Why this decision exists

The performance budget in this audit is enforced against **lab** numbers: Lighthouse on one
throttled device profile, with Total Blocking Time standing in for INP. That is enough to catch a
regression in CI. It is not enough to know what a parent in a loud gym on weak cellular actually
experiences, because:

- Lab LCP is one synthetic device. Field LCP is a distribution across every real device and network.
- **TBT is not INP.** TBT measures main thread blocking during page load. INP measures how fast the
  page responds to taps across the whole session. A page can have excellent TBT and poor INP if a
  handler is slow after load, which is exactly the failure mode of a score reporting form.
- CLS in the lab covers load only. Real users accumulate shift over a session.

Without field data, this app cannot honestly claim Core Web Vitals compliance. It can only claim
its lab proxies pass.

## The privacy problem this creates

This app handles minors' data and is built to a Canadian residency posture: Supabase Postgres and
Storage in `ca-central-1`, Vercel functions pinned to `yul1`, SES in `ca-central-1`, documented in
`cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md`.

Any RUM tool adds a **new outbound data flow from the browsers of coaches, parents, officials, and
minors**. Three things have to be true before one is acceptable here:

1. **Residency.** Beacons must land in Canada, or the tool must be self hosted on infrastructure
   already in scope. A US or EU ingestion endpoint reopens a question the residency doc has already
   answered.
2. **No personal data in the beacon.** Web Vitals beacons carry a URL. On this app a URL can be
   personal: `/account/card`, `/manage/officials`, a bracket id, a `?redirect=` parameter. Any
   integration must send a **route pattern**, not the resolved path, and must never send query
   strings.
3. **Consent.** The app already has a granular consent model (`ConsentRecords` plus the
   `users.consents` group). Analytics that is not strictly necessary belongs behind an opt in, and
   signed out visitors need a defensible legal basis.

## The options

### Option A, recommended: `web-vitals` plus a first party endpoint

Add the `web-vitals` npm package (about 2 kB, from Google, no network calls of its own) and post
its readings to a route handler already inside this app. Store aggregates in a Payload collection.

- **Residency**: perfect. The beacon goes to this app's own origin, which runs on Vercel `yul1` and
  writes to the ca-central-1 database. No third party sees anything. No new vendor, no new DPA.
- **Data**: total control. Send the Next.js route pattern, the metric name, the value, and a coarse
  connection type. Nothing else. No cookies, no visitor id, no session stitching, therefore no
  personal information and arguably nothing that needs consent.
- **Cost**: no vendor cost. Some build cost: a route handler, a collection, a rate limit (reuse the
  existing `RateLimitHits`), and a small dashboard or a SQL view.
- **Trade off**: no vendor dashboard. Percentiles have to be computed, which is one query. Sampling
  needs to be chosen, and 10 percent is plenty at this traffic level.
- **Risk**: writes from unauthenticated browsers are a new abuse surface. Mitigate with sampling, a
  strict payload schema, a per IP rate limit, and no read access without an admin role.

This is the recommendation because it is the only option that adds field data **without adding a
data processor**, and the residency posture is the hardest constraint in the room.

### Option B: Vercel Speed Insights

`@vercel/speed-insights`, one component in the layout, real Core Web Vitals including INP, split by
route, in the Vercel dashboard the app already deploys to.

- **Residency**: needs verification and is the blocking question. Vercel's analytics ingestion is
  not obviously covered by the `yul1` function region pinning. Function region and analytics region
  are different things. Do not adopt without a written answer.
- **Data**: Vercel documents it as cookieless and without persistent visitor ids, which is a good
  posture. It does report the path, so the route pattern versus resolved path question still has to
  be checked for `/account/card` and `/manage/...`.
- **Cost**: a paid add on per project beyond the free tier.
- **Trade off**: least work by a wide margin, real INP out of the box, and a real dashboard. It adds
  a processor and a residency question.

### Option C: self hosted, for example Umami or Matomo on Canadian infrastructure

- **Residency**: solved by choosing where to host it.
- **Cost**: a server, patching, backups, and an uptime obligation, forever.
- **Trade off**: the most control and the most operational burden. Hard to justify for one metric
  stream when Option A gets the same data with no new service to run.

### Option D: do nothing, keep lab only

Legitimate, and the correct answer if nobody will look at the data. The cost is that this app
never knows its real INP, and the first signal that score reporting is slow on a mid range Android
will be a coach complaining.

## Recommendation

**Option A**, with Option B as the fallback if a Vercel Speed Insights residency answer comes back
clean and the time saving matters more than avoiding a processor.

If Option A is approved, the shape is:

- `web-vitals` reports LCP, INP, CLS, TTFB from the client.
- `POST /api/v1/vitals` accepts `{ metric, value, routePattern, connectionType }` and nothing else.
  It rejects anything with a query string or an unknown route pattern.
- 10 percent sampling, per IP rate limited through the existing `RateLimitHits` collection.
- A `client-vitals` collection, admin read only, no user reference, no IP stored.
- Retention: 90 days, then purge.

Estimated effort: half a day, plus a short privacy note appended to the residency doc.

## What is needed to proceed

A decision on which option, and for Option A a confirmation that an unauthenticated,
non-identifying, sampled beacon to a first party endpoint is acceptable without a consent prompt.
Nothing in this audit is blocked on the answer. Phases 0 through 5 gate on lab numbers and are
explicit about it.
