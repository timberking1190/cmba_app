import { afterEach, describe, expect, it } from 'vitest'

import { publicRegistrationAllowed, registrationMode } from '../policy'

afterEach(() => delete process.env.REGISTRATION_MODE)

describe('registration policy', () => {
  it('defaults to open (current behavior) and allows public sign-up', () => {
    expect(registrationMode()).toBe('open')
    expect(publicRegistrationAllowed()).toBe(true)
  })

  it('closes public sign-up only when REGISTRATION_MODE=closed', () => {
    process.env.REGISTRATION_MODE = 'closed'
    expect(registrationMode()).toBe('closed')
    expect(publicRegistrationAllowed()).toBe(false)
  })

  it('treats any unrecognized value as open (fail-open to current behavior)', () => {
    process.env.REGISTRATION_MODE = 'whatever'
    expect(publicRegistrationAllowed()).toBe(true)
  })

  it('honours an explicit mode argument', () => {
    expect(publicRegistrationAllowed('closed')).toBe(false)
    expect(publicRegistrationAllowed('open')).toBe(true)
  })
})
