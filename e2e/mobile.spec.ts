import { test, expect, type Page } from '@playwright/test'
import { PUBLIC_ROUTES, MOBILE_VIEWPORTS } from './routes'

/*
 * The mobile fundamentals, measured on real rendered pages rather than asserted
 * from the source.
 *
 * Everything here failed at least once while being written, which is the point:
 * a CSS rule that looks correct in the stylesheet can still lose a specificity
 * fight with a utility class and compute to the wrong value in the browser. Only
 * getComputedStyle knows.
 */

/** Routes with a form worth auditing, kept short so the suite stays quick. */
const FORM_ROUTES = ['/login', '/score-login', '/game-report', '/contact', '/scan'] as const

/* ------------------------------------------------------------------ zoom */

test.describe('pinch zoom is not blocked', () => {
  test('the viewport meta allows scaling to at least 5x', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(content, 'no viewport meta at all').toBeTruthy()

    // WCAG 1.4.4. Disabling zoom to stop iOS double tap is the classic wrong fix,
    // and it locks out anyone who needs to magnify a game time.
    expect(content).not.toMatch(/user-scalable\s*=\s*(no|0)/i)

    const max = content?.match(/maximum-scale\s*=\s*([\d.]+)/i)?.[1]
    if (max) expect(Number(max)).toBeGreaterThanOrEqual(5)
  })

  test('the viewport opts into the safe area insets', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    // Without viewport-fit=cover, env(safe-area-inset-*) is always 0 and every
    // safe area rule in globals.css is dead code.
    expect(content).toMatch(/viewport-fit\s*=\s*cover/i)
  })
})

/* -------------------------------------------------------------- overflow */

