/*
 * End-to-end smoke for the Member-Value gamification foundation (F1a/F1b/F2).
 *
 * Exercises the REAL engine via the Payload Local API: seed a badge, award XP,
 * watch the badge auto-award, prove idempotency and the append-only guard, then
 * create + approve a recognition and watch it grant verified XP - and confirm a
 * minor subject's isMinor is re-derived server-side.
 *
 * RUN AGAINST A DEV / BRANCH DATABASE ONLY. It writes append-only rows
 * (xp-events, badge-awards) that by design CANNOT be deleted, so it does not and
 * cannot clean up after itself. Never point it at production.
 *   DATABASE_URL=<dev-branch-url> npm run smoke:engagement
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { awardXp } from '../src/lib/gamification/engine'
import { recordRecognitionApproved } from '../src/lib/gamification/recognition'

async function main() {
  const payload = await getPayload({ config })
  let ok = true
  const check = (label: string, cond: boolean) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
    if (!cond) ok = false
  }
  const stamp = Date.now()
  const mkUser = (suffix: string, roles: string[], dob: string) =>
    payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { skipConsentEnforcement: true },
      data: { email: `smoke-eng-${suffix}-${stamp}@example.com`, fullName: `Smoke ${suffix}`, dateOfBirth: dob, roles, password: 'Smoke-Pass-123!', status: 'active' } as never,
    })

  try {
    // Actors: an admin (nominator/moderator), an adult coach (XP subject), a minor.
    const admin = await mkUser('admin', ['super_admin'], '1985-01-01')
    const coach = await mkUser('coach', ['coach'], '1990-06-15')
    const minor = await mkUser('minor', ['participant'], '2015-03-10')
    check('minor isMinor derived true on user create', Boolean((minor as { isMinor?: boolean }).isMinor))
    check('adult isMinor derived false on user create', !(coach as { isMinor?: boolean }).isMinor)

    // A verification-required XP-threshold badge for coaches.
    const badge = await payload.create({
      collection: 'badges',
      overrideAccess: true,
      data: { slug: `smoke-xp-100-${stamp}`, name: 'Smoke XP 100', audience: ['coach'], tier: 'bronze', earnKind: 'xp_threshold', earnConfig: { threshold: 100 }, verificationRequired: true, active: true, externalId: `smoke:${stamp}` } as never,
    })

    // 1) Award 100 VERIFIED XP -> the badge should auto-award.
    const first = await awardXp(payload, { user: coach.id, kind: 'challenge', amount: 100, counts: 'meaningful', verified: true, dedupeKey: `smoke-xp-${stamp}` })
    check('awardXp created the XP event', first.created === true)
    const awards1 = await payload.find({ collection: 'badge-awards', where: { and: [{ user: { equals: coach.id } }, { badge: { equals: badge.id } }] }, overrideAccess: true })
    check('verification-required badge auto-awarded on reaching 100 verified XP', awards1.totalDocs === 1)
    check('the auto-award is marked verified', Boolean(awards1.docs[0] && (awards1.docs[0] as { verified?: boolean }).verified))
    check('the auto-award captured isMinor=false for the adult', (awards1.docs[0] as { isMinor?: boolean })?.isMinor === false)

    // 2) Idempotency: same dedupeKey is a no-op, no second XP event.
    const again = await awardXp(payload, { user: coach.id, kind: 'challenge', amount: 100, counts: 'meaningful', verified: true, dedupeKey: `smoke-xp-${stamp}` })
    check('awardXp is idempotent on dedupeKey (created=false)', again.created === false)
    const events = await payload.find({ collection: 'xp-events', where: { user: { equals: coach.id } }, overrideAccess: true })
    check('exactly one XP event exists after the duplicate award', events.totalDocs === 1)

    // 3) Trust invariant: a verified event marked fun_only is rejected.
    let invariantRejected = false
    try {
      await awardXp(payload, { user: coach.id, kind: 'quiz', amount: 10, counts: 'fun_only', verified: true, dedupeKey: `smoke-bad-${stamp}` })
    } catch {
      invariantRejected = true
    }
    check('awardXp rejects verified + fun_only (trust invariant)', invariantRejected)

    // 4) Append-only guard: an XP event cannot be edited.
    let updateRejected = false
    try {
      await payload.update({ collection: 'xp-events', id: events.docs[0].id, overrideAccess: true, data: { amount: 9999 } as never })
    } catch {
      updateRejected = true
    }
    check('XP events are append-only (update rejected)', updateRejected)

    // 5) Recognition: create pending -> approve -> engine grants verified XP.
    const rec = await payload.create({
      collection: 'recognitions',
      overrideAccess: true,
      user: admin as never,
      data: { kind: 'shout_out', subject: minor.id, message: 'Great hustle and sportsmanship!' } as never,
    })
    check('new recognition lands pending', (rec as { moderationStatus?: string }).moderationStatus === 'pending')
    check('recognition pinned nominatedBy to the caller (admin)', String((rec as { nominatedBy?: unknown }).nominatedBy) === String(admin.id))
    check('recognition re-derived subjectIsMinor=true for the minor subject', (rec as { subjectIsMinor?: boolean }).subjectIsMinor === true)

    const approved = await payload.update({ collection: 'recognitions', id: rec.id, overrideAccess: true, user: admin as never, data: { moderationStatus: 'approved' } as never })
    check('approval stamped moderatedAt', Boolean((approved as { moderatedAt?: string }).moderatedAt))

    await recordRecognitionApproved(payload, rec.id)
    const recXp = await payload.find({ collection: 'xp-events', where: { and: [{ user: { equals: minor.id } }, { dedupeKey: { equals: `recognition:${rec.id}` } }] }, overrideAccess: true })
    check('approved recognition granted meaningful XP to the subject', recXp.totalDocs === 1 && (recXp.docs[0] as { counts?: string }).counts === 'meaningful')
  } catch (err) {
    console.error('SMOKE ERROR:', err)
    ok = false
  }

  console.log(ok ? '\nENGAGEMENT SMOKE: ALL PASS' : '\nENGAGEMENT SMOKE: FAILURES ABOVE')
  process.exit(ok ? 0 : 1)
}

void main()
