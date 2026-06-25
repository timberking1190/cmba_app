## CMBA Connect Stage B Build Blueprint (authoritative)

This is the build blueprint an engineer implements from directly. It supersedes the synthesized blueprint and folds in all 41 red-team findings. Conventions are verified against the live codebase at /Users/ken/cmba_app/src. STRICT: no em dashes or en dashes anywhere in code, copy, or this document.

### 0. Verified codebase facts this plan is built on

- Access helpers live in src/access/index.ts: isSuperAdmin, isClubAdmin, isAnyAdmin, clubIdOf, hasRole, superAdminOnly, authenticated, publishedOrAdmin, superAdminFieldOnly. Role union is participant, coach, official, club_admin, super_admin. There is NO isAdmin or isOwner helper; owner and club scoping are written inline returning a Where.
- The default-deny convention: every custom collection Access fn starts with if(!user) return false. publishedOrAdmin is the one existing exception (returns {_status:{equals:'published'}} for non-admins including anonymous). Games.read and StandingsCache.read are NEW intentional exceptions of the same kind and are documented as such below.
- CertificateFiles is the private-upload precedent: upload {disableLocalStorage:true, mimeTypes image-or-pdf}, read readOwnerOrSuperAdmin returning {owner:{equals:user.id}}, owner forced in beforeChange, owner field-locked superAdminFieldOnly. Registered under the PRIVATE s3Storage block with value true in payload.config.ts (line 138). The PUBLIC block (Media, line 128) uses disablePayloadAccessControl:true. ScoresheetFiles and the new incident-files collection both go in the PRIVATE block, never the public one.
- Users.auth.tokenExpiration is 2 * 60 * 60 (2h), cookies sameSite Lax, no refresh today. Roles field-locked superAdminFieldOnly. notificationPrefs group exists with certificationReminders and generalUpdates.
- migrations push:false (migrations are source of truth); existing migrations are 200 to 489 lines each. Cron precedent: src/app/(frontend)/api/cron/<name>/route.ts with export const dynamic='force-dynamic', runtime='nodejs', maxDuration=60, checkCronAuth (Bearer CRON_SECRET, fail-closed 503 when unset), paginate, summary {...,ranAt}, payload.logger. vercel.json pins regions ['yul1'] (Canadian residency) and lists crons with UTC schedules.
- Front end: src/lib/scheduleUtils.ts holds client-safe Game, SerialGame, StandingRow, GameStatus and pure helpers (serializeGame, filterUpcoming, filterResults, divisionsFrom, groupByDate, sortStandings, mapsUrl). Consumed by ScheduleView.tsx and StandingsTable.tsx. src/lib/teamlinkt.ts is the server-only data layer with getEvents() and getStandings(), both ZERO-ARG today. GameStatus is scheduled|final|cancelled today. StatusChip in ScheduleView.tsx is a non-exhaustive if/if/fall-through. StandingsTable re-sorts via sortStandings and renders rank as {i+1}; sortStandings comparator is b.pts-a.pts || b.diff-a.diff || b.w-a.w (no id fallback).
- overrideAccess:true is ALREADY widespread in RSC pages (ref, compliance/dashboard, consent-audit limit 1000 unscoped, coach/pathway, coach/courses, account, guardian/confirm) and services (compliance.ts, erase-user). The "grep flags overrideAccess outside 3 dirs" gate is therefore unenforceable as stated and is replaced (section 13).
- SiteSettings global: read ()=>true, update superAdminOnly; has privacyOfficer and contact groups. A new schedulingAdmin email field is added here.
- GameReports is the public anonymous incident intake (create ()=>true, read isAnyAdmin), distinct from the net-new game-linked participant-filed GameIncidents. IncidentLog is the PIPEDA breach log (super-admin only). All three stay distinct.
- Vitest is configured via package.json ("test": "vitest run"); tests are co-located in __tests__; existing tests are pure I/O-free (certStatus, reminders). NO DB tests.

### 1. Scope and the source-of-truth decision (confirm with Ken before B1 cutover)

CMBA Connect becomes the source of truth for schedule, scores, standings, and officials. TeamLinkt is retained ONLY for the one-time CSV migration (externalId mapping) and registration deep-links, behind a FEATURE_LEGACY_TEAMLINKT flag with the iframe fallback wired until a seeded season exists and the B4 non-blank gate passes. Unknown-club on import is warn-and-create-on-approval, never silent. Both decisions are stated back to Ken and gated; do not delete teamlinkt.ts or flip the cutover until confirmed.

### 2. Collections (field lists, access posture, field-level locks)

Group names: Competition, Compliance, System, People, Settings. Every collection access object has explicit {read,create,update,delete}. Every composite uniqueness is a collection-level indexes:[{fields:[...],unique:true}] entry, NEVER field-level unique:true (finding 2): field-level unique:true is single-column only and would make game globally unique. The generated migration must emit a real CREATE UNIQUE INDEX; the verification gate inspects the committed SQL for each.

2.1 Seasons (Competition)
- Purpose: competition container owning standingsConfig and the immutable seasonSeed (the absolute final tiebreaker key).
- Access: read isAnyAdmin->true else {status:{not_equals:'archived'}} (intentional public read, documented like publishedOrAdmin); create/update/delete superAdminOnly.
- Fields: name text req useAsTitle; sport text default 'basketball'; status select [setup,active,playoffs,complete,archived] default setup; startDate date req; endDate date req; timezone text default 'America/Edmonton' readOnly; defaultGameLengthMinutes number default 60; bufferMinutes number default 15; seasonSeed number set once in beforeChange (never recomputed) access {create:superAdminFieldOnly,update:superAdminFieldOnly} readOnly; standingsConfig group, WHOLE group access {create:superAdminFieldOnly,update:superAdminFieldOnly}: pointsWin number default 2, pointsLoss number default 0, pointsTie number default 1, tiebreakers array of {criterion select [headToHead,winPct,pointDiff,pointsFor,fewestPointsAgainst,wins]} ordered drag-sortable default [headToHead,pointDiff,pointsFor], pointDiffCap number default 40, mercyEnabled checkbox default true, includeForfeits checkbox default true, forfeitScoreFor number default 20, forfeitScoreAgainst number default 0, forfeitWinPoints number default 2, forfeitPenaltyPoints number default 0, pointsForBasis select [capped,raw] default capped (finding 23: makes the pointsFor tiebreaker basis explicit), legend textarea.

2.2 Divisions (Competition)
- Purpose: canonical entity replacing the regex divisionOf() string. fullPath is the CSV match key.
- Access: read public when parent season not archived else admin; create/update/delete superAdminOnly. requiredRampLevel super-admin field-locked.
- Fields: fullPath text req useAsTitle, UNIQUE-per-season via collection index [season,fullPath] and composed in beforeChange from leagueName/ageGroup/tier when blank, matched case-insensitively and trimmed at import; displayLabel text (short, e.g. 'U13 Boys A', used for chips and dropdowns; fullPath is the import key only, finding 30); leagueName text req; ageGroup text req; gender select [boys,girls,coed]; tier text; season relationship->seasons req index access {update:superAdminFieldOnly}; scheduleType select [round_robin_single,round_robin_double,custom] default round_robin_single; requiredRampLevel select [none,level1,level2,level3] default none access {create:superAdminFieldOnly,update:superAdminFieldOnly}; sortOrder number.

2.3 Teams (Competition)
- Access: read public when parent season not archived else admin; create/update/delete isAnyAdmin (club_admin inline-scoped to {club:{equals:clubIdOf(user)}}, super_admin all). division and club update-locked superAdminFieldOnly so a club_admin cannot move a team out of scope.
- Fields: name text req useAsTitle, UNIQUE within division via beforeValidate and collection index [division,name]; club relationship->clubs index access {update:superAdminFieldOnly}; division relationship->divisions req index access {update:superAdminFieldOnly}; color text; logo upload->media (public, not PII); externalId text index; active checkbox default true; importBatch relationship->import-batches index.

