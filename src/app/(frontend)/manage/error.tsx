'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

// Covers /manage and every scheduling console subpage (schedule, contested,
// officials, import) via Next hierarchical error boundaries.
export default function ManageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('manage error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Console unavailable"
      description="We could not load the scheduling console right now. This is on our side. Please try again in a moment."
      reset={reset}
      homeHref="/manage"
      homeLabel="Back to console"
    />
  )
}
