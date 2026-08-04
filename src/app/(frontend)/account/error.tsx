'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'

export default function AccountError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('account error boundary:', error)
  }, [error])
  return (
    <ErrorState
      title="Account unavailable"
      description="We could not load your account right now. This is on our side. Please try again in a moment."
      reset={reset}
    />
  )
}
