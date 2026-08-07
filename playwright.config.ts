import { defineConfig, devices } from '@playwright/test'

/*
 * Minimal Playwright setup for the arcade end-to-end test. Boots the app (dev by
 * default; override with PW_WEBSERVER) and runs Chromium with software WebGL so the
 * three.js game mounts in headless CI. The spec intercepts the leaderboard API, so
 * it never writes to a real database.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    /*
     * Desktop project for the pre-existing suites (the arcade needs a GL context
     * and the scheduler console is a desktop admin screen).
     */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['a11y.spec.ts', 'mobile.spec.ts', 'resilience.spec.ts', 'cache-privacy.spec.ts'],
    },
    /*
     * Mobile project for the audit suites. Pixel 5 is a reasonable stand in for
     * the mid range Android this app is actually used on. hasTouch matters: some
     * assertions depend on the touch code path, not the mouse one.
     */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['a11y.spec.ts', 'mobile.spec.ts', 'resilience.spec.ts', 'cache-privacy.spec.ts'],
    },
  ],
  webServer: {
    command: process.env.PW_WEBSERVER || 'npm run dev',
    url: process.env.PW_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
