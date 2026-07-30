import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/*
 * Unit/integration tests only. Playwright specs live in e2e/ and run via
 * `npm run test:e2e`, so they are excluded here to keep `npm test` fast and green.
 *
 * Component tests (*.test.tsx) opt into a browser-like DOM per file with
 * `// @vitest-environment jsdom` on the first line, so the several hundred
 * pure-logic tests keep running in the faster node environment.
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