2.4 TeamMemberships (Competition) THE VERIFIED-REP GATE
- Access: read own {user:{equals:user.id}} OR isAnyAdmin (fellow-member read is NOT a bare relational Where; if surfaced it is an async fn resolving the requester's team ids first, else false); create authenticated (self-claim, lands unverified); update/delete isAnyAdmin only. verified, verifiedBy, verifiedAt, role, user field-locked superAdminFieldOnly. beforeChange forces user=req.user.id and verified=false on non-admin create, stamps verifiedAt when an admin sets verifiedBy (mirrors Certifications). beforeChange also rejects a self-claim that conflicts with an existing verified membership and is rate-limited via the durable limiter (finding 12).
- Fields: user relationship->users req index access {update:superAdminFieldOnly}; team relationship->teams req index; role select [rep,coach,manager] req default rep access {create:superAdminFieldOnly,update:superAdminFieldOnly}; verified checkbox default false access {create:superAdminFieldOnly,update:superAdminFieldOnly}; verifiedBy relationship->users locked; verifiedAt date readOnly locked; invitedEmail text. Collection index [{fields:[user,team],unique:true}].

2.5 Venues (Competition)
- Access: read public (not PII; families need directions); create/update/delete superAdminOnly.
- Fields: name text req unique index useAsTitle (CSV venue key); address text; city text; province text default 'AB'; postalCode text; mapsUrl text; notes textarea; blackoutDates array of {date date, reason text}; externalId text index.

2.6 Courts (Competition)
- Access: read public; create/update/delete superAdminOnly. venue update-locked.
- Fields: name text req (auto 'Main' for single-surface venues); venue relationship->venues req index access {update:superAdminFieldOnly}; active checkbox default true; externalId text. Collection index [{fields:[venue,name],unique:true}]. On-delete restrict so a referenced court is not orphaned from Games.court.

2.7 Games (Competition) the central scheduled-game and result entity
- Access: read INTENTIONAL EXCEPTION to default-deny (finding 11): if isAnyAdmin return true; build base [{publishState:{equals:'published'}}]; if user, async-resolve the requester's verified team ids and push {homeTeam:{in:ids}} and {awayTeam:{in:ids}}; return {or: base}. Never return false for anonymous (the public schedule must read published games). create/update/delete isAnyAdmin only; reps NEVER write Games directly; all transitions go through src/lib/games/service.ts via overrideAccess:true only inside an already-authorized branch. status, publishState, scores, periodScores, forfeit, version, changeLog field-locked.
- Note: Games use an explicit publishState field, NOT Payload _status, so public visibility decouples from Payload versioning.
- Fields: season relationship->seasons req index; division relationship->divisions req index; homeTeam relationship->teams req index; awayTeam relationship->teams req index; venue relationship->venues index; court relationship->courts index; startAt date req index (stored UTC, America/Edmonton on input); endAt date computed startAt + season.defaultGameLengthMinutes; status select [scheduled,reported,contested,final,postponed,cancelled,forfeit] default scheduled, field-locked via gameStatusFieldAccess; publishState select [draft,published] default draft field-locked; version number default 1 readOnly (optimistic lock, bumped every service write); homeScore number min0 scoreFieldLock; awayScore number min0 scoreFieldLock; periodScores array {period,home,away} scoreFieldLock; forfeit group {isForfeit checkbox, outcome select [home_forfeit,away_forfeit,double_forfeit,no_contest], forfeitingTeam relationship->teams, reason text} field-locked (finding 18 adds outcome); officials array of relationship->game-officials (denormalized read mirror); changeLog array {at,actor,actorEmail,field,from,to,reason} append-only via service field-locked; externalId text index; notes textarea; isBye checkbox default false (no court, no standings); bracketSeries relationship->bracket-series index; importBatch relationship->import-batches index; lockedAt date readOnly set when status->final|forfeit.
- scoreFieldLock FieldAccess (finding 6): deny score and status writes when isFinalized(doc.status) UNLESS isSuperAdmin (matches the override route, which is super-admin-only for finalized games).

2.8 ScoreReports (Competition)
- Access: read a verified member of either team OR isAnyAdmin (async-resolved team-scoped Where, never a bare relational join, finding 4); create authenticated, BUT the beforeChange hook is the SOLE HARD GATE (finding 1): create:authenticated is intentionally permissive because create access cannot see the incoming submittedForTeam; the hook MUST re-query TeamMemberships(user=req.user.id, team=data.submittedForTeam, verified=true, role in rep/coach/manager) and THROW (not return) on failure, and MUST validate submittedForTeam is home or away of data.game derived from the game, never trusting data.submittedForTeam as authority. update/delete superAdminOnly. beforeChange forces submittedBy=req.user.id, server-sets source and submittedAt.
- Fields: game relationship->games req index access {update:superAdminFieldOnly}; submittedBy relationship->users req index access {create:superAdminFieldOnly,update:superAdminFieldOnly} forced req.user.id; submittedForTeam relationship->teams req index (validated home|away AND a team the user verifies for); homeScore number req min0; awayScore number req min0; periodScores array {period,home,away}; scoresheetPhoto upload->scoresheet-files (PRIVATE); notes textarea (escaped on render); source select [web,mobile] req server-set locked; submittedAt date readOnly server-set; idempotencyKey text index. Collection index [{fields:[game,submittedForTeam],unique:true}].

2.9 ScoresheetFiles (Competition) PRIVATE youth photos
- Access (finding 4, 28, 40): read async Access fn: if !user false; if admin true; else fetch the requester's verified TeamMembership team ids, then game ids where homeTeam OR awayTeam in those ids (request-scoped cache), return {or:[{owner:{equals:user.id}},{game:{in: gameIds}}]}; return false when the id set is empty. create authenticated (owner forced). update/delete owner-or-superAdmin Where. Registered under the SAME PRIVATE s3Storage block as CertificateFiles (value true, access ON), NEVER the public Media block. upload {disableLocalStorage:true, mimeTypes ['image/png','image/jpeg','image/webp']}.
- Fields: owner relationship->users req index access {update:superAdminFieldOnly} forced req.user.id; game relationship->games index access {update:superAdminFieldOnly}, server-forced at attach time so the backref cannot be repointed (finding 4). hooks.beforeChange (the single EXIF choke point): reject bytes > 8MB BEFORE sharp; reject non-image mimeTypes early; sharp(req.file.data).rotate().toBuffer() to drop ALL EXIF including GPS on the in-memory buffer; reject if sharp throws; the stripped buffer replaces req.file.data.

2.10 Confirmations (Competition)
- Access: read a verified member of either team OR isAnyAdmin (async-scoped); create authenticated, BUT beforeChange and the /confirm service REJECT 403 unless ALL FOUR hold (finding 5): (a) req.user is a verified rep of a team on the game; (b) confirmingTeam EQUALS the game's OPPOSING team relative to report.submittedForTeam, derived from the game (opposingTeam = game.homeTeam === report.submittedForTeam ? game.awayTeam : game.homeTeam), and req.user holds a verified membership on THAT derived team; (c) confirmingUser (server-forced req.user.id) !== report.submittedBy; (d) req.user does NOT hold verified memberships on BOTH teams of this game (dual-membership conflict routes to admin). update/delete superAdminOnly. confirmingUser, confirmingTeam forced and field-locked.
- Fields: game relationship->games req index access {update:superAdminFieldOnly}; scoreReport relationship->score-reports req index; confirmingUser relationship->users req forced locked; confirmingTeam relationship->teams req (validated opposing, derived); decision select [confirmed,disputed] req; photoAcknowledged checkbox default false (must be true to confirm when the report has a photo); notes textarea; createdAt date readOnly; idempotencyKey text index. Collection index [{fields:[scoreReport,confirmingUser],unique:true}].

2.11 Disputes (Competition) review requests / contested escalation
- Access: read raisedBy OR a verified member of either team OR isAnyAdmin ({raisedBy:{equals:user.id}} for non-admins, plus async team scope); create authenticated, only a verified member of one of the teams (re-derived in beforeChange); raisedBy forced. update isAnyAdmin only. delete superAdminOnly. status, resolvedBy, resolution, assignedAdminEmail field-locked.
- Fields: game relationship->games req index; raisedBy relationship->users req forced locked; reason textarea req; status select [open,resolved] default open access {update:superAdminFieldOnly}; assignedAdminEmail text (server-set from SiteSettings.schedulingAdmin at open time, locked, finding 10/20); resolvedBy relationship->users locked; resolution textarea access {update:superAdminFieldOnly}; createdAt date readOnly; resolvedAt date readOnly.

2.12 Officials (Competition)
- Access: read isAnyAdmin OR the linkedUser ({linkedUser:{equals:user.id}}); create/update/delete isAnyAdmin. rampLevel and linkedUser super-admin field-locked.
- Fields: name text req useAsTitle; email email index; phone text; rampLevel select [level1,level2,level3] access {create:superAdminFieldOnly,update:superAdminFieldOnly}; maxGamesPerDay number; externalId text index; notes textarea; linkedUser relationship->users index access {create:superAdminFieldOnly,update:superAdminFieldOnly}; active checkbox default true; importBatch relationship->import-batches index.

2.13 GameOfficials (Competition)
- Access: read isAnyAdmin OR the assigned official's linkedUser (inline Where via officialUserId); create/update/delete isAnyAdmin. assignedBy, assignedAt forced and locked. Every change writes AuditLog plus an SES assignment email.
- Fields: game relationship->games req index; official relationship->officials req index; officialUserId relationship->users index readOnly (denormalized from official.linkedUser at create for the read Where); role select [referee1,referee2,scorekeeper,other] req; assignedBy relationship->users req forced locked; assignedAt date readOnly; status select [assigned,accepted,declined] default assigned access {create:superAdminFieldOnly,update:superAdminFieldOnly}. Collection index [{fields:[game,official],unique:true}].

2.14 AuditLog (Compliance) APPEND-ONLY system of record
- Access (finding context): read isAnyAdmin; create ()=>false at the public layer (writes only via overrideAccess in authz'd branches); update ()=>false for EVERYONE including super_admin; delete ()=>false for everyone. Append-only DOUBLY enforced beyond access: beforeChange throws on operation==='update' AND beforeDelete throws unconditionally, so even overrideAccess cannot rewrite history.
- Fields: actor relationship->users index (nullable for cron); actorEmail text (snapshot, survives user deletion); action text req (e.g. game.finalize, membership.verify, official.assign, import.commit, import.undo); entity text req; entityId text req index; before json; after json; reason text; at date req server-set index. useAsTitle action.

2.15 ImportBatches (Competition)
- Access: read/create/update/delete isAnyAdmin. createdRecords, committedAt, status written by the import service only (locked). Undo flips status and removes the created rows in one transaction.
- Fields: kind select [teams,venues,officials,games] req; fileName text; counts json {ready,warnings,errors,imported}; publishMode select [draft,published]; status select [pending,committed,undone] default pending (finding 36: pending-first for resumability); createdRecords json [{collection,id}] (undo manifest); committedBy relationship->users readOnly; committedAt date index; undoneBy relationship->users readOnly; undoneAt date readOnly; undoExpiresAt date (committedAt + undoWindowMinutes); undoWindowMinutes number default 60.

2.16 IdempotencyKeys (System)
- Access: read/create/update/delete ()=>false for ALL callers; written/read only via overrideAccess inside the helper. admin.hidden. Fail-closed: store outage -> 503.
- Fields: key text req index; scope text req index (e.g. report:game:123); userId text index (same key from a different user -> 403); requestHash text (sha256 of method+path+the STABLE LOGICAL fields, not the multipart envelope, finding 39); statusCode number; responseBody json; createdAt date index (TTL-swept after 24h). Collection index [{fields:[key,scope],unique:true}] so a race writes once.

2.17 StandingsCache (Competition) derived, NOT source of truth
- Access (finding 14): read public only for non-archived, active/published divisions. Implemented by pre-resolving allowed division ids (season.status not archived and not setup) and scoping {division:{in: ids}}, OR by denormalizing seasonStatus onto the row and gating on it. Never ()=>true. create/update/delete ()=>false for users; only the standings service writes via overrideAccess.
- Fields: division relationship->divisions req index unique; rows json (serialized StandingRow[] in final sorted order, EACH with a server-assigned integer rank, finding 15/29); inputsHash text (hash of canonical-ordered final/forfeit game tuples + config + seasonSeed); computedAt date readOnly; legend text (snapshot of standingsConfig.legend); seasonStatus text (denormalized for the read gate).

2.18 PlayoffBrackets (Competition) gap item 1
- Access: read public when published; create/update/delete superAdminOnly. seedSnapshot frozen at seed time; re-seed is explicit and audited.
- Fields: name text req useAsTitle; division relationship->divisions req index; season relationship->seasons index; format select [single_elim,double_elim] req; status select [draft,published,complete] default draft; seedSnapshot json (ordered team ids at seed time, locked); seededAt date readOnly; publishState select [draft,published] default draft locked.

2.19 BracketSeries (Competition)
- Access: read public when parent bracket published; create/update/delete superAdminOnly. winner set by the advancement service (locked).
- Fields: bracket relationship->playoff-brackets req index; round number req; slot number req; homeSeed number; awaySeed number; homeTeam relationship->teams; awayTeam relationship->teams; game relationship->games index; feedsInto relationship->bracket-series; feedsIntoSlot select [home,away]; isLosersBracket checkbox default false; winner relationship->teams readOnly access {update:superAdminFieldOnly}.

2.20 GameIncidents (Compliance) gap item 7
- Access: read isAnyAdmin ONLY (private youth-safety data). create authenticated, BUT beforeChange verifies the filer is a verified rep of a team on the game, an assigned official, or an admin (re-derived; else throws). update/delete superAdminOnly. filedBy forced and locked. No PII in any notification body.
- Fields: game relationship->games req index; filedBy relationship->users req forced locked; filedByRole select [rep,coach,official,admin] req (validated against memberships/assignments, not self-asserted); type select [injury,conduct,ejection,other] req; involvedTeam relationship->teams; description textarea req; occurredAt date; attachment upload->incident-files (the SEPARATE admin-only private collection, finding 40, NOT scoresheet-files); status select [new,reviewing,closed] default new access {update:superAdminFieldOnly}; createdAt date readOnly.

2.21 IncidentFiles (Compliance) NET-NEW, admin-only private bucket
- Purpose (finding 40): a SEPARATE private upload collection for GameIncidents.attachment whose read scope is admin-only (mirroring GameIncidents), so incident photos can never be reached through the looser ScoresheetFiles read Where. Shares the same sharp EXIF-strip hook and the same private s3Storage block (value true).
- Access: read isAnyAdmin; create authenticated (owner forced); update/delete superAdminOnly. upload {disableLocalStorage:true, mimeTypes image-only}.
- Fields: owner relationship->users req index access {update:superAdminFieldOnly} forced; game relationship->games index access {update:superAdminFieldOnly}. beforeChange = the shared 8MB-then-sharp strip hook.

2.22 SCAFFOLDS behind feature flags (model-only this stage)
- Sanctions (Competition): subjectMembership, game, type [suspension,warning,technical_accumulation,ejection], gamesSuspended, status [active,served,overturned], notes, createdAt. read isAnyAdmin OR the subject membership's user; create/update/delete isAnyAdmin. Not wired into eligibility.
- Availability (Competition): membership req, game req, response [yes,no,maybe,unknown] default unknown, note, respondedAt. Collection index [{fields:[membership,game],unique:true}]. read/create/update/delete: async fn resolving the requester's own membership ids first (the membership's user OR a verified coach/manager of that team OR isAnyAdmin), never a bare relational Where; false on empty (finding 9). PRIVATE, flag-off.
- PlayerStats (Competition): game req, team, membership req, points, fouls, rebounds, assists, minutes, enteredBy readOnly locked, enabled checkbox default false (the flag). read DEFAULT isAnyAdmin OR the membership's OWN user/guardian, NOT all team members, until a consent model exists (finding 9). create/update/delete isAnyAdmin. flag-off.

2.23 Users field additions (People)
- pushDevices array of {token text, platform select [ios,android,web], registeredAt date, lastSeenAt date}; scoped to the user self via the existing updateUsers Where; tokens never exposed to other users or any list shape.
- notificationPrefs additions: schedule reminders and general-updates flags reused; the targeted-announcement suppression keys off the existing generalUpdates flag (finding 38).

2.24 SiteSettings additions (Settings)
- schedulingAdmin group {email email, name text} (finding 10/20). update remains superAdminOnly (already enforced), so a club_admin cannot repoint the escalation address.

### 3. Service modules (src/lib, pure unless noted; co-located Vitest; NO DB tests)

3.1 src/lib/standings/computeStandings.ts (pure, injectable now, lifts to packages/core)
- computeStandings(finalGames, config, seasonSeed): StandingRow[] with rank. Re-sorts input by (startAt, id) DEFENSIVELY before accumulating so it is order-independent (finding 20). Accumulates gp/w/l/t/pf/pa/pts. winPct is w/gp with gp===0 -> 0 (never NaN, finding 17). Emits an integer rank per row (finding 15/29).
- rankStandings: pts desc, then config.tiebreakers in order, each only among teams still tied, then headToHead per section 5, then the absolute final (seasonSeed asc, team.id asc) key so the comparator never returns 0 for distinct teams.
- buildInputsHash(finalGames, config, seasonSeed) over the canonical (startAt,id) order.
- computeStreak/lastFive from the passed chronological order, never from now.
- Tests: mercy cap, forfeit W/L/GP accounting, double_forfeit, no_contest exclusion, includeForfeits=false semantics, bye exclusion, 3-way ties, the rock-paper-scissors H2H cycle (falls through, never loops, never falsely separates), unbalanced-schedule H2H skip, idempotency (shuffle input, assert rows AND streak AND hash identical), winPct never NaN.

3.2 src/lib/standings/index.ts (server orchestrator, the only DB toucher)
- recomputeDivision(payload, divisionId): payload.find({collection:'games', where:{division, status:{in:[final,forfeit]}, publishState:{equals:'published'}}, sort:['startAt','id'], overrideAccess:true}) (finding 14: published-only so a draft-final game never moves public standings; finding 20: pinned sort), call computeStandings, upsert StandingsCache only when inputsHash changed.
- getStandings(divisionId?): zero-arg league-wide form preserved for the existing /standings page (aggregates all non-archived divisions' cache docs, setting row.division = division.displayLabel so divisionsFrom() and the === division filter keep working, finding 30); optional divisionId for the per-division view.

3.3 src/lib/gameStateMachine.ts (pure transition table + guards)
- canTransition(from,to,actor:{isAdmin,isSuperAdmin,isVerifiedRepOfGame}):boolean per the section 4 machine.
- isFinalized(status): final or forfeit.
- effectsOf(transition): {recompute, email}. recompute is true for EVERY transition where isFinalized(from) XOR isFinalized(to) is true (entering OR leaving final/forfeit) AND for any score edit of an already-final game (finding 14/37).
- nextStatusForReport(existingReports,newReport): match -> final, mismatch -> contested.
- assertActorMayReport / assertActorMayConfirm throw 403 with the rep, opposing-derived, not-own-report, and not-dual-membership rules (section 2.8, 2.10).

3.4 src/lib/games/service.ts (server, the only writer of Games status/scores)
- Every mutation runs in ONE payload transaction (req.transactionID) with: optimistic+status conditional update, changeLog append, AuditLog write, conditional recompute, conditional email. overrideAccess:true only inside these authorized branches.
- The reported->final write is a CONDITIONAL update WHERE id=:id AND version=:expected AND status='reported' (finding 7/13): 0 rows affected -> 409. This is the single serialization point for finalize, independent of the Idempotency-Key, so two different-key confirms racing one reported game yield exactly one final and one 409.
- reportScore(gameId,user,body,idemKey): rep gate, write ScoreReport, status->reported, dual-entry compare.
- confirm(gameId,user,decision,idemKey): opposing-rep gate, not-own-report -> final+recompute OR contested+Dispute+admin email.
- adminOverride(gameId,admin,patch,reason): finalize/edit/forfeit/postpone/cancel; for any game where isFinalized() the caller must be super_admin (finding 6); club_admin overrides are inline-scoped to games involving their own club; reason REQUIRED; AuditLog + changeLog + recompute (recompute fires on leaving final too).
- applyForfeit(outcome): validates forfeitingTeam set unless outcome is double_forfeit or no_contest; applies forfeit scoring + recompute.
- publishGame/draftGame: schedule-change email; advanceBracketOnFinal.

3.5 src/lib/conflicts/detect.ts (pure) per section 6.
3.6 src/lib/roundRobin/generate.ts (pure) per section 6.
3.7 src/lib/csvImport/parse.ts + validate.ts (pure) + commit.ts (thin DB wrapper) per section 7.

3.8 src/lib/api/idempotency.ts (server)
- withIdempotency(req,{scope,userId,run}): blank key -> 400; look up (key+scope) overrideAccess: found + userId mismatch -> 403; found + requestHash mismatch -> 409; found + match -> return stored {statusCode,responseBody} WITHOUT running; else run(), persist the response ONLY on a completed transaction, then return it. requestHash is over the STABLE logical fields plus the file content hash, not the multipart envelope (finding 39). The find+insert relies on the DB unique (key+scope) so a race writes once; store unreachable -> 503.

3.9 src/lib/api/auth.ts (server, token + net-new refresh, finding 33)
- requireUser(req) -> User | 401 via payload.auth({headers}) reading Authorization: JWT <token>.
- issueRefreshToken(user): store HASHED handle, userId, expiry (a RefreshTokens collection: read/create/update/delete ()=>false, written via overrideAccess only).
- rotateRefresh(refreshToken): rotate-on-use; on reuse-detection revoke the whole family; scope to access-token issuance only.
- logout revokes the family.
- The native SDK contract: a 401 on any mutation triggers ONE /auth/refresh then transparently replays the original request WITH the same Idempotency-Key, so a mid-report expiry never double-counts.

3.10 src/lib/cmbaSchedule.ts (server-only, REPLACES teamlinkt.ts data layer)
- getEvents() -> Game[] (published games mapped through the extended GameStatus, ZERO-ARG). Date never crosses the RSC boundary (serializeGame to epoch ms; server passes now=Date.now()).
- getStandings(divisionId?) -> StandingRow[] (ZERO-ARG league-wide preserved; optional divisionId). Each row carries rank and division=displayLabel.
- On a Payload query error, getEvents/getStandings catch, log a server error, and return a sentinel distinguishable from the legitimate empty state so the page can show "temporarily unavailable" rather than blank (finding 41). teamlinkt.ts is retained behind FEATURE_LEGACY_TEAMLINKT for the one-time migration and deep-links.

3.11 src/lib/ics/feed.ts (pure builder, gap item 5, finding 35)
- buildIcs(games,{name,scope}) -> text/calendar. Emits DTSTAMP (RFC5545 required), an embedded VTIMEZONE component for America/Edmonton (not just TZID), VEVENT per published game (UID stable per game id, DTSTART/DTEND with TZID, SUMMARY 'Home vs Away', LOCATION venue, STATUS CONFIRMED/CANCELLED). Published games only.
- The /api/v1/ics routes take an UNGUESSABLE per-resource token (HMAC(server-secret, scope+id) or a stored random token), not the raw id; the route is rate-limited. Team-level feeds are flag-gated pending Ken's decision; division/league feeds ship.

3.12 src/lib/emailEvents.ts + src/lib/rateLimit.ts
- emailReportRequest, emailContested, emailScheduleChange, emailAssignment, emailTargetedAnnouncement: text only, NO PII, portal link only (base=NEXT_PUBLIC_SERVER_URL||localhost), try/catch + payload.logger.error(String(err)). Non-transactional mail (targeted announcements) honors notificationPrefs.generalUpdates===false; contested escalation and official assignment are TRANSACTIONAL and never suppressed.
- emailContested: server-sent and unsuppressable to SiteSettings.schedulingAdmin.email snapshotted on the Dispute AND re-resolved live at send time; if unset at snapshot time, fall back to EMAIL_FROM and payload.logger.error so it never silently no-ops (finding 10/20).
- emailTargetedAnnouncement (finding 38): ONE single-recipient envelope per recipient (never multi-recipient To/Cc/BCC across families), suppress notificationPrefs.generalUpdates===false, dedupe guardians, include a CASL-compliant portal-prefs link.
- checkRateLimit(payload,{bucket,subject,limit,windowMs}) -> {ok,retryAfter}, backed by a durable Supabase-backed RateLimitHits set written via overrideAccess (NOT in-memory; serverless is ephemeral), swept by the TTL cron. Wraps /report, /confirm, /import, membership self-claim, ICS.

### 4. Game status state machine

Games.status: scheduled | reported | contested | final | postponed | cancelled | forfeit. Games.publishState (orthogonal axis, explicit field, NOT _status): draft | published, gating only public visibility. Every transition runs inside games/service in ONE transaction with version+status conditional update, changeLog append, AuditLog write, conditional recompute (effectsOf), conditional email.

1. scheduled -> reported: a VERIFIED REP of either team via /report (assertActorMayReport). Effect: ScoreReport row, email the OPPOSING rep, no standings change. Then dual-entry check.
2. reported -> final: the OPPOSING verified rep Confirmation decision=confirmed (assertActorMayConfirm) OR dual-entry both-sides-MATCH (system). Effect: recompute, set lockedAt, lock score fields. Written via the conditional WHERE version+status guard.
3. reported -> contested: opposing rep decision=disputed OR a Dispute is raised OR dual-entry MISMATCH. Effect: Dispute row (assignedAdminEmail snapshotted), unsuppressable transactional escalation to the configured scheduling admin, NO standings change.
4. contested -> final: ADMIN override only, corrected score + required reason. Effect: recompute + AuditLog.
5. contested -> forfeit | cancelled | postponed: ADMIN only.
6. scheduled/reported/contested/final -> postponed | cancelled: ADMIN only; postponed leaves standings untouched; cancelled excludes the game; if a PUBLISHED game's time/date/venue changes, email affected teams. When the game LEAVES final/forfeit (e.g. final->postponed, final->cancelled), effectsOf returns recompute:true and recomputeDivision REMOVES the game's contribution (finding 14/37).
7. any -> forfeit: ADMIN only (applyForfeit); applies forfeit scoring (with outcome) + recompute.
8. final/forfeit -> anything: SUPER-ADMIN override only (canTransition returns false unless actor.isSuperAdmin for finalized games, finding 6); every edit of a finalized game writes AuditLog with the required reason and recomputes.

Stall/deadlock handling: a single report never auto-finals; the B5 reported-not-confirmed cron reminds then surfaces an admin queue and, after a configured window, prompts an ADMIN finalize-from-single-report (never auto-final, finding 27). Contested with a misconfigured scheduling-admin email fails the open transition with 503 + log rather than snapshotting blank, falls back to a super-admin distribution list, and a contested-aging cron escalates stale contested games to all super-admins (finding 20).

Enforcement triple-layer: gameStateMachine.canTransition in the service AND gameStatusFieldAccess (denies non-admin status writes) AND scoreFieldLock (denies score writes when isFinalized unless super_admin). A direct REST/Local PATCH of status/scores is impossible. Optimistic concurrency is the conditional update WHERE id AND version AND status, not read-then-write (finding 13).

### 5. Standings algorithm (exact, with the deterministic final tiebreaker)

INPUT: only status final or forfeit, AND publishState='published' (finding 14); isBye and no_contest excluded entirely.

STEP 1 accumulate per team. Played final game: pf += ownScore, pa += oppScore; winner w++, gp++, pts += pointsWin; loser l++, gp++, pts += pointsLoss; tie t++, gp++ each, pts += pointsTie. Mercy/diff cap (mercyEnabled): the DIFF column is the sum of clamp(margin, -pointDiffCap, +pointDiffCap); pf/pa store RAW for the PF/PA columns. The pointDiff tiebreaker uses the SAME capped value as the DIFF column. The pointsFor tiebreaker uses config.pointsForBasis (default capped) so capped-vs-raw is explicit and the legend states it (finding 23).

FORFEIT (includeForfeits=true), driven by forfeit.outcome (finding 17/18):
- home_forfeit / away_forfeit: the non-forfeiting team gp++, w++, pf += forfeitScoreFor, pa += forfeitScoreAgainst, pts += forfeitWinPoints; the forfeiting team gp++, l++, pf += forfeitScoreAgainst, pa += forfeitScoreFor, pts += pointsLoss - forfeitPenaltyPoints. Forfeit margin is subject to the diff cap.
- double_forfeit: BOTH teams gp++, l++, pf += forfeitScoreAgainst, pa += forfeitScoreFor, pts += pointsLoss - forfeitPenaltyPoints; NO win credited.
- no_contest: excluded entirely.
- includeForfeits=false (finding 25): forfeit games are EXCLUDED from the input set upstream (so gp also excludes them); the legend states forfeits do not count. Never let a forfeit game pass the filter and then no-op inside accumulation.

STEP 2 sort (stable, deterministic, total order): primary pts desc, then config.tiebreakers in order applied ONLY among teams still tied: headToHead, winPct (w/gp, gp0->0), pointDiff (capped), pointsFor (per basis), fewestPointsAgainst asc, wins desc.

headToHead rule (finding 19): compute a mini round-robin of pts among EXACTLY the tied set, resolved from the same final games. Use H2H to order ONLY when every pair in the tied set has played at least once AND the resulting H2H points are strictly distinct across the tied set. Otherwise (any sub-tie remaining, a full cycle, or an unplayed pair) SKIP H2H entirely and fall through to the next configured criterion on the WHOLE still-tied set unchanged. Never apply partially.

ABSOLUTE FINAL DETERMINISTIC TIEBREAKER (never omitted): after all configured criteria and head-to-head, break any remaining tie by the stable ascending key (season.seasonSeed, team.id). seasonSeed is assigned once at season create and never recomputed (locked super-admin). The comparator never returns 0 for two distinct teams, so the sort can never loop or be order-dependent.

OUTPUT: each StandingRow carries a server-assigned integer rank in final order. StandingsCache.rows stores them pre-sorted with rank. Standings move only on entering OR leaving final/forfeit (effectsOf drives recompute in both directions). IDEMPOTENCY: computeStandings is pure over the canonical (startAt,id)-ordered tuples + immutable config + immutable seed; buildInputsHash lets recomputeDivision skip the upsert on unchanged inputs. The nightly cron self-heals (writes on drift), it does not merely log (finding 26).

### 6. Conflict detection and the generator

CONFLICT DETECTION (src/lib/conflicts/detect.ts, pure, shared by import, generator, and the assigning screen). window(game) = [startAt, startAt + season.defaultGameLengthMinutes + season.bufferMinutes); overlaps(a,b) = a.start < b.end && b.start < a.end. THREE blocking ERRORS, each comparing every candidate against other candidates AND already-published games: VENUE_COURT_DOUBLE_BOOK (same venue+court id, overlapping); TEAM_DOUBLE_BOOK (a team id in two overlapping games); OFFICIAL_DOUBLE_BOOK (an official id via GameOfficials in two overlapping games). WARNINGS (acknowledgeable): OFFICIAL_OVER_MAX (more games/day than maxGamesPerDay); OFFICIAL_RAMP_BELOW (rampLevel below division.requiredRampLevel). Byes excluded. Output is a typed {kind, gameA, gameB, sharedKey, window} with deterministic ordering; ERRORS are never bypassable.

WHY A SEPARATE Courts COLLECTION: conflict keys must be stable relationship ids; Games.court needs a durable reference surviving a court rename/reorder; an array index/string is not stable. The Venues CSV is one row per (venue,court) mapping 1:1 to a Courts row for idempotent upsert on (venue,name); single-surface venues auto-get a 'Main' court so every game has a non-null court id; on-delete restrict keeps the key intact.

ROUND-ROBIN GENERATOR (src/lib/roundRobin/generate.ts, pure, circle method). ODD N -> append a synthetic BYE sentinel making N+1 even; fix team 0, rotate the rest; each round pairs N/2; the team paired with the sentinel byes (isBye, no court, no standings). Single = N-1 rounds; double = 2(N-1) by running twice with home/away swapped. CRITICAL (finding 24): filter out any pairing containing the BYE sentinel BEFORE applying the home/away swap and before assignSlots, in BOTH passes; emit the surviving sentinel pairing as isBye with null court and null opponent, never as a Teams relationship. assignSlots greedily packs each non-bye fixture into the next free (slot,court), skipping venue.blackoutDates + season blackout + inactive courts + unavailable windows; unplaceable fixtures are returned as warnings, never silently dropped. The generated set is ALWAYS run through detectConflicts before commit. Tests: odd N double RR has no Games referencing the sentinel; each real team appears in exactly 2(N-1) real fixtures plus exactly 2 byes; total real games == N*(N-1); bye fixtures carry isBye and no court; blackout avoidance.

### 7. CSV import dry-run / commit / undo pipeline

DRY-RUN VALIDATE (POST /api/v1/import/validate, admin): the SERVER receives the CSV text + a kind auto-detected from the header (admin-overridable). parseCsv enforces header-exact UTF-8 names, trims, quoted-comma handling, skips blank rows, ignores extra columns. Per-kind pure validators classify each row ready/warning/error using INJECTED lookup maps (so they are fully unit-testable): ERRORS block (missing required, division not matching a fullPath, home==away, team not in stated division, court not at venue, bad date/24h time); WARNINGS need acknowledgement (past date, duplicate-in-DB, invalid email, unknown ramp level, UNKNOWN CLUB -> a warning offering create-on-approval, never silent). Lookups are case-insensitive and trimmed (divisions by fullPath, teams by name-within-division, venues by name, courts by venue+name, officials by name+email). buildPreview merges validation + detectConflicts (across the file AND against published games) in the admin summary-band shape with row numbers, plain-language messages, and offending values.

ACKNOWLEDGE GATE: "Import now" is disabled until errors==0 AND (no warnings/conflicts OR the acknowledge checkbox is ticked). The server RE-ENFORCES this on commit and NEVER trusts the browser flag (commit rejects 400 if errors>0 or unacknowledged warnings/conflicts).

SINGLE-TRANSACTION COMMIT (POST /api/v1/import/commit, Idempotency-Key REQUIRED, finding 32/36): cap import size per commit (reject or chunk at N rows, surface the cap in the template UI). Write the ImportBatch FIRST in status 'pending' with the planned manifest. Open ONE payload transaction (req.transactionID), write valid rows in dependency order (Teams, Venues, Courts upsert on (venue,name), Officials, then Games resolving names->ids and setting publishState from the admin draft|published choice + importBatch), recording created ids into the batch as it goes. Set status 'committed', counts, publishMode; write one AuditLog 'import.commit'. The route maxDuration is set well above the worst-case commit. Any throw -> full rollback. A timeout/connection-death leaves a resumable 'pending' batch the admin can resume or undo, never orphaned rows. The Idempotency-Key makes a retried/double-tapped commit return the same batch.

UNDO (POST /api/v1/import/:batchId/undo, admin): within undoExpiresAt (committedAt + 60 min) reverse exactly the manifest ids in one transaction (children first), flip status=undone + undoneAt, AuditLog 'import.undo'; 409 outside the window.

### 8. /api/v1 endpoint table

All routes under src/app/(frontend)/api/v1/<resource>/route.ts; payload via getPayloadClient(); auth via payload.auth({headers}) reading Authorization: JWT <token>; cookies CSRF-rejected for headless. Status ladder 401/403/400/404/409/503; errors {error}; mutation success {ok:true,...}.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/users/login | public | EXISTING. 2h access JWT. Unchanged. |
| POST | /api/v1/auth/login | public | Thin wrapper returning access JWT + a refresh token. |
| POST | /api/v1/auth/refresh | refresh token | NET-NEW. Validate + rotate; reused/revoked -> 401 + revoke family. |
| POST | /api/v1/auth/logout | JWT + refresh | Revoke the refresh-token family. Idempotent. |
| GET | /api/v1/config | public | minSupportedAppVersion (soft nudge unless an explicit minVersion is returned; never hard-block on unreachable), timezone, standings legend, feature flags. No PII. |
| GET | /api/v1/games | public published / JWT widens to rep drafts | Cursor-paginated {data,nextCursor} on (startAt,id); filter division/team/date/status. Anonymous gets published only. |
| GET | /api/v1/games/:id | public if published else JWT participant/admin | Single game + scores + officials; scoresheet link for participants/admins. 404 (not 403) for a non-participant draft. |
| POST | /api/v1/games/:id/report | JWT verified rep; Idempotency-Key REQUIRED | Submit a ScoreReport (assertActorMayReport server-side); multipart scoresheet; 403 non-rep or finalized; 409 stale version or replayed key+body; routes through reportScore. |
| POST | /api/v1/games/:id/confirm | JWT verified rep of the OPPOSING team or admin; Idempotency-Key REQUIRED | Confirm or dispute (assertActorMayConfirm); confirmed -> conditional final + recompute; disputed -> contested + Dispute + unsuppressable escalation. |
| POST | /api/v1/games/:id/dispute | JWT verified member of one team | Raise a Dispute -> contested; always emails the SiteSettings scheduling admin (transactional). |
| POST | /api/v1/uploads/scoresheet | JWT verified rep; Idempotency-Key supported | Single shared multipart image endpoint (field 'file', web + mobile camera). Image-only + 8MB; EXIF/GPS stripped via the ScoresheetFiles hook; private bucket; returns {ok:true,fileId}. |
| GET | /api/v1/standings | public | Reads StandingsCache (query division= or league-wide); never triggers recompute; returns rows (with rank) + legend + computedAt. |
| GET | /api/v1/brackets/:divisionId | public published | Bracket tree: series nodes + seeds + winners. |
| POST | /api/v1/admin/games/:id/override | JWT; super_admin for finalized games, else isAnyAdmin club-scoped | The only path that edits a finalized game; REQUIRED reason; changeLog + AuditLog; may notify teams; recompute. |
| POST | /api/v1/admin/games/:id/officials | JWT isAnyAdmin | Assign/replace officials with conflict checks; GameOfficials + AuditLog; SES assignment notice. |
| POST | /api/v1/admin/schedule/generate | JWT admin | Round-robin generator -> proposed games into the SAME dry-run + conflict preview before commit. |
| GET | /api/v1/me/dashboard | JWT rep | Upcoming games for my verified teams + games awaiting my report or confirmation; one CTA per item. |
| GET | /api/v1/me/assignments | JWT official linkedUser | An official's OWN assignments only. |
| POST | /api/v1/import/validate | JWT admin | Dry-run parse + validate + conflict-check; writes nothing. Rate-limited. |
| POST | /api/v1/import/commit | JWT admin; Idempotency-Key REQUIRED | Pending-first, chunked, one-transaction commit after the acknowledge gate; server re-enforces errors==0 + acks; ImportBatch + AuditLog; retried commit returns the stored batch. |
| POST | /api/v1/import/:batchId/undo | JWT admin | Reverse within the undo window; AuditLog import.undo; 409 outside. |
| POST | /api/v1/incidents | JWT verified rep/official/admin on the game | File a GameIncident; 403 if not a participant/official/admin (re-derived). |
| GET | /api/v1/ics/team/:token.ics, division/:token.ics, game/:token.ics | public, unguessable HMAC token, no PII | Read-only ICS; text/calendar with DTSTAMP + embedded VTIMEZONE; rate-limited; team-level flag-gated. |
| POST | /api/v1/devices | JWT | Register/refresh a device push token on Users.pushDevices. |
| POST | /api/v1/announcements/targeted | JWT admin | Single-recipient-per-message targeted announcement; suppresses generalUpdates===false; CASL link. |

### 9. Adversarial-matrix to enforcement mapping

| # | Attack | Enforcement |
|---|---|---|
| 1 | Non-verified-rep reports/confirms (UI or direct /api/score-reports) | ScoreReports/Confirmations beforeChange is the SOLE hard gate (create:authenticated is intentionally permissive): re-query verified TeamMemberships for req.user and THROW; never trust data.submittedForTeam. Plus the /report,/confirm routes 403. Test a plain authenticated POST to /api/score-reports is rejected by the hook (finding 1). |
| 2 | Reporter confirms own report | Confirmations rejects confirmingUser===report.submittedBy and requires confirmingTeam = the game-derived OPPOSING team and rejects dual-membership users (finding 5). |
| 3 | Rep touches a game not involving their team (ID tampering) | Authority re-derived from req.user verified memberships; submittedForTeam must be home|away of the path game; Games/ScoreReports/ScoresheetFiles read Wheres are async team-scoped; a tampered id falls outside and 404/403s. |
| 4 | Finalized game edited by non-super or cross-club | Override route super-admin-only for finalized games; club_admin non-finalized overrides inline-scoped to own club; scoreFieldLock denies on isFinalized unless super_admin; every edit AuditLogged with a reason (finding 6). |
| 5 | Scoresheet photo leak (non-participant, EXIF/GPS, oversize/non-image, wrong bucket) | Private s3 block (value true, access ON); async read Where = owner OR game in my verified team game ids; game backref locked + server-forced; sharp strip + 8MB + image-only in the single beforeChange choke point; served via access-checked file.url. Stranger fetch and just-unverified-rep fetch both denied by test (finding 4/28/40). |
| 6 | Standings double-count / non-determinism / staleness | computeStandings consumes only published final/forfeit rows, pure with a total-order final tiebreaker; conditional WHERE version+status finalize is the single serialization point; UNIQUE (game,submittedForTeam) and (key,scope); buildInputsHash no-op; recompute fires on entering AND leaving final; nightly self-heal (findings 2,7,13,14,17,18,19,20,26,37). |
| 7 | Contested email suppressed/redirected/no-op | Server-sent unsuppressable transactional to SiteSettings.schedulingAdmin (snapshot + live re-resolve); fallback to EMAIL_FROM + error log if unset; SiteSettings update is superAdminOnly (findings 10,20). |
| 8 | History rewrite | AuditLog access create/update/delete denied at the layer AND beforeChange throws on update AND beforeDelete throws, so even overrideAccess cannot rewrite. |
| 9 | Missing server-side authz / unsafe overrideAccess | Every mutation is a guarded /api/v1 route + a collection access fn; field-locks on every trust field; overrideAccess permitted only with a co-located re-derived where (section 13), forbidden in RSC pages for cross-team/youth collections (finding 3). |
| 10 | Officials see others' assignments / non-admin assigns | GameOfficials/Officials read scoped to linkedUser/officialUserId; create/update/delete isAnyAdmin; AuditLog + SES per change. |
| 11 | Idempotency replay / cross-user / different-body / outage | UNIQUE (key,scope); cross-user 403; different logical body 409; outage 503; logical-field requestHash so a re-encoded multipart retry is not a false 409 (finding 39). |
| 12 | Draft-game leakage to public | Games.read returns published-only for anonymous and only ORs in async team-scoped drafts for a verified rep; /api/v1/games/:id returns 404 for a non-participant draft; StandingsCache and ICS query published only (findings 11,14,35). |
| 13 | Targeted-announcement roster/email leak + CASL | One single-recipient envelope per recipient; suppress generalUpdates===false; dedupe; portal-prefs link (finding 38). |
| 14 | Membership self-claim spam / social-engineering | Rate-limited; conflict-rejected; surfaced with claimant identity; optional invite-gating (finding 12). |
| 15 | Client re-sort defeats canonical standings | StandingsTable renders server rank and sorts by a.rank-b.rank only; sortStandings removed from the live path (findings 15,16,29). |

### 10. Front-end rewire plan

10.1 scheduleUtils.ts (ONE PR, build fails otherwise)
- Extend GameStatus to scheduled|reported|contested|final|postponed|cancelled|forfeit.
- StandingRow gains rank:number (server-assigned) and optional streak, lastFive.
- filterResults includes status==='final' || status==='forfeit' (finding 31).
- filterUpcoming excludes final|forfeit|cancelled (forfeit is not upcoming).
- Keep sortStandings ONLY for the legacy TeamLinkt path behind FEATURE_LEGACY_TEAMLINKT; delete once cmbaSchedule.ts is the sole source.
- Co-located Vitest over a fixture with all 7 statuses asserts each lands in exactly one of upcoming/results/neither.

10.2 StatusChip (ScheduleView.tsx) becomes an EXHAUSTIVE switch with default: const _x: never = status so a missing chip is a COMPILE error (findings 21,31). Chips: scheduled (cmba-red 'Scheduled'), reported (orange-400 'Reported'), contested (orange-400 'Contested'), final (green-400 'Final'), postponed (cmba grey 'Postponed'), cancelled (red-400 line-through 'Cancelled'), forfeit (red-400 'Forfeit'). A Vitest asserts a DISTINCT chip per literal.

10.3 StandingsTable.tsx
- Remove sortStandings; render rows in server order; render r.rank instead of {i+1}; when filtering by division, filter without re-sorting (sort by a.rank-b.rank only). A Vitest asserts the rendered order equals computeStandings order on a head-to-head fixture and a seed-only tie where pts/diff/w would reorder it (findings 15,16,29).
- The division dropdown values become Division.displayLabel (short), not fullPath. getStandings() zero-arg aggregates all non-archived divisions' cache docs, setting row.division=displayLabel so divisionsFrom() and the === division filter keep working (finding 30). A Vitest asserts the dropdown options and the filter predicate cannot drift.

10.4 Data layer: teamlinkt.ts -> cmbaSchedule.ts (same Game/StandingRow shapes via payload.find). Date never crosses the RSC boundary. On a query error, return a sentinel distinct from empty so the page shows "temporarily unavailable" not blank; keep the iframe fallback wired until the B4 non-blank gate passes (finding 41).

10.5 Public pages (Off+Brand: cmba-* palette, font-display/body/mono, PhotoHero + max-w-7xl, StandingsTable data-table idiom, green-400/red-400/orange-400 status colors, STRICT no em/en dashes): /schedule (ScheduleView over Payload, filter by division/team/date/status, venue maps via mapsUrl, per-game Add-to-calendar ICS button), /standings (StandingsTable + a plain-language legend block from standingsConfig.legend), NEW /bracket/[divisionId] (public bracket tree reusing the data-table idiom).

10.6 Rep dashboard (NEW /rep or /account/team) fed by GET /api/v1/me/dashboard: Your upcoming games; Awaiting your report (CTA Report score); Awaiting your confirmation (CTA Review, shows the opposing score + scoresheet photo + confirm/dispute). One shape powers web now and native later.

10.7 Replace /score-login (currently a TeamLinkt deep-link) with a real CMBA verified-rep sign-in (email/password via /api/v1/auth/login -> JWT) routing a verified rep to the rep dashboard. Auth handlers use CORRECT relative import paths and try/catch so Sign Out never silently dies (the dynamic-import-path gotcha).

10.8 Admin consoles (Off+Brand, tablet-usable): /admin/import (three-step screen, four template download cards from public/templates, upload+validate, preview with errors/warnings/conflicts, acknowledge gate, draft|publish choice for Games, undo, audit), /admin/schedule (create/edit/move/postpone/cancel/forfeit, draft vs publish, changeLog viewer, generator launcher), /admin/contested (the contested queue + a contested-aging surface + the awaiting-confirmation queue), /admin/officials (assigning screen with conflict + max-day + ramp warnings + SES notice).

10.9 Nav (5-tab cap across Header/Footer/MobileNav): schedule and standings already exist; add Brackets by folding it into a Schedule submenu, not a 6th top tab. STRICT no em/en dashes in all copy.

### 11. overrideAccess discipline (replaces the unenforceable grep-gate, finding 3)

overrideAccess:true is permitted in RSC pages and services ONLY when the SAME call carries a where that re-derives scope from req.user (team ids or user id). The gate asserts the where-clause exists, not the file path. For cross-team/youth collections (ScoreReports, ScoresheetFiles, IncidentFiles, GameIncidents, Confirmations, PlayerStats, Availability) overrideAccess is FORBIDDEN in any RSC page; reads go through the access-checked path. While here, the pre-existing unscoped 1000-user overrideAccess read in compliance/consent-audit/page.tsx is audited and scoped or justified.

### 12. Authorization-contract test layer (finding 37)

Because of NO DB tests, add a thin pure unit layer that calls the access functions directly with a fabricated req.user of each role and asserts the boolean or Where. Every field with access:{...superAdminFieldOnly} and every collection access fn must have such an assertion. A grep gate: any access:{ in a collection without a matching test is a CI fail. This catches a flipped default-deny at the phase that introduces it, not three phases later.

### 13. Crons (vercel.json, UTC, yul1, checkCronAuth, summary {...,ranAt})

- report-window reminder (remind reps a game is awaiting a report).
- reported-not-confirmed reminder + escalation (NEVER auto-confirm; surfaces an admin queue; after a window prompts admin finalize-from-single-report) + contested-aging escalation to super-admins (finding 27,20).
- idempotency + rate-limit TTL sweep (24h).
- nightly standings safety recompute: paginated by division with a per-division time budget; SELF-HEALS by writing recomputed rows on inputsHash drift AND logs the drift; summary carries completedDivisions/totalDivisions and complete=false if truncated; maxDuration raised (up to 300) and/or sharded across ticks; inherits yul1 (Canadian residency) (findings 26,34).

### 14. Phase-by-phase build plan with verification gates

Run migrate:create at EACH phase boundary so each migration is bounded and applied/verified on a Supabase preview branch before the next (finding 38). CI runs migrate on a fresh DB under a timeout.

B0 Foundations + confirm + auth/idempotency
- Deliverables: confirm source-of-truth + unknown-club decisions with Ken. Seasons, Divisions (canonical fullPath + displayLabel), Teams, Venues, Courts, TeamMemberships + access fns + field-locks + composite indexes; AuditLog (triple append-only), IdempotencyKeys, StandingsCache, RefreshTokens, RateLimitHits, SiteSettings.schedulingAdmin; src/lib/api/auth (refresh+logout) + idempotency + rateLimit; extend GameStatus literals and update StatusChip (exhaustive switch) + filterUpcoming + filterResults together; migrate:create + migrate.
- Verification: build+typecheck+lint clean; payload-types regenerated; the authorization-contract test layer (section 12) green for every B0 access fn and field-lock (non-admin cannot PATCH TeamMemberships.verified, club_admin cannot move a Team's division); Vitest on idempotency replay/cross-user/different-body, AuditLog update/delete throws, the verified-rep predicate, and the scheduleUtils status branches; the composite-unique-index inspection on the committed SQL; migration applies on a Supabase branch; NO DB tests.

B1 Pure core + Games + state machine + standings
- Deliverables: src/lib/standings (computeStandings with rank + rankStandings) + conflicts + roundRobin + csvImport parse/validate + gameStateMachine, all pure with injectable now and co-located Vitest; Games collection (status/publishState/version/changeLog/forfeit-with-outcome + field locks) + games/service (conditional version+status finalize) + StandingsCache wiring (published-only recompute, both-direction effectsOf); replace teamlinkt.ts with cmbaSchedule.ts behind the legacy flag; StandingsTable renders server rank.
- Verification: Vitest green: standings math, tiebreakers including the H2H cycle/unbalanced-skip and the seed final key, mercy/diff cap, forfeit W/L/GP + double_forfeit + no_contest + includeForfeits=false, bye exclusion, idempotent recompute (shuffle input -> identical rows+streak+hash), winPct never NaN; generator odd/even + bye-never-on-court + double-RR no-sentinel-leak + blackout; conflict overlap matrix; CSV row validation; state-machine canTransition table + field-lock unit checks; recompute fires on final->cancelled (game drops from cache); StandingsTable preserves server rank order; schedule/standings render from Payload.

B2 Verified reporting + confirm + private photos
- Deliverables: ScoreReports, ScoresheetFiles (private + sharp EXIF strip), IncidentFiles, Confirmations, Disputes; games/service report/confirm/dual-entry/override; /api/v1 report/confirm/dispute + the shared /uploads/scoresheet; refresh-token auth + Idempotency-Key wired with refresh-and-replay; emailEvents (report request, contested, schedule change, reminders).
- Verification: the full report->confirm->final and dual-entry-mismatch->contested flows; the ENTIRE adversarial matrix as integration tests (plain authenticated POST to /api/score-reports rejected by the hook; self-confirm blocked; dual-verified-membership user routed to admin; ID tamper 404/403; finalized-edit super-admin-only + cross-club override blocked + audited; stranger and just-unverified-rep photo fetch denied; EXIF stripped on a known-GPS image; oversize/non-image rejected; incident photo NOT reachable via the scoresheet read path; replay no double-count; two different-key confirms race -> exactly one final one 409; token-expiry mid-report -> one 401 -> auto-refresh -> single ScoreReport; logical-multipart-retry not a false 409; unsuppressable contested email with the unset-fallback path); Playwright rep report -> opposing confirm -> standings update.

B3 Import + generator + conflicts + officials consoles
- Deliverables: csvImport commit/undo (pending-first, chunked, resumable); ImportBatches; /api/v1 import validate/commit/undo + schedule/generate + games/:id/officials; Officials + GameOfficials; /admin/import + /admin/schedule + /admin/contested + /admin/officials; four CSV templates in public/templates; SES assignment + schedule-change + escalation emails.
- Verification: import dry-run -> acknowledge -> single-transaction commit -> undo within window; a forced mid-commit error leaves zero rows; a simulated timeout/connection-death leaves a resumable pending batch (never orphans); conflict detection in the preview; generator byes/availability/blackout; official double-book + max-day + ramp warnings; AuditLog per import + assignment; Playwright admin publish.

B4 Public/rep front end + API surface
- Deliverables: all /api/v1 routes (auth login/refresh/logout, cursor games, single multipart upload, /config min-version soft-nudge, /me/dashboard, /me/assignments, /devices, /standings, /brackets); extend nav; public /schedule, /standings (+legend), /bracket pages; rep dashboard; replace /score-login with the verified-rep sign-in; docs/API.md (OpenAPI).
- Verification: every endpoint with the JWT header returns the documented shape, supports Idempotency-Key, rejects unauthorized, and CSRF-rejects cookies for headless; refresh rotation + reuse-detection; Playwright e2e rep report -> opposing confirm -> standings -> admin publish with no console/server errors; StatusChip renders all 7 states; the NON-BLANK gate: /schedule and /standings against a seeded season render non-empty rows AND a simulated cmbaSchedule query error shows "temporarily unavailable" (distinct from empty), not blank (finding 41); no em/en dashes.

B5 Gap additions + scaffolds + crons + gate
- Deliverables: PlayoffBrackets + BracketSeries seeded from standings + the bracket page + advancement-on-final (seedSnapshot frozen, re-seed audited); ics/feed (DTSTAMP + VTIMEZONE + token routes, division/league live, team flag-gated); targeted Announcements extension (single-recipient, CASL, suppress generalUpdates); GameIncidents; scaffolds Sanctions/Availability/PlayerStats (flag-off, async-scoped read fns stubbed with the youth-leak note) + Users.pushDevices; the four crons in vercel.json (UTC, yul1) per section 13; docs/API.md + docs/VERIFICATION.md + an admin season-running guide; SCAFFOLDS in their own late migration.
- Verification: full verification gate green including the re-run adversarial matrix; seed a two-division season and walk import -> publish -> report -> confirm -> contested -> standings -> bracket with no console/server errors; the nightly self-heal restores a corrupted cache row; the truncation summary sets complete=false; scan for any public youth-data/scoresheet exposure or non-Canadian storage (none); append results to docs/VERIFICATION.md.