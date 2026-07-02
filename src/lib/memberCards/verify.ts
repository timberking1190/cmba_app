/*
 * Member Cards — verification decision core (D1/D2/D14/D17/D20).
 *
 * PURE decision logic: the route handler does the I/O (verify the token's signature,
 * look up the pass by serial, load the member's credentials + the requirement matrix,
 * authorize the device) and hands the resolved records here; this function applies
 * the check ordering and returns the single authoritative verdict + the fields the
 * scanner is allowed to see. Keeping it pure makes the adversarial suite exhaustive
 * and DB-free.
 *
 * Device authorization is NOT modeled here — a missing/revoked device is a transport
 * 403 handled by the route (and never produces a member scan row). Here we assume the
 * request already passed device + rate-limit gates.
 */
import { evaluateMember, type HeldCredential, type RequirementRow, type RoleKey } from './requirements'
import type { ScanResult } from './scanResults'
import type { VerifyFailure } from './token'

/** The member facts the verdict needs (resolved by the route from `users`+`certifications`). */
export interface ScannedMember {
  id: string | number
  role: RoleKey
  isActive: boolean
  held: HeldCredential[]
  /** Display-safe fields the scanner may show (D18). */
  memberNumber?: string | null
  displayName?: string | null
  photoUrl?: string | null
  /** Guardian display name for dependants (D13); shown in the verdict. */
  guardianName?: string | null
}

/** The pass record resolved by serial (token.sub) or by the serial-lookup fallback. */
export interface ScannedPass {
  serialNumber: string
  status: 'requested' | 'issued' | 'revoked' | 'superseded'
  currentJti: string | null
  member: ScannedMember
}

export interface VerifyDecisionCtx {
  requirementRows: RequirementRow[]
  now: Date
}

export interface Verdict {
  result: ScanResult
  /** True only for `valid` — the sole verdict that clears a coach for the sideline. */
  cleared: boolean
  passSerial?: string
  jti?: string
  member?: ScannedMember
  /** Populated on a credential failure so the scanner can say what's wrong. */
  missing?: string[]
  expiredOrInvalid?: string[]
  /** Serial-lookup verdicts always carry the "check photo ID carefully" flag (D17). */
  serialFallback: boolean
  /** Human-facing one-liner for the scanner banner. */
  message: string
}

/** Collapse every token structural/crypto failure to the gym-facing verdict. */
export function mapTokenFailure(reason: VerifyFailure): ScanResult {
  return reason === 'token_expired' ? 'token_expired' : 'invalid_signature'
}

const MESSAGES: Record<ScanResult, string> = {
  valid: 'Cleared',
  expired_credentials: 'Not cleared — credential missing or expired',
  revoked: 'Revoked — do not admit',
  revoked_token: 'Old or replaced pass — ask for a refreshed card',
  not_found: 'Unknown pass',
  not_scannable: 'ID-only card — no sideline clearance applies',
  token_expired: 'Expired pass token — ask the member to refresh their card',
  invalid_signature: 'Invalid pass — not issued by CMBA',
  member_inactive: 'Inactive member — do not admit',
  rate_limited: 'Too many scans — slow down and retry',
}

function finish(result: ScanResult, base: Partial<Verdict>): Verdict {
  return {
    ...base,
    result,
    cleared: result === 'valid',
    serialFallback: base.serialFallback ?? false,
    message: MESSAGES[result],
  }
}

interface CommonInput {
  pass: ScannedPass | null
  ctx: VerifyDecisionCtx
}

/** Shared pass-state + credential evaluation, used by both QR and serial paths. */
function decidePassState(pass: ScannedPass | null, ctx: VerifyDecisionCtx, serialFallback: boolean): Verdict {
  if (!pass) return finish('not_found', { serialFallback })

  if (pass.status === 'revoked') {
    return finish('revoked', { serialFallback, passSerial: pass.serialNumber, member: pass.member })
  }
  if (pass.status !== 'issued') {
    // 'superseded' (a newer pass replaced this one) or 'requested' (not yet issued).
    return finish('revoked_token', { serialFallback, passSerial: pass.serialNumber, member: pass.member })
  }

  const outcome = evaluateMember(ctx.requirementRows, {
    role: pass.member.role,
    isActive: pass.member.isActive,
    held: pass.member.held,
    now: ctx.now,
  })
  return finish(outcome.verdict, {
    serialFallback,
    passSerial: pass.serialNumber,
    member: pass.member,
    missing: outcome.missing,
    expiredOrInvalid: outcome.expiredOrInvalid,
  })
}

export interface QrDecisionInput extends CommonInput {
  /** Result of verifyPassToken() — the route runs the crypto, we apply the policy. */
  token: { ok: true; jti: string; passSerial: string } | { ok: false; reason: VerifyFailure }
}

/**
 * QR path (D1/D2): token must verify, the pass must exist, the token's jti must be
 * the pass's single active jti (kills screenshots/old tokens), then live pass-state
 * + credential evaluation.
 */
export function decideQrVerdict(input: QrDecisionInput): Verdict {
  const { token, pass, ctx } = input

  if (!token.ok) return finish(mapTokenFailure(token.reason), { serialFallback: false })

  if (!pass) return finish('not_found', { serialFallback: false, jti: token.jti })

  // The token's subject must be this pass, and the jti must be the ONLY active one.
  if (pass.serialNumber !== token.passSerial || pass.currentJti == null || pass.currentJti !== token.jti) {
    return finish('revoked_token', {
      serialFallback: false,
      jti: token.jti,
      passSerial: pass.serialNumber,
      member: pass.member,
    })
  }

  return { ...decidePassState(pass, ctx, false), jti: token.jti }
}

export interface SerialDecisionInput extends CommonInput {
  /** app_config.serialLookupEnabled — false disables the fallback league-wide (D17). */
  enabled: boolean
}

/**
 * Serial-lookup fallback (D17): no token, so the signature/jti steps are skipped BY
 * DESIGN. Same live pass-state + credential evaluation; always flagged
 * serialFallback so the banner says "check photo ID carefully". Disabled → not_found.
 */
export function decideSerialVerdict(input: SerialDecisionInput): Verdict {
  if (!input.enabled) return finish('not_found', { serialFallback: true })
  return decidePassState(input.pass, input.ctx, true)
}
