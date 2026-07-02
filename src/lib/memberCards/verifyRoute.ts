import type { Payload } from 'payload'

import type { CertStatus } from './requirements'
import type { ScanResult } from './scanResults'
import type { ScannedPass, Verdict } from './verify'

/*
 * Member Cards — server-side I/O shared by /verify and /verify-serial. Loads the pass
 * + member + credentials for the verdict core (verify.ts), manages the scanner device
 * registry (D9), records the append-only scan (D24), and shapes a DISPLAY-SAFE
 * response (member number + name + photo + guardian only — never credential detail or
 * externalId). All reads/writes use overrideAccess (system role); the route already
 * gated the caller with canScan + device + rate limit.
 */

type Rel = number | { id: number } | null | undefined
export const relId = (r: Rel): number | undefined =>
  r == null ? undefined : typeof r === 'object' ? r.id : r

const toISODate = (d: unknown): string | null => {
  if (!d) return null
  const date = new Date(d as string)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

const photoUrlOf = (p: unknown): string | null =>
  p && typeof p === 'object' && typeof (p as { url?: unknown }).url === 'string'
    ? (p as { url: string }).url
    : null

interface PassDoc {
  serialNumber: string
  status: ScannedPass['status']
  currentJti?: string | null
  member: Rel
}
interface CertDoc {
  type: Rel
  status: CertStatus
  expiryDate?: string | null
}
interface UserDoc {
  id: number
  roles?: string[] | null
  status?: string | null
  memberNumber?: string | null
  fullName?: string | null
  preferredName?: string | null
  profilePhoto?: unknown
  isMinor?: boolean | null
  guardian?: { name?: string | null } | null
}

/** Resolve a pass (by serial) + its member + held credentials into the verdict input. */
export async function loadScannedPassBySerial(payload: Payload, serial: string): Promise<ScannedPass | null> {
  const res = await payload.find({
    collection: 'passes',
    where: { serialNumber: { equals: serial } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const passDoc = res.docs[0] as PassDoc | undefined
  if (!passDoc) return null

  const memberId = relId(passDoc.member)
  if (memberId == null) return null
  const member =
    passDoc.member && typeof passDoc.member === 'object'
      ? (passDoc.member as UserDoc)
      : ((await payload.findByID({ collection: 'users', id: memberId, depth: 1, overrideAccess: true })) as UserDoc)

  const certs = await payload.find({
    collection: 'certifications',
    where: { user: { equals: memberId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const held = (certs.docs as CertDoc[]).map((c) => ({
    key: String(relId(c.type)),
    status: c.status,
    expiresOn: toISODate(c.expiryDate),
  }))

  return {
    serialNumber: passDoc.serialNumber,
    status: passDoc.status,
    currentJti: passDoc.currentJti ?? null,
    member: {
      id: memberId,
      roles: member.roles ?? [],
      isActive: member.status ? member.status === 'active' : true,
      held,
      memberNumber: member.memberNumber ?? null,
      displayName: member.preferredName || member.fullName || null,
      photoUrl: photoUrlOf(member.profilePhoto),
      guardianName: member.isMinor ? member.guardian?.name ?? null : null,
    },
  }
}

/** Device registry (D9): revoked → blocked; unknown → lazily registered to this user. */
export async function ensureScannerDevice(
  payload: Payload,
  userId: number,
  deviceId: string,
  label?: string | null,
): Promise<'ok' | 'revoked'> {
  const res = await payload.find({
    collection: 'scanner-devices',
    where: { deviceId: { equals: deviceId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const dev = res.docs[0] as { id: number; revokedAt?: string | null } | undefined
  const now = new Date().toISOString()
  if (dev) {
    if (dev.revokedAt) return 'revoked'
    await payload
      .update({ collection: 'scanner-devices', id: dev.id, data: { lastSeen: now }, overrideAccess: true })
      .catch(() => {})
    return 'ok'
  }
  await payload
    .create({
      collection: 'scanner-devices',
      data: { deviceId, user: userId, label: label ?? undefined, lastSeen: now },
      overrideAccess: true,
    })
    .catch(() => {})
  return 'ok'
}

export interface ScanRecord {
  clientUuid?: string | null
  scannedBy: number
  deviceId: string
  venueId?: number | null
  gameId?: number | null
  jti?: string | null
  memberId?: number | null
  result: ScanResult
  method: 'qr' | 'serial'
  ip?: string | null
  deviceInfo?: string | null
}

/** Append-only scan audit (D24). Idempotent on clientUuid — a retry is swallowed. */
export async function recordScan(payload: Payload, r: ScanRecord): Promise<void> {
  try {
    await payload.create({
      collection: 'scans',
      overrideAccess: true,
      data: {
        clientUuid: r.clientUuid ?? undefined,
        scannedBy: r.scannedBy,
        deviceId: r.deviceId,
        venue: r.venueId ?? undefined,
        game: r.gameId ?? undefined,
        jti: r.jti ?? undefined,
        member: r.memberId ?? undefined,
        result: r.result,
        method: r.method,
        scannedAt: new Date().toISOString(),
        ip: r.ip ?? undefined,
        deviceInfo: r.deviceInfo ?? undefined,
      },
    })
  } catch {
    // Unique clientUuid (retry) or a transient write error must not change the verdict
    // already returned to the scanner. The audit is best-effort at the edge.
  }
}

/** Display-safe response body — the ONLY fields the scanner ever receives. */
export function verdictBody(v: Verdict): Record<string, unknown> {
  return {
    result: v.result,
    cleared: v.cleared,
    message: v.message,
    serialFallback: v.serialFallback,
    memberNumber: v.member?.memberNumber ?? null,
    displayName: v.member?.displayName ?? null,
    photoUrl: v.member?.photoUrl ?? null,
    guardianName: v.member?.guardianName ?? null,
    missing: v.missing ?? [],
    expiredOrInvalid: v.expiredOrInvalid ?? [],
  }
}

/** First client IP from x-forwarded-for, if present. */
export function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  return xff ? xff.split(',')[0].trim() : null
}
