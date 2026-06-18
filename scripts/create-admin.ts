/*
 * Create the first super-admin (or any super-admin) for CMBA Connect.
 *
 * Usage (after DATABASE_URL + PAYLOAD_SECRET are set in .env):
 *   CREATE_ADMIN_EMAIL=you@cmba.ab.ca \
 *   CREATE_ADMIN_PASSWORD='a-strong-unique-password' \
 *   CREATE_ADMIN_NAME='Your Name' \
 *   npm run create-admin
 *
 * Idempotent: if a user with that email already exists it is promoted to
 * super_admin instead of erroring. Runs through Payload's Local API, which
 * bypasses HTTP access control (this is an operator/bootstrap tool).
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

async function main() {
  const email = process.env.CREATE_ADMIN_EMAIL
  const password = process.env.CREATE_ADMIN_PASSWORD
  const fullName = process.env.CREATE_ADMIN_NAME || 'CMBA Super Admin'
  // Adults only; this satisfies the required dateOfBirth field. Adjust later in
  // the admin panel if needed.
  const dateOfBirth = process.env.CREATE_ADMIN_DOB || '1990-01-01'

  if (!email || !password) {
    console.error(
      'Missing CREATE_ADMIN_EMAIL or CREATE_ADMIN_PASSWORD. See scripts/create-admin.ts header for usage.',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })

  if (existing.docs.length > 0) {
    const user = existing.docs[0]
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { roles: ['super_admin'], status: 'active' },
      overrideAccess: true,
    })
    console.log(`Promoted existing user ${email} to super_admin.`)
  } else {
    await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        fullName,
        dateOfBirth,
        roles: ['super_admin'],
        status: 'active',
      },
      overrideAccess: true,
    })
    console.log(`Created super_admin ${email}.`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
