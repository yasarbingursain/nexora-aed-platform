'use client';

import { useState } from 'react';
import { useThreats } from '@/hooks/use-threats';
import { useRealtimeThreats } from '@/hooks/use-realtime-threats';
import { ThreatsList } from '@/features/threats/components/ThreatsList';
import { ThreatsFilters } from '@/features/threats/components/ThreatsFilters';
import { ThreatsSkeleton } from '@/features/threats/components/ThreatsSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ThreatFilters } from '@/types/api.types';

export function ThreatsContainer() {
  const [filters, setFilters] = useState<ThreatFilters>({});
  
  const {
    threats,
    isLoading,
    error,
    refetch,
    updateThreat,
    isUpdating,
  } = useThreats(filters);

  // Enable real-time updates
  const { connected } = useRealtimeThreats();

  if (error) {
    return (
      <ErrorState
        title="Failed to load threats"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return <ThreatsSkeleton count={10} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Threats</h1>
          <p className="text-sm text-muted-foreground">
            {threats.length} threats detected
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs">Live</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <ThreatsFilters filters={filters} onFilterChange={setFilters} />

      <ThreatsList
        threats={threats}
        isLoading={isLoading}
        isUpdating={isUpdating}
        onUpdateThreat={updateThreat}
      />
    </div>
  );
}
