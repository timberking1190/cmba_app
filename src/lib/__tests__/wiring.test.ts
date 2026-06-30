import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { onCertificationVerified, onChallengeSubmitted, onChallengeVerified } from '../gamification/wiring'

/*
 * The engine wiring must be completely inert when FEATURE_GAMIFICATION_LEDGER is
 * off (production default) - it must never touch payload, so it can never query
 * the dormant engagement tables. A guard payload throws if reached.
 */
const guard = { create: () => { throw new Error('reached payload') }, find: () => { throw new Error('reached payload') }, findByID: () => { throw new Error('reached payload') } } as unknown as Payload

describe('engine wiring gate (FEATURE_GAMIFICATION_LEDGER off)', () => {
  const prev = process.env.FEATURE_GAMIFICATION_LEDGER
  beforeEach(() => { delete process.env.FEATURE_GAMIFICATION_LEDGER })
  afterEach(() => { if (prev === undefined) delete process.env.FEATURE_GAMIFICATION_LEDGER; else process.env.FEATURE_GAMIFICATION_LEDGER = prev })

  it('onCertificationVerified is a no-op when the flag is off', async () => {
    await expect(onCertificationVerified(guard, { id: 1, user: 5, verifiedAt: '2026-01-01' })).resolves.toBeUndefined()
  })
  it('onChallengeSubmitted is a no-op when the flag is off', async () => {
    await expect(onChallengeSubmitted(guard, { id: 1, user: 5 })).resolves.toBeUndefined()
  })
  it('onChallengeVerified is a no-op when the flag is off', async () => {
    await expect(onChallengeVerified(guard, { id: 1, user: 5, challenge: 2 })).resolves.toBeUndefined()
  })
})
