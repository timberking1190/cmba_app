'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function ImportError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('manage/import error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Import unavailable"
      description="We could not load the schedule import tool right now. This is on our side. Please try again in a moment."
      reset={reset}
      homeHref="/manage"
      homeLabel="Back to console"
    />
  )
}
