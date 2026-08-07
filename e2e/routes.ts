/*
 * The route inventory the mobile and accessibility suites walk.
 *
 * Split by whether a signed out visitor can reach the page, because that is what
 * decides whether a spec can assert on it without credentials. The proxy
 * (src/proxy.ts) redirects /account, /compliance, /manage and /rep to /login when
 * there is no payload-token cookie, so those are listed separately and only run
 * when E2E_USER_EMAIL / E2E_USER_PASSWORD are supplied.
 */

/** Reachable by a signed out visitor. Every mobile and a11y spec walks these. */
export const PUBLIC_ROUTES = [
  '/',
  '/schedule',
  '/standings',
  '/calendar',
  '/rules',
  '/login',
  '/score-login',
  '/game-report',
  '/scan',
  '/coach',
  '/coach/pathway',
  '/coach/courses',
  '/coach/clinics',
  '/coach/challenges',
  '/coach/managing-the-moment',
  '/ref',
  '/ref/signals',
  '/ref/quick-ref',
  '/athlete',
  '/athlete/challenges',
  '/athlete/quiz',
  '/parent',
  '/resources',
  '/faq',
  '/contact',
  '/leadership',
  '/guardian-consent',
  '/privacy',
  '/terms',
] as const

/**
 * The five routes the Phase 0 baseline measures and Lighthouse CI gates on. Kept
 * short on purpose: a Lighthouse run is expensive and these are the pages a
 * parent or coach actually lands on.
 */
export const LCP_CRITICAL_ROUTES = ['/', '/schedule', '/standings', '/rules', '/login'] as const

/** Behind the proxy session gate. Need E2E_USER_EMAIL / E2E_USER_PASSWORD. */
export const AUTHENTICATED_ROUTES = ['/account', '/account/card', '/account/security'] as const

/**
 * Routes that must NEVER be served from a cache, because the response is scoped
 * to one signed in person. The Phase 5 cache privacy test asserts on these.
 */
export const NEVER_CACHE_PREFIXES = [
  '/account',
  '/compliance',
  '/manage',
  '/rep',
  '/scan',
  '/api',
  '/admin',
] as const

/** The viewports the mobile suite asserts against. */
export const MOBILE_VIEWPORTS = [
  { name: 'small phone 360x640', width: 360, height: 640 },
  { name: 'notched phone 390x844', width: 390, height: 844 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
] as const
