import { defineConfig } from 'vitest/config'

// Unit/integration tests only. Playwright specs live in e2e/ and run via
// `npm run test:e2e`, so they are excluded here to keep `npm test` fast and green.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**', 'dist/**'],
  },
})
