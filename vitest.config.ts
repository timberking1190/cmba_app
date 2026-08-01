import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/*
 * Unit/integration tests only. Playwright specs live in e2e/ and run via
 * `npm run test:e2e`, so they are excluded here to keep `npm test` fast and green.
 *
 * Component tests (*.test.tsx) opt into a browser-like DOM per file with
 * `// @vitest-environment happy-dom` on the first line, so the several hundred
 * pure-logic tests keep running in the faster node environment.
 *
 * happy-dom rather than jsdom deliberately: jsdom bundles a copy of undici that
 * needs a newer Node than this project's CI pins (Node 20), and fails there with
 * "webidl.util.markAsUncloneable is not a function". happy-dom has no such
 * dependency, and is lighter.
 */
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
