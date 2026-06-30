import { describe, expect, it } from 'vitest'

import { generateRecoveryCodes, hashRecoveryCode, normalizeCode, verifyRecoveryCode } from '../recovery'

describe('recovery codes', () => {
  it('generates 10 codes in XXXXX-XXXXX Crockford base32 form', () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(10)
    for (const c of codes) expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/)
    expect(new Set(codes).size).toBe(10) // no duplicates
  })

  it('hashes with a per-code salt (PBKDF2), salt changes the hash', () => {
    const a = hashRecoveryCode('ABCDE-FGHJK')
    const b = hashRecoveryCode('ABCDE-FGHJK')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash) // different salt -> different hash
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('verifies the correct code and rejects a wrong one', () => {
    const { hash, salt } = hashRecoveryCode('ABCDE-FGHJK')
    expect(verifyRecoveryCode('ABCDE-FGHJK', hash, salt)).toBe(true)
    expect(verifyRecoveryCode('ZZZZZ-ZZZZZ', hash, salt)).toBe(false)
  })

  it('is tolerant of formatting (case, spaces, missing dash) via normalization', () => {
    const { hash, salt } = hashRecoveryCode('ABCDE-FGHJK')
    expect(normalizeCode(' abcde fghjk ')).toBe('ABCDEFGHJK')
    expect(verifyRecoveryCode('abcdefghjk', hash, salt)).toBe(true)
    expect(verifyRecoveryCode('ABCDE FGHJK', hash, salt)).toBe(true)
  })

  it('rejects when hash/salt are missing', () => {
    expect(verifyRecoveryCode('ABCDE-FGHJK', '', 'salt')).toBe(false)
    expect(verifyRecoveryCode('ABCDE-FGHJK', 'hash', '')).toBe(false)
  })
})
