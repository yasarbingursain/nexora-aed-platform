/**
 * Route-Level Error Boundary
 * 
 * Catches errors in dashboard routes and provides recovery
 * Prevents whole-app crashes from unexpected errors
 */

'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('[Dashboard Error]:', error)
    
    // Send to telemetry if available
    if (typeof window !== 'undefined' && (window as any).__OTEL_TRACER__) {
      // Track error in OpenTelemetry
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-12 w-12 text-red-400" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-400">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => reset()}
            variant="default"
            data-testid="error-retry-button"
          >
            Try again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="secondary"
            data-testid="error-home-button"
          >
            Go to dashboard
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  )
}
