import { test, expect } from '@playwright/test'

/*
 * End-to-end for the home-page arcade game and shared leaderboard. The physics
 * shot cannot be driven by synthetic input, so the game exposes gated test hooks
 * (window.__arcade, enabled only when __ARCADE_E2E__ is set before load) to drive
 * the state machine deterministically. The leaderboard API is intercepted, so this
 * test writes nothing to a real database.
 */

type BoardRow = { id: number; name: string; score: number }

declare global {
  interface Window {
    __ARCADE_E2E__?: boolean
    __arcade?: {
      start: () => void
      make: () => void
      miss: () => void
      setName: (n: string) => void
      submit: () => void
      phase: () => string
      streak: () => number
    }
  }
}

test('play, build a streak, game over, submit a clean name (it appears), and reject a bad name', async ({ page }) => {
  await page.addInitScript(() => {
    window.__ARCADE_E2E__ = true
  })

  // Intercept the leaderboard API so nothing hits the real database.
  const board: BoardRow[] = []
  await page.route('**/api/arcade-scores**', async (route) => {
    const req = route.request()
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() || '{}') as { name?: string; score?: number }
      board.push({ id: 4242, name: String(body.name || '').toUpperCase(), score: Number(body.score || 0) })
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ doc: { id: 4242 } }) })
      return
    }
    const docs = [...board].sort((a, b) => b.score - a.score)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ docs }) })
  })

  // The game lives on its own page now (the home tile is just a preview link).
  await page.goto('/arcade')
  await page.waitForFunction(() => !!window.__arcade, null, { timeout: 40_000 })

  // Start and build a streak of makes.
  await page.evaluate(() => window.__arcade!.start())
  await page.waitForFunction(() => window.__arcade!.phase() === 'ready')
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.__arcade!.make())
    await page.waitForTimeout(60)
  }
  expect(await page.evaluate(() => window.__arcade!.streak())).toBe(5)

  // Let the last make settle, then miss to end the run -> qualifies -> name entry.
  await page.waitForTimeout(800)
  await page.evaluate(() => window.__arcade!.miss())
  await page.waitForFunction(() => window.__arcade!.phase() === 'entry', null, { timeout: 8_000 })

  const app = page.getByRole('application')

  // Bad name: the client filter rejects instantly with a friendly message; no submit.
  await page.evaluate(() => window.__arcade!.setName('ASS'))
  await page.evaluate(() => window.__arcade!.submit())
  await expect(app.getByRole('alert')).toContainText(/another name/i)
  expect(await page.evaluate(() => window.__arcade!.phase())).toBe('entry')

  // Clean name: submits and appears on the table.
  await page.evaluate(() => window.__arcade!.setName('WIN'))
  await page.evaluate(() => window.__arcade!.submit())
  await page.waitForFunction(() => window.__arcade!.phase() === 'submitted', null, { timeout: 8_000 })
  await expect(app.getByText('WIN', { exact: false })).toBeVisible()
})
