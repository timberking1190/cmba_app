/*
 * Shared skeleton loaders used by every route level loading.tsx. Skeletons keep
 * the page shape visible while data streams in, instead of a spinner on a blank
 * page. Server safe (no client hooks) and motion light (a single pulse) so they
 * respect reduced motion preferences at the system level.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import type { ReactNode } from 'react'

// A single shimmer block. Tailwind animate-pulse is a soft opacity pulse that is
// far cheaper than a moving gradient and reads fine on a family phone.
export function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-cmba-grey-dark/20 rounded-sm ${className}`} aria-hidden="true" />
}

// The big editorial page header (eyebrow + oversized display title + lede).
export function PageHeaderSkeleton() {
  return (
    <section className="relative px-4 md:px-10 lg:px-14 pt-12 lg:pt-20 pb-8">
      <div className="max-w-7xl mx-auto">
        <Skel className="h-3 w-32 mb-5" />
        <Skel className="h-16 lg:h-24 w-3/4 max-w-2xl mb-5" />
        <Skel className="h-4 w-full max-w-xl" />
      </div>
    </section>
  )
}

// Vertical list of rows (schedule games, announcements).
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-cmba-black-card/60 border border-white/10 p-4">
          <Skel className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skel className="h-3.5 w-1/2" />
            <Skel className="h-3 w-1/3" />
          </div>
          <Skel className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// Standings style table.
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-white/10 bg-cmba-black-card/60">
      <div className="flex gap-4 border-b border-white/10 p-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skel key={i} className={`h-3 ${i === 0 ? 'w-40' : 'w-10'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-white/5 p-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skel key={c} className={`h-4 ${c === 0 ? 'w-40' : 'w-10'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Grid of cards (certifications, courses, challenges).
export function CardGridSkeleton({ count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-cmba-black-card/60 border border-white/10 p-5 space-y-3">
          <Skel className="h-4 w-2/3" />
          <Skel className="h-3 w-1/2" />
          <Skel className="h-3 w-full" />
          <Skel className="h-8 w-24 mt-2" />
        </div>
      ))}
    </div>
  )
}

// Dashboard: a couple of stat cards over a content column.
export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-cmba-black-card/60 border border-white/10 p-5 space-y-3">
            <Skel className="h-3 w-20" />
            <Skel className="h-8 w-16" />
          </div>
        ))}
      </div>
      <CardGridSkeleton count={4} cols="sm:grid-cols-2" />
    </div>
  )
}

// Full page loader: header + a body region. `body` picks the content shape.
export function PageSkeleton({ body }: { body?: ReactNode }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="max-w-7xl mx-auto px-4 md:px-10 lg:px-14 pb-20">
        {body ?? <ListSkeleton />}
      </div>
    </div>
  )
}
