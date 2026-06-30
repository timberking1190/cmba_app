import { describe, expect, it } from 'vitest'

import { hasRole, isAnyAdmin, isClubAdmin, isSuperAdmin, clubIdOf } from '../index'
import { deleteUsers, readUsers, updateUsers } from '../users'

/*
 * Stage C / S2 — adversarial access-control tests (default deny + IDOR).
 * The Users access functions return a Where clause that scopes a non-admin to
 * their OWN record, so a user cannot read or update another user's data by
 * tampering with an id. These assertions are part of the pentest matrix
 * (privilege escalation / insecure direct object reference).
 */

const anon = undefined
const participant = { id: 1, roles: ['participant'] }
const coach = { id: 2, roles: ['coach'] }
const clubAdmin = { id: 3, roles: ['club_admin'], club: 99 }
const superAdmin = { id: 4, roles: ['super_admin'] }

const call = (fn: typeof readUsers, user: unknown) => fn({ req: { user } } as never)

describe('role helpers', () => {
  it('classifies roles correctly (default deny for unknown/none)', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true)
    expect(isSuperAdmin(participant)).toBe(false)
    expect(isClubAdmin(clubAdmin)).toBe(true)
    expect(isAnyAdmin(clubAdmin)).toBe(true)
    expect(isAnyAdmin(coach)).toBe(false)
    expect(isAnyAdmin(anon)).toBe(false)
    expect(hasRole(participant, 'super_admin')).toBe(false)
    expect(clubIdOf(clubAdmin)).toBe(99)
  })
})

describe('readUsers (IDOR / default deny)', () => {
  it('denies anonymous', () => {
    expect(call(readUsers, anon)).toBe(false)
  })
  it('scopes a regular user to their OWN record only', () => {
    expect(call(readUsers, participant)).toEqual({ id: { equals: 1 } })
    expect(call(readUsers, coach)).toEqual({ id: { equals: 2 } })
  })
  it('scopes a club admin to self + their club (not all users)', () => {
    const where = call(readUsers, clubAdmin) as { or: unknown[] }
    expect(where.or).toContainEqual({ id: { equals: 3 } })
    expect(where.or).toContainEqual({ club: { equals: 99 } })
  })
  it('grants a super admin full read', () => {
    expect(call(readUsers, superAdmin)).toBe(true)
  })
})

describe('updateUsers (no cross-user writes)', () => {
  it('lets a regular user update only their own record', () => {
    expect(call(updateUsers, participant)).toEqual({ id: { equals: 1 } })
  })
  it('denies anonymous and grants super admin', () => {
    expect(call(updateUsers, anon)).toBe(false)
    expect(call(updateUsers, superAdmin)).toBe(true)
  })
})

describe('deleteUsers (super admin only)', () => {
  it('only a super admin may delete users', () => {
    expect(call(deleteUsers, superAdmin)).toBe(true)
    expect(call(deleteUsers, clubAdmin)).toBe(false)
    expect(call(deleteUsers, participant)).toBe(false)
    expect(call(deleteUsers, anon)).toBe(false)
  })
})
