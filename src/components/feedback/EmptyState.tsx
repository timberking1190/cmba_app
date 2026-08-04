/*
 * Shared, on brand empty state for pages and sections that legitimately have no
 * data yet (no games scheduled, no standings recorded, no challenges posted).
 * Server safe (no client hooks) so it can render inside server components.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import type { ComponentType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  children,
}: {
  icon?: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="border border-dashed border-white/12 bg-cmba-black-card/40 px-6 py-14 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cmba-grey-dark/20 border border-white/10 mb-4">
        <Icon size={22} className="text-cmba-grey-mid" aria-hidden={true} />
      </div>
      <div className="font-display font-bold text-white uppercase tracking-wide text-sm mb-1.5">
        {title}
      </div>
      {description && (
        <p className="text-xs text-cmba-grey leading-relaxed max-w-sm mx-auto">{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  )
}

export default EmptyState
