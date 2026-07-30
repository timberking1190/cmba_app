/*
 * Signing in, decided in one place so it behaves the same every time.
 *
 * The reported failure was "sign in takes multiple attempts to reach the admin
 * side". Two causes, both handled here and in the caller:
 *
 *  1. The old handler navigated with the client router immediately after the
 *     login request resolved. The App Router may already hold a cached server
 *     render of the destination from BEFORE the login, and for a gated page like
 *     /manage that cached render is the redirect back to /login. The second
 *     attempt worked because by then the cache had been replaced. The caller
 *     therefore performs a FULL document navigation, which cannot be served from
 *     the client router cache and always reaches the server with the new cookie.
 *
 *  2. Setting the cookie and the session being readable are not the same moment.
 *     performSignIn confirms the session resolves before it reports success, so
 *     the browser never navigates to a gated page on a half established session.
 *
 * The fetch implementation is injected so this is testable without a browser.
 */

export type SignInInput = { email: string; password: string; redirectTo: string }
export type SignInResult = { ok: true; destination: string } | { ok: false; error: string }

export type SignInDeps = { fetchImpl: typeof fetch }

const GENERIC_FAILURE = 'Something went wrong signing you in. Please check your connection and try again.'

export async function performSignIn(deps: SignInDeps, input: SignInInput): Promise<SignInResult> {
  const { fetchImpl } = deps

  let loginRes: Response
  try {
    loginRes = await fetchImpl('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: input.email, password: input.password }),
    })
  } catch {
    return { ok: false, error: GENERIC_FAILURE }
  }

  if (!loginRes.ok) {
    if (loginRes.status === 429) {
      return { ok: false, error: 'Too many sign in attempts. Please wait a minute and try again.' }
    }
    if (loginRes.status === 401 || loginRes.status === 400) {
      return { ok: false, error: 'That email or password is not right. Check both and try again.' }
    }
    return { ok: false, error: GENERIC_FAILURE }
  }

  /*
   * Confirm the session before we send the browser to a gated page. Without this
   * a slow cookie write lands the user back on the login screen, which is what
   * "it takes two or three tries" looked like.
   */
  try {
    const meRes = await fetchImpl('/api/users/me', { credentials: 'include' })
    const me = meRes.ok ? await meRes.json() : null
    if (!me?.user) {
      return { ok: false, error: 'You were signed in but the session did not stick. Please try once more, and allow cookies for this site if your browser blocks them.' }
    }
  } catch {
    return { ok: false, error: GENERIC_FAILURE }
  }

  return { ok: true, destination: input.redirectTo }
}
