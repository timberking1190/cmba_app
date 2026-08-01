/*
 * REPRO + rules for item 3: "Sign in takes multiple attempts to reach the admin
 * side." The behaviour pinned here is that a successful sign in confirms the
 * session BEFORE reporting success, so the caller never sends the browser to a
 * gated page on a session that has not landed yet.
 */
import { describe, expect, it, vi } from 'vitest'

import { performSignIn } from '../signIn'

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function fetchStub(handlers: Record<string, () => Response | Promise<Response>>) {
  return vi.fn(async (url: string | URL | Request) => {
    const key = String(url)
    const h = Object.entries(handlers).find(([k]) => key.includes(k))
    if (!h) throw new Error(`unexpected fetch to ${key}`)
    return h[1]()
  }) as unknown as typeof fetch
}

describe('performSignIn', () => {
  it('confirms the session before reporting success, so one attempt is enough', async () => {
    const fetchImpl = fetchStub({
      '/api/users/login': () => jsonRes({ token: 'x' }),
      '/api/users/me': () => jsonRes({ user: { id: 1, roles: ['super_admin'] } }),
    })
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'pw', redirectTo: '/manage' })
    expect(res).toEqual({ ok: true, destination: '/manage' })
    // Login first, then the session check. Both happen before we report success.
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2)
  })

  it('does not report success when the login worked but the session did not stick', async () => {
    const fetchImpl = fetchStub({
      '/api/users/login': () => jsonRes({ token: 'x' }),
      '/api/users/me': () => jsonRes({ user: null }),
    })
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'pw', redirectTo: '/manage' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('allow cookies')
  })

  it('says plainly when the password is wrong, without leaking which field failed', async () => {
    const fetchImpl = fetchStub({ '/api/users/login': () => jsonRes({ message: 'nope' }, 401) })
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'bad', redirectTo: '/account' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toBe('That email or password is not right. Check both and try again.')
  })

  it('explains a rate limit rather than looking like a wrong password', async () => {
    const fetchImpl = fetchStub({ '/api/users/login': () => jsonRes({}, 429) })
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'pw', redirectTo: '/account' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('wait a minute')
  })

  it('survives the network failing without throwing at the caller', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'pw', redirectTo: '/account' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('check your connection')
  })

  it('carries the requested destination through, so an admin lands where they asked', async () => {
    const fetchImpl = fetchStub({
      '/api/users/login': () => jsonRes({ token: 'x' }),
      '/api/users/me': () => jsonRes({ user: { id: 1 } }),
    })
    const res = await performSignIn({ fetchImpl }, { email: 'a@b.ca', password: 'pw', redirectTo: '/manage/brackets' })
    expect(res.ok && res.destination).toBe('/manage/brackets')
  })
})
