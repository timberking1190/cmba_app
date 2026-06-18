/*
 * Seed script for CMBA Connect.
 *
 * Phase 0: foundation only — there is no catalog data to seed yet. Phase 1 fills
 * this in with Clubs, CertificationTypes, Courses (migrated from
 * reach360CourseData.ts), Pathways, and the PolicyVersions global.
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set):
 *   npm run seed
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  payload.logger.info('Seed: Phase 0 foundation has no catalog data to seed yet.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
