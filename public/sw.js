/*
 * CMBA Connect service worker. Purpose: let families check the schedule and
 * standings at the gym on weak or no signal. Conservative by design:
 *   - Navigations to /schedule and /standings use network-first, and the
 *     last good response is cached and served when offline.
 *   - Same-origin static assets (Next build output, images, fonts) use
 *     stale-while-revalidate.
 *   - Everything else passes straight through to the network.
 * No personal or member data is cached (only the read-only public pages and assets).
 * Bump CACHE to invalidate old caches on deploy.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const CACHE = 'cmba-v1'
const OFFLINE_PATHS = ['/schedule', '/standings']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isOfflinePage =
    req.mode === 'navigate' && OFFLINE_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))

  if (isOfflinePage) {
    // Network-first: fresh when online, last-seen copy when offline.
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE)
            cache.put(req, fresh.clone())
          }
          return fresh
        } catch (err) {
          const cached = await caches.match(req)
          if (cached) return cached
          throw err
        }
      })(),
    )
    return
  }

  if (isStaticAsset(url)) {
    // Stale-while-revalidate for immutable assets.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(req)
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      })(),
    )
  }
})
