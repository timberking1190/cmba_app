/*
 * Member Cards — wallet pass provisioning (Phase 2), shared by the Apple + Google
 * add-to-wallet routes.
 *
 * There is one `passes` row per (member, platform). The base 'print' pass is created at
 * signup (issuance.ts); the 'apple'/'google' rows are created lazily here the first time
 * a member taps Add to Wallet. Each carries its own unguessable serial + single-active
 * `currentJti`; the scanner's /verify handles whichever serial it sees, so revoking a
 * member means rotating every one of their passes' jtis.
 *
 * The QR is minted fresh per download from `currentJti` (short-lived, like My Card).
 * The Apple PassKit web-service authenticationToken is DERIVED deterministically —
 * HMAC(authSecret, "applepass:<serial>") — so it is stable across re-downloads, unique
 * per pass, unguessable, and never has to be stored in plaintext.
 */
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import type { Payload } from 'payload'

import { getActiveSigningKey, isSigningConfigured } from './keys'
import { loadRequirementMatrix, tokenExpirySeconds } from './issuance'
import { isRoleScannable } from './requirements'
import { mintPassToken, type PassChannel } from './token'

export type WalletPlatform = 'apple' | 'google'

export type ProvisionErrorCode = 'not_scannable' | 'signing_not_configured' | 'member_not_found'

export class WalletProvisionError extends Error {
  code: ProvisionErrorCode
  constructor(code: ProvisionErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'WalletProvisionError'
  }
}

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

const photoUrlOf = (p: unknown): string | null =>
  p && typeof p === 'object' && typeof (p as { url?: unknown }).url === 'string' ? (p as { url: string }).url : null

/** Deterministic PassKit web-service authenticationToken for a pass serial. */
export function applePassAuthToken(secret: string, serial: string): string {
  return createHmac('sha256', secret).update(`applepass:${serial}`).digest('hex')
}

/** Constant-time check of a presented PassKit authenticationToken. */
export function verifyAppleAuthToken(secret: string, serial: string, presented: string | null | undefined): boolean {
  if (!presented) return false
  const expected = Buffer.from(applePassAuthToken(secret, serial))
  const got = Buffer.from(presented)
  return expected.length === got.length && timingSafeEqual(expected, got)
}

export interface ProvisionedCard {
  passId: number
  serialNumber: string
  season: string
  memberNumber: string
  displayName: string
  roleLabel: string
  roles: string[]
  photoUrl: string | null
  /** Minted QR message (the Ed25519 pass token). */
  qrToken: string
  /** Wallet-channel token expiry, seconds since epoch. */
  expEpoch: number
}

interface MemberRow {
  id: number
  roles?: string[] | null
  memberNumber?: string | null
  fullName?: string | null
  preferredName?: string | null
  email?: string | null
  profilePhoto?: unknown
}

async function currentSeason(payload: Payload): Promise<string> {
  const cfg = (await payload.findGlobal({ slug: 'member-card-config', depth: 0 }).catch(() => null)) as
    | { currentSeason?: string | null }
    | null
  return cfg?.currentSeason || '2026-27'
}

/**
 * Ensure the member has a `${platform}` pass with a live token, and return everything a
 * wallet pass needs. Throws WalletProvisionError for the caller to map to an HTTP status.
 */
export async function provisionWalletPass(
  payload: Payload,
  userId: number,
  platform: WalletPlatform,
  opts: { now?: Date } = {},
): Promise<ProvisionedCard> {
  if (!isSigningConfigured()) {
    throw new WalletProvisionError('signing_not_configured', 'Member-card token signing is not configured')
  }
  const now = opts.now ?? new Date()

  const member = (await payload
    .findByID({ collection: 'users', id: userId, depth: 1, overrideAccess: true })
    .catch(() => null)) as MemberRow | null
  if (!member) throw new WalletProvisionError('member_not_found', 'Member not found')

  const roles = (member.roles ?? []) as string[]
  const matrix = await loadRequirementMatrix(payload)
  if (!roles.some((r) => isRoleScannable(matrix, r))) {
    throw new WalletProvisionError('not_scannable', 'This role does not carry a scannable wallet card')
  }

  const season = await currentSeason(payload)
  const signingKey = getActiveSigningKey()!
  const channel: PassChannel = 'wallet'

  // Get-or-create the platform pass row (its own serial + currentJti).
  const existing = await payload.find({
    collection: 'passes',
    where: { and: [{ member: { equals: userId } }, { platform: { equals: platform } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let passId: number
  let serialNumber: string
  let jti: string

  if (existing.docs.length > 0) {
    const p = existing.docs[0] as { id: number; serialNumber: string; currentJti?: string | null }
    passId = p.id
    serialNumber = p.serialNumber
    if (p.currentJti) {
      jti = p.currentJti
    } else {
      jti = await mintAndAttach(payload, { passId, serialNumber, userId, channel, now, kid: signingKey.kid })
    }
  } else {
    serialNumber = randomUUID()
    const created = await payload.create({
      collection: 'passes',
      data: { member: userId, platform, serialNumber, status: 'issued', season, issuedAt: now.toISOString() },
      overrideAccess: true,
    })
    passId = (created as { id: number }).id
    jti = await mintAndAttach(payload, { passId, serialNumber, userId, channel, now, kid: signingKey.kid })
  }

  const iat = Math.floor(now.getTime() / 1000)
  const expEpoch = tokenExpirySeconds(now, channel)
  const qrToken = mintPassToken({
    passSerial: serialNumber,
    jti,
    channel,
    kid: signingKey.kid,
    iat,
    exp: expEpoch,
    privateKeyPem: signingKey.privateKeyPem,
  })

  return {
    passId,
    serialNumber,
    season,
    memberNumber: member.memberNumber || `CMBA-${String(member.id).padStart(5, '0')}`,
    displayName: member.preferredName || member.fullName || member.email || 'CMBA Member',
    roleLabel: roleLabelFor(roles),
    roles,
    photoUrl: photoUrlOf(member.profilePhoto),
    qrToken,
    expEpoch,
  }
}

/** Mint a jti + verification-token row and point the pass at it. Returns the jti. */
async function mintAndAttach(
  payload: Payload,
  args: { passId: number; serialNumber: string; userId: number; channel: PassChannel; now: Date; kid: string },
): Promise<string> {
  const jti = randomUUID()
  const expEpoch = tokenExpirySeconds(args.now, args.channel)
  await payload.create({
    collection: 'verification-tokens',
    data: {
      jti,
      pass: args.passId,
      member: args.userId,
      channel: args.channel,
      kid: args.kid,
      expiresAt: new Date(expEpoch * 1000).toISOString(),
    },
    overrideAccess: true,
  })
  await payload.update({ collection: 'passes', id: args.passId, data: { currentJti: jti }, overrideAccess: true })
  return jti
}

/** Store the HMAC of the derived authenticationToken on the pass (admin/debug parity). */
export async function stampAppleAuthHash(payload: Payload, passId: number, secret: string, serial: string): Promise<void> {
  const hash = createHash('sha256').update(applePassAuthToken(secret, serial)).digest('hex')
  await payload
    .update({ collection: 'passes', id: passId, data: { appleAuthTokenHash: hash }, overrideAccess: true })
    .catch(() => {})
}

/** "Mon YYYY" validity label from a token expiry (seconds since epoch). */
export function validThruLabel(expEpoch: number): string {
  const d = new Date(expEpoch * 1000)
  return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })
}
