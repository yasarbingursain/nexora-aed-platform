"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ThreatCard } from './ThreatCard';
import { Search, Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchThreats, quarantineThreat, rotateCredentials, dismissThreat } from '@/lib/api/threats';
import type { ThreatsResponse } from '@/lib/api/threats';

export function ThreatsView() {
  const [threatsData, setThreatsData] = useState<ThreatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadThreats = useCallback(async () => {
    try {
      setLoading(true);
      const filters = selectedFilter !== 'all' ? { severity: selectedFilter } : undefined;
      const data = await fetchThreats(page, 10, filters);
      setThreatsData(data);
    } catch (error) {
      console.error('Failed to load threats:', error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedFilter]);

  useEffect(() => {
    loadThreats();
  }, [loadThreats]);

  const handleQuarantine = async (threatId: string) => {
    try {
      await quarantineThreat(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to quarantine:', error);
    }
  };

  const handleRotate = async (threatId: string) => {
    try {
      await rotateCredentials(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to rotate:', error);
    }
  };

  const handleDismiss = async (threatId: string) => {
    try {
      await dismissThreat(threatId);
      await loadThreats();
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        Home &gt; Threats
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-6">Threats</h1>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip
          label={`All (${threatsData?.total || 0})`}
          active={selectedFilter === 'all'}
          onClick={() => setSelectedFilter('all')}
        />
        <FilterChip
          label={`Critical (${threatsData?.stats.critical || 0})`}
          active={selectedFilter === 'critical'}
          onClick={() => setSelectedFilter('critical')}
          color="critical"
        />
        <FilterChip
          label={`High (${threatsData?.stats.high || 0})`}
          active={selectedFilter === 'high'}
          onClick={() => setSelectedFilter('high')}
          color="high"
        />
        <FilterChip
          label={`Medium (${threatsData?.stats.medium || 0})`}
          active={selectedFilter === 'medium'}
          onClick={() => setSelectedFilter('medium')}
          color="medium"
        />
        <FilterChip
          label={`Resolved (${threatsData?.stats.resolved || 0})`}
          active={selectedFilter === 'resolved'}
          onClick={() => setSelectedFilter('resolved')}
          color="resolved"
        />
      </div>

      {/* Search and Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search entity, IP, resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary"
          />
        </div>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Date Range
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Threats List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading threats...</div>
      ) : threatsData && threatsData.threats.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {threatsData.threats.map((threat) => (
              <ThreatCard
                key={threat.id}
                {...threat}
                onInvestigate={() => {}}
                onQuarantine={() => handleQuarantine(threat.id)}
                onRotate={() => handleRotate(threat.id)}
                onDismiss={() => handleDismiss(threat.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((page - 1) * 10 + 1, threatsData.total)} to{' '}
              {Math.min(page * 10, threatsData.total)} of {threatsData.total} threats
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {Array.from({ length: Math.min(5, threatsData.totalPages) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={page === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(threatsData.totalPages, p + 1))}
                disabled={page === threatsData.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No threats found matching your criteria
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  color?: 'critical' | 'high' | 'medium' | 'resolved';
}

function FilterChip({ label, active, onClick, color }: FilterChipProps) {
  const getColorClasses = () => {
    if (!active) return 'bg-card border-border text-text-secondary hover:border-nexora-primary/30';
    
    switch (color) {
      case 'critical':
        return 'bg-nexora-threat/10 border-nexora-threat text-nexora-threat';
      case 'high':
        return 'bg-nexora-warning/10 border-nexora-warning text-nexora-warning';
      case 'medium':
        return 'bg-nexora-ai/10 border-nexora-ai text-nexora-ai';
      case 'resolved':
        return 'bg-white/5 border-white/20 text-text-muted';
      default:
        return 'bg-nexora-primary/10 border-nexora-primary text-nexora-primary';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full border text-sm font-medium
        transition-all duration-200
        ${getColorClasses()}
      `}
    >
      {label}
    </button>
  );
}
