'use client'

/*
 * Shared, on brand error surface used by every route level error boundary
 * (error.tsx) across the public and member areas. Friendly, plain language,
 * with a retry and a safe path home so a failed or slow fetch never leaves the
 * visitor stranded on a blank screen.
 *
 * Copy rule: no em or en dashes anywhere.
 */

import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this page right now. This is on our side, not yours. Please try again in a moment.',
  reset,
  homeHref = '/',
  homeLabel = 'Return home',
}: {
  title?: string
  description?: string
  reset?: () => void
  homeHref?: string
  homeLabel?: string
}) {
  return (
    <div
      role="alert"
      className="max-w-2xl mx-auto px-4 py-20 lg:py-28 text-center"
    >
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cmba-red/10 border border-cmba-red/30 mb-6">
        <AlertTriangle size={26} className="text-cmba-red" aria-hidden="true" />
      </div>
      <div className="label-xs text-cmba-grey-mid mb-3">Temporary problem</div>
      <h1 className="font-display font-black text-white uppercase tracking-tight text-2xl lg:text-3xl mb-3">
        {title}
      </h1>
      <p className="text-sm text-cmba-grey leading-relaxed max-w-md mx-auto mb-8">
        {description}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 bg-cmba-red hover:bg-cmba-red-dark text-white font-mono text-xs uppercase tracking-wider px-5 py-2.5 transition-colors"
          >
            <RotateCcw size={14} aria-hidden="true" /> Try again
          </button>
        )}
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 border border-white/20 hover:border-cmba-red/50 text-cmba-grey-light font-mono text-xs uppercase tracking-wider px-5 py-2.5 transition-colors"
        >
          <Home size={14} aria-hidden="true" /> {homeLabel}
        </Link>
      </div>
    </div>
  )
}

export default ErrorState
