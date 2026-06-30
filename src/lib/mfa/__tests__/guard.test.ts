import { describe, expect, it } from 'vitest'

import { decideMfa, mfaRequired, type MfaUser } from '../guard'

const fresh = new Date('2026-06-29T12:00:00Z')
const stale = new Date('2026-06-29T11:50:00Z') // 10 min before `fresh`

function user(p: Partial<MfaUser> & { aal?: 'aal1' | 'aal2'; stepUpAt?: Date }): MfaUser {
  const { aal, stepUpAt, ...rest } = p
  return { ...rest, _mfa: { aal: aal ?? 'aal1', stepUpAt: stepUpAt ?? null } }
}

describe('mfaRequired', () => {
  it('is true for admin roles and false for non-admins', () => {
    expect(mfaRequired({ roles: ['super_admin'] })).toBe(true)
    expect(mfaRequired({ roles: ['club_admin'] })).toBe(true)
    expect(mfaRequired({ roles: ['participant', 'coach'] })).toBe(false)
  })
  it('honours the stored derived flag even without a role (stale-column safe)', () => {
    expect(mfaRequired({ roles: [], mfa: { required: true } })).toBe(true)
  })
})

describe('decideMfa', () => {
  it('lets a non-admin without MFA through', () => {
    expect(decideMfa(user({ roles: ['participant'] }))).toBe('ok')
  })

  it('forces enrollment for an admin who has not enrolled (by role or by flag)', () => {
    expect(decideMfa(user({ roles: ['super_admin'], mfa: { enrolled: false } }))).toBe('enroll-required')
    expect(decideMfa(user({ roles: [], mfa: { required: true, enrolled: false } }))).toBe('enroll-required')
  })

  it('requires a challenge when enrolled but the session is only aal1', () => {
    expect(decideMfa(user({ roles: ['super_admin'], mfa: { enrolled: true }, aal: 'aal1' }))).toBe('challenge-required')
  })

  it('is ok when enrolled and the session is aal2 (no step-up asked)', () => {
    expect(decideMfa(user({ roles: ['super_admin'], mfa: { enrolled: true }, aal: 'aal2' }))).toBe('ok')
  })

  it('requires step-up for a sensitive action when the last step-up is stale or missing', () => {
    expect(
      decideMfa(user({ mfa: { enrolled: true }, aal: 'aal2', stepUpAt: stale }), { stepUp: true, now: fresh }),
    ).toBe('stepup-required')
    expect(
      decideMfa(user({ mfa: { enrolled: true }, aal: 'aal2' }), { stepUp: true, now: fresh }),
    ).toBe('stepup-required')
  })

  it('accepts a sensitive action when step-up is fresh', () => {
    expect(
      decideMfa(user({ mfa: { enrolled: true }, aal: 'aal2', stepUpAt: new Date(fresh.getTime() - 60_000) }), { stepUp: true, now: fresh }),
    ).toBe('ok')
  })

  it('INVARIANT: an admin is never ok while aal1', () => {
    const enrolledAdminAal1 = user({ roles: ['super_admin'], mfa: { enrolled: true }, aal: 'aal1' })
    const unenrolledAdmin = user({ roles: ['super_admin'], mfa: { enrolled: false }, aal: 'aal1' })
    expect(decideMfa(enrolledAdminAal1)).not.toBe('ok')
    expect(decideMfa(unenrolledAdmin)).not.toBe('ok')
  })
})
