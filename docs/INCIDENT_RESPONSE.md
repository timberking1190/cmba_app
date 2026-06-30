# Incident response runbook (CMBA Connect)

Stage C / S3. This runbook covers a suspected or confirmed security or privacy
incident. It is tied to the in-app IncidentLog collection and to the breach duties
under PIPEDA and Alberta PIPA. Keep it short enough to actually follow under stress.

## Roles

- Privacy Officer: named in Site Settings. Owns breach assessment and any
  notification to the Office of the Privacy Commissioner of Canada (OPC) and to
  affected individuals.
- Technical lead: contains and remediates, preserves evidence.
- Disclosure contact: security@cmba.ab.ca (published in /.well-known/security.txt).

## Severity and target timelines

| Severity | Examples | Contain | Assess |
| --- | --- | --- | --- |
| Critical | Confirmed exposure of personal or children's data; admin/account takeover; data destruction | Immediately | Within 24 hours |
| High | Exploitable vulnerability with a likely path to personal data; MFA bypass | Same day | Within 72 hours |
| Medium | Limited-impact vulnerability; suspicious access without confirmed exposure | 3 business days | Within 7 days |
| Low | Hardening gap, no live exposure | Next sprint | At triage |

## Steps

1. Record it. Open an IncidentLog entry (admin panel) with what is known, the time,
   the suspected severity, and who is involved. Update it as you learn more; it is
   the single source of truth for the incident.
2. Contain. Revoke sessions (the affected user's `/account/security` devices, or
   sign-out-everywhere). For a compromised credential, force a password reset (this
   invalidates other sessions automatically). Disable a compromised integration key.
   If needed, set `MFA_ENFORCE=true` and/or take a feature behind its flag.
3. Preserve evidence. Do not delete logs. Export the relevant AuditLog entries and
   run `npm run verify-audit-log` to confirm the audit trail is intact (no TAMPERED
   rows). Capture Vercel runtime logs and Supabase logs for the window.
4. Eradicate and recover. Patch the cause, rotate any exposed secret (PAYLOAD_SECRET,
   TOTP_ENC_KEY, S3 keys, CRON_SECRET, SMTP creds), redeploy, and confirm the fix.
5. Assess breach obligations (Privacy Officer). Under PIPEDA, a breach of security
   safeguards that creates a real risk of significant harm requires notification to
   the OPC and to affected individuals as soon as feasible, plus a kept record of
   the breach. Apply the same care under Alberta PIPA. Children's data raises the
   risk assessment. Document the decision and rationale in the IncidentLog entry.
6. Notify. If required, notify the OPC, affected individuals (and guardians for
   minors), and any processor or partner implicated. Keep the notice plain and
   actionable.
7. Close and learn. Record root cause, the fix, and follow-up actions in the
   IncidentLog. Open hardening tickets. Update the threat model and this runbook if
   the incident revealed a gap.

## Monitoring signals to watch

- Repeated failed logins (Payload lockout trips at 5; the durable rate limiter caps
  login, MFA, and reporting buckets).
- Privilege changes (role assignment is super-admin only and audited as a role
  change).
- Bulk data exports or erasures (audited).
- MFA changes (enroll, challenge pass/fail, session revoke) in the AuditLog.
- Any TAMPERED row from `npm run verify-audit-log`.

These are recorded in the append-only, HMAC-protected AuditLog. Centralized log
shipping with alerting (for example to a SIEM or an alerting webhook) is an operator
add-on; wire it to these signals when provisioned. Personal data must be scrubbed
from any shipped logs.

## Retention

Keep IncidentLog and AuditLog entries for the retention period in the data residency
and compliance documentation. Do not purge during an open investigation or legal
hold.
