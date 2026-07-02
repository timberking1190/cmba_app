import { describe, expect, it } from 'vitest'

import { formatMemberNumber, planIssuance, tokenExpirySeconds } from './issuance'
import type { RequirementRow } from './requirements'

const MATRIX: RequirementRow[] = [
  { role: 'coach', credential: '1', isRequired: true },
  { role: 'coach', credential: '2', isRequired: true },
  { role: 'coach', credential: '3', isRequired: true },
]

describe('formatMemberNumber', () => {
  it('zero-pads to 5 and keeps larger ids intact', () => {
    expect(formatMemberNumber(1)).toBe('CMBA-00001')
    expect(formatMemberNumber(4182)).toBe('CMBA-04182')
    expect(formatMemberNumber(123456)).toBe('CMBA-123456')
  })
})

describe('planIssuance', () => {
  it('a coach is scannable', () => {
    expect(planIssuance({ userId: 7, roles: ['coach'], matrixRows: MATRIX })).toEqual({
      memberNumber: 'CMBA-00007',
      scannable: true,
    })
  })

  it('a participant/official (no required rows) is not scannable', () => {
    expect(planIssuance({ userId: 8, roles: ['participant'], matrixRows: MATRIX }).scannable).toBe(false)
    expect(planIssuance({ userId: 9, roles: ['official'], matrixRows: MATRIX }).scannable).toBe(false)
  })

  it('a multi-role member is scannable if ANY role is (coach + participant)', () => {
    expect(planIssuance({ userId: 10, roles: ['participant', 'coach'], matrixRows: MATRIX }).scannable).toBe(true)
  })
})

describe('tokenExpirySeconds', () => {
  it('wallet = 13 months, print = 14 months from iat', () => {
    const iat = new Date('2026-07-02T00:00:00.000Z')
    const wallet = new Date(tokenExpirySeconds(iat, 'wallet') * 1000)
    const print = new Date(tokenExpirySeconds(iat, 'print') * 1000)
    expect(wallet.toISOString().slice(0, 7)).toBe('2027-08') // +13 months
    expect(print.toISOString().slice(0, 7)).toBe('2027-09') // +14 months
  })
})
