/*
 * Member Cards — Apple PassKit web-service server logic (Phase 2).
 *
 * Backs the Apple-specified endpoints (register / unregister / list-updatable / get-
 * latest / log) with the apple-registrations + wallet-logs collections, and pushes
 * update notifications to a pass's registered devices via APNs. Kept separate from the
 * route handlers so the routes stay thin I/O + auth.
 *
 * All DB access uses overrideAccess (system role); the routes authenticate Apple via
 * the per-pass authenticationToken (walletProvision.verifyAppleAuthToken) before calling.
 */
import type { Payload } from 'payload'

import { generateApplePkpass, type AppleCardData } from './applePass'
import { pushPassUpdates } from './appleApns'
import { applePassAuthToken, validThruLabel } from './walletProvision'
import { getActiveSigningKey, isSigningConfigured } from './keys'
import { mintPassToken } from './token'
import type { AppleWalletConfig } from './walletKeys'

const ROLE_LABEL: Record<string, string> = {
  coach: 'Coach',
  official: 'Official',
  league_official: 'League Official',
  participant: 'Participant',
  club_admin: 'Club Admin',
  super_admin: 'Super Admin',
}
const roleLabelFor = (roles: string[]): string => {
  const primary = roles.find((r) => r === 'coach') || roles.find((r) => r === 'official') || roles[0] || 'participant'
  return ROLE_LABEL[primary] ?? primary
}

/** Append a raw wallet payload to wallet-logs (best-effort). */
export async function logWallet(payload: Payload, source: string, body: unknown): Promise<void> {
  await payload.create({ collection: 'wallet-logs', data: { source, payload: body as never }, overrideAccess: true }).catch(() => {})
}

