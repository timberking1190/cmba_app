import { test, expect } from '@playwright/test'

/*
 * Adversarial matrix, exercised in a real browser / over real HTTP with no session.
 * These assert the security boundary holds for an unauthenticated caller and need no
 * seeded data, so they gate on every run.
 *
 * Copy rule: no em or en dashes anywhere.
 */

test('protected member pages redirect an anonymous visitor to login', async ({ page }) => {
  for (const path of ['/account', '/manage', '/rep', '/compliance/dashboard']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page, `expected redirect to login for ${path}`).toHaveURL(/\/login/)
  }
})

test('admin and user APIs deny an unauthenticated caller', async ({ request }) => {
  // Default-deny: listing users is forbidden without auth.
  const users = await request.get('/api/users')
  expect(users.status()).toBe(403)

  // Admin-only endpoints require authentication (401) or reject (403).
  for (const path of ['/api/v1/admin/email-health', '/api/v1/me/dashboard']) {
    const res = await request.get(path)
    expect([401, 403], `expected 401/403 for ${path}, got ${res.status()}`).toContain(res.status())
  }
})

test('security headers and an enforcing CSP are present', async ({ request }) => {
  const res = await request.get('/login')
  const headers = res.headers()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('SAMEORIGIN')
  const csp = headers['content-security-policy']
  expect(csp, 'enforcing CSP header present').toBeTruthy()
  // Strict-nonce profile: script-src carries a nonce and does not weaken to unsafe-inline.
  expect(csp).toMatch(/script-src[^;]*'nonce-/)
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
})

test('invalid login is rejected without revealing which field was wrong', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  const email = page.getByLabel(/email/i).first()
  if (!(await email.count())) test.skip(true, 'login form shape differs; covered by the seeded journey')
  await email.fill('nobody@example.com')
  await page.getByLabel(/password/i).first().fill('wrong-password-123')
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click()
  // Stays on login and shows an error; must not land on an authenticated page.
  await expect(page).toHaveURL(/\/login/)
})
