'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

// Covers /athlete and its subpages (challenges, quiz), which also define their
// own more specific boundaries.
export default function AthleteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('athlete error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Player area unavailable"
      description="We could not load this page right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
