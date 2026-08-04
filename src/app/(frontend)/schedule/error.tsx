'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function ScheduleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('schedule error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Schedule unavailable"
      description="We could not load the game schedule right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
