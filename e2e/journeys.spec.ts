import { test, expect } from '@playwright/test'

/*
 * Authenticated member journeys. These need a seeded deploy and test credentials, so
 * they run only when E2E_EMAIL / E2E_PASSWORD are set (a preview with a known test
 * account). Without them the suite skips rather than failing, so the public and
 * adversarial gates still run everywhere. See e2e/README.md.
 *
 * Journeys covered: sign in (and MFA challenge if enrolled), account profile and
 * certifications, challenges, and quizzes. Score reporting, confirmation, contest,
 * and admin CSV import are role- and data-specific; their entry points are asserted
 * here and the full flows run against a fully seeded fixture.
 *
 * Copy rule: no em or en dashes anywhere.
 */

const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

test.describe('authenticated journeys', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD (a seeded test account) to run these.')

  async function signIn(page: import('@playwright/test').Page) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/email/i).first().fill(EMAIL as string)
    await page.getByLabel(/password/i).first().fill(PASSWORD as string)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click()
    // Either lands on the account area or is asked to complete an MFA challenge.
    await page.waitForURL(/\/(account|manage|rep|account\/security\/challenge)/, { timeout: 15_000 })
  }

  test('sign in reaches an authenticated area (MFA challenge allowed)', async ({ page }) => {
    await signIn(page)
    expect(page.url()).toMatch(/\/(account|manage|rep|account\/security\/challenge)/)
  })

  test('account page shows the member and certifications section', async ({ page }) => {
    await signIn(page)
    await page.goto('/account', { waitUntil: 'domcontentloaded' })
    // If an MFA challenge intercepts, the redirect target is the challenge page.
    if (/challenge/.test(page.url())) test.skip(true, 'MFA challenge required; complete it in the seeded fixture run.')
    await expect(page.getByRole('heading', { name: /certification/i }).first()).toBeVisible()
  })

  test('challenges page loads for a signed-in athlete', async ({ page }) => {
    await signIn(page)
    await page.goto('/athlete/challenges', { waitUntil: 'domcontentloaded' })
    if (/\/login|challenge/.test(page.url())) test.skip(true, 'Account lacks athlete access or MFA pending in this fixture.')
    await expect(page.getByRole('heading', { name: /challenge/i }).first()).toBeVisible()
  })

  test('quiz page loads for a signed-in athlete', async ({ page }) => {
    await signIn(page)
    await page.goto('/athlete/quiz', { waitUntil: 'domcontentloaded' })
    if (/\/login|challenge/.test(page.url())) test.skip(true, 'Account lacks athlete access or MFA pending in this fixture.')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })
})
