import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { stripImageMetadata } from '../uploads/exif'

describe('stripImageMetadata', () => {
  it('removes embedded EXIF metadata from an uploaded image', async () => {
    const withExif = await sharp({ create: { width: 16, height: 16, channels: 3, background: { r: 10, g: 20, b: 30 } } })
      .jpeg()
      .withExif({ IFD0: { Copyright: 'CMBA-TEST', Software: 'GPS 49.0,-114.0' } })
      .toBuffer()
    expect((await sharp(withExif).metadata()).exif).toBeDefined()

    const req = { file: { data: withExif, size: withExif.length, mimetype: 'image/jpeg' } }
    await stripImageMetadata(req)
    expect((await sharp(req.file.data).metadata()).exif).toBeUndefined()
  })

  it('rejects an oversize image', async () => {
    const req = { file: { data: Buffer.alloc(10), size: 9 * 1024 * 1024, mimetype: 'image/jpeg' } }
    await expect(stripImageMetadata(req)).rejects.toThrow()
  })

  it('rejects a file that is not an image', async () => {
    const req = { file: { data: Buffer.from('this is not an image'), size: 20, mimetype: 'image/jpeg' } }
    await expect(stripImageMetadata(req)).rejects.toThrow()
  })

  it('is a no-op when there is no new file', async () => {
    const req: { file?: { data?: Buffer } } = {}
    await expect(stripImageMetadata(req)).resolves.toBeUndefined()
  })
})
