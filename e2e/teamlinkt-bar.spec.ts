import { test, expect, devices, type Page, type Locator } from '@playwright/test'

import { TEAMLINKT } from '@/lib/cmbaLinks'

/*
 * The persistent TeamLinkt league bar.
 *
 * This bar is the reliable route to a game time, a league table, and score
 * reporting, on every page of the site. It sits at the very top of every route,
 * which is exactly where the reveal defect did the most damage: `.reveal` content
 * above the fold started at opacity 0 and waited for an observer that could only
 * run after hydration, and on /login that made the whole page look empty. So the
 * assertions here are deliberately about PAINT, not just presence.
 *
 * Playwright's toBeVisible() checks layout, not paint: an element at opacity 0
 * still has a box and still counts as visible. Every visibility assertion below
 * therefore measures effective opacity up the ancestor chain, which is what
 * actually decides whether a parent in a gym can read the thing.
 *
 * The accessibility contract this file pins down:
 *   - a <nav> named "League information on TeamLinkt"
 *   - three links whose accessible names carry both the destination and the fact
 *     that they open TeamLinkt in a new tab
 *   - every link target="_blank" with rel="noopener noreferrer"
 *
 * Copy rule: no em or en dashes anywhere.
 */

const BAR = /league information on teamlinkt/i

const LINKS = [
  { key: 'schedule', name: /schedule/i, href: TEAMLINKT.schedule },
  { key: 'standings', name: /standings/i, href: TEAMLINKT.standings },
  { key: 'report a score', name: /report a score/i, href: TEAMLINKT.reportScore },
]

/* Every public route the bar must appear on. */
const ROUTES = ['/', '/schedule', '/standings', '/rules', '/login', '/this-page-does-not-exist-xyz']

function bar(page: Page): Locator {
  return page.getByRole('navigation', { name: BAR })
}

/*
 * Effective opacity including ancestors. A parent at opacity 0 hides its children
 * whatever the child's own computed style says, which is the exact shape of the
 * defect this file guards against.
 */
async function effectiveOpacity(target: Locator): Promise<number> {
  return target.evaluate((node) => {
    let opacity = 1
    let el: Element | null = node as Element
    while (el && el !== document.documentElement) {
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') return 0
      opacity *= Number.parseFloat(style.opacity || '1')
      el = el.parentElement
    }
    return opacity
  })
}

async function expectPainted(target: Locator, what: string) {
  await expect(target, `${what} should be attached`).toBeAttached()
  expect(await effectiveOpacity(target), `${what} effective opacity`).toBeGreaterThan(0.99)
  const box = await target.boundingBox()
  expect(box, `${what} should have a layout box`).not.toBeNull()
  expect(box!.width, `${what} width`).toBeGreaterThan(0)
  expect(box!.height, `${what} height`).toBeGreaterThan(0)
}

