import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'
import { TERMS_OF_USE } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Terms of Use | CMBA Connect' }

export default function TermsPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Faint Calgary skyline backdrop, top of page */}
      <CalgarySkyline className="pointer-events-none absolute top-0 left-0 w-full h-24 text-white/[0.04]" />
      <div className="reveal rv-blur relative">
        <CmsOrLegal doc={TERMS_OF_USE} />
      </div>
    </div>
  )
}
