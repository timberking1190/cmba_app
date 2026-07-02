# ADR 0002 — Region: already on ca-central-1; Phase 0.5 reduced to verify + decommission

- Status: Accepted (2026-07-02)
- Deciders: Ken (operator), coding agent

## Context

The spec's D12 / Phase 0.5 treats a **blocking** region migration as part of this build: it names the
project `cmba_app` (`vdlpmjmpaalesmddwabo`) as "currently in us-east-2" and requires creating a new
`ca-central-1` project and migrating schema + data + storage + auth before any member-card table is
created.

Discovery (2026-07-02) shows the running app is **already** on a Canadian project:

- `.env` `DATABASE_URL` → `db.pdwautioosstdgbbblxl.supabase.co`; pooler host
  `aws-1-ca-central-1.pooler.supabase.com`; `S3_REGION=ca-central-1`.
- Supabase project list: `pdwautioosstdgbbblxl` = **"cmba-connect", region `ca-central-1`**, created
  2026-06-18 (matches the repo's first Payload migration). This is prod (see memory + Vercel `yul1`).
- `vdlpmjmpaalesmddwabo` ("cmba_app", **us-east-2**) also exists but the app does **not** reference it.
- `cmba-backend-build/docs/DATA_RESIDENCY_AND_COMPLIANCE.md` already specifies the full Canadian posture
  (Supabase + Storage ca-central-1, Vercel yul1, AWS SES ca-central-1, RBAC boundary, PIPEDA/PIPA).

The app was rebuilt natively on the Canadian project; there is no in-place migration to perform.

## Decision

Treat Phase 0.5 as **already complete**. Residual work:

1. **Assert region at runtime** — a startup/health check that fails loudly if `DATABASE_URL` / storage
   endpoint is not `ca-central-1`, so no member-card data can ever be written elsewhere (Non-negotiable 1).
2. **Verify** the stale us-east-2 `cmba_app` project holds no live data/traffic any consumer depends on.
3. **Decommission** `vdlpmjmpaalesmddwabo` on operator sign-off (operator action).
4. All member-card collections/migrations are created **only** on `cmba-connect` (ca-central-1).

## Consequences

- The "blocking" Phase 0.5 gate does not block Phase 1 backend work.
- `docs/runbooks/region-migration.md` becomes a *decommission + residency-assertion* runbook, not a
  cutover runbook.
- If discovery #2 surfaces live us-east-2 dependencies, this ADR is revisited before decommissioning.
