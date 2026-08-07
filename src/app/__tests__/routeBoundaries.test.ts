/*
 * The test that would have caught the Phase 1 finding.
 *
 * The audit found 49 routes with zero error.tsx, zero loading.tsx and zero
 * global-error.tsx. Nothing in the test suite noticed, because nothing was
 * looking at the shape of the route tree. This does.
 *
 * It walks src/app for every page.tsx and asserts each one is covered by an error
 * boundary and a loading boundary at its own level or above, which is how the App
 * Router resolves them. Adding a new route without a boundary now fails the build
 * rather than shipping a blank screen to someone standing in a gym.
 */
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Every directory under src/app that contains a page.tsx. */
function findPageDirs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    if (entry === 'node_modules' || entry === '__tests__') continue
    if (existsSync(path.join(full, 'page.tsx'))) out.push(full)
    findPageDirs(full, out)
  }
  return out
}

/**
 * Walk up from a route directory to src/app looking for `file`. This mirrors how
 * Next.js resolves error.tsx and loading.tsx: the nearest one at or above the
 * segment wins, so a boundary on a parent legitimately covers its children.
 */
function coveredBy(routeDir: string, file: string): string | null {
  let cur = routeDir
  while (cur.startsWith(APP_DIR)) {
    if (existsSync(path.join(cur, file))) return cur
    if (cur === APP_DIR) break
    cur = path.dirname(cur)
  }
  return null
}

const rel = (p: string) => path.relative(APP_DIR, p) || '.'

/*
 * The Payload admin route group. Payload owns its own error and loading UI and we
 * do not add files into its generated tree, so it is excluded by design rather
 * than by omission.
 */
const EXCLUDED = ['(payload)']

const pageDirs = findPageDirs(APP_DIR).filter(
  (d) => !EXCLUDED.some((ex) => rel(d).split(path.sep).includes(ex)),
)

describe('App Router resilience boundaries', () => {
  it('finds the frontend routes at all, so a silent glob failure cannot make this suite pass vacuously', () => {
    expect(pageDirs.length).toBeGreaterThan(40)
  })

  it.each(pageDirs.map((d) => [rel(d), d] as const))(
    '%s is covered by an error boundary',
    (_name, dir) => {
      expect(coveredBy(dir, 'error.tsx')).not.toBeNull()
    },
  )

  /*
   * Loading boundaries are NOT required everywhere, and demanding them everywhere
   * is actively harmful. This was found the hard way during Phase 1.
   *
   * A loading.tsx makes its segment stream. Streaming flushes the HTTP status and
   * the shell BEFORE the page component finishes, so a later notFound() cannot
   * change the status any more. Adding a loading.tsx at the (frontend) group root
   * turned every dead public URL from a correct 404 into a 200 that merely looked
   * like a 404. Measured: 404 before, 200 after, back to 404 once removed.
   *
   * A 200 on a dead URL is not cosmetic. Search engines index it, uptime and error
   * monitoring stop seeing 404s, and a CDN can cache "found" for a page that is not.
   *
   * So the rule the app actually follows, and what the next two tests enforce:
   *   - every route has a loading boundary, UNLESS it or one of its descendants
   *     calls notFound(), in which case a correct status wins over a skeleton.
   */
  /*
   * The second exemption, and this one was measured rather than reasoned.
   *
   * These five are the cold entry routes: the page someone opens the site ON,
   * rather than navigates to from inside it. Putting a loading.tsx on them made
   * measured LCP WORSE, by 300 to 550ms each, and bought nothing:
   *
   *              baseline   with loading.tsx   without
   *   /schedule    3284ms        3842ms         3420ms
   *   /standings   3146ms        3716ms         3446ms
   *   /rules       3288ms        4026ms         3498ms
   *
   * The reason it buys nothing is that FCP is roughly 1065ms with or without the
   * skeleton. The root layout paints the header, nav and footer first either way,
   * so on a cold load the visitor is already looking at the site when the skeleton
   * would have appeared. All the skeleton adds is a second render pass that
   * delays the real content on a main thread that is already the bottleneck.
   *
   * Removing the animation from the skeleton was tried first and did not help
   * (3842 -> 3842 on /schedule), so the cost is the streaming itself, not the
   * skeleton's own paint.
   *
   * These routes are therefore left exactly as they were before this work: no
   * loading boundary, nothing lost. The other 28 routes, which are reached by
   * navigating inside the app, keep theirs.
   */
  const LCP_CRITICAL_NO_STREAM = ['(frontend)/schedule', '(frontend)/calendar', '(frontend)/standings', '(frontend)/rules', '(frontend)/login']

  const callsNotFound = (dir: string) => {
    const page = path.join(dir, 'page.tsx')
    return existsSync(page) && /\bnotFound\s*\(/.test(readFileSync(page, 'utf8'))
  }

  const notFoundDirs = pageDirs.filter(callsNotFound)

  /** Is `dir` at or above a route that calls notFound()? */
  const isAncestorOfNotFound = (dir: string) =>
    notFoundDirs.some((nf) => nf === dir || nf.startsWith(dir + path.sep))

  it('still has routes that call notFound(), so the exemption below is not silently empty', () => {
    expect(notFoundDirs.length).toBeGreaterThan(0)
  })

  const exempt = (dir: string) =>
    isAncestorOfNotFound(dir) || LCP_CRITICAL_NO_STREAM.includes(rel(dir).split(path.sep).join('/'))

  it.each(pageDirs.filter((d) => !exempt(d)).map((d) => [rel(d), d] as const))(
    '%s is covered by a loading boundary',
    (_name, dir) => {
      expect(coveredBy(dir, 'loading.tsx')).not.toBeNull()
    },
  )

  it.each(LCP_CRITICAL_NO_STREAM.map((r) => [r] as const))(
    '%s stays off the streaming path, so the LCP measurement above does not silently regress',
    (route) => {
      const dir = path.join(APP_DIR, route)
      expect(existsSync(path.join(dir, 'page.tsx')), `${route} no longer exists`).toBe(true)
      expect(coveredBy(dir, 'loading.tsx')).toBeNull()
    },
  )

  it.each(notFoundDirs.map((d) => [rel(d), d] as const))(
    '%s calls notFound(), so nothing above it may stream and destroy its 404 status',
    (_name, dir) => {
      const boundary = coveredBy(dir, 'loading.tsx')
      expect(
        boundary,
        boundary
          ? `A loading.tsx at ${rel(boundary)} makes this route stream, which flushes a 200 before notFound() can set 404.`
          : '',
      ).toBeNull()
    },
  )

  it('has a global-error boundary for failures in the root layout itself', () => {
    // A route level error.tsx renders INSIDE the root layout, so it cannot catch a
    // root layout that throws. Only global-error.tsx can, and it has to bring its
    // own <html> and <body>.
    expect(existsSync(path.join(APP_DIR, 'global-error.tsx'))).toBe(true)
  })

  it('has a not-found boundary for the public site, not only for the Payload admin', () => {
    const frontendNotFound = path.join(APP_DIR, '(frontend)', 'not-found.tsx')
    expect(existsSync(frontendNotFound)).toBe(true)
  })
})