/* ── 1. Renders on every frontend route ──────────────────────────────────── */
for (const path of ROUTES) {
  test(`bar renders and is painted on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' })
    await expectPainted(bar(page), `league bar on ${path}`)
    for (const l of LINKS) {
      await expectPainted(
        bar(page).getByRole('link', { name: l.name }),
        `${l.key} link on ${path}`,
      )
    }
  })
}

/* ── 2. Absent from the Payload admin ────────────────────────────────────── */
test('bar does not render inside the Payload admin', async ({ page }) => {
  const res = await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  expect(res?.status(), 'admin should answer').toBeLessThan(400)
  // The admin route group has its own layout and never mounts the public chrome.
  await expect(bar(page)).toHaveCount(0)
})

/* ── 3. Correct destinations and safe new-tab attributes ─────────────────── */
test('all three links point at the cmbaLinks constants and open a new tab safely', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  for (const l of LINKS) {
    const link = bar(page).getByRole('link', { name: l.name })
    await expect(link, `${l.key} href`).toHaveAttribute('href', l.href)
    await expect(link, `${l.key} target`).toHaveAttribute('target', '_blank')
    // rel must contain BOTH tokens: noopener closes the window.opener hole,
    // noreferrer stops the referrer leaking to TeamLinkt.
    const rel = (await link.getAttribute('rel')) ?? ''
    expect(rel, `${l.key} rel`).toContain('noopener')
    expect(rel, `${l.key} rel`).toContain('noreferrer')
  }
})

test('each link tells a screen reader where it goes and that it opens a new tab', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  for (const l of LINKS) {
    const accessibleName = await bar(page)
      .getByRole('link', { name: l.name })
      .evaluate((el) => (el as HTMLElement).innerText + ' ' + (el.getAttribute('aria-label') ?? ''))
    expect(accessibleName.toLowerCase(), `${l.key} accessible name mentions TeamLinkt`).toContain('teamlinkt')
    expect(accessibleName.toLowerCase(), `${l.key} accessible name mentions the new tab`).toMatch(/new tab/)
  }
})

/* ── 4. Visible with HTML and CSS alone, no JavaScript ───────────────────── */
/*
 * The bar is rendered by the root layout, which puts it in the document shell
 * BEFORE <main> and before the first streaming boundary. Verified: the nav appears
 * at byte 12255 of the homepage response while <main> starts at 17614. That is a
 * deliberate property, and it is what lets this test be the honest version.
 *
 * So there is no warm render and no class stripping here. The exact bytes the
 * server sends are replayed into a context with JavaScript switched off, while the
 * real stylesheet is still fetched from the server. CSS alone then decides whether
 * a parent can see the bar.
 *
 * An earlier version of this test assembled the page with script on and stripped
 * the classes an observer might have added. That was wrong: stripping
 * `reveal-armed` also removed it when the COMPONENT shipped it in its own markup,
 * so the test passed against a bar that was permanently invisible. Reading the raw
 * server bytes cannot be fooled that way.
 *
 * Note this also exercises the dark theme, because the theme is chosen by a script
 * that never runs here, leaving the data-theme="dark" the layout ships with.
 */
test('bar and all three links are painted with no JavaScript', async ({ browser, request, baseURL }, testInfo) => {
  const url = new URL('/', baseURL).toString()
  const response = await request.get(url)
  expect(response.status(), 'server should answer the homepage').toBeLessThan(400)
  const serverHtml = await response.text()

  // Fail loudly if the bar ever moves inside the streamed region, because then a
  // no-script visitor genuinely would not get it and this test must be rethought.
  expect(
    serverHtml.indexOf('League information on TeamLinkt'),
    'the bar must be present in the server HTML',
  ).toBeGreaterThan(-1)
  expect(
    serverHtml.indexOf('League information on TeamLinkt'),
    'the bar must sit before <main>, outside the streamed region',
  ).toBeLessThan(serverHtml.indexOf('<main'))

  const context = await browser.newContext({
    ...(testInfo.project.use as Record<string, unknown>),
    javaScriptEnabled: false,
  })
  try {
    const page = await context.newPage()
    await page.route(url, (r) =>
      r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: serverHtml }),
    )
    await page.goto(url, { waitUntil: 'load' })
    await expectPainted(bar(page), 'league bar with no JavaScript')
    for (const l of LINKS) {
      const link = bar(page).getByRole('link', { name: l.name })
      await expectPainted(link, `${l.key} link with no JavaScript`)
      await expect(link, `${l.key} href with no JavaScript`).toHaveAttribute('href', l.href)
    }
  } finally {
    await context.close()
  }
})

/* ── 5. All three inside the viewport on first paint, no scrolling ───────── */
test('all three links are inside the first screen with no scrolling', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  const viewport = page.viewportSize()!
  expect(await page.evaluate(() => window.scrollY), 'page must not scroll itself').toBe(0)
  for (const l of LINKS) {
    const link = bar(page).getByRole('link', { name: l.name })
    await expectPainted(link, `${l.key} link`)
    const box = (await link.boundingBox())!
    expect(box.y, `${l.key} top edge inside viewport height ${viewport.height}`).toBeLessThan(viewport.height)
    expect(box.y + box.height, `${l.key} bottom edge inside viewport`).toBeLessThanOrEqual(viewport.height)
    expect(box.x, `${l.key} left edge inside viewport`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${l.key} right edge inside viewport width ${viewport.width}`).toBeLessThanOrEqual(viewport.width + 1)
  }
})