/** Register a device for push updates on a pass. Idempotent on (device, serial). */
export async function registerDevice(
  payload: Payload,
  args: { deviceLibId: string; passSerial: string; pushToken: string },
): Promise<'created' | 'exists'> {
  const found = await payload.find({
    collection: 'apple-registrations',
    where: { and: [{ deviceLibId: { equals: args.deviceLibId } }, { passSerial: { equals: args.passSerial } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs.length > 0) {
    // Refresh the push token if Apple rotated it.
    const row = found.docs[0] as { id: number; pushToken?: string }
    if (row.pushToken !== args.pushToken) {
      await payload.update({ collection: 'apple-registrations', id: row.id, data: { pushToken: args.pushToken }, overrideAccess: true }).catch(() => {})
    }
    return 'exists'
  }
  const pass = await payload.find({ collection: 'passes', where: { serialNumber: { equals: args.passSerial } }, limit: 1, depth: 0, overrideAccess: true })
  const passId = (pass.docs[0] as { id: number } | undefined)?.id
  await payload.create({
    collection: 'apple-registrations',
    data: { deviceLibId: args.deviceLibId, passSerial: args.passSerial, pushToken: args.pushToken, pass: passId },
    overrideAccess: true,
  })
  return 'created'
}

/** Remove a device↔pass registration. */
export async function unregisterDevice(payload: Payload, args: { deviceLibId: string; passSerial: string }): Promise<void> {
  await payload
    .delete({
      collection: 'apple-registrations',
      where: { and: [{ deviceLibId: { equals: args.deviceLibId } }, { passSerial: { equals: args.passSerial } }] },
      overrideAccess: true,
    })
    .catch(() => {})
}

/**
 * Serials registered to a device that changed since `updatedSince` (Apple's tag). The
 * new tag is the max pass.updatedAt. Returns null when nothing changed (route → 204).
 */
export async function listUpdatableSerials(
  payload: Payload,
  args: { deviceLibId: string; updatedSince?: string | null },
): Promise<{ serialNumbers: string[]; lastUpdated: string } | null> {
  const regs = await payload.find({
    collection: 'apple-registrations',
    where: { deviceLibId: { equals: args.deviceLibId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const serials = [...new Set((regs.docs as Array<{ passSerial: string }>).map((r) => r.passSerial))]
  if (serials.length === 0) return null

  const passes = await payload.find({
    collection: 'passes',
    where: { serialNumber: { in: serials } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const sinceMs = args.updatedSince ? new Date(args.updatedSince).getTime() : 0
  const changed: Array<{ serial: string; updatedAt: number }> = []
  let maxUpdated = sinceMs
  for (const p of passes.docs as Array<{ serialNumber: string; updatedAt?: string }>) {
    const t = p.updatedAt ? new Date(p.updatedAt).getTime() : 0
    if (t > maxUpdated) maxUpdated = t
    if (!args.updatedSince || t > sinceMs) changed.push({ serial: p.serialNumber, updatedAt: t })
  }
  if (changed.length === 0) return null
  return { serialNumbers: changed.map((c) => c.serial), lastUpdated: new Date(maxUpdated || Date.now()).toISOString() }
}

interface PassRow {
  id: number
  serialNumber: string
  status: string
  currentJti?: string | null
  season?: string | null
  member: number | { id: number; roles?: string[] | null; fullName?: string | null; preferredName?: string | null; email?: string | null; memberNumber?: string | null; profilePhoto?: unknown } | null
}

/**
 * Rebuild the signed .pkpass for an existing serial (PassKit "get latest pass"). Returns
 * null if the serial is unknown. A revoked pass comes back voided + barcode-less.
 */
export async function buildApplePkpassBySerial(
  payload: Payload,
  cfg: AppleWalletConfig,
  serial: string,
  webServiceURL: string,
  now: Date = new Date(),
): Promise<Buffer | null> {
  if (!isSigningConfigured()) return null
  const res = await payload.find({ collection: 'passes', where: { serialNumber: { equals: serial } }, limit: 1, depth: 1, overrideAccess: true })
  const pass = res.docs[0] as PassRow | undefined
  if (!pass) return null

  const member =
    pass.member && typeof pass.member === 'object'
      ? pass.member
      : ((await payload.findByID({ collection: 'users', id: Number(pass.member), depth: 1, overrideAccess: true }).catch(() => null)) as PassRow['member'])
  if (!member || typeof member !== 'object') return null

  const roles = (member.roles ?? []) as string[]
  const revoked = pass.status === 'revoked'
  const signingKey = getActiveSigningKey()!
  const iat = Math.floor(now.getTime() / 1000)
  const expEpoch = iat + 13 * 30 * 24 * 3600
  const token =
    !revoked && pass.currentJti
      ? mintPassToken({ passSerial: serial, jti: pass.currentJti, channel: 'wallet', kid: signingKey.kid, iat, exp: expEpoch, privateKeyPem: signingKey.privateKeyPem })
      : ''

  const card: AppleCardData = {
    serialNumber: serial,
    authenticationToken: '', // not embedded on re-issue; Wallet keeps the original token
    memberNumber: member.memberNumber || `CMBA-${String(member.id).padStart(5, '0')}`,
    displayName: member.preferredName || member.fullName || member.email || 'CMBA Member',
    roleLabel: roleLabelFor(roles),
    season: pass.season || '2026-27',
    validThru: validThruLabel(expEpoch),
    token,
    webServiceURL,
    voided: revoked,
  }
  // Re-derive the deterministic auth token so the regenerated pass keeps web-service auth.
  card.authenticationToken = applePassAuthToken(cfg.authSecret, serial)
  return generateApplePkpass(cfg, card)
}

/**
 * Push an update to every device registered for a pass serial, pruning dead tokens.
 * Returns how many pushes were attempted. Best-effort — logs but never throws.
 */
export async function notifyApplePassUpdated(payload: Payload, cfg: AppleWalletConfig, passSerial: string): Promise<number> {
  const regs = await payload.find({
    collection: 'apple-registrations',
    where: { passSerial: { equals: passSerial } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const targets = (regs.docs as Array<{ id: number; pushToken: string }>).map((r) => ({ pushToken: r.pushToken, registrationId: r.id }))
  if (targets.length === 0) return 0

  const results = await pushPassUpdates(cfg, targets).catch(() => [])
  for (const r of results) {
    if (r.shouldPrune && r.registrationId != null) {
      await payload.delete({ collection: 'apple-registrations', id: r.registrationId, overrideAccess: true }).catch(() => {})
    }
  }
  await logWallet(payload, 'apns-push', { passSerial, count: targets.length, results: results.map((r) => ({ status: r.status, reason: r.reason, pruned: r.shouldPrune })) })
  return targets.length
}
