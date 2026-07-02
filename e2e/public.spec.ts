import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/*
 * Public smoke + accessibility. Runs against the base URL with no login, so it works
 * on any preview or production deploy. Each main page must load and pass an axe
 * WCAG 2 A/AA scan with no serious or critical violations.
 *
 * Copy rule: no em or en dashes anywhere.
 */

const PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: '/', heading: /cmba|basketball|calgary/i },
  { path: '/schedule', heading: /schedule/i },
  { path: '/standings', heading: /standings/i },
  { path: '/rules', heading: /rules/i },
  { path: '/login', heading: /sign in|log in|login/i },
]

for (const p of PAGES) {
  test(`public page loads and is accessible: ${p.path}`, async ({ page }) => {
    const res = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    expect(res?.status(), `status for ${p.path}`).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious, `serious/critical a11y violations on ${p.path}: ${serious.map((v) => v.id).join(', ')}`).toEqual([])
  })
}

test('unknown URL shows the branded 404 with a way home', async ({ page }) => {
  await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /return home/i })).toBeVisible()
})
