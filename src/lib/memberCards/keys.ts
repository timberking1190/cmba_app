/*
 * Member Cards — signing key material resolution (D1).
 *
 * Ed25519 keys live in env only (Non-negotiable 5), never in the repo:
 *   MEMBERCARD_SIGNING_KID           active key id used to mint new tokens
 *   MEMBERCARD_SIGNING_PRIVATE_KEY   active PKCS8 PEM (mint)
 *   MEMBERCARD_SIGNING_PUBLIC_KEYS   JSON { "<kid>": "<spki pem>", ... } for verify
 *                                    (holds the active key + any not-yet-retired keys
 *                                    so old-but-current tokens still verify across a
 *                                    rotation). Falls back to a single
 *                                    MEMBERCARD_SIGNING_PUBLIC_KEY + the active kid.
 *
 * Env is injected so this is unit-testable and so a route/hook can fail loudly when
 * the keys are missing rather than minting/verifying against undefined.
 */
export interface SigningKey {
  kid: string
  privateKeyPem: string
}

export type PublicKeyResolver = (kid: string) => string | null

/**
 * Normalize a PEM read from an env var. Host env stores (Vercel, .env) frequently
 * mangle multi-line PEMs into a single line with literal `\n` (backslash-n) escapes,
 * and sometimes wrap the whole value in quotes. Passing that straight to
 * crypto.createPrivateKey throws `ERR_OSSL_UNSUPPORTED` (DECODER routines::unsupported).
 * Restore real newlines + strip stray wrapping quotes so the key parses.
 */
export function normalizePem(pem: string): string {
  let s = pem
  // Strip a single pair of wrapping quotes if present (checked on a trimmed view so
  // outer whitespace around the quotes is dropped too). A clean PEM is left untouched.
  const trimmed = pem.trim()
  if (trimmed.length >= 2 && ((trimmed[0] === '"' && trimmed.endsWith('"')) || (trimmed[0] === "'" && trimmed.endsWith("'")))) {
    s = trimmed.slice(1, -1)
  }
  if (s.includes('\\n')) s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n')
  return s
}

/** Parse the verify-side public key map from env; tolerant of malformed JSON. */
export function buildPublicKeyResolver(env: Record<string, string | undefined> = process.env): PublicKeyResolver {
  const map: Record<string, string> = {}

  const json = env.MEMBERCARD_SIGNING_PUBLIC_KEYS
  if (json) {
    try {
      const parsed = JSON.parse(json) as unknown
      if (parsed && typeof parsed === 'object') {
        for (const [kid, pem] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof pem === 'string') map[kid] = normalizePem(pem)
        }
      }
    } catch {
      // ignore — fall through to the single-key form
    }
  }

  const singleKid = env.MEMBERCARD_SIGNING_KID
  const singlePem = env.MEMBERCARD_SIGNING_PUBLIC_KEY
  if (singleKid && singlePem && !map[singleKid]) map[singleKid] = normalizePem(singlePem)

  return (kid: string) => map[kid] ?? null
}

/** The active mint key, or null when signing is not configured (e.g. dev without keys). */
export function getActiveSigningKey(env: Record<string, string | undefined> = process.env): SigningKey | null {
  const kid = env.MEMBERCARD_SIGNING_KID
  const privateKeyPem = env.MEMBERCARD_SIGNING_PRIVATE_KEY
  if (!kid || !privateKeyPem) return null
  return { kid, privateKeyPem: normalizePem(privateKeyPem) }
}

/** True when both mint + verify material is present. */
export function isSigningConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const active = getActiveSigningKey(env)
  if (!active) return false
  return buildPublicKeyResolver(env)(active.kid) != null
}
