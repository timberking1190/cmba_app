import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldX } from 'lucide-react'

import { canScan } from '@/access/index'
import { getCurrentUser } from '@/lib/auth'
import { ScannerClient } from '@/components/scan/ScannerClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'CMBA+ Scanner' }

/*
 * /scan — the coach-verification scanner (D22). Mobile-first, server-gated on canScan
 * (referee / league_official / admin, D23). Thin: the client scans a QR (or a serial)
 * and POSTs to the verified /api/v1/member-cards/verify(-serial) endpoints.
 */
export default async function ScanPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/scan')

  if (!canScan(user)) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <ShieldX className="text-cmba-red" size={40} />
        <h1 className="mt-4 text-xl font-bold text-white">Not authorized to scan</h1>
        <p className="mt-2 text-sm text-cmba-grey-light">
          The scanner is for referees and league officials. Ask an admin for access.
        </p>
        <Link href="/account" className="mt-6 text-sm text-cmba-red hover:underline">Back to account</Link>
      </main>
    )
  }

  return <ScannerClient scannerName={user.fullName ?? user.email ?? 'Scanner'} />
}
