/*
 * The scheduler capability (Phase 2, confirmed with the operator).
 *
 * A lead scheduler runs the season without being a data admin. The tests that
 * matter most here are the NEGATIVE ones: a scheduler must not gain user
 * management, role changes, or anything else that isAnyAdmin unlocks, and the
 * role must never be self-grantable.
 */
import { describe, expect, it } from 'vitest'

import {
  ROLES,
  SELF_SERVICE_ROLES,
  canManageScheduling,
  canScan,
  isAnyAdmin,
  isLeagueWideScheduler,
  isScheduler,
  isSuperAdmin,
  isVerificationAdmin,
  sanitizeSelfServiceRoles,
  type Role,
} from '../index'

const u = (...roles: Role[]) => ({ id: 1, roles })

const scheduler = u('scheduler')
const clubAdmin = u('club_admin')
const superAdmin = u('super_admin')
const participant = u('participant')
const leagueOfficial = u('league_official')

describe('the scheduler capability unlocks the scheduling console', () => {
  it('lets a scheduler manage scheduling', () => {
    expect(canManageScheduling(scheduler)).toBe(true)
  })

  it('still lets both kinds of admin manage scheduling', () => {
    expect(canManageScheduling(clubAdmin)).toBe(true)
    expect(canManageScheduling(superAdmin)).toBe(true)
  })

  it('does not let an ordinary member manage scheduling', () => {
    expect(canManageScheduling(participant)).toBe(false)
    expect(canManageScheduling(null)).toBe(false)
    expect(canManageScheduling(undefined)).toBe(false)
  })
})

describe('a scheduler is NOT a data admin', () => {
  it('is not any kind of admin', () => {
    expect(isAnyAdmin(scheduler)).toBe(false)
    expect(isSuperAdmin(scheduler)).toBe(false)
  })

  it('cannot operate the member card scanner', () => {
    expect(canScan(scheduler)).toBe(false)
  })

  it('is not a verification admin, so scan analytics and pass revocation stay closed', () => {
    expect(isVerificationAdmin(scheduler)).toBe(false)
  })

  it('cannot edit a game that already has a final result, because that rewrites the standings', () => {
    // The override route gates finalized games on isSuperAdmin, not on the
    // scheduling capability. This pins that distinction.
    expect(isSuperAdmin(scheduler)).toBe(false)
    expect(isSuperAdmin(superAdmin)).toBe(true)
  })
})

describe('a scheduler works across the whole league, a club admin does not', () => {
  it('treats a scheduler and a super admin as league wide', () => {
    expect(isLeagueWideScheduler(scheduler)).toBe(true)
    expect(isLeagueWideScheduler(superAdmin)).toBe(true)
  })

  it('keeps a club admin scoped to their own club', () => {
    expect(isLeagueWideScheduler(clubAdmin)).toBe(false)
  })
})

describe('the scheduler role can never be self granted', () => {
  it('is not in the self service list', () => {
    expect(SELF_SERVICE_ROLES).not.toContain('scheduler')
  })

  it('is dropped when a member tries to give it to themselves', () => {
    expect(sanitizeSelfServiceRoles(['scheduler'], ['participant'])).toEqual(['participant'])
    expect(sanitizeSelfServiceRoles(['coach', 'scheduler'], [])).toEqual(['coach'])
  })

  it('is preserved when an admin already granted it and the member edits their own member types', () => {
    expect(sanitizeSelfServiceRoles(['coach'], ['scheduler'])).toEqual(['coach', 'scheduler'])
  })

  it('cannot be used to climb to a club admin', () => {
    expect(sanitizeSelfServiceRoles(['scheduler', 'club_admin'], ['participant'])).toEqual(['participant'])
  })
})

describe('the role vocabulary', () => {
  it('offers scheduler as a choice an administrator can assign', () => {
    expect(ROLES.map((r) => r.value)).toContain('scheduler')
    expect(ROLES.find((r) => r.value === 'scheduler')?.label).toBe('Scheduler')
  })

  it('keeps scheduler separate from the scanner tier', () => {
    expect(isScheduler(leagueOfficial)).toBe(false)
    expect(canScan(leagueOfficial)).toBe(true)
    expect(canManageScheduling(leagueOfficial)).toBe(false)
  })
})

/*
 * REGRESSION for a real production incident on 2026-07-31.
 *
 * The grant script wrote roles with `overrideAccess: true` and reported success,
 * but nothing persisted. Cause: overrideAccess bypasses ACCESS CONTROL, not
 * HOOKS. The sanitizeSelfRoles beforeValidate hook ran, saw a caller that was not
 * a super admin, and stripped the admin-assigned role straight back out.
 *
 * That hook was doing its job. The tests below pin the behaviour it relies on, so
 * that if sanitizeSelfServiceRoles is ever loosened, the reason it exists is not
 * quietly lost.
 */
describe('regression: an admin-assigned role cannot survive a self-service write', () => {
  it('strips scheduler from a plain member write, which is what silently reverted the grant', () => {
    // requested = what the script tried to write, existing = what was on the row.
    expect(sanitizeSelfServiceRoles(['coach', 'scheduler'], ['coach'])).toEqual(['coach'])
  })

  it('strips scheduler even when the account is already a super admin', () => {
    // The super admin bypass lives in the hook (isSuperAdmin(req.user)), not here,
    // so this pure function still strips it. Both accounts in the incident
    // reverted for this reason.
    expect(sanitizeSelfServiceRoles(['super_admin', 'scheduler'], ['super_admin'])).toEqual(['super_admin'])
  })

  it('keeps scheduler once it is genuinely on the record', () => {
    // After a trusted write, a later self-service edit must not drop it.
    expect(sanitizeSelfServiceRoles(['coach'], ['coach', 'scheduler'])).toEqual(['coach', 'scheduler'])
  })
})
