# End-to-end, accessibility, and performance tests

Playwright drives the browser-level tests; axe-core runs the accessibility scans;
Lighthouse CI holds the mobile performance budget. They run against a base URL rather
than starting the app, because the app needs a database and env to boot. Point them
at a preview or a locally started server.

## What runs where

- `e2e/public.spec.ts` : loads the main public pages and runs an axe WCAG 2 A/AA scan
  on each (no serious or critical violations), plus the branded 404. Runs anywhere.
- `e2e/security.spec.ts` : the adversarial matrix for an anonymous caller (protected
  pages redirect to login, admin/user APIs deny, enforcing strict-nonce CSP and
  security headers present, invalid login rejected). Runs anywhere.
- `e2e/journeys.spec.ts` : authenticated member journeys (sign in and MFA challenge,
  account and certifications, challenges, quizzes). Skips unless `E2E_EMAIL` and
  `E2E_PASSWORD` for a seeded test account are set.

## Run locally

Start the app against a NON-production database, then:

```bash
npx playwright install --with-deps chromium
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
LHCI_BASE_URL=http://localhost:3000 npm run lhci
```

To include the authenticated journeys, also export `E2E_EMAIL` and `E2E_PASSWORD`
for a seeded test account. MFA: if the account is enrolled, those journeys detect the
challenge and skip the post-login assertions (WebAuthn cannot be driven from a normal
browser context); run the challenge steps against a TOTP or recovery-code fixture.

## CI

`.github/workflows/e2e.yml` runs Playwright + Lighthouse against `E2E_BASE_URL` (a
repo variable pointing at a Vercel preview or production), or against a URL passed to
a manual `workflow_dispatch`. Until `E2E_BASE_URL` is set the job is a no-op so it
never blocks unrelated PRs; setting it turns the gate on. Enabling Vercel preview
deploys and setting `E2E_BASE_URL` is the operator step that activates this gate
(see docs/OPERATOR_ACTIONS.md).

Copy rule: no em or en dashes anywhere.
