# LAUNCH-RUNBOOK.md

Every action taken on the road to Sept 1 2026, and the rollback for each one. Append
only, newest section at the bottom. If an action has no rollback, that is stated
explicitly rather than left blank.

Copy rule: no em or en dashes anywhere.

## Standing facts

Verified 2026-08-10. Re-verify rather than trust if you are reading this later.

| Thing | Value |
|---|---|
| Repository | `github.com/timberking1190/cmba_app`, production branch `main`, **public** |
| Branch protection on `main` | **None.** A push to `main` deploys production with nothing blocking it |
| Auto deploy | **Yes.** Vercel Git integration builds and promotes on every push to `main`. GitHub Actions only verifies, it never deploys |
| Vercel project | `cmba_platform`, `prj_GsGGoKMTiKOPm2PGVIMkUZjSG3sS`, team `team_LspUbWfh92rsJ1BMqujxZlV5`, functions pinned to `yul1` Montreal |
| Second Vercel project | `cmba_app` also builds this repository. Only `cmba_platform` serves production. Unresolved, see open items |
| Production URL | `https://cmbaplatform.vercel.app`, Payload admin at `/admin` |
| Database | Supabase `pdwautioosstdgbbblxl` (`cmba-connect`), `ca-central-1` |
| Staging databases | Supabase `cmba-connect-staging` and `cmba-staging`, both `ca-central-1` |
| Deployment protection | Vercel SSO, `all_except_custom_domains`. Previews are walled, the production alias is not |
| Migration state | 31 applied, batch 24, current with `main` |
| Full unit suite | `npm test`, 643 tests across 69 files |
| E2E suite | `npm run test:e2e`, currently inert because `E2E_BASE_URL` is unset |

## Standing rollback: Vercel Instant Rollback

For any code deploy, the fastest reversal is promoting the previous production
deployment. It serves an already built artefact, so there is no rebuild wait.

```
https://vercel.com/kens-projects-de23e592/cmba_platform
Deployments, pick the last known good, Promote to Production
```

Known good deployments, newest first:

| Deployment | Commit | Notes |
|---|---|---|
| `dpl_DtHfLZndbNMKp9hfyGiF4LRbaZgL` | `32a2ce6` | Current production as of 2026-08-11 |
| `dpl_5mCriQrw3PWzqKfZZTJyy7EAkp1t` | `caca843` | First deployment carrying `REGISTRATION_MODE=closed` |
| `dpl_72kRxKcy5u26Dk4xRRjzyLH9SjeJ` | `caca843` | Registration still open on this one. Rolling back this far REOPENS public sign-up |
| `dpl_8FUZfZPcKvpV94pdWvE4CG5sTxqJ` | `ae2a344` | Served 2026-08-05 to 2026-08-10, registration open |

---

## 2026-08-10

### Action 1: push `feat/mobile-audit` to origin (backup, not a merge)

Seven commits of accessibility, mobile and PWA work existed only on one laptop.

```
gitleaks detect --source . --redact --no-banner --config .gitleaks.toml \
  --log-opts "$(git merge-base origin/main feat/mobile-audit)..feat/mobile-audit"
git push -u origin feat/mobile-audit
```

Result: no leaks found, branch pushed at `cd0f604`. Not merged, no production effect.

**Rollback.** `git push origin --delete feat/mobile-audit`. Harmless either way, since
the branch is not merged and does not deploy production.

### Action 2: merge PR #54, the security fix (production deploy)

Cleared the red `audit-ci` gate that was blocking all other work.

```
gh pr merge 54 --repo timberking1190/cmba_app --merge
```

Result: merged 2026-08-11T03:40:46Z as `caca843`. Vercel auto deployed
`dpl_72kRxKcy5u26Dk4xRRjzyLH9SjeJ`, state READY.

**Pre merge verification.** `audit-ci` OK with 0 un-allowlisted, 643/643 tests,
`tsc --noEmit` clean, `eslint --max-warnings=0` clean, `gitleaks protect --staged` no
leaks, all 8 PR checks passing including a real Vercel preview build.

