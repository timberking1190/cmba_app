import { describe, expect, it } from 'vitest'

import { keepOnlyMeta, keepOnlySession } from '../sessionInvalidation'

const sessions = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const meta = [{ sid: 'a' }, { sid: 'b' }]

describe('session invalidation filters', () => {
  it('keeps only the actor session (self-service change)', () => {
    expect(keepOnlySession(sessions, 'b')).toEqual([{ id: 'b' }])
    expect(keepOnlyMeta(meta, 'b')).toEqual([{ sid: 'b' }])
  })

  it('clears ALL sessions when there is no actor session (admin/reset change)', () => {
    expect(keepOnlySession(sessions, undefined)).toEqual([])
    expect(keepOnlyMeta(meta, undefined)).toEqual([])
  })

  it('handles missing arrays', () => {
    expect(keepOnlySession(undefined, 'a')).toEqual([])
    expect(keepOnlyMeta(undefined, 'a')).toEqual([])
  })
})
