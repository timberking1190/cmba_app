import { afterEach, describe, expect, it } from 'vitest'

import { mfaEnforced, mfaRedirectTarget } from '../enforcePure'

afterEach(() => delete process.env.MFA_ENFORCE)

describe('mfaEnforced', () => {
  it('is off unless MFA_ENFORCE is exactly "true"', () => {
    expect(mfaEnforced()).toBe(false)
    process.env.MFA_ENFORCE = 'false'
    expect(mfaEnforced()).toBe(false)
    process.env.MFA_ENFORCE = '1'
    expect(mfaEnforced()).toBe(false)
    process.env.MFA_ENFORCE = 'true'
    expect(mfaEnforced()).toBe(true)
  })
})

describe('mfaRedirectTarget', () => {
  it('sends an un-enrolled required user to enroll, carrying next', () => {
    expect(mfaRedirectTarget('enroll-required', '/manage')).toBe('/account/security?next=%2Fmanage')
  })
  it('sends an enrolled aal1 user (or stale step-up) to the challenge', () => {
    expect(mfaRedirectTarget('challenge-required', '/account')).toBe('/account/security/challenge?next=%2Faccount')
    expect(mfaRedirectTarget('stepup-required', '/account')).toBe('/account/security/challenge?next=%2Faccount')
  })
  it('returns null (allowed) when the decision is ok', () => {
    expect(mfaRedirectTarget('ok', '/manage')).toBeNull()
  })
})
