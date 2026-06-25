# CMBA Connect API (v1)

The scheduling, scores, standings, and officials API. It powers the web app and is
the contract the future iOS and Android apps consume. Versioned under `/api/v1`; a
shipped version never changes in a breaking way (add `/api/v2` for breaking changes).

Base URL: `${NEXT_PUBLIC_SERVER_URL}` (production `https://cmbaplatform.vercel.app`).

## Auth

- Web uses the secure httpOnly Payload cookie (set at login). It is CSRF protected,
  so a headless client cannot use the cookie.
- Native and headless clients use a token: send `Authorization: JWT <accessToken>`
  on every request. The access token is short lived (2 hours). A refresh token
  (rotated on every use) keeps the session alive.
- On a 401 mid request, the client calls `/api/v1/auth/refresh` ONCE and replays the
  original request WITH the same `Idempotency-Key`, so a token expiry never double
  counts a write.

## Conventions

- JSON in and out. Timestamps are ISO 8601. Times are stored UTC; the league time
  zone is America/Edmonton.
- Errors: `{ "error": "<plain message>" }` with status 400 (bad input), 401 (not
  authenticated), 403 (forbidden), 404 (not found), 409 (conflict), 413 (too large),
  429 (rate limited), 503 (store unavailable). Internal detail never leaks.
- Mutations succeed with `{ "ok": true, ... }`. Lists return `{ "data": [...],
  "nextCursor": <id|null> }` (cursor pagination on startAt+id).
- Writes that must not double count REQUIRE an `Idempotency-Key` header (a UUID per
  logical action). A retry with the same key and body replays the stored response;
  the same key with a different body is a 409; a different user is a 403. The
  composite unique indexes (one report per team per game, one confirmation per user
  per report) are the authoritative double-count backstop.

## Endpoints

### Auth
| Method | Path | Auth | Body / notes |
|---|---|---|---|
| POST | /api/v1/auth/login | public | `{ email, password }` -> `{ accessToken, exp, refreshToken, user }` |
| POST | /api/v1/auth/refresh | refresh token | `{ refreshToken }` -> new `{ accessToken, exp, refreshToken, user }`. Reuse of a rotated token revokes the whole family (401). |
| POST | /api/v1/auth/logout | refresh token | `{ refreshToken }` -> `{ ok }`. Revokes the family. Idempotent. |
| GET | /api/v1/config | public | `{ minSupportedAppVersion, timezone, apiVersion, featureFlags }`. No PII. |

### Schedule and standings (public read)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/v1/games | public (JWT widens) | `?division=&status=&after=&limit=`. Anonymous sees published games; a verified rep also sees their own team drafts. |
| GET | /api/v1/games/:id | public if published | Single game + officials. 404 (not 403) for a non-participant draft. |
| GET | /api/v1/standings | public | `?division=`. Reads the precomputed cache; never recomputes. Rows carry a server-assigned `rank`. Returns `{ data, legend, computedAt }`. |

### Reporting and confirmation (verified reps)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/v1/uploads/scoresheet | JWT verified rep | multipart `file` + `gameId`. Image only, 8 MB. EXIF and GPS stripped. Private. Returns `{ fileId }`. |
| POST | /api/v1/games/:id/report | JWT verified rep; Idempotency-Key | `{ submittedForTeam, homeScore, awayScore, periodScores?, scoresheetFileId?, notes? }`. The hook re-derives rep authority and rejects a non rep (403). |
| POST | /api/v1/games/:id/confirm | JWT opposing rep; Idempotency-Key | `{ scoreReportId, decision: "confirmed"\|"disputed", photoAcknowledged?, notes? }`. Confirm finalizes; dispute opens a review. |
| POST | /api/v1/games/:id/dispute | JWT verified member | `{ reason }`. Sets the game contested and escalates to the scheduling admin. |
| GET | /api/v1/me/dashboard | JWT rep | Upcoming games, games awaiting your report, and games awaiting your confirmation. |
| GET | /api/v1/me/assignments | JWT official | The official's OWN game assignments only. |
| POST | /api/v1/devices | JWT | `{ token, platform }`. Registers a device push token on the user. |

### Admin
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/v1/import/validate | JWT admin | `{ csv, kind?, seasonId? }`. Dry run: validate + conflict check. Writes nothing. |
| POST | /api/v1/import/commit | JWT admin; Idempotency-Key | `{ csv, kind?, publishMode?, acknowledged?, seasonId? }`. Re-enforces the acknowledge gate; commits in one transaction. |
| POST | /api/v1/import/:batchId/undo | JWT admin | Reverse a committed import within the undo window (60 min). 409 outside. |
| POST | /api/v1/admin/schedule/generate | JWT admin | `{ divisionId, double?, slots, blackoutDates?, commit?, acknowledged?, publishMode? }`. Round robin + slot assignment + conflict preview; optional commit. |
| POST | /api/v1/admin/games/:id/override | JWT; super admin for finalized games, else club admin scoped to own club | `{ patch?, forfeit?, publishState?, reason }`. The only path that edits a finalized game. Reason required and audited. |
| POST | /api/v1/admin/games/:id/officials | JWT admin | `{ assignments: [{ officialId, role }], force? }`. Double-booking blocked unless force; over-max and ramp warnings returned; notifies the official. |

## Residual / forward notes
- The access token is 2 hours; the refresh route mints a fresh one (session bound)
  and rotates the refresh token. Push fan-out itself ships later (tokens register
  now via /devices). ICS calendar feeds are documented separately in the app.
- An OpenAPI document can be generated from this contract when the native build
  starts; the shapes above are stable for v1.
