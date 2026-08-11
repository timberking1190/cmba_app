# ADR 0004: Accept US-headquartered processors, residency in Canada, not sovereignty

- Status: Accepted (2026-08-04)
- Deciders: Ken (operator, acting with CMBA authority), coding agent

## Context

`docs/PROCESSOR_REGISTER.md` and the data residency document draw a distinction the platform
has to live with, and it had been recorded as an open board decision rather than a settled one:

- **Residency** means the data is physically kept in Canada. Supabase (Postgres and object
  storage) is on `ca-central-1` in Montreal, Vercel functions are pinned to `yul1` in Montreal,
  and AWS SES sends from `ca-central-1`. That part is done and verified.
- **Sovereignty** means the provider is beyond the reach of foreign legal process. Supabase, AWS
  and Vercel are all US-headquartered companies, so they can be subject to US legal process such
  as the CLOUD Act regardless of where the bytes sit.

Sentry is a separate and narrower question. It is US-headquartered, it is off unless a DSN is
set, and by design it carries **no personal data**: `sendDefaultPii` is off and `scrubEvent`
strips the user object (including IP), cookies, authorization headers, request bodies and query
strings before send. The register recommends creating the project in the EU region.

The platform holds data about minors, so this is not a decision to leave implicit.

## Decision

**Accept both.** Specifically:

1. **Infrastructure (Supabase, AWS, Vercel).** Accept US-headquartered processors on the basis of
   Canadian residency plus contractual protection, and accept that this is residency and not full
   sovereignty. The alternative is re-platforming onto Canadian-owned infrastructure, which is not
   achievable before the 2026-09-01 launch and would not obviously improve the security posture.
2. **Sentry (error monitoring).** Accept it as a processor of **non-personal diagnostics only**,
   conditional on the scrubbing staying in place. Create the project in the EU region as the
   register recommends.

## Conditions this acceptance depends on

This decision is not a blank cheque. It is contingent on all of the following, and if one fails
the acceptance should be revisited rather than assumed to still hold:

- Region pinning stays enforced: Supabase on `ca-central-1`, Vercel functions on `yul1`, SES on
  `ca-central-1`. A silent region change invalidates the residency half of the argument, which is
  the only half that is actually true today.
- The DPAs are executed with each vendor, and the sub-processor chain is confirmed to keep data in
  Canada at signing time. **Accepting the processors is not the same as having a DPA in force**;
  see `docs/launch-blockers/DPA_EXECUTION.md`. This ADR does not close that item.
- Sentry stays PII-free. If `sendDefaultPii` is ever turned on, or `scrubEvent` stops stripping the
  user object, Sentry becomes a personal-data processor and this acceptance no longer covers it.
- The posture stays disclosed to members in the privacy policy, in plain language, including that
  data is kept in Canada but the providers are US-headquartered.

## Consequences

- The residency narrative in `docs/PROCESSOR_REGISTER.md` and the data residency document is now a
  recorded decision rather than a pending one, and can be shown to the independent privacy reviewer
  as a position CMBA has taken deliberately.
- Sentry can be enabled once its DPA is executed and the DSN is set.
- The CLOUD Act exposure is accepted, recorded, and disclosed. It is not mitigated, and nobody
  should later read this ADR as claiming it was.
- The independent privacy review (`docs/launch-blockers/PRIVACY_REVIEW_BRIEF.md`) is explicitly
  asked whether this position is defensible. If the reviewer disagrees, their opinion is the one
  that should move, not this ADR's convenience.
