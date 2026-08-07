import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PUBLIC_ROUTES } from './routes'

/*
 * Automated WCAG 2.2 AA scan over every publicly reachable route, run at a phone
 * viewport because that is the audience: a parent or coach standing in a gym on a
 * mid range phone.
 *
 * What this does and does not prove. axe catches roughly a third of WCAG issues.
 * It cannot judge whether alt text is meaningful, whether focus order makes
 * sense, or whether an error message is understandable. Those are the manual
 * passes recorded in docs/VERIFICATION.md. A green run here is a floor, not a
 * conformance claim.
 *
 * Baseline behaviour: docs/audit/axe-baseline.json records the violation ids that
 * existed when the audit started. A NEW violation id fails the run. An id already
 * in the baseline is reported but does not fail, so the suite can go green before
 * every legacy issue is fixed and still block regressions from day one.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

type Baseline = Record<string, string[]>

/*
 * Loaded lazily and tolerantly. A missing baseline file means "nothing is
 * forgiven", which is the correct posture once the audit is finished.
 */
async function loadBaseline(): Promise<Baseline> {
  try {
    const fs = await import('node:fs/promises')
    const raw = await fs.readFile(new URL('../docs/audit/axe-baseline.json', import.meta.url), 'utf8')
    return JSON.parse(raw) as Baseline
  } catch {
    return {}
  }
}

async function scan(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  // Give the page a beat to settle before scanning.
  await page.waitForTimeout(600)
  return new AxeBuilder({ page }).withTags(TAGS).analyze()
}

test.describe('accessibility, phone viewport', () => {
  /*
   * reducedMotion is not a preference here, it is what makes this suite
   * deterministic.
   *
   * The site's `.reveal` elements start at opacity 0 and fade in over 0.8s. axe
   * computes contrast against whatever opacity the element currently has, so
   * scanning mid transition reports serious contrast failures on text that is
   * perfectly legible once it lands. That produced three flaky routes
   * (/game-report, /scan, /ref/quick-ref) whose results changed run to run.
   *
   * globals.css already forces `.reveal { opacity: 1 }` under
   * prefers-reduced-motion, so this scans the settled state: what the text
   * actually looks like when someone reads it, and exactly what a reduced motion
   * user sees the whole time.
   */
  test.use({
    viewport: { width: 390, height: 844 },
    // Under contextOptions, not at the top level: `use: { reducedMotion }` is not
    // a recognised option in this Playwright version, so it was accepted at
    // runtime and silently did nothing while the baseline script was applying it.
    // The two only agreed by luck until this was fixed.
    contextOptions: { reducedMotion: 'reduce' },
  })

  for (const route of PUBLIC_ROUTES) {
    test(`axe finds no new violations on ${route}`, async ({ page }) => {
      const baseline = await loadBaseline()
      const forgiven = new Set(baseline[route] ?? [])
      const results = await scan(page, route)

      const fresh = results.violations.filter((v) => !forgiven.has(v.id))
      const detail = fresh
        .map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`)
        .join('\n  ')

      expect(fresh, `New accessibility violations on ${route}:\n  ${detail}`).toEqual([])
    })
  }
})
