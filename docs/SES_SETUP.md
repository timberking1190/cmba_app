# AWS SES (ca-central-1) setup runbook

Status as investigated 2026-06-29 (read-only):

- SES is enabled in `ca-central-1` but in SANDBOX (`ProductionAccessEnabled: false`,
  200 messages/day, 1/sec). In sandbox you can only send TO verified addresses, so
  guardian-confirmation, score-reminder, and contested-escalation emails to real
  users will NOT deliver until production access is granted.
- No email identities are verified yet.
- The intended from-domain `cmba.ab.ca` has its DNS hosted on RAMP Interactive
  nameservers (`ns1/ns2.rampinteractive.com`) and already publishes SPF for Google +
  Outlook. CMBA does not self-serve that DNS, so DKIM/SPF changes there are a vendor
  request to RAMP.
- No Route53 hosted zones exist in the AWS account, so DNS records cannot be
  published automatically; they must be added wherever the chosen domain's DNS lives.

Engagement emails (added 2026-06-30): the Member-Value weekly-digest and recognition
notifications also send through this same transport, so they currently LOG via
jsonTransport rather than deliver (expected, not a defect). They start delivering the
moment SES is live below; no code change is needed (the digest cron and the recognition
approval path already call `payload.sendEmail` with the PII-free composers). The
weekly-digest cron is scheduled but its sends are log-only until then.

Because of the above, email cannot be made to work end to end from this repo alone.
Two decisions/actions are the operator's:

## Decision 0 — choose the sending domain

The from-address is `no-reply@cmba.ab.ca`. Options:
- **`cmba.ab.ca`** (best brand match): requires RAMP to publish 3 DKIM CNAMEs, extend
  the SPF TXT to include `amazonses.com`, and add a DMARC record. Slowest (vendor).
- **A subdomain you delegate**, e.g. `mail.cmba.ab.ca`, delegated to a DNS zone you
  control (or Route53). Cleaner isolation; still needs RAMP to add the delegation NS.
- **A domain you fully control** (e.g. in Route53). Fastest, but off the cmba.ab.ca
  brand for the envelope.

Pick one, then follow the steps. The app reads the from-address from `EMAIL_FROM`.

## Step 1 — create the domain identity (Easy DKIM)

```bash
REGION=ca-central-1
aws sesv2 create-email-identity --email-identity <DOMAIN> --region $REGION
aws sesv2 get-email-identity --email-identity <DOMAIN> --region $REGION \
  --query 'DkimAttributes.Tokens' --output json
```

This returns three tokens `t1 t2 t3`. Publish three CNAMEs at the domain's DNS:

```
t1._domainkey.<DOMAIN>   CNAME  t1.dkim.amazonses.com
t2._domainkey.<DOMAIN>   CNAME  t2.dkim.amazonses.com
t3._domainkey.<DOMAIN>   CNAME  t3.dkim.amazonses.com
```

SPF (merge into the existing TXT, do not add a second SPF record):
```
v=spf1 include:_spf.google.com include:spf.protection.outlook.com include:amazonses.com mx a ~all
```

DMARC (add if absent; start at none, then tighten to quarantine/reject):
```
_dmarc.<DOMAIN>  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@cmba.ab.ca; fo=1"
```

Verification flips to `SUCCESS` once DNS propagates (`get-email-identity` shows
`VerifiedForSendingStatus: true`).

## Step 2 — SMTP credentials (least privilege)

```bash
aws iam create-user --user-name cmba-ses-smtp
aws iam put-user-policy --user-name cmba-ses-smtp --policy-name ses-send \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ses:SendRawEmail","ses:SendEmail"],"Resource":"*"}]}'
aws iam create-access-key --user-name cmba-ses-smtp   # capture SecretAccessKey ONCE
```

The SMTP username is the `AccessKeyId`. The SMTP password is derived from the
`SecretAccessKey` with the AWS SESv4 algorithm (region `ca-central-1`). Use the AWS
docs converter or:

