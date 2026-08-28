import { test, expect, type Page, type Locator } from '@playwright/test'

/*
 * First paint regression harness.
 *
 * These tests exist because of a defect that every existing check walked straight
 * past: /login rendered as an almost empty red page, and the entire sign in form
 * only appeared once the user scrolled. `.reveal { opacity: 0 }` in the stylesheet
 * hid it, and an IntersectionObserver that could only run after hydration was the
 * only thing that could bring it back.
 *
 * The reason the existing public smoke suite missed it matters for how these tests
 * are written. Playwright's toBeVisible() checks layout, not paint: an element with
 * opacity 0 still has a box, so it counts as visible. Every assertion below
 * therefore measures EFFECTIVE OPACITY, walking up the ancestor chain, because that
 * is what decides whether a human can actually read the thing.
 *
 * Three properties are enforced on every public route:
 *
 *  1. With JavaScript disabled entirely, the primary heading and the primary
 *     control are painted. Content may be enhanced by script; it may not depend on
 *     script to become visible.
 *  2. On first paint with no scrolling, the primary heading and the primary call to
 *     action are inside the viewport and painted.
 *  3. The document never scrolls horizontally.
 *
 * Copy rule: no em or en dashes anywhere.
 */

/*
 * Effective opacity, ancestors included. A parent at opacity 0 hides its children
 * no matter what the child's own computed style says, which is exactly the shape of
 * the bug this file guards against.
 */
async function effectiveOpacity(target: Locator): Promise<number> {
  return target.evaluate((node) => {
    let opacity = 1
    let el: Element | null = node as Element
    while (el && el !== document.documentElement) {
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') return 0
      opacity *= Number.parseFloat(style.opacity || '1')
      el = el.parentElement
    }
    return opacity
  })
}

async function expectPainted(target: Locator, what: string) {
  await expect(target, `${what} should be attached`).toBeAttached()
  const opacity = await effectiveOpacity(target)
  expect(opacity, `${what} effective opacity (1 means fully painted)`).toBeGreaterThan(0.99)
  const box = await target.boundingBox()
  expect(box, `${what} should have a layout box`).not.toBeNull()
  expect(box!.width, `${what} width`).toBeGreaterThan(0)
  expect(box!.height, `${what} height`).toBeGreaterThan(0)
}

async function expectAboveTheFold(page: Page, target: Locator, what: string) {
  await expectPainted(target, what)
  const viewport = page.viewportSize()
  const box = (await target.boundingBox())!
  const scrollY = await page.evaluate(() => window.scrollY)
  expect(scrollY, 'the page must not have scrolled on its own').toBe(0)
  expect(
    box.y,
    `${what} top edge must be inside the first screen (viewport height ${viewport?.height})`,
  ).toBeLessThan(viewport!.height)
  expect(box.y, `${what} must not sit above the viewport`).toBeGreaterThanOrEqual(0)
}

type Route = {
  path: string
  name: string
  heading: RegExp
  /* The one thing the visitor came to this page to do. */
  cta: (page: Page) => Locator
  ctaName: string
}

const ROUTES: Route[] = [
  {
    path: '/',
    name: 'homepage',
    heading: /every athlete/i,
    cta: (page) => page.getByRole('link', { name: /^schedule$/i }).first(),
    ctaName: 'Schedule nav link',
  },
  {
    path: '/schedule',
    name: 'schedule',
    heading: /schedule/i,
    cta: (page) => page.locator('main a, main button').first(),
    ctaName: 'first control in main',
  },
  {
    path: '/standings',
    name: 'standings',
    heading: /standings/i,
    cta: (page) => page.locator('main a, main button').first(),
    ctaName: 'first control in main',
  },
  {
    path: '/game-report',
    name: 'game report',
    heading: /game report/i,
    cta: (page) => page.getByRole('button', { name: /concern/i }).first(),
    ctaName: 'Concern button',
  },
  {
    path: '/login',
    name: 'login',
    heading: /cmba account|account/i,
    cta: (page) => page.locator('input[type="email"]').first(),
    ctaName: 'email field',
  },
  {
    path: '/this-page-does-not-exist-xyz',
    name: '404',
    heading: /page not found/i,
    cta: (page) => page.getByRole('link', { name: /return home/i }).first(),
    ctaName: 'Return home link',
  },
]

