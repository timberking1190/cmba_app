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

  /*
   * What a loading boundary does, and what it does NOT do, measured on this app.
   *
   * The obvious test to write here is "delay the navigation payload, assert the
   * skeleton appears". It was written, and it was wrong. Traced against a real
   * browser: clicking a link with the RSC payload held for 10s leaves the URL
   * unchanged and renders no boundary at all. Next 16 waits for the payload before
   * committing the navigation, so the user keeps looking at the page they were
   * already on.
   *
   * That is still not a blank screen, which is the actual requirement, and the
   * "failed navigation payload" test above covers it. But it does mean a
   * loading.tsx is NOT what protects a slow in-app navigation, and claiming
   * otherwise would be a claim this suite cannot support.
   *
   * What a loading.tsx genuinely does is stream a skeleton ahead of the content on
   * a COLD load, which is observable in the server's own HTML. That is what this
   * asserts.
   */
  test('a route with a loading boundary streams its skeleton ahead of the content', async ({
    request,
  }) => {
    const html = await (await request.get('/coach')).text()
    expect(html, '/coach did not stream a loading skeleton').toContain('aria-busy="true"')
  })

  test('the cold entry routes deliberately do not stream a skeleton', async ({ request }) => {
    /*
     * The other half of the same decision. A skeleton on these costs 300 to 550ms
     * of measured LCP and buys nothing, because the site chrome has already
     * painted by the time it would appear. If one ever reappears here, LCP will
     * regress and this is the test that says why.
     */
    for (const route of ['/schedule', '/standings', '/rules']) {
      const html = await (await request.get(route)).text()
      expect(html, `${route} started streaming a skeleton again`).not.toContain('aria-busy="true"')
    }
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
