import type { Metadata } from 'next'

import { LegalDocView } from '@/components/LegalDocView'
import { TERMS_OF_USE } from '@/content/legal'

export const metadata: Metadata = { title: 'Terms of Use | CMBA Connect' }

export default function TermsPage() {
  return <LegalDocView doc={TERMS_OF_USE} />
}
