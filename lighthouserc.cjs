/*
 * Lighthouse CI mobile performance budget for CMBA Connect. Runs on mobile emulation
 * (Lighthouse default) against the heaviest public routes, including the home page
 * that ships the WebGL fluid background and the lazy-loaded 3D basketball, so the 3D
 * route is held to the budget.
 *
 * Target URL comes from LHCI_BASE_URL (a preview or production deploy), defaulting to
 * a local server. See e2e/README.md.
 *
 * Copy rule: no em or en dashes anywhere.
 */
const base = (process.env.LHCI_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

module.exports = {
  ci: {
    collect: {
      url: [`${base}/`, `${base}/schedule`, `${base}/standings`],
      numberOfRuns: 2,
    },
    assert: {
      assertions: {
        // Accessibility is a hard gate; performance is a budget we watch (3D is heavy
        // on a mid-range phone, so the score is a warning while the concrete first
        // load and main-thread budgets below are enforced).
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        // First load and main-thread work ceilings (mobile).
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4500 }],
        'total-blocking-time': ['error', { maxNumericValue: 800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['warn', { maxNumericValue: 6000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
