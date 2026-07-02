/*
 * Member Cards — the canonical scan-result vocabulary (spec `scan_result`).
 * Shared by the `scans` collection (select options) and the /verify route so the
 * audit log and the API can never drift.
 */
export const SCAN_RESULTS = [
  'valid',
  'expired_credentials',
  'revoked',
  'revoked_token',
  'not_found',
  'not_scannable',
  'token_expired',
  'invalid_signature',
  'member_inactive',
  'rate_limited',
] as const

export type ScanResult = (typeof SCAN_RESULTS)[number]

/** Only this verdict clears a coach for the sideline. */
export const isCleared = (r: ScanResult): boolean => r === 'valid'

/** Payload `select` options. */
export const scanResultOptions = SCAN_RESULTS.map((value) => ({
  label: value
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' '),
  value,
}))
