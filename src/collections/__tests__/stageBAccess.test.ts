import { describe, expect, it } from 'vitest'

import type { CollectionConfig } from 'payload'

import { AuditLog } from '../AuditLog'
import { Courts } from '../Courts'
import { Divisions } from '../Divisions'
import { IdempotencyKeys } from '../IdempotencyKeys'
import { ImportBatches } from '../ImportBatches'
import { RateLimitHits } from '../RateLimitHits'
import { RefreshTokens } from '../RefreshTokens'
import { Seasons } from '../Seasons'
import { StandingsCache } from '../StandingsCache'
import { Teams } from '../Teams'
import { TeamMemberships } from '../TeamMemberships'
import { Venues } from '../Venues'

/*
 * Authorization-contract layer (build plan section 12). Because we keep NO DB
 * tests, these call the access functions directly with a fabricated req.user of
 * each role and assert the boolean or the row-scoping Where. This catches a
 * flipped default-deny or a missing field-lock at the phase that introduces it.
 */

const anon = undefined
const participant = { id: 1, roles: ['participant'] }
const clubAdmin = { id: 2, roles: ['club_admin'], club: 10 }
const superAdmin = { id: 3, roles: ['super_admin'] }

// Access functions only read req.user; pass a minimal args object.
type User = typeof participant | undefined
const call = (fn: unknown, user: User, extra: Record<string, unknown> = {}) =>
  (fn as (a: unknown) => unknown)?.({ req: { user }, ...extra })

const fieldAccess = (cfg: CollectionConfig, name: string) => {
  const f = (cfg.fields as Array<{ name?: string; access?: Record<string, unknown> }>).find((x) => x.name === name)
  return f?.access ?? {}
}

describe('Seasons access', () => {
  it('reads public (non-archived) for anonymous and all for admins', () => {
    expect(call(Seasons.access?.read, anon)).toEqual({ status: { not_equals: 'archived' } })
    expect(call(Seasons.access?.read, superAdmin)).toBe(true)
  })
  it('is super-admin write only', () => {
    expect(call(Seasons.access?.create, participant)).toBe(false)
    expect(call(Seasons.access?.create, clubAdmin)).toBe(false)
    expect(call(Seasons.access?.create, superAdmin)).toBe(true)
  })
  it('locks standingsConfig and seasonSeed to super admins', () => {
    expect(call(fieldAccess(Seasons, 'standingsConfig').update, participant)).toBe(false)
    expect(call(fieldAccess(Seasons, 'seasonSeed').update, participant)).toBe(false)
    expect(call(fieldAccess(Seasons, 'seasonSeed').update, superAdmin)).toBe(true)
  })
})

describe('Divisions access', () => {
  it('reads public, writes super-admin only', () => {
    expect(call(Divisions.access?.read, anon)).toBe(true)
    expect(call(Divisions.access?.create, clubAdmin)).toBe(false)
    expect(call(Divisions.access?.create, superAdmin)).toBe(true)
  })
})

describe('Teams access', () => {
  it('reads public', () => {
    expect(call(Teams.access?.read, anon)).toBe(true)
  })
  it('lets a club admin manage only their own club (scoped Where), super admin all', () => {
    expect(call(Teams.access?.update, participant)).toBe(false)
    expect(call(Teams.access?.update, clubAdmin)).toEqual({ club: { equals: 10 } })
    expect(call(Teams.access?.update, superAdmin)).toBe(true)
  })
  it('locks club and division moves to super admins', () => {
    expect(call(fieldAccess(Teams, 'division').update, clubAdmin)).toBe(false)
    expect(call(fieldAccess(Teams, 'division').update, superAdmin)).toBe(true)
    expect(call(fieldAccess(Teams, 'club').update, clubAdmin)).toBe(false)
  })
})

describe('Venues and Courts access', () => {
  it('reads public, writes super-admin only', () => {
    expect(call(Venues.access?.read, anon)).toBe(true)
    expect(call(Venues.access?.create, clubAdmin)).toBe(false)
    expect(call(Courts.access?.read, anon)).toBe(true)
    expect(call(Courts.access?.create, superAdmin)).toBe(true)
  })
  it('locks a court venue move to super admins', () => {
    expect(call(fieldAccess(Courts, 'venue').update, clubAdmin)).toBe(false)
  })
})

