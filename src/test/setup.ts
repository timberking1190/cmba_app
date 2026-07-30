/*
 * Vitest setup. Only the DOM-flavoured pieces live here; files that run in the
 * default node environment are unaffected because the matchers and cleanup are
 * registered lazily, guarded on a document being present.
 */
import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  const [{ cleanup, configure }, matchers] = await Promise.all([
    import('@testing-library/react'),
    import('@testing-library/jest-dom/matchers'),
  ])
  const { expect } = await import('vitest')
  expect.extend(matchers as never)
  // The default 1s waitFor budget is tight when the whole suite compiles at once,
  // which made component tests flake on a cold run. Waiting longer costs nothing
  // when the assertion passes immediately.
  configure({ asyncUtilTimeout: 5000 })
  afterEach(() => cleanup())
}
