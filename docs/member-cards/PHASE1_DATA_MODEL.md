# Member Cards — Phase 1 Data Model Plan (Payload translation)

How each spec table maps onto this Payload app. **KEEP** = reuse an existing collection as-is;
**EXTEND** = add fields/hooks to an existing collection; **NEW** = new Payload collection (or global).
Security posture (deny-by-default, revocation, append-only audit, no PII in tokens) is preserved; the
mechanism is Payload access modules + Next.js route handlers, not RLS/Deno (ADR 0001).

## Reuse (no new table)

| Spec construct | Repo home | Action |
|---|---|---|
| `members` person registry | `users` collection | **EXTEND** — add `memberNumber` (text, unique, auto-gen `CMBA-#####` via a Postgres sequence, D18) and optional `externalId` (governing-body id, never exposed). Card-holders = users; a minor is already a `users` row (`isMinor` + `guardian` group), so **no separate `members` table**. |
| `card_requirements` matrix | `certification-types` | **KEEP** — role→requirement is already data (`requiredForRoles` + `isRequired`). Seed coach → record_check + safesport + cmba_coach_training. "Scannable role" is derived: any role appearing in a required cert type. Add helper `scannableRoles()`. |
| `credentials` | `certifications` | **EXTEND** — add `source` (`registration | import`, D15). Status/expiry/verify already modeled. |
| `credential_reviews` + `credential-review` bucket | `certifications` verify flow + `certificate-files` | **EXTEND** — add a ≤30-day **purge** of the file after decision (immediate on approval, D21) + a pending-review admin view. Status/expiry persist; document is deleted. |
| `admin_actions` | `AuditLog` | **KEEP** — record issue/revoke/reissue/rotate/import/purge here. |
| `rate_limits` | `RateLimitHits` | **KEEP** — reuse for `/verify` + `/verify-serial` limits (D17). |
| scan idempotency (`scans.client_uuid`) | `IdempotencyKeys` pattern | **KEEP** — dedupe network retries. |
| guardian/minor family model (D13) | `users.guardian` group + `isMinor` | **EXTEND** — see open item G below (guardian-user → dependants link for "Family Cards"). |
| consent (D7/D19) | `users.consents` + `ConsentRecords` | **KEEP** — add a `member_card` privacy-notice version + `photoOptIn` already exists; guardian-consent variant already supported. |

## New collections

| Spec table | New collection (slug) | Notes |
|---|---|---|
| `passes` | `passes` | member (rel→users), platform (apple/google/print), `serialNumber` (unguessable uuid, unique), `currentJti` (only accepted token id, D1), `appleAuthTokenHash` (bytea), status, season, issued/revoked, revokeReason. One active pass per (member, platform). |
| `verification_tokens` | `verification-tokens` | audit of minted jtis (no secret material): jti (pk), pass, member, channel (wallet/print), kid, expiresAt, revokedAt. Authenticity = Ed25519 sig; currency = jti check. |
| `scans` | `scans` | **append-only** (no update/delete access + immutability hook): scannedBy, deviceId, venue (rel), game (rel, optional), jti, member, result (enum), method (qr/serial), scannedAt, ip, deviceInfo, clientUuid (unique). Feeds Scan Analytics (D24). |
| `scanner_devices` | `scanner-devices` | deviceId (client-generated uuid, pk), user, label, revokedAt, lastSeen (D9). |
| `apple_registrations` | `apple-registrations` | deviceLibId + passSerial (pk), pushToken — PassKit web-service device registry. |
| `wallet_logs` | `wallet-logs` | raw PassKit/Wallet webhook payloads for debugging. |
| `pass_claims` | `pass-claims` | pass, codeHash (sha256 of 128-bit code — plaintext never stored), expiresAt (+30d), consumedAt, supersededAt (D7 secondary path). |
| `client_events` | `client-events` | scanner/camera/js errors for the browser app; deviceId, user, event, detail. |
| `import_field_mappings` | `import-field-mappings` | one named mapping set per source (D15): sourceName, sourceColumn, targetField, transform, isRequired, isActive. |
| `import_exceptions` | `import-exceptions` | per-row import failures: batch, rowNumber, rawRow, errorCode, message, resolved. |

## Extend existing

| Spec | Repo | Action |
|---|---|---|
| `credential_imports` | `import-batches` | **EXTEND** — add credential import `kind`s (record_check / nccp / safesport / registration) + `sourceName` + `fileSha256` (content-addressed idempotency) + exception count. Reuse the pending→committed→undo manifest pattern. |
| `app_config` (verifier flags) | Payload **global** `app-config` | **NEW global** — `verifierMinVersion`, `serialLookupEnabled`, etc. (Payload globals fit a singleton config better than a table.) |

## Access modules (the RLS translation)

Per new collection, a `src/access/<collection>.ts` module, deny-by-default:

- `passes` / `verification-tokens` / `certifications`: owner (via `users` linkage) + guardian (dependants)
  read; **admins** full; **scanner users get no direct read** — verification is only through the `/verify`
  route handler (Payload local API, `overrideAccess`).
- `scans`: `isVerificationAdmin` reads **all** (D24 analytics); a scanner reads **own** scans; append-only
  (revoke update/delete; immutability hook belt-and-suspenders).
- `scanner-devices`: `isVerificationAdmin` full (revoke); a user reads own devices.
- `import-*`, `certification-types` edits, credential review: `isAnyAdmin` only (D16).
- Scan Analytics: a route handler / Payload endpoint gated by `isVerificationAdmin` returning exactly the
  analytics columns (member name/role/number, scanner, venue, game, verdict) — never a raw join grant.

## Behavior to implement (stack-agnostic, real work)

1. **Auto-issuance (D19)** — `users` `afterChange` (create) hook: assign `memberNumber`, create a `passes`
   row, and mint a `verification-token` **only for scannable roles** (D20). Backfill script for existing
   users. Wallet download stays gated on consent (captured on the card page).
2. **Token (D1)** — `src/lib/memberCards/token.ts`: Ed25519 (EdDSA) JWS mint/verify, claims exactly
   `iss/sub/jti/iat/exp/ch/v`, no PII. Season-long TTL (13/14 mo). Single-active-jti via `passes.currentJti`;
   any non-current token → `REVOKED_TOKEN`. Rotate on events only (reissue/revoke/rollover/leak/key rotation).
3. **`/verify` + `/verify-serial`** route handlers (D2 online-only, D17 serial fallback) — live requirement
   eval against the matrix for the scanned member's role; returns verdict + photo + memberNumber + guardian
   name (dependants). `x-device-id` required; rate-limited; every call logged to `scans`.
4. **Region assertion** (ADR 0002) — refuse to boot / fail health check if not ca-central-1.

## Open items to confirm before/while building Phase 1

- **G. Guardian→dependant link for "Family Cards" (D13).** Today `users.guardian` stores guardian *contact*
  fields, not a relationship to the guardian's *user account*. To render a guardian's "Family Cards" we need
  guardian-user → dependant-users. Proposed: add a `guardianUser` relationship (rel→users) on the minor's
  record (or a light `member-guardians` join collection). Leaning `guardianUser` rel (simplest, matches the
  existing single-guardian model). **Confirm before Phase 3; not blocking the pass/scan collections.**
- **Photo on the pass.** Reuse `users.profilePhoto` (exists) gated by `photoOptIn`. Confirm sizing/asset
  pipeline in Phase 2.
- **`wallet-logs` vs `AuditLog`.** Keep wallet webhook payloads separate from `AuditLog` (different shape,
  higher volume, purgeable). Confirmed unless you prefer one store.
