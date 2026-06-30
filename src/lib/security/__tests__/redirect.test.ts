import { describe, expect, it } from 'vitest'

import { safeInternalPath } from '../redirect'
import { superAdminFieldOnly } from '../../../access/index'

describe('safeInternalPath (open-redirect guard)', () => {
  it('allows a normal same-site path', () => {
    expect(safeInternalPath('/manage')).toBe('/manage')
    expect(safeInternalPath('/account/security?x=1')).toBe('/account/security?x=1')
  })

  it('blocks protocol-relative and backslash tricks (the //evil.com bug)', () => {
    expect(safeInternalPath('//evil.com')).toBe('/account')
    expect(safeInternalPath('/\\evil.com')).toBe('/account')
  })

  it('blocks absolute URLs and non-paths', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/account')
    expect(safeInternalPath('javascript:alert(1)')).toBe('/account')
    expect(safeInternalPath('evil.com')).toBe('/account')
  })

  it('blocks control-char / whitespace smuggling and empty input', () => {
    expect(safeInternalPath('/foo\n//evil')).toBe('/account')
    expect(safeInternalPath('/ /evil')).toBe('/account')
    expect(safeInternalPath('')).toBe('/account')
    expect(safeInternalPath(null)).toBe('/account')
  })

  it('honours a custom fallback', () => {
    expect(safeInternalPath('//evil.com', '/login')).toBe('/login')
  })
})

describe('mass-assignment guard (privileged fields)', () => {
  const call = (user: unknown) => superAdminFieldOnly({ req: { user } } as never)
  it('only a super admin may write role/status-class fields', () => {
    expect(call({ id: 4, roles: ['super_admin'] })).toBe(true)
    expect(call({ id: 1, roles: ['participant'] })).toBe(false) // cannot self-assign roles
    expect(call({ id: 3, roles: ['club_admin'] })).toBe(false)
    expect(call(undefined)).toBe(false)
  })
})
