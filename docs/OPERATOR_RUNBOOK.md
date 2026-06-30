# CMBA Connect Operator Runbook

This runbook walks an operator with no security or developer background through the production-readiness tasks for the CMBA Connect platform (live at cmbaplatform.vercel.app). Each section is self-contained, lists the exact env var names, file paths, commands, and URLs you need, and tells you when a step depends on an outside party (AWS, RAMP Interactive, a penetration-test firm, a privacy reviewer, or a vendor's legal team). Work through a section top to bottom, in order, before moving to the next.

Do these in this order: turn on MFA and set the keys first; then provision AWS SES next, since it unblocks two features (email-OTP recovery and sign-up email verification); then the framework upgrade; and finally the assurance items (penetration test, security review, PIA sign-off, DPAs, and the legal placeholders) before any public registration launch.

## 1. Turn on MFA (enroll, set keys, enforce)

Multi-factor authentication (MFA) means an admin needs a second proof of identity (a passkey or a 6-digit code from an authenticator app) on top of their password. This section turns it on safely. The order matters: you enroll your own second factor FIRST, prove it works, and only THEN force everyone to use it. If you flip the enforce switch before anyone has enrolled, you can lock yourself out, so follow the steps in order.

Before you start, confirm you have: access to the Vercel dashboard for this project (the live site is `cmbaplatform.vercel.app`), an admin sign-in for the site, and a phone with an authenticator app (Google Authenticator, 1Password, Authy, or similar) and/or a device that supports passkeys (Face ID, Touch ID, Windows Hello, or a hardware security key).

### Step 1: Generate and set `TOTP_ENC_KEY` in Vercel

`TOTP_ENC_KEY` is the secret that encrypts authenticator-app secrets at rest. It is a managed key: if you ever change it, every existing authenticator-app enrollment stops working and those users must re-enroll. So set it once and leave it.

1. On your computer, open a terminal and run this exact command to generate a key:

   ```
   openssl rand -base64 32
   ```

2. Copy the entire line it prints (a 44-character string ending in `=`). Do not add spaces or quotes.

3. Open the Vercel dashboard, select this project, and go to **Settings > Environment Variables**.

4. Add a new variable:
   - Name (exactly, all caps): `TOTP_ENC_KEY`
   - Value: the string you copied in step 2
   - Environments: check **Production** AND **Preview** (both).

5. Save it.

Important rules for this key:
- It MUST be different from `PAYLOAD_SECRET`. Generate a fresh value with the command above; do not reuse the `PAYLOAD_SECRET` value.
- Treat it like a master password. Store a copy in your password manager. If you lose it you cannot decrypt existing authenticator enrollments.
- Do not rotate (change) it casually. Rotating it invalidates every existing authenticator-app (TOTP) enrollment and forces all of those users to enroll again.

Note: the related passkey settings (`WEBAUTHN_RP_ID=cmbaplatform.vercel.app` and `WEBAUTHN_ORIGINS=https://cmbaplatform.vercel.app`) are already set for the live domain, so you do not need to touch them for this runbook.

### Step 2: Redeploy so the new key takes effect

Environment variables only apply to a NEW deployment. The currently running site does not see `TOTP_ENC_KEY` until you redeploy.

1. In the Vercel dashboard, open this project's **Deployments** tab.

2. Find the most recent Production deployment, open its menu (the "..." button), and choose **Redeploy**. Confirm.

3. Wait until the new deployment shows **Ready**. This usually takes a couple of minutes.

### Step 3: Enroll your own second factor (and a backup admin)

Now you prove enrollment works on a real account before forcing it on anyone.

1. Go to this exact URL and sign in with your admin account:

   ```
   https://cmbaplatform.vercel.app/account/security
   ```

2. On that page, add at least one second factor:
   - **Passkey** (recommended): choose to add a passkey and follow your device prompt (Face ID, Touch ID, Windows Hello, or a hardware key). AND/OR
   - **Authenticator app (TOTP)**: choose to add an authenticator app, scan the QR code with your authenticator app, then type the 6-digit code it shows to confirm.

3. When the page shows **recovery codes**, save them now. Copy them into your password manager or print them and store them somewhere safe. These are your way back in if you lose your phone or passkey device. You will not be shown them again.

4. Repeat steps 1 through 3 for a SECOND admin account. This is your backup so that one lost phone cannot lock the whole organization out. Do not skip this. Enforcement should never be turned on with only one enrolled admin.

### Step 4: Verify the second factor actually challenges you

Do not trust enrollment until you have logged out and back in.

1. Sign out of the site completely.

2. Sign back in at `https://cmbaplatform.vercel.app/account/security`.

3. Confirm that after your password you are prompted for the passkey or the 6-digit code, and that entering it lets you in.

4. If the challenge does not appear or does not accept your code, STOP. Do not continue to Step 5. Check that Step 2 (redeploy) finished and that `TOTP_ENC_KEY` is set for Production. Fix enrollment before enforcing.

### Step 5: Only now, turn on enforcement (`MFA_ENFORCE=true`)

Do this only after Steps 3 and 4 succeeded for at least two admins. Until this point `MFA_ENFORCE` is `false`, which means MFA is available but not required.

1. In the Vercel dashboard, go to **Settings > Environment Variables**.

2. Find `MFA_ENFORCE` (it is currently `false`). Edit it:
   - Name: `MFA_ENFORCE`
   - Value: `true`
   - Environments: **Production** AND **Preview** (both).

3. Save it.

4. Redeploy exactly as in Step 2 (Deployments tab, "..." menu on the latest Production deployment, **Redeploy**), and wait for **Ready**.

Enforcement is "force-enrollment," not a hard lockout: admins who have not yet enrolled are pushed to set up a factor at next sign-in rather than being locked out. That is expected behavior.

### Step 6: Confirm enforcement works and you still have full access

1. Sign out, then sign back in at `https://cmbaplatform.vercel.app/account/security`.

2. Confirm you are challenged for your second factor.

3. After signing in, confirm you can still reach both of these:
   - `https://cmbaplatform.vercel.app/admin`
   - `https://cmbaplatform.vercel.app/manage`

4. If both load normally, MFA enforcement is live. Keep watching for the first 1 to 2 weeks in case another admin reports a problem enrolling.

### Step 7: The kill-switch (if anything goes wrong)

If admins get locked out, the challenge misbehaves, or anything looks wrong after enforcement, turn it off immediately. This is the instant escape hatch.

1. In Vercel, go to **Settings > Environment Variables**, edit `MFA_ENFORCE`, set the value back to `false` (Production AND Preview), and save.

2. Redeploy (Deployments tab, "..." menu on the latest Production deployment, **Redeploy**), wait for **Ready**.

3. MFA goes back to optional. Existing enrollments and recovery codes are NOT erased by this; you can investigate, then return to Step 5 when ready. Keep this kill-switch in mind for the first 1 to 2 weeks after turning enforcement on.

### Notes and dependencies on others

- **Email one-time-passcode recovery is intentionally off.** `FEATURE_EMAIL_OTP=false` and should stay off until AWS SES (region ca-central-1) is provisioned and out of sandbox, because email cannot be delivered until then. Email OTP is recovery-only and never satisfies an admin's MFA requirement anyway, so it is not needed for this runbook. If you later want it, the blocker is AWS: you must ask AWS Support, through a "request production access" case for SES in ca-central-1, to move the account out of the SES sandbox, and you must have RAMP (who host the `cmba.ab.ca` DNS on their nameservers) publish the DKIM, SPF, and DMARC records. Tell RAMP exactly: "Please publish these DKIM CNAME records, this SPF TXT record, and this DMARC TXT record for cmba.ab.ca," supplying the values from the SES console.
- No other external party (penetration tester, legal counsel) is required to complete this MFA section. Those are separate items in `docs/OPERATOR_ACTIONS.md`.

## 2. Provision AWS SES (ca-central-1)

This makes the platform able to send real email (guardian-consent confirmations, certification-expiry reminders, and game-score report / contested notifications). It also unblocks two features that depend on outbound email: email-OTP account recovery (`FEATURE_EMAIL_OTP`) and sign-up email verification. Until this is done, the app falls back to a no-network "jsonTransport" that only logs emails instead of delivering them.

Two realities to keep in front of you before you start:

- **SES is currently in SANDBOX.** As of the last check (`ProductionAccessEnabled: false`), the account can send only 200 messages/day at 1/sec, and only TO email addresses you have explicitly verified in SES. Real guardians and officials will NOT receive mail until AWS grants production access (Step 2e). Plan for that AWS review to take roughly 24 hours.
- **You do not control the DNS for `cmba.ab.ca`.** Its DNS is hosted on RAMP Interactive nameservers (`ns1/ns2.rampinteractive.com`). That means every DNS record below (DKIM, SPF, DMARC) is a request you send to RAMP, not something you can publish yourself. There are also no Route53 hosted zones in the AWS account, so nothing can be published automatically.

All `aws` commands below assume your AWS CLI is configured and pointed at the CMBA account. Region is always `ca-central-1`.

### (a) Decide the sending domain

The app's from-address default is `no-reply@cmba.ab.ca` (set in `.env.example` as `EMAIL_FROM`). Pick ONE of these before doing anything else, because it determines what you ask RAMP for:

1. **`cmba.ab.ca`** (best brand match, recommended). Requires RAMP to publish 3 DKIM CNAMEs, extend the existing SPF TXT record to include `amazonses.com`, and add a DMARC record. This is the slowest option because every change is a RAMP vendor request.
2. **A subdomain you delegate**, e.g. `mail.cmba.ab.ca`, delegated to a DNS zone you control. Cleaner isolation, but RAMP still has to add the delegation NS records.
3. **A domain you fully control** (e.g. one you put in Route53). Fastest, but the envelope is off the `cmba.ab.ca` brand.

The rest of these steps assume you chose option 1 (`cmba.ab.ca`). If you chose another, substitute your domain everywhere `cmba.ab.ca` appears. The chosen domain is referred to below as `<DOMAIN>`.

### (b) Create the SES domain identity and get the 3 DKIM tokens

Run these two commands. The first creates the identity with Easy DKIM. The second prints the three DKIM tokens you will hand to RAMP.

```bash
REGION=ca-central-1
aws sesv2 create-email-identity --email-identity <DOMAIN> --region $REGION
aws sesv2 get-email-identity --email-identity <DOMAIN> --region $REGION \
  --query 'DkimAttributes.Tokens' --output json
```

The second command returns three token strings. Call them `t1`, `t2`, `t3`. You need all three for the next step. Keep them handy.

### (c) Ask RAMP Interactive to publish the DNS records

You cannot publish these yourself. Open a request with RAMP Interactive and ask them to add the following records to the `cmba.ab.ca` zone. Paste the records verbatim, substituting the real `t1` / `t2` / `t3` values from step (b).

Three DKIM CNAME records:

```
t1._domainkey.<DOMAIN>   CNAME  t1.dkim.amazonses.com
t2._domainkey.<DOMAIN>   CNAME  t2.dkim.amazonses.com
t3._domainkey.<DOMAIN>   CNAME  t3.dkim.amazonses.com
```

SPF: tell RAMP to MERGE `include:amazonses.com` into the EXISTING SPF TXT record. Do not let them add a second SPF record (a domain may have only one, and a duplicate breaks SPF). The merged value should read:

```
v=spf1 include:_spf.google.com include:spf.protection.outlook.com include:amazonses.com mx a ~all
```

DMARC: ask RAMP to add this TXT record if one is not already present. Start at `p=none` so nothing gets rejected while you confirm delivery, then later ask them to tighten it to `quarantine` and eventually `reject`.

```
_dmarc.<DOMAIN>  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@cmba.ab.ca; fo=1"
```

After RAMP confirms the records are live, wait for DNS to propagate, then check that SES has verified the domain:

```bash
aws sesv2 get-email-identity --email-identity <DOMAIN> --region ca-central-1 \
  --query 'VerifiedForSendingStatus' --output text
```

When that prints `True` (or `true`), the domain is verified for sending. Do not proceed to a real send test until it does.

### (d) Create the least-privilege SMTP IAM user and SMTP password

Create a dedicated IAM user that can do nothing except send mail, attach a minimal policy, and create one access key. The `create-access-key` output shows the `SecretAccessKey` only ONCE, so copy it immediately and store it somewhere safe.

```bash
aws iam create-user --user-name cmba-ses-smtp
aws iam put-user-policy --user-name cmba-ses-smtp --policy-name ses-send \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ses:SendRawEmail","ses:SendEmail"],"Resource":"*"}]}'
aws iam create-access-key --user-name cmba-ses-smtp   # capture SecretAccessKey ONCE
```

The SMTP username is the `AccessKeyId` from that output. The SMTP password is NOT the secret key itself; it is derived from the `SecretAccessKey` using the AWS SESv4 algorithm for region `ca-central-1`. Derive it with the helper script in the repo:

```bash
node scripts/ses-smtp-password.mjs "<SecretAccessKey>" ca-central-1
```

(The script lives at `/Users/ken/cmba_app/scripts/ses-smtp-password.mjs`.) Save the value it prints; that is your SMTP password for the next steps.

### (e) Request production access (leave the SES sandbox)

This is the step that lets the platform email real users instead of only verified test addresses. It is a request to AWS Support, who review it (typically within about 24 hours). Run:

```bash
aws sesv2 put-account-details --region ca-central-1 \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://cmbaplatform.vercel.app \
  --use-case-description "Transactional only: guardian consent confirmations, certification expiry reminders, and game-score report/contested notifications for a minor-basketball league platform. Double opt-in for any non-transactional mail; bounces/complaints handled via SES suppression." \
  --contact-language EN \
  --additional-contact-email-addresses ken@boostinnovation.ca
```

Until AWS approves this, you are still in sandbox: only recipients you have verified in SES will receive mail. After approval, any recipient works and the daily/rate limits are raised.

### (f) Set the SMTP env vars in Vercel

Add these to the CMBA Vercel project, for BOTH the Production and Preview environments. The app (`src/payload.config.ts`) automatically switches from the no-network jsonTransport to real SMTP as soon as `SES_SMTP_HOST` is present, so do not set the host until the values are correct.

```
SES_SMTP_HOST=email-smtp.ca-central-1.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USER=<AccessKeyId from step (d)>
SES_SMTP_PASS=<derived SMTP password from step (d)>
EMAIL_FROM=no-reply@<DOMAIN>
```

Set the same values in your local `/Users/ken/cmba_app/.env` if you want to test from your machine. After changing Vercel env vars, redeploy so the running app picks them up.

### (g) Send a test and confirm a guardian-confirmation email arrives

First, a raw SES send. In sandbox, send only to an address you have verified in SES; after production access (step e) any address works.

```bash
aws sesv2 send-email --region ca-central-1 \
  --from-email-address no-reply@<DOMAIN> \
  --destination 'ToAddresses=you@example.com' \
  --content '{"Simple":{"Subject":{"Data":"CMBA SES test"},"Body":{"Text":{"Data":"hello"}}}}'
```

If that arrives, do the real end-to-end check: trigger a guardian-confirmation signup in the app and confirm the confirmation email lands in the inbox (not just the server log). When it arrives through the live SMTP path, SES is fully provisioned, and email-OTP recovery (`FEATURE_EMAIL_OTP`) and sign-up email verification will also work once their feature flags are enabled.

## 3. Upgrade the framework (clear the triaged advisories)

The 11 advisories in `/Users/ken/cmba_app/.audit-allowlist.json` are not bugs in our code. They are known issues inside Next.js and two libraries it pulls in (`nodemailer` and `undici`, which arrive through Payload and Next). We accepted them on a "fix when we upgrade" basis.

### Status (checked 2026-06-30): currently BLOCKED by Payload, not by you

We tried the upgrade and it cannot clear the advisories yet. Here is why, so nobody wastes time on it:

- Payload `3.85.1` is already the latest Payload. Its `@payloadcms/next` package only supports Next up to (but not including) `15.5.0` (its peer range is `>=15.4.11 <15.5.0`, plus a separate band for Next 16).
- The fixes for the flagged Next advisories all landed in `15.5.15` and later (for example the middleware/proxy bypass is fixed in `15.5.18`, the SSRF in `15.5.16`). Those versions are above Payload's cap.
- We verified by upgrading Next to `15.4.11` (the highest version Payload allows): the build, types, lint, and 242 tests all passed, BUT it cleared zero of the advisories and ADDED one more that only affects `>=15.4.0`. So it makes the security posture slightly worse, not better. We reverted it.

Net: the patched Next is out of reach until either (1) the Payload team ships a release whose `@payloadcms/next` peer range allows Next `15.5.15+`, or (2) we do a Next 16 major upgrade (Payload already supports `>=16.2.6`), which is a larger, breaking change to evaluate on its own. The 11 advisories stay accepted and documented in `docs/SECURITY.md` until then. The app already mitigates several of them (strict CSP and security headers, CORS lockdown, and no public accounts yet).

What you (or we) should do now: watch Payload's releases. When a Payload `3.x` release widens the Next peer range to include `15.5.15+`, run the steps below. Until then, leave the versions as they are.

When the blocker clears, follow these steps (do ALL of this on a branch, never on `main`; keep every `@payloadcms/*` package on the exact same version as `payload`, and confirm Next stays inside Payload's peer range before installing):

Current versions (from `/Users/ken/cmba_app/package.json`): Next is `15.3.9`; `payload` and every `@payloadcms/*` package are all `3.85.1`.

### (a) Create a branch

```bash
cd /Users/ken/cmba_app
git checkout main
git pull
git checkout -b chore/framework-upgrade-2026-06
```

### (b) Find the target versions and confirm they are compatible, then install

First, find the latest patched `15.x` of Next and the latest `3.x` of Payload:

```bash
cd /Users/ken/cmba_app
npm view next@^15 version
npm view payload@^3 version
npm view @payloadcms/next@^3 version
```

The first command lists every `15.x` release; take the highest number (for example `15.5.7`, but use whatever the command actually prints, do not assume). The second and third do the same for Payload. The `payload` version and the `@payloadcms/next` version should match each other; pick the highest `3.x` that both have.

Now confirm Next is inside Payload's supported range before you install. This reads the peer requirement straight from the package you are about to install:

```bash
npm view @payloadcms/next@<PAYLOAD_VERSION> peerDependencies
```

Look at the `next` line in that output. The Next version you chose above must satisfy it. If it does not (for example Payload only supports up to `15.4.x` but you picked Next `15.5.x`), step down to the highest Next `15.x` that Payload allows, and use that instead. Do not proceed until the two line up.

Then install. Use ONE version string for `payload` and all eight `@payloadcms/*` packages so they never drift apart. Replace `<NEXT_VERSION>` and `<PAYLOAD_VERSION>` with the exact numbers you found above:

```bash
cd /Users/ken/cmba_app

# Next + its eslint config (keep these two on the same version)
npm install next@<NEXT_VERSION> eslint-config-next@<NEXT_VERSION>

# Payload core + every @payloadcms package, all on the SAME version
npm install \
  payload@<PAYLOAD_VERSION> \
  @payloadcms/db-postgres@<PAYLOAD_VERSION> \
  @payloadcms/email-nodemailer@<PAYLOAD_VERSION> \
  @payloadcms/live-preview-react@<PAYLOAD_VERSION> \
  @payloadcms/next@<PAYLOAD_VERSION> \
  @payloadcms/richtext-lexical@<PAYLOAD_VERSION> \
  @payloadcms/storage-s3@<PAYLOAD_VERSION> \
  @payloadcms/ui@<PAYLOAD_VERSION>
```

(That is all eight Payload packages currently in `package.json`: `payload` plus the seven `@payloadcms/*` ones on lines 27 to 33.)

### (c) Install everything and run the full gate locally

The previous `npm install` calls already updated `package.json` and `package-lock.json`. Now do a clean install and run each gate command in order. Each one must pass before you move to the next. If one fails, stop and fix it (or, if it is a real blocker you cannot fix, abandon the branch and report it) rather than pushing a broken upgrade.

```bash
cd /Users/ken/cmba_app
npm install
npm run lint
npx tsc --noEmit
npm test
npm run build
```

What each step is checking:
- `npm run lint` runs `next lint` (catches code and config problems the new Next version may newly flag).
- `npx tsc --noEmit` type-checks the whole project against the new type definitions.
- `npm test` runs the Vitest suite (`vitest run`).
- `npm run build` runs `next build`. This is the one most likely to surface a Next/Payload mismatch, so read its output carefully.

If Payload changed its generated types, you may also need to refresh them:

```bash
npm run generate:types
npm run generate:importmap
```

Then re-run `npx tsc --noEmit` and `npm run build`.

### (d) Deploy to a Vercel PREVIEW and smoke test

Do NOT deploy to production yet. Push the branch and let Vercel build a preview deployment for it. Vercel auto-builds a preview for every pushed branch on this project (the live production app is at `cmbaplatform.vercel.app`).

```bash
cd /Users/ken/cmba_app
git add -A
git commit -m "chore: upgrade Next to latest 15.x and Payload to latest 3.x"
git push -u origin chore/framework-upgrade-2026-06
```

Open the Vercel dashboard, find the preview deployment for branch `chore/framework-upgrade-2026-06`, and wait for it to finish building. Open the preview URL Vercel gives you (it will be a `*.vercel.app` URL specific to this branch) and smoke test each of these by hand:

- `/admin` (the Payload admin panel loads and you can log in)
- `/login`
- `/schedule`
- A passkey or TOTP enrollment: go through one full enroll flow end to end. The app uses `@simplewebauthn` for passkeys and `otpauth` for TOTP, and these touch the auth path most likely to break on a framework bump, so actually complete an enrollment, do not just open the page.

If any of these is broken on the preview, fix it on the branch and push again. Do not continue to step (f) until the preview is clean.

Note on the preview environment: the preview deployment needs the same environment variables as production (database URL, Supabase keys, S3, email). If the preview build cannot start or the admin panel cannot reach the database, the cause is usually missing or wrong preview env vars in the Vercel project settings, not the upgrade itself. Check the Vercel project's Environment Variables (the "Preview" scope) before assuming the code is broken.

### (e) Re-run the audit and remove every advisory that is now fixed

With the new versions installed, re-run the gate script that powers CI:

```bash
cd /Users/ken/cmba_app
node scripts/audit-ci.mjs
```

How to read the result:
- The script prints `audit-ci: OK` when there are zero high/critical advisories outside the allowlist. The number in parentheses is how many entries are still in `.audit-allowlist.json`.
- For the cleanup, what you care about is which of the 11 currently-allowlisted advisories the upgrade actually patched. To see what is still outstanding, run:

```bash
npm audit --omit=dev
```

For each of the 11 IDs in `/Users/ken/cmba_app/.audit-allowlist.json`, check whether it still appears in the `npm audit --omit=dev` output. If an ID no longer appears, the upgrade fixed it: delete that ID's entry from `.audit-allowlist.json`. The 11 IDs are:

- Next (7): `GHSA-q4gf-8mx6-v5v3`, `GHSA-8h8q-6873-q5fj`, `GHSA-26hh-7cqf-hhc6`, `GHSA-mg66-mrh9-m8jx`, `GHSA-c4j6-fc7j-m34r`, `GHSA-267c-6grr-h53f`, `GHSA-36qx-fr4f-26g5`
- nodemailer (1): `GHSA-p6gq-j5cr-w38f`
- undici (3): `GHSA-vmh5-mc38-953g`, `GHSA-vxpw-j846-p89q`, `GHSA-hm92-r4w5-c3mj`

Edit `/Users/ken/cmba_app/.audit-allowlist.json` and remove only the entries whose IDs are no longer reported. Leave any entry that `npm audit` still shows (those are not patched yet and must stay allowlisted, or CI will fail). Keep the JSON valid: do not leave a trailing comma after the last remaining entry inside the `allow` block. Also update the `_baselined` date near the top of the file to today's date.

Then re-run the gate to confirm the file is still valid and the build still passes the audit:

```bash
cd /Users/ken/cmba_app
node scripts/audit-ci.mjs
```

It must print `audit-ci: OK`. If it instead prints `audit-ci: FAIL`, the listed advisory is one you removed too eagerly; put it back, since the upgrade did not actually patch it. (The matching write-up lives in `docs/SECURITY.md`; update it there too so the doc and the allowlist agree.)

Commit the cleanup:

```bash
cd /Users/ken/cmba_app
git add .audit-allowlist.json docs/SECURITY.md
git commit -m "chore: drop advisories fixed by framework upgrade from audit allowlist"
git push
```

### (f) Merge to main only after the preview is clean

Open a pull request from `chore/framework-upgrade-2026-06` into `main`. Confirm all of the following before merging:

- Steps (c), (d), and (e) all passed (lint, types, tests, build, the four manual smoke tests, and `audit-ci: OK`).
- The Vercel preview for the branch is green and the manual smoke tests on it passed.
- CI on the pull request is green.

Only then merge to `main`. Merging to `main` is what triggers the production deploy to `cmbaplatform.vercel.app`, so do not merge until the preview has proven the upgrade is safe. After the merge, open the production URL and re-check `/admin`, `/login`, and `/schedule` once more.

### External-party dependencies in this step

This upgrade is self-contained and does not need any outside vendor. Two things to be aware of:

- No DNS, SES, pentest, or legal action is required to ship this framework upgrade. (Per project notes, SES production access from AWS is still outstanding for this app, but that is a separate task and is not a blocker for upgrading Next and Payload.)
- If the preview deployment in step (d) fails specifically because email sending is broken, that is the separate AWS SES item, not this upgrade. In that case the ask to AWS Support is "move our SES account out of the sandbox and grant production sending access for the cmbaplatform sending domain." Do not hold the framework upgrade for it; the upgrade can merge while SES production access is still pending.

## 4. Independent penetration test

This section walks an operator (no security background needed) through hiring and running an independent web and API penetration test. This test is a launch blocker. It is item 1 under "Required external assurance" in `docs/SECURITY.md`, and it must be done and its findings remediated before any public registration launch.

Do the steps in order.

1. **Pick a firm that holds the right credentials.** You want a firm whose testers hold CREST certification (the firm or its testers) and/or OSCP (Offensive Security Certified Professional) on the individual testers. These two are the recognized hands-on credentials. When you contact a firm, ask them in writing for exactly this: "Please confirm the testers assigned to our engagement hold OSCP and/or are CREST-registered, and send their certification details." Also ask for: two recent sanitized sample reports, proof of liability insurance, and references from a similar Canadian web and API engagement. Prefer a Canadian firm or one comfortable with Canadian data residency (PIPEDA and Alberta PIPA), because our data lives in Canada (Supabase and Vercel, ca-central-1, Montreal). Get a fixed-price quote scoped to "web application and REST API penetration test" covering the surfaces listed in step 2.

2. **Give them the scope brief.** Send the firm the file `/Users/ken/cmba_app/docs/PENTEST_READINESS.md`. This is the scope brief. It already lists exactly what is in scope (the public web app, the Payload admin at `/admin`, the `/api/v1` surface, authentication and MFA, gated file downloads, score reporting, CSV import) and what is out of scope (the provider platforms Supabase, AWS, Vercel, Cloudflare; TeamLinkt; denial-of-service against production; physical, social-engineering, and phishing attacks; real member data). Tell them plainly: "Test everything marked in scope in this document, run the full adversarial matrix in the 'Adversarial / penetration test matrix' section, and confirm the items in 'Known residuals' rather than re-discovering them from scratch."

3. **Provision the four test accounts on a PREVIEW deployment, never production.** The brief lists exactly four accounts to provide. Create them on an isolated Vercel preview deploy, not on `https://cmbaplatform.vercel.app` (production). Steps:
   - **Spin up a preview deploy.** Push the branch you want tested, or use the latest preview Vercel already builds per branch. The preview URL is the one you hand the testers. Do not point them at production for dynamic scanning.
   - **For the first preview deploy, turn CSP report-only ON so nothing breaks while you confirm pages render**, then turn it back to enforce before the test starts. Per `docs/SECURITY.md` ("CSP rollout"): set env var `CSP_REPORT_ONLY=true`, confirm the public pages and `/admin` render with no violations (violations log to `/api/csp-report`), then unset `CSP_REPORT_ONLY` so the policy enforces. The testers must test against the enforcing policy.
   - **Create the four accounts** (these are the exact roles named in `docs/PENTEST_READINESS.md`, "Test accounts to be provided"):
     1. **Active admin (super admin)** with full administrative access (admin panel, the `/manage` consoles, imports, overrides, erasure).
     2. **Expired / limited account**: a non-admin participant with the minimum role, so they can prove a low-privilege user cannot reach admin functions or another user's data (this is the privilege-escalation probe account).
     3. **Team rep**: a verified team representative, for score reporting, opposing confirmation, the contested flow, and scoped reads of their own team's data and draft games.
     4. **Guardian + minor**: a guardian account linked to a minor profile, to prove a minor's data is visible only to the guardian and authorized admins.
   - Create these accounts through the Payload admin panel at `<preview-url>/admin` using the active-admin login, or seed them in the preview database. Use throwaway email addresses you control, not real member emails. Record the credentials in a password manager, not in the repo.
   - **Note two flags the testers must know about** (already documented in the brief's "Known residuals," but state them when you hand over accounts): MFA enforcement is off by default (env var `MFA_ENFORCE`, default false) and the MFA schema migration may not be applied on the preview DB, so ask them to test the MFA mechanisms (passkeys, TOTP, recovery codes, sessions) for correctness rather than expecting org-wide enforcement; and email-OTP recovery is off (`FEATURE_EMAIL_OTP`) because SES is not provisioned, so email-dependent recovery cannot be exercised end to end yet.
   - **Hand over, alongside the accounts:** the preview URL, the `/api/v1` base URL, and the API contract file `/Users/ken/cmba_app/docs/API.md`. Give them a point of contact for re-provisioning accounts mid-engagement (the brief promises this).

4. **Agree the rules of engagement and a test window in writing before they start.** The rules of engagement are already written in `docs/PENTEST_READINESS.md` ("Rules of engagement"). Put them in the contract or statement of work and have the firm sign off. The key terms to lock down:
   - Test only the preview deployment and the accounts you provide. No automated scans that degrade the live service. No volumetric denial-of-service against production (rate limiting may be exercised functionally on the preview only).
   - No physical, social-engineering, or phishing attacks against staff or members.
   - If they encounter real personal data, they stop, do not copy it, and tell you immediately.
   - Coordinated disclosure: they give you reasonable time to remediate before any public disclosure.
   - **Agree exact dates** (a start date and an end date, for example a one-week or two-week window) and confirm the preview deploy will stay up and stable for that whole window. Tell them the disclosure and coordination contact is **security@cmba.ab.ca** (this is the address published in `public/.well-known/security.txt`, RFC 9116).
   - Confirm in writing that the preview is an isolated environment with no real member data, so there is no privacy exposure from the test itself.

5. **Share the supporting context documents.** Send these so the testers do not waste time mapping the system:
   - `/Users/ken/cmba_app/docs/SECURITY.md` (the living control matrix: each control mapped to the file that implements it and the test that covers it, plus the triaged dependency advisories and accepted exceptions).
   - `/Users/ken/cmba_app/docs/THREAT_MODEL.md` (the STRIDE threat model and textual data flow diagram with trust boundaries and the Canadian-residency assertion). Note: the pentest-readiness file calls the threat model "planned, not yet written," but it now exists at that path. Send the real file.
   - Optional but helpful: `/Users/ken/cmba_app/docs/PROCESSOR_REGISTER.md` (third parties and data flows) and `/Users/ken/cmba_app/docs/VERIFICATION.md` (the per-phase verification log with the prior adversarial smokes).

6. **Triage the findings by severity, remediate, and request a retest of the fixed criticals and highs.** When the report arrives, sort every finding into Critical / High / Medium / Low and act on the timelines already defined in `/Users/ken/cmba_app/docs/INCIDENT_RESPONSE.md` ("Severity and target timelines"):
   - **Critical** (confirmed exposure of personal or children's data, admin or account takeover, data destruction): contain immediately, assess within 24 hours.
   - **High** (exploitable vulnerability with a likely path to personal data, MFA bypass): contain same day, assess within 72 hours.
   - **Medium** (limited-impact vulnerability, suspicious access without confirmed exposure): contain within 3 business days, assess within 7 days.
   - **Low** (hardening gap, no live exposure): next sprint, triage at intake.
   - Remediate the fixes in the codebase, deploy them to the same preview, then **ask the firm in writing for a free or fixed-fee retest of every Critical and High finding** so they can confirm each is actually closed. Negotiate this retest into the original contract up front so it is not a surprise charge. Per the verification gate in the brief, high and medium findings are remediated before launch. Do not launch public registration with an open Critical or High.
   - As you remediate, update `docs/SECURITY.md` (add or adjust the control row) and `docs/VERIFICATION.md` (record the fix and the retest result) so the evidence trail stays current.

7. **Keep the final report as evidence.** Store the firm's final report (the original test report plus the retest confirmation that the criticals and highs are closed) in a durable, access-controlled location (not committed to the public repo, since it lists vulnerabilities). This report is the evidence that satisfies item 1 of "Required external assurance" in `docs/SECURITY.md`. You will need to show it to your privacy reviewer and keep it for your records before launch. Note in `docs/SECURITY.md` that the pentest is complete, with the date and the firm name.

## 5. Third-party security review

This is a lighter, separate review from the penetration test: an outside expert reads your architecture and your control documentation and gives you a written, signed opinion that the design and controls are sound. It is item 2 under "Required external assurance" in `docs/SECURITY.md` and is also a launch blocker. It is a paperwork-and-architecture review, not a hands-on hacking exercise, so it is cheaper and faster than the pentest.

Do the steps in order.

1. **Choose who does it.** Two good options, pick one:
   - The **same penetration-test firm** from section 4, as an add-on "architecture and security controls review" or "security design review." This is often the easiest because they already understand the system.
   - An independent **vCISO** (virtual Chief Information Security Officer) or a security consultant who does architecture and controls assessments. Ask in writing for: "a written architecture and security-controls review against OWASP ASVS and the OWASP Top 10, ending in a signed attestation letter." Confirm they are comfortable with PIPEDA and Alberta PIPA and with the Canadian-residency model. Get a fixed-price quote.
   - Whichever you pick, tell them the standards we target so they review against the right bar. From `docs/SECURITY.md` ("Standards targets"): OWASP ASVS 5.0 Level 2 across the app (Level 3 for admin, children's data, certification documents, and score reporting), NIST SP 800-63B-4 for authentication (AAL2 normally, phishing-resistant step-up for admins and sensitive actions), OWASP Top 10 (2021) as a minimum coverage check, and PIPEDA plus Alberta PIPA with all personal data staying in Canada.

2. **Share the three core documents the review consumes.** Per `docs/SECURITY.md` ("Required external assurance"), this review and the pentest both consume the control matrix, the threat model, and the data flow diagram. Send the reviewer:
   - **The control matrix:** `/Users/ken/cmba_app/docs/SECURITY.md`. This maps every required control to the file that implements it and the test that covers it, by phase (S0 through S4), and lists the accepted exceptions and the triaged dependency advisories. This is the heart of what they are attesting to.
   - **The threat model:** `/Users/ken/cmba_app/docs/THREAT_MODEL.md`. STRIDE threat model with each risk mapped to an in-place control or marked planned.
   - **The data flow diagram:** it lives inside the same file, `/Users/ken/cmba_app/docs/THREAT_MODEL.md`, as the "Textual data flow diagram with trust boundaries" section (the residency assertion is in the "Where personal data flows" subsection). Point them to that section by name so they do not look for a separate file.

3. **Share the supporting context** so they can sanity-check the claims in the control matrix:
   - `/Users/ken/cmba_app/docs/PENTEST_READINESS.md` (architecture summary, residency, in/out of scope, known residuals).
   - `/Users/ken/cmba_app/docs/PRIVACY_IMPACT_ASSESSMENT.md` (the PIA under PIPEDA and Alberta PIPA: data inventory, consent, minors and guardian, data subject rights, retention, residency).
   - `/Users/ken/cmba_app/docs/PROCESSOR_REGISTER.md` (third-party processors and the DPA register; note the DPAs are still required/pending, which is item 4 of "Required external assurance").
   - `/Users/ken/cmba_app/cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md` (residency and PIPEDA detail).

4. **Tell them plainly about the known residuals up front**, so they assess them rather than flag them as surprises. These are documented in `docs/PENTEST_READINESS.md` ("Known residuals") and `docs/SECURITY.md`:
   - The framework dependency advisories are accepted and baselined in `.audit-allowlist.json` (11 IDs, baselined 2026-06-29) pending a Next.js and Payload upgrade; that upgrade is an operator action and a launch blocker.
   - SES email is not yet provisioned (the app uses a no-network `jsonTransport` fallback), so email-OTP recovery is off. Note for them: provisioning SES is blocked on two external-party items in `docs/SES_SETUP.md`, namely AWS moving the SES account out of sandbox (you must file an AWS support request asking for "SES production access" for the `ca-central-1` account), and DNS changes for the `cmba.ab.ca` from-domain that only RAMP Interactive can make (you must send RAMP a vendor request to publish the DKIM and SPF records, because CMBA does not self-serve that DNS).
   - MFA is built but enforcement is behind the `MFA_ENFORCE` kill-switch (default false) and the MFA schema migration is not yet applied to the live DB (an operator step).
   - `style-src 'unsafe-inline'` in the CSP is an accepted exception; `script-src` uses the strict nonce plus strict-dynamic policy.
   - The rate limiter fails open on an infrastructure blip by design, with security-critical write paths backstopped by composite unique indexes and auth.

5. **Ask for a written attestation as the deliverable.** This is the whole point of this review. Request, in writing, a signed attestation letter (on the firm's or consultant's letterhead) that states at minimum:
   - The reviewer's name, credentials, and the date.
   - What they reviewed (name the documents and the version or commit hash you gave them).
   - The standards they assessed against (OWASP ASVS 5.0 Level 2/3, OWASP Top 10 2021, NIST SP 800-63B-4, PIPEDA and Alberta PIPA).
   - Their opinion that the architecture and controls are reasonable and appropriate for the data handled (adult contact data now, children's data once registration opens), with any conditions or recommended fixes called out.
   - Any findings, each with a severity. Triage and remediate these on the same timelines from `/Users/ken/cmba_app/docs/INCIDENT_RESPONSE.md` ("Severity and target timelines": Critical contain immediately/assess 24h; High same day/72h; Medium 3 business days/7 days; Low next sprint) that the pentest findings use, then ask the reviewer to confirm in the attestation that any Critical or High items are resolved.

6. **File the attestation as evidence and update the matrix.** Store the signed attestation letter alongside the pentest report in your durable, access-controlled evidence location. Then update `/Users/ken/cmba_app/docs/SECURITY.md` to record that item 2 of "Required external assurance" (third-party security review / architecture assessment) is complete, with the date and the reviewer's name. This attestation, the pentest report, the PIA, and the signed Data Processing Agreements together are the four-item external-assurance set that must be complete before public registration launch.

## 6. Privacy Impact Assessment (PIA) sign-off

The PIA already exists in draft at `/Users/ken/cmba_app/docs/PRIVACY_IMPACT_ASSESSMENT.md` (status line reads "draft for internal review"). Your job here is not to write it. It is to get a qualified outside reviewer to confirm it, name a Privacy Officer in the system, and get written sign-off with a recurring review date. This closes open item 2 (and feeds items 4 and 7) in Section 13 of that document.

This is the one step in the whole runbook that you cannot finish yourself. It depends on an outside party (a Canadian privacy professional or privacy lawyer). Start the engagement early because everything below waits on them.

1. Engage a Canadian privacy professional or privacy counsel. You need someone who knows PIPEDA (the federal law) and Alberta PIPA (the provincial law), because CMBA is an Alberta non-profit handling Alberta residents' data and both laws are in play. Options, cheapest effort first:
   - A privacy lawyer at an Alberta firm (search "Alberta PIPA privacy lawyer" or ask the CMBA board for a referral).
   - A certified privacy consultant (look for the CIPP/C credential, which is the Canadian privacy certification).
   - The basketball org's existing legal counsel, if they have privacy experience, or can refer you.
   Exact thing to ask them for, in writing: "Please review our Privacy Impact Assessment for a youth basketball member platform under PIPEDA and Alberta PIPA, confirm our data inventory, lawful basis, minors handling, and Canadian data residency, flag any gaps, and provide written sign-off plus a recommended review cadence." Tell them the platform handles personal information of minors, which raises the sensitivity, and that registration and payment are handled by a separate vendor (TeamLinkt), not by this system.

2. Give them the draft as the starting document. Send `/Users/ken/cmba_app/docs/PRIVACY_IMPACT_ASSESSMENT.md`. Also send, as supporting evidence, the processor register at `/Users/ken/cmba_app/docs/PROCESSOR_REGISTER.md` and the published Privacy Policy text at `/Users/ken/cmba_app/cmba-backend-build/docs/legal/PRIVACY_POLICY.md`. The PIA itself names its supporting docs in Section 8 (`docs/processors.md`) and Section 10 (`docs/SECURITY.md`); include those if the reviewer asks. Point them to Section 13 ("Open items before public registration") so they know what is already flagged as not done.

3. Walk the reviewer through the four areas the PIA is built around, and capture any gaps they raise. Ask them to confirm each one explicitly, because these are the areas a regulator would look at:
   - Data inventory. Section 2 of the PIA is a field-by-field table of everything collected. Ask the reviewer to confirm it is complete and that nothing sensitive is collected that should not be. The PIA states the system deliberately does not collect payment data or a Social Insurance Number.
   - Lawful basis. The PIA relies on consent under PIPEDA and PIPA (Section 2 lawful-basis note, and Section 6). Ask the reviewer to confirm consent is the right basis for each category, especially the security and accountability fields the system sets automatically.
   - Minors handling. Section 4 covers guardian-managed accounts, server-enforced guardian consent, pending-until-confirmed, and data minimization for children. This is the highest-sensitivity area. Ask the reviewer to confirm the guardian-consent model and the "shortest reasonable retention for children" commitment are adequate.
   - Residency. Section 9 states all personal data is in Canada (Supabase and Storage in ca-central-1, AWS SES in ca-central-1, Vercel compute pinned to Montreal yul1). The PIA is honest that this is residency, not sovereignty, because the vendors are US-headquartered (CLOUD Act exposure). Ask the reviewer whether residency is sufficient or whether the board needs to record a sovereignty decision (Section 8 of the PIA flags this as a board decision).
   Write down every gap or change the reviewer asks for. Make the edits in `/Users/ken/cmba_app/docs/PRIVACY_IMPACT_ASSESSMENT.md` and bump its "Last updated" date at the top.

4. Name a Privacy Officer in Site Settings. This is a real field in the system, not just a document. Log in to the admin panel at `https://cmbaplatform.vercel.app/admin` with a super-admin account, open the "Settings" group, open "Site Settings", and fill in the Privacy Officer group: `name`, `email`, and `phone`. The field is defined in `/Users/ken/cmba_app/src/globals/SiteSettings.ts` (the `privacyOfficer` group). Site Settings is public-read, so this surfaces on the footer and contact surface, which is exactly what PIPEDA accountability requires (a named, reachable person). Use a role address you control, for example `privacy@cmba.ab.ca`, not a personal inbox, so it survives a volunteer turnover. (Section 8 below covers routing that mailbox to a person.)

5. Get written sign-off and set a review cadence. Ask the reviewer for a short signed memo or email that says: they reviewed the PIA, they confirm (or list conditions on) the data inventory, lawful basis, minors handling, and residency, and they recommend a review interval. A common interval is annual, or sooner if the system materially changes. Then:
   - Save the signed memo alongside the PIA (a `docs/` file or the CMBA shared drive), and record the sign-off date and the reviewer's name in the PIA header where it currently says "draft for internal review."
   - Put the next review date on a calendar owned by the Privacy Officer. The processor register's DPA checklist already says to "tie review to the Privacy Officer role named in Site Settings," so this is the same cadence that drives the processor-register review.
   - Once signed, update Section 13 item 2 of the PIA to mark the third-party privacy review as done.

## 7. Sign Data Processing Agreements (DPAs)

A DPA (Data Processing Agreement) is the contract that legally binds a vendor to handle your members' personal data only on your instructions, keep it secure, and tell you their sub-processors. The processor register at `/Users/ken/cmba_app/docs/PROCESSOR_REGISTER.md` lists all three as "REQUIRED - pending" and none are signed. Signing them is a launch blocker. This step closes open item 3 in Section 13 of the PIA.

For all three vendors the residency goal is the same: confirm personal data stays in Canada (Supabase and AWS SES in `ca-central-1`, Vercel compute in `yul1`), and confirm each vendor's sub-processors also stay in Canada (or record an explicit exception). The honest caveat, already accepted in the docs, is that all three are US-headquartered, so this is residency, not full sovereignty. Use the "DPA checklist (launch blocker)" at the bottom of `PROCESSOR_REGISTER.md` (lines 34 onward) as your master checklist and tick each box as you go.

Work vendor by vendor.

1. Supabase DPA (database plus file storage, the most sensitive vendor).
   - Where to find and sign it. Log in to the Supabase dashboard at `https://supabase.com/dashboard`, select the `cmba-connect` project (project ref `pdwautioosstdgbbblxl`), then go to Organization settings, the Legal or Compliance section, where Supabase offers a DPA you can accept and download (often a click-to-accept "Sign DPA" flow on paid plans). If you do not see a self-serve DPA, email Supabase support and ask: "Please provide your Data Processing Agreement for execution, and your current sub-processor list, for project ref pdwautioosstdgbbblxl hosted in ca-central-1." This depends on Supabase; on the free tier you may need to request it.
   - Confirm residency. In the dashboard, confirm the project region shows ca-central-1 (Montreal). The register notes the database connects via the `aws-1-ca-central-1` session pooler and storage uses `S3_REGION=ca-central-1`, and that native backups stay in region. Confirm the DPA or its data-processing-locations annex names Canada for storage and backups.
   - Confirm sub-processors stay in Canada. Supabase runs the ca-central-1 region on AWS infrastructure. Get Supabase's current sub-processor list (usually at a URL like the Supabase sub-processors page, or attached to the DPA) and confirm the entries serving your project are Canada-resident. If any sub-processor is outside Canada for your data, record that as an explicit accepted exception in the register, do not leave it blank.

2. AWS DPA (SES email).
   - Where to find and sign it. AWS publishes a self-serve DPA. Sign in to the AWS console with the account that hosts SES, go to AWS Artifact at `https://console.aws.amazon.com/artifact`, open the Agreements section, find the AWS GDPR Data Processing Addendum (this is the document AWS uses as its DPA), and accept it for the account. Save the confirmation. If counsel wants a Canada-specific addendum, raise an AWS Support case and ask: "Please confirm the executed Data Processing Addendum covers personal data processed through SES in ca-central-1, and provide your sub-processor list for that region."
   - Confirm residency. SES is in `ca-central-1` and sends over `email-smtp.ca-central-1.amazonaws.com`. Note the honest status from `/Users/ken/cmba_app/docs/SES_SETUP.md`: as of the last check SES is still in sandbox and no domain is verified, so real delivery is not live yet. The DPA can be signed now; production access and domain verification are a separate task (see the SES runbook), and require RAMP Interactive to publish DNS records for `cmba.ab.ca` and an AWS Support request to leave sandbox. Signing the DPA does not depend on those.
   - Confirm sub-processors stay in Canada. AWS uses its own internal services within the region. Confirm with the AWS DPA / sub-processor documentation that processing for SES in ca-central-1 stays in Canada, and record it.

3. Vercel DPA (hosting and compute).
   - Where to find and sign it. Log in to the Vercel dashboard at `https://vercel.com/dashboard`, open the team that owns the CMBA project, go to Settings, then Legal or Security, where Vercel offers a DPA to review and accept (a "Request DPA" or click-to-sign flow). If it is not self-serve on your plan, email Vercel support: "Please provide your Data Processing Agreement for execution and your current sub-processor list; our functions are pinned to the yul1 (Montreal) region."
   - Confirm residency. Vercel defaults to US `iad1`, so the Montreal `yul1` pin is mandatory and must be enforced, not assumed. Confirm the pin is in place: check `vercel.json` in the repo for the `yul1` region setting and confirm the project's Functions region in Vercel project settings reads `yul1`. The live deployment is `cmbaplatform.vercel.app`. The register also notes no personal data is placed in URLs or logs (logs are scrubbed), which is the reason transient compute outside a durable store is acceptable, but the region pin is still required.
   - Confirm sub-processors stay in Canada. Get Vercel's sub-processor list and confirm that, with functions pinned to yul1, no sub-processor processes personal data outside Canada. Record any exception explicitly.

4. Skip the vendors that are not your processors, but document why.
   - Cloudflare Turnstile: only needs a DPA if you enable it (it is off unless both `TURNSTILE_SECRET` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are set). If you turn it on, rely on Cloudflare's DPA and record it, noting it can see a visitor IP on global edge.
   - HaveIBeenPwned: no DPA needed (only a k-anonymity SHA-1 prefix leaves the server, no PII). Just record the dependency.
   - TeamLinkt: not your processor. It is an upstream source and a deep-link destination; members transact with TeamLinkt directly. Confirm it is documented that way in the register, no DPA owed by CMBA.

5. File the signed copies and the sub-processor lists. For each signed DPA:
   - Save the signed PDF and the vendor's current sub-processor list to the CMBA shared drive (or a `docs/dpa/` folder), named clearly per vendor with the sign date.
   - In `/Users/ken/cmba_app/docs/PROCESSOR_REGISTER.md`, change that vendor's "DPA status" cell from "REQUIRED - pending" to "Signed YYYY-MM-DD" and tick its box in the DPA checklist. Tick the "Sub-processor confirmation" box once you have filed each list and confirmed Canada residency (or recorded the exception).
   - Mirror the same status into the PIA: update the Section 8 table ("DPA signed" column) and mark Section 13 item 3 done once all three are signed and the board has recorded its residency-versus-sovereignty decision.
   - Set the register's review reminder. The checklist says to review on each new processor, each sub-processor change, and at least annually, tied to the Privacy Officer role you named in Site Settings (Section 6 above). Put that on the Privacy Officer's calendar.

## 8. Fill legal placeholders plus confirm the disclosure mailbox

The public legal pages still contain placeholder dates and a placeholder Privacy Officer contact, and the security disclosure mailbox needs a human behind it. This step closes open items 4 and 7 in Section 13 of the PIA: set the effective and last-updated dates and the Privacy Officer contact in the Privacy Policy, Terms of Use, and Guardian Consent notice, and make sure `security@cmba.ab.ca` actually reaches someone.

How the legal pages work in this system, so you change the right thing. The public pages at `/privacy`, `/terms`, and `/guardian-consent` render through the `CmsOrLegal` component (`/Users/ken/cmba_app/src/components/CmsOrLegal.tsx`). It works like this: if a super admin has created and published a CMS Page in the `pages` collection with the matching slug (`privacy`, `terms`, or `guardian-consent`), that CMS Page is shown; otherwise the built-in static copy from `/Users/ken/cmba_app/src/content/legal.ts` is shown. So you have two valid ways to publish the final text, and you should pick one per document and be consistent:

1. Decide the values you are filling in (do this once, use everywhere).
   - Effective date and Last updated date: use a real date (for example today). The version strings must match the `PolicyVersions` global, which currently defaults to `2026-06-01` for `termsVersion`, `privacyVersion`, and `guardianConsentVersion` (`/Users/ken/cmba_app/src/globals/PolicyVersions.ts`). If you change the wording materially, bump the version string in both the document and the `PolicyVersions` global so existing users are re-prompted to re-consent. If you are only filling dates and contact details (no wording change), keep the version as is.
   - Privacy Officer contact: the same name, email, and phone you entered in Site Settings in Section 6. Use a role address (for example `privacy@cmba.ab.ca`), not a personal one.

2. Publish the final text. Pick ONE of the two paths per document.

   Path A, edit through the CMS (recommended, matches "published via the CMS"). Log in at `https://cmbaplatform.vercel.app/admin` as a super admin. In the `Pages` collection, create or open the page with slug `privacy` (then repeat for `terms` and `guardian-consent`). Paste the final, plain-language legal copy, fill in the effective date, last-updated date, and the Privacy Officer name, email, and phone, and Publish. Because `CmsOrLegal` prefers a published CMS Page over the static file, your CMS version goes live immediately at the public URL. Note that `overrideAccess` is false in that component, so only a Published page (not a draft) shows to the public, confirm you actually published.

   Path B, edit the static source. If you are not yet using CMS Pages for legal, edit the built-in copy in `/Users/ken/cmba_app/src/content/legal.ts`. That file currently has no visible effective/updated date in the rendered body and points contact to the Contact page. The longer source-of-record versions with the placeholders are in `/Users/ken/cmba_app/cmba-backend-build/docs/legal/PRIVACY_POLICY.md` (lines 3 to 4: `Effective date: [add date]` and `Last updated: [add date]`; lines 124 to 127: the Privacy Officer block with `[privacy@cmba.ab.ca or your designated address]` and `[add phone]`), `TERMS_OF_USE.md`, and `GUARDIAN_CONSENT_AND_CHILDRENS_PRIVACY.md` in that same `legal/` folder. Replace every `[add date]`, `[privacy@cmba.ab.ca or your designated address]`, and `[add phone]` with the real values from step 1, mirror the final wording into `src/content/legal.ts`, then commit and deploy (a push to the connected branch triggers a Vercel deploy to `cmbaplatform.vercel.app`).

3. Verify there are no remaining placeholders anywhere. From `/Users/ken/cmba_app`, run:
   `grep -rn "\[add date\]\|\[add phone\]\|designated address\|\[.*@cmba" cmba-backend-build/docs/legal src/content/legal.ts`
   Any hit is an unfilled placeholder. Fix it. Then open the three live pages in a browser and confirm the dates and Privacy Officer contact render correctly: `https://cmbaplatform.vercel.app/privacy`, `https://cmbaplatform.vercel.app/terms`, and `https://cmbaplatform.vercel.app/guardian-consent`.

4. Confirm the security disclosure mailbox routes to a real person. The published disclosure file at `/Users/ken/cmba_app/public/.well-known/security.txt` lists `Contact: mailto:security@cmba.ab.ca` (line 5) and a backup `Contact: https://cmbaplatform.vercel.app/contact` (line 6). A disclosure contact that bounces or goes to an unread inbox is worse than none, so:
   - Confirm the mailbox exists and is monitored. `security@cmba.ab.ca` is on the `cmba.ab.ca` domain, whose mail and DNS are run by RAMP Interactive (per `/Users/ken/cmba_app/docs/SES_SETUP.md`). If the mailbox or alias does not exist yet, this depends on RAMP (the external DNS and mail provider). Ask RAMP exactly: "Please create or confirm the mailbox or distribution alias `security@cmba.ab.ca` and route it to [the named person or group, for example the CMBA Privacy Officer and a board contact]." Route it to at least two people so a single absence does not leave a report unread.
   - Send a live test. From an outside address, email `security@cmba.ab.ca` with subject "security.txt test, please confirm receipt" and confirm a human replies. Do the same check on the backup contact: open `https://cmbaplatform.vercel.app/contact` and confirm that form or address also reaches a person.
   - Check the expiry date. `security.txt` has `Expires: 2027-06-29T00:00:00.000Z` (line 7). That is in the future, so it is valid now. Put a reminder on the Privacy Officer's calendar to refresh that file and its expiry before that date, otherwise scanners will treat the disclosure policy as stale.

5. Record completion. Once the dates and Privacy Officer contact are live on all three legal pages and the `security@cmba.ab.ca` mailbox has been confirmed to reach a person, mark Section 13 items 4 and 7 of `/Users/ken/cmba_app/docs/PRIVACY_IMPACT_ASSESSMENT.md` as done, and note the Privacy Officer name and the legal-page effective date in the PIA so the record stays current.
