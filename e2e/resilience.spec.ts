import { test, expect, type Page } from '@playwright/test'
import { PUBLIC_ROUTES } from './routes'

/*
 * The adversarial matrix from the module brief, for the parts that can genuinely
 * be automated.
 *
 * A note on what is and is not testable here, because the difference matters and
 * pretending otherwise would make this suite look stronger than it is. This app
 * renders on the server, so a server side fetch failure cannot be induced from
 * the browser. What CAN be induced, and is what a real user on gym wifi actually
 * hits, is a failure of the client side navigation payload: App Router fetches an
 * RSC payload on every in-app navigation, and failing that is exactly the
 * "connection dropped mid session" case. That is what these specs force.
 *
 * The server side path is covered instead by src/app/__tests__/routeBoundaries.test.ts,
 * which asserts every route resolves to an error boundary at all.
 */

const RSC = /_rsc=/

/** Does the page show a human anything at all, or is it a blank screen? */
async function visibleText(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).trim()
}

test.describe('never a blank screen', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders something a person can read`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response?.status(), `${route} did not return a success status`).toBeLessThan(400)

      const text = await visibleText(page)
      expect(text.length, `${route} rendered a blank screen`).toBeGreaterThan(40)

      // A heading is the difference between "content arrived" and "the chrome
      // rendered and the page body did not".
      await expect(page.locator('h1, h2').first()).toBeVisible()
    })
  }
})

test.describe('a dropped connection mid session', () => {
  test('a failed navigation payload shows the error state, not nothing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Break every subsequent client side navigation.
    await page.route(RSC, (r) => r.fulfill({ status: 500, body: 'boom' }))

    // Navigate through the app rather than by URL, so the RSC path is used.
    await page.getByRole('link', { name: /schedule/i }).first().click()

    // Either the error boundary renders, or the navigation is refused and we stay
    // put. Both are acceptable. A blank screen is not.
    await expect
      .poll(async () => (await visibleText(page)).length, { timeout: 15_000 })
      .toBeGreaterThan(40)
  })

  test('a slow route shows a loading skeleton rather than a frozen page', async ({ page }) => {
    /*
     * The delay has to be installed BEFORE the first page load, not after it.
     * Next prefetches the RSC payload for every Link in the viewport, so by the
     * time a test clicks one the payload is already cached and the navigation
     * completes instantly with no loading state to observe. Intercepting from the
     * start means the prefetch is slow too, so the click has nothing cached to
     * fall back on. This cost a debugging round and is worth writing down.
     */
    await page.route(RSC, async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 10_000))
      await r.abort()
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    /*
     * /coach, not /schedule or /standings. The five cold entry routes deliberately
     * have no loading boundary: measured, a skeleton there costs 300 to 550ms of
     * LCP and buys nothing, because the site chrome has already painted by then.
     * See the reasoning in src/app/__tests__/routeBoundaries.test.ts. /coach is
     * reached by navigating inside the app, which is exactly where a skeleton
     * earns its place, so it keeps one.
     */
    await page.getByRole('link', { name: /coach/i }).first().click()

    // The skeleton announces itself as busy; that is the assertion, because it is
    // also what a screen reader depends on.
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('404', () => {
  test('a dead URL gets the not-found state and a way home', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist-9f3a', {
      waitUntil: 'domcontentloaded',
    })
    expect(res?.status()).toBe(404)

    await expect(page.getByText(/could not find that page/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /home page/i })).toBeVisible()

    // No retry button: reloading a 404 produces the same 404, and an action that
    // cannot work is worse than no action.
    await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0)
  })
})