**Minors' data safety.** No migration and no schema change. No access control or RLS
change. No new public path to personal data. No logging change. The diff is 4 files:
two dependency lines and two documentation blocks. No backup taken, and none required,
because nothing in this change writes to the database. See D-006.

**Post deploy verification.** `/`, `/signup`, `/login`, `/schedule`, `/standings` all
200 and `/account` 307 to login, all served by `dpl_72kRx`. CI and Security both green
on `main`. Runtime errors over 24h: one group, a pre existing TeamLinkt upstream fetch
timeout first seen 2026-06-22 on the previous deployment, not introduced by this change.
Runtime logs for the new deployment contain paths and status codes only, with no
personal data in any line.

**Rollback.** Instant Rollback to `dpl_8FUZfZPcKvpV94pdWvE4CG5sTxqJ`, or

```
git revert -m 1 caca843 && git push origin main
```

### Action 3: close public registration (OPERATOR action, production deploy)

Guardian confirmation email does not deliver while SES is sandboxed, so registration is
closed until it does. See D-003.

```
Vercel, project cmba_platform, Settings, Environment Variables
Add, Production scope only:
    REGISTRATION_MODE = closed
Then redeploy the latest production deployment.
```

The redeploy is required. Vercel applies environment variable changes only to a new
deployment.

**Effect.** Existing users, sign in and every hub are untouched. Only new public self
registration is refused, with `Public sign-up is currently closed. Please contact CMBA
to be added.` Admin created accounts continue to work.

**Rollback.** Delete the variable or set it to `open`, then redeploy. This is the same
operation as the Sept 1 launch flip, in reverse.

**Verification once done.** Confirm `/signup` still renders, that an anonymous create
attempt is refused with 403, and that sign in for an existing user is unaffected.

**Status: DONE 2026-08-10.** OPERATOR set the variable and redeployed; production is
served by `dpl_5mCriQrw3PWzqKfZZTJyy7EAkp1t`.

Verified:

```
POST /api/users  ->  403
{"errors":[{"message":"Public sign-up is currently closed. Please contact CMBA to be added."}]}
```

`/`, `/login`, `/signup`, `/schedule`, `/standings` all still 200, and
`POST /api/users/login` still answers 400 on an empty body rather than 403, which
confirms sign in for existing users is untouched. Runtime errors in the hour after the
change: none. The 403 log payload carries `"data": null`, and the login validation error
logs a field name rather than a field value, so no personal data reaches the logs.

**The standing probe.** This is the check for the gate in either direction, and it
creates nothing, because the honeypot and the mode check both reject before any write:

```
curl -s -X POST "https://cmbaplatform.vercel.app/api/users" \
  -H "Content-Type: application/json" -H "x-cmba-hp: probe" -d '{}'

closed -> 403 "Public sign-up is currently closed. Please contact CMBA to be added."
open   -> 400 "Sign-up rejected."   (the honeypot firing, which means the mode check passed)
```

Note that a plain POST without the honeypot header, when registration is open, gets as
far as the rate limiter and writes a `RateLimitHits` row. Use the honeypot form.

### Action 4: commit the launch artefacts

`LAUNCH-ACCEPTANCE.md`, `DECISION-LOG.md`, `LAUNCH-RUNBOOK.md` and the previously
uncommitted `docs/CUTLINE_SEPT1.md`, on branch `docs/launch-artifacts`.

**Rollback.** Documentation only. Revert the merge commit if unwanted.

---

---

## 2026-08-11

### Action 5: raise the registration rate limits (PR #58)

The gate was hardcoded at 5 per IP per hour and 50 per hour globally, both failing
closed. The global cap would have throttled Sept 1 inside the first hour while every
dashboard still read healthy, because refusing traffic is not an error from the
server's point of view. The per-IP cap of 5 was hit exactly by one household
registering three children plus two parent accounts.

Now 20 per IP and 2000 globally, both overridable via `REGISTER_RATE_LIMIT_IP` and
`REGISTER_RATE_LIMIT_GLOBAL`. A malformed, zero or negative override falls back to the
default rather than being obeyed, since a typo setting 0 would refuse every
registration in the association. Verified 650 tests, tsc and eslint clean.

