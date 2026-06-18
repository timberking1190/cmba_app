import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { GUARDIAN_CONSENT } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Guardian Consent & Children’s Privacy | CMBA Connect' }

export default function GuardianConsentPage() {
  return <CmsOrLegal doc={GUARDIAN_CONSENT} />
}
