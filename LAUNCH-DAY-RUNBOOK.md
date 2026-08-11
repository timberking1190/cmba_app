# LAUNCH-DAY-RUNBOOK.md

Tuesday 2026-09-01. What to do, in order, on the day CMBA+ opens to families.

Copy rule: no em or en dashes anywhere.

**The launch is reopening public registration. It is not a deploy.** No code merges on
launch day. The code has been in production and soaking since 2026-08-05. If anyone
proposes shipping a change on Sept 1, the answer is no: ship it on Aug 29 and let it
soak for three days, or ship it on Sept 3.

The whole day is one environment variable and its verification.

---

## Before the day: the freeze

**From Friday 2026-08-28, `main` is frozen** except for a defect that would itself block
launch. The last three days exist so that what launches is what soaked, and so nobody is
debugging a fresh deploy at 9am on Tuesday.

If something must ship during the freeze, it gets the full treatment: green CI, a
production deploy verified by hand, and at minimum a full day of soak before the flip.

---

## Part 1: pre-flip checklist

Do not flip until every line is true. Each is checked by observing the running system,
not by remembering that someone did it.

### Blocking. Do not open registration without these.

| # | Check | How | Owner |
|---|---|---|---|
| 1 | A guardian consent email arrives in a real inbox, end to end | Register a test minor on a preview, watch the guardian email land, act on it, confirm a row appears in `consent_records` | OPERATOR |
| 2 | SES holds production access and is out of sandbox | AWS console | OPERATOR |
| 3 | `email_send_log` shows recent delivered rows, not just attempts | Query the table | ENG |
| 4 | Error monitoring is live and someone is actually alerted | Throw a test error, confirm it appears AND that an alert reaches a human | OPERATOR |
| 5 | `PolicyVersions` privacy version matches shipped copy (`2026-07-01`) | `/admin`, Compliance, Policy Versions | OPERATOR |
| 6 | The registration rate limit has been raised from 50 per hour globally | Confirm the deployed value fits expected launch-day volume | ENG |
| 7 | CI is green on `main`, all three workflows | GitHub Actions | ENG |
| 8 | A database backup completed within the last 24 hours, and a restore has been tested at least once | Supabase dashboard | OPERATOR |
| 9 | The rollback has been rehearsed: the flip has been exercised in both directions on a preview | Runbook entry exists showing it was done | ENG |

Item 6 deserves emphasis. The gate currently allows **50 sign-ups per hour globally and
fails closed**. For 589 teams' families that will produce a wall of "Too many sign-ups
from this connection" within the first hour, which looks exactly like an outage to a
parent and exactly like success to a dashboard.

### Non-blocking, but decide deliberately

| # | Check | Note |
|---|---|---|
| 10 | `/schedule` and `/standings` both read from CMBA Connect | If `/standings` still falls back to TeamLinkt, that is cosmetic on launch day and not a reason to hold |
| 11 | The `image-size` advisories are cleared via the Payload upgrade | If it did not land, the accepted risk stands and is documented |
| 12 | The second Vercel project `cmba_app` is deleted or locked down | Should be done well before this |

### Timing

Flip at **09:00 Mountain**, not late in the day. You want the whole working day in front
of you, with the people who can fix things awake and available. Do not flip on a Friday,
and do not flip the evening before and go to bed.

---

## Part 2: the flip

```
Vercel  ->  project cmba_platform  ->  Settings  ->  Environment Variables
Edit REGISTRATION_MODE, Production scope
    closed   ->   open
Save, then redeploy the current production deployment.
```

**The redeploy is mandatory.** Vercel applies environment variable changes only to a new
deployment. Changing the value and not redeploying leaves registration closed while the
dashboard says otherwise, which is the most likely way this day goes wrong.

Write down the deployment id you redeployed from. It is the rollback target.

```
Rollback target (fill in on the day):  dpl_________________________
```

Expect roughly two minutes. Watch the deployment reach READY before testing.

---

## Part 3: verify the flip, within five minutes

### The gate probe, first

This creates nothing, so it is safe to run against production:

```
curl -s -X POST "https://cmbaplatform.vercel.app/api/users" \
  -H "Content-Type: application/json" -H "x-cmba-hp: probe" -d '{}'
```

