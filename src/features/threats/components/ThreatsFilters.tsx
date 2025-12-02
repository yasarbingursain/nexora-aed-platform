'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ThreatFilters } from '@/types/api.types';
import { ThreatSeverity, ThreatStatus } from '@/types/threat.types';

interface ThreatsFiltersProps {
  filters: ThreatFilters;
  onFilterChange: (filters: ThreatFilters) => void;
}

export function ThreatsFilters({ filters, onFilterChange }: ThreatsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ThreatFilters>(filters);

  const handleSeverityToggle = (severity: ThreatSeverity) => {
    const current = localFilters.severity || [];
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    
    const newFilters = { ...localFilters, severity: updated };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusToggle = (status: ThreatStatus) => {
    const current = localFilters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    
    const newFilters = { ...localFilters, status: updated };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const newFilters: ThreatFilters = {};
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const hasActiveFilters = 
    (localFilters.severity && localFilters.severity.length > 0) ||
    (localFilters.status && localFilters.status.length > 0);

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Severity Filters */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Severity:</label>
          <div className="flex gap-2">
            {Object.values(ThreatSeverity).map((severity) => (
              <Badge
                key={severity}
                variant={localFilters.severity?.includes(severity) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleSeverityToggle(severity)}
              >
                {severity}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Status:</label>
          <div className="flex gap-2">
            {Object.values(ThreatStatus).map((status) => (
              <Badge
                key={status}
                variant={localFilters.status?.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleStatusToggle(status)}
              >
                {status.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
