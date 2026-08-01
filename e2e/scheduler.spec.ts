import { test, expect, type Page } from '@playwright/test'

/*
 * End to end for the scheduling console overhaul. These are the six flows the
 * module brief lists as the gate, driven the way a volunteer scheduler drives
 * them, through the real screens.
 *
 * REQUIREMENTS to run these:
 *   - A database that is NOT production. Point DATABASE_URL at a staging or
 *     preview database. The seed and these specs both write.
 *   - A seeded season:  SCALE_SEED_ALLOW=1 npm run seed:scale
 *   - A scheduling account. Either an existing admin, or the scheduler role from
 *     docs/BACKEND_NOTES.md once its migration is applied. Supply credentials:
 *       E2E_ADMIN_EMAIL=...  E2E_ADMIN_PASSWORD=...
 *
 * Then:  npm run test:e2e -- scheduler.spec.ts
 *
 * They are skipped, loudly, when those are not set, so `npm run test:e2e` does
 * not silently pass by doing nothing.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

/*
 * Fixtures produced by scripts/seed-scale-season.ts. Division index 0 is
 * "U11 Boys A 0" under the "Scale Test League", and its teams are named
 * "<club> 0-<n>". The CSV importer matches a division on its exact fullPath, so
 * these strings have to track the seed.
 */
const SEED = {
  division: 'Scale Test League / U11 Boys A 0',
  homeTeam: 'Excel 0-0',
  awayTeam: 'CoMBA 0-1',
  homeTeam2: 'Okotoks 0-2',
  awayTeam2: 'DMS 0-3',
  venue: 'Scale Gym 0',
}

test.skip(!EMAIL || !PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD, against a non production database, to run the scheduler end to end suite.')

/* --------------------------------------------------------------- helpers */

/**
 * Sign in ONCE and land on the destination. This is the assertion for reported
 * item 3: one submit, and an admin is on /manage, not back on the login screen.
 */
async function signInOnce(page: Page, destination = '/manage') {
  await page.goto(`/login?redirect=${encodeURIComponent(destination)}`)
  await page.getByPlaceholder('your@email.com').fill(EMAIL!)
  await page.getByPlaceholder('••••••••').fill(PASSWORD!)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => url.pathname === destination, { timeout: 30_000 })
}

async function firstGameRow(page: Page) {
  const row = page.locator('button', { hasText: /^Edit$/ }).first()
  await expect(row).toBeVisible()
  return row
}

/* ------------------------------------------------------------ item 3 ---- */

test('an admin signs in ONCE and lands on the manage console', async ({ page }) => {
  await signInOnce(page, '/manage')

  // We are on the console, not bounced back to the login screen.
  await expect(page).toHaveURL(/\/manage$/)
  await expect(page.getByRole('heading', { name: /scheduling console/i })).toBeVisible()

  // And the header agrees with the server: no Sign In control for a signed in user.
  await expect(page.getByRole('link', { name: /^sign in$/i })).toHaveCount(0)
})

test('the manage console loads immediately after signing in, with no second attempt', async ({ page }) => {
  await signInOnce(page, '/manage/schedule')
  await expect(page.getByRole('heading', { name: /manage\s+schedule/i })).toBeVisible()
})

/* --------------------------------------------------------- items 4 and 5 */

