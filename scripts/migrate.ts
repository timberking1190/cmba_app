/*
 * Apply pending Payload migrations, loading DATABASE_URL/PAYLOAD_SECRET from .env
 * (the `payload migrate` CLI does not auto-load .env in this repo). Uses Payload's own
 * migrator so payload_migrations bookkeeping + the per-migration transaction are
 * handled exactly as a deploy would — never hand-ported SQL.
 *
 * Usage:  npm run migrate:env
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const target = (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@')
  payload.logger.info(`[migrate] applying pending migrations against ${target}`)
  await (payload.db as unknown as { migrate: () => Promise<void> }).migrate()
  payload.logger.info('[migrate] done')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
