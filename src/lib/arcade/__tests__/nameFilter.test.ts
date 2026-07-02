import { describe, expect, it } from 'vitest'

import {
  checkName,
  compactForm,
  foldForMatch,
  formatArcadeName,
  isNameAllowed,
  MAX_NAME_LEN,
} from '../nameFilter'

describe('foldForMatch', () => {
  it('lowercases, strips accents, and folds leetspeak', () => {
    expect(foldForMatch('JOSÉ')).toBe('jose')
    expect(foldForMatch('C4FÉ')).toBe('cafe') // 4 -> a, accent stripped
    expect(foldForMatch('sh1t')).toBe('shit')
    expect(foldForMatch('@$$')).toBe('ass')
  })
})

describe('compactForm', () => {
  it('keeps letters only and collapses repeats', () => {
    expect(compactForm('f u u u c k')).toBe('fuck')
    expect(compactForm('fuuuck')).toBe('fuck')
    expect(compactForm(foldForMatch('a55'))).toBe('as') // 55 -> ss -> collapse -> s
  })
})

describe('checkName - allows normal names', () => {
  const good = [
    'AAA',
    'KEN',
    'MJ',
    'SWISH',
    'BUCKET',
    'STEPH C',
    'PLAYER1',
    'J D',
    'ACE',
    'ZOE',
    'RIM',
    'CMBA',
    'DUNK 3',
    'RAPTOR',
    'GG',
  ]
  it.each(good)('allows %s', (name) => {
    expect(checkName(name).ok).toBe(true)
  })
})

describe('checkName - blocks explicit and hateful words', () => {
  const bad = [
    'FUCK',
    'SHIT',
    'BITCH',
    'CUNT',
    'ASSHOLE',
    'DICKHEAD',
    'PORN',
    'NIGGER',
    'NIGGA',
    'FAGGOT',
    'RETARD',
    'NAZI',
    'RAPIST',
    'KYS',
  ]
  it.each(bad)('blocks %s', (name) => {
    const r = checkName(name)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('blocked')
  })
})

describe('checkName - blocks evasion: leetspeak, spacing, repeats, accents', () => {
  const bad = [
    'SH1T', // leet 1 -> i
    'A55', // leet 5 -> s -> ass
    'F4G', // leet 4 -> a -> fag
    'N1GGA', // leet 1 -> i
    'FUUUCK', // repeats collapse
    'SHIIIT',
    'B00BS', // leet 0 -> o
    'D1CK',
    'PU$$Y', // $ -> s
    'FÜCK', // accent -> fuck (rejected either way)
  ]
  it.each(bad)('blocks %s', (name) => {
    expect(checkName(name).ok).toBe(false)
  })
})

describe('checkName - blocks whole-word only terms but allows clean words containing them', () => {
  it('blocks the bare word', () => {
    expect(checkName('ASS').ok).toBe(false)
    expect(checkName('HELL').ok).toBe(false)
  })
  it('allows clean words that merely contain the fragment', () => {
    expect(checkName('BASS').ok).toBe(true)
    expect(checkName('CLASS').ok).toBe(true)
    expect(checkName('SHELL').ok).toBe(true)
    expect(checkName('GRASS').ok).toBe(true)
  })
})

describe('checkName - blocks contact info (urls, emails, phones, handles)', () => {
  const bad = [
    'WWW.X.COM',
    'HTTP://A.B',
    'BIT.LY',
    'SITE.COM',
    'A@B.COM',
    '@COACH',
    '5551234567',
    '555 123 4567',
    '403-555-1212',
  ]
  it.each(bad)('rejects %s', (name) => {
    const r = checkName(name)
    expect(r.ok).toBe(false)
    expect(['contact', 'charset']).toContain(r.reason)
  })
})

describe('checkName - charset and length', () => {
  it('rejects disallowed characters', () => {
    expect(checkName('HI!').reason).toBe('charset')
    expect(checkName('A_B').reason).toBe('charset')
    expect(checkName('X/Y').reason).toBe('charset')
    expect(checkName('A  B').reason).toBe('charset') // double space
    expect(checkName('CAFÉ').reason).toBe('charset') // non-ascii letter
  })
  it('rejects empty and too-long', () => {
    expect(checkName('').reason).toBe('empty')
    expect(checkName('   ').reason).toBe('empty')
    expect(checkName('ABCDEFGHIJKLM').reason).toBe('length') // 13 chars
  })
  it('honours a custom maxLen (initials mode)', () => {
    expect(checkName('ABCD', { maxLen: 3 }).reason).toBe('length')
    expect(checkName('ABC', { maxLen: 3 }).ok).toBe(true)
  })
})

describe('helpers', () => {
  it('isNameAllowed mirrors checkName', () => {
    expect(isNameAllowed('SWISH')).toBe(true)
    expect(isNameAllowed('FUCK')).toBe(false)
  })
  it('formatArcadeName trims, uppercases, and clamps', () => {
    expect(formatArcadeName('  swish  ')).toBe('SWISH')
    expect(formatArcadeName('abcdefghijklmnop')).toHaveLength(MAX_NAME_LEN)
  })
})
