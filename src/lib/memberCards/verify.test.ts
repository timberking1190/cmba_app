import { describe, expect, it } from 'vitest'

import type { RequirementRow } from './requirements'
import {
  decideQrVerdict,
  decideSerialVerdict,
  mapTokenFailure,
  type ScannedMember,
  type ScannedPass,
} from './verify'

const MATRIX: RequirementRow[] = [
  { role: 'coach', credential: 'record_check', isRequired: true },
  { role: 'coach', credential: 'safesport', isRequired: true },
  { role: 'coach', credential: 'cmba_coach_training', isRequired: true },
]
const NOW = new Date('2026-07-02T12:00:00.000Z')
const CTX = { requirementRows: MATRIX, now: NOW }

const validCoachCreds = [
  { key: 'record_check', status: 'valid' as const, expiresOn: '2027-01-01' },
  { key: 'safesport', status: 'valid' as const, expiresOn: null },
  { key: 'cmba_coach_training', status: 'valid' as const, expiresOn: null },
]

function member(over: Partial<ScannedMember> = {}): ScannedMember {
  return { id: 1, roles: ['coach'], isActive: true, held: validCoachCreds, memberNumber: 'CMBA-00001', ...over }
}
function pass(over: Partial<ScannedPass> = {}): ScannedPass {
  return { serialNumber: 'serial-1', status: 'issued', currentJti: 'jti-1', member: member(), ...over }
}
const okToken = (jti = 'jti-1', passSerial = 'serial-1') => ({ ok: true as const, jti, passSerial })

describe('QR verdicts', () => {
  it('valid coach with a current token → valid + cleared', () => {
    const v = decideQrVerdict({ token: okToken(), pass: pass(), ctx: CTX })
    expect(v.result).toBe('valid')
    expect(v.cleared).toBe(true)
    expect(v.jti).toBe('jti-1')
    expect(v.member?.memberNumber).toBe('CMBA-00001')
  })

  it('replayed screenshot / old token (jti ≠ pass.currentJti) → revoked_token', () => {
    const v = decideQrVerdict({ token: okToken('OLD-jti'), pass: pass({ currentJti: 'jti-NEW' }), ctx: CTX })
    expect(v.result).toBe('revoked_token')
    expect(v.cleared).toBe(false)
  })

  it('pass with a null currentJti (rotated to nothing) → revoked_token', () => {
    const v = decideQrVerdict({ token: okToken(), pass: pass({ currentJti: null }), ctx: CTX })
    expect(v.result).toBe('revoked_token')
  })

  it('token subject not matching the pass serial → revoked_token', () => {
    const v = decideQrVerdict({ token: okToken('jti-1', 'other-serial'), pass: pass(), ctx: CTX })
    expect(v.result).toBe('revoked_token')
  })

  it('expired token → token_expired', () => {
    const v = decideQrVerdict({ token: { ok: false, reason: 'token_expired' }, pass: pass(), ctx: CTX })
    expect(v.result).toBe('token_expired')
  })

  it('bad signature / structural failures → invalid_signature', () => {
    for (const reason of ['invalid_signature', 'malformed', 'unknown_kid', 'unsupported_alg', 'wrong_issuer'] as const) {
      const v = decideQrVerdict({ token: { ok: false, reason }, pass: pass(), ctx: CTX })
      expect(v.result).toBe('invalid_signature')
    }
  })

  it('unknown pass → not_found', () => {
    const v = decideQrVerdict({ token: okToken(), pass: null, ctx: CTX })
    expect(v.result).toBe('not_found')
    expect(v.jti).toBe('jti-1')
  })

  it('revoked pass → revoked (even if the jti still matched)', () => {
    const v = decideQrVerdict({ token: okToken(), pass: pass({ status: 'revoked' }), ctx: CTX })
    expect(v.result).toBe('revoked')
  })

  it('superseded or not-yet-issued pass → revoked_token', () => {
    expect(decideQrVerdict({ token: okToken(), pass: pass({ status: 'superseded' }), ctx: CTX }).result).toBe(
      'revoked_token',
    )
    expect(decideQrVerdict({ token: okToken(), pass: pass({ status: 'requested' }), ctx: CTX }).result).toBe(
      'revoked_token',
    )
  })

  it('coach missing a credential → expired_credentials with the missing list', () => {
    const held = validCoachCreds.filter((c) => c.key !== 'safesport')
    const v = decideQrVerdict({ token: okToken(), pass: pass({ member: member({ held }) }), ctx: CTX })
    expect(v.result).toBe('expired_credentials')
    expect(v.missing).toEqual(['safesport'])
  })

  it('non-coach (ID-only) pass → not_scannable', () => {
    const v = decideQrVerdict({
      token: okToken(),
      pass: pass({ member: member({ roles: ['participant'], held: [] }) }),
      ctx: CTX,
    })
    expect(v.result).toBe('not_scannable')
  })

  it('multi-role member (coach + participant) is verified as a coach', () => {
    const v = decideQrVerdict({
      token: okToken(),
      pass: pass({ member: member({ roles: ['participant', 'coach'] }) }),
      ctx: CTX,
    })
    expect(v.result).toBe('valid')
  })

  it('inactive coach → member_inactive', () => {
    const v = decideQrVerdict({ token: okToken(), pass: pass({ member: member({ isActive: false }) }), ctx: CTX })
    expect(v.result).toBe('member_inactive')
  })

  it('no QR verdict is ever a silent pass — cleared implies result==valid', () => {
    const variants = [
      decideQrVerdict({ token: okToken('x'), pass: pass({ currentJti: 'y' }), ctx: CTX }),
      decideQrVerdict({ token: { ok: false, reason: 'invalid_signature' }, pass: pass(), ctx: CTX }),
      decideQrVerdict({ token: okToken(), pass: pass({ status: 'revoked' }), ctx: CTX }),
    ]
    for (const v of variants) expect(v.cleared).toBe(false)
  })
})

describe('serial-lookup fallback (D17)', () => {
  it('valid coach → valid but always flagged serialFallback', () => {
    const v = decideSerialVerdict({ enabled: true, pass: pass(), ctx: CTX })
    expect(v.result).toBe('valid')
    expect(v.serialFallback).toBe(true)
  })

  it('revoked pass → revoked, flagged', () => {
    const v = decideSerialVerdict({ enabled: true, pass: pass({ status: 'revoked' }), ctx: CTX })
    expect(v.result).toBe('revoked')
    expect(v.serialFallback).toBe(true)
  })

  it('unknown serial → not_found', () => {
    const v = decideSerialVerdict({ enabled: true, pass: null, ctx: CTX })
    expect(v.result).toBe('not_found')
    expect(v.serialFallback).toBe(true)
  })

  it('disabled league-wide → not_found (never leaks a verdict)', () => {
    const v = decideSerialVerdict({ enabled: false, pass: pass(), ctx: CTX })
    expect(v.result).toBe('not_found')
    expect(v.serialFallback).toBe(true)
  })
})

describe('mapTokenFailure', () => {
  it('only token_expired maps to token_expired; everything else to invalid_signature', () => {
    expect(mapTokenFailure('token_expired')).toBe('token_expired')
    expect(mapTokenFailure('invalid_signature')).toBe('invalid_signature')
    expect(mapTokenFailure('unknown_kid')).toBe('invalid_signature')
    expect(mapTokenFailure('malformed')).toBe('invalid_signature')
  })
})
