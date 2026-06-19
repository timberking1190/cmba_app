import Link from 'next/link'
import { UserCircle, ShieldCheck, ArrowRight } from 'lucide-react'

import { getCurrentUser } from '@/lib/auth'

/*
 * A signed-in personalized strip for the public hub pages (/athlete, /parent).
 * Renders nothing for signed-out visitors (the page stays public). Server
 * component — safe to drop at the top of a server page.
 */
export async function PersonalizedStrip({ variant }: { variant: 'athlete' | 'parent' }) {
  const user = await getCurrentUser()
  if (!user) return null

  const firstName = (user.preferredName || user.fullName || '').split(' ')[0]
  const minor = Boolean(user.isMinor)

  return (
    <section className="bg-cmba-red/10 border-b border-cmba-red/30">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3">
        <UserCircle size={18} className="text-cmba-red shrink-0" />
        <span className="text-sm text-cmba-grey-light">
          Welcome back{firstName ? `, ${firstName}` : ''}.
          {variant === 'parent'
            ? ' Manage your family and any minor accounts from your account area.'
            : minor
              ? ' This athlete account is guardian-managed.'
              : ' Track your development and certifications in your account.'}
        </span>
        <Link
          href="/account"
          className="ml-auto inline-flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider text-cmba-red hover:text-white transition-colors"
        >
          <ShieldCheck size={14} /> My account <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  )
}
