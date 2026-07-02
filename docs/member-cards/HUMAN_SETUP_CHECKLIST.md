# Member Cards — Human Setup Checklist (operator actions the coding agent cannot do)

These block specific phases. Items 1–3 gate the wallet spikes (Phase 0) and Phase 2; the rest gate
Phases 3–6. **The Phase 1 backend/data layer can proceed now without any of these.**

| # | Task | Blocks | Notes |
|---|---|---|---|
| 1 | **Decommission decision** for stale us-east-2 project `cmba_app` (`vdlpmjmpaalesmddwabo`). Confirm nothing live depends on it. | Phase 0.5 close-out | App already runs on ca-central-1 `cmba-connect` — see ADR 0002. Agent will verify; you sign off on deletion. |
| 2 | **Apple**: Apple Developer Program (org) → Pass Type ID `pass.ca.cmba.member` → Pass Type cert (.p12) → WWDR **G4** intermediate → APNs auth key (.p8). Diarize cert expiry (annual). | Phase 0 Spike A, Phase 2 | Provide certs/keys as **secrets** (never in repo). Agent stores via env only. |
| 3 | **Google**: Google Pay & Wallet Console issuer account → GCP project w/ Wallet API → service-account key → link to issuer → **request publishing access early** (days–weeks; new issuers start in demo mode). | Phase 0 Spike B, Phase 2/6 | Demo mode is enough for Spike B; publishing access needed before launch. |
| 4 | **Amazon SES (ca-central-1)**: verify sender domain + DKIM, move out of sandbox, provide SMTP/API creds. | Phase 3 (claim-link email), alerts | Residency requirement — SES must be ca-central-1. Existing app already assumes SES here. |
| 5 | Decide **who gets the `league_official` role** at launch; confirm the CMBA+ referee (`official`) list is current — they are the scanner's users (D23). | Phase 4 pilot | Role assignment is super-admin-only in the UI. |
| 6 | Provide **current export files** from each credential source (record-check provider list, Safe Sport completion export, Coaching-in-CMBA/NCCP training export, registration dump) **with column headers**. Confirm what proof coaches receive per training (so the upload/review flow knows what to expect). | Phase 5 imports (seeds one named field-mapping set per source, D15) | Do not invent column names — agent builds against real headers + `import-field-mappings`. |
| 7 | Name the **CMBA Privacy Officer** contact; approve the PIPA privacy-notice + consent text, including the **guardian-consent variant** for minors (D13). | Phase 3 consent capture, PIA | Consent versions are recorded (`users.consents` / `ConsentRecords`). |
| 8 | Approve **per-role card designs** (role label + accent colors) before Phase 2 ends. | Phase 2 pass visuals | Only `coach` carries a QR (D20); other roles are visual ID only. |
| 9 | Confirm **venue connectivity** at pilot gyms (scanner is online-only, D2). | Phase 4/6 pilot | Scanner shows connectivity state; no silent offline queue. |

Secrets are delivered out-of-band and set via env only (`.env.secrets` → `supabase`/Vercel env), never
committed — CI gitleaks fails the build on any hit.
