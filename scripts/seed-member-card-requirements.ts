/*
 * Seed the Member Cards requirement matrix (D14/D20) + config. The card matrix is a
 * DISTINCT concept from broad org compliance (certification-types.isRequired): it is
 * the set that gates the sideline scan, marked with `gatesMemberCard`. We map D14's
 * three (record check, Safe Sport, Coaching in CMBA) to the EXISTING catalog types by
 * name — never create duplicates.
 *
 * Idempotent. Also removes the earlier accidental duplicate types if present + empty.
 *
 * ⚠ The Safe-Sport mapping is a registrar decision (human task 5) — confirm which
 * catalog type is CMBA's Safe Sport credential. It is admin-editable data
 * (gatesMemberCard checkbox), so it can be changed without a deploy.
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set):  npm run seed:member-cards
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload, Where } from 'payload'
import config from '@payload-config'

const CURRENT_SEASON = process.env.MEMBERCARD_SEASON || '2026-27'

// D14 three → existing catalog type NAMES (the natural key). Adjust here or via admin.
const CARD_GATING_TYPES = [
  'Police Information Check (Vulnerable Sector)', // record check
  'Safe CMBA Interactions', // Safe Sport  ⚠ confirm mapping
  'CMBA Coach Training', // Coaching in CMBA
]

// Accidental duplicates created before the gatesMemberCard fix — removed if empty.
const DUP_TYPES_TO_REMOVE = ['Criminal Record Check', 'Safe Sport Training', 'Coaching in CMBA']

async function findTypeByName(payload: Payload, name: string) {
  const where: Where = { name: { equals: name } }
  const res = await payload.find({ collection: 'certification-types', where, limit: 1, overrideAccess: true })
  return (res.docs[0] as { id: number } | undefined) ?? null
}

async function main() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed:member-cards] ${m}`)

  // 1. Mark the three existing catalog types as card-gating.
  for (const name of CARD_GATING_TYPES) {
    const t = await findTypeByName(payload, name)
    if (!t) {
      payload.logger.warn(`[seed:member-cards] catalog type not found, skipping: ${name}`)
      continue
    }
    await payload.update({
      collection: 'certification-types',
      id: t.id,
      data: { gatesMemberCard: true } as never,
      overrideAccess: true,
    })
    log(`gatesMemberCard=true → ${name} (id ${t.id})`)
  }

  // 2. Remove the accidental duplicate types (only if no certifications reference them).
  for (const name of DUP_TYPES_TO_REMOVE) {
    const t = await findTypeByName(payload, name)
    if (!t) continue
    const refs = await payload.count({ collection: 'certifications', where: { type: { equals: t.id } }, overrideAccess: true })
    if (refs.totalDocs === 0) {
      await payload.delete({ collection: 'certification-types', id: t.id, overrideAccess: true })
      log(`removed accidental duplicate type: ${name} (id ${t.id})`)
    } else {
      payload.logger.warn(`[seed:member-cards] duplicate ${name} has ${refs.totalDocs} certs — left in place`)
    }
  }

  // 3. Config.
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