describe('TeamMemberships access (the verified-rep gate)', () => {
  it('scopes reads to own membership for non-admins', () => {
    expect(call(TeamMemberships.access?.read, anon)).toBe(false)
    expect(call(TeamMemberships.access?.read, participant)).toEqual({ user: { equals: 1 } })
    expect(call(TeamMemberships.access?.read, superAdmin)).toBe(true)
  })
  it('allows a self-claim create but only admins update or delete', () => {
    expect(call(TeamMemberships.access?.create, participant)).toBe(true)
    expect(call(TeamMemberships.access?.create, anon)).toBe(false)
    expect(call(TeamMemberships.access?.update, participant)).toBe(false)
    expect(call(TeamMemberships.access?.update, clubAdmin)).toBe(true)
  })
  it('locks verified, role, and user to admins so a participant cannot self-verify', () => {
    expect(call(fieldAccess(TeamMemberships, 'verified').update, participant)).toBe(false)
    expect(call(fieldAccess(TeamMemberships, 'verified').update, superAdmin)).toBe(true)
    expect(call(fieldAccess(TeamMemberships, 'role').create, participant)).toBe(false)
    expect(call(fieldAccess(TeamMemberships, 'user').update, participant)).toBe(false)
  })
})

describe('StandingsCache access', () => {
  it('reads public for live seasons, never writable by users', () => {
    expect(call(StandingsCache.access?.read, anon)).toEqual({ seasonStatus: { in: ['active', 'playoffs', 'complete'] } })
    expect(call(StandingsCache.access?.read, superAdmin)).toBe(true)
    expect(call(StandingsCache.access?.create, superAdmin)).toBe(false)
    expect(call(StandingsCache.access?.update, superAdmin)).toBe(false)
  })
})

describe('ImportBatches access', () => {
  it('is admin only', () => {
    expect(call(ImportBatches.access?.read, participant)).toBe(false)
    expect(call(ImportBatches.access?.read, clubAdmin)).toBe(true)
    expect(call(ImportBatches.access?.create, clubAdmin)).toBe(true)
  })
})

describe('AuditLog is append-only', () => {
  it('is admin-read and write-denied to everyone including super admin', () => {
    expect(call(AuditLog.access?.read, participant)).toBe(false)
    expect(call(AuditLog.access?.read, clubAdmin)).toBe(true)
    expect(call(AuditLog.access?.create, superAdmin)).toBe(false)
    expect(call(AuditLog.access?.update, superAdmin)).toBe(false)
    expect(call(AuditLog.access?.delete, superAdmin)).toBe(false)
  })
  it('throws on update and on delete even via overrideAccess (hook-enforced)', () => {
    const beforeChange = (AuditLog.hooks?.beforeChange?.[0]) as (a: unknown) => unknown
    expect(() => beforeChange({ operation: 'update' })).toThrow()
    expect(beforeChange({ operation: 'create' })).toBeUndefined()
    const beforeDelete = (AuditLog.hooks?.beforeDelete?.[0]) as (a: unknown) => unknown
    expect(() => beforeDelete({})).toThrow()
  })
})

describe('System collections are fully sealed', () => {
  for (const cfg of [IdempotencyKeys, RefreshTokens, RateLimitHits]) {
    it(`${cfg.slug} denies read/create/update/delete to all`, () => {
      for (const op of ['read', 'create', 'update', 'delete'] as const) {
        expect(call(cfg.access?.[op], superAdmin)).toBe(false)
        expect(call(cfg.access?.[op], anon)).toBe(false)
      }
    })
  }
})

describe('Every Stage B collection declares all four access operations', () => {
  const collections: CollectionConfig[] = [
    Seasons, Divisions, Teams, Venues, Courts, TeamMemberships,
    StandingsCache, ImportBatches, AuditLog, IdempotencyKeys, RefreshTokens, RateLimitHits,
  ]
  for (const cfg of collections) {
    it(`${cfg.slug} sets read, create, update, delete`, () => {
      for (const op of ['read', 'create', 'update', 'delete'] as const) {
        expect(typeof cfg.access?.[op]).toBe('function')
      }
    })
  }
})
