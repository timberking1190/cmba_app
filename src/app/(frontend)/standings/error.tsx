'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function StandingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('standings error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Standings unavailable"
      description="We could not load the league standings right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
