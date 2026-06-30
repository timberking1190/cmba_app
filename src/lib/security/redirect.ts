/*
 * Stage C / S2 — open-redirect guard. A `next`/`redirect` parameter must be a
 * same-site absolute PATH. The common bug is allowing any value that starts with
 * "/", which lets "//evil.com" (a protocol-relative URL the browser resolves to
 * https://evil.com) through. We reject "//", "/\", and any control char or space.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = '/account'): string {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  if (!raw.startsWith('/')) return fallback // must be a relative path (no scheme, no host)
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback // protocol-relative / backslash trick
  // Reject control chars (<= 0x1F) and space (0x20): block path-smuggling tricks.
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) <= 0x20) return fallback
  }
  return raw
}