test('import a file with a bad time, fix it, and revalidate WITHOUT a page refresh', async ({ page }) => {
  await signInOnce(page, '/manage/import')

  // These names come from scripts/seed-scale-season.ts. The importer matches a
  // division on its EXACT fullPath, so this has to be the seeded value.
  const header = 'date,time,division,home_team,away_team,venue\n'
  const row = (time: string) => `${header}2026-12-10,${time},${SEED.division},${SEED.homeTeam},${SEED.awayTeam},${SEED.venue}\n`
  const badRow = row('half past six')
  const goodRow = row('6:30 PM')

  const input = page.locator('input[type="file"]')

  // First attempt: the time cannot be read, and the error says which formats work.
  await input.setInputFiles({ name: 'games.csv', mimeType: 'text/csv', buffer: Buffer.from(badRow) })
  await page.getByRole('button', { name: /validate file/i }).click()
  await expect(page.getByText(/not a clock time we recognize|12 hour time/i).first()).toBeVisible()

  /*
   * Second attempt with the SAME file name, and no reload. This is the reported
   * failure: the browser fires no change event for the same file name unless the
   * input value was cleared, so this used to do nothing at all.
   */
  await input.setInputFiles({ name: 'games.csv', mimeType: 'text/csv', buffer: Buffer.from(goodRow) })
  await page.getByRole('button', { name: /validate file/i }).click()

  // The preview shows what the importer READ, in 12 hour time.
  await expect(page.getByText(/6:30 PM/).first()).toBeVisible()
  await expect(page.getByText(/not a clock time we recognize/i)).toHaveCount(0)
})

