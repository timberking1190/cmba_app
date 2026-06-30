import type { CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'

import { isPwned } from '../../lib/security/hibp'

/*
 * Stage C / S1 — NIST SP 800-63B-4 memorized-secret (password) verifier rules.
 *
 * Runs whenever a password is being set (create, admin change, self-service
 * change). It does NOT run on plain profile edits (no password in `data`), so it
 * never affects existing accounts until they next change their password.
 *
 * Rules per 800-63B-4:
 *  - Minimum length enforced (NIST floor is 8; we require 12 and encourage more).
 *  - Generous maximum so long passphrases are allowed.
 *  - All characters accepted; NO composition rules, NO forced rotation, NO hints
 *    or knowledge-based questions (so we deliberately add none of those).
 *  - Screen against the Have I Been Pwned breached-password corpus (k-anonymity).
 *  - Contextual blocklist: the password may not equal the account email or name.
 */

const MIN_LENGTH = 12
const MAX_LENGTH = 128

export const validatePassword: CollectionBeforeValidateHook = async ({ data, req }) => {
  const pw = (data as { password?: unknown } | undefined)?.password
  if (typeof pw !== 'string' || pw.length === 0) return data // no password set this op

  const fail = (message: string): never => {
    throw new ValidationError({ errors: [{ path: 'password', message }] })
  }

  if (pw.length < MIN_LENGTH) {
    fail(`Use at least ${MIN_LENGTH} characters. A longer passphrase of a few words is stronger and easier to remember.`)
  }
  if (pw.length > MAX_LENGTH) {
    fail(`Use at most ${MAX_LENGTH} characters.`)
  }

  // Contextual blocklist (cheap, no list to maintain).
  const lower = pw.toLowerCase()
  const email = typeof (data as { email?: unknown })?.email === 'string' ? (data as { email: string }).email.toLowerCase() : undefined
  const name = typeof (data as { fullName?: unknown })?.fullName === 'string' ? (data as { fullName: string }).fullName.toLowerCase() : undefined
  if ((email && lower === email) || (name && lower === name)) {
    fail('Your password must not be the same as your name or email address.')
  }

  // Breached-password screening (fails open on HIBP outage).
  const warn = (m: string) => req?.payload?.logger?.warn?.(m)
  if (await isPwned(pw, warn)) {
    fail('This password appeared in a known data breach and is unsafe. Please choose a different one.')
  }

  return data
}
