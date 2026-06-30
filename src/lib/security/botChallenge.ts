import { createHmac } from 'crypto'

/*
 * Stage C / S0 — bot-challenge + abuse helpers for public, unauthenticated forms
 * (today: /game-report). These run in the Node runtime (Payload collection hooks).
 *
 * Layers, weakest to strongest:
 *  1. Honeypot: a hidden "website" field the form copies into the x-cmba-hp header.
 *     A naive bot that auto-fills inputs trips it; a human leaves it empty.
 *  2. Durable per-IP + global rate limiting (see checkRateLimit) keyed on a HASHED
 *     IP so no raw IP is ever stored (PIPEDA minimization).
 *  3. Cloudflare Turnstile: a privacy-respecting CAPTCHA. Enforced only when
 *     TURNSTILE_SECRET is set, so the operator can switch it on later with no code
 *     change. No third-party tracker ships until then.
 */

export const HONEYPOT_HEADER = 'x-cmba-hp'
export const TURNSTILE_HEADER = 'x-cmba-turnstile'

/** Best-effort client IP from the proxy chain (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Stable, non-reversible subject for rate-limit rows. HMAC with the server secret
 * so the stored value cannot be correlated back to a raw IP without the key.
 */
export function hashIp(ip: string): string {
  const secret = process.env.PAYLOAD_SECRET || 'dev'
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 40)
}

export function honeypotTripped(headers: Headers): boolean {
  return (headers.get(HONEYPOT_HEADER) || '').trim().length > 0
}

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET)
}

/**
 * Verify a Turnstile token server-side. Returns true when the challenge is
 * disabled (no secret configured) so non-provisioned environments still work; when
 * enabled, a missing or invalid token returns false (fail closed).
 */
export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) return true // challenge disabled
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip })
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false // network error -> fail closed for a security control
  }
}
