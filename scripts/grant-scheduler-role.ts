/*
 * Grant (or remove) the `scheduler` role on existing user accounts.
 *
 * The scheduler role is admin-assigned by design: sanitizeSelfServiceRoles strips
 * it from any self-service update, so nobody can give themselves the ability to
 * move games. This script is the admin path, kept in the repo so the change is
 * reviewable and repeatable rather than a hand edit in the admin panel.
 *
 * SAFETY
 *  - Dry run by DEFAULT. It reports what it would do and writes nothing unless
 *    --apply is passed.
 *  - It never creates an account. An address with no user is reported and skipped,
 *    because silently creating a login with scheduling access would be a way to
 *    grant access to an address nobody has verified.
 *  - It is idempotent: an account that already has the role is left alone.
 *  - Existing roles are preserved. It adds to the list, it does not replace it.
 *  - Every change writes an AuditLog row, because a role change is a security
 *    event and the audit log is where those live.
 *
 * PRECONDITION
 *  The `scheduler` value must exist in the enum_users_roles Postgres type, which
 *  means migration 20260731_032821_add_scheduler_role must be applied first. The
 *  script checks this and stops with a clear message rather than failing on a
 *  constraint violation halfway through the list.
 *
 * USAGE
 *   npm run grant:scheduler -- a@cmba.ab.ca b@cmba.ab.ca            # dry run
 *   npm run grant:scheduler -- a@cmba.ab.ca b@cmba.ab.ca --apply    # do it
 *   npm run grant:scheduler -- a@cmba.ab.ca --remove --apply        # take it away
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@payload-config'

const ROLE = 'scheduler'

type Target = { email: string; id?: number; fullName?: string; before: string[]; after: string[]; action: 'add' | 'remove' | 'no change' | 'missing' }

async function enumHasScheduler(payload: Payload): Promise<boolean> {
  try {
    const { sql } = await import('@payloadcms/db-postgres')
    const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    const res = (await db.drizzle.execute(
      sql`select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'enum_users_roles' and e.enumlabel = ${ROLE} limit 1`,
    )) as { rows?: unknown[] } | unknown[]
    const rows = Array.isArray(res) ? res : (res.rows ?? [])
    return rows.length > 0
  } catch {
    // If the check itself cannot run, do not guess. Let the caller decide.
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const remove = args.includes('--remove')
  const emails = args.filter((a) => !a.startsWith('--')).map((e) => e.trim().toLowerCase()).filter(Boolean)

  if (!emails.length) {
    console.error('Give at least one email address. For example:\n  npm run grant:scheduler -- someone@cmba.ab.ca --apply')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const target = (process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@')
  console.log(`[scheduler-role] database ${target}`)
  console.log(`[scheduler-role] mode ${apply ? 'APPLY' : 'dry run, nothing will be written'}${remove ? ', REMOVING the role' : ''}\n`)

  if (!(await enumHasScheduler(payload))) {
    console.error(
      [
        'The `scheduler` role does not exist in the database yet.',
        '',
        'Apply the migration first:',
        '  npm run migrate:env',
        '',
        'That applies 20260731_032821_add_scheduler_role, which adds the value to',
        'enum_users_roles. Nothing was changed.',
      ].join('\n'),
    )
    process.exit(1)
  }

  const results: Target[] = []

  for (const email of emails) {
    const res = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
    const user = res.docs[0] as { id: number; email: string; fullName?: string; roles?: string[] } | undefined

    if (!user) {
      results.push({ email, before: [], after: [], action: 'missing' })
      continue
    }

    const before = (user.roles ?? []) as string[]
    const has = before.includes(ROLE)
    const after = remove ? before.filter((r) => r !== ROLE) : has ? before : [...before, ROLE]
    const action: Target['action'] = remove ? (has ? 'remove' : 'no change') : has ? 'no change' : 'add'

    results.push({ email, id: user.id, fullName: user.fullName, before, after, action })

    if (apply && action !== 'no change') {
      await payload.update({ collection: 'users', id: user.id, data: { roles: after } as never, overrideAccess: true })
      await payload.create({
        collection: 'audit-log',
        overrideAccess: true,
        data: {
          actorEmail: process.env.SCHEDULER_GRANT_ACTOR || 'operator (grant-scheduler-role script)',
          action: remove ? 'user.role.remove' : 'user.role.grant',
          entity: 'users',
          entityId: String(user.id),
          before: { roles: before },
          after: { roles: after },
          reason: `Scheduler access ${remove ? 'removed' : 'granted'} by the league operator.`,
          at: new Date().toISOString(),
        } as never,
      })
    }
  }

  console.log('Account'.padEnd(38) + 'Was'.padEnd(34) + 'Now')
  console.log('-'.repeat(100))
  for (const r of results) {
    if (r.action === 'missing') {
      console.log(`${r.email.padEnd(38)}NO ACCOUNT WITH THIS ADDRESS. Nothing was changed.`)
      continue
    }
    console.log(`${r.email.padEnd(38)}${r.before.join(', ').padEnd(34)}${r.after.join(', ')}${r.action === 'no change' ? '   (already correct)' : ''}`)
  }

  const missing = results.filter((r) => r.action === 'missing')
  const changed = results.filter((r) => r.action === 'add' || r.action === 'remove')

  console.log('')
  if (missing.length) {
    console.log(
      [
        `${missing.length} address${missing.length === 1 ? ' has' : 'es have'} no account: ${missing.map((m) => m.email).join(', ')}.`,
        'This script never creates accounts. Ask the person to sign up first, then run it again.',
        '',
      ].join('\n'),
    )
  }
  if (!apply) {
    console.log(`Dry run. ${changed.length} account${changed.length === 1 ? '' : 's'} would change. Re-run with --apply to make the change.`)
  } else {
    console.log(`Done. ${changed.length} account${changed.length === 1 ? '' : 's'} changed, each recorded in the audit log.`)
  }

  process.exit(missing.length ? 2 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
