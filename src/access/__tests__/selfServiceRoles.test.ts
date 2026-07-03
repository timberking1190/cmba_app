import { describe, expect, it } from 'vitest'

import { sanitizeSelfServiceRoles } from '../index'

describe('sanitizeSelfServiceRoles (privilege-escalation guard)', () => {
  it('keeps the member-type roles the user chose', () => {
    expect(sanitizeSelfServiceRoles(['participant', 'coach'], []).sort()).toEqual(['coach', 'participant'])
    expect(sanitizeSelfServiceRoles(['official', 'parent'], []).sort()).toEqual(['official', 'parent'])
  })

  it('STRIPS admin roles a user tries to grant themselves (create + update)', () => {
    expect(sanitizeSelfServiceRoles(['coach', 'super_admin'], [])).toEqual(['coach'])
    expect(sanitizeSelfServiceRoles(['league_official'], [])).toEqual(['participant']) // nothing safe -> default
    expect(sanitizeSelfServiceRoles(['club_admin', 'participant'], [])).toEqual(['participant'])
  })

  it('PRESERVES admin roles the user was already granted (cannot self-remove)', () => {
    // an admin-granted league_official who edits their member types keeps league_official
    expect(sanitizeSelfServiceRoles(['coach'], ['league_official', 'participant']).sort()).toEqual([
      'coach',
      'league_official',
    ])
    // a super_admin editing member types keeps super_admin
    expect(sanitizeSelfServiceRoles(['parent'], ['super_admin']).sort()).toEqual(['parent', 'super_admin'])
  })

  it('cannot use `existing` to launder a requested admin role', () => {
    // requested admin role is stripped; only truly-existing admin roles are preserved
    expect(sanitizeSelfServiceRoles(['coach', 'super_admin'], ['participant']).sort()).toEqual(['coach'])
  })

  it('never returns empty', () => {
    expect(sanitizeSelfServiceRoles([], [])).toEqual(['participant'])
    expect(sanitizeSelfServiceRoles(['nonsense'], [])).toEqual(['participant'])
  })

  it('dedupes', () => {
    expect(sanitizeSelfServiceRoles(['coach', 'coach', 'participant'], []).sort()).toEqual(['coach', 'participant'])
  })
})
