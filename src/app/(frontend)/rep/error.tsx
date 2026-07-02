'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function RepError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('rep error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Team view unavailable"
      description="We could not load your team dashboard right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
