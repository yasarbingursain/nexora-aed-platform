interface ThreatsSkeletonProps {
  count?: number;
}

export function ThreatsSkeleton({ count = 5 }: ThreatsSkeletonProps) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-card border rounded-lg p-6 animate-pulse"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-6 bg-muted rounded w-3/4" />
            </div>
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>

          <div className="flex gap-2 mt-4">
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
