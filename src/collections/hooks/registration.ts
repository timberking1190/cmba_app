import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

import { checkRateLimit } from '../../lib/rateLimit'
import { publicRegistrationAllowed } from '../../lib/registration/policy'
import {
  getClientIp,
  hashIp,
  honeypotTripped,
  isTurnstileEnabled,
  verifyTurnstile,
  TURNSTILE_HEADER,
} from '../../lib/security/botChallenge'

const ONE_HOUR = 60 * 60 * 1000

/*
 * Stage C / S4 — registration readiness + signup bot defense. Runs first on a
 * Users create. Admin-created accounts and the seed/bootstrap are exempt. For a
 * PUBLIC self-registration it enforces:
 *  - the registration mode (REGISTRATION_MODE=closed -> admin-created only),
 *  - a honeypot,
 *  - per-IP (hashed) + global rate limiting,
 *  - Cloudflare Turnstile when configured.
 * Default mode is 'open', Turnstile is off, and the honeypot/limits do not affect a
 * normal signup, so current behavior is unchanged until the operator tightens it.
 */
export const registrationGate: CollectionBeforeValidateHook = async ({ operation, req }) => {
  if (operation !== 'create') return
  if (req.user) return // admin-created
  if ((req.context as { skipConsentEnforcement?: boolean } | undefined)?.skipConsentEnforcement) return // seed/bootstrap

  if (!publicRegistrationAllowed()) {
    throw new APIError('Public sign-up is currently closed. Please contact CMBA to be added.', 403, undefined, true)
  }

  const headers = req.headers
  if (honeypotTripped(headers)) {
    throw new APIError('Sign-up rejected.', 400, undefined, true)
  }

  const ip = getClientIp(headers)
  const perIp = await checkRateLimit(req.payload, { bucket: 'register:ip', subject: hashIp(ip), limit: 5, windowMs: ONE_HOUR })
  const global = await checkRateLimit(req.payload, { bucket: 'register:global', subject: 'all', limit: 50, windowMs: ONE_HOUR })
  if (!perIp.ok || !global.ok) {
    throw new APIError('Too many sign-ups from this connection. Please wait and try again.', 429, undefined, true)
  }

  if (isTurnstileEnabled()) {
    const ok = await verifyTurnstile(headers.get(TURNSTILE_HEADER), ip)
    if (!ok) throw new APIError('Bot challenge failed. Please try again.', 400, undefined, true)
  }
}