/* ── 7. Touch targets ────────────────────────────────────────────────────── */
/*
 * The threshold follows the pointer, not the brand. Below the lg breakpoint the
 * bar is laid out for a finger, so 44x44 with 8px of separation applies: that
 * covers phones AND tablets, and a tablet getting mouse-sized targets would be a
 * real defect. From lg up the pointer is a mouse and the bar goes slim to sit
 * close to the utility bar above it, where WCAG 2.5.8 asks for 24x24 and the bar
 * comfortably clears it.
 */
test('each link is a real touch target with clear separation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  const width = page.viewportSize()!.width
  const touchLayout = width < 1024
  const minSize = touchLayout ? 44 : 40
  const minGap = touchLayout ? 8 : 4

  const boxes: Array<{ key: string; x: number; w: number }> = []
  for (const l of LINKS) {
    const box = (await bar(page).getByRole('link', { name: l.name }).boundingBox())!
    expect(box.width, `${l.key} target width at ${width}px`).toBeGreaterThanOrEqual(minSize)
    expect(box.height, `${l.key} target height at ${width}px`).toBeGreaterThanOrEqual(minSize)
    boxes.push({ key: l.key, x: box.x, w: box.width })
  }
  boxes.sort((a, b) => a.x - b.x)
  for (let i = 1; i < boxes.length; i++) {
    const gap = boxes[i].x - (boxes[i - 1].x + boxes[i - 1].w)
    expect(gap, `gap between ${boxes[i - 1].key} and ${boxes[i].key} at ${width}px`).toBeGreaterThanOrEqual(minGap)
  }
})

/*
 * The touch layout is the one a parent in a gym actually gets, so it is asserted
 * explicitly at the two narrow widths the brief names rather than left to whatever
 * viewport a device profile happens to use.
 */
