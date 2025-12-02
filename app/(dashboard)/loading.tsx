/**
 * Dashboard Loading State
 * 
 * Skeleton UI shown during route transitions
 * Provides visual continuity and perceived performance
 */

export default function Loading() {
  return (
    <div className="space-y-6 p-6" data-testid="dashboard-loading">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-10 w-32 animate-pulse rounded bg-white/10" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/10 bg-white/5 p-6"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-white/10 bg-white/5"
          />
        ))}
      </div>
    </div>
  )
}
