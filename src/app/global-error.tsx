'use client'

/*
 * Root global error boundary. This is the last line of defence: it only renders
 * when an error is thrown in a root layout itself, so it must ship its own
 * <html> and <body>. It cannot rely on globals.css or fonts (the layout that
 * loads them is what failed), so the small amount of styling here is inline and
 * self contained, kept on brand (Calgary black and red).
 *
 * Copy rule: no em or en dashes anywhere.
 */

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the browser console; error monitoring (P1.5) hooks in here too.
    console.error('global-error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#08080A',
          color: '#F1F1ED',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#EB1C24',
              marginBottom: '12px',
            }}
          >
            CMBA Connect
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#9A9AA2', margin: '0 0 28px' }}>
            The page could not load. This is on our side. Please try again, and if it keeps
            happening come back in a few minutes.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#EB1C24',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* global-error renders outside the router, so next/link is unavailable
                here; a plain anchor is the documented pattern. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#F1F1ED',
                padding: '10px 20px',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Return home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
