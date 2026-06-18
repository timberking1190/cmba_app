import type { Metadata } from 'next'

import { LegalDocView } from '@/components/LegalDocView'
import { GUARDIAN_CONSENT } from '@/content/legal'

export const metadata: Metadata = { title: 'Guardian Consent & Children’s Privacy | CMBA Connect' }

export default function GuardianConsentPage() {
  return <LegalDocView doc={GUARDIAN_CONSENT} />
}
