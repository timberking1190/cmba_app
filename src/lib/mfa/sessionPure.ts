import type { Aal } from './guard'

/*
 * Stage C / S1 — pure per-session assurance helpers (no server-only / Payload
 * imports, so they unit-test cleanly). The server entrypoint lives in session.ts.
 */

export type SessionAssurance = { aal: Aal; mfaAt?: string | null; stepUpAt?: string | null }
export type SessionMetaRow = { sid?: string | null; aal?: string | null; mfaAt?: string | null; stepUpAt?: string | null }

/** Resolve the assurance for a sid from a sessionMeta array. Absent -> aal1. */
export function assuranceFor(sessionMeta: SessionMetaRow[] | null | undefined, sid: string | undefined): SessionAssurance {
  if (!sid || !Array.isArray(sessionMeta)) return { aal: 'aal1' }
  const row = sessionMeta.find((r) => r?.sid === sid)
  if (!row) return { aal: 'aal1' }
  return {
    aal: row.aal === 'aal2' ? 'aal2' : 'aal1',
    mfaAt: row.mfaAt ?? null,
    stepUpAt: row.stepUpAt ?? null,
  }
}

/** Read the sid claim from a Payload JWT without verifying it. */
export function decodeSid(token: string | undefined | null): string | undefined {
  if (!token || token.split('.').length < 2) return undefined
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'))
    return typeof payload?.sid === 'string' ? payload.sid : undefined
  } catch {
    return undefined
  }
}
