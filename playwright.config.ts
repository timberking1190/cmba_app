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
 * Copy rule: no em or en dashes anywhere.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.PW_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
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
