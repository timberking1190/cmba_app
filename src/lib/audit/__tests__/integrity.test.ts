import { describe, expect, it } from 'vitest'

import { auditHmac, verifyAuditEntry } from '../integrity'

const KEY = 'test-secret'
const entry = {
  action: 'membership.verify',
  entity: 'team-memberships',
  entityId: '42',
  actor: 7,
  actorEmail: 'admin@example.com',
  at: '2026-06-30T12:00:00.000Z',
  before: { verified: false, note: 'x' },
  after: { verified: true, note: 'x' },
  reason: 'checked cert',
}

describe('audit integrity HMAC', () => {
  it('is deterministic and verifies a stamped entry', () => {
    const integrity = auditHmac(entry, KEY)
    expect(auditHmac(entry, KEY)).toBe(integrity)
    expect(verifyAuditEntry({ ...entry, integrity }, KEY)).toBe(true)
  })

  it('detects tampering of any protected field', () => {
    const integrity = auditHmac(entry, KEY)
    expect(verifyAuditEntry({ ...entry, entityId: '43', integrity }, KEY)).toBe(false)
    expect(verifyAuditEntry({ ...entry, after: { verified: false, note: 'x' }, integrity }, KEY)).toBe(false)
    expect(verifyAuditEntry({ ...entry, actorEmail: 'evil@example.com', integrity }, KEY)).toBe(false)
  })

  it('is stable across JSON key order and actor id-vs-object', () => {
    const integrity = auditHmac(entry, KEY)
    const reordered = { ...entry, before: { note: 'x', verified: false }, after: { note: 'x', verified: true } }
    expect(auditHmac(reordered, KEY)).toBe(integrity)
    // actor populated as an object (read with depth) must hash the same as the id.
    expect(auditHmac({ ...entry, actor: { id: 7, email: 'admin@example.com' } }, KEY)).toBe(integrity)
  })

  it('fails verification when integrity is missing or wrong key is used', () => {
    const integrity = auditHmac(entry, KEY)
    expect(verifyAuditEntry({ ...entry, integrity: null }, KEY)).toBe(false)
    expect(verifyAuditEntry({ ...entry, integrity }, 'wrong-key')).toBe(false)
  })
})