for (const route of ROUTES) {
  /*
   * Defect 1 regression: HTML plus CSS, with no JavaScript, must be readable.
   *
   * This cannot be done by simply disabling JavaScript and navigating. The root
   * layout reads the CSP nonce, which forces dynamic rendering, so Next streams the
   * page: the shell arrives first and the real content arrives later in a hidden
   * container that an inline script moves into place. With script off that move
   * never happens and <main> is empty, for every route, on any branch. That is a
   * property of streaming SSR, not the defect under test, and asserting against it
   * would only produce a test that can never pass.
   *
   * So the page is assembled once with script enabled, the classes the observer
   * adds are stripped to restore the no-script starting state, and that exact
   * markup is replayed into a context with JavaScript disabled. The stylesheet is
   * still fetched from the real server, so CSS alone decides what is visible, which
   * is precisely the contract that was broken: `.reveal { opacity: 0 }` waiting on
   * an observer that no longer had any way to run.
   */
  test(`renders with HTML and CSS alone, no JavaScript: ${route.name}`, async ({ browser, baseURL }, testInfo) => {
    const projectUse = testInfo.project.use as Record<string, unknown>
    const url = new URL(route.path, baseURL).toString()

    const warm = await browser.newContext(projectUse)
    let assembled: string
    try {
      const warmPage = await warm.newPage()
      await warmPage.goto(url, { waitUntil: 'load' })
      await warmPage.getByRole('heading', { name: route.heading }).first().waitFor()
      // Restore the pre-script state: drop whatever GlobalFX added.
      await warmPage.evaluate(() => {
        document.querySelectorAll('.reveal, .reveal-armed').forEach((el) => {
          el.classList.remove('in', 'reveal-armed')
        })
      })
      assembled = await warmPage.content()
    } finally {
      await warm.close()
    }

    const context = await browser.newContext({ ...projectUse, javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      await page.route(url, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: assembled }))
      await page.goto(url, { waitUntil: 'load' })
      await expectPainted(
        page.getByRole('heading', { name: route.heading }).first(),
        `${route.name} heading with no JavaScript`,
      )
      await expectPainted(route.cta(page), `${route.name} ${route.ctaName} with no JavaScript`)
    } finally {
      await context.close()
    }
  })

  /*
   * Defect 1 regression, the version a real visitor experiences: script runs, but
   * they have not scrolled yet. Nothing on the first screen may be waiting on a
   * scroll that has not happened.
   */
  test(`primary heading and call to action are painted above the fold: ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'load' })
    await expectAboveTheFold(
      page,
      page.getByRole('heading', { name: route.heading }).first(),
      `${route.name} heading`,
    )
    await expectAboveTheFold(page, route.cta(page), `${route.name} ${route.ctaName}`)
  })

  test(`does not scroll horizontally: ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'load' })
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    // One pixel of slack absorbs sub-pixel rounding on fractional device ratios.
    expect(
      overflow.scrollWidth,
      `${route.name} document scrollWidth ${overflow.scrollWidth} exceeds viewport ${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
}

/*
 * Reduced motion must skip the animation, not hide the content. The failure mode
 * being guarded against is a reduced motion path that removes the transition while
 * leaving the opacity 0 starting state in place.
 */
test('reduced motion leaves every reveal painted', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    ...(testInfo.project.use as Record<string, unknown>),
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  try {
    await page.goto('/login', { waitUntil: 'load' })
    const faded = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.reveal')).filter(
        (el) => Number.parseFloat(getComputedStyle(el).opacity || '1') < 0.99,
      ).length,
    )
    expect(faded, 'reveal elements left faded under prefers-reduced-motion').toBe(0)
  } finally {
    await context.close()
  }
})
