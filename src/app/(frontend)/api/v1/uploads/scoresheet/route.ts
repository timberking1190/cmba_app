import { NextResponse } from 'next/server'

import { authenticateRequest } from '@/lib/api/auth'
import { numericId, safeClientError } from '@/lib/api/handler'
import { getPayloadClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'
import { MAX_IMAGE_BYTES, stripImageBuffer } from '@/lib/uploads/exif'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/*
 * POST /api/v1/uploads/scoresheet - the one shared multipart endpoint for a
 * scoresheet photo (web file picker and mobile camera both use it). The file is
 * created in the user's auth context (overrideAccess:false) so the ScoresheetFiles
 * hook runs: it validates the uploader is a verified rep of a team in the game,
 * strips EXIF and GPS, and stores it in the private bucket. Returns the file id to
 * attach to a score report.
 */
export async function POST(req: Request) {
  const payload = await getPayloadClient()
  const user = await authenticateRequest(payload, req)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Reject an oversize body from the Content-Length BEFORE buffering it into memory
  // (App Router routes have no default body-size limit). Allow some multipart overhead.
  const declared = Number(req.headers.get('content-length') || '0')
  if (declared && declared > MAX_IMAGE_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'That image is too large. The limit is 8 MB.' }, { status: 413 })
  }

  const rl = await checkRateLimit(payload, { bucket: 'upload', subject: String(user.id), limit: 60, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads. Please slow down.' }, { status: 429 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'A multipart form with a file is required.' }, { status: 400 })
  }
  const file = form.get('file')
  const gameId = numericId(String(form.get('gameId') ?? ''))
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
  if (gameId == null) return NextResponse.json({ error: 'A valid gameId is required.' }, { status: 400 })

  const name = (file as File).name || 'scoresheet.jpg'

  try {
    const raw = Buffer.from(await file.arrayBuffer())
    if (raw.length > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'That image is too large. The limit is 8 MB.' }, { status: 413 })
    // Strip EXIF/GPS here so the bytes Payload persists are already clean,
    // independent of the collection hook (defense in depth).
    const clean = await stripImageBuffer(raw)
    const created = await payload.create({
      collection: 'scoresheet-files',
      overrideAccess: false,
      user,
      data: { game: gameId } as never,
      file: { data: clean, name, mimetype: 'image/jpeg', size: clean.length },
    })
    return NextResponse.json({ ok: true, fileId: created.id }, { status: 201 })
  } catch (err) {
    const { status, message } = safeClientError(err)
    if (status >= 500) payload.logger.error(`[api] scoresheet upload: ${String(err)}`)
    return NextResponse.json({ error: message }, { status })
  }
}
