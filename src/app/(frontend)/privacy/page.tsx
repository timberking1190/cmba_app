import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { PRIVACY_POLICY } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Privacy Policy | CMBA Connect' }

export default function PrivacyPage() {
  return <CmsOrLegal doc={PRIVACY_POLICY} />
}
