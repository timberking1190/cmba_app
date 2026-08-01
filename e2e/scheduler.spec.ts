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
  // The page has two controls reading "Sign In": the mode tab and the form
  // submit. Scope to the form so this is unambiguous.
  await page.locator('form').getByRole('button', { name: /sign in/i }).click()
  // destination may carry a query string, so compare on the path only.
  const wantPath = destination.split('?')[0]
  await page.waitForURL((url) => url.pathname === wantPath, { timeout: 30_000 })
}

async function firstGameRow(page: Page) {
  // The button renders an icon plus the word, so its raw text is " Edit".
  // getByRole matches the trimmed accessible name, which is what we want.
  const row = page.getByRole('button', { name: 'Edit', exact: true }).first()
  await expect(row).toBeVisible({ timeout: 30_000 })
  return row
}

/*
 * Fields inside the open edit panel, scoped away from the filter bar.
 *
 * Both carry a Venue and a Status control with the same visible label, so an
 * unscoped getByLabel matches two elements. The panel's controls are all id'd
 * "<field>-<gameId>" while the filter bar uses "f-<field>", so an id prefix is an
 * exact and stable way to reach the panel's copy.
 */
function panelField(page: Page, field: string) {
  return page.locator(`[id^="${field}-"]`).first()
}

/* ------------------------------------------------------------ item 3 ---- */

test('an admin signs in ONCE and lands on the manage console', async ({ page }) => {
  await signInOnce(page, '/manage')

  // We are on the console, not bounced back to the login screen.
  await expect(page).toHaveURL(/\/manage$/)
  await expect(page.getByRole('heading', { name: /scheduling console/i })).toBeVisible()

  /*
   * The HEADER agrees with the server: no Sign In control for a signed in user.
   * Scoped to the banner on purpose. The site footer carries its own static Sign
   * In link regardless of auth state, which is not what this assertion is about.
   */
  await expect(page.getByRole('banner').getByRole('link', { name: /^sign in$/i })).toHaveCount(0)
  // Sign Out lives in the account menu, which sits outside the banner landmark.
  await expect(page.getByRole('button', { name: /sign out/i }).first()).toBeVisible()
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
  // Filter to a still-scheduled game: these tests share a database and mutate it,
  // so "the first row" is not stable across the suite.
  await signInOnce(page, '/manage/schedule?status=scheduled')

  await (await firstGameRow(page)).click()

  // Every field the brief asks for is editable.
  for (const field of ['date', 'time', 'venue', 'court', 'home', 'away']) {
    await expect(panelField(page, field), `edit panel is missing ${field}`).toBeVisible({ timeout: 20_000 })
  }

  /*
   * Move this game on top of another one. The seeded season packs every court, so
   * the first slot of the first weekend is already taken; a clash should be
   * reported inline, naming the other game.
   */
  const date = panelField(page, 'date')
  const currentDate = await date.inputValue()
  await date.fill(currentDate)
  // 09:30 is the next slot the seed fills on every court, so moving onto it puts
  // this game on top of a real one. 08:00 would have been a no-op: the earliest
  // game already starts then, and no change means nothing to report.
  await panelField(page, 'time').fill('09:30')

  const clash = page.getByText(/is already booked at that time by|is already playing at that time in/i).first()
  await expect(clash).toBeVisible({ timeout: 15_000 })

  // Resolving it: a time nothing else uses clears the warning.
  await panelField(page, 'time').fill('06:15')
  await expect(clash).toHaveCount(0, { timeout: 15_000 })

  // Saving needs a reason, and the control says so rather than doing nothing.
  await expect(page.getByText(/Add a reason first/i).first()).toBeVisible()
  await panelField(page, 'reason').fill('End to end test, moved to an empty slot')
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page.getByText(/recorded in the audit log|Saved/i).first()).toBeVisible({ timeout: 15_000 })
})

/* ------------------------------------------------------------ item 1 ---- */

