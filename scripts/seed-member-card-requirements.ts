/*
 * Seed the Member Cards requirement matrix (D14/D20) + config. The card matrix is a
 * DISTINCT concept from broad org compliance (certification-types.isRequired): it is
 * the set that gates the sideline scan, marked with `gatesMemberCard`. A type gates a
 * role's card iff it has gatesMemberCard=true AND that role in requiredForRoles.
 *
 * Find-or-create by name, so it works on prod (marks existing catalog types) and on a
 * fresh staging DB (creates them). Idempotent. Also removes the earlier accidental
 * duplicate types if present + empty.
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set):  npm run seed:member-cards
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload, Where } from 'payload'
import config from '@payload-config'

const CURRENT_SEASON = process.env.MEMBERCARD_SEASON || '2026-27'

// The coach card-gating credentials. Existing catalog types are matched by name and
// only marked (requiredForRoles left untouched); missing ones are created for coach.
type Gating = { name: string; category: 'coach' | 'compliance'; validityMonths: number | null; renewalUrl?: string }
const CARD_GATING: Gating[] = [
  { name: 'Police Information Check (Vulnerable Sector)', category: 'compliance', validityMonths: 36 }, // record check
  { name: 'Safe Sport Training', category: 'compliance', validityMonths: null, renewalUrl: 'https://coach.ca/sport-safety/safe-sport-training' }, // NCCP Safe Sport
  { name: 'Safe CMBA Interactions', category: 'compliance', validityMonths: null }, // mandatory (per operator)
  { name: 'CMBA Coach Training', category: 'coach', validityMonths: null },
]

// Accidental duplicates created before the gatesMemberCard fix — removed if empty.
const DUP_TYPES_TO_REMOVE = ['Criminal Record Check', 'Coaching in CMBA']

async function findTypeByName(payload: Payload, name: string) {
  const where: Where = { name: { equals: name } }
  const res = await payload.find({ collection: 'certification-types', where, limit: 1, overrideAccess: true })
  return (res.docs[0] as { id: number } | undefined) ?? null
}

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed:member-cards] ${m}`)

  for (const g of CARD_GATING) {
    const existing = await findTypeByName(payload, g.name)
    if (existing) {
      // Only mark it; never clobber an existing type's roles/category (e.g. Safe CMBA
      // Interactions is required for coach AND official).
      await payload.update({ collection: 'certification-types', id: existing.id, data: { gatesMemberCard: true, ...(g.renewalUrl ? { renewalUrl: g.renewalUrl } : {}) } as never, overrideAccess: true })
      log(`gatesMemberCard=true → ${g.name} (id ${existing.id})`)
    } else {
      const created = await payload.create({
        collection: 'certification-types',
        data: { name: g.name, category: g.category, appliesToRoles: ['coach'], isRequired: true, requiredForRoles: ['coach'], gatesMemberCard: true, validityMonths: g.validityMonths ?? undefined, renewalUrl: g.renewalUrl } as never,
        overrideAccess: true,
      })
      log(`created + gatesMemberCard → ${g.name} (id ${(created as { id: number }).id})`)
    }
  }

  for (const name of DUP_TYPES_TO_REMOVE) {
    const t = await findTypeByName(payload, name)
    if (!t) continue
    const refs = await payload.count({ collection: 'certifications', where: { type: { equals: t.id } }, overrideAccess: true })
    if (refs.totalDocs === 0) {
      await payload.delete({ collection: 'certification-types', id: t.id, overrideAccess: true })
      log(`removed accidental duplicate type: ${name} (id ${t.id})`)
    }
  }

  // Coach + Official get verified (scannable) cards gated on their credentials; parent /
  // participant are ID-only. Official inherits the shared gating types (Police Information
  // Check + Safe CMBA Interactions, which list `official` in requiredForRoles).
  await payload.updateGlobal({ slug: 'member-card-config', data: { currentSeason: CURRENT_SEASON, serialLookupEnabled: true, anomalyAlertsEnabled: true, scannableRoles: ['coach', 'official'] } as never, overrideAccess: true })
  log(`member-card-config season=${CURRENT_SEASON}; done`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
