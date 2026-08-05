/*
 * Member Cards — auto-issuance (D19/D20).
 *
 * Split into a PURE planner (tested) and an I/O worker (`issueCardForUser`) used by
 * both the users afterChange hook (on signup) and the backfill script. Issuance:
 *   1. assigns a display-safe member number CMBA-<lpad(id,5)> (D18),
 *   2. ensures the member has a base ('print') pass — the card that always exists and
 *      renders on "My Card"; platform-specific wallet passes are created on
 *      add-to-wallet (Phase 3),
 *   3. for SCANNABLE roles only (D20), mints a verification token and points the pass'
 *      single-active-jti at it (D1). Non-scannable roles get an ID-only pass (no QR).
 *
 * Wallet download stays gated on PIPA consent captured on the card page (D19) — this
 * only creates the server-side records; it does not deliver a wallet pass.
 */
import { randomUUID } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

import { mintPassToken, type PassChannel } from './token'
import { isRoleScannable, type RequirementRow, type RoleKey } from './requirements'
import { getActiveSigningKey } from './keys'

export const WALLET_TTL_MONTHS = 13
export const PRINT_TTL_MONTHS = 14

/** CMBA-<zero-padded id> — unique + sequential without a separate sequence (D18). */
export function formatMemberNumber(userId: number | string): string {
  return `CMBA-${String(userId).padStart(5, '0')}`
}

export interface IssuancePlan {
  memberNumber: string
  scannable: boolean
}

/** Pure issuance decision: number + whether any of the member's roles is scannable. */
export function planIssuance(input: {
  userId: number | string
  roles: RoleKey[]
  matrixRows: RequirementRow[]
}): IssuancePlan {
  return {
    memberNumber: formatMemberNumber(input.userId),
    scannable: input.roles.some((r) => isRoleScannable(input.matrixRows, r)),
  }
}

/** Token expiry (seconds since epoch) for a channel, from an issued-at Date. */
export function tokenExpirySeconds(iat: Date, channel: PassChannel): number {
  const months = channel === 'wallet' ? WALLET_TTL_MONTHS : PRINT_TTL_MONTHS
  const exp = new Date(iat)
  exp.setMonth(exp.getMonth() + months)
  return Math.floor(exp.getTime() / 1000)
}

/**
 * Load the requirement matrix from `certification-types` and project it into
 * RequirementRow[] keyed by a stable credential key (the type's slug/name).
 * `requiredForRoles` × the type identifies the required (role, credential) pairs.
 */
export async function loadRequirementMatrix(payload: Payload, req?: PayloadRequest): Promise<RequirementRow[]> {
  const [types, cfg] = await Promise.all([
    payload.find({ collection: 'certification-types', where: { gatesMemberCard: { equals: true } }, limit: 1000, depth: 0, overrideAccess: true, req }),
    payload.findGlobal({ slug: 'member-card-config', depth: 0, req }).catch(() => null),
  ])
  // D20: only roles marked scannable in config get card rows, even if a gating credential
  // is (org-)required for other roles too. Default coach-only.
  const scannable = new Set((cfg as { scannableRoles?: string[] | null } | null)?.scannableRoles ?? ['coach'])
  const rows: RequirementRow[] = []
  for (const t of types.docs as Array<{ id: number | string; requiredForRoles?: string[] | null }>) {
    const credential = String(t.id)
    for (const role of t.requiredForRoles ?? []) {
      if (scannable.has(role)) rows.push({ role, credential, isRequired: true })
    }
  }
  return rows
}

export interface IssueResult {
  memberNumber: string
  passId: number
  scannable: boolean
  tokenMinted: boolean
}

export interface IssueUserInput {
  id: number
  roles: RoleKey[]
  memberNumber?: string | null
}

/**
 * Ensure a member has a number + base pass (+ token if scannable). Idempotent: a
 * second call is a no-op once the base pass exists. Uses overrideAccess (system op)
 * and the low-level db write for the member-number system field so the users
 * collection hooks are not re-triggered.
 */
export async function issueCardForUser(
  payload: Payload,
  user: IssueUserInput,
  opts: { season: string; now?: Date; matrixRows?: RequirementRow[]; req?: PayloadRequest },
): Promise<IssueResult> {
  const now = opts.now ?? new Date()
  const req = opts.req
  const matrixRows = opts.matrixRows ?? (await loadRequirementMatrix(payload, req))
  const plan = planIssuance({ userId: user.id, roles: user.roles, matrixRows })

  // 1. Member number. overrideAccess bypasses the superAdmin-only field lock; `req`
  // joins the parent transaction so the just-created user row is visible. The users
  // afterChange hooks all guard on operation==='create' (issuance, guardian email) or a
  // specific change (consent/password), so this update neither recurses nor re-fires them.
  if (!user.memberNumber) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { memberNumber: plan.memberNumber } as never,
      overrideAccess: true,
      req,
    })
  }

  // 2. Base 'print' pass — idempotent.
  const existing = await payload.find({
    collection: 'passes',
    where: { and: [{ member: { equals: user.id } }, { platform: { equals: 'print' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  let passId: number
  let serialNumber: string
  let hasJti: boolean

  if (existing.docs.length > 0) {
    const p = existing.docs[0] as { id: number; serialNumber: string; currentJti?: string | null }
    passId = p.id
    serialNumber = p.serialNumber
    hasJti = Boolean(p.currentJti)
  } else {
    serialNumber = randomUUID()
    const created = await payload.create({
      collection: 'passes',
      data: {
        member: user.id,
        platform: 'print',
        serialNumber,
        status: 'issued',
        season: opts.season,
        issuedAt: now.toISOString(),
      },
      overrideAccess: true,
      req,
    })
    passId = (created as { id: number }).id
    hasJti = false
  }

  // 3. Mint a verification token for scannable roles (D20) that don't yet have one — at
  // issuance OR when a member later becomes scannable (e.g. toggles on Coach/Official).
  let tokenMinted = false
  if (plan.scannable && !hasJti) {
    const signingKey = getActiveSigningKey()
    if (signingKey) {
      // A malformed signing key must NOT fail account creation. On error, leave the pass
      // token-less (recoverable via the backfill re-issue) and log, rather than throwing.
      try {
        const jti = randomUUID()
        const iat = Math.floor(now.getTime() / 1000)
        const exp = tokenExpirySeconds(now, 'print')
        mintPassToken({ passSerial: serialNumber, jti, channel: 'print', kid: signingKey.kid, iat, exp, privateKeyPem: signingKey.privateKeyPem })
        await payload.create({
          collection: 'verification-tokens',
          data: { jti, pass: passId, member: user.id, channel: 'print', kid: signingKey.kid, expiresAt: new Date(exp * 1000).toISOString() },
          overrideAccess: true,
          req,
        })
        await payload.update({ collection: 'passes', id: passId, data: { currentJti: jti }, overrideAccess: true, req })
        tokenMinted = true
      } catch (err) {
        payload.logger.error(`[issuance] token mint failed for user ${user.id} (signing key issue): ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return { memberNumber: plan.memberNumber, passId, scannable: plan.scannable, tokenMinted }
}
