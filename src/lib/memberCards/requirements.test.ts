import { describe, expect, it } from 'vitest'

import {
  evaluateMember,
  isCredentialSatisfied,
  isRoleScannable,
  requiredCredentialsFor,
  scannableRoles,
  type HeldCredential,
  type RequirementRow,
} from './requirements'

// Seeded matrix: only `coach` is scannable, on the three CMBA credentials.
const MATRIX: RequirementRow[] = [
  { role: 'coach', credential: 'record_check', isRequired: true },
  { role: 'coach', credential: 'safesport', isRequired: true },
  { role: 'coach', credential: 'cmba_coach_training', isRequired: true },
]

const NOW = new Date('2026-07-02T12:00:00.000Z')

describe('matrix helpers', () => {
  it('marks only coach scannable', () => {
    expect(scannableRoles(MATRIX)).toEqual(new Set(['coach']))
    expect(isRoleScannable(MATRIX, 'coach')).toBe(true)
    expect(isRoleScannable(MATRIX, 'official')).toBe(false)
    expect(isRoleScannable(MATRIX, 'participant')).toBe(false)
  })

  it('lists a coach’s three required credentials', () => {
    expect(requiredCredentialsFor(MATRIX, 'coach').sort()).toEqual([
      'cmba_coach_training',
      'record_check',
      'safesport',
    ])
    expect(requiredCredentialsFor(MATRIX, 'official')).toEqual([])
  })

  it('a non-required row does not make a role scannable', () => {
    const rows: RequirementRow[] = [{ role: 'official', credential: 'safesport', isRequired: false }]
    expect(isRoleScannable(rows, 'official')).toBe(false)
    expect(scannableRoles(rows).size).toBe(0)
  })
})

describe('isCredentialSatisfied', () => {
  it('valid/expiring with future or no expiry satisfy; pending/expired never', () => {
    expect(isCredentialSatisfied({ status: 'valid', expiresOn: null }, NOW)).toBe(true)
    expect(isCredentialSatisfied({ status: 'valid', expiresOn: '2027-01-01' }, NOW)).toBe(true)
    expect(isCredentialSatisfied({ status: 'expiring', expiresOn: '2026-08-01' }, NOW)).toBe(true)
    expect(isCredentialSatisfied({ status: 'valid', expiresOn: '2026-06-01' }, NOW)).toBe(false)
    expect(isCredentialSatisfied({ status: 'pending-verification', expiresOn: null }, NOW)).toBe(false)
    expect(isCredentialSatisfied({ status: 'expired', expiresOn: '2030-01-01' }, NOW)).toBe(false)
  })

  it('treats the expiry date as valid through end-of-day', () => {
    expect(isCredentialSatisfied({ status: 'valid', expiresOn: '2026-07-02' }, NOW)).toBe(true)
  })
})

describe('evaluateMember', () => {
  const held = (over: Partial<HeldCredential> = {}): HeldCredential => ({
    key: 'record_check',
    status: 'valid',
    expiresOn: null,
    ...over,
  })

  it('coach with all three valid → valid', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['coach'],
      isActive: true,
      now: NOW,
      held: [
        held({ key: 'record_check' }),
        held({ key: 'safesport' }),
        held({ key: 'cmba_coach_training' }),
      ],
    })
    expect(res.verdict).toBe('valid')
    expect(res.missing).toEqual([])
    expect(res.expiredOrInvalid).toEqual([])
  })

  it('coach missing one credential → expired_credentials, reported in `missing`', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['coach'],
      isActive: true,
      now: NOW,
      held: [held({ key: 'record_check' }), held({ key: 'safesport' })],
    })
    expect(res.verdict).toBe('expired_credentials')
    expect(res.missing).toEqual(['cmba_coach_training'])
  })

  it('coach with an expired credential → expired_credentials, reported in `expiredOrInvalid`', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['coach'],
      isActive: true,
      now: NOW,
      held: [
        held({ key: 'record_check', status: 'expired', expiresOn: '2026-01-01' }),
        held({ key: 'safesport' }),
        held({ key: 'cmba_coach_training' }),
      ],
    })
    expect(res.verdict).toBe('expired_credentials')
    expect(res.expiredOrInvalid).toEqual(['record_check'])
  })

  it('prefers a satisfying duplicate over a non-satisfying one for the same key', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['coach'],
      isActive: true,
      now: NOW,
      held: [
        held({ key: 'record_check', status: 'expired', expiresOn: '2026-01-01' }),
        held({ key: 'record_check', status: 'valid', expiresOn: '2027-01-01' }),
        held({ key: 'safesport' }),
        held({ key: 'cmba_coach_training' }),
      ],
    })
    expect(res.verdict).toBe('valid')
  })

  it('non-scannable role → not_scannable regardless of credentials', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['participant'],
      isActive: true,
      now: NOW,
      held: [held({ key: 'record_check' })],
    })
    expect(res.verdict).toBe('not_scannable')
    expect(res.requiredCredentials).toEqual([])
  })

  it('inactive scannable member → member_inactive (before credential eval)', () => {
    const res = evaluateMember(MATRIX, {
      roles: ['coach'],
      isActive: false,
      now: NOW,
      held: [
        held({ key: 'record_check' }),
        held({ key: 'safesport' }),
        held({ key: 'cmba_coach_training' }),
      ],
    })
    expect(res.verdict).toBe('member_inactive')
  })
})
