# Interim dynamic scan (OWASP ZAP)

An automated dynamic scan is an interim check before the independent penetration
test (`docs/PENTEST_READINESS.md`). It runs against a RUNNING deploy, so it cannot
run in ordinary CI (which does not stand up the app with the ca-central-1 database).

## How to run

Two ways, same tuning file (`.zap/rules.tsv`):

1. CI, on demand. Actions tab, "DAST (OWASP ZAP baseline)", Run workflow, paste the
   preview or production URL. The HTML/JSON report is uploaded as an artifact.

2. Locally with Docker against any reachable URL:

   ```bash
   docker run --rm -v "$(pwd)/.zap:/zap/wrk:rw" \
     ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
     -t https://<preview-or-prod-url> \
     -c rules.tsv -a -r zap-report.html
   ```

First scan: set `CSP_REPORT_ONLY=true` on the target so nothing is blocked while you
confirm the pages render clean, watch `/api/csp-report`, then re-scan enforcing.

## What it covers and does not

- Covers: passive checks against live responses (headers, CSP, cookies, information
  disclosure, mixed content, clickjacking) and a spider of public pages.
- Does not cover: authenticated flows, active injection, or business logic. Those are
  the penetration test's job. This scan is advisory and is not a merge gate.

## Rule tuning

`.zap/rules.tsv` records which alerts are IGNORE, WARN, or FAIL and why. The one
documented IGNORE of note is `style-src 'unsafe-inline'` (an accepted exception in
`docs/SECURITY.md`); `script-src` is strict-nonce and is not ignored.

## Recording results

Record each run below: date, target, ZAP version, and the count of High/Medium
findings with their disposition. Attach or link the report artifact.

| Date | Target | High | Medium | Notes / disposition |
| --- | --- | --- | --- | --- |
| pending | (needs a preview URL) | - | - | Scan config and workflow are wired; the run is blocked only on a reachable preview or production URL (operator to provide). No scan has been recorded yet. |