Inert until the Sept 1 flip, because registration is closed.

**Rollback.** `git revert -m 1 2351bf7 && git push origin main`, or set the env vars to
the old values, which needs no deploy of code.

### Action 6: make the browser gate runnable, and stop it publishing reports (PR #61)

The e2e job was a check that could not fail: about six seconds, always green, because
`E2E_BASE_URL` is unset. Setting that variable alone would not have fixed it, since
previews sit behind Vercel SSO and both tools would have failed against the SSO wall,
Lighthouse silently reporting a healthy score for an interstitial.

Wired Protection Bypass for Automation through `playwright.config.ts` (bypass header
plus `x-vercel-set-bypass-cookie`, which is what makes it survive in-browser
navigation), `lighthouserc.cjs`, and `e2e.yml`. Header names confirmed against Vercel's
current documentation. Headers attach only when the secret is present, and a
`vercel.app` target with no secret now prints a warning rather than failing
mysteriously.

**Also fixed a latent privacy defect.** `lighthouserc.cjs` uploaded to
`temporary-public-storage`, which posts the report to a public URL, and a Lighthouse
report embeds a full-page screenshot and the final DOM of every page it visits. Pointed
at a preview rendering member data that would have published children's personal
information to an unauthenticated link. It was latent only because the gate has never
run, so it would have detonated on activation rather than before. Reports now go to the
filesystem and are kept as a CI artifact.

**Rollback.** `git revert -m 1 ba41c76 && git push origin main`. Test harness and CI
only; no runtime code.

### Action 7: land the outstanding backlog (PRs #45, #46, #47, #48, #59, #60)

All six were fully green and secret-scanned before merging.

| PR | What | Risk |
|---|---|---|
| #45 | `docs/OPERATOR_ACTIONS.md` accuracy pass | docs only |
| #46 | Governance: ADR 0004, DPA execution, pentest RFP, processor register | docs only |
| #47 | `docs/launch-blockers/BROWSER_RUNBOOK.md` | docs only |
| #48 | Scheduler can actually reach the scheduling console | runtime, reviewed below |
| #59 | `actions/upload-artifact` 4.6.2 to 7.0.1 | CI only |
| #60 | `zaproxy/action-baseline` 0.12.0 to 0.15.0 | CI only |

**#48 is an access-control change, so it got a rule 5 review rather than a glance.** It
widens four admin API routes and the account page card from `isAnyAdmin` to
`canManageScheduling`, which is `isAnyAdmin(user) || isScheduler(user)`. The safety
property that makes this sound is that `scheduler` sits in `ADMIN_ASSIGNED_ROLES`, and
`sanitizeSelfServiceRoles` preserves admin roles a user already holds while refusing to
grant new ones, so a member cannot escalate themselves into it. The sensitive surfaces
stay where they were: the Payload admin panel and the compliance dashboard remain
`isAnyAdmin`, and the consent audit remains `isSuperAdmin`.

Verified on production after the deploy: `/api/v1/admin/standings/recompute`,
`/api/v1/admin/schedule/generate` and `/api/v1/admin/brackets/seed` all still answer
**401** to an unauthenticated caller, so the widening did not open them up.

**Rollback.** Revert the individual merge commit. #48 is the only one with runtime
effect.

### Post-deploy verification, 2026-08-11

Production is served by `dpl_DtHfLZndbNMKp9hfyGiF4LRbaZgL`.

- `/`, `/login`, `/signup`, `/schedule`, `/standings` all 200; `/account` and `/manage`
  both 307 to login.
- Registration gate still closed: `POST /api/users` returns 403.
- The three widened admin routes return 401 unauthenticated.
- Runtime errors in the hour after: none.
- No personal data in logs. The 403 payload is `data: null`.

### HELD, deliberately not merged

**PR #55, the 26-package dependabot group.** This is the natural vehicle for the
deferred Payload 3.85.1 to 3.87.0 upgrade that would clear both accepted `image-size`
advisories, and it should be taken during the soak. It is not mergeable today:

