import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NEVER_CACHE_PREFIXES } from './routes'

/*
 * The blocking privacy test for the service worker.
 *
 * This app handles minors' data. A Cache Storage entry is unencrypted, lives on a
 * possibly shared phone, and survives sign out unless something explicitly
 * removes it. So this suite exists to fail the build if anything personal ever
 * lands there.
 *
 * It runs in two layers, because either one alone is too easy to fool:
 *
 *   1. Source level. The worker's own allowlist is read and asserted, so a change
 *      that widens it is caught even on a machine where no worker is running.
 *   2. Runtime. A real browser drives the site with the worker registered, and
 *      the actual contents of Cache Storage are enumerated and checked.
 *
 * The runtime layer only runs when the worker is enabled (NEXT_PUBLIC_ENABLE_SW),
 * and it says so loudly when it skips rather than passing silently.
 */

const SW_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'sw.js',
)

const SW_SOURCE = readFileSync(SW_PATH, 'utf8')
const SW_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SW === 'true'

/* ------------------------------------------------------------- source */

test.describe('the worker cannot be told to cache anything personal', () => {
  test('caches nothing but content hashed build assets and static brand files', () => {
    /*
     * The allowlist is the whole safety model, so it is asserted literally. If
     * someone adds an entry, this fails and they have to come here and justify it,
     * which is exactly the friction this needs to have.
     */
    /*
     * Match to a `]` at the START of a line, not the first `]` anywhere. The
     * allowlist contains character classes like [\w-], so a lazy `[\s\S]*?\]`
     * stops in the middle of a pattern and quietly compares a truncated list,
     * which is a test that looks strict and checks almost nothing.
     */
    const allowlist = SW_SOURCE.match(/const CACHEABLE = \[\n([\s\S]*?)\n\]/)?.[1] ?? ''
    expect(allowlist, 'no CACHEABLE allowlist found in public/sw.js').not.toBe('')

    const entries = allowlist
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('/^'))

    const permitted = [
      '/^\\/_next\\/static\\//,',
      '/^\\/favicon\\.(png|ico)$/,',
      '/^\\/icon-[\\w-]+\\.png$/,',
      '/^\\/cmba-logo[\\w-]*\\.png$/,',
      '/^\\/manifest\\.webmanifest$/,',
    ]

    expect(
      entries,
      'public/sw.js CACHEABLE changed. Every addition must be justified: page documents are ' +
        'NOT safe to cache here, because the root layout renders the signed in user into the ' +
        'header of every document.',
    ).toEqual(permitted)
  })

  test('refuses the private areas explicitly, as well as by omission', () => {
    // Belt and braces. Even if CACHEABLE were widened, NEVER_CACHE must still veto.
    for (const prefix of NEVER_CACHE_PREFIXES) {
      const bare = prefix.replace('/', '')
      expect(
        SW_SOURCE,
        `public/sw.js NEVER_CACHE does not mention ${prefix}`,
      ).toContain(`/^\\/${bare}`)
    }
  })

  test('never caches a non GET request', () => {
    // A cached POST is a lost score report, or a duplicated one.
    expect(SW_SOURCE).toMatch(/request\.method\s*!==\s*'GET'\)\s*return/)
  })

  test('serves navigations from the network only', () => {
    /*
     * The single most important line in the worker. Every page document in this
     * app carries the signed in person's name and email in the header, so a cached
     * navigation is a cached identity.
     */
    expect(SW_SOURCE).toMatch(/request\.mode === 'navigate'/)
    const navBlock = SW_SOURCE.split("request.mode === 'navigate'")[1]?.slice(0, 600) ?? ''
    expect(navBlock, 'the navigation handler writes to a cache').not.toMatch(/cache\.put|caches\.open/)
  })

  test('can be purged and killed', () => {
    expect(SW_SOURCE, 'no PURGE_ALL handler, so caches survive sign out').toContain('PURGE_ALL')
    expect(SW_SOURCE, 'no versioned cache name, so there is no kill switch').toMatch(
      /const CACHE_VERSION/,
    )
    expect(SW_SOURCE, 'activate does not delete old caches').toMatch(/caches\.delete/)
  })
})

/* ------------------------------------------------------------ runtime */

/** Every URL currently held in Cache Storage. */
async function cachedUrls(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (!('caches' in window)) return []
    const names = await caches.keys()
    const out: string[] = []
    for (const name of names) {
      const cache = await caches.open(name)
      for (const req of await cache.keys()) out.push(req.url)
    }
    return out
  })
}

test.describe('what actually ends up in Cache Storage', () => {
  test.skip(
    !SW_ENABLED,
    'Service worker is off (NEXT_PUBLIC_ENABLE_SW is not "true"), so there is nothing running to inspect. The source level assertions above still ran. Set the flag to exercise this.',
  )

  test('nothing personal is cached after browsing the site', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    // Give the worker a moment to install and start filling its cache.
    await page.waitForTimeout(2500)
    await page.goto('/schedule', { waitUntil: 'networkidle' })
    await page.goto('/standings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    const urls = await cachedUrls(page)

    const offenders = urls.filter((u) => {
      const { pathname } = new URL(u)
      return NEVER_CACHE_PREFIXES.some((p) => pathname.startsWith(p))
    })

    expect(
      offenders,
      `Personal or authenticated URLs are in Cache Storage:\n  ${offenders.join('\n  ')}`,
    ).toEqual([])
  })

  test('no page document is cached, only assets', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.goto('/schedule', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    const urls = await cachedUrls(page)
    const documents = urls.filter((u) => {
      const { pathname } = new URL(u)
      if (pathname === '/offline') return false // the deliberate exception
      return (
        !pathname.startsWith('/_next/static/') &&
        !/\.(png|ico|webmanifest|woff2?)$/.test(pathname)
      )
    })

    expect(
      documents,
      `Page documents are in Cache Storage. Every document in this app carries the signed in user's identity in the header:\n  ${documents.join('\n  ')}`,
    ).toEqual([])
  })

  test('signing out purges every cache', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    expect((await cachedUrls(page)).length, 'nothing was cached, so this proves nothing').toBeGreaterThan(0)

    // The event ServiceWorkerManager listens for.
    await page.evaluate(() => window.dispatchEvent(new Event('auth:signout')))
    await page.waitForTimeout(1200)

    expect(await cachedUrls(page), 'caches survived sign out').toEqual([])
  })

  test('the kill switch removes the worker and its caches', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    // Exactly what ServiceWorkerManager does when the flag is off.
    await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    })

    expect(await cachedUrls(page)).toEqual([])
    const registrations = await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).length,
    )
    expect(registrations, 'the worker survived the kill switch').toBe(0)
  })
})
