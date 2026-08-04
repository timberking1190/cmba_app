import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scrubEvent, sentryEnvironment, sentryInitOptions, serverDsn } from '../observability/sentry'

describe('scrubEvent', () => {
  it('removes the user object (id, email, ip)', () => {
    const e = scrubEvent({ user: { id: '1', email: 'a@b.com', ip_address: '1.2.3.4' }, message: 'boom' })
    expect(e.user).toBeUndefined()
    expect(e.message).toBe('boom')
  })

  it('strips cookies, auth and nonce headers, body, and query strings from the request', () => {
    const e = scrubEvent({
      request: {
        cookies: { 'payload-token': 'secret' },
        data: { password: 'hunter2' },
        headers: { Cookie: 'x=y', Authorization: 'JWT z', 'x-nonce': 'abc', 'user-agent': 'kept' },
        query_string: 'token=abc',
        url: 'https://cmba.example/account?token=abc',
      },
    })
    expect(e.request?.cookies).toBeUndefined()
    expect(e.request?.data).toBeUndefined()
    expect(e.request?.headers).toEqual({ 'user-agent': 'kept' })
    expect(e.request?.query_string).toBe('[redacted]')
    expect(e.request?.url).toBe('https://cmba.example/account')
  })

  it('is null-safe', () => {
    expect(scrubEvent(null)).toBeNull()
    expect(scrubEvent(undefined)).toBeUndefined()
  })
})

describe('sentryInitOptions', () => {
  it('keeps PII out and disables session replay', () => {
    const opts = sentryInitOptions('https://key@example.ingest.sentry.io/1')
    expect(opts.sendDefaultPii).toBe(false)
    expect(opts.beforeSend).toBe(scrubEvent)
    expect(opts.replaysSessionSampleRate).toBe(0)
    expect(opts.replaysOnErrorSampleRate).toBe(0)
    expect(opts.dsn).toContain('sentry.io')
  })
})

describe('serverDsn and environment', () => {
  const OLD = { dsn: process.env.SENTRY_DSN, pub: process.env.NEXT_PUBLIC_SENTRY_DSN, env: process.env.SENTRY_ENVIRONMENT }
  beforeEach(() => {
    delete process.env.SENTRY_DSN
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    delete process.env.SENTRY_ENVIRONMENT
  })
  afterEach(() => {
    for (const [k, v] of [['SENTRY_DSN', OLD.dsn], ['NEXT_PUBLIC_SENTRY_DSN', OLD.pub], ['SENTRY_ENVIRONMENT', OLD.env]] as const) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('is undefined when no DSN is configured (monitoring off)', () => {
    expect(serverDsn()).toBeUndefined()
  })

  it('prefers the server DSN, then the public one', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'pub'
    expect(serverDsn()).toBe('pub')
    process.env.SENTRY_DSN = 'srv'
    expect(serverDsn()).toBe('srv')
  })

  it('labels the environment from SENTRY_ENVIRONMENT when set', () => {
    process.env.SENTRY_ENVIRONMENT = 'preview'
    expect(sentryEnvironment()).toBe('preview')
  })
})
