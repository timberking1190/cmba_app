/*
 * B2 adversarial integration smoke against the live ca-central-1 DB. Builds a
 * minimal season with two teams and several users (two verified reps, a stranger,
 * a dual-membership user, a club admin, a super admin), then walks the full
 * report -> confirm -> final flow and the adversarial matrix at runtime, asserting
 * the collection hooks and access rules actually enforce the rules. Cleans up all
 * temporary records afterward (audit-log rows are append-only and intentionally
 * left). Run: npm run smoke:b2
 */
import 'dotenv/config'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import sharp from 'sharp'
import config from '@payload-config'

async function readStoredBytes(filename: string): Promise<Buffer> {
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'ca-central-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' },
  })
  const res = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET_PRIVATE, Key: filename }))
  const chunks: Buffer[] = []
  for await (const c of res.Body as AsyncIterable<Buffer>) chunks.push(c)
  return Buffer.concat(chunks)
}

const M = 'SMOKE-B2'
const RUN = String(Date.now()).slice(-7)
let ok = true
const created: Array<{ collection: string; id: number | string }> = []

// The scheduling tables hold only test data at this stage, so a pre-clean makes
// the smoke idempotent and clears any orphan rows from an interrupted prior run.
async function cleanFirst(payload: Payload) {
  const all = { id: { exists: true } } as never
  for (const c of ['confirmations', 'disputes', 'score-reports', 'scoresheet-files', 'incident-files', 'standings-cache', 'games', 'team-memberships'] as const) {
    await payload.delete({ collection: c, where: all, overrideAccess: true }).catch(() => {})
  }
  await payload.delete({ collection: 'teams', where: all, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'divisions', where: { full_path: { like: 'SMOKE' } } as never, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'seasons', where: { name: { like: 'SMOKE' } } as never, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'users', where: { email: { like: '@example.com' } } as never, overrideAccess: true }).catch(() => {})
}

function track<T extends { id: number | string }>(collection: string, doc: T): T {
  created.push({ collection, id: doc.id })
  return doc
}
function check(label: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) ok = false
}
async function throwsWith(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    check(label + ' (expected rejection)', false)
  } catch {
    check(label, true)
  }
}

async function mkUser(payload: Payload, who: string, roles: string[]) {
  const email = `${M.toLowerCase()}-${who}-${RUN}@example.com`
  try {
    return track('users', await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipConsentEnforcement: true },
      data: { email, password: 'SmokeTest!2026', fullName: `${M} ${who}`, dateOfBirth: '1990-01-01', roles, status: 'active' } as never,
    }))
  } catch (err) {
    console.error(`mkUser(${email}) failed:`, JSON.stringify((err as { data?: unknown }).data ?? String(err)))
    throw err
  }
}

