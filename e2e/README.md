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
never blocks unrelated PRs; setting it turns the gate on.

### Setting E2E_BASE_URL alone will NOT work

This is the part that is easy to get wrong, and it fails in a way that looks like the
application is broken rather than like a misconfiguration.

Vercel deployment protection is enabled on this project in `all_except_custom_domains`
mode, so preview deployments answer an anonymous request with a 302 to
`vercel.com/sso-api`. Playwright then fails every spec on a redirect, and Lighthouse
cheerfully measures the SSO interstitial and reports a good score for a page that is
not the app.

Both tools are already wired for the fix. The remaining work is two operator steps:

1. In the Vercel project, Settings, Deployment Protection, generate a
   **Protection Bypass for Automation** secret.
2. In GitHub, Settings, Secrets and variables, Actions, add it as the repository
   secret **`VERCEL_AUTOMATION_BYPASS_SECRET`**, and set the repository variable
   **`E2E_BASE_URL`** to a preview URL.

`playwright.config.ts` sends `x-vercel-protection-bypass` plus
`x-vercel-set-bypass-cookie` (the cookie is what makes the bypass survive in-browser
navigation, not just the first request), and `lighthouserc.cjs` sends the same bypass
header. Both attach the headers only when the secret is present, so local runs against
`localhost` are unaffected. If you point the suite at a `vercel.app` URL without the
secret, Playwright prints a warning explaining exactly this.

Do NOT disable SSO on previews as a shortcut. This app renders member and minors' data,
and that would expose every preview publicly.

### Never point this suite at production

`e2e/scheduler.spec.ts` and the seeded member journeys mutate the database, and
`e2e/security.spec.ts` is adversarial by design. Point it at a preview or a
non-production deploy.

### Lighthouse reports are not published

`lighthouserc.cjs` uploads to the filesystem and CI keeps the output as a build
artifact. It previously used `temporary-public-storage`, which posts the report to a
public URL, and a Lighthouse report embeds a full-page screenshot and the final DOM of
every page it visits. Against a preview rendering real member data that would publish
children's personal information to an unauthenticated link.

Copy rule: no em or en dashes anywhere.
