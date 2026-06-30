import { createHash } from 'crypto'

/*
 * Stage C / S1 — breached-password screening per NIST SP 800-63B-4, using the
 * Have I Been Pwned range API with k-anonymity: only the first 5 hex chars of the
 * SHA-1 are sent, so the full password (and full hash) never leave the server.
 *
 * Fails OPEN: on timeout or any network/parse error we return false (allow) and
 * log, so an HIBP outage can never lock a legitimate user out of setting a
 * password. The control degrades gracefully; it is one layer among several.
 */

const ENDPOINT = 'https://api.pwnedpasswords.com/range/'
const TIMEOUT_MS = 2500

export function sha1Upper(input: string): string {
  return createHash('sha1').update(input, 'utf8').digest('hex').toUpperCase()
}

/**
 * Parse a HIBP range response (lines of `SUFFIX:COUNT`) and decide whether the
 * given 35-char suffix appears with a non-zero count. Padding rows (count 0) are
 * discarded. Pure + exported for unit testing without network.
 */
export function suffixIsPwned(body: string, suffix: string): boolean {
  const target = suffix.toUpperCase()
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const sfx = line.slice(0, idx).trim().toUpperCase()
    if (sfx !== target) continue
    const count = parseInt(line.slice(idx + 1).trim(), 10)
    return Number.isFinite(count) && count > 0
  }
  return false
}

export async function isPwned(
  password: string,
  log?: (msg: string) => void,
): Promise<boolean> {
  if (!password) return false
  const hash = sha1Upper(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${ENDPOINT}${prefix}`, {
      // Add-Padding hides the true result-set size from a network observer.
      headers: { 'Add-Padding': 'true', 'User-Agent': 'cmba-connect-security' },
      signal: controller.signal,
    })
    if (!res.ok) {
      log?.(`HIBP HTTP ${res.status} (allowing)`)
      return false
    }
    return suffixIsPwned(await res.text(), suffix)
  } catch (err) {
    log?.(`HIBP check failed (allowing): ${err instanceof Error ? err.message : String(err)}`)
    return false // fail open
  } finally {
    clearTimeout(timer)
  }
}
