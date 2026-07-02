/*
 * Seed the Member Cards requirement matrix (D14/D20) + config. Idempotent
 * (find-or-create by name), and PROD-APPROPRIATE: this is real config, not synthetic
 * data — the coach → {record check, Safe Sport, Coaching in CMBA} requirement is what
 * makes a coach's card scannable.
 *
 * "Scannable role" is derived: any certification-type with isRequired + a role in
 * requiredForRoles makes that role scannable. Seed ONLY coach here (D20).
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set):  npm run seed:member-cards
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'

const CURRENT_SEASON = process.env.MEMBERCARD_SEASON || '2026-27'

type CertTypeSeed = {
  name: string
  category: 'coach' | 'compliance'
  validityMonths: number | null
}

// The three CMBA coach credentials (D14). Names are the natural key; edit the DB /
// admin, not this file, once seeded.
const COACH_REQUIREMENTS: CertTypeSeed[] = [
  { name: 'Criminal Record Check', category: 'compliance', validityMonths: 36 },
  { name: 'Safe Sport Training', category: 'compliance', validityMonths: 36 },
  { name: 'Coaching in CMBA', category: 'coach', validityMonths: null },
]

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed:member-cards] ${m}`)

  for (const req of COACH_REQUIREMENTS) {
    const where: Where = { name: { equals: req.name } }
    const existing = await payload.find({ collection: 'certification-types', where, limit: 1, overrideAccess: true })
    const data = {
      name: req.name,
      category: req.category,
      appliesToRoles: ['coach'],
      isRequired: true,
      requiredForRoles: ['coach'],
      validityMonths: req.validityMonths ?? undefined,
    } as never
    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'certification-types',
        id: (existing.docs[0] as { id: number }).id,
        data,
        overrideAccess: true,
      })
      log(`updated requirement: ${req.name}`)
    } else {
      await payload.create({ collection: 'certification-types', data, overrideAccess: true })
      log(`created requirement: ${req.name}`)
    }
  }

  await payload.updateGlobal({
    slug: 'member-card-config',
    data: { currentSeason: CURRENT_SEASON, serialLookupEnabled: true, anomalyAlertsEnabled: true },
    overrideAccess: true,
  })
  log(`member-card-config season=${CURRENT_SEASON}`)
  log('done')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