for (const vp of MOBILE_VIEWPORTS) {
  test.describe(`no horizontal overflow at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const route of PUBLIC_ROUTES) {
      test(`${route}`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(400)

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))

        // A 1px rounding difference is not a defect a person can see or feel.
        expect(
          scrollWidth,
          `${route} scrolls sideways at ${vp.width}px: content is ${scrollWidth}px in a ${clientWidth}px viewport`,
        ).toBeLessThanOrEqual(clientWidth + 1)
      })
    }
  })
}

/* --------------------------------------------------------- form controls */

/** Every visible text entry control, with the numbers that decide iOS zoom. */
async function controls(page: Page) {
  return page.evaluate(() => {
    const out: {
      tag: string
      type: string
      id: string
      name: string
      fontSize: number
      height: number
      label: string
    }[] = []

    const nodes = document.querySelectorAll<HTMLElement>('input, select, textarea')
    for (const el of nodes) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue // not rendered
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      const type = (el as HTMLInputElement).type ?? ''
      out.push({
        tag: el.tagName.toLowerCase(),
        type,
        id: el.id,
        name: (el as HTMLInputElement).name ?? '',
        fontSize: parseFloat(style.fontSize),
        height: rect.height,
        label:
          el.getAttribute('aria-label') ||
          document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ||
          el.getAttribute('placeholder') ||
          '',
      })
    }
    return out
  })
}

/** Types the browser renders itself, where our font-size does not drive zoom. */
const NON_TEXT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'file',
  'color',
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
])

test.describe('form controls do not trigger the iOS zoom trap', () => {
  for (const route of FORM_ROUTES) {
    test(`${route}: every text control is at least 16px`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(400)

      const found = await controls(page)
      const textControls = found.filter((c) => !NON_TEXT_TYPES.has(c.type))

      const tooSmall = textControls.filter((c) => c.fontSize < 16)
      const detail = tooSmall
        .map((c) => `${c.tag}[type=${c.type}] "${c.label || c.name || c.id}" at ${c.fontSize}px`)
        .join('\n    ')

      // Under 16px, iOS Safari zooms the whole page on focus and never zooms back.
      expect(
        tooSmall,
        `${route} has controls under 16px, which makes iOS zoom on focus:\n    ${detail}`,
      ).toEqual([])
    })

    test(`${route}: every control is at least 44px tall`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(400)

      const found = await controls(page)
      const shallow = found
        .filter((c) => !['checkbox', 'radio', 'hidden'].includes(c.type))
        .filter((c) => c.height < 44)

      const detail = shallow
        .map((c) => `${c.tag}[type=${c.type}] "${c.label || c.name || c.id}" at ${Math.round(c.height)}px`)
        .join('\n    ')

      expect(shallow, `${route} has controls under 44px tall:\n    ${detail}`).toEqual([])
    })
  }
})

/* -------------------------------------------------------- touch targets */

test.describe('touch targets', () => {
  for (const route of ['/', '/schedule', '/standings', '/login'] as const) {
    test(`${route}: buttons and standalone links meet 44x44`, async ({ page }) => {
      /*
       * networkidle, not a fixed timeout. The announcements strip is a client
       * component that renders null until its fetch returns, so on a warm server
       * it appeared AFTER a 500ms wait and on a cold one it did not. That made
       * this test pass in isolation and fail in a full run, which is the worst
       * kind of test: one whose result depends on how fast the machine is.
       */
      await page.goto(route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)

      const small = await page.evaluate(() => {
        const out: { tag: string; text: string; w: number; h: number }[] = []
        const nodes = document.querySelectorAll<HTMLElement>(
          'button, a[href], [role="button"], summary',
        )

        for (const el of nodes) {
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) continue
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden' || style.display === 'none') continue

          /*
           * WCAG 2.2 SC 2.5.8 exempts a link whose target is INLINE in a sentence,
           * because making it 44px tall would wreck the line height of the
           * paragraph around it. Detect that by asking whether the element is
           * inline level and sits inside running text.
           */
          const inlineInText =
            style.display.startsWith('inline') &&
            !!el.closest('p, li, td, span, .prose') &&
            el.tagName === 'A'
          if (inlineInText) continue

          /*
           * WCAG 2.5.8 measures the TARGET, which is the area that responds to a
           * pointer, not the painted box. `.tap-target` (globals.css) grows that
           * area with a centred ::after so a small control can meet 44px without
           * a 44px hole in the layout. Read the pseudo element's real size rather
           * than assuming the class works.
           */
          let effW = rect.width
          let effH = rect.height
          if (el.classList.contains('tap-target')) {
            const after = getComputedStyle(el, '::after')
            effW = Math.max(effW, parseFloat(after.minWidth) || 0, parseFloat(after.width) || 0)
            effH = Math.max(effH, parseFloat(after.minHeight) || 0, parseFloat(after.height) || 0)
          }

          if (effW < 44 || effH < 44) {
            out.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent ?? '').trim().slice(0, 40),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            })
          }
        }
        return out
      })

      const detail = small.map((s) => `${s.tag} "${s.text}" ${s.w}x${s.h}`).join('\n    ')
      expect(small, `${route} has touch targets under 44x44:\n    ${detail}`).toEqual([])
    })
  }
})

/* ------------------------------------------------------- text scaling */

test.describe('200 percent text scaling', () => {
  /*
   * WCAG 1.4.4 requires content to stay usable at 200 percent. Emulating it by
   * doubling the root font size is closer to what a phone's accessibility text
   * size setting does than browser page zoom, which scales the layout too and
   * hides exactly the reflow failures we are looking for.
   */
  for (const route of ['/', '/schedule', '/standings', '/login'] as const) {
    test(`${route} does not overflow sideways at 200 percent`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' })
      await page.waitForTimeout(500)

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      expect(
        scrollWidth,
        `${route} scrolls sideways at 200 percent text: ${scrollWidth}px in ${clientWidth}px`,
      ).toBeLessThanOrEqual(clientWidth + 1)
    })
  }
})

/* --------------------------------------------------------- safe areas */

test.describe('safe areas', () => {
  test('the fixed bottom nav reserves room for the home indicator', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed.bottom-0')
    await expect(nav).toBeVisible()

    // The inset is 0 in a desktop-shaped emulator, so assert the RULE is applied
    // rather than the value: padding-bottom must resolve through env(), which is
    // what the safe-bottom class does.
    const hasSafeClass = await nav.evaluate((el) => el.className.includes('safe-bottom'))
    expect(hasSafeClass, 'the bottom nav does not carry safe-bottom').toBe(true)
  })

  test('the bottom nav never covers the end of the page content', async ({ page }) => {
    await page.goto('/schedule', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)

    const navHeight = await page
      .locator('nav.fixed.bottom-0')
      .evaluate((el) => el.getBoundingClientRect().height)

    // <main> carries pb-16 (64px) below lg to clear the nav. If the nav ever grows
    // past that padding, the last row of the schedule sits under it and cannot be
    // read or tapped.
    const mainPadding = await page
      .locator('main')
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))

    expect(
      mainPadding,
      `the bottom nav is ${navHeight}px but main only reserves ${mainPadding}px`,
    ).toBeGreaterThanOrEqual(navHeight)
  })
})

/* ------------------------------------------------------- reveal + LCP */

test.describe('scroll reveals do not hide content from the first paint', () => {
  /*
   * The regression this guards against is expensive and invisible in review.
   *
   * `.reveal` used to be `opacity: 0` in the stylesheet, waiting for an
   * IntersectionObserver to add `.in`. Content was therefore invisible from the
   * moment the HTML arrived until React had hydrated. On /login, where the LCP
   * element sits inside a reveal, that measured LCP 5266ms against FCP 2232ms:
   * four and a half seconds of render delay to fade in text already present in
   * the markup. Inverting it (hide only what is below the fold, and only once JS
   * is running) took /login to 2247ms.
   *
   * If anyone ever puts the opacity back in the stylesheet, this fails.
   */
  for (const route of ['/login', '/', '/coach'] as const) {
    test(`${route}: nothing above the fold is hidden before JavaScript runs`, async ({
      page,
    }) => {
      // Block every script so the page is exactly what the server sent.
      await page.route('**/*.js', (r) => r.abort())
      await page.goto(route, { waitUntil: 'domcontentloaded' })

      const hidden = await page.evaluate(() => {
        const vh = window.innerHeight
        const out: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('.reveal')) {
          const rect = el.getBoundingClientRect()
          if (rect.top > vh || rect.height === 0) continue // below the fold, fine
          if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
            out.push(`${el.tagName.toLowerCase()}.${el.className.split(' ').slice(0, 3).join('.')}`)
          }
        }
        return out
      })

      expect(
        hidden,
        `${route} hides above-the-fold content until JavaScript runs:\n    ${hidden.join('\n    ')}`,
      ).toEqual([])
    })
  }
})
