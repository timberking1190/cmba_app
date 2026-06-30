import { describe, expect, it } from 'vitest'

import { sniffType } from '../sniff'

const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]) // %PDF-1.7
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')])
const script = Buffer.from('<?php system($_GET[0]); ?>')
const fakePdf = Buffer.from('not really a pdf at all')

describe('sniffType (magic-number content sniffing)', () => {
  it('detects allowed types by their real bytes', () => {
    expect(sniffType(pdf)).toBe('application/pdf')
    expect(sniffType(png)).toBe('image/png')
    expect(sniffType(jpeg)).toBe('image/jpeg')
    expect(sniffType(webp)).toBe('image/webp')
  })

  it('returns unknown for a script or a file lying about being a PDF', () => {
    expect(sniffType(script)).toBe('unknown')
    expect(sniffType(fakePdf)).toBe('unknown')
    expect(sniffType(Buffer.from([0x00, 0x01]))).toBe('unknown')
    expect(sniffType(undefined)).toBe('unknown')
  })
})
