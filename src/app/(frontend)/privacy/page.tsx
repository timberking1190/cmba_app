import type { Metadata } from 'next'

import { LegalDocView } from '@/components/LegalDocView'
import { PRIVACY_POLICY } from '@/content/legal'

export const metadata: Metadata = { title: 'Privacy Policy | CMBA Connect' }

export default function PrivacyPage() {
  return <LegalDocView doc={PRIVACY_POLICY} />
}
