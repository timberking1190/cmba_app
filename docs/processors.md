# CMBA Connect — Processor & Sub-processor Register (Canadian residency)

Per PIPEDA Principle 1 (Accountability) and the Data Residency addendum, this
register records every processor that may handle CMBA Connect personal data, the
region their data lives in, and the DPA status. **Confirm each region in the
provider console and sign a DPA before launch** (see
`cmba-backend-build/docs/PROVISIONING_CHECKLIST.md` §6–7).

> Status legend: ✅ confirmed in console · ⏳ pending provisioning · ⬜ DPA not yet signed

| Layer | Processor | Region (required) | Personal data handled | Region confirmed | DPA signed | Confirmed on |
|---|---|---|---|---|---|---|
| Compute / hosting | Vercel | Montréal `yul1` | Request processing (transient); no DB | ⏳ | ⬜ | — |
| Database (Postgres) | Supabase (`cmba-connect`, ref `pdwautioosstdgbbblxl`) | `ca-central-1` (Montréal) | Profiles, certifications metadata, consents, audit | ✅ | ⬜ | 2026-06-18 |
| File storage (public) | Supabase Storage (same project) | `ca-central-1` | Profile photos, page images | ✅ region (buckets ⏳) | ⬜ | 2026-06-18 |
| File storage (private) | Supabase Storage (same project) | `ca-central-1` | Certificate files (PDF/image) | ✅ region (buckets ⏳) | ⬜ | 2026-06-18 |
| Email | AWS SES | `ca-central-1` | Recipient email + name in headers (no PII in body) | ⏳ | ⬜ | — |
| League system of record | TeamLinkt | (vendor-managed) | Registration, schedule, scores — NOT held by CMBA Connect | n/a | n/a | — |

## Notes
- **Residency vs sovereignty:** Supabase / AWS / Vercel keep data physically in
  Canada (residency) but are US-headquartered and may be subject to US legal
  process (e.g. CLOUD Act). This is residency, not full sovereignty. Record the
  board's explicit decision here if sovereignty is required.
- **Sub-processors:** confirm each provider's sub-processors are Canada-resident
  and list them here once DPAs are signed.
- **Privacy Officer:** named in Site Settings (Phase 3) and the Privacy Policy.
- Update the "confirmed on" column with the date each region is verified in the
  provider console.
