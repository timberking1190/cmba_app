import { defineConfig, devices } from '@playwright/test'

/*
 * Playwright end-to-end tests for CMBA Connect. Tests run against a base URL:
 *   - CI / preview: set PLAYWRIGHT_BASE_URL to a Vercel preview or production URL.
 *   - Local: start the app yourself (npm run build && npm run start with a test
 *     database) and leave the default http://localhost:3000.
 *
 * We do not auto-start a webServer by default, because the app needs a database and
 * env to boot; pointing at an already-running deploy keeps the harness simple and
 * safe (it never runs against a machine that happens to have production env loaded).
 * Set PW_WEBSERVER to opt in to booting the app locally, which is how the arcade
 * spec is normally run on a developer machine.
 *
 * Public smoke, accessibility (axe), and the adversarial HTTP checks run anywhere.
 * The authenticated member journeys are guarded and skip unless E2E test credentials
 * are provided (see e2e/README.md).
 *
 * The swiftshader launch flags are required by the arcade spec, whose three.js scene
 * needs software WebGL to mount headless. They are inert for every other spec.
 *
 * Execution is SERIAL (fullyParallel false, one worker), which is main's setting
 * rather than the launch-readiness branch's fullyParallel true. That is deliberate:
 * this merge is the first tree to hold both suites, and e2e/scheduler.spec.ts states
 * outright that "these tests share a database and mutate it, so the first row is not
 * stable across the suite". Running it concurrently with itself or with the arcade
 * spec would race that shared database. The suite is small enough that serial costs
 * little; revisit per project once each spec is confirmed side-effect free.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.PW_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  ...(process.env.PW_WEBSERVER
    ? {
        webServer: {
          command: process.env.PW_WEBSERVER,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 240_000,
        },
      }
    : {}),
})
