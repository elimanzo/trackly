'use client'

import { AlertTriangleIcon } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function Error({
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
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <AlertTriangleIcon className="text-destructive size-10" />
      <h1 className="text-foreground text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        An unexpected error occurred. You can try again or return to the dashboard.
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} size="sm">
        Try again
      </Button>
    </div>
  )
}