| Response | Meaning |
|---|---|
| `400 "Sign-up rejected."` | **Open.** The honeypot fired, which means the mode check passed. This is what you want. |
| `403 "Public sign-up is currently closed…"` | **Still closed.** The redeploy did not happen or did not carry the new value. |

### Then a real registration, by a human

The probe proves the gate opened. It does not prove a family can register. Do this next,
by hand, on a phone:

1. Register a real test account through `/signup` as a parent with a child.
2. Confirm the guardian consent email **arrives**, in a real inbox, not just a log row.
3. Complete the consent action and confirm a row lands in `consent_records`.
4. Sign in as that account and reach the correct hub.

If step 2 fails, roll back. Everything else is recoverable; a registration path that
collects a child's data and never delivers the consent artefact is not.

### Then one task per hub

Mobile and desktop:

| Hub | Task |
|---|---|
| Athlete | Reach the hub, complete one real action |
| Parent | Reach the hub, complete one real action |
| Coach | Reach the hub, complete one real action |
| Referee or official | Reach the hub, complete one real action |

---

## Part 4: what to watch, and for how long

### First hour, watched actively by a human

| Signal | Where | Healthy | Act if |
|---|---|---|---|
| Error rate | Sentry, or Vercel runtime errors | Flat | Any new error group appears and repeats |
| HTTP 5xx | Vercel runtime logs, group by `statusCode` | Near zero | Sustained 5xx |
| HTTP 429 | Same | **Zero** | Any at all. This is the rate limit throttling real families |
| Registrations completing | `users` row count climbing | Rising steadily | Rises then stops while traffic continues |
| Consent records | `consent_records` climbing **in step with** minor registrations | Tracking together | The two diverge |
| Email delivery | `email_send_log` | Rows with delivered state | Attempts without deliveries |
| Function duration | Vercel | Stable | Climbing toward the timeout |
| Database connections | Supabase | Below pool max | Approaching the ceiling |

The two that matter most are **429s** and **consent records diverging from
registrations**. The first means you are turning families away. The second means you are
collecting children's data without the consent artefact, which is the one failure that
is not merely an outage.

### First day

Check at 1 hour, 4 hours, and end of day. Do not close the laptop at 9:30 because the
first ten minutes were quiet: the load arrives when the announcement circulates, which is
often the evening.

### First week

Daily until Sept 8. Watch for what only appears at volume: N+1 queries on hub landing
pages, connection pool exhaustion, and the cron jobs interacting with real data volume
for the first time.

---

## Part 5: rollback

**Rollback is flipping the variable back.**

```
Vercel  ->  cmba_platform  ->  Settings  ->  Environment Variables
REGISTRATION_MODE:  open  ->  closed
Save, then redeploy.
```

Roughly two minutes. Existing users, sign in and every hub keep working throughout. Only
new public sign-ups stop.

### If the problem is the code rather than the gate

Vercel Instant Rollback, which serves an already built artefact with no rebuild:

```
https://vercel.com/kens-projects-de23e592/cmba_platform
Deployments  ->  last known good  ->  Promote to Production
```

### Decide in advance what triggers a rollback

Agree these before the day, so the decision is not made under pressure by a tired person:

- **Roll back immediately:** guardian consent email is not being delivered; personal data
  appears in logs or error payloads; any unauthorised access to another member's data.
- **Roll back if not fixed within 30 minutes:** sustained 5xx on the registration path;
  429s hitting real families; registrations completing without consent records.
- **Do not roll back:** cosmetic issues, `/standings` falling back to TeamLinkt, slow but
  succeeding pages. Fix forward after the day.

### After any rollback

Say so publicly and quickly. An association that tells families "registration is paused
for a couple of hours, your information is safe" keeps their trust. One that goes quiet
does not.

---

## Part 6: after the day

- Record what happened in `LAUNCH-RUNBOOK.md`, including anything surprising.
- Score `LAUNCH-ACCEPTANCE.md` against what actually occurred.
- Keep the freeze until Sept 3, then resume normal merges.
- Do not delete the closed-mode capability. `REGISTRATION_MODE=closed` remains the
  fastest way to stop the bleeding if something is discovered in week two.
