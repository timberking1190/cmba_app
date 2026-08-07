/*
 * CMBA+ service worker.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE CHANGING WHAT IT CACHES.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * This app handles minors' data. A service worker cache is unencrypted storage on
 * a shared family phone that outlives sign out unless something explicitly clears
 * it. So the rule here is an allowlist, not a blocklist: nothing is cached unless
 * it is on the list below, and the list contains no HTML and no API responses.
 *
 * Why no HTML, even for the "public" schedule and standings pages. The root layout
 * renders <Header user={...}> on the server, so EVERY page document contains the
 * signed in person's name and email address. Caching /schedule for offline
 * reading would therefore cache a member's identity, on disk, keyed by a URL that
 * looks public. Verified by reading the served HTML, not assumed. That is what
 * rules out the stale-while-revalidate strategy for public reads that this work
 * originally planned, and it is the right call: an unencrypted copy of a parent's
 * email on a shared phone is not worth an offline schedule.
 *
 * What this DOES give: the app shell, fonts and icons load with no network, so a
 * dropped connection gets a branded offline page that explains itself instead of
 * the browser's error page. That is the honest scope.
 *
 * Kill switch. Bump CACHE_VERSION to orphan every existing cache; the activate
 * handler deletes anything that does not match. To disable the worker entirely,
 * set NEXT_PUBLIC_ENABLE_SW to anything other than "true": the registration
 * component then unregisters this worker and purges its caches on the next visit.
 * See docs/audit/SERVICE-WORKER.md.
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `cmba-static-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'

/*
 * The complete allowlist of what may be cached. Anything not matching one of
 * these is passed straight to the network and never stored.
 *
 * /_next/static/ is content hashed by the build, so it is immutable and safe to
 * cache-first forever. The rest are static brand assets from /public.
 */
const CACHEABLE = [
  /^\/_next\/static\//,
  /^\/favicon\.(png|ico)$/,
  /^\/icon-[\w-]+\.png$/,
  /^\/cmba-logo[\w-]*\.png$/,
  /^\/manifest\.webmanifest$/,
]

/**
 * Paths that must NEVER be cached, asserted here as well as by the allowlist
 * above. Belt and braces on purpose: if someone later widens CACHEABLE, this
 * still refuses. e2e/cache-privacy.spec.ts asserts the same list from outside.
 */
const NEVER_CACHE = [
  /^\/account/,
  /^\/manage/,
  /^\/rep/,
  /^\/compliance/,
  /^\/scan/,
  /^\/api/,
  /^\/admin/,
  /^\/login/,
  /^\/score-login/,
  /^\/guardian/,
]

function isCacheable(url) {
  if (url.origin !== self.location.origin) return false
  if (NEVER_CACHE.some((re) => re.test(url.pathname))) return false
  return CACHEABLE.some((re) => re.test(url.pathname))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // A failed precache must not block installation; the worker is still useful
      // for everything else and the offline page will be fetched on demand.
      .catch(() => undefined),
  )
  // Do NOT skipWaiting here. A worker that activates immediately can start
  // serving new assets to a page running old code, which is how a "just refresh"
  // bug becomes permanent. The page asks for it explicitly via SKIP_WAITING once
  // the user has agreed to reload.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every cache from a previous version. This is the kill switch:
      // bumping CACHE_VERSION orphans everything that came before it.
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== STATIC_CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const type = event.data?.type

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  /*
   * Purge on sign out. The page posts this when a session ends, so a cache
   * created while signed in cannot outlive the session. Nothing personal should
   * be in there to begin with, given the allowlist, but "should" is doing too
   * much work when the subject is a child's data.
   */
  if (type === 'PURGE_ALL') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Never touch anything that is not a plain GET. A cached POST is a lost score
  // report or a duplicated one.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  /*
   * Navigations: network only, with the offline page as the fallback. Never
   * cached, because every document in this app carries the signed in user's
   * identity in the header.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL)
        return (
          cached ??
          new Response('You are offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      }),
    )
    return
  }

  if (!isCacheable(url)) return // straight to the network, nothing stored

  // Cache first, for content hashed immutable assets only.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        // Only store a clean, complete, same-origin response. An opaque or
        // partial response in the cache is a bug that surfaces much later.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
