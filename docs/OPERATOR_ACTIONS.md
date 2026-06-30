# Operator action items (CMBA Connect, Stage C)

The running checklist of things only you (the operator) can do. Code-side work is
tracked in `docs/VERIFICATION.md`. Items are ordered by urgency.

## Do this next (unblocks MFA enforcement)

- [ ] **Enroll a second factor as the super admin.** Sign in, go to
  `/account/security`, and add a passkey OR an authenticator app (TOTP). Save the
  recovery codes. Do this for at least two admin accounts (a backup). This MUST be
  done before MFA enforcement is turned on, so no admin can be locked out.
- [ ] **Then turn on enforcement.** Set `MFA_ENFORCE=true` in Vercel (Production +
  Preview) and redeploy. Confirm you are prompted to challenge at the next sign-in
  and can still reach `/admin` and `/manage`. `MFA_ENFORCE=false` is the instant
  kill-switch if anything looks wrong; keep it handy for the first 1 to 2 weeks.

## Provisioning (before public registration launch)

- [ ] **AWS SES (ca-central-1).** Follow `docs/SES_SETUP.md`: pick the sending
  domain, have RAMP publish the DKIM/SPF/DMARC records for `cmba.ab.ca` (their
  nameservers host it), create the SMTP credentials, set `SES_SMTP_*` + `EMAIL_FROM`,
  and request SES production access (it is in sandbox now). Until then transactional
  email (guardian confirmation, reminders, contested escalations, email-OTP) is
  logged but not delivered.
- [ ] **Framework upgrade.** Upgrade Next.js to the latest patched 15.x and Payload
  to a compatible release to clear the 11 triaged framework advisories
  (`.audit-allowlist.json`); verify on a Vercel preview, then re-run
  `node scripts/audit-ci.mjs` and shrink the allowlist.
- [ ] **Independent penetration test** (web + API) using `docs/PENTEST_READINESS.md`;
  remediate findings.
- [ ] **Third-party security review / architecture assessment.**
- [ ] **Privacy Impact Assessment** sign-off (`docs/PRIVACY_IMPACT_ASSESSMENT.md`)
  by a Canadian privacy professional; keep it current.
- [ ] **Sign DPAs** with Supabase, AWS, and Vercel; confirm sub-processors are
  Canada-resident (`docs/PROCESSOR_REGISTER.md`).
- [ ] **Fill legal-doc placeholders** (effective dates, Privacy Officer contact in
  Site Settings) and confirm the `security@cmba.ab.ca` disclosure mailbox.

## Migrations

- [ ] Future Payload migrations are committed but applied by you. Run
  `npm run migrate` against a Supabase branch first, then production. (The
  `add_mfa_schema` migration is already applied.)

## Data / cutover

- [ ] Set `TOTP_ENC_KEY` in Vercel (a 32-byte base64 key, separate from
  `PAYLOAD_SECRET`; one was generated into local `.env`). Treat it as a managed key:
  rotating it invalidates existing TOTP enrollments.
- [ ] Decide the TeamLinkt cutover: set `FEATURE_LEGACY_TEAMLINKT=false` once a real
  season is imported, so `/schedule` and `/standings` read only our data.
