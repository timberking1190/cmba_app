/*
 * Test-only stand in for the `server-only` package.
 *
 * That package deliberately resolves to a module that throws when it is pulled
 * into a client build, which is exactly what we want in the app and exactly what
 * we do not want under Vitest: the node test environment looks like a client build
 * to it, so importing any server module from a test fails before a single
 * assertion runs. Aliasing it to nothing lets server-side modules be unit tested
 * while the real guard stays in place for the actual bundle.
 */
export {}
