import { defineConfig } from 'vitest/config'

/*
 * Unit and integration tests only (Vitest). End-to-end specs live in e2e/ and run
 * under Playwright, so they are excluded here to keep the two runners separate.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'e2e', '.next', 'dist'],
  },
})
