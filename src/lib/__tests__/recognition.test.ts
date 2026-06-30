import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'

import { recordRecognitionApproved } from '../gamification/recognition'

describe('recordRecognitionApproved', () => {
  it('is a no-op when the recognition is not approved (never writes XP or badges)', async () => {
    const create = vi.fn()
    const payload = {
      findByID: vi.fn(async () => ({ id: 1, moderationStatus: 'pending', subject: 5 })),
      create,
    } as unknown as Payload
    await expect(recordRecognitionApproved(payload, 1)).resolves.toBeUndefined()
    expect(create).not.toHaveBeenCalled()
  })

  it('is a no-op when the recognition is missing', async () => {
    const create = vi.fn()
    const payload = {
      findByID: vi.fn(async () => { throw new Error('not found') }),
      create,
    } as unknown as Payload
    await expect(recordRecognitionApproved(payload, 999)).resolves.toBeUndefined()
    expect(create).not.toHaveBeenCalled()
  })

  it('is a no-op when an approved recognition has no subject', async () => {
    const create = vi.fn()
    const payload = {
      findByID: vi.fn(async () => ({ id: 2, moderationStatus: 'approved', subject: null })),
      create,
    } as unknown as Payload
    await expect(recordRecognitionApproved(payload, 2)).resolves.toBeUndefined()
    expect(create).not.toHaveBeenCalled()
  })

  it('awards meaningful, verified XP to the subject when approved, keyed for idempotency', async () => {
    const creates: Array<{ collection: string; data: Record<string, unknown> }> = []
    const payload = {
      findByID: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'recognitions') {
          return { id: 7, moderationStatus: 'approved', subject: 5, kind: 'shout_out', awardsBadge: null, moderatedBy: 9 }
        }
        if (collection === 'users') return { id: 5, dateOfBirth: '2000-01-01' }
        return null
      }),
      // evaluateBadges (called by awardXp) issues finds; return nothing so no badges award.
      find: vi.fn(async () => ({ docs: [] })),
      create: vi.fn(async (args: { collection: string; data: Record<string, unknown> }) => {
        creates.push({ collection: args.collection, data: args.data })
        return { id: 1 }
      }),
    } as unknown as Payload

    await recordRecognitionApproved(payload, 7)

    const xp = creates.find((c) => c.collection === 'xp-events')
    expect(xp).toBeTruthy()
    expect(xp?.data.user).toBe(5)
    expect(xp?.data.kind).toBe('recognition')
    expect(xp?.data.counts).toBe('meaningful')
    expect(xp?.data.verified).toBe(true)
    expect(xp?.data.dedupeKey).toBe('recognition:7')
    // and an audit row is written for the approval
    expect(creates.some((c) => c.collection === 'audit-log')).toBe(true)
  })
})
