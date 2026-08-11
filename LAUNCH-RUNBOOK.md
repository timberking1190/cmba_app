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
| `dpl_72kRxKcy5u26Dk4xRRjzyLH9SjeJ` | `caca843` | Current production as of 2026-08-10 |
| `dpl_8FUZfZPcKvpV94pdWvE4CG5sTxqJ` | `ae2a344` | Previous production, served 2026-08-05 to 2026-08-10 |

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
3. **The Playwright, axe and Lighthouse CI job is a false green.** It finishes in about
   six seconds because `E2E_BASE_URL` is unset. Activating it needs Protection Bypass
   for Automation, because previews sit behind Vercel SSO. See
   `docs/launch-blockers/BROWSER_RUNBOOK.md` task 4.
4. **Payload 3.85.1 to 3.87.1 upgrade** during the soak, which clears both accepted
   image-size advisories. See D-004.
5. **RLS on the remaining 18 tables.** Not externally reachable today, since `anon` and
   `authenticated` hold no grants, but it is defence in depth worth closing.
6. **Registration rate limits.** 5 per IP per hour and 50 globally per hour. The global
   cap will throttle a real launch day for an association of this size, and it fails
   closed.
7. **`PolicyVersions` global** still reads privacy `2026-06-01` against shipped copy of
   `2026-07-01`. Sync it before reopening registration, not after, because bumping it
   re-prompts every user to accept.
