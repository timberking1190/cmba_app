import { APIError } from 'payload'
import sharp from 'sharp'

/*
 * Strip EXIF and GPS metadata from an uploaded image, in memory, BEFORE it is
 * stored. Used by the private photo collections (scoresheets, incident photos).
 *
 * Important: Payload builds the buffer it persists in generateFileData, which runs
 * BEFORE the beforeChange hooks, and for an upload collection with no imageSizes or
 * format options Payload does NOT re-encode the image. So the strip must run either
 * in a beforeOperation hook (which runs before generateFileData and can mutate
 * req.file.data) or on the raw buffer in the upload route before payload.create.
 * We do both, so every upload path (the v1 route, the native REST endpoint, and the
 * admin panel) stores a metadata-free image. sharp re-encodes and drops all
 * metadata by default; rotate() bakes the EXIF orientation into the pixels first.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB

export async function stripImageBuffer(data: Buffer, maxBytes: number = MAX_IMAGE_BYTES): Promise<Buffer> {
  if (data.length > maxBytes) {
    throw new APIError('That image is too large. The limit is 8 MB.', 400)
  }
  try {
    return await sharp(data).rotate().toBuffer() // bakes orientation, drops EXIF and GPS
  } catch {
    throw new APIError('That file could not be read as an image. Please upload a JPG, PNG, or WebP.', 400)
  }
}

type UploadFile = { data?: Buffer; size?: number; mimetype?: string }

export async function stripImageMetadata(req: { file?: UploadFile }, maxBytes: number = MAX_IMAGE_BYTES): Promise<void> {
  const file = req.file
  if (!file || !file.data) return // no new file on this write (metadata-only update)
  const cleaned = await stripImageBuffer(file.data, maxBytes)
  file.data = cleaned
  file.size = cleaned.length
}