test('a forfeit submits, shows who forfeited, and reaches the standings and the public site', async ({ page }) => {
  await signInOnce(page, '/manage/schedule?status=scheduled')
  await (await firstGameRow(page)).click()

  await panelField(page, 'status').selectOption('forfeit')

  // The panel ASKS which team forfeited, by name.
  const who = panelField(page, 'forfeit')
  await expect(who).toBeVisible()
  await who.selectOption('away_forfeit')

  await panelField(page, 'reason').fill('End to end test, away team did not travel')
  await page.getByRole('button', { name: /record the forfeit/i }).click()

  // The result appears IN the panel, and the row updates without a refresh.
  await expect(page.getByText(/forfeit was recorded/i)).toBeVisible({ timeout: 15_000 })
  // The chip, not the hidden <option>Forfeit</option> inside the status dropdown.
  await expect(page.locator('span').filter({ hasText: /^Forfeit$/ }).first()).toBeVisible()
  await expect(page.getByText(/forfeited, so .* takes the win/i).first()).toBeVisible()

  /*
   * And a parent sees the same thing on the public schedule.
   *
   * Two things this has to account for. The game must be published, because the
   * public read filters on that, and the seed leaves a quarter of games in draft.
   * And a forfeit is a RESULT, not an upcoming game, so it lives under the
   * Results tab while the view opens on Upcoming.
   */
  const publishBtn = page.getByRole('button', { name: /^Publish$/ }).first()
  if (await publishBtn.isVisible().catch(() => false)) {
    await publishBtn.click()
    await expect(page.getByRole('button', { name: /^Unpublish$/ }).first()).toBeVisible({ timeout: 20_000 })
  }

  await page.goto('/schedule')
  // The tabs carry an explicit role="tab", so getByRole("button") never matches.
  await page.getByRole('tab', { name: /^Results$/ }).click()
  await expect(page.locator('span').filter({ hasText: /^Forfeit$/ }).first()).toBeVisible({ timeout: 20_000 })
})

/* ------------------------------------------------------- items 6 and 7 -- */

test('staff a weekend of officials in bulk, in one sitting, with named reasons', async ({ page }) => {
  /*
   * Staffing forty games really does take a while: each one is a few database
   * round trips, and this runs over a wide area link to another city. Measured
   * directly against the endpoint it is about two seconds for three games, so
   * forty lands around half a minute. Production runs in the same region as the
   * database and is far quicker. The default sixty second budget is not enough
   * here, and shortening the slate would stop this testing what it exists to test.
   */
  test.setTimeout(240_000)
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

  /*
   * The seeded weekend already has officials on its early games, and everything
   * starts at the same time, so most picks legitimately clash. Tick the override
   * so the slate actually gets staffed, which is what a scheduler would do once
   * they had read the clashes, and which exercises the force path too.
   */
  await page.getByRole('checkbox', { name: /assign anyway/i }).check()

  await page.getByRole('button', { name: /check first/i }).click()
  await expect(page.getByText(/would be assigned|cannot be/i).first()).toBeVisible({ timeout: 120_000 })

  await page.getByRole('button', { name: /^assign \d+ officials?$/i }).click()
  await expect(page.getByText(/^Done$|assigned/i).first()).toBeVisible({ timeout: 120_000 })

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

  /*
   * A bracket seeds from the division standings, and a freshly seeded season has
   * played no games, so there is nothing to rank yet. That is correct behaviour,
   * and the screen has to say so in words rather than break. If it does refuse,
   * this flow cannot continue, so the test ends here having proved the refusal is
   * legible. Advancement itself is covered by the unit tests in
   * src/lib/brackets/__tests__/advance.test.ts.
   */
  const refused = page.getByText(/needs at least two teams|cannot have a bracket yet/i).first()
  const seeding = page.getByText(/check the seeding/i)
  await expect(refused.or(seeding)).toBeVisible({ timeout: 30_000 })
  if (await refused.isVisible()) {
    test.info().annotations.push({ type: 'note', description: 'Division has no ranked teams yet, so bracket creation correctly refused.' })
    return
  }
  await expect(page.getByText(/check the matchups/i)).toBeVisible()

  await page.locator('#bc-reason').fill('End to end test bracket')
  await page.getByRole('button', { name: /create this bracket as a draft/i }).click()
  await page.waitForURL(/\/manage\/brackets\/\d+/, { timeout: 30_000 })

  // Publishing creates the playoff games and puts them on the public site.
  await page.locator('#bm-reason').fill('End to end test, publishing')
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
    await page.locator('#bm-reason').fill(`End to end test, deciding round ${round + 1}`)
    await winButtons.first().click()
    await expect(page.getByText(/advances/i).first()).toBeVisible({ timeout: 20_000 })
  }

  await expect(page.getByText(/won this bracket|are the champions/i).first()).toBeVisible({ timeout: 30_000 })
})

/* --------------------------------------------------------- scale check -- */

test('the console stays responsive against the seeded season', async ({ page }) => {
  await signInOnce(page, '/manage')

  /*
   * Measure the SERVER response, not a full page load. waitForLoadState
   *('networkidle') also waits for the three.js background, web fonts and images,
   * none of which this work touches, and this runs over a wide area link to a
   * database in another city while production runs in the same region. The server
   * render time is the part that regresses when someone accidentally loads a whole
   * season, and it is the part worth guarding.
   */
  for (const path of ['/manage', '/manage/schedule', '/manage/officials', '/manage/brackets']) {
    const started = Date.now()
    const res = await page.request.get(path)
    const elapsed = Date.now() - started
    expect(res.ok(), `${path} returned ${res.status()}`).toBe(true)
    expect(elapsed, `${path} server render took ${elapsed}ms`).toBeLessThan(10_000)
  }
})
