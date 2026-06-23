import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'
import { GUARDIAN_CONSENT } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Guardian Consent & Children’s Privacy | CMBA Connect' }

export default function GuardianConsentPage() {
  return (
    <div className="relative overflow-hidden">
      <CalgarySkyline className="pointer-events-none absolute bottom-0 left-0 w-full h-20 text-white/5" />
      <div className="reveal relative">
        <CmsOrLegal doc={GUARDIAN_CONSENT} />
      </div>
    </div>
  )
}
