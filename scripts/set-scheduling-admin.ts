/*
 * Set the scheduling-admin email in Site Settings (the contested-game escalation
 * recipient). Usage:  SCHEDULING_ADMIN_EMAIL=you@cmba.ab.ca npm run set-scheduling-admin
 * Defaults to scheduling@cmba.ab.ca.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const payload = await getPayload({ config })
  const email = process.env.SCHEDULING_ADMIN_EMAIL || 'scheduling@cmba.ab.ca'
  const name = process.env.SCHEDULING_ADMIN_NAME || 'Scheduling Admin'
  await payload.updateGlobal({ slug: 'site-settings', data: { schedulingAdmin: { email, name } } as never })
  console.log(`Set Site Settings scheduling admin to ${email}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
