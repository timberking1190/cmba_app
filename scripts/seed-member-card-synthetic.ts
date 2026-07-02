/*
 * Synthetic Member Cards seed — members + families + coach credentials for load / UX /
 * scanner testing (Phase 1 gate: ~10,000 members across roles). Creating each user
 * fires the auto-issuance hook (D19), so cards + tokens are produced the real way.
 *
 * DEV/STAGING ONLY. Hard-guarded against the prod project. Configurable:
 *   MEMBERCARD_SEED_ALLOW=1        required to run at all
 *   MEMBERCARD_SEED_COUNT=10000    approx members to create (default 200)
 *   MEMBERCARD_SEED_FORCE_PROD=1   override the prod-ref refusal (do NOT)
 *
 * Idempotent per index (deterministic emails; existing users are skipped), so it is
 * safe to re-run / resume.
 *
 * Usage:  MEMBERCARD_SEED_ALLOW=1 MEMBERCARD_SEED_COUNT=10000 npm run seed:member-cards:synthetic
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload, Where } from 'payload'
import config from '@payload-config'

const PROD_REF = 'pdwautioosstdgbbblxl'
const SEASON = process.env.MEMBERCARD_SEASON || '2026-27'
const TARGET = Number(process.env.MEMBERCARD_SEED_COUNT || '200')
const DOMAIN = 'example.invalid' // reserved TLD — never a real inbox

const FIRST = ['Avery', 'Jordan', 'Riley', 'Casey', 'Quinn', 'Sam', 'Taylor', 'Morgan', 'Jamie', 'Drew', 'Alex', 'Cameron']
const LAST = ['Nguyen', 'Singh', 'Patel', 'Brown', 'Tremblay', 'Lee', 'Martin', 'Roy', 'Gagnon', 'Wong', 'Smith', 'Ali']

function assertRunnable() {
  const url = process.env.DATABASE_URL || ''
  if (url.includes(PROD_REF) && process.env.MEMBERCARD_SEED_FORCE_PROD !== '1') {
    throw new Error(`Refusing to seed synthetic data into the PROD project (${PROD_REF}).`)
  }
  if (process.env.MEMBERCARD_SEED_ALLOW !== '1') {
    throw new Error('Set MEMBERCARD_SEED_ALLOW=1 to run the synthetic seed (dev/staging only).')
  }
}

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length]
const name = (i: number) => `${pick(FIRST, i)} ${pick(LAST, Math.floor(i / FIRST.length))}`
const dobAdult = (i: number) => `${1970 + (i % 35)}-0${(i % 8) + 1}-1${i % 9}`
const dobMinor = (i: number) => `${2012 + (i % 6)}-0${(i % 8) + 1}-1${i % 9}`

async function userExists(payload: Payload, email: string): Promise<number | null> {
  const where: Where = { email: { equals: email } }
  const res = await payload.find({ collection: 'users', where, limit: 1, overrideAccess: true })
  return res.docs.length ? (res.docs[0] as { id: number }).id : null
}

async function createUser(
  payload: Payload,
  idx: number,
  opts: { roles: string[]; minor?: boolean; guardian?: { name: string; email: string } },
): Promise<number | null> {
  const email = `mcseed+${idx}@${DOMAIN}`
  const already = await userExists(payload, email)
  if (already) return already
  const created = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipConsentEnforcement: true }, // seed path — stays active, no guardian email
    data: {
      fullName: name(idx),
      email,
      password: `Seed!${idx}aA9`,
      roles: opts.roles,
      status: 'active',
      dateOfBirth: opts.minor ? dobMinor(idx) : dobAdult(idx),
      ...(opts.guardian ? { guardian: { name: opts.guardian.name, email: opts.guardian.email } } : {}),
    } as never,
  })
  return (created as { id: number }).id
}

async function loadCoachCertTypeIds(payload: Payload): Promise<number[]> {
  const res = await payload.find({
    collection: 'certification-types',
    where: { and: [{ isRequired: { equals: true } }, { requiredForRoles: { contains: 'coach' } }] },
    limit: 100,
    overrideAccess: true,
  })
  return (res.docs as Array<{ id: number }>).map((d) => d.id)
}

/** Give a coach credentials: ~70% all-valid, ~15% missing one, ~15% one expired. */
async function seedCoachCreds(payload: Payload, userId: number, typeIds: number[], variant: number) {
  const future = '2027-12-31'
  const past = '2025-01-01'
  const skipIdx = variant % 100 < 15 ? 0 : -1 // 15% missing the first credential
  const expiredIdx = variant % 100 >= 85 ? 1 : -1 // 15% have an expired second credential
  const nowIso = new Date().toISOString()

  for (let t = 0; t < typeIds.length; t++) {
    if (t === skipIdx) continue
    const expired = t === expiredIdx
    await payload.create({
      collection: 'certifications',
      overrideAccess: true,
      data: {
        user: userId,
        type: typeIds[t],
        source: 'registration',
        issueDate: '2024-01-01',
        expiryDate: expired ? past : future,
        verifiedAt: nowIso,
      } as never,
    })
  }
}

async function main() {
  assertRunnable()
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed:synthetic] ${m}`)

  const coachTypeIds = await loadCoachCertTypeIds(payload)
  if (coachTypeIds.length === 0) {
    throw new Error('No coach requirement types found — run `npm run seed:member-cards` first.')
  }

  let created = 0
  let idx = 0
  while (created < TARGET) {
    const kind = idx % 5
    if (kind < 2) {
      // Family: a guardian adult (~30% also a coach) + 1–3 minor participants.
      const guardianIsCoach = idx % 10 < 3
      const guardianName = name(idx)
      const guardianEmail = `mcseed+${idx}@${DOMAIN}`
      const guardianId = await createUser(payload, idx, {
        roles: guardianIsCoach ? ['participant', 'coach'] : ['participant'],
      })
      if (guardianId && guardianIsCoach) await seedCoachCreds(payload, guardianId, coachTypeIds, idx)
      created += guardianId ? 1 : 0
      idx++

      const children = 1 + (idx % 3)
      for (let c = 0; c < children && created < TARGET; c++) {
        const childId = await createUser(payload, idx, {
          roles: ['participant'],
          minor: true,
          guardian: { name: guardianName, email: guardianEmail },
        })
        created += childId ? 1 : 0
        idx++
      }
    } else if (kind === 2) {
      const id = await createUser(payload, idx, { roles: ['coach'] })
      if (id) await seedCoachCreds(payload, id, coachTypeIds, idx)
      created += id ? 1 : 0
      idx++
    } else if (kind === 3) {
      const id = await createUser(payload, idx, { roles: ['official'] })
      created += id ? 1 : 0
      idx++
    } else {
      const id = await createUser(payload, idx, { roles: ['participant'] })
      created += id ? 1 : 0
      idx++
    }
    if (created % 250 === 0) log(`created ~${created}/${TARGET}`)
  }

  log(`done — ~${created} synthetic members (coach cards scannable; issuance ran per user)`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
