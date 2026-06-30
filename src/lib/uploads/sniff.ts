import { APIError } from 'payload'

import { stripImageMetadata } from './exif'

/*
 * Stage C / S2 — secure upload: verify the ACTUAL bytes of an upload by magic
 * number, not the client-declared content type, and cap the size. Used by
 * CertificateFiles, where PDFs bypass the sharp re-encode that already validates
 * image collections. For images we still re-encode + strip metadata via sharp.
 *
 * Malware scanning (ClamAV / an AV API) is an operator add-on: wire it here behind
 * an env when provisioned. It is documented in docs/SECURITY.md, not implemented.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

/** Detect a file type from its leading bytes. Returns a mime string or 'unknown'. */
export function sniffType(buf: Buffer | Uint8Array | undefined | null): string {
  if (!buf || buf.length < 4) return 'unknown'
  const b = buf
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf' // %PDF
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  )
    return 'image/webp'
  return 'unknown'
}

type UploadFile = { data?: Buffer; size?: number; mimetype?: string }

export async function validateUpload(
  req: { file?: UploadFile },
  opts: { allow: string[]; maxBytes?: number },
): Promise<void> {
  const file = req.file
  if (!file?.data) return // metadata-only update, nothing to validate
  const maxBytes = opts.maxBytes ?? MAX_UPLOAD_BYTES
  if (file.data.length > maxBytes) {
    throw new APIError(`That file is too large. The limit is ${Math.round(maxBytes / (1024 * 1024))} MB.`, 400)
  }
  const detected = sniffType(file.data)
  if (detected === 'unknown' || !opts.allow.includes(detected)) {
    throw new APIError('That file type is not allowed. Upload a PDF, PNG, JPG, or WebP.', 400)
  }
  // Images: re-encode + strip EXIF/GPS (also re-validates the pixels).
  if (detected.startsWith('image/')) {
    await stripImageMetadata(req, maxBytes)
  }
}