- `npm ci` fails with `Missing: @esbuild/win32-x64@0.28.2 from lock file`. The lockfile
  is internally inconsistent.
- Its own CI agrees: Dependency audit FAIL and Lint, typecheck, test FAIL.

Fix by closing it and letting Dependabot regenerate against current `main`, or by
rebuilding the lockfile by hand. Do not merge it on red. Note that it does carry the
`nanoid` override from PR #54, so taking it later will not silently revert that fix.

**Nine further Dependabot PRs are open and should stay open until after launch.** They
are major version bumps: TypeScript 6, Tailwind 4, ESLint 10, graphql 17,
`@types/node` 26, `cross-env` 10, `actions/checkout` 7, `actions/setup-node` 7. Each is
a breaking-change upgrade with no launch value, and "merge everything" should not be
read to include them 21 days out.

### A flaky test, found while merging

`src/components/manage/__tests__/ImportConsole.test.tsx`, the case "clears a stale error
message when a new file is chosen", timed out at 5000 ms on CI and then passed on a
re-run of the identical commit. It is a `waitFor` on a fetch-driven state update inside
a 5 second budget: comfortable locally, marginal on a slower runner.

This matters more than one irritating red. The rule here is never merge on red, and a
test that fails at random teaches everyone to re-run and shrug, which is how a real
failure gets waved through. On launch day it could block a hotfix for no reason. Fix is
small: raise that test's timeout or its `waitFor` budget.

## Open items carried forward

1. **`feat/mobile-audit` merge decision.** 28 conflicts against `main`, because it
   reimplemented work `main` already has. Recommendation is to cherry pick the
   accessibility fixes rather than merge. See D-005.
2. **A second Vercel project, `cmba_app`, builds this repository and is publicly
   reachable while broken.** `prj_rfb8gdshzTFHjOsPmfkSMz9IfwEO`, domain
   `cmbaapp.vercel.app`, which answered **HTTP 500** to an anonymous request on
   2026-08-10. OPERATOR has confirmed everything should live on `cmba_platform`, so
   this is cruft. It builds on every push and on every pull request, which means a
   second copy of a youth data application is being deployed on every change with an
   unknown environment. It is currently failing rather than serving data, but a 500 is
   not a security control. Recommended action, needs OPERATOR approval because it is
   destructive: disconnect its Git integration and delete the project. Confirm first
   that it holds no environment variables or database connection worth auditing before
   deleting, since deletion destroys that evidence.
3. **The browser gate is wired but still switched off.** The code half is done (PR
   #61). Remaining is two operator steps: generate the Protection Bypass for Automation
   secret in Vercel, then set it as the GitHub repo secret
   `VERCEL_AUTOMATION_BYPASS_SECRET` alongside the `E2E_BASE_URL` variable. Until then
   the job still reports a false green in about six seconds.
4. **Payload 3.85.1 to 3.87.x upgrade** during the soak, which clears both accepted
   image-size advisories. See D-004. Dependabot PR #55 is the vehicle, but its lockfile
   is currently broken and its CI is red; see the HELD note under 2026-08-11.
5. **RLS on the remaining 18 tables.** Not externally reachable today, since `anon` and
   `authenticated` hold no grants, but it is defence in depth worth closing.
6. **Registration rate limits.** 5 per IP per hour and 50 globally per hour. The global
   cap will throttle a real launch day for an association of this size, and it fails
   closed.
7. **`PolicyVersions` global** still reads privacy `2026-06-01` against shipped copy of
   `2026-07-01`. Sync it before reopening registration, not after, because bumping it
   re-prompts every user to accept.
8. **A flaky test blocks the never-merge-on-red rule.** `ImportConsole.test.tsx`, "clears
   a stale error message when a new file is chosen". See the note under 2026-08-11.
9. **Nine Dependabot major-version PRs stay open until after launch.** TypeScript 6,
   Tailwind 4, ESLint 10, graphql 17, `@types/node` 26, `cross-env` 10,
   `actions/checkout` 7, `actions/setup-node` 7. Breaking changes with no launch value.
