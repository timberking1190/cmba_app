import { createHmac } from 'crypto'

/*
 * Stage C / S3 — tamper-evident audit log. Each AuditLog row carries an HMAC over
 * its integrity-protected fields, keyed by the server secret. The log is already
 * append-only at the access + hook layer; this adds detection of row-level
 * tampering by anyone with direct database access (they cannot recompute the HMAC
 * without the secret). JSON fields are serialized with sorted keys so verification
 * is stable regardless of key order.
 */

type AuditEntry = {
  action?: unknown
  entity?: unknown
  entityId?: unknown
  actor?: unknown
  actorEmail?: unknown
  at?: unknown
  before?: unknown
  after?: unknown
  reason?: unknown
}

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = stable(o[k])
        return acc
      }, {})
  }
  return v
}

function actorId(actor: unknown): unknown {
  if (actor && typeof actor === 'object') return (actor as { id?: unknown }).id ?? null
  return actor ?? null
}

function canonical(e: AuditEntry): string {
  return JSON.stringify(
    stable([
      e.action ?? null,
      e.entity ?? null,
      e.entityId ?? null,
      actorId(e.actor),
      e.actorEmail ?? null,
      e.at ?? null,
      e.before ?? null,
      e.after ?? null,
      e.reason ?? null,
    ]),
  )
}

export function auditHmac(entry: AuditEntry, secret: string = process.env.PAYLOAD_SECRET || 'dev'): string {
  return createHmac('sha256', secret).update(canonical(entry)).digest('hex')
}

export function verifyAuditEntry(
  entry: AuditEntry & { integrity?: string | null },
  secret?: string,
): boolean {
  if (!entry.integrity) return false
  return auditHmac(entry, secret) === entry.integrity
}
