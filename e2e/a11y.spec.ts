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

/* ------------------------------------------------------- reduced motion */

test.describe('reduced motion is honoured', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' }, viewport: { width: 390, height: 844 } })

  /*
   * The brief asks for confirmation that reduced motion is honoured "everywhere:
   * marquee, reveals, 3D, cursor, arcade". globals.css has a
   * prefers-reduced-motion block, but a rule existing is not the same as it
   * winning, so this reads the computed values.
   */
  test('the marquee is not animating', async ({ page }) => {
    await page.goto('/')
    const track = page.locator('.marq-track').first()
    await expect(track).toBeVisible()
    // `animation: none !important` in the reduced-motion block.
    const name = await track.evaluate((el) => getComputedStyle(el).animationName)
    expect(name, 'the marquee still animates under prefers-reduced-motion').toBe('none')
  })

  test('reveals are fully visible rather than waiting to animate', async ({ page }) => {
    await page.goto('/coach', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)
    const opacities = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal')].map((el) => parseFloat(getComputedStyle(el).opacity)),
    )
    expect(opacities.length).toBeGreaterThan(0)
    expect(Math.min(...opacities), 'a reveal is still hidden under reduced motion').toBe(1)
  })

  test('the intro counter overlay is skipped entirely', async ({ page }) => {
    // GlobalFX checks prefers-reduced-motion and sets introDone immediately. If it
    // ever stops doing that, a reduced-motion user gets a full screen counter.
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.intro')).toHaveCount(0)
  })

  test('the custom cursor is not used on a touch device', async ({ page }) => {
    // `body { cursor: none }` is scoped to hover + fine pointer. On a phone it
    // would hide the cursor for anyone using a paired mouse or switch device.
    await page.goto('/')
    const cursor = await page.evaluate(() => getComputedStyle(document.body).cursor)
    expect(cursor).not.toBe('none')
  })
})

/* ------------------------------------------------------------ keyboard */

test.describe('keyboard only', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('tabbing reaches the primary navigation with a visible focus ring', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)

    const focused: string[] = []
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      focused.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null
          if (!el || el === document.body) return 'none'
          const style = getComputedStyle(el)
          // WCAG 2.2 SC 2.4.11: focus must be visible AND not obscured. An
          // outline of 0 with no other indicator is the classic failure.
          const hasRing =
            (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== 'none'
          return `${el.tagName.toLowerCase()}:${hasRing ? 'ring' : 'NO-RING'}`
        }),
      )
    }

    const reached = focused.filter((f) => f !== 'none')
    expect(reached.length, 'tabbing did not reach anything focusable').toBeGreaterThan(3)
    expect(
      reached.filter((f) => f.endsWith('NO-RING')),
      `focusable elements with no visible focus indicator: ${reached.join(', ')}`,
    ).toEqual([])
  })

  test('the sign in form can be completed without a mouse', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    const email = page.locator('input[type="email"]').first()
    await email.focus()
    await page.keyboard.type('parent@example.com')
    await page.keyboard.press('Tab')

    // enterKeyHint="next" on the email field promises the keyboard moves on; this
    // checks the tab order actually delivers that.
    const nextType = await page.evaluate(
      () => (document.activeElement as HTMLInputElement | null)?.type,
    )
    expect(nextType, 'tab from email did not land on the password field').toBe('password')
  })
})
