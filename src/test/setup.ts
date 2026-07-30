/*
 * Vitest setup. Only the DOM-flavoured pieces live here; files that run in the
 * default node environment are unaffected because the matchers and cleanup are
 * registered lazily, guarded on a document being present.
 */
import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  const [{ cleanup }, matchers] = await Promise.all([
    import('@testing-library/react'),
    import('@testing-library/jest-dom/matchers'),
  ])
  const { expect } = await import('vitest')
  expect.extend(matchers as never)
  afterEach(() => cleanup())
}
