# ADR 0001 — Build Member Cards natively on Payload, not the spec's raw-Supabase stack

- Status: Accepted (2026-07-02)
- Deciders: Ken (operator), coding agent
- Context: Member Cards kickoff spec

## Context

The Member Cards kickoff spec's Backend section prescribes a raw-Supabase stack: hand-written SQL
`create type`/`create table` migrations, Postgres **RLS policies**, `security definer` functions
(`private.is_admin()`, `private.can_scan()`, `private.is_verification_admin()`), a `public.profiles`
table keyed to `auth.users`/`auth.uid()`, and **Deno Edge Functions** in `supabase/functions/`
(`/verify`, `apple-pass-web`, …).

The existing `cmba_app` repo uses **none** of that. It is Payload CMS 3.85 on Next.js 15:

- Identity is the Payload `users` collection (`req.user`); there is no `auth.users` / `public.profiles`
  / `auth.uid()`.
- Access control is Payload access functions in `src/access/` — the app's documented "security boundary,
  equivalent to RLS." There is no Postgres RLS (Payload connects as a privileged DB role and enforces
  access in the app layer).
- Server logic is Next.js Route Handlers (`src/app/(frontend)/api/v1/…`) using the Payload local API.
  There is no Deno / Supabase Edge Functions runtime.
- Schema changes are Payload-generated migrations (`npm run migrate:create`).

The spec's own working agreements say "Match existing conventions; do not introduce parallel patterns."
Building the literal raw-Supabase stack would create two coexisting architectures and duplicate systems
that already exist (credentials, consent, guardians, imports, audit, roles).

## Decision

Build the Member Card system **natively on Payload**, translating every spec construct to its repo
analog (see `docs/member-cards/PHASE1_DATA_MODEL.md` and the table in `CLAUDE.md`). The security *intent*
of the spec is preserved in full — deny-by-default access, server-authoritative verification, instant
single-active-`jti` revocation, append-only audit, no PII in tokens — implemented in Payload/Next.js
terms rather than SQL/RLS/Deno.

Notably, `.pkpass` PKCS#7 signing (spec D3) runs in a **Node** Next.js route handler here (not the
Deno-in-Supabase runtime the spec worried about), which removes the primary risk behind D3's fallback
signer. The `/verify` endpoint is a Node route handler using the Payload local API with `overrideAccess`.

## Consequences

- Spec sections that say "RLS policy" → Payload access module; "edge function" → Next.js route handler;
  "`create table`" → Payload collection + generated migration; "`public.profiles`" → `users`.
- No `supabase/functions/` or `supabase/migrations/` directories are created; migrations join
  `src/migrations/`.
- Reuse over rebuild: `certification-types` = the requirement matrix, `certifications` = credentials,
  `import-batches` + `src/lib/csvImport` = the import pipeline, `AuditLog` = admin actions,
  `RateLimitHits`/`IdempotencyKeys` = those cross-cutting concerns.
- The spec remains authoritative on *behavior and security posture*; this ADR governs *how* it is realized.
