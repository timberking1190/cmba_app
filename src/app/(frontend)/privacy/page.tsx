import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { CalgarySkyline } from '@/components/graphics/CalgarySkyline'
import { PRIVACY_POLICY } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Privacy Policy | CMBA Connect' }

export default function PrivacyPage() {
  return (
    <div className="relative">
      {/* Faint Calgary skyline backdrop — decorative, sits behind the legal copy */}
      <CalgarySkyline className="pointer-events-none absolute top-0 left-0 w-full h-24 text-white/[0.04]" />
      <div className="relative">
        <CmsOrLegal doc={PRIVACY_POLICY} />
      </div>
    </div>
  )
}
