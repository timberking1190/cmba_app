import type { Metadata } from 'next'

import { CmsOrLegal } from '@/components/CmsOrLegal'
import { TERMS_OF_USE } from '@/content/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Terms of Use | CMBA Connect' }

export default function TermsPage() {
  return <CmsOrLegal doc={TERMS_OF_USE} />
}
