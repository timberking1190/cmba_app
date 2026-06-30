# DNS request to RAMP Interactive for cmba.ab.ca (AWS SES email auth)

CMBA Connect (cmbaplatform.vercel.app) sends transactional email (guardian-consent
confirmations, certification reminders, score notifications, and the new engagement
digest/recognition notices) through AWS SES in ca-central-1, from
`no-reply@cmba.ab.ca`. For that mail to authenticate and reach inboxes, three DNS
changes are needed on `cmba.ab.ca`, whose DNS is hosted on RAMP Interactive
nameservers (`ns1/ns2.rampinteractive.com`). CMBA does not self-serve that DNS, so
this is a vendor request to RAMP.

This is the sending-domain decision from `SES_SETUP.md` (Decision 0 = use the brand
domain `cmba.ab.ca`). If you would rather isolate to a subdomain (e.g.
`mail.cmba.ab.ca`), ask RAMP to delegate that subdomain instead and run the AWS step
against the subdomain; the record shapes below are identical, just on the subdomain.

## Prerequisite (operator, before sending the request): get the 3 DKIM tokens

Run this once in the AWS account (region ca-central-1) to create the SES domain
identity and read its three Easy-DKIM CNAME tokens:

```bash
REGION=ca-central-1
aws sesv2 create-email-identity --email-identity cmba.ab.ca --region $REGION
aws sesv2 get-email-identity --email-identity cmba.ab.ca --region $REGION \
  --query 'DkimAttributes.Tokens' --output text
```

That prints three tokens (call them `TOKEN1 TOKEN2 TOKEN3`). Substitute them into the
three CNAME rows below. (Until these records exist and propagate, SES shows the
identity as unverified and will not send from it.)

## Records to request RAMP add / change on cmba.ab.ca

### 1. DKIM — add three CNAME records (substitute the tokens from the step above)

| Type  | Host (name)                       | Value (points to)              | TTL  |
|-------|-----------------------------------|--------------------------------|------|
| CNAME | `TOKEN1._domainkey.cmba.ab.ca`    | `TOKEN1.dkim.amazonses.com`    | 1800 |
| CNAME | `TOKEN2._domainkey.cmba.ab.ca`    | `TOKEN2.dkim.amazonses.com`    | 1800 |
| CNAME | `TOKEN3._domainkey.cmba.ab.ca`    | `TOKEN3.dkim.amazonses.com`    | 1800 |

### 2. SPF — UPDATE the existing TXT record (do NOT add a second SPF record)

cmba.ab.ca already publishes one SPF TXT for Google + Outlook. A domain may have only
ONE SPF record, so `include:amazonses.com` must be MERGED into the existing one, not
added as a new record. Change the existing SPF TXT to:

```
v=spf1 include:_spf.google.com include:spf.protection.outlook.com include:amazonses.com mx a ~all
```

(If the current SPF differs from the above, keep its existing mechanisms and just add
`include:amazonses.com` before the `~all` / `-all`.)

### 3. DMARC — add a TXT record if one does not already exist

| Type | Host (name)            | Value                                                          | TTL  |
|------|------------------------|----------------------------------------------------------------|------|
| TXT  | `_dmarc.cmba.ab.ca`    | `v=DMARC1; p=none; rua=mailto:dmarc@cmba.ab.ca; fo=1`           | 1800 |

Start at `p=none` (monitor only). After a couple of weeks of clean DKIM/SPF
alignment, tighten to `p=quarantine` then `p=reject` in follow-up requests.

## After RAMP confirms the records are live

1. Verify SES picked them up: `aws sesv2 get-email-identity --email-identity cmba.ab.ca --region ca-central-1` shows `VerifiedForSendingStatus: true` and DKIM `SUCCESS`.
2. Create SMTP credentials + request SES production access (Steps 2-3 of `SES_SETUP.md`).
3. Set `SES_SMTP_HOST/PORT/USER/PASS` and `EMAIL_FROM=no-reply@cmba.ab.ca` in Vercel (Production + Preview) and redeploy. The app auto-switches from log-only to real SMTP when `SES_SMTP_HOST` is present; no code change.

---

## Ready-to-send note to RAMP

> Subject: DNS records for cmba.ab.ca (AWS SES email authentication)
>
> Hi RAMP team,
>
> We are enabling transactional email for cmba.ab.ca through Amazon SES and need three
> DNS changes on the cmba.ab.ca zone you host for us. Please add/update the following:
>
> 1. Three new CNAME records (DKIM):
>    - `TOKEN1._domainkey.cmba.ab.ca` -> `TOKEN1.dkim.amazonses.com`
>    - `TOKEN2._domainkey.cmba.ab.ca` -> `TOKEN2.dkim.amazonses.com`
>    - `TOKEN3._domainkey.cmba.ab.ca` -> `TOKEN3.dkim.amazonses.com`
>
> 2. Update our existing SPF TXT record to add Amazon SES (please keep our current
>    Google/Outlook includes and just add `include:amazonses.com` — do not create a
>    second SPF record):
>    `v=spf1 include:_spf.google.com include:spf.protection.outlook.com include:amazonses.com mx a ~all`
>
> 3. Add a DMARC TXT record at `_dmarc.cmba.ab.ca` if one does not already exist:
>    `v=DMARC1; p=none; rua=mailto:dmarc@cmba.ab.ca; fo=1`
>
> Please confirm once these are live so we can verify on our side. Thank you.
