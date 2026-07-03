# Member Cards — Staging Data Sandbox

A synthetic-data staging DB for exercising the member-card data model + scan/analytics
queries at volume, before the scanner/card UI (Phase 3/4) exists.

## Project
- **cmba-staging** — Supabase ref `tloqghknmyrxdrryuazx`, region `ca-central-1`, ~$10/mo.
- (A first attempt `cmba-connect-staging` / `sepnbjwongmwecwpydue` got stuck provisioning and
  should be deleted in the dashboard.)

## Why it was built via the Supabase MCP (not `migrate:env`/seed scripts)
This dev sandbox is IPv4-only. **New** Supabase projects expose **IPv6-only** direct DB + API
hosts (only the older prod project has IPv4 direct), so a direct `DATABASE_URL` connection from
here isn't possible. The MCP `apply_migration`/`execute_sql` (Management API) runs as `postgres`
(non-superuser: has `CREATE`, can't `ALTER` the postgres role → can't set a password → the IPv4
pooler wasn't usable either). So everything was done through the MCP as SQL.

Because porting the full 22-migration app schema via MCP would be very expensive, this uses a
**focused member-card schema** (prod column names) — a data sandbox, not a full app mirror. A
proper app-connected staging (full schema + a staging Vercel deploy on the pooler) is a separate
future task.

## What's in it (bulk-seeded via `generate_series`)
| Data | Count |
|---|---|
| Members (users) | 10,000 — 2,000 coach, 2,000 official, 2,000 minor participant, 4,000 adult participant |
| Passes (base 'print') | 10,000 (2,000 coaches carry a `current_jti`) |
| Verification tokens | 2,000 (coach passes) |
| Coach credentials | 7,800 across the 4 gating types (varied validity) |
| Card standing | **1,600 coaches cleared / 400 not-cleared** (200 expired PIC + 200 missing Safe Sport) |
| Scanner devices / scans | 5 / 1,500 (valid 1170, expired_credentials 225, revoked_token 75, not_found 30) |

Requirement matrix (gates the card): Police Information Check, Safe Sport Training (coach.ca),
Safe CMBA Interactions, CMBA Coach Training; `scannableRoles = [coach]`.

## Reproduce / reset
Schema DDL + the seed statements were run via the Supabase MCP against `tloqghknmyrxdrryuazx`
(schema: enums + `users`, `users_roles`, `certification_types(+required_for_roles)`,
`certifications`, `passes`, `verification_tokens`, `scanner_devices`, `scans`,
`member_card_config(+scannable_roles)`). To re-seed, `truncate` the tables and re-run the
`generate_series` inserts (members → member_number `CMBA-<lpad(id,5)>` → roles by `id%5` →
passes/tokens for coaches → 4 certs/coach with `id%50` failures → scanners + scans). Validation
queries: coach cleared/not-cleared (satisfied gating count == 4) and scans grouped by
result/scanner.
