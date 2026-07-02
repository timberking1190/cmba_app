'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

// Covers /ref and every ref subpage (quick-ref, signals) via Next hierarchical
// error boundaries.
export default function RefError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('ref error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Referee area unavailable"
      description="We could not load this referee page right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
