/*
 * Seed the badge catalog (Badges collection) from the legacy badge definitions.
 * Idempotent: upserts on externalId, safe to re-run. Run after the engagement
 * migrations are applied:  npm run seed:badges
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { seedBadges } from '../src/lib/gamification/seedBadges'

async function main() {
  const payload = await getPayload({ config })
  const res = await seedBadges(payload)
  console.log(`Badge catalog seeded: created ${res.created}, updated ${res.updated}.`)
  process.exit(0)
}

void main()
