'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function ChallengesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('athlete/challenges error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Challenges unavailable"
      description="We could not load the skill challenges right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
