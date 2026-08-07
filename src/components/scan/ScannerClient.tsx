'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, Wifi, WifiOff, ScanLine } from 'lucide-react'

interface Verdict {
  result: string
  cleared: boolean
  message: string
  serialFallback: boolean
  memberNumber: string | null
  displayName: string | null
  photoUrl: string | null
  guardianName: string | null
  missing: string[]
  expiredOrInvalid: string[]
}

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

function getDeviceId(): string {
  const KEY = 'mc-scanner-device-id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function ScannerClient({ scannerName }: { scannerName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanningRef = useRef(false)
  const [online, setOnline] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [serial, setSerial] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const barcodeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    const v = videoRef.current
    const stream = v?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (v) v.srcObject = null
    setCameraOn(false)
  }, [])

  const post = useCallback(async (path: string, body: Record<string, unknown>) => {
    if (!navigator.onLine) {
      setError('You are offline — the scanner needs a connection to verify.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': getDeviceId() },
        body: JSON.stringify({ ...body, clientUuid: crypto.randomUUID() }),
      })
      const data = (await res.json()) as Verdict & { error?: string }
      if (!res.ok && data?.error) setError(data.error)
      else setVerdict(data)
    } catch {
      setError('Could not reach the server. Check your connection and retry.')
    } finally {
      setBusy(false)
    }
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setVerdict(null)
    if (!barcodeSupported) {
      setError('Camera scanning is not supported in this browser. Use serial lookup below.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraOn(true)
      scanningRef.current = true
      const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector
      const detector = new Detector({ formats: ['qr_code'] })
      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) {
            stopCamera()
            await post('/api/v1/member-cards/verify', { token: codes[0].rawValue })
            return
          }
        } catch {
          /* transient decode error — keep scanning */
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch {
      setError('Camera permission denied or unavailable. Use serial lookup below.')
      setCameraOn(false)
    }
  }, [barcodeSupported, post, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  const reset = () => {
    setVerdict(null)
    setError(null)
    setSerial('')
  }

  const cleared = verdict?.cleared
  const bannerCls = cleared
    ? 'bg-green-600'
    : verdict?.result === 'not_scannable'
      ? 'bg-cmba-grey-dark'
      : 'bg-cmba-red'

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <ScanLine size={20} /> <span className="font-bold">CMBA+ Scanner</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs ${online ? 'text-green-400' : 'text-cmba-red'}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />} {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <p className="mb-4 text-xs text-cmba-grey-mid">Signed in as {scannerName}</p>

      {verdict ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className={`${bannerCls} p-5 text-white`}>
            <div className="flex items-center gap-2 text-lg font-extrabold uppercase tracking-wide">
              {cleared ? <CheckCircle2 /> : verdict.result === 'not_scannable' ? <AlertTriangle /> : <XCircle />}
              {cleared ? 'Cleared' : 'Not cleared'}
            </div>
            <p className="mt-1 text-sm text-white/90">{verdict.message}</p>
          </div>
          <div className="flex items-center gap-4 bg-cmba-black/90 p-5">
            {verdict.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={verdict.photoUrl} alt="" width={64} height={64} decoding="async" className="h-16 w-16 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">?</div>
            )}
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{verdict.displayName ?? 'Unknown'}</div>
              <div className="font-mono text-sm text-white/60">{verdict.memberNumber ?? '—'}</div>
              {verdict.guardianName && <div className="text-xs text-white/50">Guardian: {verdict.guardianName}</div>}
            </div>
          </div>
          {verdict.serialFallback && (
            <div className="bg-orange-500/15 px-5 py-2 text-xs text-orange-300">Serial lookup — check photo ID carefully.</div>
          )}
          <div className="bg-cmba-black/90 p-4">
            <button onClick={reset} className="w-full rounded-xl bg-white/10 py-3 font-semibold text-white hover:bg-white/15">
              Scan next
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            {!cameraOn && (
              <button
                onClick={startCamera}
                disabled={busy}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80"
              >
                {busy ? <Loader2 className="animate-spin" /> : <Camera size={36} />}
                <span className="text-sm">{barcodeSupported ? 'Tap to start camera' : 'Camera scan not supported — use serial'}</span>
              </button>
            )}
            {cameraOn && <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />}
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-cmba-grey-light">Manual serial lookup</label>
            <div className="flex gap-2">
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Pass serial from the card"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-cmba-grey-mid"
              />
              <button
                onClick={() => post('/api/v1/member-cards/verify-serial', { serial: serial.trim() })}
                disabled={busy || !serial.trim()}
                className="rounded-xl bg-cmba-red px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : 'Verify'}
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-cmba-red/30 bg-cmba-red/10 p-3 text-sm text-red-300">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
    </main>
  )
}
