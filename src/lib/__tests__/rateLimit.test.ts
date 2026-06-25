import { describe, expect, it } from 'vitest'

import { decideRateLimit } from '../rateLimit'

describe('decideRateLimit', () => {
  it('allows while under the limit', () => {
    expect(decideRateLimit(0, 5).ok).toBe(true)
    expect(decideRateLimit(4, 5).ok).toBe(true)
  })

  it('blocks at and above the limit', () => {
    expect(decideRateLimit(5, 5).ok).toBe(false)
    expect(decideRateLimit(9, 5).ok).toBe(false)
  })
})
