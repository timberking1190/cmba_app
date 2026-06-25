import { describe, expect, it } from 'vitest'

import { edmontonToUtcISO } from '../commit'

describe('edmontonToUtcISO', () => {
  it('converts a winter (MST, UTC-7) wall time to UTC', () => {
    // 18:00 on 2026-01-10 in Edmonton (MST) is 01:00 UTC the next day.
    expect(edmontonToUtcISO('2026-01-10', '18:00')).toBe('2026-01-11T01:00:00.000Z')
  })

  it('converts a summer (MDT, UTC-6) wall time to UTC', () => {
    // 18:00 on 2026-07-10 in Edmonton (MDT) is 00:00 UTC the next day.
    expect(edmontonToUtcISO('2026-07-10', '18:00')).toBe('2026-07-11T00:00:00.000Z')
  })

  it('handles a morning time within the same UTC day', () => {
    expect(edmontonToUtcISO('2026-07-10', '10:00')).toBe('2026-07-10T16:00:00.000Z')
  })
})
