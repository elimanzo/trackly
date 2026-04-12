'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          background: '#f5f0eb',
          color: '#1a1a2e',
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '24rem' }}>
          A critical error occurred. Please reload the page.
        </p>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#9ca3af' }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            background: '#5c4ee5',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
