/*
 * Capture the mobile audit baseline.
 *
 * Walks every public route with a throttled phone profile and records what the
 * browser actually downloads, plus the axe violations on the page. Writes
 * docs/audit/baseline.json (machine readable, the thing CI compares against) and
 * docs/audit/axe-baseline.json (the forgiven violation ids the a11y suite reads).
 *
 * These are LAB numbers. The app has no real user monitoring, so nothing here is
 * a field measurement and none of it should be reported as one.
 *
 * Usage:
 *   npm run build && npm start &
 *   node scripts/audit/capture-baseline.mjs
 *
 * Env:
 *   AUDIT_BASE_URL   default http://localhost:3000
 *   AUDIT_ROUTES     comma separated override of the route list
 */

import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:3000'

// Kept in step with e2e/routes.ts. Duplicated rather than imported because that
// file is TypeScript and this script runs under plain node.
const ROUTES = (process.env.AUDIT_ROUTES?.split(',') ?? [
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
]).map((r) => r.trim())

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

/** Pixel 5 sized, which is a fair mid range Android stand in. */
const VIEWPORT = { width: 393, height: 851 }

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10
}

async function measure(context, route) {
  const page = await context.newPage()

  // Sum what actually came down the wire, per resource type. encodedBodySize is
  // the compressed size, which is what a phone on gym wifi actually pays for.
  const bytes = { script: 0, stylesheet: 0, image: 0, font: 0, document: 0, other: 0 }
  const counts = { script: 0, stylesheet: 0, image: 0, font: 0, document: 0, other: 0 }

  page.on('response', async (res) => {
    try {
      const type = res.request().resourceType()
      const bucket = bytes[type] !== undefined ? type : 'other'
      const len = Number(res.headers()['content-length'] ?? 0)
      const size = len || (await res.body().then((b) => b.byteLength).catch(() => 0))
      bytes[bucket] += size
      counts[bucket] += 1
    } catch {
      /* a response can be gone by the time we ask; not worth failing the run */
    }
  })

  let status = 0
  let error = null
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 })
    status = resp?.status() ?? 0
  } catch (e) {
    error = String(e).split('\n')[0]
  }

  // Web vitals the page can self report. LCP and CLS come from PerformanceObserver
  // so they are the browser's own numbers, not a stopwatch.
  const vitals = await page
    .evaluate(async () => {
      const out = { lcp: null, cls: 0, ttfb: null, domContentLoaded: null }
      const nav = performance.getEntriesByType('navigation')[0]
      if (nav) {
        out.ttfb = Math.round(nav.responseStart)
        out.domContentLoaded = Math.round(nav.domContentLoadedEventEnd)
      }
      await new Promise((resolve) => {
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) out.lcp = Math.round(entry.startTime)
          }).observe({ type: 'largest-contentful-paint', buffered: true })
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) out.cls += entry.value
            }
          }).observe({ type: 'layout-shift', buffered: true })
        } catch {
          /* older engines; leave the nulls */
        }
        setTimeout(resolve, 1200)
      })
      out.cls = Math.round(out.cls * 1000) / 1000
      return out
    })
    .catch(() => ({ lcp: null, cls: null, ttfb: null, domContentLoaded: null }))

  // Horizontal overflow: the single most common mobile layout defect.
  const overflow = await page
    .evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    .catch(() => null)

  let axe = { violationCount: 0, ids: [], byImpact: {} }
  if (!error) {
    try {
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
      const byImpact = {}
      for (const v of results.violations) {
        byImpact[v.impact ?? 'unknown'] = (byImpact[v.impact ?? 'unknown'] ?? 0) + v.nodes.length
      }
      axe = {
        violationCount: results.violations.length,
        nodeCount: results.violations.reduce((n, v) => n + v.nodes.length, 0),
        ids: results.violations.map((v) => v.id).sort(),
        byImpact,
      }
    } catch (e) {
      axe = { violationCount: -1, ids: [], byImpact: {}, error: String(e).split('\n')[0] }
    }
  }

  await page.close()

  const totalBytes = Object.values(bytes).reduce((a, b) => a + b, 0)
  return {
    route,
    status,
    error,
    transferKb: {
      total: kb(totalBytes),
      script: kb(bytes.script),
      stylesheet: kb(bytes.stylesheet),
      image: kb(bytes.image),
      font: kb(bytes.font),
      document: kb(bytes.document),
      other: kb(bytes.other),
    },
    requestCounts: counts,
    vitals,
    overflow: overflow ? { ...overflow, overflows: overflow.scrollWidth > overflow.clientWidth } : null,
    axe,
  }
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  })

  const results = []
  for (const route of ROUTES) {
    process.stdout.write(`  ${route} ... `)
    const r = await measure(context, route)
    results.push(r)
    process.stdout.write(
      r.error
        ? `FAILED (${r.error})\n`
        : `${r.status}  js ${r.transferKb.script}kB  total ${r.transferKb.total}kB  lcp ${r.vitals.lcp ?? '?'}ms  cls ${r.vitals.cls ?? '?'}  axe ${r.axe.violationCount}\n`,
    )
  }

  await browser.close()

  const baseline = {
    capturedAt: process.env.AUDIT_CAPTURED_AT || new Date().toISOString(),
    baseUrl: BASE,
    note: 'Lab numbers from a throttled headless Chromium at a Pixel 5 viewport. Not field data. This app has no RUM, so no 75th percentile real user claim can be made from these.',
    profile: { viewport: VIEWPORT, deviceScaleFactor: 2.75, isMobile: true },
    routes: results,
  }

  await mkdir(path.join(ROOT, 'docs', 'audit'), { recursive: true })
  await writeFile(
    path.join(ROOT, 'docs', 'audit', 'baseline.json'),
    JSON.stringify(baseline, null, 2) + '\n',
  )

  // The forgiven-violations map the a11y suite reads.
  const axeBaseline = {}
  for (const r of results) {
    if (r.axe.ids?.length) axeBaseline[r.route] = r.axe.ids
  }
  await writeFile(
    path.join(ROOT, 'docs', 'audit', 'axe-baseline.json'),
    JSON.stringify(axeBaseline, null, 2) + '\n',
  )

  const failed = results.filter((r) => r.error || r.status >= 400)
  const overflowing = results.filter((r) => r.overflow?.overflows)
  const totalAxe = results.reduce((n, r) => n + Math.max(0, r.axe.violationCount), 0)
  console.log(
    `\nWrote docs/audit/baseline.json — ${results.length} routes, ${failed.length} failed, ` +
      `${overflowing.length} overflowing horizontally, ${totalAxe} axe violation types total.`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