for (const size of [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
]) {
  test(`targets are 44 by 44 with 8px separation at ${size.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } })
    try {
      const page = await context.newPage()
      await page.goto('/', { waitUntil: 'load' })
      const boxes: Array<{ key: string; x: number; w: number }> = []
      for (const l of LINKS) {
        const box = (await bar(page).getByRole('link', { name: l.name }).boundingBox())!
        expect(box.width, `${l.key} width at ${size.name}`).toBeGreaterThanOrEqual(44)
        expect(box.height, `${l.key} height at ${size.name}`).toBeGreaterThanOrEqual(44)
        boxes.push({ key: l.key, x: box.x, w: box.width })
      }
      boxes.sort((a, b) => a.x - b.x)
      for (let i = 1; i < boxes.length; i++) {
        const gap = boxes[i].x - (boxes[i - 1].x + boxes[i - 1].w)
        expect(gap, `gap at ${size.name}`).toBeGreaterThanOrEqual(8)
      }
    } finally {
      await context.close()
    }
  })
}

/* ── Keyboard reachability and a focus ring the header cannot hide ───────── */
/*
 * The bar sits flush under a sticky header that paints above it, so the global
 * focus ring's 3px OUTWARD offset put the top edge of the ring underneath the
 * header, invisible at exactly the point a keyboard user meets it first. The ring
 * is inset for this component instead. This test pins that down, because it is the
 * kind of thing that silently regresses the next time the focus treatment is
 * touched.
 */
test('links are keyboard reachable with a focus ring the header cannot cover', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })

  const first = bar(page).getByRole('link', { name: LINKS[0].name })
  await first.focus()
  await expect(first, 'first bar link should take focus').toBeFocused()

  const ring = await first.evaluate((el) => {
    const cs = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    const header = document.querySelector('header')!.getBoundingClientRect()
    const offset = Number.parseFloat(cs.outlineOffset || '0')
    return {
      width: Number.parseFloat(cs.outlineWidth || '0'),
      style: cs.outlineStyle,
      // The topmost pixel the ring paints. A positive offset pushes it outward.
      ringTop: box.top - offset,
      headerBottom: header.bottom,
    }
  })

  expect(ring.width, 'focus ring must be at least 2px').toBeGreaterThanOrEqual(2)
  expect(ring.style, 'focus ring must be a visible outline').not.toBe('none')
  expect(
    ring.ringTop,
    'the focus ring must not extend up underneath the sticky header',
  ).toBeGreaterThanOrEqual(ring.headerBottom)

  /*
   * Tab order is asserted structurally rather than by pressing Tab. WebKit does not
   * move focus to links with the Tab key unless the user has switched on full
   * keyboard access, so driving the keyboard here would test a browser preference
   * instead of the component. What actually decides tab order is DOM order plus the
   * absence of a positive tabindex, so that is what gets checked, and it holds in
   * every engine.
   */
  const order = await page.evaluate(() => {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'),
    ).filter((el) => {
      const cs = getComputedStyle(el)
      return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getAttribute('tabindex') !== '-1'
    })
    const barLinks = Array.from(
      document.querySelectorAll<HTMLElement>('nav[aria-label="League information on TeamLinkt"] a'),
    )
    return {
      indices: barLinks.map((l) => focusable.indexOf(l)),
      positiveTabIndex: barLinks.filter((l) => Number(l.getAttribute('tabindex') ?? 0) > 0).length,
      count: barLinks.length,
    }
  })

  expect(order.count, 'the bar has exactly three links').toBe(3)
  expect(order.indices.every((i) => i >= 0), 'every bar link is focusable').toBe(true)
  expect(
    order.positiveTabIndex,
    'no bar link may use a positive tabindex, which would jump the natural order',
  ).toBe(0)
  expect(
    order.indices[1] - order.indices[0],
    'the second link follows the first with nothing focusable between them',
  ).toBe(1)
  expect(
    order.indices[2] - order.indices[1],
    'the third link follows the second with nothing focusable between them',
  ).toBe(1)
})

/* ── 8. Homepage stacking ────────────────────────────────────────────────── */
test('bar and the announcements strip stack without overlapping, hero still reachable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' })
  await expectPainted(bar(page), 'league bar')

  const barBox = (await bar(page).boundingBox())!
  const strip = page.locator('[data-testid="announcements-strip"]')
  const stripCount = await strip.count()

  if (stripCount > 0) {
    const stripBox = await strip.boundingBox()
    if (stripBox) {
      // The bar sits directly under the header, the strip sits below the bar.
      expect(stripBox.y, 'announcements strip starts below the league bar').toBeGreaterThanOrEqual(
        barBox.y + barBox.height - 1,
      )
    }
  }

  // The hero heading must still be on the first screen once everything is stacked.
  const viewport = page.viewportSize()!
  const heading = page.getByRole('heading', { level: 1 }).first()
  await expectPainted(heading, 'hero heading')
  const headingBox = (await heading.boundingBox())!
  expect(
    headingBox.y,
    `hero heading top ${Math.round(headingBox.y)} must be inside viewport height ${viewport.height}`,
  ).toBeLessThan(viewport.height)
})

/* ── 6. No horizontal overflow at the required widths ────────────────────── */
const WIDTHS = [
  { name: '360x640 small Android', width: 360, height: 640 },
  { name: '390x844 iPhone 13', width: 390, height: 844 },
  { name: '834x1112 tablet', width: 834, height: 1112 },
]

for (const w of WIDTHS) {
  test(`no horizontal overflow at ${w.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      viewport: { width: w.width, height: w.height },
      isMobile: false,
    })
    try {
      const page = await context.newPage()
      for (const path of ['/', '/schedule', '/login']) {
        await page.goto(path, { waitUntil: 'load' })
        await expectPainted(bar(page), `league bar on ${path} at ${w.name}`)
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(
          overflow.scrollWidth,
          `${path} at ${w.name}: scrollWidth ${overflow.scrollWidth} exceeds ${overflow.clientWidth}`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1)
      }
    } finally {
      await context.close()
    }
  })
}
