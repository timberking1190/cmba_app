import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'

import { getPayloadClient } from '@/lib/auth'
import { CourtLines } from '@/components/graphics/CourtLines'

export const dynamic = 'force-dynamic'

async function confirm(token: string): Promise<'ok' | 'invalid' | 'already'> {
  if (!token) return 'invalid'
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'users',
    where: { 'guardian.confirmationToken': { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const user = res.docs[0]
  if (!user) return 'invalid'
  if (user.guardian?.confirmed) return 'already'
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { status: 'active', guardian: { confirmed: true, confirmationToken: null } },
    overrideAccess: true,
    context: { skipConsentEnforcement: true },
  })
  return 'ok'
}

export default async function GuardianConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await confirm(token ?? '')

  const ok = result === 'ok' || result === 'already'
  return (
    <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden px-4 py-12">
      <CourtLines className="pointer-events-none absolute -bottom-10 -right-10 w-80 text-cmba-red/[0.05] hidden lg:block" />
      <div className="reveal rv-scale relative w-full max-w-md bg-cmba-black-card border border-white/12 p-8 text-center">
        {ok ? (
          <CheckCircle2 size={44} className="text-cmba-red mx-auto mb-4" />
        ) : (
          <XCircle size={44} className="text-cmba-grey mx-auto mb-4" />
        )}
        <h1 className="font-display font-black text-2xl text-white uppercase tracking-tight mb-2">
          {result === 'ok' && 'Account confirmed'}
          {result === 'already' && 'Already confirmed'}
          {result === 'invalid' && 'Link not valid'}
        </h1>
        <p className="text-sm text-cmba-grey-light leading-relaxed mb-6">
          {result === 'ok' &&
            "Thank you. Your athlete's CMBA Connect account is now active. You can sign in to manage it."}
          {result === 'already' && 'This account has already been confirmed. You can sign in to manage it.'}
          {result === 'invalid' &&
            'This confirmation link is invalid or has expired. Please check the link in your email, or create the account again.'}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-hot text-white font-display font-bold text-sm uppercase tracking-wider px-5 py-2.5 transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  )
}