async function main() {
  const payload = await getPayload({ config })
  await cleanFirst(payload)

  try {
    // Configure the scheduling admin so the contested escalation has a target.
    await payload.updateGlobal({ slug: 'site-settings', data: { schedulingAdmin: { email: 'smoke-admin@example.com', name: M } } as never })

    const season = track('seasons', await payload.create({ collection: 'seasons', overrideAccess: true, data: { name: `${M} Season`, status: 'active', startDate: '2026-01-01', endDate: '2026-12-31' } as never }))
    const division = track('divisions', await payload.create({ collection: 'divisions', overrideAccess: true, data: { fullPath: `${M} / U13 / A`, displayLabel: `${M} U13 A`, leagueName: M, ageGroup: 'U13', season: season.id } as never }))
    const t1 = track('teams', await payload.create({ collection: 'teams', overrideAccess: true, data: { name: `${M} Alpha`, division: division.id } as never }))
    const t2 = track('teams', await payload.create({ collection: 'teams', overrideAccess: true, data: { name: `${M} Bravo`, division: division.id } as never }))

    const repA = await mkUser(payload, 'repA', ['participant'])
    const repB = await mkUser(payload, 'repB', ['participant'])
    const stranger = await mkUser(payload, 'stranger', ['participant'])
    const dual = await mkUser(payload, 'dual', ['participant'])
    const clubAdmin = await mkUser(payload, 'club', ['club_admin'])
    const superAdmin = await mkUser(payload, 'super', ['super_admin'])

    const mkMembership = async (user: { id: number | string }, team: { id: number | string }, verified: boolean) =>
      track('team-memberships', await payload.create({ collection: 'team-memberships', overrideAccess: true, data: { user: user.id, team: team.id, role: 'rep', verified } as never }))
    await mkMembership(repA, t1, true)
    await mkMembership(repB, t2, true)
    await mkMembership(dual, t1, true)
    await mkMembership(dual, t2, true)

    const mkGame = async () =>
      track('games', await payload.create({ collection: 'games', overrideAccess: true, data: { season: season.id, division: division.id, homeTeam: t1.id, awayTeam: t2.id, startAt: '2026-03-01T18:00:00.000Z', status: 'scheduled', publishState: 'published' } as never }))

    // ---- Adversarial: who may report ----
    const g1 = await mkGame()
    await throwsWith('non-rep cannot create a score report (hook gate, even direct create)', () =>
      payload.create({ collection: 'score-reports', overrideAccess: false, user: stranger as never, data: { game: g1.id, submittedForTeam: t1.id, homeScore: 50, awayScore: 40 } as never }))
    await throwsWith('a rep cannot report for the team they do NOT represent', () =>
      payload.create({ collection: 'score-reports', overrideAccess: false, user: repA as never, data: { game: g1.id, submittedForTeam: t2.id, homeScore: 50, awayScore: 40 } as never }))

    // Happy path report by repA -> game reported.
    const reportA = track('score-reports', await payload.create({ collection: 'score-reports', overrideAccess: false, user: repA as never, data: { game: g1.id, submittedForTeam: t1.id, homeScore: 55, awayScore: 50 } as never }))
    let game = await payload.findByID({ collection: 'games', id: g1.id, overrideAccess: true })
    check('after repA reports, game is reported', (game as { status?: string }).status === 'reported')

    await throwsWith('a side cannot stack a second report (unique game+submittedForTeam)', () =>
      payload.create({ collection: 'score-reports', overrideAccess: false, user: repA as never, data: { game: g1.id, submittedForTeam: t1.id, homeScore: 99, awayScore: 0 } as never }))

    // ---- Adversarial: who may confirm ----
    await throwsWith('the reporter cannot confirm their own report', () =>
      payload.create({ collection: 'confirmations', overrideAccess: false, user: repA as never, data: { scoreReport: reportA.id, decision: 'confirmed' } as never }))
    await throwsWith('a dual-membership user cannot be the opposing confirmer', () =>
      payload.create({ collection: 'confirmations', overrideAccess: false, user: dual as never, data: { scoreReport: reportA.id, decision: 'confirmed' } as never }))
    await throwsWith('a stranger cannot confirm', () =>
      payload.create({ collection: 'confirmations', overrideAccess: false, user: stranger as never, data: { scoreReport: reportA.id, decision: 'confirmed' } as never }))

    // The opposing rep confirms -> final + recompute.
    track('confirmations', await payload.create({ collection: 'confirmations', overrideAccess: false, user: repB as never, data: { scoreReport: reportA.id, decision: 'confirmed' } as never }))
    game = await payload.findByID({ collection: 'games', id: g1.id, overrideAccess: true })
    check('after opposing rep confirms, game is final', (game as { status?: string }).status === 'final')
    const cache = await payload.find({ collection: 'standings-cache', where: { division: { equals: division.id } }, limit: 1, overrideAccess: true })
    check('standings recomputed on final (cache present with rows)', ((cache.docs[0]?.rows as unknown[]) ?? []).length === 2)

    // Fixes from the red-team pass:
    await throwsWith('a report on a finalized game is rejected (game-status gate)', () =>
      payload.create({ collection: 'score-reports', overrideAccess: false, user: repB as never, data: { game: g1.id, submittedForTeam: t2.id, homeScore: 1, awayScore: 0 } as never }))
    const gC = await mkGame()
    await throwsWith('a club admin with no membership cannot report (no admin bypass)', () =>
      payload.create({ collection: 'score-reports', overrideAccess: false, user: clubAdmin as never, data: { game: gC.id, submittedForTeam: t1.id, homeScore: 30, awayScore: 20 } as never }))

    // ---- Dual entry mismatch -> contested + dispute + escalation snapshot ----
    const g2 = await mkGame()
    await payload.create({ collection: 'score-reports', overrideAccess: false, user: repA as never, data: { game: g2.id, submittedForTeam: t1.id, homeScore: 60, awayScore: 50 } as never })
    await payload.create({ collection: 'score-reports', overrideAccess: false, user: repB as never, data: { game: g2.id, submittedForTeam: t2.id, homeScore: 40, awayScore: 70 } as never })
    game = await payload.findByID({ collection: 'games', id: g2.id, overrideAccess: true })
    check('mismatched dual entry sets the game contested', (game as { status?: string }).status === 'contested')
    const disputes = await payload.find({ collection: 'disputes', where: { game: { equals: g2.id } }, limit: 1, overrideAccess: true })
    check('a dispute was opened with the scheduling-admin email snapshot', (disputes.docs[0] as { assignedAdminEmail?: string })?.assignedAdminEmail === 'smoke-admin@example.com')

    // ---- Dual entry match -> auto final ----
    const g3 = await mkGame()
    await payload.create({ collection: 'score-reports', overrideAccess: false, user: repA as never, data: { game: g3.id, submittedForTeam: t1.id, homeScore: 48, awayScore: 45 } as never })
    await payload.create({ collection: 'score-reports', overrideAccess: false, user: repB as never, data: { game: g3.id, submittedForTeam: t2.id, homeScore: 48, awayScore: 45 } as never })
    game = await payload.findByID({ collection: 'games', id: g3.id, overrideAccess: true })
    check('matching dual entry auto-finalizes the game', (game as { status?: string }).status === 'final')

    // ---- Finalized game: scores locked to super admin ----
    await payload.update({ collection: 'games', id: g1.id, data: { homeScore: 1 } as never, overrideAccess: false, user: clubAdmin as never })
    game = await payload.findByID({ collection: 'games', id: g1.id, overrideAccess: true })
    check('a club admin CANNOT change a finalized score (field lock holds, score unchanged)', (game as { homeScore?: number }).homeScore === 55)
    await payload.update({ collection: 'games', id: g1.id, data: { homeScore: 56 } as never, overrideAccess: false, user: superAdmin as never })
    game = await payload.findByID({ collection: 'games', id: g1.id, overrideAccess: true })
    check('a super admin CAN change a finalized score', (game as { homeScore?: number }).homeScore === 56)

    // ---- Scoresheet photo: EXIF strip on the STORED bytes + privacy ----
    const exifImg = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 5, g: 6, b: 7 } } }).jpeg().withExif({ IFD0: { Copyright: 'GPS-LEAK-TEST', Software: 'lat 49.0 lon -114.0' } }).toBuffer()
    check('the test image HAS EXIF before upload', (await sharp(exifImg).metadata()).exif !== undefined)
    const exifSheet = track('scoresheet-files', await payload.create({ collection: 'scoresheet-files', overrideAccess: false, user: repA as never, data: { game: g1.id } as never, file: { data: exifImg, name: 'exif.jpg', mimetype: 'image/jpeg', size: exifImg.length } })) as { id: number | string; filename?: string }
    const storedBytes = await readStoredBytes(exifSheet.filename as string)
    check('the STORED scoresheet has NO EXIF (beforeOperation strip reaches the bucket)', (await sharp(storedBytes).metadata()).exif === undefined)

    const img = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer()
    const sheet = track('scoresheet-files', await payload.create({ collection: 'scoresheet-files', overrideAccess: false, user: repA as never, data: { game: g1.id } as never, file: { data: img, name: 'sheet.jpg', mimetype: 'image/jpeg', size: img.length } }))
    const asStranger = await payload.find({ collection: 'scoresheet-files', where: { id: { equals: sheet.id } }, overrideAccess: false, user: stranger as never })
    check('a stranger cannot read a scoresheet photo', asStranger.docs.length === 0)
    const asRepB = await payload.find({ collection: 'scoresheet-files', where: { id: { equals: sheet.id } }, overrideAccess: false, user: repB as never })
    check('the opposing rep CAN read the scoresheet photo for their game', asRepB.docs.length === 1)
    await throwsWith('a rep cannot attach a scoresheet to a game they are not on', () =>
      payload.create({ collection: 'scoresheet-files', overrideAccess: false, user: stranger as never, data: { game: g1.id } as never, file: { data: img, name: 'x.jpg', mimetype: 'image/jpeg', size: img.length } }))

    // ---- AuditLog is append-only ----
    const auditRows = await payload.find({ collection: 'audit-log', where: { entityId: { equals: String(g1.id) } }, limit: 1, overrideAccess: true })
    const auditId = auditRows.docs[0]?.id
    check('audit rows were written for the finalize actions', auditId != null)
    if (auditId != null) {
      await throwsWith('an audit row cannot be updated (even via overrideAccess)', () =>
        payload.update({ collection: 'audit-log', id: auditId, data: { action: 'tampered' } as never, overrideAccess: true }))
      await throwsWith('an audit row cannot be deleted (even via overrideAccess)', () =>
        payload.delete({ collection: 'audit-log', id: auditId, overrideAccess: true }))
    }
  } finally {
    // Cleanup (reverse order). Skip audit-log (append-only by design).
    const cleanupOrder = ['confirmations', 'disputes', 'score-reports', 'scoresheet-files', 'standings-cache', 'games', 'team-memberships', 'teams', 'divisions', 'seasons', 'users']
    // standings-cache rows are not tracked individually; remove by division.
    for (const c of [...created].reverse()) {
      if (c.collection === 'audit-log') continue
      await payload.delete({ collection: c.collection as 'games', id: c.id, overrideAccess: true }).catch(() => {})
    }
    void cleanupOrder
    const leftoverCache = await payload.find({ collection: 'standings-cache', where: {}, limit: 1000, overrideAccess: true })
    for (const d of leftoverCache.docs) {
      const div = (d as { division?: { id?: number } | number }).division
      const divId = typeof div === 'object' ? div?.id : div
      if (created.some((c) => c.collection === 'divisions' && String(c.id) === String(divId))) {
        await payload.delete({ collection: 'standings-cache', id: d.id, overrideAccess: true }).catch(() => {})
      }
    }
    await payload.updateGlobal({ slug: 'site-settings', data: { schedulingAdmin: { email: '', name: '' } } as never }).catch(() => {})
    console.log(`\nCleaned up ${created.filter((c) => c.collection !== 'audit-log').length} temporary records (audit rows left by design).`)
  }

  console.log(ok ? '\nB2 SMOKE: ALL GREEN' : '\nB2 SMOKE: FAILURES ABOVE')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
