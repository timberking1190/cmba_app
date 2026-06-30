/*
 * Verify the tamper-evident AuditLog (Stage C / S3). Walks every audit entry and
 * recomputes its HMAC. Reports: valid (protected + matches), TAMPERED (protected but
 * mismatched), and unprotected (rows written before the integrity control). Exits
 * non-zero if any TAMPERED row is found, so it can run in CI / a scheduled check.
 *
 * Usage: npm run verify-audit-log
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

import { verifyAuditEntry } from '../src/lib/audit/integrity'

async function main() {
  const payload = await getPayload({ config })
  let valid = 0
  let tampered = 0
  let unprotected = 0
  const bad: string[] = []
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'audit-log', limit: 200, page, depth: 0, overrideAccess: true, sort: 'at' })
    for (const raw of res.docs) {
      const doc = raw as { id: unknown; integrity?: string | null; action?: unknown; at?: unknown }
      if (!doc.integrity) {
        unprotected++
      } else if (verifyAuditEntry(doc as never)) {
        valid++
      } else {
        tampered++
        bad.push(`#${doc.id} ${String(doc.action)} @ ${String(doc.at)}`)
      }
    }
    if (!res.hasNextPage) break
    page++
  }

  console.log(`audit-log integrity: ${valid} valid, ${unprotected} unprotected (pre-integrity), ${tampered} TAMPERED`)
  if (tampered > 0) {
    console.error('TAMPERED entries:')
    for (const b of bad) console.error('  ' + b)
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(2)
})
