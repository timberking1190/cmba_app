'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function QuizError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('athlete/quiz error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Quiz unavailable"
      description="We could not load the Basketball IQ quiz right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
