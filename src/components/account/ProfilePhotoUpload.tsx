'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, AlertTriangle } from 'lucide-react'

/*
 * ProfilePhotoUpload — a member uploads / changes their ID-card photo. Uploads the
 * image to the public `media` collection (authenticated create) then attaches it to
 * their own user record (owner-updatable field). Used on the account page; the photo
 * is what renders on the digital member card + in the scanner verdict.
 */
export function ProfilePhotoUpload({
  userId,
  currentPhotoUrl,
  name,
}: {
  userId: number | string
  currentPhotoUrl: string | null
  name: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('alt', `${name} — CMBA member photo`)
      const up = await fetch('/api/media', { method: 'POST', credentials: 'include', body: fd })
      const upData = await up.json()
      if (!up.ok || !upData?.doc?.id) {
        setError('Upload failed. Please try a different image.')
        return
      }
      const patch = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profilePhoto: upData.doc.id }),
      })
      if (!patch.ok) {
        setError('Could not save your photo. Please try again.')
        return
      }
      setPhotoUrl(upData.doc.sizes?.thumbnail?.url ?? upData.doc.url ?? null)
      router.refresh()
    } catch {
      setError('Something went wrong uploading your photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`bg-cmba-black-card border p-5 ${photoUrl ? 'border-white/12' : 'border-cmba-red/50'}`}>
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-white">
        <Camera size={14} className="text-cmba-red" /> ID card photo
      </h2>
      <div className="flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-20 w-20 rounded-full border border-white/20 object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-cmba-red/50 text-cmba-red">
            <Camera size={26} />
          </div>
        )}
        <div className="min-w-0">
          {!photoUrl && (
            <p className="mb-2 text-sm font-medium text-cmba-red">A photo is required for your member ID card.</p>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-cmba-red px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-cmba-hot disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {busy ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="mt-2 text-[11px] text-cmba-grey-mid">A clear head-and-shoulders photo. Shown on your card and to gym staff who scan it.</p>
        </div>
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-red-300"><AlertTriangle size={13} /> {error}</p>
      )}
    </section>
  )
}
