/*
 * Mobile keyboard and autofill hints on the forms that matter.
 *
 * The audit found 2 `inputMode` and 5 `autoComplete` usages across an app with 93
 * form controls, and zero `enterKeyHint`. The effect on a phone is concrete: an
 * email field without inputMode gets the alphabetic keyboard with no @ key, a
 * phone field gets letters instead of a number pad, and nothing offers to
 * autofill, so a parent types their whole email address by hand while standing up.
 *
 * `autoComplete` on password fields is also WCAG 2.2 SC 3.3.8 Accessible
 * Authentication: without it a password manager cannot fill the field, and the
 * user is forced into a memory test.
 *
 * This reads the source rather than a rendered DOM on purpose. These are static
 * JSX attributes, the check is about whether someone deleted one, and a source
 * assertion costs nothing and needs no browser.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const read = (p: string) => readFileSync(path.join(APP, p), 'utf8')

/**
 * Pull each `<input>` / `<select>` / `<textarea>` opening tag out of a source file.
 *
 * A regex of the form `<input[^>]*>` looks right and is wrong: JSX attributes hold
 * arrow functions, so `onChange={(e) => setThing(e.target.value)}` contains a `>`
 * and the match stops in the middle of the tag. That truncation silently hid every
 * attribute after the first handler and made this suite fail against source that
 * was actually correct. So track brace depth and only treat a `>` at depth zero as
 * the end of the tag.
 */
function tags(src: string): string[] {
  const out: string[] = []
  const open = /<(?:input|select|textarea)\b/g
  let m: RegExpExecArray | null

  while ((m = open.exec(src))) {
    let depth = 0
    let quote: string | null = null

    for (let i = m.index; i < src.length; i++) {
      const ch = src[i]

      if (quote) {
        if (ch === quote) quote = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        quote = ch
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) {
        out.push(src.slice(m.index, i + 1))
        break
      }
    }
  }
  return out
}

/** The tag that carries a given name or placeholder, so failures name the field. */
function tagFor(src: string, needle: string): string | undefined {
  return tags(src).find((t) => t.includes(needle))
}

describe('login form: mobile keyboards and password manager support', () => {
  const src = read('(frontend)/login/page.tsx')

  it.each([
    ['sign in email', 'siEmail', ['type="email"', 'autoComplete="email"', 'inputMode="email"']],
    ['sign in password', 'siPassword', ['type="password"', 'autoComplete="current-password"']],
    ['new password', 'Create a password', ['type="password"', 'autoComplete="new-password"']],
    ['guardian phone', 'gPhone', ['type="tel"', 'inputMode="tel"']],
    ['guardian email', 'gEmail', ['inputMode="email"']],
  ])('%s carries its hints', (_label, needle, required) => {
    const tag = tagFor(src, needle)
    expect(tag, `no control found for ${needle}`).toBeDefined()
    for (const attr of required) {
      expect(tag, `missing ${attr}`).toContain(attr)
    }
  })

  it('uses new-password rather than current-password on the sign up field', () => {
    // Getting these the wrong way round makes a password manager offer the user's
    // existing password when they are trying to create a new one.
    const tag = tagFor(src, 'Create a password')
    expect(tag).toContain('autoComplete="new-password"')
    expect(tag).not.toContain('autoComplete="current-password"')
  })

  it('does not autofill the guardian fields with the signed in person', () => {
    // A guardian's name and email are somebody else's details. autoComplete="name"
    // here would helpfully fill in the wrong human.
    for (const needle of ['gName', 'gEmail']) {
      expect(tagFor(src, needle)).toContain('autoComplete="off"')
    }
  })
})

describe('game report form: mobile keyboards', () => {
  const src = read('(frontend)/game-report/page.tsx')

  it.each([
    ['reporter email', 'reporterEmail', ['type="email"', 'inputMode="email"', 'autoComplete="email"']],
    ['reporter phone', 'reporterPhone', ['type="tel"', 'inputMode="tel"', 'autoComplete="tel"']],
    ['reporter name', 'reporterName', ['autoComplete="name"']],
  ])('%s carries its hints', (_label, needle, required) => {
    const tag = tagFor(src, needle)
    expect(tag, `no control found for ${needle}`).toBeDefined()
    for (const attr of required) {
      expect(tag, `missing ${attr}`).toContain(attr)
    }
  })
})

describe('the 16px rule at the source', () => {
  /*
   * globals.css floors control font size on touch devices, and e2e/mobile.spec.ts
   * measures the computed value in a real browser. This is the third layer, and
   * the cheapest: it catches the class being pasted back in during review, before
   * anyone runs a browser.
   */
  it.each([
    ['login', '(frontend)/login/page.tsx'],
    ['game report', '(frontend)/game-report/page.tsx'],
  ])('%s controls do not carry a sub-16px text class', (_label, file) => {
    const offenders = tags(read(file)).filter(
      (t) =>
        /className=\{?["`][^"`]*\btext-(xs|sm)\b/.test(t) &&
        !/type="(checkbox|radio|hidden|file)"/.test(t),
    )
    expect(
      offenders,
      `these controls would make iOS Safari zoom on focus:\n  ${offenders.join('\n  ')}`,
    ).toEqual([])
  })
})