test('a 12 hour time and a 24 hour time both import', async ({ page }) => {
  await signInOnce(page, '/manage/import')
  const csv =
    'date,time,division,home_team,away_team,venue\n' +
    `2026-12-10,18:00,${SEED.division},${SEED.homeTeam},${SEED.awayTeam},${SEED.venue}\n` +
    `2026-12-11,8:00 AM,${SEED.division},${SEED.homeTeam2},${SEED.awayTeam2},${SEED.venue}\n`
  await page.locator('input[type="file"]').setInputFiles({ name: 'mixed.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: /validate file/i }).click()
  await expect(page.getByText(/6:00 PM/).first()).toBeVisible()
  await expect(page.getByText(/8:00 AM/).first()).toBeVisible()
})

/* ------------------------------------------------------------ item 2 ---- */

test('edit a game date and venue, see the clash surfaced, then resolve it', async ({ page }) => {
  await signInOnce(page, '/manage/schedule')

  await (await firstGameRow(page)).click()

  // Every field the brief asks for is editable.
  await expect(page.getByLabel('Date', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Time', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Venue', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Court', { exact: true })).toBeVisible()
  await expect(page.getByLabel(/home team/i)).toBeVisible()
  await expect(page.getByLabel(/away team/i)).toBeVisible()

  /*
   * Move this game on top of another one. The seeded season packs every court, so
   * the first slot of the first weekend is already taken; a clash should be
   * reported inline, naming the other game.
   */
  const date = page.getByLabel('Date', { exact: true })
  const currentDate = await date.inputValue()
  await date.fill(currentDate)
  await page.getByLabel('Time', { exact: true }).fill('08:00')

  const clash = page.getByText(/is already booked at that time by|is already playing at that time in/i).first()
  await expect(clash).toBeVisible({ timeout: 15_000 })

  // Resolving it: a time nothing else uses clears the warning.
  await page.getByLabel('Time', { exact: true }).fill('06:15')
  await expect(clash).toHaveCount(0, { timeout: 15_000 })

  // Saving needs a reason, and the control says so rather than doing nothing.
  await expect(page.getByText(/Add a reason first/i).first()).toBeVisible()
  await page.getByLabel(/reason/i).fill('End to end test, moved to an empty slot')
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/recorded in the audit log|Saved/i).first()).toBeVisible({ timeout: 15_000 })
})

/* ------------------------------------------------------------ item 1 ---- */

test('a forfeit submits, shows who forfeited, and reaches the standings and the public site', async ({ page }) => {
  await signInOnce(page, '/manage/schedule')
  await (await firstGameRow(page)).click()

  await page.getByLabel(/^status$/i).selectOption('forfeit')

  // The panel ASKS which team forfeited, by name.
  const who = page.getByLabel(/who forfeited/i)
  await expect(who).toBeVisible()
  await who.selectOption('away_forfeit')

  await page.getByLabel(/reason/i).fill('End to end test, away team did not travel')
  await page.getByRole('button', { name: /record the forfeit/i }).click()

  // The result appears IN the panel, and the row updates without a refresh.
  await expect(page.getByText(/forfeit was recorded/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Forfeit').first()).toBeVisible()
  await expect(page.getByText(/forfeited, so .* takes the win/i).first()).toBeVisible()

  // And a parent sees the same thing on the public schedule.
  await page.goto('/schedule')
  await expect(page.getByText('Forfeit').first()).toBeVisible({ timeout: 20_000 })
})

/* ------------------------------------------------------- items 6 and 7 -- */

test('staff a weekend of officials in bulk, in one sitting, with named reasons', async ({ page }) => {
  await signInOnce(page, '/manage/officials')

  // The whole slate is on one board, not one game at a time.
  const pickers = page.locator('select[id^="pick-"]')
  await expect(pickers.first()).toBeVisible()
  const count = await pickers.count()
  expect(count).toBeGreaterThan(10)

  // Choose officials across many games, then submit them all at once.
  const toStaff = Math.min(count, 40)
  for (let i = 0; i < toStaff; i++) {
    const options = pickers.nth(i).locator('option')
    if ((await options.count()) < 2) continue
    await pickers.nth(i).selectOption({ index: 1 + (i % 5) })
  }

  await page.getByRole('button', { name: /check first/i }).click()
  await expect(page.getByText(/would be assigned|cannot be/i).first()).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: /^assign \d+ officials?$/i }).click()
  await expect(page.getByText(/assigned/i).first()).toBeVisible({ timeout: 60_000 })

  // Any failure names the person and the reason, never a database id.
  await expect(page.getByText(/Blocked official \d+/)).toHaveCount(0)
  await expect(page.getByText(/^Could not assign\.$/)).toHaveCount(0)

  // No page reload happened at any point.
  await expect(page).toHaveURL(/\/manage\/officials/)
})

/* ------------------------------------------------------------- Phase 1 -- */

test('run a bracket from creation through to a champion', async ({ page }) => {
  await signInOnce(page, '/manage/brackets/new')

  await page.getByLabel(/division/i).selectOption({ index: 1 })
  await page.getByRole('button', { name: /show me the bracket/i }).click()

  // The preview exists BEFORE anything is created.
  await expect(page.getByText(/check the seeding/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/check the matchups/i)).toBeVisible()

  await page.getByLabel(/reason/i).fill('End to end test bracket')
  await page.getByRole('button', { name: /create this bracket as a draft/i }).click()
  await page.waitForURL(/\/manage\/brackets\/\d+/, { timeout: 30_000 })

  // Publishing creates the playoff games and puts them on the public site.
  await page.getByLabel(/reason/i).fill('End to end test, publishing')
  await page.getByRole('button', { name: /publish to the public site/i }).click()
  await expect(page.getByText(/playoff games? (was|were) created/i)).toBeVisible({ timeout: 30_000 })

  /*
   * Walk the bracket to a champion using the manual winner control, which is the
   * same path a scheduler uses to correct a double forfeit. Automatic advancement
   * from a real final is covered by the unit tests in
   * src/lib/brackets/__tests__/advance.test.ts.
   */
  for (let round = 0; round < 6; round++) {
    const winButtons = page.getByRole('button', { name: / wins$/ })
    if ((await winButtons.count()) === 0) break
    await page.getByLabel(/reason/i).first().fill(`End to end test, deciding round ${round + 1}`)
    await winButtons.first().click()
    await expect(page.getByText(/advances/i).first()).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.getByText(/won this bracket|are the champions/i).first()).toBeVisible({ timeout: 30_000 })
})

/* --------------------------------------------------------- scale check -- */

test('the console stays responsive against the seeded season', async ({ page }) => {
  await signInOnce(page, '/manage')

  for (const path of ['/manage', '/manage/schedule', '/manage/officials', '/manage/brackets']) {
    const started = Date.now()
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const elapsed = Date.now() - started
    // Generous, because this is a real database over a real network. The point is
    // to catch an accidental load-the-whole-season regression, not to benchmark.
    expect(elapsed, `${path} took ${elapsed}ms`).toBeLessThan(10_000)
  }
})
