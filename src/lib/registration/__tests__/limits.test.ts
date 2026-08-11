import { afterEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_REGISTER_GLOBAL_LIMIT,
  DEFAULT_REGISTER_IP_LIMIT,
  parseLimit,
  registrationGlobalLimit,
  registrationIpLimit,
} from '../limits'

afterEach(() => {
  delete process.env.REGISTER_RATE_LIMIT_IP
  delete process.env.REGISTER_RATE_LIMIT_GLOBAL
})

describe('parseLimit', () => {
  it('falls back when unset or empty', () => {
    expect(parseLimit(undefined, 20)).toBe(20)
    expect(parseLimit('', 20)).toBe(20)
    expect(parseLimit('   ', 20)).toBe(20)
  })

  it('accepts a positive integer', () => {
    expect(parseLimit('50', 20)).toBe(50)
    expect(parseLimit(' 500 ', 20)).toBe(500)
  })

  /*
   * The important cases. A typo that produced 0 would refuse every registration,
   * and a negative would do the same, so both fall back rather than being obeyed.
   */
  it('falls back on zero and negatives rather than blocking everyone', () => {
    expect(parseLimit('0', 20)).toBe(20)
    expect(parseLimit('-1', 20)).toBe(20)
  })

  it('falls back on values that are not integers', () => {
    expect(parseLimit('abc', 20)).toBe(20)
    expect(parseLimit('2.5', 20)).toBe(20)
    expect(parseLimit('1e3', 20)).toBe(1000) // Number('1e3') is the integer 1000
    expect(parseLimit('NaN', 20)).toBe(20)
    expect(parseLimit('Infinity', 20)).toBe(20)
  })
})

describe('registration limits', () => {
  it('defaults are sized for a real launch day, not a closed system', () => {
    expect(registrationIpLimit()).toBe(DEFAULT_REGISTER_IP_LIMIT)
    expect(registrationGlobalLimit()).toBe(DEFAULT_REGISTER_GLOBAL_LIMIT)
    // The old hardcoded values were 5 and 50. Both were too low to survive a
    // launch for 589 teams, which is the entire reason this module exists.
    expect(DEFAULT_REGISTER_IP_LIMIT).toBeGreaterThan(5)
    expect(DEFAULT_REGISTER_GLOBAL_LIMIT).toBeGreaterThan(50)
  })

  it('can be widened from the environment without a code change', () => {
    process.env.REGISTER_RATE_LIMIT_IP = '40'
    process.env.REGISTER_RATE_LIMIT_GLOBAL = '5000'
    expect(registrationIpLimit()).toBe(40)
    expect(registrationGlobalLimit()).toBe(5000)
  })

  it('ignores a malformed override instead of failing closed on everyone', () => {
    process.env.REGISTER_RATE_LIMIT_IP = '0'
    process.env.REGISTER_RATE_LIMIT_GLOBAL = 'lots'
    expect(registrationIpLimit()).toBe(DEFAULT_REGISTER_IP_LIMIT)
    expect(registrationGlobalLimit()).toBe(DEFAULT_REGISTER_GLOBAL_LIMIT)
  })
})