```bash
node scripts/ses-smtp-password.mjs "<SecretAccessKey>" ca-central-1
```

(see `scripts/ses-smtp-password.mjs`, included).

## Step 3 — request production access (leave sandbox)

```bash
aws sesv2 put-account-details --region ca-central-1 \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://cmbaplatform.vercel.app \
  --use-case-description "Transactional only: guardian consent confirmations, certification expiry reminders, and game-score report/contested notifications for a minor-basketball league platform. Double opt-in for any non-transactional mail; bounces/complaints handled via SES suppression." \
  --contact-language EN \
  --additional-contact-email-addresses ken@boostinnovation.ca
```

AWS reviews within ~24h. Until granted, only verified recipients receive mail.

## Step 4 — wire env (already documented in .env.example)

```
SES_SMTP_HOST=email-smtp.ca-central-1.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USER=<AccessKeyId>
SES_SMTP_PASS=<derived SMTP password>
EMAIL_FROM=no-reply@<DOMAIN>
```

Set these in `.env` (local) and in Vercel (Production + Preview). The app
(`src/payload.config.ts`) automatically switches from the no-network jsonTransport to
real SMTP when `SES_SMTP_HOST` is present.

## Step 5 — verify delivery

```bash
# After production access (or to a verified recipient in sandbox):
aws sesv2 send-email --region ca-central-1 \
  --from-email-address no-reply@<DOMAIN> \
  --destination 'ToAddresses=you@example.com' \
  --content '{"Simple":{"Subject":{"Data":"CMBA SES test"},"Body":{"Text":{"Data":"hello"}}}}'
```

Then in the app, trigger a guardian-confirmation signup and confirm the email
arrives (it currently logs via jsonTransport when SES is unset).

## Step 6 — verify and monitor from inside the app (P0.2)

Every send now flows through a tracked email adapter (`src/lib/email/adapter.ts`)
that records a PII-free row in the `email-send-log` collection: category, salted
recipient hash, bare recipient domain, status (sent or failed), transport (ses or
json), and any error code. Use it to prove delivery and to watch for silent failures.

1. **Send a real test.** Signed in as a super admin, POST to the test endpoint. It
   sends only to your own account email (never an arbitrary address, so it cannot be
   used as a relay) and reports the transport:
   ```bash
   curl -X POST https://cmbaplatform.vercel.app/api/v1/admin/email-test \
     -H "Authorization: JWT <super-admin-token>"
   ```
   A `"transport":"ses","delivered":true` response plus the message landing in your
   inbox proves the full path. `"transport":"json"` means SES is not configured yet
   (Steps 1 to 4 incomplete), so nothing was delivered.

2. **Exercise the named flows** the review calls out: password reset (use the
   forgot-password form), MFA email OTP (`FEATURE_EMAIL_OTP=true` + the recovery
   flow), and a reminder (trigger the certification or score reminder cron). Each
   should appear in `email-send-log` with `status: sent`.

3. **Check health.** GET the health endpoint (super admin) for rollups over 24h, 7d,
   and 30d, whether SES is configured, and an `alert` flag. It returns HTTP 503 when
   an alert is active (elevated failure rate, or SES unconfigured in production), so
   an uptime check can page on it:
   ```bash
   curl https://cmbaplatform.vercel.app/api/v1/admin/email-health \
     -H "Authorization: JWT <super-admin-token>"
   ```
   The same data is browsable in the admin panel under System, EmailSendLog. Filter
   by `status: failed` to see recent failures with error codes.

4. **Alerting.** Every failed send is also logged at error level, so once error
   monitoring is live (see docs/VERIFICATION.md, observability phase) failures page
   automatically. Auth email can no longer fail silently.

5. **Tighten DMARC.** After a week of clean sends, move DMARC from `p=none` to
   `p=quarantine`, then `p=reject`, watching the `rua` aggregate reports.

Retention: `email-send-log` is swept to about 90 days by the `ttl-sweep` cron
(`EMAIL_LOG_RETENTION_DAYS` in `src/collections/EmailSendLog.ts`).
