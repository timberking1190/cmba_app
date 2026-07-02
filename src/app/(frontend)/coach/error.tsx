'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

// Covers /coach and every coach subpage (challenges, clinics, courses,
// managing-the-moment, pathway) via Next hierarchical error boundaries.
export default function CoachError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('coach error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Coach area unavailable"
      description="We could not load this coaching page right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
