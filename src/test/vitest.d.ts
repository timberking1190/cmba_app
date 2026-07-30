/*
 * Bring the jest-dom matchers (toBeInTheDocument and friends) into the vitest
 * Assertion type so component tests typecheck. Registered at runtime in setup.ts.
 */
import 'vitest'
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<T = unknown> extends TestingLibraryMatchers<T, void> {}
}
